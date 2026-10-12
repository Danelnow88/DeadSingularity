'use strict';
const {app,BrowserWindow}=require('electron');
const path=require('node:path'),assert=require('node:assert/strict');
app.setPath('userData',require('node:fs').mkdtempSync(path.join(require('node:os').tmpdir(),'ds-roster-')));
app.whenReady().then(async()=>{
  const win=new BrowserWindow({show:false,width:1280,height:900,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true}});
  const errors=[];
  win.webContents.on('console-message',(_e,level,message)=>{if(level===3)errors.push(message);});
  await win.loadFile(path.resolve(__dirname,'../previews/enemy-roster-canonical.html'));
  await win.webContents.executeJavaScript('NV.preloadInertiaSprites()');
  for(let i=0;i<80;i++){
    if(await win.webContents.executeJavaScript('NV.inertiaSpriteStatus().every(s=>s.ready||s.error)'))break;
    await new Promise(resolve=>setTimeout(resolve,50));
  }
  const status=await win.webContents.executeJavaScript('NV.inertiaSpriteStatus()');
  console.log(JSON.stringify({status,errors}));
  assert(status.every(s=>s.ready&&!s.error),'Current core art must load');
  assert(status.slice(0,2).every(s=>s.articulated),'Current articulated rotors must load');
  const texts=await win.webContents.executeJavaScript('Array.from(document.querySelectorAll("canvas")).map(c=>({id:c.dataset.id,text:c.getContext("2d").getImageData(0,0,1,1).data.length}))');
  assert(texts.some(c=>c.id==='core::core_cyan'));
  console.log('PASS current roster art');
  win.destroy();app.quit();
}).catch(error=>{console.error(error);app.exit(1);});
