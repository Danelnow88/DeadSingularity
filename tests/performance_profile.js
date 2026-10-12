'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{EventEmitter}=require('node:events');
const {createProfiler}=require('../desktop/performance-profile.cjs');
const {gunzipSync}=require('node:zlib');
// Regression: Windows STARTUPINFO must not hide the interactive profiler shell.
const launcher=fs.readFileSync('tools/open-desktop.cjs','utf8'),vm=require('node:vm');
for(const profiling of [false,true]){
 let launch,unref=false;
 const child={on(){},unref(){unref=true;}};
 vm.runInNewContext(launcher,{require(name){name=name.replace(/^node:/,'');if(name==='fs')return {existsSync(){return true;}};if(name==='path')return path;if(name==='child_process')return {spawn(exe,args,options){launch={exe,args,options};return child;}};throw Error(name);},__dirname:path.resolve('tools'),console,process:{argv:['node','tools/open-desktop.cjs',...(profiling?['--profile-performance']:[])],env:{ELECTRON_RUN_AS_NODE:'1',TEST_SETTING:'preserved'}}});
 assert.equal(launch.options.windowsHide,!profiling);assert.equal(launch.options.env.ELECTRON_RUN_AS_NODE,undefined);
 assert.equal(launch.options.env.TEST_SETTING,'preserved');assert(unref);
}
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'dsv1-profile-unit-'));
const historical=path.join(directory,'old.trace.json');fs.writeFileSync(historical,'keep original');
const app=new EventEmitter(),switches=[];app.commandLine={appendSwitch(...args){switches.push(args);}};
app.getPath=()=>directory;app.getGPUInfo=async()=>({});app.getGPUFeatureStatus=()=>({gpu_compositing:'enabled'});
let config,uploads,saves=0;
const contentTracing={async startRecording(options){config=options;},async getTraceBufferUsage(){return {percentage:0};},async stopRecording(file){fs.writeFileSync(file,JSON.stringify({traceEvents:[{name:'frame',ts:1}]}));saves++;return file;}};
const win=new EventEmitter();win.isDestroyed=()=>false;win.webContents=new EventEmitter();win.webContents.isDestroyed=()=>false;win.webContents.executeJavaScript=async()=>({settings:{graphics:{quality:'high',particles:true,heavyVfx:true}}});
(async()=>{
 const profiler=createProfiler({app,contentTracing,crashReporter:{start(options){uploads=options.uploadToServer;}}},directory);
 assert.equal(uploads,false);assert.deepEqual(switches.map(s=>s[0]),['enable-logging','log-file']);
 profiler.attach(win);assert(await profiler.start());assert.equal(await profiler.start(),false);
 assert.equal(config.recording_mode,'record-until-full');assert.equal(config.trace_buffer_size_in_kb,131072);
 assert(!config.included_categories.some(s=>s.includes('cpu_profiler')));assert(!config.included_categories.some(s=>s.includes('screenshot')));
 assert.equal(profiler.setSamples(true),false);await profiler.mark();
 const file=await profiler.stop();assert(file.endsWith('.trace.json.gz'));assert(fs.existsSync(file));assert.equal(saves,1);assert.equal(await profiler.stop(),null);
 assert.deepEqual(fs.readdirSync(path.dirname(file)).sort(),['performance.trace.json.gz','session.json']);
 assert.deepEqual(JSON.parse(gunzipSync(fs.readFileSync(file))),{traceEvents:[{name:'frame',ts:1}]});
 assert.equal(fs.readFileSync(historical,'utf8'),'keep original');
 const metadata=JSON.parse(fs.readFileSync(path.join(path.dirname(file),'session.json'),'utf8'));
 assert.equal(metadata.traceFile,path.basename(file));assert.equal(metadata.exportBytes,fs.statSync(file).size);
 assert.equal(metadata.initial.settings.graphics.quality,'high');assert.equal(metadata.reason,'manual');
 assert.equal(metadata.version,3);assert.equal(metadata.sampleIntervalMs,1000);assert(Array.isArray(metadata.samples));
 assert.equal(metadata.elapsedSeconds,metadata.recordingSeconds);assert(metadata.recordingSeconds>=0);assert(metadata.exportSeconds>=0);
 assert(profiler.setSamples(true));assert(profiler.setDuration(300));assert(!profiler.setDuration(Infinity));
 await new Promise(resolve=>setTimeout(resolve,2));await profiler.start();assert(config.included_categories.includes('disabled-by-default-v8.cpu_profiler'));
 app.emit('child-process-gone',{}, {type:'GPU',reason:'crashed',exitCode:-1073741819});
 while(profiler.state().busy)await new Promise(resolve=>setTimeout(resolve,10));
 assert.equal(profiler.state().recording,false);assert.equal(saves,2);
 assert.notEqual(path.dirname(profiler.state().lastSaved),path.dirname(file));
 assert(fs.readFileSync(path.join(directory,'events.jsonl'),'utf8').includes('child-process-gone'));
 // Export remains usable when gzip fails; never discard the raw timeline.
 const fallbackModule={exports:{}};
 vm.runInNewContext(fs.readFileSync('desktop/performance-profile.cjs','utf8'),{require(name){return name==='node:zlib'?{createGzip(){throw Error('simulated gzip failure');}}:require(name);},module:fallbackModule,process,console,setTimeout,clearTimeout,setInterval,clearInterval});
 const fallback=fallbackModule.exports.createProfiler({app,contentTracing,crashReporter:{start(){}}},directory);
 fallback.attach(win);await fallback.start();const raw=await fallback.stop();
 assert(raw.endsWith('.trace.json'));assert(fs.existsSync(raw));
 assert.deepEqual(fs.readdirSync(path.dirname(raw)).sort(),['performance.trace.json','session.json']);
 assert.equal(JSON.parse(fs.readFileSync(path.join(path.dirname(raw),'session.json'))).compressionError,'simulated gzip failure');
 console.log('PASS profiling: opt-in diagnostics, bounded export, gzip, settings retained, samples and GPU crash recovery.');
})().catch(error=>{console.error(error);process.exitCode=1;});
