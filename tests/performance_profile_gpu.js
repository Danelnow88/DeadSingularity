'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm'),{EventEmitter}=require('node:events');
const {gunzipSync}=require('node:zlib');
const moduleObject={exports:{}};
// Only diagnostic deadlines are accelerated; capture timers remain real.
vm.runInNewContext(fs.readFileSync('desktop/performance-profile.cjs','utf8'),{
 require,module:moduleObject,process,console,setInterval,clearInterval,clearTimeout,
 setTimeout(fn,ms){return setTimeout(fn,ms===2000||ms===500?5:ms);},
});
(async()=>{
 for(const mode of ['complete','fallback','unavailable','timeout']){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'dsv1-profile-gpu-'));
  const app=new EventEmitter(),requests=[];let resolveLate;
  app.commandLine={appendSwitch(){}};app.getPath=()=>directory;
  app.getGPUInfo=async type=>{
   requests.push(type);
   if(mode==='timeout')return new Promise(resolve=>{resolveLate=resolve;});
   if(mode==='unavailable'||mode==='fallback'&&type==='complete')throw Error('GPU process unavailable');
   return {gpuDevice:[{active:true}],auxAttributes:{glRenderer:'test renderer'}};
  };
  app.getGPUFeatureStatus=()=>{if(mode==='unavailable')throw Error('Features unavailable');return {gpu_compositing:'enabled'};};
  const contentTracing={async startRecording(){},async stopRecording(file){fs.writeFileSync(file,'{"traceEvents":[{"name":"preserved frame"}]}');return file;}};
  const profiler=moduleObject.exports.createProfiler({app,contentTracing,crashReporter:{start(){}}},directory);
  await profiler.start();const file=await profiler.stop('gpu-process-gone');
  assert.equal(profiler.state().busy,false);assert.equal(profiler.state().recording,false);
  assert.deepEqual(fs.readdirSync(path.dirname(file)).sort(),['performance.trace.json.gz','session.json']);
  assert.equal(JSON.parse(gunzipSync(fs.readFileSync(file))).traceEvents[0].name,'preserved frame');
  const sessionFile=path.join(path.dirname(file),'session.json'),text=fs.readFileSync(sessionFile,'utf8'),session=JSON.parse(text);
  assert.equal(session.gpuInfoType,mode==='complete'?'complete':mode==='fallback'?'basic':'unavailable');
  assert.equal(session.gpuInfoErrors.length,mode==='complete'?0:mode==='fallback'?1:mode==='unavailable'?3:2);
  assert.deepEqual(requests,mode==='complete'?['complete']:['complete','basic']);
  if(mode==='timeout'){
   assert.equal(session.gpu,null);resolveLate({gpuDevice:[{active:true}]});await Promise.resolve();
   assert.equal(fs.readFileSync(sessionFile,'utf8'),text,'late diagnostics must not mutate a saved capture');
  }
 }
 console.log('PASS profiler export survives GPU rejection, missing features and stalled queries; complete renderer info preferred.');
})().catch(error=>{console.error(error);process.exitCode=1;});
