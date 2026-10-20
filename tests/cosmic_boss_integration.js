'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const sandbox={window:{NV:{}},console},calls=[];vm.createContext(sandbox);
for(const file of ['js/data/bossDesignLab.js','js/render/bossDesignLab.js','js/render/cosmicBossArt.js','js/render/cosmicBossBridge.js'])vm.runInContext(fs.readFileSync(file,'utf8'),sandbox,{filename:file});
const NV=sandbox.window.NV,definitions=NV.cosmicBossArt.definitions;
assert.deepEqual(Array.from(definitions,d=>d.id),['umbra','oracle','nacre','pyra','vesper','macula','vermora','coro','cisma','anatema']);
// Canvas art is pixel-tested in Electron. This unit test isolates the adapter
// so frozen entities detect any attempted gameplay write, even on nested data.
NV.cosmicBossArt={definitions,drawLocal(ctx,index,time,look,pose){calls.push({index,time,look,pose});return true;}};
NV.BOSS_ENCOUNTER_PROFILES={heavy:{windup:.9}};
let saves=0;
const ctx=new Proxy({}, {get(t,k){if(k==='save')return()=>saves++;if(k==='restore')return()=>{saves--;assert(saves>=0);};return()=>{};},set(t,k,v){t[k]=v;return true;}});
function freeze(value){if(value&&typeof value==='object'){for(const v of Object.values(value))freeze(v);Object.freeze(value);}return value;}
for(let i=0;i<10;i++)for(const stage of ['recovery','windup','fire'])for(const phase2 of [false,true]){
 const boss={isBoss:true,dead:false,x:321,y:456,hp:160,maxHp:300,radius:50,color:'#123456',attack:'heavy',primaryAttack:'heavy',phase2,encounter:{stage,t:.2,cast:0}};
 NV.attachBossDesign(boss,i);freeze(boss);const before=JSON.stringify(boss);
 const player=freeze({x:900,y:200});assert(NV.drawBossDesign(ctx,boss,120,{player,showHitbox:true}));
 const call=calls.at(-1);assert.equal(call.index,i);assert.equal(call.time,2);assert.equal(call.pose.rage,phase2?1:0);
 assert(call.look.x>0&&call.look.y<0);assert.equal(call.pose.charge>0,stage==='windup');
 assert.equal(JSON.stringify(boss),before);assert.equal(saves,0);
}
NV.presentationClock={resolveFrame:()=>90};
const b={isBoss:true,hp:100,radius:50,x:0,y:0,visual:{bossIndex:1},encounter:{stage:'windup',t:.2,cast:0}};
NV.drawCosmicBoss(ctx,b,999);assert.equal(calls.at(-1).time,1.5);
b.encounter={stage:'recovery',t:.9,cast:1};NV.drawCosmicBoss(ctx,b,999);assert(calls.at(-1).pose.fire>.9,'Completed casts must animate even when fire stage lasts one tick');
delete NV.presentationClock;NV.drawCosmicBoss(ctx,b,180);assert.equal(calls.at(-1).pose.fire,0,'Do not loop attack animation outside a real cast');
for(const invalid of [null,{...b,hp:0},{...b,dead:true},{...b,isBoss:false},{...b,visual:{bossIndex:11}}])assert.equal(NV.drawCosmicBoss(ctx,invalid,0),false);
const html=fs.readFileSync('index.html','utf8');assert(html.includes('js/render/cosmicBossArt.js'));assert(html.includes('js/render/cosmicBossBridge.js'));
assert(fs.readFileSync('previews/enemy-roster-canonical.html','utf8').includes('../js/render/cosmicBossArt.js'));
assert(!fs.readFileSync('js/render/cosmicBossArt.js','utf8').includes('requestAnimationFrame'));
console.log('PASS cosmic_boss_integration: ten mappings, 60 frozen combat states, real attack cues, clock, gaze, zero boss mutation, Canvas restoration, game and roster wiring');
