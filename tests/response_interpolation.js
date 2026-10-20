'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const box={window:{NV:{settings:{graphics:{spaceResponse:true},gameplay:{reducedEffects:false}}}},Math,performance,console};
vm.runInNewContext(fs.readFileSync('js/render/spaceResponse.js','utf8'),box);
const r=box.window.NV.spaceResponse,p={x:350,y:390,radius:18};
const o={enabled:true,id:'threshold',time:0,W:1350,H:780,player:p,enemies:[],bullets:[]};
r.update(o);const frame=r.getGpuFrame(),pixels=frame.pixels;
for(let i=1;i<=45;i++){o.time=i/165;p.x+=260/165;r.update(o);}
assert(r.diagnostics().energy>0);
let found=false;
for(let i=0;i<30;i++){
  const before=r.diagnostics(),sample=r.sample(p.x,p.y),rev=r.getGpuFrame().revision;
  o.time+=.001;r.update(o);
  const after=r.diagnostics(),next=r.sample(p.x,p.y);
  if(after.steps===before.steps&&Math.hypot(next.x-sample.x,next.y-sample.y)>1e-6){
    assert(r.getGpuFrame().revision>rev,'interpolated presentation never reaches GPU');found=true;break;
  }
}
assert(found,'render repeats fixed-120 states between spring steps');
assert.equal(r.getGpuFrame().pixels,pixels,'interpolation reallocates the GPU field');
assert.equal(r.diagnostics().interpolationBytes,33*19*4*4);
const before=JSON.stringify([r.sample(p.x,p.y),r.diagnostics().steps,r.getGpuFrame().revision]);
o.paused=true;o.time+=1;r.update(o);assert.equal(JSON.stringify([r.sample(p.x,p.y),r.diagnostics().steps,r.getGpuFrame().revision]),before);
o.paused=false;box.window.NV.settings.graphics.spaceResponse=false;r.update(o);
assert.equal(r.sample(p.x,p.y).x,0);assert.equal(r.getGpuFrame().gain,0);
console.log('PASS spring presentation: 120 Hz integration with continuous intermediate samples, shared CPU/GPU field, bounded persistent interpolation buffers and pause/OFF');
