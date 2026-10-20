'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('js/render/spaceResponse.js','utf8');
function fixture(){
  const NV={settings:{graphics:{spaceResponse:true},gameplay:{reducedEffects:false}}};
  vm.runInNewContext(source,{window:{NV},Math,Float32Array,Float64Array,WeakMap,performance:{now:()=>0}});
  return NV;
}
const NV=fixture(),p={x:300,y:290,radius:20},e={x:600,y:280,radius:25},b={x:210,y:200,vx:500,vy:0};
const o={enabled:true,id:'threshold',W:900,H:540,time:0,player:p,enemies:[e],bullets:[],paused:false};
NV.spaceResponse.update(o);
for(let i=1;i<=60;i++){o.time=i/120;p.x+=200/120;e.y+=100/120;b.x+=500/120;o.bullets=[b];NV.spaceResponse.update(o);}
const d=NV.spaceResponse.diagnostics();assert(d.energy>0);assert(d.playerSources>0&&d.enemySources>0&&d.bulletSources>0);
const frozen=JSON.stringify([p,e,b]),at=NV.spaceResponse.sample(p.x,p.y);
for(let i=0;i<100;i++)NV.spaceResponse.update(o);
assert.equal(NV.spaceResponse.diagnostics().steps,d.steps);assert.equal(JSON.stringify([p,e,b]),frozen);
o.paused=true;o.time+=1;NV.spaceResponse.update(o);assert.equal(NV.spaceResponse.diagnostics().energy,d.energy);
o.paused=false;o.bullets=[];
for(let i=1;i<=600;i++){o.time+=1/120;NV.spaceResponse.update(o);}
assert(NV.spaceResponse.diagnostics().energy<d.energy*.02,'field does not settle after actors stop');
assert(Number.isFinite(at.x)&&Number.isFinite(at.y));
NV.settings.graphics.spaceResponse=false;o.time+=1/120;NV.spaceResponse.update(o);
assert.equal(NV.spaceResponse.diagnostics().energy,0);assert.equal(NV.spaceResponse.diagnostics().reactive,false);
for(const id of ['foundry','fracture','void-heart','ash-moon','jade-basin','drowned-vault','glass-desert']){
  o.id=id;NV.spaceResponse.update(o);assert.equal(NV.spaceResponse.diagnostics().active,true);
  assert.equal(NV.spaceResponse.diagnostics().scene,id);assert.equal(NV.spaceResponse.diagnostics().energy,0);
}
o.id='invalid';NV.spaceResponse.update(o);assert.equal(NV.spaceResponse.diagnostics().active,false);
function trajectory(fps){const n=fixture(),q={x:300,y:290};let r={enabled:true,id:'threshold',W:900,H:540,time:0,player:q};n.spaceResponse.update(r);
  for(let i=1;i<=fps;i++){r.time=i/fps;q.x=300+r.time*170;n.spaceResponse.update(r);}return n.spaceResponse.diagnostics().energy;}
const a=trajectory(30),z=trajectory(165);assert(Math.abs(a-z)/Math.max(a,z)<.2,'response depends on refresh rate');
assert(!source.includes('Math.random')&&!source.includes('readPixels')&&!source.includes('getImageData'));
assert.equal(d.fieldBytes,33*19*6*4);assert.equal(d.cutCapacity,64);
assert.equal(d.visibleGain,.20);assert.equal(d.maxVisibleDisplacement,7.6);
console.log('PASS space response: movement/enemies/projectiles, pause/settling, read-only actors, fixed bounded field and frame independence');
