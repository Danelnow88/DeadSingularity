'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Motion=require('../js/engine/audioPerimeterMotion.js');
function source(){
  const r={enabled:true,active:true,state:'listening',energy:.8,energyRaw:.6,bass:.6,mids:.6,highs:.4,
    data:new Uint8Array(256),analysisRevision:0,audioCtx:{sampleRate:48000},amplitude:.7};
  r.analyser={fftSize:512,getFloatTimeDomainData(dst){for(let i=0;i<dst.length;i++)dst[i]=Math.sin(i*Math.PI/16)*r.amplitude;}};
  return r;
}
function run(kind){
  const r=source(),s=Motion.create();let max=0,min=1,mean=0,maximumLevelFrames=0,count=0;
  for(let frame=0;frame<600;frame++){
    const t=(frame+1)/60,hz=kind==='dense'?8:2,age=t-Math.floor(t*hz)/hz,
      kick=Math.exp(-age/.028),snare=Math.exp(-(t-Math.floor(t*4)/4)/.024);
    for(let bin=0;bin<256;bin++)r.data[bin]=kind==='pad'?165:kind==='hats'?(bin<53?165:40+Math.exp(-(t-Math.floor(t*12)/12)/.018)*170):
      Math.round(bin<3?50+kick*160:bin<53?135+(kind==='dense'?snare*95:0):65);
    r.analysisRevision++;Motion.update(s,r,1/60);
    assert(s.percussion>=0&&s.percussion<=1);assert(s.percussionStroke>=-.18&&s.percussionStroke<=1);
    if(frame>180){max=Math.max(max,s.visualIntensity);min=Math.min(min,s.visualIntensity);mean+=s.visualIntensity;count++;if(s.visualIntensity>.55)maximumLevelFrames++;}
  }
  return {s,max,min,mean:mean/count,maximumFraction:maximumLevelFrames/count};
}
// Same loudness: a loud sustained wall MUST NOT impersonate a drummer.
const pad=run('pad'),hats=run('hats'),kick=run('kick'),dense=run('dense');
assert(pad.max<.16,'constant loud music pins the visualizer at maximum');
assert(hats.max<.2,'hi-hats inflate the main area rather than secondary detail');
assert(kick.max-kick.min>.25,'percussion cannot expand/contract visibly');
assert(dense.max-dense.min>.18,'rapid music stays stuck at one size');
assert(dense.maximumFraction<.9,'highest state never releases');
assert(kick.mean>pad.mean+.03,'equal-volume percussion is not distinguished from sustain');
assert(kick.s.percussionId>12&&dense.s.percussionId>40,'missed the main percussion stream');
// All four real painters must use the shared area channel, not overall volume.
const g={globalAlpha:1,globalCompositeOperation:'source-over'};
for(const k of ['beginPath','closePath','clearRect','fillRect','strokeRect','moveTo','lineTo','rect','arc','stroke','fill','save','restore','scale','translate','rotate'])g[k]=(...args)=>{
  for(const value of args)if(typeof value==='number')assert(Number.isFinite(value),'invalid '+k);
};
const box={window:{NV:{}},Float32Array};vm.runInNewContext(fs.readFileSync('js/render/audioVisualizerStyles.js','utf8'),box);
const styles=box.window.NV.AudioVisualizerStyles;
const idle=Motion.create();Object.assign(idle,{musicLevel:1,sustain:.8,body:.7,brightness:.4,visualIntensity:.1});
for(const style of styles.styles){
  styles.reset();styles.draw(style.id,g,{},idle,'full');const quiet=styles.snapshot();
  const attack={...idle,_time:1/60,percussion:.85,percussionStroke:.85,percussionId:1,visualIntensity:.8,kickPulse:.8,_percussionAge:.034};
  styles.draw(style.id,g,{},attack,'full');const peak=styles.snapshot();
  assert(peak.areaScaleY>quiet.areaScaleY*2.3,style.id+' size variation is imperceptible');
  assert(peak.visualLevel===3&&quiet.visualLevel===1,style.id+' did not change states');
  const rest={...idle,_time:2/60,visualIntensity:.05};styles.draw(style.id,g,{},rest,'full');
  assert(styles.snapshot().areaScaleY<peak.areaScaleY*.55,style.id+' stayed expanded');
}
const silence={...source(),enabled:false};
for(let i=0;i<1000;i++)Motion.update(dense.s,silence,1/120);
assert.equal(dense.s.percussion,0);assert.equal(dense.s.percussionStroke,0);assert.equal(dense.s.visualIntensity,0);
console.log('PASS percussion area: equal-volume sustain vs drums, hats secondary, fast release, four painters >2.3x height contrast, real state changes and silence');
