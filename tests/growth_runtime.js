'use strict';
const assert=require('node:assert/strict'),Runtime=require('../js/core/runtime.js'),Migration=require('../js/core/storageMigration.js');
const events=Runtime.events(2,100),received=[];let failCalled=false;
const off=events.on('game.state',event=>{received.push(event);assert(Object.isFrozen(event.payload));});
events.on('game.state',()=>{failCalled=true;throw new Error('listener error');});
assert(events.emit('game.state',{state:'menu'}));assert(failCalled);
assert(events.emit('game.state',{state:'playing'}));assert(!events.emit('game.state',{state:'shop'}));
events.beginFrame();assert(!events.emit('game.state',{text:'x'.repeat(100)}));off();
events.emit('game.state',{state:'shop'});assert.equal(received.length,2);
let clock=0;const order=[],measure=Runtime.measurePhases(()=>clock);
const phases=measure(()=>{order.push('update');clock+=2;},()=>{order.push('shake');clock+=1;},()=>{order.push('draw');clock+=4;},1/60);
assert.deepEqual(order,['update','shake','draw']);assert.deepEqual(phases,{updateMs:3,drawMs:4});
const data=new Map([['neonVoidMeta','{"metaShards":19}'],['neonVoidSettings','old'],['deadSingularitySettings','new']]);
const storage={getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,v)};
const migrated=Migration.migrate(storage);assert.equal(migrated.copied.length,1);assert.equal(data.get('deadSingularityMeta'),data.get('neonVoidMeta'));
assert.equal(data.get('deadSingularitySettings'),'new');assert(data.has('neonVoidMeta'));
assert.equal(Migration.migrate(storage).copied.length,0);
const failure=Migration.migrate({getItem:()=> 'old',setItem:()=>{throw new Error('quota');}});
assert.equal(failure.failures.length,0);
const quota=Migration.migrate({getItem:key=>key.startsWith('neonVoid')?'saved':null,setItem:()=>{throw new Error('quota');}});assert.equal(quota.failures.length,6); // Existing destination is never overwritten.
assert.equal(Migration.normalizeProgress({kind:'neon-void-progress',version:1}).kind,'dead-singularity-progress');
console.log('PASS growth runtime: immutable bounded events, phase ordering, idempotent lossless legacy migration');

