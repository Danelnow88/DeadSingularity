'use strict';
const {app,BrowserWindow,contentTracing}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),label=(process.argv.find(a=>a.startsWith('--label='))||'--label=sample').slice(8).replace(/[^a-z0-9_-]/gi,'');
const out=path.join(root,'local/validation/overlap-performance');
const visible=process.argv.includes('--visible');
const composited=visible||process.argv.includes('--composited');
const seconds=Math.max(8,Math.min(60,Number((process.argv.find(a=>a.startsWith('--seconds='))||'--seconds=8').slice(10))||8));
const tracing=process.argv.includes('--trace');
const profileCapture=process.argv.includes('--profile-capture');
assert(!(tracing&&profileCapture),'Use only one tracing owner');
const profiler=profileCapture?require('../../desktop/performance-profile.cjs').createProfiler(require('electron'),path.join(root,'local/validation/performance-health/profiling')):null;
const fixedBodies=process.argv.includes('--fixed-bodies');
const commonWave=process.argv.includes('--common-wave');
assert(!(fixedBodies&&commonWave),'Choose one stress composition');
const backgroundBitmap=process.argv.includes('--background-bitmap');
const droneLayers=process.argv.includes('--drone-layers');
const droneBaseline=process.argv.includes('--drone-baseline');
assert(!(droneLayers&&droneBaseline),'Choose one enemy renderer');
const canvasMode=(process.argv.find(a=>a.startsWith('--canvas-mode='))||'--canvas-mode=default').slice(14);
assert(['default','desync'].includes(canvasMode),'Unsupported canvas mode');
const omit=(process.argv.find(a=>a.startsWith('--omit='))||'--omit=').slice(7);
const delay=ms=>new Promise(r=>setTimeout(r,ms));
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'ds-overlap-')));
app.on('window-all-closed',()=>{});
app.whenReady().then(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const source=fs.readFileSync(path.join(root,'js/game.js'),'utf8').replace(/NV\.getState\s*=\s*\(\)\s*=>\s*state;/,`NV.__benchBegin=()=>{currentWeapon=NV.weaponById('shotgun');weaponFus.shotgun=3;inventory=[currentWeapon];player.hp=player.maxHp=100000;NV.input.setFire(true);};NV.__benchParticles=()=>spawnExplosion(player.x,player.y,200,'#c492d6',1);NV.getState=()=>state;`);
 assert(source.includes('NV.__benchBegin'));
 const canvasSource=fs.readFileSync(path.join(root,'js/render/canvas.js'),'utf8').replace("canvas.getContext('2d')",canvasMode==='desync'?"canvas.getContext('2d', {desynchronized:true})":"canvas.getContext('2d')");
 const sectorsSource=backgroundBitmap?fs.readFileSync(path.join(root,'local/backups/performance-health-20261010/sectors.candidate.js'),'utf8'):null;
 const enemiesSource=droneLayers||droneBaseline?fs.readFileSync(path.join(root,'local/backups/performance-health-20261010',droneBaseline?'enemies.pre-drone-layers.js':'enemies.drone-candidate.js'),'utf8'):null;
 const server=require('node:http').createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+decodeURIComponent(name));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.mp3':'audio/mpeg'})[path.extname(file)]||'application/octet-stream');res.end(name==='/js/game.js'?source:name==='/js/render/canvas.js'?canvasSource:(droneLayers||droneBaseline)&&name==='/js/render/enemies.js'?enemiesSource:backgroundBitmap&&name==='/js/render/sectors.js'?sectorsSource:fs.readFileSync(file));
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const win=new BrowserWindow({title:'QA rendimiento — cierre automático',width:1920,height:1080,useContentSize:true,show:false,webPreferences:{offscreen:!composited,backgroundThrottling:false,sandbox:true,contextIsolation:true}});
 win.webContents.on('page-title-updated',event=>event.preventDefault());
 if(!composited)win.webContents.setFrameRate(165);
 const errors=[];win.webContents.on('console-message',d=>{if(d.level==='error')errors.push(d.message);});
 await win.loadURL('http://127.0.0.1:'+server.address().port+'/index.html?fresh=1&combatLab=1');await delay(1000);
 const evaluate=s=>win.webContents.executeJavaScript(s,true);
 const setup=await evaluate(`(()=>{NV.setGraphicsQuality('high');NV.setGraphicsOption('particles',true);NV.setGraphicsOption('heavyVfx',true);NV.setGraphicsOption('showFPS',true);NV.setComfortOption('reducedEffects',false);NV.setFirePolicy('legacy-auto');NV.setMusicVolume(0);if(NV.rhythmToggleEnabled)NV.rhythmToggleEnabled(false);
  let seed=90210;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  window.benchTimes={};for(const key of ['updateEnemies','updateBullets','drawSpectralEnemy','drawDimensionalThreatFields','drawParticles']){if(typeof NV[key]!=='function')continue;const fn=NV[key];benchTimes[key]={ms:0,calls:0};NV[key]=function(...args){const t=performance.now();const r=fn.apply(this,args);benchTimes[key].ms+=performance.now()-t;benchTimes[key].calls++;return r;};}
  const update=NV.updateEnemies;NV.updateEnemies=(dt,st)=>{st.player.hp=100000;st.player.invuln=1;st.keepInsideArena=true;for(const e of st.enemies)e.hp=e.maxHp=100000;return update(dt,st);};
  const config={characterId:'rook',wave:${commonWave?11:16},difficultyId:'normal',durationMode:'infinite',composition:${commonWave}?[{enemyId:'drone',quantity:15},{enemyId:'runner',quantity:9}]:${fixedBodies}?['drone','runner','tank','shielder','swarmlet','spitter','wisp'].map(enemyId=>({enemyId,quantity:enemyId==='tank'?6:3})):[{enemyId:'rift_weaver',quantity:1},{enemyId:'dimension_sniper',quantity:1},{enemyId:'void_devourer',quantity:1},{enemyId:'specter_lite',quantity:5},{enemyId:'runner',quantity:5},{enemyId:'drone',quantity:5},{enemyId:'elite_velocity',quantity:2},{enemyId:'elite_bulwark',quantity:2},{enemyId:'elite_predator',quantity:2}]};
  const result=NV.combatLabRuntime.start(config);if(!result.ok)return result;NV.__benchBegin();window.benchFx=setInterval(()=>NV.__benchParticles(),120);return result;})()`);
 assert(setup.ok,JSON.stringify(setup));console.log('BENCH '+label+': warmup; then '+seconds+' seconds');if(visible)win.showInactive();await delay(4000);
 // Diagnostic only: isolate a raster family; never changes production settings.
 const omissions={enemies:['drawEnemy','drawSpectralEnemy2D','drawDimensionalThreatBody'],background:['drawSectorBackdrop','drawStarfield'],projectiles:['drawBulletShape','drawHostileProjectile']};
 if(omit){assert(omissions[omit],'Unknown diagnostic omission');await evaluate('for(const key of '+JSON.stringify(omissions[omit])+') NV[key]=()=>{};true;');}
 await evaluate('NV.performanceMonitor.reset();for(const v of Object.values(benchTimes)){v.ms=0;v.calls=0;}');
 const captureStart=await evaluate('({time:performance.now(),frame:NV.getRuntimeSnapshot().frame})');
 if(profiler){profiler.attach(win);await profiler.start();await profiler.mark();}
 if(tracing)await contentTracing.startRecording({included_categories:['cc','viz','gpu','devtools.timeline'],enable_argument_filter:true});
 const samples=[];for(let i=0;i<seconds;i++){await delay(1000);samples.push(await evaluate('({perf:NV.performanceMonitor.getSnapshot(),runtime:NV.getRuntimeSnapshot(),heap:performance.memory?performance.memory.usedJSHeapSize:null})'));if(tracing&&i===1)await contentTracing.stopRecording(path.join(out,label+'.trace.json'));}
 const timings=await evaluate('benchTimes'),gpu=await app.getGPUInfo('basic');assert.deepEqual(errors,[]);
 const captureEnd=await evaluate('({time:performance.now(),frame:NV.getRuntimeSnapshot().frame,attributes:NV.ctx.getContextAttributes(),settings:NV.settings,backdrop:NV.getSectorBackdropStats(),rhythm:NV.rhythm?{enabled:NV.rhythm.enabled,state:NV.rhythm.state,active:NV.rhythm.active,hasStream:!!NV.rhythm.stream}:null})');
 assert.equal(captureEnd.settings.audio.musicVolume,0,'Music must stay muted for gameplay profiling');
 assert(!captureEnd.rhythm||(!captureEnd.rhythm.enabled&&!captureEnd.rhythm.active&&!captureEnd.rhythm.hasStream&&captureEnd.rhythm.state!=='listening'),'Experimental music analysis must stay inactive');
 const profileFile=profiler?await profiler.stop('qa-complete'):null;
 if(profileFile){const session=JSON.parse(fs.readFileSync(path.join(path.dirname(profileFile),'session.json'),'utf8'));assert(session.samples.length>=2,'Real profiler did not sample');assert(session.samples.every(s=>s.game&&s.performance),'Missing game/performance timeline');assert.deepEqual(fs.readdirSync(path.dirname(profileFile)).sort(),['performance.trace.json.gz','session.json']);assert(session.recordingSeconds>0&&session.exportSeconds>=0);assert(session.initial.settings.graphics.quality==='high');}
 const measuredFPS=(captureEnd.frame-captureStart.frame)*1000/(captureEnd.time-captureStart.time);
 assert(samples.every(s=>s.perf.telemetry.hostiles===24),'Stress scene lost enemies: '+samples.map(s=>s.perf.telemetry.hostiles));
 assert(samples.every(s=>s.perf.telemetry.graphicsQuality==='high'&&s.perf.telemetry.effectiveVisualTier==='full'),'Stress quality changed');
 assert.equal(captureEnd.settings.graphics.particles,true);assert.equal(captureEnd.settings.graphics.heavyVfx,true);assert.equal(captureEnd.settings.gameplay.reducedEffects,false);
 if(commonWave)assert(samples.every(s=>s.perf.telemetry.byEnemyTypeId.drone===15&&s.perf.telemetry.byEnemyTypeId.runner===9),'Common enemy density changed');
 const diagnostics={profileFile,tracing:tracing||profileCapture,droneBaseline,commonWave};
 fs.writeFileSync(path.join(out,label+'.json'),JSON.stringify({label,canvasMode,backgroundBitmap,droneLayers,diagnostics,captureStart,captureEnd,measuredFPS,diagnosticOmission:omit||null,electron:process.versions.electron,viewport:[1920,1080],mode:visible?'visible-composited':composited?'hidden-composited':'offscreen',requestedOffscreenFPS:composited?null:165,gpu,features:app.getGPUFeatureStatus(),samples,timings,notes:'Isolated stress: 24 durable enemies, invulnerable player prevents contact deaths; keepInsideArena; real shotgun, particles and full/high graphics. Hidden/offscreen timings are not physical presentation FPS. Earlier reports allowed contact deaths and are not density-matched baselines. Diagnostic omissions are never production quality and never count as a performance improvement. Tracing/profiling adds overhead: never treat such a run as a performance-gain comparison.'},null,2));
 fs.writeFileSync(path.join(out,label+'.png'),(await win.webContents.capturePage()).toPNG());
 console.log(JSON.stringify({label,canvasMode,measuredFPS,profileFile,attributes:captureEnd.attributes,frame:samples.at(-1).perf.frame,update:samples.at(-1).perf.update,draw:samples.at(-1).perf.draw,timings}));app.exit(0);
}).catch(e=>{console.error(e);app.exit(1);});
