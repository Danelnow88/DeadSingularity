'use strict';
// Screen fixtures live only in this disposable QA response, never in the game.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'local/validation/mobile-screens');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'ds-mobile-screens-')));
app.on('window-all-closed',()=>{});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const marker='NV.getState = () => state;';
 const source=fs.readFileSync(path.join(root,'js/game.js'),'utf8');assert(source.includes(marker));
 const patched=source.replace(marker,`NV.__qaScreen=(name)=>{if(name==='lobby')showLobby();if(name==='stats'){showStats=true;paused=true;}if(name==='over'){showStats=false;paused=false;gameOver();finishPlayerDeath();}if(name==='shop'){paused=false;showStats=false;wave=1;shards=1000;state='wave_end';beginShopEntrance();economyStock=NV.createEconomyStock(()=>.9);generateOffers();renderInventory();finishShopEntrance();}};${marker}`);
 const server=http.createServer((req,res)=>{
  const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+p);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg'};
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(p==='/js/game.js'?patched:fs.readFileSync(file));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const win=new BrowserWindow({show:false,width:844,height:390,webPreferences:{offscreen:true,backgroundThrottling:false,sandbox:true,contextIsolation:true}});
 const errors=[],reports=[];win.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message);});
 win.webContents.debugger.attach('1.3');const command=(m,p)=>win.webContents.debugger.sendCommand(m,p);
 const evaluate=s=>win.webContents.executeJavaScript(s,true);
 async function screen(name,selector,width,height){
  await wait(500); // Measure settled screens, not the intentional entrance overshoot.
  const report=await evaluate(`(()=>{
   const panel=document.querySelector(${JSON.stringify(selector)});if(!panel)return {missing:true};
   const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
   const bounded=r=>r.x>=-1&&r.y>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;
   const reachable=e=>{for(let p=e.parentElement;p&&p!==document.body;p=p.parentElement){const s=getComputedStyle(p);if(/auto|scroll/.test(s.overflowY+' '+s.overflowX)&&bounded(rect(p)))return true;}return false;};
   const controls=[...panel.querySelectorAll('button,input,select,.offer')].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().width>0).map(e=>({id:e.id||e.className,r:rect(e),reachable:reachable(e)}));
   return {panel:rect(panel),visible:panel.getClientRects().length>0,horizontal:document.documentElement.scrollWidth-innerWidth,clipped:controls.filter(e=>!bounded(e.r)&&!e.reachable),controls:controls.length};
  })()`);
  reports.push({width,height,name,...report});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({reports,errors},null,2));
  fs.writeFileSync(path.join(out,`${width}x${height}-${name}.png`),(await win.webContents.capturePage()).toPNG());
  assert(!report.missing&&report.visible,name+' missing');assert(report.horizontal<=1,name+' page overflow');
  assert(report.panel.x>=-1&&report.panel.y>=-1&&report.panel.right<=width+1&&report.panel.bottom<=height+1,name+' panel outside viewport '+JSON.stringify(report.panel));
  assert.deepEqual(report.clipped,[],name+' unreachable controls');
 }
 try{
 for(const [width,height] of [[568,320],[844,390],[1280,573]]){
  win.setMinimumSize(1,1);win.setContentSize(width,height);
  await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:true,screenOrientation:{type:'landscapePrimary',angle:90}});
  await command('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  await win.loadURL(`http://127.0.0.1:${server.address().port}/index.html?fresh=1`);await wait(500);
  assert(await evaluate('NV.capabilities.isMobile'));
  await screen('lobby','#startScreen',width,height);
  await evaluate('document.getElementById("pilotsBtn").click()');await screen('pilots','#characterSelectScreen',width,height);
  await evaluate('NV.__qaScreen("lobby");document.getElementById("permBtn").click()');await screen('permanent-upgrades','#permShop',width,height);
  await evaluate('NV.__qaScreen("lobby")');
  for(const tab of ['Audio','Controls','Graphics']){
   await evaluate(`NV.settingsUI.open();document.getElementById('tab${tab}').click()`);await screen('settings-'+tab,'#settingsPanelBody',width,height);await evaluate('NV.settingsUI.close()');
  }
  for(const title of ['CÓMO JUGAR','RÉCORDS / INFORME']){
   await evaluate(`[...document.querySelectorAll('.alpha-links button')].find(b=>b.textContent===${JSON.stringify(title)}).click()`);
   await screen(title.startsWith('CÓMO')?'help':'records','dialog[open]',width,height);await evaluate('document.querySelector("dialog[open]").close()');
  }
  await evaluate('document.getElementById("lobbyPlayBtn").click()');await screen('combat','#game',width,height);
  assert(await evaluate("NV.getSectorBackdropStats().artReady&&NV.getSectorBackdropStats().artFile.startsWith('sky-')"),'normal mobile combat must display its selected cosmic sky');
  await evaluate('document.getElementById("systemMenuToggle").click()');await screen('system','#systemMenu',width,height);await evaluate('document.getElementById("systemMenuClose").click();NV.__qaScreen("stats")');
  await screen('stats','#game',width,height);
  await evaluate('NV.__qaScreen("shop")');await screen('shop','#shop',width,height);
  for(const tab of ['upgrades','weapons','consumables']){
   await evaluate(`document.querySelector('#shopTabs [data-tab="${tab}"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch',button:0}))`);await screen('shop-'+tab,'#shop',width,height);
   assert.equal(await evaluate('document.getElementById("shop").dataset.activeTab'),tab,'touch shop tab must switch');
  }
  await evaluate('document.querySelector(".alpha-prep-trigger").click()');await screen('prepare','dialog[open]',width,height);await evaluate('document.querySelector("dialog[open]").close();NV.__qaScreen("over")');await wait(3000);await screen('game-over','#gameOver',width,height);
  await win.loadURL(`http://127.0.0.1:${server.address().port}/index.html?fresh=1&dimensionEvents=preview`);await wait(500);
  await screen('trial-lobby','#startScreen',width,height);
  await evaluate('document.getElementById("lobbyPlayBtn").click()');await screen('trial-combat','#game',width,height);
  assert(await evaluate("NV.dimensionSceneryTrial&&NV.getSectorBackdropStats().artReady&&NV.getSectorBackdropStats().artFile.startsWith('sky-')"),'trial mobile combat must match the approved sky baseline');
 }
 assert.deepEqual(errors,[]);console.log('PASS '+reports.length+' mobile screen checks across three viewports; scrollable settings remain reachable. Emulation only.');
 }finally{win.destroy();server.close();}
 app.quit();
}).catch(e=>{console.error(e);app.exit(1);});
