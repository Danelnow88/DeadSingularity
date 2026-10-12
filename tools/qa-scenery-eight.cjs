'use strict';
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'ds-scenery-')));
app.whenReady().then(async()=>{
  const win=new BrowserWindow({show:false,width:1280,height:900,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true}});
  const errors=[];win.webContents.on('console-message',(event)=>{if(event.level==='error')errors.push(event.message);});
  await win.loadFile(path.resolve(__dirname,'../previews/dimension-environments.html'));
  for(let i=0;i<100;i++){if(await win.webContents.executeJavaScript('NV.dimensionSceneryStatus().length===6&&NV.dimensionSceneryStatus().every(s=>s.ready)&&NV.inertiaSpriteStatus().every(s=>s.ready)'))break;await new Promise(resolve=>setTimeout(resolve,50));}
  assert(await win.webContents.executeJavaScript('NV.dimensionSceneryStatus().length===6&&NV.dimensionSceneryStatus().every(s=>s.ready&&!s.error)'),'all six illustrated assets must load');
  const result=await win.webContents.executeJavaScript(`(()=>{
    const canvases=Array.from(document.querySelectorAll('article canvas'));
    const pixels=canvases.map(c=>c.toDataURL());
    const sheet=document.createElement('canvas');sheet.width=1440;sheet.height=964;
    const ctx=sheet.getContext('2d');ctx.fillStyle='#050a14';ctx.fillRect(0,0,sheet.width,sheet.height);
    canvases.forEach((c,i)=>{const x=(i%2)*720,y=Math.floor(i/2)*241;ctx.drawImage(c,x,y+28,720,208);ctx.fillStyle='#dceaf7';ctx.font='16px system-ui';ctx.fillText(NV.DIMENSION_VISUALS[i].name,x+12,y+21);});
    const target=document.createElement('canvas');target.width=1350;target.height=780;const c=target.getContext('2d');
    const costs=[];
    for(let i=0;i<8;i++){
      NV.drawSectorBackdrop(c,1350,780,0,1+i*5,{preview:true});
      const builds=NV.getSectorBackdropStats().builds,start=performance.now();
      for(let f=0;f<240;f++)NV.drawSectorBackdrop(c,1350,780,f,1+i*5,{preview:true});
      costs.push({name:NV.DIMENSION_VISUALS[i].name,meanMs:(performance.now()-start)/240,buildsBefore:builds,buildsAfter:NV.getSectorBackdropStats().builds});
    }
    return {count:canvases.length,unique:new Set(pixels).size,costs,sheet:sheet.toDataURL(),stats:NV.getSectorBackdropStats()};
  })()`);
  assert.equal(result.count,8);assert.equal(result.unique,8);
  for(const value of ['common','elite','boss','core']){
    await win.webContents.executeJavaScript(`document.getElementById('group').value=${JSON.stringify(value)};document.getElementById('group').dispatchEvent(new Event('change'));`);
  }
  assert.equal(errors.length,0,'gallery must draw all actual combat families: '+errors.join(' | '));
  assert(result.costs.every(c=>c.buildsBefore===c.buildsAfter),'moving/time must not rebake terrain');
  const out=path.resolve(__dirname,'../local/validation/scenery-eight');fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'scenarios.png'),Buffer.from(result.sheet.split(',')[1],'base64'));
  delete result.sheet;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(result,null,2));
  await win.loadFile(path.resolve(__dirname,'../index.html'),{query:{dimensionEvents:'preview'}});
  assert(await win.webContents.executeJavaScript('NV.dimensionIllustratedScenery===true'),'illustrations must be enabled in the trial');
  await win.webContents.executeJavaScript('NV.drawSectorBackdrop(NV.ctx,900,520,0,1,{preview:true})');
  for(let i=0;i<100;i++){if(await win.webContents.executeJavaScript('NV.dimensionSceneryStatus().some(s=>s.ready)'))break;await new Promise(resolve=>setTimeout(resolve,50));}
  assert(await win.webContents.executeJavaScript('NV.dimensionSceneryStatus().some(s=>s.ready)'), 'trial illustration must load');
  await win.webContents.executeJavaScript('NV.drawSectorBackdrop(NV.ctx,900,520,0,1,{preview:true})');
  assert(await win.webContents.executeJavaScript('NV.getSectorBackdropStats().artReady'), 'trial must draw the current artwork');
  await win.loadFile(path.resolve(__dirname,'../index.html'));
  assert(await win.webContents.executeJavaScript('NV.dimensionIllustratedScenery===true'),'approved illustrations must be available in normal gameplay');
  console.log(JSON.stringify(result));win.destroy();app.quit();
}).catch(error=>{console.error(error);app.exit(1);});
