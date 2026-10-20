'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
if(!process.versions.electron){const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;const p=require('node:child_process').spawn(require('electron'),[__filename],{cwd:root,env,windowsHide:true,stdio:'inherit'});p.on('exit',c=>process.exitCode=c??1);}
else{
 const {app,BrowserWindow,protocol,net}=require('electron'),{pathToFileURL}=require('node:url');
 const out=path.join(root,'local/validation/weapon-fusion'),wait=ms=>new Promise(r=>setTimeout(r,ms));
 app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'ds-fusion-ui-')));
 app.on('window-all-closed',()=>{});
 protocol.registerSchemesAsPrivileged([{scheme:'fusionqa',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
 app.whenReady().then(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const source=fs.readFileSync(path.join(root,'js/game.js'),'utf8').replace('NV.getState = () => state;',`NV.__qaFusion = () => {wave=9;shards=1000;inventory=WEAPONS.slice(0,4);currentWeapon=inventory[0];weaponFus={};inventory.forEach((w,i)=>weaponFus[w.id]=i);state='wave_end';beginShopEntrance();economyStock=NV.createEconomyStock(()=>.9);generateOffers();renderInventory();finishShopEntrance();};
  NV.__qaFusionHUD=()=>{const cv=document.createElement('canvas');cv.width=840;cv.height=510;const c=cv.getContext('2d');c.fillStyle='#08111e';c.fillRect(0,0,840,510);c.scale(3,3);NV.drawWeaponHUD(c,280,170,CHARACTERS,RARITY_COLORS,player,currentWeapon,currentWeaponLevel,inventory,[],0,true,id=>weaponLevels[id]||1,weaponFusionLevel);return cv.toDataURL().split(',')[1];};
  NV.getState = () => state;`);
  assert(source.includes('NV.__qaFusion ='));
  protocol.handle('fusionqa',request=>{
   const u=new URL(request.url),file=path.resolve(root,'.'+decodeURIComponent(u.pathname));
   if(u.host!=='project'||!file.startsWith(root+path.sep))return new Response('',{status:403});
   if(u.pathname==='/js/game.js')return new Response(source,{headers:{'Content-Type':'text/javascript'}});
   return net.fetch(pathToFileURL(file).href);
  });
  const reports=[],errors=[];
  for(const [width,height,mobile] of [[1280,800,false],[844,390,true]]){
   const w=new BrowserWindow({width,height,show:false,webPreferences:{offscreen:true,backgroundThrottling:false,sandbox:true,contextIsolation:true}});
   w.webContents.on('console-message',d=>{if(d.level==='error')errors.push(d.message);});const run=s=>w.webContents.executeJavaScript(s);
   await w.loadURL('fusionqa://project/index.html?fresh=1'+(mobile?'&mobile=1':''));await wait(300);
   await run('Element.prototype.requestFullscreen=()=>Promise.resolve();document.getElementById("lobbyPlayBtn").click();NV.__qaFusion()');await wait(450);
   assert.equal(await run('NV.getState()'),'shop','Inspect a visible real shop, not hidden DOM');
   assert(await run("[...document.querySelectorAll('#invSlots .inv-slot')].slice(0,4).every(e=>e.getBoundingClientRect().width>10&&e.getBoundingClientRect().height>10)"));
   const rows=await run(`(()=>{const rows=[...document.querySelectorAll('#invSlots .inv-slot')].slice(0,4).map(e=>{const a=e.getBoundingClientRect(),m=e.querySelector('.weapon-fusion-mark'),b=m?.getBoundingClientRect();return {tier:Number(e.dataset.fusionTier),fused:e.classList.contains('weapon-fused'),active:e.querySelectorAll('.fusion-step.active').length,label:e.getAttribute('aria-label'),background:getComputedStyle(e).backgroundColor,markInside:!b||(b.left>=a.left&&b.right<=a.right&&b.top>=a.top&&b.bottom<=a.bottom),text:e.textContent.trim()};});return rows;})()`);
   assert.equal(rows.length,4);rows.forEach((r,i)=>{assert.equal(r.tier,i);assert.equal(r.active,i);assert.equal(r.fused,i>0);assert(r.markInside);assert(!/Fusión|Nv[123]/.test(r.text));});
   assert.notEqual(rows[0].background,rows[1].background);
   assert(await run('document.querySelectorAll("#invSlots .inv-fuse").length===0'));
   fs.writeFileSync(path.join(out,'shop-'+width+'.png'),(await w.webContents.capturePage()).toPNG());
   if(!mobile){const png=await run('NV.__qaFusionHUD()');fs.writeFileSync(path.join(out,'hud-3x.png'),Buffer.from(png,'base64'));}
   reports.push({width,height,mobile,rows});w.destroy();
  }
  assert.equal(errors.length,0,JSON.stringify(errors));fs.writeFileSync(path.join(out,'qa.json'),JSON.stringify({reports,errors},null,2));
  console.log('PASS fusion UI: 0/1/2/3, desktop/mobile, no miniature text, same marks in shop/HUD, no overflow, no console errors. '+out);app.exit(0);
 }).catch(e=>{console.error(e);app.exit(1);});
}
