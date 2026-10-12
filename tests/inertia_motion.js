'use strict';
const assert=require('node:assert/strict'),chamber=require('../js/engine/inertiaChamber.js');
const ctx={W:1200,H:800,view:{x:0,y:0,width:1200,height:800},player:{x:600,y:400},enemies:[],bullets:[]};
function simulate(fps,seconds) {
  const c=chamber.create();c.update(.001,.001,ctx);const origin={...c.combatTarget()};
  for(let i=0;i<fps*seconds;i++) {
    const previous={...c.combatTarget()};c.update(1/fps,1/fps,ctx);const target=c.combatTarget();
    assert(Math.hypot(target.x-previous.x,target.y-previous.y)<146/fps,'teleport instead of evasive motion');
    assert(Math.hypot(target.vx,target.vy)<=145.001,'uncatchable speed');
    assert(target.x>=48&&target.x<=ctx.W-48&&target.y>=48&&target.y<=ctx.H-48,'left arena');
    assert([target.vx,target.vy,target.ax,target.ay].every(Number.isFinite));
  }
  assert(Math.hypot(c.combatTarget().x-origin.x,c.combatTarget().y-origin.y)>1,'core stayed stationary');
  const frozen=JSON.stringify(c.view());c.update(0,0,ctx);assert.equal(JSON.stringify(c.view()),frozen,'moved while paused');
  return c;
}
const at30=simulate(30,30),at144=simulate(144,30);
assert(Math.hypot(at30.combatTarget().x-at144.combatTarget().x,at30.combatTarget().y-at144.combatTarget().y)<1e-8,'frame-dependent evasion');
const core=at30.combatTarget(),point={x:core.x,y:core.y};
at30.update(.016,.016,{...ctx,unsafe:()=>true});assert.equal(core.x,point.x);assert.equal(core.y,point.y);
assert.equal(core.vx,0);assert.equal(core.vy,0);
at30.update(.016,.016,{...ctx,player:{...point}});assert(Math.hypot(core.x-point.x,core.y-point.y)<3,'overlap caused teleport');
point.x=core.x;point.y=core.y;
core.hp=0;assert(at30.update(.016,.016,ctx));assert.equal(at30.view().flash.x,point.x);
assert.equal(at30.combatTarget(),null,'dead core retained motion target');
at30.update(3,3,ctx);assert.equal(at30.combatTarget().pattern,1,'sequence changed');
const normal=require('../js/engine/dimensionEvents.js').createSession({preview:false,wave:1});normal.enter(1);
assert.equal(normal.combatTarget(),null,'motion escaped preview');
const progression=chamber.create();
for(let pattern=0;pattern<3;pattern++) {
  progression.update(pattern?3:.001,pattern?3:.001,ctx);const start={...progression.combatTarget()};
  for(let frame=0;frame<1800;frame++)progression.update(1/60,1/60,ctx);
  const t=progression.combatTarget();assert.equal(t.pattern,pattern);
  assert(Math.hypot(t.x-start.x,t.y-start.y)>1,'stage '+pattern+' did not drift');
  progression.combatTarget().hp=0;progression.update(.016,.016,ctx);
}
assert(progression.complete(),'motion changed three-core sequence');
console.log('PASS inertia_motion: bounded evasive motion, 30/144 FPS equivalence, pause, arena, hazard clearance, overlap escape, death and preview isolation');
