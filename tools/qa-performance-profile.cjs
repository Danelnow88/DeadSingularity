'use strict';
const {app,BrowserWindow,protocol,net,session,contentTracing,crashReporter}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {gameFile,CSP}=require('../desktop/runtime-policy.cjs');
const {createProfiler}=require('../desktop/performance-profile.cjs');
const root=path.resolve(__dirname,'..'),directory=path.join(root,'local/validation/performance-profiler');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'dsv1-profile-qa-')));
protocol.registerSchemesAsPrivileged([{scheme:'dsv1',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
const profiler=createProfiler({app,contentTracing,crashReporter},directory);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
app.whenReady().then(async()=>{
 protocol.handle('dsv1',request=>{const url=new URL(request.url),file=gameFile(root,decodeURIComponent(url.pathname));return url.host==='project'&&file?net.fetch(pathToFileURL(file).toString()):new Response('Forbidden',{status:403});});
 session.defaultSession.webRequest.onHeadersReceived((details,reply)=>reply({responseHeaders:{...details.responseHeaders,'Content-Security-Policy':[CSP]}}));
 const win=new BrowserWindow({width:1280,height:800,show:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
 const errors=[];win.webContents.on('render-process-gone',(_event,details)=>errors.push(details));
 profiler.attach(win);const evaluate=code=>win.webContents.executeJavaScript(code,true);
 await win.loadURL('dsv1://project/index.html?fresh=1&combatLab=1');await wait(600);
 const setup=await evaluate(`(()=>{NV.setGraphicsQuality('high');NV.setGraphicsOption('particles',true);NV.setGraphicsOption('heavyVfx',true);return NV.combatLabRuntime.start({characterId:'rook',wave:16,difficultyId:'normal',durationMode:'infinite',composition:[{enemyId:'specter_lite',quantity:8},{enemyId:'runner',quantity:8},{enemyId:'drone',quantity:8}]});})()`);
 assert(setup.ok,JSON.stringify(setup));
 win.webContents.openDevTools({mode:'detach',activate:false});
 for(let i=0;i<50&&!win.webContents.devToolsWebContents;i++)await wait(100);
 assert(win.webContents.isDevToolsOpened());
 // Separate native timeline from DevTools frontend; no simultaneous recording.
 await profiler.start();console.log('Recording 120s of real combat, GPU enabled, full effects and detached DevTools.');
 let samples=0;
 for(let i=0;i<120&&profiler.state().recording;i++){
   await wait(1000);if(i%10===0){await profiler.mark();samples++;}
 }
 while(profiler.state().busy)await wait(100);
 if(profiler.state().recording)await profiler.stop();
 const trace=profiler.state().lastSaved;assert(trace&&fs.existsSync(trace));
 const readTrace=file=>JSON.parse(require('node:zlib').gunzipSync(fs.readFileSync(file)));
 const events=readTrace(trace).traceEvents;
 assert(events.length>100);assert(events.some(e=>e.name==='DSV1 marker 1'),'Timeline markers');
 const metadata=JSON.parse(fs.readFileSync(path.join(path.dirname(trace),'session.json'),'utf8'));
 assert(metadata.elapsedSeconds>=30,'Useful sustained recording');assert.deepEqual(errors,[]);
 assert.equal(metadata.final.settings.graphics.quality,'high');assert.equal(metadata.final.settings.graphics.particles,true);assert.equal(metadata.final.settings.graphics.heavyVfx,true);
 // Exercise V8 samples separately, never pretend a no-sampling trace has them.
 assert(profiler.setSamples(true));await wait(2);await profiler.start();await wait(10000);await profiler.stop();
 const sampled=readTrace(profiler.state().lastSaved).traceEvents;
 assert(sampled.some(e=>e.name==='Profile'||e.name==='ProfileChunk'),'JS sampling is actually present');
 fs.writeFileSync(path.join(directory,'qa-report.json'),JSON.stringify({pass:true,trace,duration:metadata.elapsedSeconds,reason:metadata.reason,events:events.length,markers:samples,jsSampleEvents:sampled.filter(e=>e.name==='Profile'||e.name==='ProfileChunk').length,errors,limitations:'Hidden composited Windows window; native tracing with detached DevTools, not a manual Performance-panel recording. Original user crash not reproduced/certified fixed.'},null,2));
 console.log('PASS sustained trace + JS samples + export with full effects; '+metadata.elapsedSeconds.toFixed(1)+' seconds.');app.exit(0);
}).catch(error=>{console.error(error);app.exit(1);});
