'use strict';
const fs=require('node:fs'),path=require('node:path');
const {pipeline}=require('node:stream/promises');
const {createGzip}=require('node:zlib');
const BASE_CATEGORIES=['toplevel','devtools.timeline','disabled-by-default-devtools.timeline','disabled-by-default-devtools.timeline.frame','v8.execute','blink.user_timing','cc','viz','gpu'];
function createProfiler({app,contentTracing,crashReporter},directory,{jsSamples=false,maxSeconds=120}={}){
  fs.mkdirSync(directory,{recursive:true});
  const logFile=path.join(directory,'events.jsonl');
  const log=(event,details={})=>{try{fs.appendFileSync(logFile,JSON.stringify({time:new Date().toISOString(),event,...details})+'\n');}catch(error){console.error('Profiler log:',error.message);}};
  // Called BEFORE ready. Never change rasterization, quality, sandbox or GPU.
  app.commandLine.appendSwitch('enable-logging','file');
  app.commandLine.appendSwitch('log-file',path.join(directory,'chromium.log'));
  crashReporter.start({uploadToServer:false});
  log('session',{versions:process.versions,jsSamples,maxSeconds,crashDumps:app.getPath('crashDumps')});
  let recording=false,busy=false,closed=false,timer=null,poll=null,sampleTimer=null,sampling=false,started=0,filename=null,metadata=null,markerCount=0;
  let window=null,onChange=()=>{},lastSaved=null;
  function state(){return {recording,busy,jsSamples,maxSeconds,lastSaved};}
  function changed(){onChange(state());}
  function clearTimers(){clearTimeout(timer);clearInterval(poll);clearInterval(sampleTimer);timer=poll=sampleTimer=null;}
  async function gpuDiagnostics(){
    // Query after tracing stops. Complete info identifies the active renderer;
    // GPU failure or a stalled diagnostic must never prevent the trace export.
    const result={gpu:null,gpuInfoType:'unavailable',gpuFeatures:null,gpuInfoErrors:[]};
    for(const [type,timeoutMs] of [['complete',2000],['basic',500]]){
      let timeout;
      try{
        result.gpu=await Promise.race([
          Promise.resolve().then(()=>app.getGPUInfo(type)),
          new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('GPU info timeout')),timeoutMs);}),
        ]);
        result.gpuInfoType=type;break;
      }catch(error){result.gpuInfoErrors.push({type,message:error.message});}
      finally{clearTimeout(timeout);}
    }
    try{result.gpuFeatures=app.getGPUFeatureStatus();}
    catch(error){result.gpuInfoErrors.push({type:'features',message:error.message});}
    for(const error of result.gpuInfoErrors)log('gpu-info-error',error);
    return result;
  }
  async function snapshot(){
    if(!window||window.isDestroyed()||window.webContents.isDestroyed())return null;
    try{return await window.webContents.executeJavaScript(`({settings:window.NV&&NV.settings,game:window.NV&&NV.getRuntimeSnapshot?NV.getRuntimeSnapshot():null,performance:window.NV&&NV.performanceMonitor?NV.performanceMonitor.getSnapshot():null,webgpu:window.NV&&NV.webgpuPresentation?NV.webgpuPresentation.diagnostics():null,visibility:document.visibilityState})`);}catch(error){return {error:error.message};}
  }
  async function sample(){
    if(sampling||!recording||busy||!metadata||metadata.samples.length>=301||!window||window.isDestroyed()||window.webContents.isDestroyed())return;
    sampling=true;const capture=metadata;
    try{
      // Opt-in profiler only: one bounded, lightweight read per second. Renderer
      // timestamps measure frames against elapsed time, not the export/flush.
      const value=await window.webContents.executeJavaScript(`({time:performance.now(),visibility:document.visibilityState,game:window.NV&&NV.getRuntimeSnapshot?(()=>{const s=NV.getRuntimeSnapshot();return {state:s.state,paused:s.paused,frame:s.frame,wave:s.wave,enemies:s.enemies};})():null,performance:window.NV&&NV.performanceMonitor?NV.performanceMonitor.getSnapshot():null})`);
      if(recording&&!busy&&metadata===capture)capture.samples.push(value);
    }catch(error){log('sample-error',{message:error.message});}
    finally{sampling=false;}
  }
  async function start(){
    if(recording||busy||closed)return false;
    busy=true;changed();
    try{
      const stamp=new Date().toISOString().replace(/[:.]/g,'-');
      const captureDirectory=fs.mkdtempSync(path.join(directory,'captura-'+stamp+'-'));
      filename=path.join(captureDirectory,'performance.trace.json');
      metadata={version:3,startedAt:new Date().toISOString(),versions:process.versions,jsSamples,maxSeconds,bufferMiB:128,sampleIntervalMs:1000,samples:[],initial:await snapshot()};
      const categories=BASE_CATEGORIES.concat(jsSamples?['disabled-by-default-v8.cpu_profiler']:[]);
      // Never overwrite the beginning of the timeline with a ring buffer.
      await contentTracing.startRecording({recording_mode:'record-until-full',trace_buffer_size_in_kb:128*1024,included_categories:categories,excluded_categories:['*']});
      started=Date.now();recording=true;markerCount=0;log('recording-start',{filename,jsSamples});
      sampleTimer=setInterval(()=>sample(),1000);
      timer=setTimeout(()=>stop('duration-limit').catch(error=>log('stop-error',{message:error.message})),maxSeconds*1000);
      let polling=false;
      poll=setInterval(async()=>{
        if(polling||!recording||busy)return;polling=true;
        try{const usage=await contentTracing.getTraceBufferUsage();if(usage.percentage>=.85)await stop('buffer-limit');}catch(error){log('buffer-check-error',{message:error.message});}finally{polling=false;}
      },2000);
      return true;
    }catch(error){log('start-error',{message:error.message});throw error;}
    finally{busy=false;changed();}
  }
  async function stop(reason='manual'){
    if(!recording||busy)return null;
    busy=true;clearTimers();changed();
    try{
      const stopRequestedAt=Date.now(),recordingSeconds=(stopRequestedAt-started)/1000;
      const trace=await contentTracing.stopRecording(filename);
      recording=false;
      const session={...metadata,reason,stopRequestedAt:new Date(stopRequestedAt).toISOString(),recordingSeconds,elapsedSeconds:recordingSeconds,traceBytes:fs.statSync(trace).size,final:await snapshot(),...await gpuDiagnostics()};
      // Streaming compression: no JSON.parse or second full trace in memory.
      let saved=trace;
      try{
        await pipeline(fs.createReadStream(trace),createGzip(),fs.createWriteStream(trace+'.gz',{flags:'wx'}));
        saved=trace+'.gz';
      }catch(error){
        log('compression-error',{message:error.message});
        // Preserve the complete raw capture if compression fails.
        if(fs.existsSync(trace+'.gz'))fs.unlinkSync(trace+'.gz');
        session.compressionError=error.message;
      }
      session.traceFile=path.basename(saved);
      session.exportBytes=fs.statSync(saved).size;
      session.exportSeconds=(Date.now()-stopRequestedAt)/1000;
      session.durationNote='recordingSeconds ends at the stop request; exportSeconds includes trace flush and compression. samples are periodic renderer snapshots, not physical presented-frame counts; performance percentiles use rolling windows.';
      fs.writeFileSync(path.join(path.dirname(trace),'session.json'),JSON.stringify(session,null,2),{flag:'wx'});
      // Only remove the new duplicate after both deliverables were written.
      if(saved!==trace)fs.unlinkSync(trace);
      lastSaved=saved;log('recording-saved',{trace:saved,reason,seconds:session.elapsedSeconds});return saved;
    }catch(error){recording=false;log('stop-error',{message:error.message});throw error;}
    finally{busy=false;changed();}
  }
  async function mark(){
    if(!recording||!window||markerCount>=64)return;
    const label='DSV1 marker '+(++markerCount);
    await window.webContents.executeJavaScript('performance.mark('+JSON.stringify(label)+')');log('marker',{label});
  }
  function setSamples(value){if(recording||busy)return false;jsSamples=!!value;changed();return true;}
  function setDuration(value){if(recording||busy||![60,120,300].includes(value))return false;maxSeconds=value;changed();return true;}
  const childGone=(_event,details)=>{log('child-process-gone',details);if(details.type==='GPU'&&recording)stop('gpu-process-gone').catch(()=>{});};
  app.on('child-process-gone',childGone);
  function attach(win,notify=()=>{}){
    window=win;onChange=notify;
    win.webContents.on('render-process-gone',(_event,details)=>{log('render-process-gone',details);if(recording)stop('render-process-gone').catch(()=>{});});
    win.webContents.on('devtools-opened',()=>log('devtools-opened'));
    win.webContents.on('devtools-closed',()=>log('devtools-closed'));
    win.on('close',event=>{
      if(!recording&&!busy)return;
      event.preventDefault();
      // Only the first close request waits for the in-flight operation.
      if(closed)return;closed=true;
      (async()=>{while(busy)await new Promise(resolve=>setTimeout(resolve,50));await stop('window-close');})()
        .catch(error=>log('close-error',{message:error.message})).finally(()=>win.close());
    });
    changed();
  }
  return {attach,start,stop,mark,state,setSamples,setDuration,log,directory};
}
module.exports={createProfiler};
