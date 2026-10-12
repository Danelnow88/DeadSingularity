'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const motion=require('../js/engine/audioPerimeterMotion.js');
const active={enabled:true,active:true,state:'listening',energy:.55,energyRaw:.4,
  bass:.45,mids:.3,highs:.2,density:4,tempoBpm:120,kick:0,snare:0,onset:0,
  accent:1,lastOnsetAt:0};
function run(s,r,seconds,fps=120){for(let i=0;i<Math.round(seconds*fps);i++)motion.update(s,r,1/fps);return s;}
function song(fps,seconds,dense=false){
  const s=motion.create(),r={...active,density:dense?12:4,energy:dense?.95:.55};
  let peak=0;
  for(let i=0;i<seconds*fps;i++){
    const t=(i+1)/fps,spacing=dense?.10:.5,hit=Math.floor(t/spacing+1e-8);
    const age=t-hit*spacing;
    r.lastOnsetAt=hit*spacing;
    r.kick=Math.exp(-age/.055);r.onset=r.kick;r.kickEvt=.95;
    motion.update(s,r,1/fps);peak=Math.max(peak,s.drive);
  }
  return {s,peak};
}

const fresh=motion.create();assert.equal(fresh.mode,'silence');
assert.equal(motion.update(fresh,null,1/60),fresh,'updates must return the reused state');
const soft=run(motion.create(),{...active,energy:.12,bass:.1,density:0},2);
assert.equal(soft.mode,'soft');assert(soft.drive>0&&soft.drive<.1);
assert.equal(soft.strikes,0,'sustained energy manufactured percussion');
const rhythm=song(120,5);
assert.equal(rhythm.s.mode,'rhythm');assert(rhythm.peak>.6,'percussion lacks visible travel');
assert(rhythm.s.strikes>=8&&rhythm.s.strikes<=11,'regular hits replayed or lost');
const stable=run(motion.create(),{...active,density:4},2);
assert.equal(stable.mode,'rhythm');
for(let i=0;i<120;i++)motion.update(stable,{...active,density:i%2?0:4},1/60);
assert.equal(stable.mode,'rhythm','short excursions caused mode flicker');
const breakdown=run(motion.create(),{...active,density:1,kick:.8},2);
assert.equal(breakdown.mode,'breakdown');assert.equal(breakdown.strikes,1,'held kick retriggers endlessly');
const dense=song(120,5,true);
assert.equal(dense.s.mode,'saturation');assert(dense.s.strikes<20,'dense music stacks too many events');
assert(dense.peak<=1&&dense.peak>.65);

const frozen={...active,lastOnsetAt:1,kick:.9,kickEvt:1};
const unique=run(motion.create(),frozen,3);
assert.equal(unique.strikes,1,'same analyser values replayed on every render');
const originalStrikes=dense.s.strikes;
const silent={...active,energy:.4,energyRaw:0,bass:0,mids:0,highs:0,
  density:12,kick:0,onset:0,beat:0,tempoBpm:180,lastOnsetAt:5};
run(dense.s,silent,3);
assert.equal(dense.s.mode,'silence');assert.equal(dense.s.drive,0);
assert.equal(dense.s.strikes,originalStrikes,'estimated tempo kept attacking during silence');
const disconnected=song(120,1).s;
run(disconnected,{...active,active:false,kick:1,lastOnsetAt:99},3);
assert.equal(disconnected.connected,false);assert.equal(disconnected.mode,'silence');
assert.equal(disconnected.drive,0);assert.equal(disconnected.sway,0);

const a=song(30,6).s,b=song(144,6).s;
assert.equal(a.strikes,b.strikes,'hit count depends on display refresh');
for(const key of ['energy','bass','mids','highs','tempoBpm'])
  assert(Math.abs(a[key]-b[key])<.003,key+' smoothing depends on refresh');
assert(Math.abs(a.drive-b.drive)<.06,'stroke drift across refresh rates');
const limited=motion.create(),normal=motion.create();
motion.update(limited,{...active,kick:1},30);motion.update(normal,{...active,kick:1},.1);
assert.deepEqual(limited,normal,'long suspended frame did unbounded catchup');
for(const dt of [NaN,Infinity,-1,undefined])motion.update(limited,{...active,energy:NaN,
  bass:Infinity,mids:-9,highs:NaN,kick:NaN,density:Infinity,tempoBpm:NaN,lastOnsetAt:NaN},dt);
for(const dt of [.1,.016,.1])motion.update(limited,{...active,energy:NaN,
  bass:Infinity,mids:-9,highs:NaN,kick:NaN,density:Infinity,tempoBpm:NaN,lastOnsetAt:NaN},dt);
for(const [key,value] of Object.entries(limited))if(typeof value==='number')assert(Number.isFinite(value),key+' is not finite');
for(const r of [{...active,energy:9,density:1e6,kick:9,snare:9,onset:9},silent]){
  const stress=motion.create();
  for(let i=0;i<4000;i++){
    motion.update(stress,{...r,lastOnsetAt:i/60},1/60);
    for(const key of ['drive','strike','pulse','energy','bass','mids','highs'])
      assert(stress[key]>=0&&stress[key]<=1,key+' exceeds motion bounds');
    assert(Math.abs(stress.sway)<=1);
    assert(stress.stroke>=-.24&&stress.stroke<=1,'elastic excursion exceeds its hard limit');
  }
}
const sandbox={window:{NV:{}}};
vm.runInNewContext(fs.readFileSync(require.resolve('../js/engine/audioPerimeterMotion.js'),'utf8'),sandbox);
assert.equal(typeof sandbox.window.NV.AudioPerimeterMotion.create,'function','browser namespace missing');
console.log('PASS audio_perimeter_motion: five states, bounded elastic travel, dense accent selection, real silence/disconnect stop, reusable UMD state and refresh-independent smoothing');
