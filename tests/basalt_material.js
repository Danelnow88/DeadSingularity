'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('js/render/singularityFamily.js','utf8'),NV={};
let filterAssignments=0,roots=0,blits=0,filterValue='none';
const ctx=new Proxy({globalAlpha:1,drawImage(){blits++;},createLinearGradient(){return {addColorStop(){}};},createRadialGradient(){return {addColorStop(){}};},getImageData(){throw Error('No readbacks');}},{get:(o,k)=>k==='filter'?filterValue:k in o?o[k]:()=>{},set:(o,k,v)=>{if(k==='filter'){filterAssignments++;filterValue=v;}else o[k]=v;return true;}});
const node=()=>({style:{},children:[],setAttribute(k,v){this[k]=v;},appendChild(n){this.children.push(n);}});
const document={currentScript:{src:'file:///project/js/render/singularityFamily.js'},documentElement:{appendChild(){roots++;}},createElement:()=>({width:0,height:0,getContext:()=>ctx}),createElementNS:node};
class LocalImage{set src(value){const url=new URL(value),rel=url.pathname.replace('/project/','');const png=fs.readFileSync(rel);this.naturalWidth=png.readUInt32BE(16);this.naturalHeight=png.readUInt32BE(20);this.onload();}}
vm.runInNewContext(source,{window:{NV},document,Image:LocalImage,URL,Map,Math});
NV.prewarmSingularityFamily();const stats=NV.singularityFamilyStats();assert.equal(stats.material,'basalt');assert.equal(stats.species.length,9);assert(stats.species.every(s=>s.ready&&s.materialReady&&!s.error));assert.equal(roots,1);
assert(stats.species.find(s=>s.id==='tank').tankAnimationReady);assert.equal(filterValue,'none');assert.equal(filterAssignments,24,'Nine bodies and three tank pieces, then reset');
const beforeFilters=filterAssignments,beforeRoots=roots;
for(let i=0;i<20;i++)for(const s of stats.species){const e=Object.freeze({enemyTypeId:s.id,x:0,y:0,hp:100,dead:false});const before=JSON.stringify(e);if(s.id.startsWith('specter_'))NV.drawSingularitySpecter(ctx,e,0,{x:40,y:0},0);else NV.drawSingularityCommon(ctx,e,1,0,0);assert.equal(JSON.stringify(e),before);}
assert.equal(filterAssignments,beforeFilters,'No live filter assignments');assert.equal(roots,beforeRoots);assert(blits>12);assert(!source.includes('getImageData('));
console.log('PASS basalt material: nine cached bodies + three tank parts, one SVG graph, no frame-time filters/readbacks and immutable gameplay');
// Same cached material service, distinct selection mask for reflected elite stone.
vm.runInNewContext(fs.readFileSync('js/render/refinedElites.js','utf8'),{window:{NV},document,Image:LocalImage,URL,Map,Math,WeakMap});
NV.prewarmRefinedElites();NV.prewarmRefinedEliteReadability();
assert.equal(roots,5,'Two material graphs and three shared emissive profiles');
assert.equal(filterAssignments,48,'Six elite bodies plus six light preparations, set/reset during loading');
for(const stats of [NV.refinedEliteRenderStats(),NV.refinedEliteReadabilityStats()]){
  assert.equal(stats.species.length,3);assert(stats.species.every(s=>s.ready&&s.materialReady&&!s.error));
}
const originalMaterial=NV.cachedBasaltMaterialFilter;
NV.cachedBasaltMaterialFilter=()=>{throw Error('Material must not be rebuilt during rendering');};
for(const visualId of ['elite_predator','elite_phantom','elite_titan']){
  const e=Object.freeze({visualId,refinedEliteReadability:true,x:0,y:0});
  for(let i=0;i<20;i++)assert(NV.drawRefinedEliteBody(ctx,e,i*.02,'#fff',40,20));
  const attack=Object.freeze({...e,predatorState:'execution_windup',predatorStateTimer:0,phantomState:'entry_windup',phantomStateTimer:0,goliathState:'slam_windup',goliathStateTimer:0});
  for(const on of [false,true]){
    NV.__refinedEliteAttackLighting=on;const beforeDraw=blits,beforeFilter=filterAssignments;
    assert(NV.drawRefinedEliteBody(ctx,attack,0,'#fff',40,20));
    assert.equal(blits-beforeDraw,4,'Same one body + three lenses, no emission overlay');
    assert.equal(filterAssignments-beforeFilter,1,'Only the pre-existing none reset; no live light filter');
  }
  delete NV.__refinedEliteAttackLighting;
}
NV.cachedBasaltMaterialFilter=originalMaterial;
assert.equal(roots,5);assert.equal(filterValue,'none');
console.log('PASS basalt elites: six cached textures, separate unfiltered eyes, no live material compilation, immutable entities');
vm.runInNewContext(fs.readFileSync('js/render/inertiaChamber.js','utf8'),{window:{NV},document,Image:LocalImage,URL,Map,Math,Number,Object});
const beforeCore=filterAssignments;
NV.preloadInertiaSprites();assert(NV.inertiaSpriteStatus().every(s=>s.ready&&s.materialReady&&!s.error));
assert.equal(filterAssignments-beforeCore,10,'Three core bodies and two housings, set/reset once (file readback fallback)');
assert.equal(roots,6,'One cached SVG graph per profile');
NV.cachedBasaltMaterialFilter=()=>{throw Error('Live core material compilation');};
for(let pattern=0;pattern<3;pattern++)for(let i=0;i<20;i++){
  const view={age:i*.02,target:Object.freeze({x:0,y:0,pattern,hp:100,maxHp:100})};const before=JSON.stringify(view);
  NV.drawInertiaChamber(ctx,view);assert.equal(JSON.stringify(view),before);
}
NV.cachedBasaltMaterialFilter=originalMaterial;assert.equal(filterValue,'none');
console.log('PASS basalt cores: three bodies and two housings, cached profile, unchanged gameplay and no per-frame material compilation');
