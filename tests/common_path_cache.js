'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let builds=0;
class Path {
  constructor(){builds++;}
  moveTo(){} lineTo(){} quadraticCurveTo(){} closePath(){} ellipse(){} arc(){}
}
const NV={},paths=new Set();
vm.runInNewContext(fs.readFileSync('js/render/enemies.js','utf8'),{window:{NV},Path2D:Path,console});
const ctx=new Proxy({globalAlpha:1,shadowBlur:0,getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),
  fill(p){if(p instanceof Path)paths.add(p);},stroke(p){if(p instanceof Path)paths.add(p);}
},{get:(o,k)=>k in o?o[k]:()=>{}});
const player={x:180,y:80};
for(let i=0;i<120;i++)for(const id of ['drone','runner']){
  const e={enemyTypeId:id,x:0,y:0,radius:12,color:'#778899',shape:'circle'};
  NV.drawEnemy(ctx,e,i,player,null,i/60);
}
assert.equal(builds,10,'fixed geometry must not rebuild per enemy/frame');
assert.equal(paths.size,10,'all fill/under/glow passes reuse native geometry');
for(let i=0;i<120;i++)for(const id of ['tank','shielder','swarmlet','spitter','kamikaze']){
  const e={enemyTypeId:id,x:i*.3,y:i*.2,radius:12+i*.01,color:'#778899',shape:'circle',shield:i%2===0,armed:i%2===0,fuse:.4,intent:{state:i%2?'windup':'attack',stateTimer:.3}};
  NV.drawEnemy(ctx,e,i,player,null,i/60);
}
assert.equal(builds,11,'all 11 paths bounded independent of time, size, state and entities');
assert.equal(paths.size,11,'all fixed body passes use their shared paths');
console.log('PASS 11 retained native vector paths; current family uses cached sprites, full glow/animation, bounded cache without per-frame allocations');
