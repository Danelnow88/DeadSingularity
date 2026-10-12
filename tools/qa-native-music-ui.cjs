'use strict';
// Probe the actual native request path, always cancel consent. Never captures.
const {app,BrowserWindow,protocol,net,session,ipcMain}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {gameFile,CSP}=require('../desktop/runtime-policy.cjs');
const {installSystemAudio}=require('../desktop/system-audio.cjs');
const root=path.resolve(__dirname,'..');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'ds-native-audio-probe-')));
protocol.registerSchemesAsPrivileged([{scheme:'dsv1',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
app.whenReady().then(async()=>{
  protocol.handle('dsv1',request=>{
    const url=new URL(request.url),file=gameFile(root,decodeURIComponent(url.pathname));
    return url.hostname==='project'&&file?net.fetch(pathToFileURL(file).toString()):new Response('Forbidden',{status:403});
  });
  const win=new BrowserWindow({show:false,width:1000,height:800,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,preload:path.join(root,'desktop/audio-preload.cjs')}});
  win.webContents.setAudioMuted(true);
  const permissions=[],dialogs=[],displayRequests=[],opened=[];
  const tracked={
    setPermissionRequestHandler(fn){session.defaultSession.setPermissionRequestHandler((web,permission,reply,details)=>{permissions.push({type:permission,request:true,details});fn(web,permission,reply,details);});},
    setPermissionCheckHandler(fn){session.defaultSession.setPermissionCheckHandler((web,permission,origin,details)=>{permissions.push({type:permission,check:true,origin});return fn(web,permission,origin,details);});},
    setDisplayMediaRequestHandler(fn){session.defaultSession.setDisplayMediaRequestHandler((request,reply)=>{displayRequests.push({gesture:request.userGesture,audio:request.audioRequested,video:request.videoRequested,frame:request.frame?.url});return fn(request,reply);});}
  };
  installSystemAudio({session:tracked,ipcMain,shell:{async openExternal(url){opened.push(url);}},getWindow:()=>win,dialog:{async showMessageBox(_win,options){dialogs.push(options.message);return {response:0};}},desktopCapturer:{async getSources(){throw Error('QA must never enumerate/capture screens');}}});
  session.defaultSession.webRequest.onHeadersReceived((details,reply)=>reply({responseHeaders:{...details.responseHeaders,'Content-Security-Policy':[CSP]}}));
  await win.loadURL('dsv1://project/index.html'+(process.argv.includes('--normal')?'':'?dimensionEvents=preview'));
  await win.webContents.executeJavaScript('document.getElementById("lobbyPlayBtn").click()',true);
  await new Promise(resolve=>setTimeout(resolve,100));
  await win.webContents.executeJavaScript('if(!NV.alpha.snapshot().paused)NV.input.togglePause()',true);
  await win.webContents.executeJavaScript(`(async()=>{
    const buttons=[...document.querySelectorAll('.native-music-sources button')];
    buttons[0].click();buttons[1].click();
    return await window.deadSingularityDesktopAudio.openMusic('file:///C:/private');
  })()`,true).then(result=>assert.equal(result.ok,false));
  assert.deepEqual(opened,['https://music.youtube.com/','https://open.spotify.com/']);
  const selector=await win.webContents.executeJavaScript(`(()=>{
    const select=document.getElementById('nativeMusicStyle'),initial=select.value,
      names=Array.from(select.options,o=>o.textContent),chosen=[];
    for(const option of select.options){select.value=option.value;select.dispatchEvent(new Event('change'));chosen.push(NV.AudioPerimeter.getStyle());}
    select.value=initial;select.dispatchEvent(new Event('change'));
    return {initial,names,chosen,state:NV.rhythm.state};
  })()`);
  assert.equal(selector.initial,'sparkler');assert.equal(selector.names.length,4);
  assert.deepEqual(selector.chosen,['sparkler','chorus','prism','volt']);assert.equal(selector.state,'off');
  assert.equal(displayRequests.length,0,'choosing a visualizer requested audio capture');
  await win.webContents.executeJavaScript('document.getElementById("rwAddMusicBtn").click()',true);
  await new Promise(resolve=>setTimeout(resolve,700));
  const state=await win.webContents.executeJavaScript('({state:NV.rhythm.state,error:NV.rhythm.error,native:!!window.deadSingularityDesktopAudio?.systemAudio})');
  console.log(JSON.stringify({permissions,displayRequests,dialogs,state}));
  assert(state.native);assert.equal(dialogs.length,1,'native consent not reached');assert.equal(state.state,'denied');
  const visible=await win.webContents.executeJavaScript(`(()=>{
    NV.systemMenu.open();document.querySelector('.system-experimental').open=true;
    return {status:document.getElementById('nativeMusicStatus').textContent,
      start:document.getElementById('rwAddMusicBtn').textContent,
      stop:document.getElementById('rwStopBtn').textContent};
  })()`);
  assert(visible.status.includes('Permiso cancelado'));assert.equal(visible.start,'Activar reacción');assert.equal(visible.stop,'Detener');
  const out=path.join(root,'local/validation/audio-perimeter');fs.mkdirSync(out,{recursive:true});
  await new Promise(resolve=>setTimeout(resolve,100));
  fs.writeFileSync(path.join(out,'native-music-menu.png'),(await win.webContents.capturePage()).toPNG());
  console.log('PASS native music UI: four selectable styles without capture, source buttons, restricted URLs, visible status and real request reaches native consent; no capture');
  win.destroy();app.exit(0);
}).catch(error=>{console.error(error);app.exit(1);});
