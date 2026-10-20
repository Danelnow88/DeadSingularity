'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const ids=['runner','tank','swarmlet','spitter','wisp','kamikaze'];let bodies=0;const NV={isSingularityFamilyEnemy:e=>ids.includes(e.enemyTypeId),drawSingularityCommon:()=>{bodies++;return true;},hasSingularityCoreLight:()=>true};
const sandbox={window:{NV},Math,Number,Object,Array,Set,Map,WeakMap,console};vm.runInNewContext(fs.readFileSync('js/render/enemies.js','utf8'),sandbox);
const ctx=new Proxy({save(){},restore(){},getTransform(){return{a:1,b:0,c:0,d:1,e:0,f:0};}},{get(t,k){if(k in t)return t[k];return()=>{};},set(t,k,v){t[k]=v;return true;}});
for(const id of ids){const e={enemyTypeId:id,x:100,y:100,radius:12,color:'#ffffff',shape:'circle',hp:20,dead:false};NV.drawEnemy(ctx,e,60,{x:200,y:100},null,1);}assert.equal(bodies,6);
for(const dead of [true,false]){NV.drawEnemy(ctx,{enemyTypeId:'runner',dead,waveCleanup:!dead},60,{},null,1);}assert.equal(bodies,6,'dead/cleanup entry reached body');
const source=fs.readFileSync('js/render/enemies.js','utf8');for(const removed of ["'runner-body'","'tank-body'",'drawCosmicRunner','drawCosmicCreature','drawPaintedSwarmlet','drawRefinedCommon'])assert(!source.includes(removed));
for(const page of ['index.html','previews/enemy-roster-canonical.html']){const s=fs.readFileSync(page,'utf8');for(const file of ['cosmicRunner.js','cosmicCreatures.js','cosmicSpecters.js','paintedSwarmlet.js','refinedCommon.js'])assert(!s.includes(file));assert(s.includes('singularityFamily.js'));}
console.log('PASS current common bodies: canonical-only dispatch, no dead/cleanup fallback, no retired models loaded in game or roster.');
