'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=async function(window,{root,webChecking,outRoot,baseline=false,url}){
 const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),evaluate=code=>window.webContents.executeJavaScript(code,true);
 const durationArg=process.argv.find(x=>x.startsWith('--soak-seconds='));
 const seconds=Math.min(600,Math.max(10,Number(durationArg&&durationArg.split('=')[1])||20));
 const base=url||(webChecking?'http://127.0.0.1:8093/DeadSingularity/':'dsv1://project/');
 const out=outRoot||path.join(root,'local/validation');fs.mkdirSync(out,{recursive:true});
 const errors=[],samples=[],scenarios=[],transports=webChecking?'web':'desktop';
 window.webContents.on('console-message',(_event,level,message)=>{if(level===3)errors.push(message);});
 window.webContents.on('render-process-gone',(_event,detail)=>errors.push('Renderer exit: '+detail.reason));
 window.setContentSize(1280,720);
 async function start(quality,seed){
  await window.loadURL(base+'index.html');await wait(700);
  await evaluate(`(()=>{let seed=${seed};Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);NV.setGraphicsQuality(${JSON.stringify(quality)});NV.setDifficulty('easy');NV.setFirePolicy('legacy-auto');document.getElementById('lobbyPlayBtn').click();})()`);
  await wait(1500);assert.equal(await evaluate('NV.getState()'),'playing');
 }
 for(const quality of process.argv.includes('--features-only') ? [] : ['high','auto','performance']){
  for(let repeat=0;repeat<3;repeat++){
   await start(quality,1337);const startTime=Date.now(),scenario=[];
   let restarts=0,stalls=0,previousFrame=-1;
   await evaluate('NV.performanceMonitor.reset()');
   while(Date.now()-startTime<seconds*1000){
    await wait(1000);
    const sample=await evaluate(`(()=>({state:NV.getRuntimeSnapshot(),perf:NV.performanceMonitor.getSnapshot(),heap:performance.memory?performance.memory.usedJSHeapSize:null}))()`);
    assert(Number.isFinite(sample.state.player.x)&&Number.isFinite(sample.state.player.y)&&Number.isFinite(sample.state.player.hp),'Estado no finito');
    assert(sample.perf.frames>0,'Sin muestras de loop real');
    if(sample.state.state==='playing'&&!sample.state.paused){if(sample.state.frame===previousFrame)stalls++;else stalls=0;assert(stalls<3,'Loop detenido');}
    previousFrame=sample.state.frame;
    const budget=sample.state.hostileBudget;
    if(budget&&Number.isFinite(budget.total)&&Number.isFinite(budget.maxHostiles))assert(budget.total<=budget.maxHostiles,'Presupuesto excedido');
    sample.elapsedMs=Date.now()-startTime;scenario.push(sample);samples.push(sample);
    if(sample.state.state==='gameover'){
     restarts++;await evaluate("document.getElementById('restartBtn').click();document.getElementById('lobbyPlayBtn').click()");await wait(500);
    }else if(sample.state.state==='shop'){
     const buttons=await evaluate("Array.from(document.querySelectorAll('button')).filter(b=>!b.disabled&&/SIGUIENTE|CONTINUAR/.test(b.textContent)).map(b=>b.id)");
     if(buttons[0])await evaluate('document.getElementById('+JSON.stringify(buttons[0])+').click()');
    }
   }
   scenarios.push({quality,repeat,seed:1337,restarts,seconds,samples:scenario});
   console.log('SOAK '+(baseline?'reference':transports)+' '+quality+' repeat '+(repeat+1)+': '+scenario.length+' samples, '+restarts+' restarts');
  }
 }
 if(!baseline){
  await start('high',1337);
  const a=await evaluate('NV.getRuntimeSnapshot()');
  await evaluate('NV.input.togglePause()');await wait(600);const b=await evaluate('NV.getRuntimeSnapshot()');
  assert.equal(b.player.x,a.player.x);assert(b.paused);await evaluate('NV.input.togglePause()');await wait(500);
  assert(!await evaluate('NV.getRuntimeSnapshot().paused'));
  await evaluate("document.getElementById('restartBtn').click()");
  assert.equal(await evaluate('NV.getState()'),'menu');
  const interfaces=await evaluate('({runtime:NV.runtime.version,content:NV.Content.getBase().id,extensions:NV.extensions.version,services:NV.services.version})');
  assert.equal(interfaces.runtime,1);assert.equal(interfaces.extensions,1);
  const progress=await evaluate('NV.expedition.exportProgress()');
  assert.equal(progress.kind,'dead-singularity-progress');
  assert(await evaluate('NV.expedition.importProgress('+JSON.stringify(progress)+')'));

  const checkpointResult=await evaluate("(()=>{const saved={version:1,character:'boti',wave:1,run:NV.expedition.create('expedition',1337),player:{hp:120,maxHp:120,armor:0,luck:0,level:1,xp:0,xpToNext:100,baseMoveSpeed:195},inventory:['pistol'],currentWeapon:'pistol',levels:{pistol:1},kills:{},fus:{},consumables:[],shopBought:{},upgradeSlots:[],score:100,shards:20,difficulty:'easy',savedAt:Date.now()};if(!NV.expedition.save(saved))throw new Error('Checkpoint no guardado');return NV.expedition.load();})()");
  assert.equal(checkpointResult.wave,1);
  await window.loadURL(base+'index.html');await wait(600);
  assert(await evaluate('NV.alpha.resume()'));
  const resumed=await evaluate('NV.getRuntimeSnapshot()');
  assert.equal(resumed.wave,2);assert.equal(resumed.state,'playing');assert.equal(resumed.player.character,'boti');
  await evaluate("document.getElementById('restartBtn').click()");
  const legacy=Object.assign({},progress,{kind:'neon-void-progress'});
  assert(await evaluate('NV.expedition.importProgress('+JSON.stringify(legacy)+')'),'Importacion anterior incompatible');
  const startup=await evaluate("(()=>{const n=performance.getEntriesByType('navigation')[0];return {loadMs:n?n.loadEventEnd:null,domReadyMs:n?n.domContentLoadedEventEnd:null,heap:performance.memory?performance.memory.usedJSHeapSize:null,scriptCount:document.scripts.length};})()");
  fs.writeFileSync(path.join(out,transports+'-growth-startup.json'),JSON.stringify({startup,checkpointReload:resumed,legacyImport:true,limitations:'Checkpoint de fixture, no victoria natural de 20 oleadas.'},null,2));

  await evaluate("NV.loadOptional('content')");await evaluate('NV.openContentPanel()');
  assert(await evaluate("document.querySelector('dialog[aria-label=\"Contenido adicional\"]').open"));
  await evaluate("document.querySelector('dialog[aria-label=\"Contenido adicional\"]').close()");
  await evaluate("NV.loadOptional('webgpu')");
  const enabled=await evaluate('NV.webgpuPresentation.enable(NV.canvas)');await wait(300);
  const gpu=await evaluate('NV.webgpuPresentation.diagnostics()');
  let pixels=null;
  if(enabled){assert(gpu.frames>0,'GPU no recibe frames');pixels=await evaluate('NV.webgpuPresentation.verifyFrame()');assert(pixels.maxChannelError<=3,'GPU cambia pixeles');await evaluate('NV.webgpuPresentation.destroyDevice()');await wait(300);assert.equal(await evaluate('NV.webgpuPresentation.diagnostics().mode'),'canvas2d','Device loss sin fallback');}
  await evaluate('NV.webgpuPresentation.disable()');
  assert.equal(await evaluate('NV.webgpuPresentation.diagnostics().mode'),'canvas2d');
  fs.writeFileSync(path.join(out,transports+'-growth-gpu.json'),JSON.stringify({enabled,gpu,pixels,deviceLossTested:enabled,baselineCanvasRestored:true},null,2));
 }
 assert.deepEqual(errors,[],'Errores de renderer');
 const pct=(values,p)=>{values=values.filter(Number.isFinite).sort((a,b)=>a-b);return values[Math.min(values.length-1,Math.round((values.length-1)*p))]||0;};
 const summary=scenarios.map(s=>({quality:s.quality,repeat:s.repeat,seed:s.seed,restarts:s.restarts,samples:s.samples.length,
  updateWindowP95Median:pct(s.samples.map(x=>x.perf.update.p95),.5),drawWindowP95Median:pct(s.samples.map(x=>x.perf.draw.p95),.5),
  frameWindowP95Median:pct(s.samples.map(x=>x.perf.frame.p95),.5),heapFirst:s.samples[0]?.heap,heapLast:s.samples.at(-1)?.heap}));
 const report={pass:true,generatedAt:new Date().toISOString(),transport:baseline?'reference':transports,resolution:[1280,720],secondsPerScenario:seconds,summary,scenarios,errors,
 limitations:'Chromium/Electron offscreen en esta maquina. Muestras p95 del buffer de 240 frames, no percentil global. Escenas evolucionan y pueden reiniciarse al morir; no prueba humana de 20 oleadas, ni telefono fisico, ni benchmark GPU/FPS de pantalla, ni prueba de mejora x5.'};
 fs.writeFileSync(path.join(out,(baseline?'reference':transports)+(process.argv.includes('--features-only')?'-growth-features.json':'-growth-soak.json')),JSON.stringify(report,null,2));
 await window.loadURL(base+'index.html');await wait(500);
 fs.writeFileSync(path.join(out,(baseline?'reference':transports)+'-growth-menu.png'),(await window.webContents.capturePage()).toPNG());
};


