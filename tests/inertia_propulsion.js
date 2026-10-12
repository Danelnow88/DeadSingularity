'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const NV={},images=[],rotations=[],mounts=[];
const housingDirections=[],flameDirections=[];
let canvases=0,gradients=0,jetDraws=0,depth=0;
function context(record) {
  let angle=0;const stack=[];
  return new Proxy({
    save(){if(record){depth++;stack.push(angle);}},restore(){if(record){depth--;angle=stack.pop();}},
    translate(x,y){if(record)mounts.push([x,y]);},
    rotate(a){if(record){rotations.push(a);angle+=a;}},
    drawImage(...args){if(!record)return;
      if(args.length===9){jetDraws++;flameDirections.push(angle);assert(args.slice(1).every(Number.isFinite));}
      else if(args[0].width===96)housingDirections.push(angle+Math.PI/2);
    },
    createLinearGradient(){gradients++;return {addColorStop(){}};},
  },{get:(target,key)=>key in target?target[key]:()=>{}});
}
const document={createElement(kind){assert.equal(kind,'canvas');canvases++;return {getContext:()=>context(false)};}};
class Image {
  constructor(){images.push(this);this.naturalWidth=1536;this.naturalHeight=1024;}
  set src(value){this.path=value;this.onload();}
}
const environment={window:{NV},Image,document,Math,Number,Object};
vm.runInNewContext(fs.readFileSync('js/render/inertiaRig.js','utf8'),environment);
vm.runInNewContext(fs.readFileSync('js/render/inertiaChamber.js','utf8'),environment);
assert.equal(canvases,0,'loading script allocated experimental art');
assert(NV.inertiaSpriteStatus().every(s=>!s.ready),'normal mode preloaded images');
NV.preloadInertiaSprites();assert.equal(images.length,3);assert.equal(canvases,8);
assert(NV.inertiaSpriteStatus().every(s=>s.ready&&!s.error));
const allocations=canvases,gradientCount=gradients,c=context(true);
for(const [pattern,count] of [[0,4],[1,3],[2,1]]) {
  const angles=Array.from({length:count},()=>[0,Math.PI/2]).flat();
  const view={age:2,collected:pattern,target:{x:100,y:200,pattern,hp:360,maxHp:360,aimAngle:1,windup:0}};
  const before=JSON.stringify(view),start=jetDraws;
  rotations.length=0;mounts.length=0;NV.drawInertiaChamber(c,view);
  assert.deepEqual(rotations,angles,'hover housing / flame are not both facing down');
  assert.equal(jetDraws-start,count,'more than one image per exhaust');
  const originalMounts=JSON.stringify(mounts);
  view.target.aimAngle=-2;rotations.length=0;mounts.length=0;NV.drawInertiaChamber(c,view);
  assert.deepEqual(rotations,angles,'weapon aim rotated propulsion');
  assert.equal(JSON.stringify(mounts),originalMounts,'weapon aim detached nozzle');
  view.target.aimAngle=1;assert.equal(JSON.stringify(view),before,'render mutated the objective');
  for(let frame=0;frame<1000;frame++){view.age=frame/144;NV.drawInertiaChamber(c,view);}
  assert.equal(depth,0,'Canvas state leaked');
}
for(const [motion,wanted] of [[{vx:100,vy:0},Math.PI],[{vx:100,vy:0,braking:true},0]]) {
  for(let pattern=0;pattern<3;pattern++) {
    const view={age:0,target:{x:100,y:200,pattern,hp:100,maxHp:100,propulsion:{}}};
    NV.drawInertiaChamber(c,view);view.target.propulsion=motion;
    for(let frame=1;frame<=40;frame++){view.age=frame/144;NV.drawInertiaChamber(c,view);}
    housingDirections.length=0;flameDirections.length=0;NV.drawInertiaChamber(c,view);
    const expected=pattern===1?(motion.braking?[0,Math.PI/2,Math.PI/2]:[Math.PI/2,Math.PI,Math.PI]):
      Array(pattern===0?4:1).fill(wanted);
    assert.equal(flameDirections.length,expected.length);
    for(let i=0;i<expected.length;i++)assert(Math.abs(Math.atan2(Math.sin(flameDirections[i]-expected[i]),Math.cos(flameDirections[i]-expected[i])))<1e-9);
    if(pattern!==2)assert.deepEqual(housingDirections,flameDirections,'flame is detached from rotated housing');
  }
}
assert.equal(canvases,allocations,'per-frame canvas allocation');
assert.equal(gradients,gradientCount,'per-frame gradient allocation');
assert.equal(images.length,3,'per-frame image allocation');
const beforeDestruction=jetDraws;
NV.drawInertiaChamber(c,{age:5,target:null,flash:{x:100,y:200,life:.2}});
assert.equal(jetDraws,beforeDestruction,'destroyed core leaves persistent propulsion');
console.log('PASS inertia_propulsion: 4/3/1 downward gimbals, shared housing/flame transform, aim independence, bounded blits, no frame allocations, no state mutation or residual jets');
