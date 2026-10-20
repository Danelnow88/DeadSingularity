'use strict';
// Offline Chromium trace analysis. Never imported by the game. Durations are
// inclusive per category (not additive GPU totals); presented != optical scanout.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const filename=process.argv[2];
if(!filename)throw Error('Usage: node tools/performance/analyze_refresh_trace.cjs trace.json[.gz] [output.json]');
const data=fs.readFileSync(filename),decoded=filename.endsWith('.gz')?zlib.gunzipSync(data,{maxOutputLength:256*1024*1024}):data;
const events=JSON.parse(decoded).traceEvents;
const pidCounts=new Map();
for(const e of events)if(e.name==='FireAnimationFrame')pidCounts.set(e.pid,(pidCounts.get(e.pid)||0)+1);
const rendererPID=[...pidCounts].sort((a,b)=>b[1]-a[1])[0]?.[0];
const stats=a=>{
  if(!a.length)return null;a.sort((x,y)=>x-y);
  return {count:a.length,mean:a.reduce((s,x)=>s+x,0)/a.length,p50:a[Math.floor((a.length-1)*.5)],p95:a[Math.floor((a.length-1)*.95)],p99:a[Math.floor((a.length-1)*.99)],worst:a.at(-1)};
};
const durationNames=['FireAnimationFrame','ProxyMain::BeginMainFrame','RasterDecoderImpl::DoRasterCHROMIUM','RasterDecoderImpl::DoEndRasterCHROMIUM::Flush','DisplayScheduler::DrawAndSwap','DXGISwapChainImageBacking::Present'];
const durations=Object.fromEntries(durationNames.map(name=>[name,stats(events.filter(e=>e.name===name&&e.ph==='X'&&e.dur).map(e=>e.dur/1000))]));
const states={},sequences=new Set();
for(const e of events){
  const r=e.args&&e.args.frame_reporter;
  if(e.name==='PipelineReporter'&&e.pid===rendererPID&&r){
    const kind=r.frame_type||'MAIN';const key=kind+':'+r.state;states[key]=(states[key]||0)+1;
    if(kind==='MAIN')sequences.add(r.frame_sequence);
  }
}
const shown=events.filter(e=>e.name==='AnimationFrame::Presentation'&&e.pid===rendererPID).map(e=>e.ts).sort((a,b)=>a-b);
const intervals=[];for(let i=1;i<shown.length;i++)if(shown[i]>shown[i-1])intervals.push((shown[i]-shown[i-1])/1000);
const report={trace:path.resolve(filename),rendererPID,events:events.length,states,mainSequences:sequences.size,
  presentationEvents:shown.length,presentedCadenceFPS:shown.length>1?(shown.length-1)*1e6/(shown.at(-1)-shown[0]):null,
  presentationIntervalMs:stats(intervals),durations,
  limitations:'Chromium presentation feedback, not physical monitor scanout. Trace overhead changes performance. Inclusive duration families overlap; do not sum them. Forked partial reporters are not independent game frames.'};
if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
