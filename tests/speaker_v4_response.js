'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const motion=require('../js/engine/audioPerimeterMotion.js');
const playing={enabled:true,active:true,state:'listening',energy:.6,energyRaw:.4,bass:.5,mids:.35,highs:.25,density:4,tempoBpm:120,
  kick:0,onset:0,hats:0,accent:1,kickId:0,snareId:0,onsetId:0,hatId:0,lastOnsetAt:0};
for(const hz of [.5,1,2,4,8,12]){
  const s=motion.create(),r={...playing,density:hz>6?12:4};let last=-1;
  for(let frame=0;frame<6*144;frame++){
    const t=frame/144,event=Math.floor(t*hz);
    if(event!==last){r.onsetId++;r.hatId++;r.lastOnsetAt=t;r.kick=1;r.onset=1;r.hats=1;last=event;}
    else{r.kick*=.8;r.onset*=.8;r.hats*=.8;}
    motion.update(s,r,1/144);
  }
  assert(s.microHits>=Math.floor(6*hz)-2,'lost fast/slow events at '+hz+'Hz');
  assert(s.microHits<=Math.ceil(6*hz)+1,'replayed a transient at '+hz+'Hz');
  if(hz>=8)assert(s.microHits>s.strikes*2,'dense micro-accent layer collapsed into slow strokes');
}
// FFT is consumed from the already-published buffer once per revision only.
let reads=0;const bins=new Proxy(new Uint8Array(256).fill(140),{get(t,p){if(p==='length')return t.length;if(/^\d+$/.test(String(p)))reads++;return t[p];}});
const s=motion.create(),r={...playing,data:bins,analysisRevision:1};motion.update(s,r,1/60);
const sampled=reads;assert(sampled<=300);motion.update(s,r,1/144);assert.equal(reads,sampled);
r.analysisRevision++;motion.update(s,r,1/60);assert(reads>sampled&&reads<=sampled+300);
const sameSpectrum=s.spectrum,samePeaks=s.peaks;
for(let i=0;i<100;i++)motion.update(s,r,1/144);
assert.equal(s.spectrum,sameSpectrum);assert.equal(s.peaks,samePeaks);
for(const value of s.spectrum)assert(value>=0&&value<=1);
const peak=Math.max(...s.peaks);assert(peak>0);
for(let i=0;i<480;i++)motion.update(s,{...r,energyRaw:0,bass:0,mids:0,highs:0,kick:0,onset:0,hats:0},1/120);
assert.equal(s.mode,'silence');assert.equal(s.microPulse,0);assert(Math.max(...s.spectrum)<.001);assert.equal(Math.max(...s.peaks),0);
const box={window:{NV:{}},console,localStorage:{getItem(){return null;},setItem(){}},Uint8Array,Promise};
vm.runInNewContext(fs.readFileSync('js/engine/rhythm.js','utf8'),box);
const NV=box.window.NV,raw=new Uint8Array(256);let kicks=0,hats=0;
for(let i=0;i<240;i++){
  raw.fill(0);if(i%12===0)raw.fill(230,0,15);if(i%5===0)raw.fill(230,160);
  NV.rhythmAnalyze(NV.rhythm,raw,(i+1)/60);kicks=NV.rhythm.kickId;hats=NV.rhythm.hatId;
}
assert.equal(NV.rhythm.analysisRevision,240);assert(kicks>5&&hats>15,'analysis did not publish fast percussion events');
const src=fs.readFileSync('js/render/audioPerimeter.js','utf8');
assert(!src.includes('requestAnimationFrame'));assert(!src.includes('getByteFrequencyData'));assert(!src.includes('shadowBlur'));
console.log('PASS speaker V4: .5–12Hz transients, independent fast accents, cached/shared FFT spectrum, stable buffers, silence and existing analysis serials');
