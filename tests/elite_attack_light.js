'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function load(calm=false){const NV={};vm.runInNewContext(fs.readFileSync('js/render/refinedElites.js','utf8'),{window:{NV,matchMedia:()=>({matches:calm})},Math,Map,WeakMap});return NV;}
for(const calm of [false,true]){
 const N=load(calm);
 for(const [visualId,key,timer,state,duration]of [
  ['elite_predator','predatorState','predatorStateTimer','execution_windup',.30],
  ['elite_phantom','phantomState','phantomStateTimer','entry_windup',.42],
  ['elite_titan','goliathState','goliathStateTimer','slam_windup',.35]]){
  const start=Object.freeze({visualId,[key]:state,[timer]:duration}),end=Object.freeze({...start,[timer]:0});
  assert(N.refinedEliteAttackIntensity(start)>0);assert(N.refinedEliteAttackIntensity(end)>.95);
  for(let i=0;i<=120;i++){const e=Object.freeze({...start,[timer]:duration*(1-i/120)}),before=JSON.stringify(e),v=N.refinedEliteAttackIntensity(e);assert(v>=0&&v<=1);assert.equal(JSON.stringify(e),before);}
  for(const phase of ['roam','roam_stalk','recovery','possessed','cleanup','execution','entry_commit'])assert.equal(N.refinedEliteAttackIntensity({...start,[key]:phase}),0);
  assert.equal(N.refinedEliteAttackIntensity({...end,dead:true}),0);
  assert.equal(N.refinedEliteAttackIntensity({...end,waveCleanup:true}),0);
  N.__refinedEliteAttackLighting=false;assert.equal(N.refinedEliteAttackIntensity(end),0);delete N.__refinedEliteAttackLighting;
 }
 assert(N.refinedEliteAttackIntensity({visualId:'elite_phantom',phantomState:'materialize',phantomStateTimer:0})>.3);
 assert.equal(N.refinedEliteAttackIntensity({visualId:'elite_titan',goliathState:'aftershock_window',goliathStateTimer:1.5}),0);
 assert(N.refinedEliteAttackIntensity({visualId:'elite_titan',goliathState:'aftershock_window',goliathStateTimer:0})>.6);
 // Config values, not wall-clock time, determine charge progress.
 N.ELITE_GOLIATH_SEISMIC={windup:1};assert(N.refinedEliteAttackIntensity({visualId:'elite_titan',goliathState:'slam_windup',goliathStateTimer:.9})<.3);
}
console.log('PASS elite attack light: real windups/config timings, no roaming signal, reduced-motion ramps, no gameplay mutation');
