'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const actorCount=process.argv.includes('--three')?3:30;
if(!process.versions.electron){
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const p=require('node:child_process').spawn(require('electron'),[__filename,...process.argv.slice(2)],{cwd:root,env,windowsHide:true,stdio:'inherit'});
 p.on('exit',c=>process.exitCode=c??1);p.on('error',e=>{console.error(e);process.exitCode=1;});
}else{
 const {app,BrowserWindow,protocol,net,contentTracing}=require('electron'),{pathToFileURL}=require('node:url');
 app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'ds-elite-light-')));
 protocol.registerSchemesAsPrivileged([{scheme:'dselight',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
 const out=path.join(root,'local/validation/elite-attack-light',actorCount===3?'actors-3':'.'),delay=ms=>new Promise(r=>setTimeout(r,ms));let variant='candidate';
 app.whenReady().then(async()=>{
  fs.mkdirSync(out,{recursive:true});
  protocol.handle('dselight',req=>{
   const u=new URL(req.url),file=path.resolve(root,'.'+decodeURIComponent(u.pathname));
   if(u.host!=='project'||!file.startsWith(root+path.sep))return new Response('',{status:403});
   if(u.pathname==='/js/render/refinedElites.js'){
    let src=fs.readFileSync(file,'utf8');
    if(variant==='reference')src=src.replace('function lightAtlas(bitmap,kind){','function lightAtlas(bitmap,kind){return null;');
    return new Response(src,{headers:{'Content-Type':'text/javascript','Cache-Control':'no-store'}});
   }
   if(u.pathname==='/js/game.js')return new Response(fs.readFileSync(file,'utf8').replace('const dimensionContentEnabled = !isolatedMode;','const dimensionContentEnabled = true; // isolated QA uses current production art').replace('function loop(now) {','function loop(now) { if(NV.__eliteLightOwnLoop)return;'),{headers:{'Content-Type':'text/javascript'}});
   return net.fetch(pathToFileURL(file).href);
  });
  const w=new BrowserWindow({width:1920,height:1080,useContentSize:true,show:false,webPreferences:{offscreen:true,backgroundThrottling:false,sandbox:true,contextIsolation:true}}),errors=[];
  w.webContents.setFrameRate(165);w.webContents.on('console-message',d=>{if(d.level==='error'){errors.push(d.message);console.error(d.message);}});const run=async s=>{const r=await w.webContents.executeJavaScript(`(()=>{try{return {value:eval(${JSON.stringify(s)})};}catch(e){return {error:e.stack||String(e)};}})()`);if(r.error)throw Error(r.error);return r.value;};
  async function load(){
   await w.loadURL('dselight://project/index.html?fresh=1&eliteLightQa='+Date.now());await run('NV.prewarmRefinedEliteReadability()');
   for(let i=0;i<150;i++){if(await run('NV.refinedEliteReadabilityStats().species.length===3&&NV.refinedEliteReadabilityStats().species.every(s=>s.ready)'))return;await delay(40);}throw Error('Elite load timeout');
  }
  await load();
  const visual=await run(`(()=>{
   const ids=['elite_predator','elite_phantom','elite_titan'],cv=document.createElement('canvas');cv.width=1200;cv.height=850;const c=cv.getContext('2d');c.fillStyle='#0a1422';c.fillRect(0,0,1200,850);
   const colors=['#d399e8','#cceef1','#eea0c3'],names=['ASESINO · CUCHILLADA','FANTASMA · ENTRADA','GOLIAT · GOLPE SÍSMICO'];
   const result=[],scratch=document.createElement('canvas');scratch.width=scratch.height=300;const s=scratch.getContext('2d');
   ids.forEach((visualId,i)=>{
    const e={visualId,refinedEliteReadability:true,x:0,y:0,predatorState:'execution_windup',predatorStateTimer:.01,phantomState:'entry_windup',phantomStateTimer:.01,goliathState:'slam_windup',goliathStateTimer:.01},before=JSON.stringify(e),x=i*400;
    c.textAlign='center';c.font='bold 17px system-ui';c.fillStyle=colors[i];c.fillText(names[i],x+200,34);
    const data=[];for(let j=0;j<2;j++){
     NV.__refinedEliteAttackLighting=!!j;s.clearRect(0,0,300,300);s.save();s.translate(150,150);NV.drawRefinedEliteBody(s,e,0,'#fff',50,0);s.restore();data.push(s.getImageData(0,0,300,300).data);
     c.save();c.translate(x+200,200+j*340);c.scale(2,2);NV.drawRefinedEliteBody(c,e,0,'#fff',50,0);c.restore();c.fillStyle='#c2cbd8';c.font='14px system-ui';c.fillText(j?'ANTICIPACIÓN':'BASE',x+200,335+j*340);
    }
    let gain=0,alpha=0,changed=0,spill=0;for(let k=0;k<data[0].length;k+=4){gain+=data[1][k]+data[1][k+1]+data[1][k+2]-data[0][k]-data[0][k+1]-data[0][k+2];if(data[0][k+3]>=250)alpha=Math.max(alpha,Math.abs(data[1][k+3]-data[0][k+3]));if(data[0][k+3]===0&&data[1][k+3]>5)spill++;if(data[1][k]!==data[0][k]||data[1][k+1]!==data[0][k+1]||data[1][k+2]!==data[0][k+2])changed++;}
    if(gain<1000||JSON.stringify(e)!==before)throw Error('Emission/state contract failed '+visualId+': '+JSON.stringify({gain,alpha,changed}));
    result.push({visualId,gain,maxOpaqueAlphaDelta:alpha,changedPixels:changed,spillPixels:spill});
   });delete NV.__refinedEliteAttackLighting;return {png:cv.toDataURL().split(',')[1],result,stats:NV.refinedEliteReadabilityStats()};
  })()`);
  fs.writeFileSync(path.join(out,'comparison.png'),Buffer.from(visual.png,'base64'));delete visual.png;
  console.log('VISUAL',JSON.stringify(visual));assert(visual.result.every(r=>r.maxOpaqueAlphaDelta<=5&&r.spillPixels>50),'Opaque body/visible spill contract failed');
  const reports=[];
  // ABBA order, old single bitmap vs prelit atlas. Same 30 actors, gaze, scale,
  // positions, motion, source textures, and attack timers. No simulation changes.
  for(const [index,mode]of (process.argv.includes('--live-only')?[]:['reference','candidate','candidate','reference']).entries()){
   variant=mode;await load();
   await run(`(()=>{
    NV.__eliteLightOwnLoop=true;
    const c=document.createElement('canvas');c.width=1920;c.height=1080;c.style='position:fixed;inset:0;width:100vw;height:100vh;z-index:99999';document.body.append(c);const g=c.getContext('2d');
    const actors=Array.from({length:${actorCount}},(_,i)=>({visualId:['elite_predator','elite_phantom','elite_titan'][i%3],refinedEliteReadability:true,x:0,y:0,predatorState:'execution_windup',phantomState:'entry_windup',goliathState:'slam_windup'}));
    window.lightAudit={samples:[],cpu:[],frames:0,measure:false};let start=0,last=0;
    requestAnimationFrame(function tick(t){if(!start)start=t;const time=(t-start)/1000;const p=(time%1.2)/1.2;
     const begin=performance.now();g.fillStyle='#0a1422';g.fillRect(0,0,1920,1080);
     for(let i=0;i<actors.length;i++){const e=actors[i];e.predatorStateTimer=(1-p)*NV.ELITE_PREDATOR_HUNTER.executionWindup;e.phantomStateTimer=(1-p)*NV.ELITE_PHANTOM_POSSESSION.windup;e.goliathStateTimer=(1-p)*NV.ELITE_GOLIATH_SEISMIC.windup;
      g.save();g.translate(100+i%10*190,160+Math.floor(i/10)*340);g.scale(1.55,1.55);NV.drawRefinedEliteBody(g,e,time,'#fff',40,20);g.restore();}
     if(lightAudit.measure&&last){lightAudit.samples.push(t-last);lightAudit.cpu.push(performance.now()-begin);lightAudit.frames++;}last=t;requestAnimationFrame(tick);
    });return true;
   })()`);
   await delay(1500);await run('lightAudit.samples=[];lightAudit.cpu=[];lightAudit.frames=0;lightAudit.measure=true');await delay(4000);
   const timing=await run(`(()=>{lightAudit.measure=false;function stats(xs){xs.sort((a,b)=>a-b);const q=p=>xs[Math.floor((xs.length-1)*p)];return {p50:q(.5),p95:q(.95),p99:q(.99),mean:xs.reduce((a,b)=>a+b,0)/xs.length};}const frameMs=stats(lightAudit.samples);return {frames:lightAudit.frames,fps:1000/frameMs.mean,frameMs,cpuMs:stats(lightAudit.cpu)};})()`);
   let trace;
   if(index<2){
    trace=path.join(out,mode+'.trace.json');await contentTracing.startRecording({recording_mode:'record-until-full',trace_buffer_size_in_kb:32768,included_categories:['toplevel','devtools.timeline','disabled-by-default-devtools.timeline.frame','cc','viz','gpu'],excluded_categories:['*']});await delay(1800);await contentTracing.stopRecording(trace);
    const zlib=require('node:zlib');fs.writeFileSync(trace+'.gz',zlib.gzipSync(fs.readFileSync(trace)));trace=path.relative(root,trace+'.gz');
   }
   reports.push({mode,timing,trace});console.log(mode,JSON.stringify(timing));
  }
  assert.equal(errors.length,0,JSON.stringify(errors));
  if(reports.length)fs.writeFileSync(path.join(out,'benchmark.json'),JSON.stringify({actorCount,reports},null,2));
  variant='candidate';await w.loadURL('dselight://project/index.html?combatLab=1&fresh=1');
  for(let i=0;i<150;i++){if(await run('!!NV.combatLabRuntime&&NV.refinedEliteReadabilityStats().species.every(s=>s.ready&&s.lightReady)'))break;await delay(40);}
  const started=await run(`(()=>{
    window.lightSeen={};window.lightActors=new Map();window.lightPlayer=null;
    const roster=NV.dimensionBaselineRoster();NV.ELITE_TYPES=roster.elites;NV.ENEMY_TYPES=roster.enemies;
    const update=NV.updateEnemies;NV.updateEnemies=function(dt,st){lightPlayer=st.player;st.player.hp=100000;st.player.invuln=1;for(const e of st.enemies){e.hp=e.maxHp=100000;if(e.isElite)lightActors.set(e.visualId,e);}return update(dt,st);};
    const body=NV.drawRefinedEliteBody;NV.drawRefinedEliteBody=function(ctx,e,...rest){const intensity=NV.refinedEliteAttackIntensity(e);if(intensity>0)(lightSeen[e.visualId]||=([])).push({state:e.predatorState||e.phantomState||e.goliathState,intensity});return body.call(this,ctx,e,...rest);};
    return NV.combatLabRuntime.start({characterId:'rook',wave:20,difficultyId:'normal',durationMode:'infinite',composition:[{enemyId:'elite_predator',quantity:1},{enemyId:'elite_phantom',quantity:1},{enemyId:'elite_titan',quantity:1}]});
  })()`);assert(started.ok,JSON.stringify(started));await delay(300);
  const placed=await run(`(()=>{if(!lightPlayer||lightActors.size!==3)return false;NV.combatLabRuntime.pause();let i=0;for(const [id,e]of lightActors){const a=i++*Math.PI*2/3,d=id==='elite_predator'?65:id==='elite_titan'?120:170;e.x=lightPlayer.x+Math.cos(a)*d;e.y=lightPlayer.y+Math.sin(a)*d;}NV.combatLabRuntime.resume();return true;})()`);assert(placed,'Live elite setup failed');
  await delay(6500);await run('NV.combatLabRuntime.pause()');
  const combat=await run('({seen:lightSeen,snapshot:NV.combatLabRuntime.snapshot(),actors:[...lightActors.values()].map(e=>({id:e.visualId,enemyId:e.enemyTypeId,predator:e.predatorState,phantom:e.phantomState,goliath:e.goliathState,x:e.x,y:e.y,dead:e.dead,art:e.refinedEliteBody,readable:e.refinedEliteReadability})),player:lightPlayer&&{x:lightPlayer.x,y:lightPlayer.y}})');
  fs.writeFileSync(path.join(out,'live-diagnostic.json'),JSON.stringify(combat,null,2));
  for(const id of ['elite_predator','elite_phantom','elite_titan'])assert(combat.seen[id]?.some(s=>s.intensity>.5),'Real AI never charged '+id);
  fs.writeFileSync(path.join(out,'combat.png'),(await w.webContents.capturePage()).toPNG());
  await w.loadFile(path.join(root,'index.html'));await run('NV.prewarmRefinedEliteReadability()');
  for(let i=0;i<100;i++){if(await run('NV.refinedEliteReadabilityStats().species.length===3&&NV.refinedEliteReadabilityStats().species.every(s=>s.ready&&s.lightReady)'))break;await delay(40);}
  assert(await run('NV.refinedEliteReadabilityStats().species.every(s=>s.ready&&s.lightReady)'),'file preview lighting missing');
  assert.equal(errors.length,0,JSON.stringify(errors));
  fs.writeFileSync(path.join(out,'qa.json'),JSON.stringify({visual,reports,combat,actorCount,errors,notes:'Isolated elite render A/B in 1080p offscreen Electron, requested 165 Hz. Not full-game FPS, not monitor refresh certification. GPU-process trace durations are not hardware shader timers. No live blur, filter or additional body draw. Combat separately verifies real AI signals, not performance.'},null,2));
  console.log('PASS three intense attack signals, preserved opaque body/eyes and entities, cached spill atlas, file://, real production AI');app.exit(0);
 }).catch(e=>{console.error(e);app.exit(1);});
}
