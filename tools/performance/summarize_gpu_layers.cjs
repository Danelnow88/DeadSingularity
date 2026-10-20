'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'../..');
const stats=a=>{if(!a.length)return null;a.sort((a,b)=>a-b);const q=p=>a[Math.floor((a.length-1)*p)];return {count:a.length,mean:a.reduce((s,x)=>s+x,0)/a.length,p50:q(.5),p95:q(.95),p99:q(.99),max:a.at(-1)};};
function analyze(file){
 const bytes=fs.readFileSync(file),events=JSON.parse(file.endsWith('.gz')?zlib.gunzipSync(bytes):bytes).traceEvents;
 const gpu=events.find(e=>e.name==='process_name'&&/GPU/.test(e.args?.name));
 const gpuThread=events.find(e=>e.name==='thread_name'&&e.args?.name==='CrGpuMain');
 const renderer=events.find(e=>e.name==='thread_name'&&e.args?.name==='CrRendererMain');
 const xs=events.filter(e=>e.ph==='X'&&e.dur>0);
 const names=['GPUTask','RasterDecoderImpl::DoRasterCHROMIUM','RasterDecoderImpl::DoEndRasterCHROMIUM::Flush','Display::DrawAndSwap','DisplayScheduler::DrawAndSwap','DXGISwapChainImageBacking::Present'];
 const timing={};for(const name of names)timing[name]=stats(xs.filter(e=>e.name===name&&(!gpu||e.pid===gpu.pid)).map(e=>e.dur/1000));
 timing.rafCPU=stats(xs.filter(e=>e.name==='FireAnimationFrame'&&e.tid===renderer?.tid).map(e=>e.dur/1000));
 const tasks=xs.filter(e=>e.name==='GPUTask'&&e.tid===gpuThread?.tid).sort((a,b)=>a.ts-b.ts);
 let total=0,end=-Infinity;for(const e of tasks){total+=Math.max(0,e.ts+e.dur-Math.max(end,e.ts));end=Math.max(end,e.ts+e.dur);}
 const presentations=events.filter(e=>e.name==='AnimationFrame::Presentation'&&e.pid===renderer?.pid).map(e=>e.ts).sort((a,b)=>a-b);
 const intervals=[];for(let i=1;i<presentations.length;i++)if(presentations[i]>presentations[i-1])intervals.push((presentations[i]-presentations[i-1])/1000);
 const beginFrames=events.filter(e=>e.name==='DisplayScheduler::BeginFrame'&&e.args?.args?.frame_time_us).map(e=>e.args.args).sort((a,b)=>a.frame_time_us-b.frame_time_us);
 const beginGaps=[];for(let i=1;i<beginFrames.length;i++){const gap=beginFrames[i].frame_time_us-beginFrames[i-1].frame_time_us;if(gap>0)beginGaps.push(gap/1000);}
 const vsync={announcedMs:stats(beginFrames.map(e=>e.interval_us/1000).filter(Number.isFinite)),actualBeginFrameMs:stats(beginGaps),sleepFallbackMs:stats(xs.filter(e=>e.name==='WaitForVSync Sleep').map(e=>e.dur/1000))};
 return {gpuProcess:gpu?.pid,timing,vsync,presentationMs:stats(intervals),gpuTaskBusyPercent:tasks.length?100*total/(end-tasks[0].ts):null,
  gpuProcessTaskMsPerPresentation:tasks.length&&presentations.length?total/1000/presentations.length:null,
  note:'GPU-process trace durations include submission and waits, not hardware shader timers. Categories overlap; do not add them. Frame timing sampled separately without tracing.'};
}
const filename=process.argv[2];if(!filename)throw Error('Usage: summarize_gpu_layers.cjs report.json | trace.json.gz');
const input=path.resolve(filename);
const report=input.endsWith('.gz')?analyze(input):JSON.parse(fs.readFileSync(input,'utf8'));
if(report.reports)for(const row of report.reports){row.traceStats=analyze(path.resolve(root,row.trace));console.log(JSON.stringify({case:row.omission,fps:row.timing.fps,p95:row.timing.frameMs.p95,p99:row.timing.frameMs.p99,gpuMs:row.traceStats.gpuProcessTaskMsPerPresentation,raster:row.traceStats.timing['RasterDecoderImpl::DoRasterCHROMIUM']}));}
else console.log(JSON.stringify(report,null,2));
if(process.argv[3])fs.writeFileSync(path.resolve(process.argv[3]),JSON.stringify(report,null,2));
