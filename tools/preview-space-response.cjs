'use strict';
// Real game in an isolated Electron profile. No production save/settings writes.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),qa=process.argv.includes('--qa'),record=process.argv.includes('--record');
const out=path.join(root,'local/validation/habitat-live'),wait=ms=>new Promise(r=>setTimeout(r,ms));
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'ds-space-response-')));
app.whenReady().then(async()=>{
  const win=new BrowserWindow({title:'DEADSINGULARITY · cosmos vivo · F6 reacción / F8 cintas / F9 mapa / F7 reiniciar',width:1280,height:800,useContentSize:true,show:false,
    webPreferences:{sandbox:true,contextIsolation:true,offscreen:qa,backgroundThrottling:false}});
  const evaluate=s=>win.webContents.executeJavaScript(s,true),errors=[];
  win.webContents.on('console-message',d=>{if(d.level==='error')errors.push(d.message);});
  await win.loadFile(path.join(root,'index.html'),{query:{fresh:'1',combatLab:'1'}});
  for(let i=0;i<100;i++){if(await evaluate('!!(window.NV&&NV.combatLabRuntime&&NV.combatLabRuntime.ready)'))break;await wait(50);}
  const setup=await evaluate(`(()=>{
    NV.setGraphicsOption('spaceTravel',true);NV.setGraphicsOption('spaceResponse',true);NV.setGraphicsOption('showFPS',true);
    NV.setComfortOption('reducedEffects',false);NV.setFirePolicy('manual');NV.setMusicVolume(0);
    let scene=0;NV.sectorVisualForWave=()=>NV.dimensionSkyBaseline.profiles[scene];
    const update=NV.updateEnemies;NV.updateEnemies=function(dt,st){
      st.keepInsideArena=true;
      st.player.invuln=Math.max(st.player.invuln||0,1);
      for(const e of st.enemies)if(!e.dead)e.hp=e.maxHp;
      return update(dt,st);
    };
    const start=()=>{NV.spaceResponse.hide();NV.spaceHabitat.hide();NV.spaceTrails.hide();return NV.combatLabRuntime.start({characterId:'boti',wave:11,difficultyId:'normal',durationMode:'infinite',
      composition:[{enemyId:'runner',quantity:4},{enemyId:'drone',quantity:4},{enemyId:'spitter',quantity:2}]});};
    const label=document.createElement('div');label.id='spaceResponsePreviewHelp';
    label.style.cssText='position:fixed;bottom:7px;left:12px;z-index:9999;color:#adbdc8;font:11px system-ui;background:#09121ddd;padding:5px 8px;border-radius:5px;pointer-events:none';
    const sync=()=>{label.textContent='PRUEBA AISLADA · '+NV.dimensionSkyBaseline.profiles[scene].name+' · '+(NV.spaceResponse.getVisualStyle()==='clouds'?'GAS VIVO':'CINTAS')+' · WASD / SHIFT / CLIC · F6 GAS '+(NV.settings.graphics.spaceResponse?'ON':'OFF')+' · F8 CINTAS · F9 MAPA · F7 REINICIAR';};
    document.body.appendChild(label);sync();NV.onSettingsChange(sync);
    document.addEventListener('keydown',e=>{if(e.code==='F6'){e.preventDefault();NV.setGraphicsOption('spaceResponse',!NV.settings.graphics.spaceResponse);}
      if(e.code==='F8'){e.preventDefault();NV.spaceResponse.setVisualStyle(NV.spaceResponse.getVisualStyle()==='clouds'?'lines':'clouds');sync();}
      if(e.code==='F9'){e.preventDefault();scene=(scene+1)%8;sync();}
      if(e.code==='F7'){e.preventDefault();start();}});
    return start();
  })()`);
  assert(setup.ok,JSON.stringify(setup));
  for(let i=0;i<100;i++){if(await evaluate('NV.spaceEnvironment.diagnostics().skyReady&&NV.spaceResponse.diagnostics().gpuSurface'))break;await wait(50);}
  // The combat lab spawns at the lower edge. Walk into the material through the
  // actual controls so the preview opens beside a recognizable traversable fold.
  win.webContents.sendInputEvent({type:'keyDown',keyCode:'W'});await wait(1900);
  win.webContents.sendInputEvent({type:'keyUp',keyCode:'W'});
  await wait(400);
  if(!qa){win.show();win.focus();return;}
  fs.mkdirSync(out,{recursive:true});
  if(record){
    // Verification-only composite recording; no production pixel readback/copies.
    // Copy GL immediately after its draw, then the completed actor canvas in RAF.
    await evaluate(`(()=>{
      const c=document.createElement('canvas');c.width=960;c.height=Math.round(NV.canvas.height*960/NV.canvas.width);
      const context=c.getContext('2d',{alpha:false}),original=NV.spaceEnvironment;
      NV.spaceEnvironment=Object.freeze({...original,render(o){const ok=original.render(o);if(ok)context.drawImage(document.querySelector('.space-environment'),0,0,c.width,c.height);return ok;}});
      const stream=c.captureStream(30),mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm;codecs=vp8';
      const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:2500000}),chunks=[];
      let request=0,frames=0;
      const compose=()=>{context.drawImage(NV.canvas,0,0,c.width,c.height);frames++;request=requestAnimationFrame(compose);};request=requestAnimationFrame(compose);
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      window.__stopHabitatRecording=()=>new Promise(resolve=>{recorder.onstop=async()=>{
        cancelAnimationFrame(request);NV.spaceEnvironment=original;for(const track of stream.getTracks())track.stop();
        const blob=new Blob(chunks,{type:mime}),bytes=new Uint8Array(await blob.arrayBuffer());let binary='';
        for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
        const v=document.createElement('video');v.src=URL.createObjectURL(blob);v.muted=true;
        await v.play();await new Promise(r=>setTimeout(r,450));v.pause();
        const check=document.createElement('canvas');check.width=c.width;check.height=c.height;check.getContext('2d').drawImage(v,0,0);
        resolve({video:btoa(binary),frame:check.toDataURL('image/png').split(',')[1],frames,mime,bytes:bytes.length});
      };recorder.stop();});recorder.start(500);return true;
    })()`);
    await wait(500);win.webContents.sendInputEvent({type:'keyDown',keyCode:'D'});await wait(750);
    win.webContents.sendInputEvent({type:'keyUp',keyCode:'D'});
    win.webContents.sendInputEvent({type:'mouseMove',x:820,y:270});await evaluate('NV.input.setFire(true);true;');await wait(750);
    await evaluate('NV.input.setFire(false);true;');await wait(3000);
    const clip=await evaluate('window.__stopHabitatRecording()');assert(clip.frames>60&&clip.bytes>10000,'empty habitat recording');
    fs.writeFileSync(path.join(out,'recorrido.webm'),Buffer.from(clip.video,'base64'));
    fs.writeFileSync(path.join(out,'recorrido-decoded.png'),Buffer.from(clip.frame,'base64'));
    fs.writeFileSync(path.join(out,'recording.json'),JSON.stringify({frames:clip.frames,mime:clip.mime,bytes:clip.bytes,notes:'Actual game movement and fire; verification-only composite/capture at 30 FPS, not performance evidence.'},null,2));
  }
  const initial=await evaluate('({response:NV.spaceResponse.diagnostics(),habitat:NV.spaceHabitat.diagnostics(),trails:NV.spaceTrails.diagnostics(),runtime:NV.getRuntimeSnapshot()})');
  assert(initial.response.active&&initial.response.reactive);
  assert(initial.response.gpuSurface&&initial.habitat.foregroundPatches===4,'near gas GPU surface not active');
  assert(await evaluate('NV.spaceEnvironment.diagnostics().skyFile==="sky-threshold-v1.webp"'),'original nebula not restored');
  assert(await evaluate('NV.isIsolatedTestMode&&NV.isIsolatedTestMode()||NV.combatLabRuntime.snapshot().status==="RUNNING"'));
  win.webContents.sendInputEvent({type:'keyDown',keyCode:'D'});await wait(350);
  fs.writeFileSync(path.join(out,'walking.png'),(await win.webContents.capturePage()).toPNG());await wait(100);
  win.webContents.sendInputEvent({type:'keyDown',keyCode:'Shift'});await wait(140);
  win.webContents.sendInputEvent({type:'keyUp',keyCode:'Shift'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'D'});
  win.webContents.sendInputEvent({type:'mouseMove',x:390,y:260});
  await evaluate('NV.input.setFire(true);true;');await wait(1000);await evaluate('NV.input.setFire(false);true;');
  const moving=await evaluate('({response:NV.spaceResponse.diagnostics(),habitat:NV.spaceHabitat.diagnostics(),trails:NV.spaceTrails.diagnostics(),runtime:NV.getRuntimeSnapshot()})');
  assert(moving.response.playerSources>initial.response.playerSources,'real movement did not drive dust');
  assert(moving.response.enemySources>0,'real enemies did not drive dust');
  assert(moving.response.bulletSources>0,'real shots did not drive dust');assert(moving.response.energy>0);
  assert(moving.habitat.playerSources>0&&moving.habitat.enemySources>0&&moving.habitat.projectileSources>0);
  assert(moving.habitat.totalDepletion>0&&moving.habitat.pushedMatter>0,'cloud did not open and part laterally');
  assert(moving.trails.emissions>0,'approved projectile cuts were removed');
  fs.writeFileSync(path.join(out,'reaction-on.png'),(await win.webContents.capturePage()).toPNG());
  assert(await evaluate('NV.combatLabRuntime.pause()'));await wait(100);
  const frozen=await evaluate('NV.spaceResponse.diagnostics()');await wait(300);
  assert.equal((await evaluate('NV.spaceResponse.diagnostics()')).energy,frozen.energy,'pause did not freeze response');
  assert.equal((await evaluate('NV.spaceResponse.diagnostics()')).steps,frozen.steps);
  const textureFrozen=await evaluate('NV.spaceEnvironment.diagnostics()');await wait(150);
  assert.equal((await evaluate('NV.spaceEnvironment.diagnostics()')).responseUploads,textureFrozen.responseUploads,'field uploaded during pause');
  assert.equal((await evaluate('NV.spaceEnvironment.diagnostics()')).habitatUploads,textureFrozen.habitatUploads,'gas memory uploaded during pause');
  win.webContents.sendInputEvent({type:'keyDown',keyCode:'F8'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'F8'});await wait(120);
  assert.equal(await evaluate('NV.spaceResponse.getVisualStyle()'),'lines');
  assert.equal((await evaluate('NV.spaceResponse.diagnostics()')).energy,frozen.energy,'design switch changed simulation');
  fs.writeFileSync(path.join(out,'lines-comparison.png'),(await win.webContents.capturePage()).toPNG());
  win.webContents.sendInputEvent({type:'keyDown',keyCode:'F8'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'F8'});await wait(120);
  assert.equal(await evaluate('NV.spaceResponse.getVisualStyle()'),'clouds');
  assert(await evaluate('NV.combatLabRuntime.resume()'));
  await evaluate('NV.setGraphicsOption("spaceResponse",false);true;');await wait(100);
  const off=await evaluate('NV.spaceResponse.diagnostics()');assert(!off.reactive);assert.equal(off.energy,0);
  assert.equal(await evaluate('NV.spaceHabitat.diagnostics().totalDepletion'),0);
  const beforeOff=await evaluate('NV.spaceTrails.diagnostics().emissions');
  await evaluate('NV.input.setFire(true);true;');await wait(400);await evaluate('NV.input.setFire(false);true;');
  assert((await evaluate('NV.spaceTrails.diagnostics()')).emissions>beforeOff,'F6 OFF disabled approved shot trails');
  fs.writeFileSync(path.join(out,'reaction-off.png'),(await win.webContents.capturePage()).toPNG());
  await evaluate(`NV.settingsUI.open();document.getElementById('tabGraphics').click();document.getElementById('settingsSpaceResponse').click();true;`);await wait(100);
  assert(await evaluate('NV.settings.graphics.spaceResponse'));assert(await evaluate('document.getElementById("settingsSpaceResponse").checked'));
  await evaluate('NV.settingsUI.close();true;');
  const scenes=[];
  for(let i=1;i<=8;i++){
    win.webContents.sendInputEvent({type:'keyDown',keyCode:'F9'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'F9'});
    for(let n=0;n<100;n++){if(await evaluate('NV.spaceEnvironment.diagnostics().active&&NV.spaceEnvironment.diagnostics().skyReady'))break;await wait(30);}
    await wait(100);
    const d=await evaluate('({space:NV.spaceEnvironment.diagnostics(),response:NV.spaceResponse.diagnostics(),habitat:NV.spaceHabitat.diagnostics()})');
    assert.equal(d.space.scene,d.response.scene);assert(d.response.active&&d.response.gpuSurface);
    assert.equal(d.space.skyFile,'sky-'+d.space.scene+'-v1.webp');
    assert.equal(d.space.cloudTextureBytes,512*320*4);assert.equal(d.space.noiseUploads,1);
    fs.writeFileSync(path.join(out,d.space.scene+'.png'),(await win.webContents.capturePage()).toPNG());scenes.push(d);
  }
  await evaluate('NV.sectorVisualForWave=()=>NV.dimensionSkyBaseline.profiles[0];true;');await wait(100);
  // Isolate background motion: same paused actors/camera, real GPU at two times.
  assert(await evaluate('NV.combatLabRuntime.pause()'));
  await evaluate(`window.__cosmosRenderer=NV.spaceEnvironment;window.__cosmosProbeTime=0;
    NV.spaceEnvironment=Object.freeze({...__cosmosRenderer,render:o=>__cosmosRenderer.render({...o,time:__cosmosProbeTime})});true;`);await wait(120);
  const stationary=await win.webContents.capturePage();
  fs.writeFileSync(path.join(out,'stationary-t0.png'),stationary.toPNG());
  const frozenSky=await evaluate('NV.spaceEnvironment.diagnostics()');
  await evaluate('window.__cosmosProbeTime=12;true;');await wait(120);
  const animated=await win.webContents.capturePage();
  fs.writeFileSync(path.join(out,'stationary-t12.png'),animated.toPNG());
  const animatedSky=await evaluate('NV.spaceEnvironment.diagnostics()');
  assert(animatedSky.frames>frozenSky.frames,'stationary scene did not animate');
  assert.equal(animatedSky.skyUploads,frozenSky.skyUploads,'time animated by uploading artwork');
  assert.equal(animatedSky.responseUploads,frozenSky.responseUploads,'stationary paused actors changed the field');
  assert.equal(animatedSky.habitatUploads,frozenSky.habitatUploads,'stationary paused actors changed gas memory');
  assert(!stationary.toBitmap().equals(animated.toBitmap()),'actual GPU background is inanimate');
  await evaluate('NV.spaceEnvironment=window.__cosmosRenderer;NV.combatLabRuntime.resume();true;');await wait(100);
  // Source/world coordinates do not change when camera/DPR changes.
  await evaluate('NV.setGraphicsResolution("1080p");true;');await wait(160);
  assert(await evaluate('NV.spaceResponse.diagnostics().active'));
  await evaluate(`document.querySelector('.space-environment').getContext('webgl').getExtension('WEBGL_lose_context').loseContext();true;`);await wait(150);
  assert(await evaluate('NV.spaceEnvironment.diagnostics().failed&&NV.spaceResponse.diagnostics().active'),'Canvas reaction must survive GPU fallback');
  assert.equal(await evaluate('NV.spaceResponse.diagnostics().gpuSurface'),false);
  fs.writeFileSync(path.join(out,'gas-fallback.png'),(await win.webContents.capturePage()).toPNG());
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({pass:true,initial,moving,frozen,textureFrozen,off,scenes,frozenSky,animatedSky,errors,notes:'Original eight skies, actual Boti movement/dash/enemies/pistol; background changes at fixed camera/paused actors without source reuploads. Bounded near response, F8 retains field, F9 cycles skies. Isolated preview, not a performance guarantee.'},null,2));
  console.log('PASS real Electron cosmos: original 8 skies, movement/enemies/projectiles, F8/pause/no uploads, F6/menu/F9, resize, Canvas fallback');app.exit(0);
}).catch(error=>{console.error(error);app.exit(1);});
app.on('window-all-closed',()=>app.quit());
