'use strict';
const {app,BrowserWindow,protocol,net}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'local/validation/graphic-space');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'ds-graphic-space-')));app.on('window-all-closed',()=>{});
protocol.registerSchemesAsPrivileged([{scheme:'dsv1',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
app.whenReady().then(async()=>{
 fs.mkdirSync(out,{recursive:true});protocol.handle('dsv1',req=>{const u=new URL(req.url),f=path.resolve(root,'.'+u.pathname);if(!f.startsWith(root+path.sep))return new Response('',{status:403});return net.fetch(pathToFileURL(f).toString());});
 const win=new BrowserWindow({width:1280,height:800,useContentSize:true,show:false,webPreferences:{sandbox:true,contextIsolation:true,offscreen:true,backgroundThrottling:false}});
 const evaluate=s=>win.webContents.executeJavaScript(s,true),errors=[];win.webContents.on('console-message',d=>{if(d.level==='error')errors.push(d.message);});
 await win.loadURL('dsv1://project/index.html?fresh=1');await wait(700);
 await evaluate(`NV.viewport.requestFullscreen=()=>Promise.resolve(false);document.getElementById('lobbyPlayBtn').click();true;`);await wait(600);
 const scenes=[];
 for(let i=0;i<8;i++){
  await evaluate(`NV.sectorVisualForWave=()=>NV.dimensionSkyBaseline.profiles[${i}];true;`);await wait(280);
  const d=await evaluate('NV.spaceEnvironment.diagnostics()');assert(d.active&&!d.failed,'GPU scene failed '+JSON.stringify(d));assert.equal(d.uploads,1);assert.equal(d.starCount,160);
  fs.writeFileSync(path.join(out,d.scene+'.png'),(await win.webContents.capturePage()).toPNG());scenes.push(d);
 }
 await evaluate('window.dispatchEvent(new KeyboardEvent("keydown",{code:"KeyP",key:"p",bubbles:true}));true;');await wait(180);assert(await evaluate('NV.getRuntimeSnapshot().paused'));
 const frozen=await evaluate('NV.spaceEnvironment.diagnostics()');await wait(350);assert.equal((await evaluate('NV.spaceEnvironment.diagnostics()')).frames,frozen.frames);
 await evaluate(`NV.settingsUI.open();document.getElementById('tabGraphics').click();document.getElementById('settingsSpaceTravel').click();true;`);await wait(150);
 assert(!(await evaluate('NV.settings.graphics.spaceTravel')));assert.equal(await evaluate('getComputedStyle(document.querySelector(".space-environment")).display'),'none');
 await win.reload();await wait(600);assert.equal(await evaluate('NV.settings.graphics.spaceTravel'),false,'style choice not persisted');
 await win.loadURL('dsv1://project/index.html?fresh=1&mobile=1');win.setContentSize(844,390);await wait(500);
 await evaluate(`NV.setGraphicsOption('spaceTravel',true);NV.viewport.requestFullscreen=()=>Promise.resolve(false);document.getElementById('lobbyPlayBtn').click();true;`);await wait(650);
 const alignment=await evaluate(`(()=>{const a=NV.canvas.getBoundingClientRect(),b=document.querySelector('.space-environment').getBoundingClientRect();return [a.x-b.x,a.y-b.y,a.width-b.width,a.height-b.height];})()`);
 assert(alignment.every(v=>Math.abs(v)<1));fs.writeFileSync(path.join(out,'mobile.png'),(await win.webContents.capturePage()).toPNG());
 await evaluate(`document.querySelector('.space-environment').getContext('webgl').getExtension('WEBGL_lose_context').loseContext();true;`);await wait(160);
 assert(await evaluate('NV.spaceEnvironment.diagnostics().failed&&!NV.spaceEnvironment.diagnostics().active'));
 fs.writeFileSync(path.join(out,'fallback.png'),(await win.webContents.capturePage()).toPNG());assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({pass:true,scenes,frozen,alignment,errors},null,2));console.log('PASS 8 graphic skies, one field upload, pause, style toggle/persistence, mobile alignment, loss fallback');app.exit(0);
}).catch(e=>{console.error(e);app.exit(1);});
