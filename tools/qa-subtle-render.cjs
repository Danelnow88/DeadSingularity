'use strict';
if(!process.versions.electron){
 const {spawn}=require('node:child_process');const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const child=spawn(require('electron'),[__filename],{env,windowsHide:true,stdio:'inherit'});
 child.on('exit',code=>process.exitCode=code==null?1:code);child.on('error',error=>{console.error(error);process.exitCode=1;});
}else{
 const {app,BrowserWindow,protocol,net}=require('electron');
 const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
 const root=path.resolve(__dirname,'..'),out=path.join(root,'local/validation/subtle-render-20261014');
 app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'ds-subtle-qa-')));app.on('window-all-closed',()=>{});
 protocol.registerSchemesAsPrivileged([{scheme:'dsv1',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
 app.whenReady().then(async()=>{
  protocol.handle('dsv1',r=>{const file=path.resolve(root,'.'+new URL(r.url).pathname);return file.startsWith(root+path.sep)?net.fetch(pathToFileURL(file).toString()):new Response('',{status:403});});
  const win=new BrowserWindow({show:false,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true}});
  const errors=[];win.webContents.on('console-message',d=>{if(d.level==='error')errors.push(d.message);});
  await win.loadURL('dsv1://project/index.html?fresh=1');
  const result=await win.webContents.executeJavaScript(`(()=>{
   NV.setGraphicsQuality('high');NV.setGraphicsOption('particles',true);NV.setGraphicsOption('heavyVfx',true);NV.setComfortOption('reducedEffects',false);NV.resetVisualBudget();NV.updateVisualBudget=()=>{};
   const roster=NV.dimensionBaselineRoster();const types=[...roster.enemies.filter(e=>['swarmlet','spitter'].includes(e.id)),...roster.elites];
   const sheet=document.createElement('canvas');sheet.width=800;sheet.height=types.length*170;const dest=sheet.getContext('2d');const reports=[];
   types.forEach((type,row)=>{
    const e={...type,enemyTypeId:type.id,x:0,y:0,hp:100,maxHp:100,dead:false,isElite:!!type.visualId,atkFlash:0};
    for(const attack of [false,true]){
     e.atkFlash=attack?.25:0;e.swarmState=attack?'commit':'approach';e.swarmCommitDirX=1;e.swarmCommitDirY=0;
     e.intent={state:attack?'windup':'positioning',stateTimer:.1};e.predatorState=attack?'execution_windup':'roam';e.predatorStateTimer=.2;e.goliathState=attack?'slam_windup':'roam';e.goliathStateTimer=.2;
     const before=JSON.stringify(e),pixels=[];
     for(const candidate of [false,true]){
      NV.__subtleCommon=candidate;NV.__subtleHydra=candidate;NV.presentationClock.beginFrame(2,0);
      NV.prepareEnemyVisualBudget([e],{x:180,y:80});
      const c=document.createElement('canvas');c.width=200;c.height=170;const ctx=c.getContext('2d',{willReadFrequently:false});
      ctx.fillStyle='#102036';ctx.fillRect(0,0,200,170);ctx.save();ctx.translate(100,85);ctx.scale(2.1,2.1);
      if(NV.hasCommonEnemyVisual(e.enemyTypeId))NV.drawEnemy(ctx,e,120,{x:180,y:80},null,2);else NV.drawSpectralEnemy2D(ctx,e,120,{x:180,y:80},null);
      ctx.restore();pixels.push(ctx.getImageData(0,0,200,170).data);
      const col=(attack?2:0)+(candidate?1:0);dest.drawImage(c,col*200,row*170);
      dest.font='11px sans-serif';dest.fillStyle='#d4e4ea';dest.fillText((type.name||type.visualId)+' '+(attack?'ATAQUE':'REPOSO')+' '+(candidate?'NUEVO':'ANTES'),col*200+5,row*170+16);
     }
     let max=0,sum=0,n=0;for(let i=0;i<pixels[0].length;i++){const d=Math.abs(pixels[0][i]-pixels[1][i]);max=Math.max(max,d);sum+=d;if(d)n++;}
     reports.push({id:type.id||type.visualId,attack,max,mean:sum/pixels[0].length,differingChannels:n,actorUnchanged:JSON.stringify(e)===before});
    }
   });
   return {reports,png:sheet.toDataURL('image/png').split(',')[1]};
  })()`,true);
  assert.deepEqual(errors,[]);assert(result.reports.every(r=>r.actorUnchanged),'Actor simulation data mutated');
  fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'comparacion.png'),Buffer.from(result.png,'base64'));
  fs.writeFileSync(path.join(out,'visual.json'),JSON.stringify({reports:result.reports,errors},null,2));
  console.log(JSON.stringify(result.reports));win.close();app.exit(0);
 }).catch(error=>{console.error(error);app.exit(1);});
}
