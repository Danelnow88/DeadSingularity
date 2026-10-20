'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function runtime(){const NV={};vm.runInNewContext(fs.readFileSync('js/render/refinedElites.js','utf8'),{window:{NV},Math,Map,WeakMap});return NV;}
const N=runtime(),e={x:0,y:0};N.refinedEliteChasePose(e,0,100,0);
for(let i=1;i<=60;i++){e.x=i*2;N.refinedEliteChasePose(e,i/60,100,0);}
const before=JSON.stringify(e),p=N.refinedEliteChasePose(e,1,100,0);
assert(p.bank>.06&&p.bank<=.075);assert(p.leanX>1&&p.leanX<=1.5);assert.equal(JSON.stringify(e),before);
const bank=p.bank;N.refinedEliteChasePose(e,1,-100,0);assert.equal(p.bank,bank,'same time must not advance interpolation');
for(let i=61;i<=120;i++)N.refinedEliteChasePose(e,i/60,100,0);
assert(Math.abs(p.bank)<.001,'idle settles');
e.predatorState='execution_windup';for(let i=121;i<=180;i++){e.x+=2;N.refinedEliteChasePose(e,i/60,100,0);}assert(Math.abs(p.bank)<.001,'attack pose protected');
function sample(hz){const n=runtime(),actor={x:0,y:0};n.refinedEliteChasePose(actor,0,100,0);for(let i=1;i<=hz;i++){actor.x=i/hz*120;n.refinedEliteChasePose(actor,i/hz,100,0);}return n.refinedEliteChasePose(actor,1,100,0).bank;}
assert(Math.abs(sample(60)-sample(165))<1e-10,'refresh-independent easing');
console.log('PASS elite pursuit posture: bounded, actual movement, idle/attack settle, pure, 60/165 Hz');
