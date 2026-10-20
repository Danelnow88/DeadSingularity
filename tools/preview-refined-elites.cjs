'use strict';
if(!process.versions.electron){
 const {spawn}=require('node:child_process'),path=require('node:path'),env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const child=spawn(require('electron'),[__filename,...process.argv.slice(2)],{cwd:path.resolve(__dirname,'..'),env,windowsHide:process.argv.includes('--capture'),stdio:'inherit'});
 child.on('exit',code=>process.exitCode=code??1);child.on('error',e=>{console.error(e);process.exitCode=1;});
}else{
 const {app,BrowserWindow,protocol,net}=require('electron'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{pathToFileURL}=require('node:url');
 const root=path.resolve(__dirname,'..'),capture=process.argv.includes('--capture'),readability=process.argv.includes('--readability');
 app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'ds-elite-preview-')));
 protocol.registerSchemesAsPrivileged([{scheme:'dselite',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
 app.whenReady().then(async()=>{
  protocol.handle('dselite',req=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url).pathname));return file.startsWith(root+path.sep)?net.fetch(pathToFileURL(file).toString()):new Response('',{status:403});});
  const win=new BrowserWindow({width:1180,height:940,show:!capture,webPreferences:{offscreen:capture,sandbox:true,contextIsolation:true}}),errors=[];
  win.webContents.on('console-message',d=>{if(d.level==='error')errors.push(d.message);});
  await win.loadURL('dselite://project/previews/'+(readability?'elite-readability.html':'refined-elites.html'));
  if(!capture)return;
  for(let i=0;i<100;i++){if(await win.webContents.executeJavaScript('!!window.refinedElitePreview?.().ready'))break;await new Promise(r=>setTimeout(r,50));}
  const state=await win.webContents.executeJavaScript('window.refinedElitePreview()');
  if(!state.ready||state.species.length!==3||errors.length)throw Error(JSON.stringify({state,errors}));
  const visual=await win.webContents.executeJavaScript(`(()=>{
    const N=document.getElementById('game').contentWindow.NV;if(${readability})N.__eliteReadability=true;else delete N.__eliteReadability;
    const c=document.createElement('canvas');c.width=c.height=300;const ctx=c.getContext('2d'),result=[];
    for(const visualId of ['elite_predator','elite_phantom','elite_titan']){
      const e={visualId,isElite:true,refinedEliteReadability:true},before=JSON.stringify(e),pixels=[];
      for(const [time,x,y]of [[0,-200,0],[0,200,0],[.8,200,0]]){
        ctx.clearRect(0,0,300,300);ctx.save();ctx.translate(150,150);ctx.scale(2,2);
        if(!N.drawRefinedEliteBody(ctx,e,time,'#fff',x,y))throw Error('Sprite unavailable');
        ctx.restore();if(!ctx.getTransform().isIdentity)throw Error('Leaked canvas transform');pixels.push(ctx.getImageData(0,0,300,300).data);
      }
      const difference=(a,b)=>{let n=0;for(let i=0;i<a.length;i+=4)if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2]||a[i+3]!==b[i+3])n++;return n;};
      result.push({visualId,gazePixels:difference(pixels[0],pixels[1]),motionPixels:difference(pixels[1],pixels[2]),unchanged:JSON.stringify(e)===before});
    }
    const integration=[];delete N.__refinedEliteBody; // exercise the normal per-species production flag
    const body=N.drawRefinedEliteBody;let calls=0;N.drawRefinedEliteBody=function(...args){calls++;return body.apply(this,args);};
    try{for(const type of N.dimensionBaselineRoster().elites.filter(t=>['elite_predator','elite_phantom','elite_titan'].includes(t.visualId))){
      for(const attacking of [false,true,'execution']){
        const e={...type,isElite:true,x:150,y:150,hp:100,maxHp:100,dead:false,
          predatorState:attacking==='execution'?'execution':attacking?'execution_windup':'roam',predatorStateTimer:attacking==='execution'?.07:.2,
          goliathState:attacking?'slam_windup':'roam',goliathStateTimer:.2,phantomState:'roam'};
        const before=JSON.stringify(e),count=calls;
        N.presentationClock.beginFrame(2,0);N.prepareEnemyVisualBudget([e],{x:240,y:170});
        N.drawSpectralEnemy2D(ctx,e,120,{x:240,y:170},null);
        integration.push({id:type.visualId,attacking,bodyCalled:calls===count+1,unchanged:JSON.stringify(e)===before,transform:ctx.getTransform().isIdentity});
      }
    }}finally{N.drawRefinedEliteBody=body;}
    return {stats:N.refinedEliteRenderStats(),readabilityStats:N.refinedEliteReadabilityStats(),result,integration};
  })()`);
  if(!visual.result.every(r=>r.gazePixels>0&&r.motionPixels>0&&r.unchanged)||!visual.stats.species.every(s=>s.transparent>.1))throw Error('Creature gaze/motion/alpha contract failed');
  if(readability&&(visual.readabilityStats.species.length!==3||!visual.readabilityStats.species.every(s=>s.ready&&!s.error&&s.transparent>.1)))throw Error('Readability assets missing or opaque');
  if(![...visual.stats.species,...visual.readabilityStats.species].every(s=>s.materialReady))throw Error('Basalt elite material missing');
  if(!visual.integration.every(r=>r.bodyCalled&&r.unchanged&&r.transform))throw Error('Existing combat renderer integration failed');
  await new Promise(r=>setTimeout(r,500));
  const out=path.join(root,'local/validation/'+(readability?'elite-readability-20261015':'refined-elites-20261014'));fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'preview.png'),(await win.webContents.capturePage()).toPNG());
  fs.writeFileSync(path.join(out,'preview.json'),JSON.stringify({state,visual,errors},null,2));
  console.log('PASS animated three-species preview',JSON.stringify(state));app.exit(0);
 }).catch(e=>{console.error(e);app.exit(1);});
}
