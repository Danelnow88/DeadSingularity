'use strict';
const {app,BrowserWindow,contentTracing,screen}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),label=(process.argv.find(a=>a.startsWith('--label='))||'--label=sample').slice(8).replace(/[^a-z0-9_-]/gi,'');
const out=path.join(root,'local/validation/overlap-performance');
const visible=process.argv.includes('--visible');
const fullScreen=process.argv.includes('--fullscreen'),idleCheck=process.argv.includes('--idle-check');
const composited=visible||process.argv.includes('--composited');
const seconds=Math.max(8,Math.min(60,Number((process.argv.find(a=>a.startsWith('--seconds='))||'--seconds=8').slice(10))||8));
const tracing=process.argv.includes('--trace');
const profileCapture=process.argv.includes('--profile-capture');
assert(!(tracing&&profileCapture),'Use only one tracing owner');
const profiler=profileCapture?require('../../desktop/performance-profile.cjs').createProfiler(require('electron'),path.join(root,'local/validation/performance-health/profiling')):null;
const fixedBodies=process.argv.includes('--fixed-bodies');
const commonWave=process.argv.includes('--common-wave');
const foundry=process.argv.includes('--foundry');
const staticSky=process.argv.includes('--static-sky');
const graphicSpace=process.argv.includes('--graphic-space'),illustratedSpace=process.argv.includes('--illustrated-space');
const staticResponse=process.argv.includes('--static-response');
const linesReference=process.argv.includes('--lines-reference'),responseMotion=process.argv.includes('--response-motion');
const habitatReference=process.argv.includes('--habitat-reference');
const noProjectilePathCache=process.argv.includes('--no-projectile-path-cache');
const projectilePathCache=process.argv.includes('--projectile-path-cache');
const primitiveRects=process.argv.includes('--primitive-rects'); // rejected/experimental renderer, opt-in QA only
const productionRoster=process.argv.includes('--production-roster');
const commonOption=process.argv.find(a=>a.startsWith('--common-remodel='));
const commonRemodel=commonOption?commonOption.slice(17):'reference';
assert(['reference','all','spitter','runner','wisp'].includes(commonRemodel));
const cosmicOption=process.argv.find(a=>a.startsWith('--cosmic-creatures='));
const cosmicRender=cosmicOption?cosmicOption.slice(19):'reference';
assert(['reference','static','articulated'].includes(cosmicRender));
const runnerOption=process.argv.find(a=>a.startsWith('--runner-cosmic='));
const runnerCosmic=runnerOption?runnerOption.slice('--runner-cosmic='.length):'reference';
assert(['reference','articulated'].includes(runnerCosmic));
const eliteRender=(process.argv.find(a=>a.startsWith('--elite-render='))||'--elite-render='+ (process.argv.includes('--elite-readability')?'readable':'current')).slice(15);
assert(['current','reference','readable'].includes(eliteRender));
const eliteReadability=eliteRender!=='reference';
const swarmRender=(process.argv.find(a=>a.startsWith('--swarm-render='))||'--swarm-render=current').slice(15);
assert(['current','reference','painted'].includes(swarmRender));
const detailPass=(process.argv.find(a=>a.startsWith('--detail-pass='))||'--detail-pass=current').slice(14);
assert(['current','reference','hydra'].includes(detailPass));
const activeCount=Number((process.argv.find(a=>a.startsWith('--hostiles='))||'--hostiles=24').slice(11));
assert(!cosmicOption||productionRoster&&activeCount===24,'Cosmic comparison requires production roster / 24 hostiles');
assert([10,24].includes(activeCount)&&(!productionRoster?activeCount===24:true),'Use 10 or 24 with the production roster');
assert(!(linesReference&&habitatReference),'Choose one visual baseline');
const previewSize=process.argv.includes('--preview-size'),windowWidth=previewSize?1280:1920,windowHeight=previewSize?800:1080;
assert(!(graphicSpace&&illustratedSpace),'Choose one scenery style');
const skyIndex=Math.max(0,Math.min(7,Number((process.argv.find(a=>a.startsWith('--sky-index='))||'--sky-index=0').slice(12))||0));
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
 let source=fs.readFileSync(path.join(root,habitatReference?'local/validation/habitat-live/baseline/game.js':'js/game.js'),'utf8').replace(/NV\.getState\s*=\s*\(\)\s*=>\s*state;/,`NV.__benchBegin=()=>{currentWeapon=NV.weaponById('shotgun');weaponFus.shotgun=3;inventory=[currentWeapon];player.hp=player.maxHp=100000;NV.input.setFire(true);};NV.__benchParticles=()=>spawnExplosion(player.x,player.y,200,'#c492d6',1);NV.getState=()=>state;`);
 if(productionRoster){assert(!habitatReference&&!linesReference&&!commonWave&&!fixedBodies,'Production roster cannot be mixed with historical compositions');assert(source.includes('const dimensionContentEnabled = !isolatedMode;'));source=source.replace('const dimensionContentEnabled = !isolatedMode;','const dimensionContentEnabled = true; // served benchmark only');}
 assert(source.includes('NV.__benchBegin'));
 const canvasSource=fs.readFileSync(path.join(root,'js/render/canvas.js'),'utf8').replace("canvas.getContext('2d')",canvasMode==='desync'?"canvas.getContext('2d', {desynchronized:true})":"canvas.getContext('2d')");
 const sectorsSource=backgroundBitmap?fs.readFileSync(path.join(root,'local/backups/performance-health-20261010/sectors.candidate.js'),'utf8'):null;
 const enemiesSource=droneLayers||droneBaseline?fs.readFileSync(path.join(root,'local/backups/performance-health-20261010',droneBaseline?'enemies.pre-drone-layers.js':'enemies.drone-candidate.js'),'utf8'):null;
 const visualReferences=linesReference?new Map([
  ['/js/render/spaceResponse.js',fs.readFileSync(path.join(root,'local/validation/space-clouds/spaceResponse.lines-reference.js'))],
  ['/js/render/spaceEnvironment.js',fs.readFileSync(path.join(root,'local/validation/space-clouds/spaceEnvironment.lines-reference.js'))],
 ]):new Map();
 if(habitatReference)for(const name of ['spaceResponse.js','spaceEnvironment.js'])visualReferences.set('/js/render/'+name,fs.readFileSync(path.join(root,'local/validation/habitat-live/baseline',name)));
 if(primitiveRects){
  assert(!habitatReference&&!linesReference,'Do not mix primitive experiment and historical baseline');
  visualReferences.set('/js/render/spaceEnvironment.js',fs.readFileSync(path.join(root,'js/render/spaceEnvironment.js'),'utf8').replace('ctx.rect(x,y,size,size);','ctx.fillRect(x,y,size,size);'));
  visualReferences.set('/js/render/spaceResponse.js',fs.readFileSync(path.join(root,'js/render/spaceResponse.js'),'utf8').replace('ctx.rect(grainDraw[n],grainDraw[n+1],grainDraw[n+2],grainDraw[n+2]);','ctx.fillRect(grainDraw[n],grainDraw[n+1],grainDraw[n+2],grainDraw[n+2]);'));
 }
 const server=require('node:http').createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+decodeURIComponent(name));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.mp3':'audio/mpeg'})[path.extname(file)]||'application/octet-stream');res.end(visualReferences.has(name)?visualReferences.get(name):name==='/js/game.js'?source:name==='/js/render/canvas.js'?canvasSource:(droneLayers||droneBaseline)&&name==='/js/render/enemies.js'?enemiesSource:backgroundBitmap&&name==='/js/render/sectors.js'?sectorsSource:fs.readFileSync(file));
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const win=new BrowserWindow({title:'QA rendimiento — cierre automático',width:windowWidth,height:windowHeight,useContentSize:true,show:false,fullscreen:fullScreen,webPreferences:{offscreen:!composited,backgroundThrottling:false,sandbox:true,contextIsolation:true}});
 win.webContents.on('page-title-updated',event=>event.preventDefault());
 if(!composited)win.webContents.setFrameRate(165);
 const errors=[];win.webContents.on('console-message',d=>{if(d.level==='error')errors.push(d.message);});
 await win.loadURL('http://127.0.0.1:'+server.address().port+'/index.html?fresh=1&combatLab=1');await delay(1000);
 const evaluate=s=>win.webContents.executeJavaScript(s,true);
 if(runnerOption)assert(await evaluate('typeof NV.drawCosmicRunner==="function"'),'Production runner module missing');
 let idleRefresh=null;
 if(idleCheck){
  assert(visible,'Idle refresh requires a real visible window');win.show();win.focus();await delay(1200);
  idleRefresh=await evaluate(`new Promise(resolve=>{let first=null,previous=null,count=0;const gaps=[];requestAnimationFrame(function sample(t){if(first===null)first=t;if(previous!==null){gaps.push(t-previous);count++;}previous=t;if(t-first>=1500){const ordered=gaps.slice().sort((a,b)=>a-b);resolve({metric:'visible-idle-raf',fps:count*1000/(t-first),count,elapsedMs:t-first,p50:ordered[Math.floor(ordered.length*.5)],p95:ordered[Math.floor(ordered.length*.95)]});}else requestAnimationFrame(sample);});})`);
 }
 if(projectilePathCache)await evaluate(fs.readFileSync(path.join(root,'tools/performance/projectile_paths_candidate.cjs'),'utf8'));
 const setup=await evaluate(`(()=>{NV.setGraphicsQuality('high');NV.setGraphicsOption('particles',true);NV.setGraphicsOption('heavyVfx',true);NV.setGraphicsOption('showFPS',true);NV.setComfortOption('reducedEffects',false);NV.setFirePolicy('legacy-auto');NV.setMusicVolume(0);if(NV.rhythmToggleEnabled)NV.rhythmToggleEnabled(false);
  if(${detailPass!=='current'})NV.__subtleHydra=${detailPass==='hydra'};
  NV.prewarmRefinedElites();NV.prewarmRefinedEliteReadability();
  if(${!!runnerOption}){NV.prewarmCosmicRunner();NV.__cosmicRunner=${runnerCosmic==='articulated'};}
  if(${!!commonOption}){NV.prewarmRefinedCommon();NV.__commonRemodel=${JSON.stringify(commonRemodel==='all'?true:commonRemodel==='reference'?false:commonRemodel)};}
  if(${!!cosmicOption}){NV.prewarmCosmicCreatures();NV.__cosmicCreatures=${cosmicRender!=='reference'};NV.__cosmicStatic=${cosmicRender==='static'};}
  if(${eliteRender!=='current'})NV.__eliteReadability=${eliteReadability};
  if(${swarmRender!=='current'}){NV.prewarmPaintedSwarmlet();NV.__paintedSwarm=${swarmRender==='painted'};}
  if(${productionRoster}){const roster=NV.dimensionBaselineRoster();NV.ENEMY_TYPES=roster.enemies;NV.ELITE_TYPES=roster.elites;}
  if(NV.setProjectilePathCacheEnabled)NV.setProjectilePathCacheEnabled(!${noProjectilePathCache});
  if(${foundry}){NV.setGraphicsOption('spaceTravel',!${staticSky});NV.sectorVisualForWave=()=>NV.dimensionSkyBaseline.profiles[1];const draw=NV.drawSectorBackdrop;NV.drawSectorBackdrop=(ctx,W,H,frame,wave,opt)=>draw(ctx,W,H,frame,6,{...opt,preview:true,variant:0});NV.foundryAtmosphere.setEnabled(!${staticSky});NV.resetVisualBudget();NV.updateVisualBudget=()=>{};}
  if(${graphicSpace||illustratedSpace}){NV.dimensionIllustratedScenery=true;NV.setGraphicsOption('spaceTravel',${graphicSpace});NV.setGraphicsOption('spaceResponse',!${staticResponse});NV.sectorVisualForWave=()=>NV.dimensionSkyBaseline.profiles[${skyIndex}];const draw=NV.drawSectorBackdrop;NV.drawSectorBackdrop=(ctx,W,H,frame,wave,opt)=>draw(ctx,W,H,frame,${1+skyIndex*5},{...opt,preview:true,variant:0});NV.resetVisualBudget();NV.updateVisualBudget=()=>{};}
  let seed=90210;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  window.benchTimes={};for(const key of ['updateEnemies','updateBullets','drawSpectralEnemy','drawDimensionalThreatFields','drawParticles']){if(typeof NV[key]!=='function')continue;const fn=NV[key];benchTimes[key]={ms:0,calls:0};NV[key]=function(...args){const t=performance.now();const r=fn.apply(this,args);benchTimes[key].ms+=performance.now()-t;benchTimes[key].calls++;return r;};}
  const update=NV.updateEnemies;NV.updateEnemies=(dt,st)=>{st.player.hp=100000;st.player.invuln=1;st.keepInsideArena=true;for(const e of st.enemies)e.hp=e.maxHp=100000;return update(dt,st);};
  const config={characterId:'rook',wave:${commonWave?11:16},difficultyId:'normal',durationMode:'infinite',composition:${commonWave}?[{enemyId:'drone',quantity:15},{enemyId:'runner',quantity:9}]:${fixedBodies}?['drone','runner','tank','shielder','swarmlet','spitter','wisp'].map(enemyId=>({enemyId,quantity:enemyId==='tank'?6:3})):[{enemyId:'rift_weaver',quantity:1},{enemyId:'dimension_sniper',quantity:1},{enemyId:'void_devourer',quantity:1},{enemyId:'specter_lite',quantity:5},{enemyId:'runner',quantity:5},{enemyId:'drone',quantity:5},{enemyId:'elite_velocity',quantity:2},{enemyId:'elite_bulwark',quantity:2},{enemyId:'elite_predator',quantity:2}]};
  if(${productionRoster}){config.wave=20;config.composition=${activeCount===10}?[{enemyId:'swarmlet',quantity:2},{enemyId:'runner',quantity:2},{enemyId:'spitter',quantity:1},{enemyId:'specter_archer',quantity:1},{enemyId:'rift_weaver',quantity:1},{enemyId:'void_devourer',quantity:1},{enemyId:'elite_phantom',quantity:1},{enemyId:'elite_predator',quantity:1}]:[...NV.ENEMY_TYPES.filter(e=>e.id!=='kamikaze').map(e=>({enemyId:e.id,quantity:1+({runner:3,swarmlet:2,spitter:1,wisp:1}[e.id]||0)})),...NV.ELITE_TYPES.map(e=>({enemyId:NV.productionEnemyCanonicalId(e,'elite'),quantity:2}))];window.__benchComposition=config.composition;}
  const result=NV.combatLabRuntime.start(config);if(!result.ok)return result;NV.__benchBegin();window.benchFx=setInterval(()=>NV.__benchParticles(),120);return result;})()`);
 assert(setup.ok,JSON.stringify(setup));console.log('BENCH '+label+': warmup; then '+seconds+' seconds');if(visible){win.show();win.focus();}
 let moveTimer=null,moveKey=null,moveStep=0;
 if(responseMotion){moveTimer=setInterval(()=>{if(moveKey)win.webContents.sendInputEvent({type:'keyUp',keyCode:moveKey});moveKey=['A','W','D','S'][moveStep++%4];win.webContents.sendInputEvent({type:'keyDown',keyCode:moveKey});},700);}
 await evaluate(`window.benchFrameGaps=[];window.benchMeasuring=false;window.benchLastFrame=0;
  requestAnimationFrame(function sample(t){if(window.benchMeasuring){if(window.benchLastFrame)window.benchFrameGaps.push(t-window.benchLastFrame);window.benchLastFrame=t;}requestAnimationFrame(sample);});true;`);
 await delay(4000);
 // Diagnostic only: isolate a raster family; never changes production settings.
 const omissions={enemies:['drawEnemy','drawSpectralEnemy2D','drawDimensionalThreatBody'],background:['drawSectorBackdrop','drawStarfield'],projectiles:['drawBulletShape','drawHostileProjectile']};
 if(omit){assert(omissions[omit],'Unknown diagnostic omission');await evaluate('for(const key of '+JSON.stringify(omissions[omit])+') NV[key]=()=>{};true;');}
 await evaluate('NV.performanceMonitor.reset();for(const v of Object.values(benchTimes)){v.ms=0;v.calls=0;}window.benchFrameGaps.length=0;window.benchLastFrame=0;window.benchMeasuring=true;');
 const captureStart=await evaluate('({time:performance.now(),frame:NV.getRuntimeSnapshot().frame})');
 if(profiler){profiler.attach(win);await profiler.start();await profiler.mark();}
 if(tracing)await contentTracing.startRecording({included_categories:['cc','viz','gpu','devtools.timeline'],enable_argument_filter:true});
 const samples=[];for(let i=0;i<seconds;i++){await delay(1000);samples.push(await evaluate('({perf:NV.performanceMonitor.getSnapshot(),runtime:NV.getRuntimeSnapshot(),heap:performance.memory?performance.memory.usedJSHeapSize:null})'));if(tracing&&i===1)await contentTracing.stopRecording(path.join(out,label+'.trace.json'));}
 const timings=await evaluate('benchTimes'),gpu=await app.getGPUInfo('basic');assert.deepEqual(errors,[]);
 const captureEnd=await evaluate('({time:performance.now(),frame:NV.getRuntimeSnapshot().frame,canvas:[NV.canvas.width,NV.canvas.height],viewport:[innerWidth,innerHeight],attributes:NV.ctx.getContextAttributes(),settings:NV.settings,backdrop:NV.getSectorBackdropStats(),rhythm:NV.rhythm?{enabled:NV.rhythm.enabled,state:NV.rhythm.state,active:NV.rhythm.active,hasStream:!!NV.rhythm.stream}:null})');
 const frameGaps=await evaluate(`(()=>{window.benchMeasuring=false;const a=window.benchFrameGaps.slice().sort((a,b)=>a-b);return {count:a.length,p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],p99:a[Math.floor(a.length*.99)],worst:a[a.length-1],over12:a.filter(x=>x>12).length,over20:a.filter(x=>x>20).length,over33:a.filter(x=>x>33).length};})()`);
 if(moveTimer)clearInterval(moveTimer);if(moveKey)win.webContents.sendInputEvent({type:'keyUp',keyCode:moveKey});
 assert.equal(captureEnd.settings.audio.musicVolume,0,'Music must stay muted for gameplay profiling');
 assert(!captureEnd.rhythm||(!captureEnd.rhythm.enabled&&!captureEnd.rhythm.active&&!captureEnd.rhythm.hasStream&&captureEnd.rhythm.state!=='listening'),'Experimental music analysis must stay inactive');
 const profileFile=profiler?await profiler.stop('qa-complete'):null;
 if(profileFile){const session=JSON.parse(fs.readFileSync(path.join(path.dirname(profileFile),'session.json'),'utf8'));assert(session.samples.length>=2,'Real profiler did not sample');assert(session.samples.every(s=>s.game&&s.performance),'Missing game/performance timeline');assert.deepEqual(fs.readdirSync(path.dirname(profileFile)).sort(),['performance.trace.json.gz','session.json']);assert(session.recordingSeconds>0&&session.exportSeconds>=0);assert(session.initial.settings.graphics.quality==='high');}
 const measuredFPS=(captureEnd.frame-captureStart.frame)*1000/(captureEnd.time-captureStart.time);
 captureEnd.swarmRender=swarmRender;
 captureEnd.eliteReadability=eliteReadability;
 captureEnd.eliteRender=eliteRender;
 captureEnd.commonRemodel=commonRemodel;
 captureEnd.runnerCosmic=runnerCosmic;
 if(runnerOption){captureEnd.runnerStats=await evaluate('NV.cosmicRunnerStats()');assert(captureEnd.runnerStats.ready&&!captureEnd.runnerStats.error&&(runnerCosmic==='reference'||captureEnd.runnerStats.draws>0),'Runner prototype assets not drawn');}
 captureEnd.cosmicRender=cosmicRender;
 if(cosmicOption){captureEnd.cosmicStats=await evaluate('NV.cosmicCreatureStats()');assert(captureEnd.cosmicStats.species.length===2&&captureEnd.cosmicStats.species.every(s=>s.ready&&!s.error&&(cosmicRender==='reference'||s.draws>0)),'Cosmic rig failed to render');}
 if(commonOption)assert(await evaluate('NV.refinedCommonStats().species.length===3 && NV.refinedCommonStats().species.every(s=>s.ready&&!s.error)'),'Common prototype assets not ready');
 if(eliteReadability)assert(await evaluate('NV.refinedEliteReadabilityStats().species.length===3 && NV.refinedEliteReadabilityStats().species.every(s=>s.ready&&!s.error)'),'Readability assets not loaded');
 if(illustratedSpace&&skyIndex!==1)assert(captureEnd.backdrop.artReady,'Illustrated control did not load actual art');
 assert(samples.every(s=>s.perf.telemetry.hostiles===activeCount),'Stress scene lost enemies: '+samples.map(s=>s.perf.telemetry.hostiles));
 assert(samples.every(s=>s.perf.telemetry.graphicsQuality==='high'&&s.perf.telemetry.effectiveVisualTier==='full'),'Stress quality changed');
 assert.equal(captureEnd.settings.graphics.particles,true);assert.equal(captureEnd.settings.graphics.heavyVfx,true);assert.equal(captureEnd.settings.gameplay.reducedEffects,false);
 if(commonWave)assert(samples.every(s=>s.perf.telemetry.byEnemyTypeId.drone===15&&s.perf.telemetry.byEnemyTypeId.runner===9),'Common enemy density changed');
 const diagnostics={profileFile,tracing:tracing||profileCapture,droneBaseline,commonWave,foundry,staticSky,graphicSpace,illustratedSpace,staticResponse,linesReference,habitatReference,responseMotion,skyIndex,frameGaps,primitiveRects,productionRoster,activeCount,detailPass,productionComposition:productionRoster?await evaluate('window.__benchComposition'):null,
  display:screen.getDisplayMatching(win.getBounds()),fullScreen:win.isFullScreen(),idleRefresh,
  fpsCounter:await evaluate('NV.getFpsCounterSnapshot?NV.getFpsCounterSnapshot():null'),
  presentationClock:await evaluate('NV.presentationClock?NV.presentationClock.snapshot():null'),
  projectilePaths:await evaluate('NV.getProjectilePathCacheStats?NV.getProjectilePathCacheStats():null'),
  response:await evaluate('NV.spaceResponse?NV.spaceResponse.diagnostics():null'),habitat:await evaluate('NV.spaceHabitat?NV.spaceHabitat.diagnostics():null'),trails:await evaluate('NV.spaceTrails?NV.spaceTrails.diagnostics():null'),space:await evaluate('NV.spaceEnvironment?NV.spaceEnvironment.diagnostics():null'),atmosphere:await evaluate('NV.foundryAtmosphere?NV.foundryAtmosphere.diagnostics():null')};
 if(responseMotion)assert(diagnostics.response.playerSources>0,'Actual movement did not reach the effect');
 fs.writeFileSync(path.join(out,label+'.json'),JSON.stringify({label,canvasMode,backgroundBitmap,droneLayers,diagnostics,captureStart,captureEnd,measuredFPS,diagnosticOmission:omit||null,electron:process.versions.electron,viewport:[windowWidth,windowHeight],mode:visible?'visible-composited':composited?'hidden-composited':'offscreen',requestedOffscreenFPS:composited?null:165,gpu,features:app.getGPUFeatureStatus(),samples,timings,notes:'Isolated stress: 24 durable enemies, invulnerable player prevents contact deaths; keepInsideArena; real shotgun, particles and full/high graphics. Hidden/offscreen timings are not physical presentation FPS. Earlier reports allowed contact deaths and are not density-matched baselines. Diagnostic omissions are never production quality and never count as a performance improvement. Tracing/profiling adds overhead: never treat such a run as a performance-gain comparison.'},null,2));
 fs.writeFileSync(path.join(out,label+'.png'),(await win.webContents.capturePage()).toPNG());
 console.log(JSON.stringify({label,canvasMode,measuredFPS,profileFile,attributes:captureEnd.attributes,frame:samples.at(-1).perf.frame,update:samples.at(-1).perf.update,draw:samples.at(-1).perf.draw,timings}));app.exit(0);
}).catch(e=>{console.error(e);app.exit(1);});
