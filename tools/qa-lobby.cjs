'use strict';
const {app,BrowserWindow,protocol,net,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {gameFile,CSP}=require('../desktop/runtime-policy.cjs');
const urlArg=process.argv.find(arg=>arg.startsWith('--url='));
const base=urlArg?urlArg.slice(6):'dsv1://project/index.html';
const root=path.resolve(__dirname,'..'),out=path.join(root,'local/validation',urlArg?'lobby-cosmos-live':'lobby-cosmos');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'dsv1-lobby-qa-')));
protocol.registerSchemesAsPrivileged([{scheme:'dsv1',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
app.whenReady().then(async()=>{
  fs.mkdirSync(out,{recursive:true});
  protocol.handle('dsv1',request=>{
    const url=new URL(request.url),file=gameFile(root,decodeURIComponent(url.pathname));
    return url.host==='project'&&file?net.fetch(pathToFileURL(file).toString()):new Response('Forbidden',{status:403});
  });
  session.defaultSession.webRequest.onHeadersReceived((details,reply)=>reply({responseHeaders:{...details.responseHeaders,'Content-Security-Policy':[CSP]}}));
  const win=new BrowserWindow({width:1280,height:800,show:false,webPreferences:{offscreen:true,backgroundThrottling:false,sandbox:true,contextIsolation:true,nodeIntegration:false}});
  // Windows CI/RDP can request reduced motion. Test each preference explicitly,
  // rather than assuming the host accessibility setting enables animation.
  win.webContents.debugger.attach('1.3');
  const errors=[];win.webContents.on('console-message',details=>{if(details.level==='error')errors.push(details.message);});
  const evaluate=code=>win.webContents.executeJavaScript(code,true);
  const reports=[];
  for(const [name,w,h] of [['desktop',1280,800],['mobile-portrait',390,844],['mobile-landscape',844,390]]) {
    win.setMinimumSize(1,1);win.setContentSize(w,h);
    const target=new URL(base);if(name!=='desktop')target.searchParams.set('mobile','1');
    await win.loadURL(target.toString());
    await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
    await delay(800);
    if(name==='mobile-portrait') {
      assert(await evaluate('getComputedStyle(document.getElementById("rotateOverlay")).display!=="none"'),'Portrait entry requests rotation');
      assert(!(await evaluate('NV.lobbyAtmosphere.getSnapshot()')).active,'Portrait background is suspended');
      fs.writeFileSync(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG());
      reports.push({name,rotationGate:true});
      continue;
    }
    await evaluate('NV.setGraphicsOption("particles",true);NV.setGraphicsQuality("high")');
    const before=await evaluate('NV.lobbyAtmosphere.getSnapshot()');await delay(500);
    const after=await evaluate('NV.lobbyAtmosphere.getSnapshot()');
    assert(after.active&&after.frames>before.frames,'Background must animate '+JSON.stringify({before,after}));
    assert.equal(after.motion,'forward');
    assert(after.probe.depth<before.probe.depth&&after.probe.distance>before.probe.distance,'Stars must move outwards in perspective');
    const geometry=await evaluate(`(()=>{const lobby=document.getElementById('startScreen'),r=document.getElementById('lobbyPlayBtn').getBoundingClientRect();return {width:innerWidth,height:innerHeight,scrollWidth:lobby.scrollWidth,clientWidth:lobby.clientWidth,play:{x:r.x,y:r.y,w:r.width,h:r.height},state:NV.getState(),overflow:[...lobby.querySelectorAll('*')].filter(e=>{const b=e.getBoundingClientRect();return b.width&&b.right>innerWidth+1}).map(e=>({id:e.id,class:e.className,width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right})).slice(0,12)};})()`);
    fs.writeFileSync(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG());
    await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    for(let attempt=0;attempt<30&&(await evaluate('NV.lobbyAtmosphere.getSnapshot()')).active;attempt++) await delay(100);
    assert.equal((await evaluate('NV.lobbyAtmosphere.getSnapshot()')).active,false,'OS reduced motion must stop animation');
    await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
    for(let attempt=0;attempt<30&&!(await evaluate('NV.lobbyAtmosphere.getSnapshot()')).active;attempt++) await delay(100);
    const resumedMotion=await evaluate('({snapshot:NV.lobbyAtmosphere.getSnapshot(),media:matchMedia("(prefers-reduced-motion: reduce)").matches,hidden:document.hidden,orientation:NV.capabilities.orientation})');
    assert.equal(resumedMotion.snapshot.active,true,'Animation resumes when motion is enabled '+JSON.stringify(resumedMotion));
    assert.equal(geometry.state,'menu');assert(geometry.scrollWidth<=geometry.clientWidth+1,'Horizontal overflow '+name+' '+JSON.stringify(geometry));
    assert(await evaluate('getComputedStyle(document.getElementById("rotateOverlay")).display === "none"'),'Lobby must not be covered by rotate prompt');
    assert(await evaluate(`(()=>{const c=document.getElementById('lobbyPreview'),pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=3;i<pixels.length;i+=4)if(pixels[i])return true;return false;})()`),'Pilot preview must actually render');
    assert(geometry.play.x>=0&&geometry.play.x+geometry.play.w<=geometry.width+1&&geometry.play.h>=44);
    fs.writeFileSync(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG());
    await evaluate('NV.setGraphicsOption("particles",false)');assert.equal((await evaluate('NV.lobbyAtmosphere.getSnapshot()')).active,false);
    await evaluate('NV.setGraphicsOption("particles",true); document.getElementById("hero-next").click()');
    await evaluate('document.getElementById("lobbySettingsBtn").click()');assert(await evaluate('!document.getElementById("settingsPanel").classList.contains("hidden")'));
    await evaluate('document.getElementById("settingsClose").click();document.getElementById("lobbyPlayBtn").click()');await delay(700);
    assert.equal(await evaluate('NV.getState()'),'playing');
    if(name==='mobile-portrait') assert(await evaluate('getComputedStyle(document.getElementById("rotateOverlay")).display !== "none"'),'Gameplay keeps orientation gate');
    const stopped=await evaluate('NV.lobbyAtmosphere.getSnapshot()');assert.equal(stopped.active,false);await delay(250);
    assert.equal((await evaluate('NV.lobbyAtmosphere.getSnapshot()')).frames,stopped.frames,'No hidden redraws');
    reports.push({name,before,after,geometry,stopped});
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({pass:true,errors,reports,limitation:'Mobile emulation; not physical device'},null,2));
  console.log('PASS lobby desktop/portrait/landscape: animation, layout, preferences, pilot, settings, play and suspended background.');
  app.exit(0);
}).catch(error=>{console.error(error);app.exit(1);});
