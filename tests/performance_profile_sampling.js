'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm'),{EventEmitter}=require('node:events');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'dsv1-profile-sampling-'));
const intervals=new Set(),timeouts=new Set();let wallTime=10000,frame=0,pending=null,fail=false;
class Clock extends Date {static now(){return wallTime;}}
const moduleObject={exports:{}};
vm.runInNewContext(fs.readFileSync('desktop/performance-profile.cjs','utf8'),{
 require,module:moduleObject,process,console,Date:Clock,
 setInterval(fn,ms){const handle={fn,ms};intervals.add(handle);return handle;},clearInterval(h){intervals.delete(h);},
 setTimeout(fn,ms){const handle={fn,ms};timeouts.add(handle);return handle;},clearTimeout(h){timeouts.delete(h);}
});
const app=new EventEmitter();app.commandLine={appendSwitch(){}};app.getPath=()=>directory;app.getGPUInfo=async()=>({});app.getGPUFeatureStatus=()=>({});
const contentTracing={async startRecording(){},async stopRecording(file){wallTime+=2500;fs.writeFileSync(file,'{"traceEvents":[]}');return file;},async getTraceBufferUsage(){return {percentage:0};}};
const win=new EventEmitter();win.isDestroyed=()=>false;win.webContents=new EventEmitter();win.webContents.isDestroyed=()=>false;
win.webContents.executeJavaScript=async source=>{
 if(!source.includes('time:performance.now()'))return {settings:{graphics:{quality:'high',particles:true,heavyVfx:true}}};
 if(pending)return new Promise(resolve=>{pending.resolve=resolve;});
 if(fail)throw Error('simulated sample failure');
 return {time:wallTime,visibility:'visible',game:{state:'playing',paused:false,frame:frame+=165,wave:12,enemies:24},performance:{frame:{p95:6.1},draw:{p95:1.8},telemetry:{hostiles:24}}};
};
const read=file=>JSON.parse(fs.readFileSync(path.join(path.dirname(file),'session.json')));
(async()=>{
 const profiler=moduleObject.exports.createProfiler({app,contentTracing,crashReporter:{start(){}}},directory);
 profiler.attach(win);await profiler.start();const tick=[...intervals].find(h=>h.ms===1000).fn;
 wallTime+=1000;await tick();wallTime+=1000;await tick();
 fail=true;await tick();fail=false;
 for(let i=0;i<320;i++)await tick();
 const file=await profiler.stop(),session=read(file);
 assert.equal(session.samples.length,301,'periodic telemetry is strictly bounded');
 assert.equal(session.samples[0].game.frame,165);assert.equal(session.samples[1].game.frame,330);
 assert.equal(session.recordingSeconds,2);assert.equal(session.elapsedSeconds,2);assert.equal(session.exportSeconds,2.5,'flush is not mislabeled as gameplay time');
 assert.equal(intervals.size,0);assert.equal(timeouts.size,0);
 assert(fs.readFileSync(path.join(directory,'events.jsonl'),'utf8').includes('sample-error'));
 // A renderer response arriving after stop must not contaminate the next capture.
 await profiler.start();pending={};const lateTick=[...intervals].find(h=>h.ms===1000).fn,late=lateTick();
 const first=await profiler.stop();await profiler.start();pending.resolve({time:123,game:{frame:999}});await late;pending=null;
 await [...intervals].find(h=>h.ms===1000).fn();const second=await profiler.stop();
 assert.equal(read(first).samples.length,0);assert.equal(read(second).samples.length,1);assert.notEqual(read(second).samples[0].game.frame,999);
 assert.deepEqual(fs.readdirSync(path.dirname(second)).sort(),['performance.trace.json.gz','session.json']);
 console.log('PASS bounded profile timeline, exact duration vs export, sample failure recovery and async capture isolation.');
})().catch(error=>{console.error(error);process.exitCode=1;});
