'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function load(file,box){vm.runInNewContext(fs.readFileSync(file,'utf8'),box,{filename:file});}
const box={window:{NV:{}},Math,performance,Date,console};
load('js/core/presentationClock.js',box);
const NV=box.window.NV,c=NV.presentationClock;
assert.equal(c.resolveFrame(123),123,'standalone preview lost its explicit frame');
for(const hz of [30,60,120,144,165]){
  let time=0,remaining=1;
  for(let i=0;i<hz;i++){time+=1/hz;c.beginFrame(time,1/hz);remaining*=1-c.blend(.16);}
  assert(Math.abs(c.resolveFrame(999)-60)<1e-8,'visual clock follows number of frames');
  // The production dt cap is 30 ms; 30 Hz is outside this smoothing contract.
  if(hz>=60)assert(Math.abs(remaining-Math.pow(.84,60))<1e-8,'render smoothing depends on refresh');
}
c.beginFrame(2,0);assert.equal(c.blend(.34),0,'paused orientation keeps integrating');
assert.equal(c.resolveFrame(165*2),120);
load('js/engine/fx.js',box);
function particles(hz){
  const p={x:0,y:0,vx:220,vy:-90,life:2,fade:.5,size:3,spiral:1.1,color:'#abcdef',specialEnergy:true};
  const list=[p];for(let i=0;i<hz;i++)NV.updateParticles(1/hz,list);return p;
}
const at60=particles(60);
for(const hz of [30,120,144,165]){
  const p=particles(hz);
  for(const k of ['vx','vy','life','size'])assert(Math.abs(p[k]-at60[k])<1e-8,k+' changed with refresh');
  assert(Math.hypot(p.x-at60.x,p.y-at60.y)<3.5,'decorative orbit radius diverged');
  assert.equal(p.specialEnergy,true);assert.equal(p.color,'#abcdef');
}
const stopped=[{x:3,y:4,vx:20,vy:21,life:1,size:2,spiral:.4}];
const before=JSON.stringify(stopped);assert.equal(NV.updateParticles(0,stopped),stopped);assert.equal(JSON.stringify(stopped),before);
const reference=[{x:0,y:0,vx:100,vy:50,life:1,size:4,spiral:0}];NV.updateParticles(1/60,reference);
assert.equal(reference[0].x,100/60);assert.equal(reference[0].vx,96);
load('js/engine/performanceMonitor.js',box);
for(let i=0;i<60;i++){NV.performanceMonitor.record(i%3?1000/165:2000/165,.2,1.5);NV.performanceMonitor.recordCallback(2.4);}
const stats=NV.performanceMonitor.getSnapshot();
assert(Math.abs(1000/stats.frame.mean-123.75)<1e-3,'mean cadence unavailable');
assert(stats.frame.p50<7,'median control changed');assert.equal(stats.presentedFPS,null);
assert(Math.abs(stats.callback.mean-2.4)<1e-6);NV.performanceMonitor.reset();assert.equal(NV.performanceMonitor.getSnapshot().callback.mean,0);
const game=fs.readFileSync('js/game.js','utf8');
assert(game.includes('beginFrame(visualTimeSeconds, paused ? 0 : dt)'));
assert(game.includes('recordCallback(performance.now() - callbackStarted)'));
assert(game.includes('perf.frame.mean > 0 ? 1000 / perf.frame.mean'));
for(const file of ['player','enemies','spectralEnemies2D','bosses','canvas','sectors'])assert(fs.readFileSync('js/render/'+file+'.js','utf8').includes('presentationClock.resolveFrame'),'clock absent from '+file);
assert(!/setInterval|requestAnimationFrame|setTimeout/.test(fs.readFileSync('js/core/presentationClock.js','utf8')),'clock added another render scheduler');
console.log('PASS frame coherence: shared seconds, 60 Hz visual reference, paused smoothing/particles, refresh-independent decorative damping and honest full callback/cadence metrics');
