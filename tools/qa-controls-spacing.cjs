'use strict';
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
app.setPath('userData',fs.mkdtempSync(path.join(require('node:os').tmpdir(),'ds-controls-')));
app.on('window-all-closed',()=>{});
app.whenReady().then(async()=>{
  const out=path.join(root,'local/validation/controls-spacing');fs.mkdirSync(out,{recursive:true});
  for(const [width,height] of [[551,670],[390,844],[1280,800]]) {
    const win=new BrowserWindow({width,height,useContentSize:true,show:false,
      webPreferences:{offscreen:true,sandbox:true,contextIsolation:true}});
    await win.loadFile(path.join(root,'index.html'),{query:{fresh:'1'}});
    await win.webContents.executeJavaScript('NV.settingsUI.open();document.getElementById("tabControls").click()');
    const geometry=await win.webContents.executeJavaScript(`(()=>{
      const tabs=document.querySelector('.settings-tabs').getBoundingClientRect();
      const cards=[...document.querySelectorAll('#panelControls .quality-options label')].map(e=>{
        const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,width:r.width};});
      return {gap:cards[0].top-tabs.bottom,cardGap:cards[1].left-cards[0].right,cards};
    })()`);
    assert(geometry.gap>=12,'tabs touch controls');assert(geometry.cardGap>=10,'cards touch');
    assert(Math.abs(geometry.cards[0].width-geometry.cards[1].width)<2,'uneven cards');
    await new Promise(resolve=>setTimeout(resolve,350));
    fs.writeFileSync(path.join(out,width+'-controls.png'),(await win.webContents.capturePage()).toPNG());
    win.destroy();
  }
  console.log('PASS controls spacing: desktop, narrow panel and mobile widths');app.exit(0);
}).catch(error=>{console.error(error);app.exit(1);});
