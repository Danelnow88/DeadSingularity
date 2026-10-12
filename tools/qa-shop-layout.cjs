// Instrumenta sólo la respuesta de QA en memoria; el juego no expone este hook.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'local/validation/shop-progression-2026-10-09');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'ds-shop-')));
app.on('window-all-closed',()=>{});
app.whenReady().then(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const source=fs.readFileSync(path.join(root,'js/game.js'),'utf8').replace(/NV\.getState\s*=\s*\(\)\s*=>\s*state;/,`NV.__qaShop = (next=2,premium=false) => { wave=next-1; shards=1000; inventory=[WEAPONS[0]]; currentWeapon=inventory[0]; weaponFus={}; state='wave_end'; beginShopEntrance(); economyStock=NV.createEconomyStock(()=>.9); economyStock.premium=premium; generateOffers(); renderInventory(); finishShopEntrance(); };\n  NV.getState = () => state;`);
 assert(source.includes('NV.__qaShop ='),'hook de QA generado');
 const server=require('node:http').createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=path.resolve(root,'.'+decodeURIComponent(pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end();return;}
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.mp3':'audio/mpeg'};
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
  res.end(pathname==='/js/game.js'?source:fs.readFileSync(file));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const reports=[];
 for(const [width,height,mobile] of [[1280,800,false],[1920,1080,false],[844,390,true]]){
  const win=new BrowserWindow({width,height,show:false,webPreferences:{offscreen:true,backgroundThrottling:false,sandbox:true,contextIsolation:true}});
  const errors=[];win.webContents.on('console-message',d=>{if(d.level==='error')errors.push(d.message);});
  await win.loadURL(origin+'/index.html?fresh=1'+(mobile?'&mobile=1':''));await wait(900);
  const evaluate=code=>win.webContents.executeJavaScript(code,true);
  await evaluate(`document.getElementById('lobbyPlayBtn').click(); NV.__qaShop();`);await wait(700);
  const before=await evaluate(`JSON.stringify(NV.alpha.snapshot())`);
  const layout=await evaluate(`(()=>{const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};};return {state:NV.getState(),sections:[...document.querySelectorAll('#shop .shop-section')].map(rect),offers:document.querySelectorAll('#weaponOffers > .offer').length,reserved:document.querySelectorAll('#weaponOffers .offer-reserved').length,card:rect(document.querySelector('#weaponOffers > .offer'))};})()`);
  assert.equal(layout.state,'shop');assert.equal(layout.sections.length,3);assert.equal(layout.offers,6);assert(layout.reserved>=3);
  assert(layout.sections.every(r=>r.w>0&&r.h>0));
  if(!mobile){assert(Math.max(...layout.sections.map(r=>r.h))-Math.min(...layout.sections.map(r=>r.h))<1);assert.equal(layout.card.h,104);}
  await evaluate(`document.querySelector('#weaponOffers .offer-reserved').click()`);
  assert.equal(await evaluate('JSON.stringify(NV.alpha.snapshot())'),before,'reserva altera estado');
  assert(await evaluate(`[...document.querySelectorAll('#weaponOffers .offer-locked')].map(e=>e.getAttribute('aria-label')).join('|')==='Disponible desde la oleada 5|Disponible desde la oleada 10|Disponible desde la oleada 15|Disponible desde la oleada 20'`));
  assert(await evaluate(`document.getElementById('shopInspectorDesc').textContent.includes('Disponible desde la oleada 5')`));
  assert.equal(await evaluate(`document.querySelectorAll('#upgradeSlots > .loadout-slot').length`),6);
  assert(await evaluate(`document.getElementById('upgradeSlots').getBoundingClientRect().height>0`));
  const tokenOffset=await evaluate(`(()=>{const a=document.querySelector('#shop .shop-terminal-head').getBoundingClientRect(),b=document.querySelector('#shop .shard-bar').getBoundingClientRect();return Math.abs((a.x+a.width/2)-(b.x+b.width/2));})()`);
  assert(tokenOffset<1,'tokens centrados');
  for(let i=0;i<5;i++){
   await evaluate(`[...document.querySelectorAll('#upgradesOffers .offer')].find(e=>e.querySelector('.offer-name').textContent==='Armadura').click()`);
   const badge=i===4?'MAX':'Nv'+(i+1)+'/5';let updated=false;
   for(let retry=0;retry<40;retry++){await wait(100);if(await evaluate(`[...document.querySelectorAll('#upgradeSlots .slot-badge')].some(e=>e.textContent===${JSON.stringify(badge)})`)){updated=true;break;}}
   assert(updated,'dock actualiza compra '+(i+1));
  }
  assert(await evaluate(`[...document.querySelectorAll('#upgradeSlots .slot-badge')].some(e=>e.textContent==='MAX')`));
  const maximum=await evaluate('JSON.stringify(NV.alpha.snapshot())');
  await evaluate(`[...document.querySelectorAll('#upgradesOffers .offer')].find(e=>e.querySelector('.offer-name').textContent==='Armadura').click()`);
  assert.equal(await evaluate('JSON.stringify(NV.alpha.snapshot())'),maximum,'maxeada no cobra');
  assert(await evaluate(`!!document.querySelector('#upgradesOffers .offer-restriction svg')`));
  fs.writeFileSync(path.join(out,`shop-${width}.png`),(await win.webContents.capturePage()).toPNG());
  const stages=[];
  for(const [next,capacity] of [[2,2],[5,3],[10,4],[15,5],[20,6]]){
   await evaluate(`NV.__qaShop(${next},true)`);await wait(350);
   const stage=await evaluate(`({wave:${next},offers:document.querySelectorAll('#weaponOffers > .offer:not(.offer-reserved)').length,locked:document.querySelectorAll('#weaponOffers > .offer-locked').length,bonus:document.querySelectorAll('#shopFusionOffers > .offer').length})`);
   assert.equal(stage.offers,capacity);assert.equal(stage.locked,6-capacity);assert.equal(stage.bonus,1);
   stages.push(stage);
  }
  await evaluate(`document.querySelector('#weaponOffers > .offer:not(.offer-reserved)').click()`);
  for(let retry=0;retry<40;retry++){await wait(100);if(await evaluate(`[...document.querySelectorAll('#weaponOffers > .offer')].every(e=>e.getAttribute('aria-disabled')==='true')`))break;}
  const choice=await evaluate('JSON.stringify(NV.alpha.snapshot())');
  await evaluate(`document.querySelectorAll('#weaponOffers > .offer')[1].click()`);
  assert.equal(await evaluate('JSON.stringify(NV.alpha.snapshot())'),choice,'una elección por visita');
  assert(await evaluate(`document.querySelector('#shopFusionOffers > .offer').getAttribute('aria-disabled')==='false'`));
  await evaluate(`document.querySelector('#shopFusionOffers > .offer').click()`);await wait(400);
  assert(await evaluate(`document.querySelector('#shopFusionOffers > .offer').getAttribute('aria-disabled')==='true'`));
  fs.writeFileSync(path.join(out,`shop-six-${width}.png`),(await win.webContents.capturePage()).toPNG());
  assert.deepEqual(errors,[]);reports.push({width,height,mobile,layout,stages,errors});win.destroy();
 }
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({pass:true,reports},null,2));console.log('PASS shop layout desktop/mobile, clocks inert, no console errors');app.exit(0);
}).catch(e=>{console.error(e);app.exit(1);});
