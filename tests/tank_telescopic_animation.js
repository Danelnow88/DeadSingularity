'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const NV={ENEMY_ROLE_REWORK:{tank:{windup:.9,recovery:1.05}}};
vm.runInNewContext(fs.readFileSync('js/render/tankArticulation.js','utf8'),{window:{NV},Math,Number});
const pose=NV.tankArticulationPose;
assert.equal(pose({tankCannonState:'approach'}).extension,0);
assert.equal(pose({}).extension,0);
assert.equal(pose({tankCannonState:'windup',tankCannonTimer:.9}).extension,0);
assert(pose({tankCannonState:'windup',tankCannonTimer:.60}).extension > .4 && pose({tankCannonState:'windup',tankCannonTimer:.60}).extension < .6);
assert.equal(pose({tankCannonState:'windup',tankCannonTimer:.30}).extension,1);
assert.equal(pose({tankCannonState:'recovery',tankCannonTimer:.1}).extension,0);
for(const state of ['windup','recovery']){
 const duration=state==='windup'?.9:1.05;let previous=state==='windup'?0:1;
 for(let i=0;i<=120;i++){
  const e=Object.freeze({enemyTypeId:'tank',tankCannonState:state,tankCannonTimer:duration*(1-i/120)}),before=JSON.stringify(e);
  const p=pose(e);assert(p.extension>=0&&p.extension<=1);assert(p.recoil>=0&&p.recoil<=.1);
  assert(state==='windup'?p.extension>=previous:p.extension<=previous);previous=p.extension;
  assert.equal(JSON.stringify(e),before);
 }
}
for(const page of ['index.html','previews/enemy-roster-canonical.html','previews/enemy-core-lighting.html']){
 const s=fs.readFileSync(page,'utf8');assert(s.indexOf('/tankArticulation.js?')>0);assert(s.indexOf('/tankArticulation.js?')<s.indexOf('/singularityFamily.js?'));
}
let fills=0,colors=[],saved=0;const ctx={globalAlpha:1,save(){saved++;},restore(){saved--;},beginPath(){},moveTo(){},quadraticCurveTo(){},closePath(){},fill(){fills++;colors.push(this.fillStyle);}};
NV.drawTankMuzzleFlame(ctx,{tankCannonState:'approach',atkFlash:1});assert.equal(fills,0);
NV.drawTankMuzzleFlame(ctx,{tankCannonState:'recovery',tankCannonTimer:1.05,tankCannonShotEmitted:false});assert.equal(fills,0);
NV.drawTankMuzzleFlame(ctx,{tankCannonState:'recovery',tankCannonTimer:1.02,tankCannonShotEmitted:true});assert.equal(fills,2);assert.deepEqual(colors,['#d8b98d','#fff0d5']);assert.equal(saved,0);
NV.drawTankMuzzleFlame(ctx,{tankCannonState:'recovery',tankCannonTimer:.8,tankCannonShotEmitted:true});assert.equal(fills,2);
console.log('PASS telescopic tank: stowed locomotion, extension before charge, recoil and smooth retraction, immutable AI and timer-independent sampling.');
