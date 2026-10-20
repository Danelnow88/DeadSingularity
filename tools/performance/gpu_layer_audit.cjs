'use strict';
// Isolated renderer-only experiment. The served hooks never modify game files.
if(!process.versions.electron){
  const {spawn}=require('node:child_process'),path=require('node:path');
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const child=spawn(require('electron'),[__filename,...process.argv.slice(2)],{cwd:path.resolve(__dirname,'../..'),env,windowsHide:true,stdio:'inherit'});
  child.on('exit',code=>process.exitCode=code==null?1:code);child.on('error',e=>{console.error(e);process.exitCode=1;});
}else{
const {app,BrowserWindow,contentTracing,screen}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'local/validation/gpu-layer-audit');
const option=(name,fallback)=>process.argv.find(a=>a.startsWith('--'+name+'='))?.split('=').slice(1).join('=')||fallback;
const label=option('label','layers').replace(/[^a-z0-9_-]/gi,''),cases=option('cases','full,actors,projectiles,particles,environment,post,ui,full').split(',');
const rosterMode=option('roster','production');assert(['production','legacy'].includes(rosterMode));
const auditScene=option('scene','mixed');assert(['mixed','swarm-ten'].includes(auditScene));assert(auditScene==='mixed'||rosterMode==='production');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'ds-gpu-layers-')));app.on('window-all-closed',()=>{});
app.whenReady().then(async()=>{
 fs.mkdirSync(out,{recursive:true});
 let source=fs.readFileSync(path.join(root,'js/game.js'),'utf8');
 function replace(a,b){assert(source.includes(a),'missing hook '+a);source=source.replace(a,b);}
 if(rosterMode==='production')replace('const dimensionContentEnabled = !isolatedMode;',"const dimensionContentEnabled = true; // served audit only: use promoted content");
 replace('function loop(now) {','function loop(now) { if(NV.__auditOwnLoop)return;');
 replace('NV.getState = () => state;',`NV.getState = () => state;
 NV.__auditStart=()=>{currentWeapon=NV.weaponById('shotgun');weaponFus.shotgun=3;inventory=[currentWeapon];player.hp=player.maxHp=100000;NV.input.setFire(true);};
 NV.__auditBurst=()=>spawnExplosion(player.x,player.y,200,'#c492d6',1);
 NV.__auditFreeze=()=>{NV.__auditOwnLoop=true;NV.__auditBaseTime=visualTimeSeconds;return {enemies:enemies.length,bullets:bullets.length,particles:particles.length,player:[player.x,player.y],time:visualTimeSeconds,roster:enemies.map(e=>({id:e.enemyTypeId,visualId:e.visualId,rosterVisualId:e.rosterVisualId,previewMotionPolish:e.previewMotionPolish,previewAgileSwarm:e.previewAgileSwarm,isElite:e.isElite})),catalog:{enemies:ENEMY_TYPES.map(e=>e.id),elites:ELITE_TYPES.map(e=>e.visualId||e.id)}};};
 NV.__auditDraw=t=>{visualTimeSeconds=NV.__auditBaseTime+t;NV.presentationClock.beginFrame(visualTimeSeconds,0);draw();};`);
 // Each gate affects only rendering, with entity arrays untouched.
 const start=source.indexOf('  function draw()'),end=source.indexOf('  function drawSpecialVFX',start);
 let draw=source.slice(start,end);
 draw=draw.replace('const drawBackgroundEffects = renderDiag.backgroundEffects;',"const drawBackgroundEffects = renderDiag.backgroundEffects && NV.__auditOmit !== 'environment';");
 draw=draw.replace('const drawMetaOverlays = renderDiag.metaOverlays;',"const drawMetaOverlays = renderDiag.metaOverlays && NV.__auditOmit !== 'post';");
 draw=draw.replaceAll('if (showHUD &&',"if (NV.__auditOmit !== 'ui' && showHUD &&");
 draw=draw.replace('if (flashAlpha > 0 && flashColor)',"if (NV.__auditOmit !== 'post' && flashAlpha > 0 && flashColor)");
 draw=draw.replace('for (const p of particles)',"for (const p of (NV.__auditOmit === 'particles' ? [] : particles))");
 draw=draw.replace('for (const b of bullets)',"for (const b of (NV.__auditOmit === 'projectiles' ? [] : bullets))");
 source=source.slice(0,start)+draw+source.slice(end);
 let spectral=fs.readFileSync(path.join(root,'js/render/spectralEnemies2D.js'),'utf8').replaceAll('\r\n','\n');
 const modelHook='function drawLabEnemyModel(ctx, modelIndex, cx, cy, scale = 1, targetX = cx, targetY = cy, time = 0, enemyColor = \'#ff2a4b\', detail) {\n    ctx.save();';
 assert(spectral.includes(modelHook));
 // Hydra component isolation, served only in this diagnostic process.
 const hydraStart=spectral.indexOf('      case 5: // RB6 - Entidad Hidra');
 const hydraEnd=spectral.indexOf('\n    }\n    ctx.restore();',hydraStart);
 assert(hydraStart>=0&&hydraEnd>hydraStart,'Hydra component hook');
 let hydra=spectral.slice(hydraStart,hydraEnd);
 hydra=hydra.replace('const hydraAccentLum = accentLum;',`const hydraAccentLum = accentLum;
        if(NV.__auditOmit==='hydraGlow')detail={...detail,fauxGlow:false,glowBlur:0};
        if(NV.__auditOmit==='hydraInk')detail={...detail,secondaryInk:false};`);
 hydra=hydra.replaceAll('        drawHandDrawnLiquidBlob(',"        if(NV.__auditOmit!=='hydraBodies')drawHandDrawnLiquidBlob(");
 hydra=hydra.replace('if (!detail || detail.particles !== false)',"if (NV.__auditOmit!=='hydraParticles' && (!detail || detail.particles !== false))");
 hydra=hydra.replace('        drawLabEyes(',"        if(NV.__auditOmit!=='hydraEyes')drawLabEyes(");
 spectral=spectral.slice(0,hydraStart)+hydra+spectral.slice(hydraEnd);
 spectral=spectral.replace(modelHook,modelHook+`\n    if(NV.__auditOmit==='clip'){const m=ctx.getTransform();const extent=140*Math.abs(scale);const x0=Math.floor(m.a*cx+m.c*cy+m.e-extent*(Math.abs(m.a)+Math.abs(m.c)));const y0=Math.floor(m.b*cx+m.d*cy+m.f-extent*(Math.abs(m.b)+Math.abs(m.d)));const w=Math.ceil(extent*(Math.abs(m.a)+Math.abs(m.c))*2)+2,h=Math.ceil(extent*(Math.abs(m.b)+Math.abs(m.d))*2)+2;ctx.resetTransform();ctx.beginPath();ctx.rect(x0,y0,w,h);ctx.clip();ctx.setTransform(m);}`);
 const environment=fs.readFileSync(path.join(root,'js/render/spaceEnvironment.js'),'utf8').replace('gl.drawArrays(gl.TRIANGLES,0,3);',"if(NV.__auditOmit!=='environmentShader')gl.drawArrays(gl.TRIANGLES,0,3);").replace('ctx.rect(x,y,size,size);',"if(NV.__auditOmit==='rects')ctx.fillRect(x,y,size,size);else ctx.rect(x,y,size,size);");
 const response=fs.readFileSync(path.join(root,'js/render/spaceResponse.js'),'utf8').replace('ctx.rect(grainDraw[n],grainDraw[n+1],grainDraw[n+2],grainDraw[n+2]);',"if(NV.__auditOmit==='cull'&&!NV.__auditRectVisible(ctx,grainDraw[n],grainDraw[n+1],grainDraw[n+2],grainDraw[n+2])){}else if(NV.__auditOmit==='rects')ctx.fillRect(grainDraw[n],grainDraw[n+1],grainDraw[n+2],grainDraw[n+2]);else ctx.rect(grainDraw[n],grainDraw[n+1],grainDraw[n+2],grainDraw[n+2]);");
 let common=fs.readFileSync(path.join(root,'js/render/enemies.js'),'utf8').replace("if (typeof Path2D !== 'function')", "if (NV.__auditOmit === 'nativePaths' || typeof Path2D !== 'function')");
 if(cases.some(c=>['fineCommon','fineSwarm','fineSpitter','fineAll'].includes(c))&&!common.includes('swarmBodySprite'))throw Error('Common detail candidates were rejected and archived in local/validation/subtle-render-20261014/common-candidate.js; use native full or fineHydra.');
 common=common.replace("commonFauxGlowEnabled = commonDiagMode === 'full';","commonFauxGlowEnabled = commonDiagMode === 'full' && NV.__auditOmit !== 'commonGlow';");
 const blurGate=code=>code.replace(/ctx\.shadowBlur\s*=\s*([^;]+);/g,"ctx.shadowBlur = NV.__auditOmit==='attackBlur'?0:($1);");
 common=blurGate(common);spectral=blurGate(spectral);
 const server=require('node:http').createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+decodeURIComponent(name));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');
  res.end(name==='/js/game.js'?source:name==='/js/render/enemies.js'?common:name==='/js/render/spectralEnemies2D.js'?spectral:name==='/js/render/spaceEnvironment.js'?environment:name==='/js/render/spaceResponse.js'?response:fs.readFileSync(file));
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const win=new BrowserWindow({title:'Auditoría GPU — cierre automático',width:1920,height:1080,fullscreen:true,show:false,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false}});
 const errors=[];win.webContents.on('console-message',d=>{if(d.level==='error')errors.push(d.message);});
 const evaluate=s=>win.webContents.executeJavaScript(s,true);
 await win.loadURL('http://127.0.0.1:'+server.address().port+'/index.html?fresh=1&combatLab=1');await wait(900);
 await evaluate(fs.readFileSync(path.join(root,'tools/performance/sparse_path_candidate.js'),'utf8'));
 await evaluate(fs.readFileSync(path.join(root,'tools/performance/actor_clip_candidate.js'),'utf8'));
 await evaluate(fs.readFileSync(path.join(root,'tools/performance/count_actor_ink.js'),'utf8'));
 await evaluate(`(()=>{
 NV.__auditOmit='full';
 if(${rosterMode==='production'}){const roster=NV.dimensionBaselineRoster();NV.ENEMY_TYPES=roster.enemies;NV.ELITE_TYPES=roster.elites;window.__auditCatalog=roster;}
 NV.__auditRectVisible=(ctx,x,y,w,h)=>{const m=ctx.getTransform();const ax=m.a*x+m.e,ay=m.d*y+m.f;return ax+m.a*w>=-32&&ay+m.d*h>=-32&&ax<=ctx.canvas.width+32&&ay<=ctx.canvas.height+32;};
 NV.setGraphicsQuality('high');NV.setGraphicsOption('spaceTravel',true);NV.setGraphicsOption('spaceResponse',true);NV.setGraphicsOption('particles',true);NV.setGraphicsOption('heavyVfx',true);NV.setGraphicsOption('showFPS',true);NV.setComfortOption('reducedEffects',false);NV.setFirePolicy('legacy-auto');NV.setMusicVolume(0);NV.rhythmToggleEnabled(false);
 NV.dimensionIllustratedScenery=true;NV.sectorVisualForWave=()=>NV.dimensionSkyBaseline.profiles[0];NV.resetVisualBudget();NV.updateVisualBudget=()=>{};
 let seed=90210;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 const update=NV.updateEnemies;NV.updateEnemies=(dt,st)=>{st.player.hp=100000;st.player.invuln=1;st.keepInsideArena=true;for(const e of st.enemies)e.hp=e.maxHp=100000;return update(dt,st);};
 for(const key of ['drawEnemy','drawSpectralEnemy2D','drawDimensionalThreatBody','drawPlayer','drawBoss','drawSpectralBoss2D','drawDimensionalThreatFields','drawHazards','drawEncounterWarnings']){if(!NV[key])continue;const fn=NV[key];NV[key]=function(...args){if(NV.__auditOmit==='actors')return true;const e=args[1];if(key==='drawEnemy'&&NV.__auditOmit==='commonBodies')return true;if(key==='drawSpectralEnemy2D'&&NV.__auditOmit==='eliteBodies'&&e?.isElite)return true;if(key==='drawSpectralEnemy2D'&&NV.__auditOmit==='normalSpectral'&&!e?.isElite)return true;if(NV.__auditOmit===key)return key==='drawDimensionalThreatBody'?['rift_weaver','dimension_sniper','void_devourer'].includes(e?.enemyTypeId):true;if(NV.__auditOmit&&['drawEnemy','drawSpectralEnemy2D','drawDimensionalThreatBody'].includes(key)&&(NV.__auditOmit===e?.enemyTypeId||NV.__auditOmit===e?.visualId))return true;return fn.apply(this,args);};}
 NV.spaceEnvironment={...NV.spaceEnvironment};
 if(NV.prewarmRefinedElites)NV.prewarmRefinedElites();
 if(NV.prewarmPaintedSwarmlet)NV.prewarmPaintedSwarmlet();
 const unclippedActor=NV.drawEnemy;NV.drawEnemy=function(...args){return NV.__auditOmit==='actorclip'?NV.__drawActorClipped(unclippedActor,...args):unclippedActor(...args);};
 for(const key of ['drawBehind','drawFront','drawTravelStars']){const fn=NV.spaceEnvironment[key];NV.spaceEnvironment[key]=function(...args){if(NV.__auditOmit==='environment'||NV.__auditOmit==='environmentCanvas'||NV.__auditOmit===key)return;if(['localclip','localtiles'].includes(NV.__auditOmit)&&key!=='drawFront'){NV.__sparseMode=NV.__auditOmit;args[0]=NV.__sparseContext(args[0]);}return fn.apply(this,args);};}
 NV.spaceTrails={...NV.spaceTrails};const trail=NV.spaceTrails.draw;NV.spaceTrails.draw=function(...args){if(NV.__auditOmit==='projectiles')return;return trail.apply(this,args);};
 const legacyComposition=[{enemyId:'rift_weaver',quantity:1},{enemyId:'dimension_sniper',quantity:1},{enemyId:'void_devourer',quantity:1},{enemyId:'specter_lite',quantity:5},{enemyId:'runner',quantity:5},{enemyId:'drone',quantity:5},{enemyId:'elite_velocity',quantity:2},{enemyId:'elite_bulwark',quantity:2},{enemyId:'elite_predator',quantity:2}];
 const composition=${auditScene==='swarm-ten'}?[{enemyId:'swarmlet',quantity:10}]:${rosterMode==='production'}?[...NV.ENEMY_TYPES.map(e=>({enemyId:e.id,quantity:1+({runner:2,swarmlet:2,spitter:1,wisp:1}[e.id]||0)})),...NV.ELITE_TYPES.map(e=>({enemyId:NV.productionEnemyCanonicalId(e,'elite'),quantity:1}))]:legacyComposition;
 const result=NV.combatLabRuntime.start({characterId:'rook',wave:20,difficultyId:'normal',durationMode:'infinite',composition});if(!result.ok)throw Error(JSON.stringify(result));NV.__auditStart();window.__auditFx=setInterval(()=>NV.__auditBurst(),120);
 })()`);
 win.show();win.focus();await wait(5000);
 const load=await evaluate('clearInterval(window.__auditFx);NV.__auditFreeze()');assert.equal(load.enemies,auditScene==='swarm-ten'?10:rosterMode==='production'?21:24);
 const actorInk=await evaluate('NV.__countActorInk(()=>NV.__auditDraw(0))');
 if(rosterMode==='production'){assert(load.roster.every(e=>load.catalog.enemies.includes(e.id)||load.catalog.elites.includes(e.id)||load.catalog.elites.includes(e.visualId)));assert(!load.roster.some(e=>['drone','shielder','specter_lite','specter_grunt','elite_velocity','specter_elite_void'].includes(e.id)));if(auditScene==='mixed')assert.equal(load.roster.find(e=>e.id==='specter_archer').rosterVisualId,'specter_lite');}
 // Snapshot state held across every case; visual clock advances on the same
 // two-second phase schedule. Final shipping candidates also need live A/B.
 await evaluate(`window.__auditTimes=[];window.__auditPhase=performance.now();window.__auditMeasuring=false;
 requestAnimationFrame(function tick(t){NV.__auditDraw(((t-window.__auditPhase)/1000)%2);if(window.__auditMeasuring)window.__auditTimes.push(t);requestAnimationFrame(tick);});true;`);
 const reports=[];
 for(let index=0;index<cases.length;index++){
  const omission=cases[index];assert(['full','actors','projectiles','particles','environment','environmentShader','environmentCanvas','post','ui','clip','rects','cull','localclip','localtiles','actorclip','nativePaths','cachedSpitter','drone','runner','commonBodies','eliteBodies','normalSpectral','commonGlow','attackBlur','fineReference','fineCommon','fineSwarm','fineSpitter','fineHydra','fineAll','hydraBodies','hydraEyes','hydraParticles','hydraGlow','hydraInk','refinedElites','referenceElites','referenceSwarm','paintedSwarm','drawBehind','drawFront','drawTravelStars','drawEnemy','drawSpectralEnemy2D','drawPlayer','drawDimensionalThreatBody','drawDimensionalThreatFields'].includes(omission)||load.catalog.enemies.includes(omission)||load.catalog.elites.includes(omission));
  console.log('GPU LAYER '+omission+' ('+(index+1)+'/'+cases.length+')');
  await evaluate(omission==='refinedElites'?'NV.__refinedEliteBody=true;true;':omission==='referenceElites'?'NV.__refinedEliteBody=false;true;':'delete NV.__refinedEliteBody;true;');
  await evaluate(omission==='paintedSwarm'?'NV.__paintedSwarm=true;true;':omission==='referenceSwarm'?'NV.__paintedSwarm=false;true;':'delete NV.__paintedSwarm;true;');
  if(omission==='cachedSpitter')throw Error('Escopuras body/nozzle cache was rejected: no consistent full-frame gain. See escopuras-cache-corrected-20261014-summary.json.');
  await evaluate(`NV.__auditOmit=${JSON.stringify(omission)};NV.__subtleCommon=${JSON.stringify(omission==='fineSwarm'?'swarm':omission==='fineSpitter'?'spitter':['fineCommon','fineAll'].includes(omission))};${omission==='fineReference'?'NV.__subtleHydra=false;':['fineHydra','fineAll'].includes(omission)?'NV.__subtleHydra=true;':'delete NV.__subtleHydra;'}window.__auditPhase=performance.now();document.querySelectorAll('.hud,#fpsCounter').forEach(n=>n.style.visibility=${JSON.stringify(omission==='ui'?'hidden':'')});true;`);
  await wait(1600);
  await evaluate('window.__auditTimes.length=0;window.__auditMeasuring=true;');await wait(6000);
  const timing=await evaluate(`(()=>{window.__auditMeasuring=false;const a=window.__auditTimes,d=[];for(let i=1;i<a.length;i++)d.push(a[i]-a[i-1]);d.sort((a,b)=>a-b);const q=p=>d[Math.floor((d.length-1)*p)];return {frames:a.length,fps:(a.length-1)*1000/(a.at(-1)-a[0]),frameMs:{p50:q(.5),p95:q(.95),p99:q(.99),worst:d.at(-1)},fpsLow5:1000/q(.95),fpsLow1:1000/q(.99)};})()`);
  const tracePath=path.join(out,label+'-'+index+'-'+omission+'.trace.json');
  await contentTracing.startRecording({recording_mode:'record-until-full',trace_buffer_size_in_kb:64*1024,included_categories:['toplevel','devtools.timeline','disabled-by-default-devtools.timeline.frame','cc','viz','gpu'],excluded_categories:['*']});
  await wait(2500);await contentTracing.stopRecording(tracePath);
  const bytes=fs.readFileSync(tracePath);fs.writeFileSync(tracePath+'.gz',zlib.gzipSync(bytes));
  // Keep raw trace too: no automatic removal of diagnostic artifacts.
  reports.push({omission,timing,trace:path.relative(root,tracePath+'.gz')});
  fs.writeFileSync(path.join(out,label+'.json'),JSON.stringify({rosterMode,auditScene,load,actorInk,display:screen.getDisplayMatching(win.getBounds()),reports,errors,notes:'Same frozen combat state for layer isolation; world/visual animation continues. Omission is diagnostic only. Timings outside trace, trace sampled separately. Live A/B required before shipping. Production roster includes promoted visual/behavior flags; legacy mode is historical only. Actor ink counts sampled once outside measurement; counts are not GPU durations.'},null,2));
  console.log(JSON.stringify({omission,...timing}));
 }
 assert.deepEqual(errors,[]);win.close();server.close();app.exit(0);
}).catch(e=>{console.error(e);app.exit(1);});
}
