'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function load(file,transform=s=>s){const box={window:{NV:{}},Math,Object,Array,Map,Set,console};vm.runInNewContext(transform(fs.readFileSync(file,'utf8')),box);return box.window.NV;}
const current=load('js/engine/fx.js');
// Reference uses the former stable filter, without depending on local backups.
const original=load('js/engine/fx.js',source=>{
 for(const name of ['floatTexts','shockwaves']){
  const block=new RegExp('    let write = 0;[\\s\\S]*?    return '+name+';');
  assert(block.test(source));source=source.replace(block,`    return ${name}.filter(entry => entry.life > 0);`);
 }
 return source;
});
let actual=[],expected=[],waves=[],oldWaves=[];
for(let i=0;i<120;i++){
 const meta=i%7===0?{bossReaction:true,boss:{id:i}}:undefined;
 current.addFloatText(actual,i,i*2,String(i),'#fff',14,meta);
 original.addFloatText(expected,i,i*2,String(i),'#fff',14,meta);
 current.spawnShockwave(waves,i,i,{maxRadius:130});original.spawnShockwave(oldWaves,i,i,{maxRadius:130});
}
const textArray=actual,waveArray=waves;
for(let i=0;i<600;i++){
 const dt=i%5===0?0:1/120;
 actual=current.updateFloatTexts(dt,actual);expected=original.updateFloatTexts(dt,expected);
 waves=current.updateShockwaves(dt,waves);oldWaves=original.updateShockwaves(dt,oldWaves);
 assert.equal(actual,textArray);assert.equal(waves,waveArray);
 assert.equal(JSON.stringify(actual),JSON.stringify(expected),'text order, lifetime and animation changed');
 assert.equal(JSON.stringify(waves),JSON.stringify(oldWaves),'shockwave lifetime or order changed');
}
assert.equal(actual.length,0);assert.equal(waves.length,0);
const NV=load('js/engine/dimensionalThreats.js');
function entity(id,wait=0){return {enemyTypeId:id,x:250,y:250,radius:16,damage:12,dimensionalThreat:{kind:id==='rift_weaver'?'cut':'devour',phase:'position',cooldown:0,elapsed:0,lastX:440,lastY:250,zoneWait:wait}};}
function state(enemies){return {enemies,W:900,H:520,player:{x:440,y:250,hp:100,radius:20},applyPlayerDamage(){return {killed:false};}};}
{
 const first=entity('rift_weaver',0),older=entity('void_devourer',3),st=state([first,older]);
 NV.prepareDimensionalThreats(st);for(const e of st.enemies)NV.updateDimensionalThreat(e,.05,st,60);
 assert.equal(first.dimensionalThreat.phase,'position');assert.equal(older.dimensionalThreat.phase,'windup');
}
{
 const first=entity('rift_weaver'),outside=entity('void_devourer',10),st=state([outside,first]);outside.x=10;st.threatView={x:100,y:0,width:800,height:520};
 NV.prepareDimensionalThreats(st);for(const e of st.enemies)NV.updateDimensionalThreat(e,.05,st,60);
 assert.equal(first.dimensionalThreat.phase,'windup','offscreen claimant blocked an eligible attacker');
}
for(const fps of [30,60,120]){
 const st=state([entity('rift_weaver'),entity('void_devourer')]),counts=[0,0];
 for(let frame=0;frame<fps*45;frame++){
  NV.prepareDimensionalThreats(st);
  st.enemies.forEach((e,i)=>{const before=e.dimensionalThreat.phase;NV.updateDimensionalThreat(e,1/fps,st,60);if(before!=='windup'&&e.dimensionalThreat.phase==='windup')counts[i]++;});
  assert(st.enemies.filter(e=>['windup','active'].includes(e.dimensionalThreat.phase)).length<=1);
 }
 assert(counts.every(n=>n>=3),'zone starvation at '+fps+' FPS: '+counts);
}
{
 const e=entity('void_devourer'),st=state([e]);e.dimensionalThreat.lastX=430;e.dimensionalThreat.velocityX=200;
 NV.prepareDimensionalThreats(st);NV.updateDimensionalThreat(e,.05,st,60);
 const g=e.dimensionalThreat.geometry;assert(g.x>st.player.x);assert(g.x-st.player.x<=60);
 assert(Math.hypot(g.x-st.player.x,g.y-st.player.y)+st.player.radius<g.inner,'prediction removed initial safe core');
 const locked=JSON.stringify(g);st.player.x+=30;NV.prepareDimensionalThreats(st);NV.updateDimensionalThreat(e,.05,st,60);assert.equal(JSON.stringify(g),locked);
 e.stun=1;NV.prepareDimensionalThreats(st);assert.equal(e.dimensionalThreat.geometry,null);assert.equal(e.dimensionalThreat.zoneWait,0);
}
console.log('PASS FX equivalence/reuse, fair zone admission at 30/60/120 FPS, offscreen exclusion, bounded devour prediction and interruption.');
