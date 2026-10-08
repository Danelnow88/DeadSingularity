const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=async(window,{root,webChecking,outRoot,profileRoot,packaged})=>{
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const out=outRoot||path.join(root,'local','validation');fs.mkdirSync(out,{recursive:true});
  const transport=webChecking?'web':'desktop';
  const base=webChecking?'http://127.0.0.1:8093/DeadSingularity/':'dsv1://project/';
  const errors=[];
  window.webContents.on('console-message',(_event,level,message)=>{if(level===3)errors.push(message);});
  await window.loadURL(base+'index.html');await wait(700);
  const evaluate=code=>window.webContents.executeJavaScript(code,true);
  const catalog=await evaluate('({state:NV.getState(),pilots:Object.keys(NV.CHARACTERS).length,weapons:NV.WEAPONS.length,enemies:NV.ENEMY_TYPES.length,elites:NV.ELITE_TYPES.length,bosses:NV.BOSS_TYPES.length,node:typeof require})');
  if(!webChecking){
    const {net}=require('electron');
    const denied=await Promise.all(['/reference/prototype/index.html','/workbench.html','/src/play.html'].map(p=>net.fetch('dsv1://project'+p).then(r=>r.status)));
    assert.deepEqual(denied,[403,403,403],'Acceso a contenido fuera de producción');
  }
  const marker='dsv1-profile-qa';
  await evaluate(`localStorage.setItem(${JSON.stringify(marker)},'persisted')`);
  await window.loadURL(base+'index.html');await wait(500);
  assert.equal(await evaluate(`localStorage.getItem(${JSON.stringify(marker)})`),'persisted');
  await evaluate(`localStorage.removeItem(${JSON.stringify(marker)})`);
  assert.equal(catalog.state,'menu');assert.equal(catalog.pilots,4);assert.equal(catalog.weapons,10);
  assert.equal(catalog.enemies,13);assert.equal(catalog.elites,8);assert.equal(catalog.bosses,10);assert.equal(catalog.node,'undefined');
  fs.writeFileSync(path.join(out,transport+'-full-menu.png'),(await window.webContents.capturePage()).toPNG());
  await evaluate('document.getElementById("lobbyPlayBtn").click()');await wait(2000);
  const playing=await evaluate('NV.getRuntimeSnapshot()');assert.equal(playing.state,'playing');assert(playing.frame>5&&playing.player.hp>0);
  await evaluate('window.dispatchEvent(new KeyboardEvent("keydown",{code:"KeyD",key:"d",bubbles:true}))');await wait(500);
  await evaluate('window.dispatchEvent(new KeyboardEvent("keyup",{code:"KeyD",key:"d",bubbles:true}))');
  const moved=await evaluate('NV.getRuntimeSnapshot()');assert(moved.player.x>playing.player.x);
  fs.writeFileSync(path.join(out,transport+'-full-playing.png'),(await window.webContents.capturePage()).toPNG());
  await evaluate('NV.input.togglePause()');
  const paused=await evaluate('NV.getRuntimeSnapshot()');await wait(200);
  assert.equal((await evaluate('NV.getRuntimeSnapshot()')).player.x,paused.player.x);
  const audio=await require('./audio-qa.cjs')(evaluate,undefined,root);
  window.setMinimumSize(1,1);window.setContentSize(844,390);
  await window.loadURL(base+'index.html?mobile=1&fresh=1');await wait(600);
  await evaluate('document.getElementById("lobbyPlayBtn").click()');await wait(1500);
  const mobile=await evaluate(`(()=>{const r=document.querySelector('canvas').getBoundingClientRect();return {state:NV.getState(),mobile:NV.capabilities.isMobile,width:innerWidth,height:innerHeight,canvas:{x:r.x,y:r.y,w:r.width,h:r.height},joystick:!!document.getElementById('joystickZone'),frame:NV.getRuntimeSnapshot().frame};})()`);
  assert.equal(mobile.state,'playing');assert(mobile.mobile&&mobile.joystick&&mobile.frame>5);
  assert(mobile.canvas.x>=-1&&mobile.canvas.y>=-1&&mobile.canvas.x+mobile.canvas.w<=mobile.width+1&&mobile.canvas.y+mobile.canvas.h<=mobile.height+1,'Canvas móvil fuera de pantalla');
  fs.writeFileSync(path.join(out,transport+'-full-mobile.png'),(await window.webContents.capturePage()).toPNG());
  assert.deepEqual(errors,[],'Errores de renderer');
  assert.equal(window.getTitle(),'DeadSingularity · V1');
  const ico=fs.readFileSync(path.join(root,'assets','brand','icon.ico'));
  assert.equal(ico.readUInt16LE(2),1);assert(ico.readUInt16LE(4)>0);
  fs.writeFileSync(path.join(out,transport+'-full.json'),JSON.stringify({pass:true,generatedAt:new Date().toISOString(),transport,packaged,profileRoot,title:window.getTitle(),catalog,playing,moved,paused,audio,mobile,errors,limitations:'Móvil emulado, sin prueba en teléfono físico. No es una partida humana completa de 20 oleadas.'},null,2));
};

