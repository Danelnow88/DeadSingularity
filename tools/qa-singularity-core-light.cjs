'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
if(!process.versions.electron){
 const {spawn}=require('node:child_process'),env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const p=spawn(require(path.join(root,'node_modules/electron')),[__filename],{cwd:root,env,windowsHide:true,stdio:'inherit'});
 p.on('exit',c=>process.exitCode=c??1);p.on('error',e=>{console.error(e);process.exitCode=1;});
}else{
 const{app,BrowserWindow,protocol,net}=require('electron'),{pathToFileURL}=require('node:url');
 app.disableHardwareAcceleration();app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'ds-core-qa-')));
 protocol.registerSchemesAsPrivileged([{scheme:'dscores',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
 app.whenReady().then(async()=>{
  protocol.handle('dscores',req=>{const u=new URL(req.url),f=path.resolve(root,'.'+decodeURIComponent(u.pathname));return u.host==='project'&&f.startsWith(root+path.sep)?net.fetch(pathToFileURL(f).href):new Response('',{status:403});});
  const out=path.join(root,'local/validation/singularity-core-light-v2');fs.mkdirSync(out,{recursive:true});
  const w=new BrowserWindow({width:1400,height:1100,show:false,webPreferences:{offscreen:true,backgroundThrottling:false,sandbox:true,contextIsolation:true}}),errors=[];
  w.webContents.on('console-message',d=>{if(d.level==='error')errors.push(d.message);});
  const run=s=>w.webContents.executeJavaScript(s),wait=ms=>new Promise(r=>setTimeout(r,ms));
  await w.loadURL('dscores://project/previews/enemy-core-lighting.html');
  for(let n=0;n<200;n++){if(await run('NV.singularityFamilyStats().species.every(s=>s.ready&&s.lightReady)&&NV.singularityFamilyStats().species.length===9'))break;if(n===199)throw Error('Lighting load timeout');await wait(40);}
  const result=await run(`(()=>{
   const N=NV,stats=N.singularityFamilyStats().species,ids=stats.map(s=>s.id);
   const fixtures=[
    {enemyTypeId:'runner',intent:{state:'windup',stateTimer:.052}},
    {enemyTypeId:'tank',tankCannonState:'windup',tankCannonTimer:.03},
    {enemyTypeId:'swarmlet',swarmState:'form',swarmStateTimer:.025,swarmReady:true},
    {enemyTypeId:'spitter',intent:{state:'windup',stateTimer:.132}},
    {enemyTypeId:'wisp',wispPhaseState:'pulse',wispPhaseTimer:.09},
    {enemyTypeId:'kamikaze',armed:true,fuse:.05},
    {enemyTypeId:'specter_archer',intent:{state:'windup',stateTimer:.04}},
    {enemyTypeId:'specter_guard',guardProtectionActive:true,guardTarget:{dead:false}},
    {enemyTypeId:'specter_core',coreZoneState:'windup',coreZoneTimer:.02}];
   const cv=document.createElement('canvas');cv.width=1200;cv.height=990;const c=cv.getContext('2d');
   c.fillStyle='#08101f';c.fillRect(0,0,1200,990);
   function draw(e,x,y,z){c.save();c.translate(x,y);c.scale(z,z);if(e.enemyTypeId.startsWith('specter_'))N.drawSingularitySpecter(c,e,null,.336);else{const a=stats.find(s=>s.id===e.enemyTypeId);c.scale(a.localScale,a.localScale);N.drawSingularityCommon(c,e,undefined,undefined,.336);}c.restore();}
   const measurements=[];
   fixtures.forEach((f,i)=>{
    const e=Object.freeze({...f,x:0,y:0,radius:12});if(e.intent)Object.freeze(e.intent);const before=JSON.stringify(e),x=i%3*400,y=Math.floor(i/3)*330;
    c.fillStyle='#e7eefb';c.font='16px sans-serif';c.fillText(ids[i],x+18,y+27);
    N.__singularityCoreLighting=false;draw(e,x+105,y+132,2.9);
    const off=c.getImageData(x+35,y+50,140,170).data;
    N.__singularityCoreLighting=true;draw(e,x+292,y+132,2.9);
    const on=c.getImageData(x+222,y+50,140,170).data;
    let gain=0,positive=0;for(let p=0;p<off.length;p+=4){const d=on[p]+on[p+1]+on[p+2]-off[p]-off[p+1]-off[p+2];gain+=d;if(d>6)positive++;}
    if(gain<=100||positive<10)throw Error('No visible emission: '+ids[i]);
    if(JSON.stringify(e)!==before)throw Error('Mutated entity: '+ids[i]);
    draw(e,x+200,y+255,1);c.fillStyle='#a5b5cc';c.font='12px sans-serif';c.fillText('Base',x+89,y+205);c.fillText('Núcleo activo',x+248,y+205);c.fillText('Tamaño actual',x+156,y+300);
    measurements.push({id:ids[i],totalRgbGain:gain,changedPixels:positive,intensity:N.singularityCoreIntensity(e,.336)});
   });
   window.coreQaFixtures=fixtures;
   return {png:cv.toDataURL('image/png').split(',')[1],measurements,stats:N.singularityFamilyStats()};
  })()`);
  fs.writeFileSync(path.join(out,'light-comparison.png'),Buffer.from(result.png,'base64'));delete result.png;
  // Bounded render-call microbenchmark. This measures CPU command submission,
  // not end-to-end GPU frame time or a certified game FPS target.
  const perf=await run(`(()=>{
   const c=document.createElement('canvas');c.width=1400;c.height=900;const g=c.getContext('2d');
   const stats=NV.singularityFamilyStats().species,actors=Array.from({length:30},(_,i)=>({...window.coreQaFixtures[i%9],x:0,y:0}));
   function batch(on){NV.__singularityCoreLighting=on;const times=[];for(let frame=0;frame<180;frame++){const begin=performance.now();g.clearRect(0,0,1400,900);
    for(let i=0;i<actors.length;i++){const e=actors[i];g.save();g.translate(80+i%10*130,100+Math.floor(i/10)*250);
     if(e.enemyTypeId.startsWith('specter_'))NV.drawSingularitySpecter(g,e,null,frame/60);else{const s=stats.find(s=>s.id===e.enemyTypeId);g.scale(s.localScale,s.localScale);NV.drawSingularityCommon(g,e,undefined,undefined,frame/60);}g.restore();}
    if(frame>=30)times.push(performance.now()-begin);}
    times.sort((a,b)=>a-b);return{medianMs:times[Math.floor(times.length*.5)],p95Ms:times[Math.floor(times.length*.95)]};}
   batch(false);batch(true);const off=batch(false),on=batch(true);NV.__singularityCoreLighting=true;
   return{actors:30,off,on,medianDeltaMs:on.medianMs-off.medianMs,kind:'CPU command submission microbenchmark; not total frame time'};
  })()`);
  await w.loadFile(path.join(root,'previews/enemy-core-lighting.html'));
  await wait(1800);
  const file=await run('({ready:NV.singularityFamilyStats().species.every(s=>s.ready&&s.lightReady),cards:document.querySelectorAll(".card").length})');
  assert(file.ready);assert.equal(file.cards,9);
  await w.loadURL('dscores://project/index.html?combatLab=1');
  for(let n=0;n<200;n++){if(await run('!!NV.combatLabRuntime&&NV.singularityFamilyStats().species.every(s=>s.ready&&s.lightReady)'))break;if(n===199)throw Error('Game load timeout');await wait(40);}
  const started=await run(`(()=>{
   window.coreQaActors=new Map();window.coreQaPlayer=null;
   for(const name of ['drawEnemy','drawSpectralEnemy2D']){const original=NV[name];NV[name]=function(ctx,e,frame,player,...rest){if(e&&!e.isElite){window.coreQaActors.set(e,e);if(player)window.coreQaPlayer=player;}return original.call(this,ctx,e,frame,player,...rest);};}
   return NV.combatLabRuntime.start({characterId:'rook',wave:1,difficultyId:'normal',durationMode:'infinite',composition:NV.singularityFamilyStats().species.map(s=>({enemyId:s.id,quantity:s.id==='swarmlet'?3:1}))});
  })()`);
  assert(started.ok,JSON.stringify(started));await wait(250);
  // Controlled starting placement in an isolated test profile. Subsequent state
  // transitions, timers, attacks and renderer calls are the actual production AI.
  const placed=await run(`(()=>{const p=window.coreQaPlayer;if(!p)return false;NV.combatLabRuntime.pause();const actors=[...window.coreQaActors.values()];actors.forEach((e,i)=>{const a=i*Math.PI*2/actors.length;e.x=p.x+Math.cos(a)*200;e.y=p.y+Math.sin(a)*200;});NV.combatLabRuntime.resume();return actors.length;})()`);
  assert.equal(placed,11);
  await wait(4200);
  const combat=await run('({snapshot:NV.combatLabRuntime.snapshot(),lights:NV.singularityFamilyStats().species.map(s=>({id:s.id,draws:s.draws,lightDraws:s.lightDraws})),states:[...window.coreQaActors.values()].map(e=>({id:e.enemyTypeId,state:e.intent?.state||e.spitState||e.flankState,swarm:e.swarmState,wisp:e.wispPhaseState,armed:e.armed,guard:e.guardProtectionActive,zone:e.coreZoneState,tank:e.tankCannonState}))})');
  assert(combat.lights.every(s=>s.lightDraws>0),'All nine core signals exercised by real AI: '+JSON.stringify(combat));
  fs.writeFileSync(path.join(out,'combat-core-light.png'),(await w.webContents.capturePage()).toPNG());
  await run('NV.combatLabRuntime.pause()');assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'qa-light.json'),JSON.stringify({result,perf,file,combat,errors},null,2));
  console.log('PASS nine colored emissions/spill layers visible; immutable actors; local-file preview; all nine core signals exercised by real AI; no console errors.');
  console.log(JSON.stringify(perf));app.exit(0);
 }).catch(e=>{console.error(e);app.exit(1);});
}
