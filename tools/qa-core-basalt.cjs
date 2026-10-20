'use strict';
const path=require('node:path'),fs=require('node:fs'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
if(!process.versions.electron){
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const p=require('node:child_process').spawn(require('electron'),[__filename],{cwd:root,env,windowsHide:true,stdio:'inherit'});
  p.on('error',e=>{console.error(e);process.exitCode=1;});p.on('exit',c=>process.exitCode=c??1);
}else{
  const {app,BrowserWindow,protocol,net}=require('electron'),{pathToFileURL}=require('node:url');
  app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'ds-core-basalt-')));
  protocol.registerSchemesAsPrivileged([{scheme:'dsbasalt',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
  app.whenReady().then(async()=>{
    protocol.handle('dsbasalt',req=>{const u=new URL(req.url),file=path.resolve(root,'.'+decodeURIComponent(u.pathname));return u.host==='project'&&file.startsWith(root+path.sep)?net.fetch(pathToFileURL(file).href):new Response('',{status:403});});
    const win=new BrowserWindow({width:1100,height:760,show:false,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true}}),errors=[];
    win.webContents.on('console-message',d=>{if(d.level==='error')errors.push(d.message);});
    await win.loadURL('dsbasalt://project/index.html?fresh=1');
    await win.webContents.executeJavaScript('NV.preloadInertiaSprites()');
    for(let i=0;i<100;i++){if(await win.webContents.executeJavaScript('NV.inertiaSpriteStatus().every(s=>s.ready)'))break;await new Promise(r=>setTimeout(r,50));}
    const result=await win.webContents.executeJavaScript(`(()=>{
      const status=NV.inertiaSpriteStatus();if(!status.every(s=>s.ready&&!s.error&&s.materialReady))throw Error('Core material missing');
      const c=document.createElement('canvas');c.width=1100;c.height=720;const ctx=c.getContext('2d');
      ctx.fillStyle='#0b1422';ctx.fillRect(0,0,c.width,c.height);ctx.textAlign='center';
      const scratch=document.createElement('canvas');scratch.width=scratch.height=400;const s=scratch.getContext('2d');
      const checks=[];
      for(let pattern=0;pattern<3;pattern++){
        const x=183+pattern*367,view={age:2,target:{x:0,y:0,pattern,hp:pattern===2?180:360,maxHp:360,windup:pattern===1?.15:0,hitFlash:0,aimAngle:0}};
        const before=JSON.stringify(view);ctx.fillStyle=['#70e6ef','#ffd77d','#fc79d1'][pattern];ctx.font='bold 18px system-ui';
        ctx.fillText(['NÚCLEO I · REPOSO','NÚCLEO II · CARGANDO','NÚCLEO III · DAÑADO'][pattern],x,45);
        for(const [y,scale]of [[220,2],[535,1]]){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);NV.drawInertiaChamber(ctx,view);ctx.restore();}
        if(JSON.stringify(view)!==before||!ctx.getTransform().isIdentity)throw Error('Gameplay or transform mutated');
        ctx.fillStyle='#a9bac9';ctx.font='13px system-ui';ctx.fillText('ESCALA DE PARTIDA',x,440);
        s.save();s.translate(200,170);NV.drawInertiaChamber(s,view);s.restore();const a=s.getImageData(0,0,400,400).data;
        view.age+=.17;s.clearRect(0,0,400,400);s.save();s.translate(200,170);NV.drawInertiaChamber(s,view);s.restore();const b=s.getImageData(0,0,400,400).data;
        let changed=0;for(let i=0;i<a.length;i+=4)if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2])changed++;
        checks.push({pattern,changed});
      }
      const palette=document.createElement('canvas');palette.width=4;palette.height=1;const p=palette.getContext('2d');
      ['#cfbda5','#00dcf1','#ffd13b','#ff19ab'].forEach((color,i)=>{p.fillStyle=color;p.fillRect(i,0,1,1);});
      const original=Array.from(p.getImageData(0,0,4,1).data);const dest=document.createElement('canvas');dest.width=4;dest.height=1;
      const d=dest.getContext('2d');d.filter=NV.cachedBasaltMaterialFilter('core');d.drawImage(palette,0,0);const colors=Array.from(d.getImageData(0,0,4,1).data);
      if(colors[0]>original[0]*.65)throw Error('Stone not darkened');
      for(let i=4;i<16;i++)if(Math.abs(original[i]-colors[i])>1)throw Error('Energy palette changed');
      return {status,checks,png:c.toDataURL().split(',')[1]};
    })()`);
    assert(result.checks.every(c=>c.changed>15));assert.equal(errors.length,0,JSON.stringify(errors));
    const out=path.join(root,'local/validation/core-basalt');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'cores.png'),Buffer.from(result.png,'base64'));delete result.png;
    await win.loadFile(path.join(root,'index.html'),{query:{fresh:'1'}});await win.webContents.executeJavaScript('NV.preloadInertiaSprites()');
    for(let i=0;i<100;i++){if(await win.webContents.executeJavaScript('NV.inertiaSpriteStatus().every(s=>s.ready)'))break;await new Promise(r=>setTimeout(r,50));}
    assert(await win.webContents.executeJavaScript('NV.inertiaSpriteStatus().every(s=>s.materialReady)'),'file:// cache missing');
    fs.writeFileSync(path.join(out,'qa.json'),JSON.stringify({...result,errors,fileProtocol:true},null,2));
    console.log('PASS basalt cores: three bodies, two articulated housings, energy palette, live exhaust, immutable gameplay and file://');app.exit(0);
  }).catch(e=>{console.error(e);app.exit(1);});
}
