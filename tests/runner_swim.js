'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(shared,random=.3){const math=Object.create(Math);math.random=()=>random;const sandbox={window:{NV:{}},console:{log(){}},Math:math};
 for(const f of ['js/data/balance.js','js/data/gameData.js','js/engine/hostileBudget.js','js/engine/enemies.js',...(shared?['js/engine/enemyState.js']:[])])vm.runInNewContext(fs.readFileSync(f,'utf8'),sandbox);
 return sandbox.window.NV;}
function scene(){const e={x:230,y:300,hp:15,maxHp:15,damage:10,speed:145,radius:9,behavior:'flank',enemyTypeId:'runner',hostileClass:'light',dead:false,knockVelX:0,knockVelY:0};let contacts=0,explosions=0;
 const st={enemies:[e],player:{x:400,y:300,radius:12,invuln:0,stun:0},bullets:[],MAX_BULLETS:20,MAX_ENEMY_BULLETS:20,MAX_HOSTILES:30,MAX_HEAVY_HOSTILES:7,enemyBulletCount:()=>0,applyPlayerDamage:(d,meta)=>{assert.equal(meta.cause,'contact');contacts++;return {applied:false};},addFloatText(){},spawnExplosion(){explosions++;},boss:null};
 return {e,st,counts:()=>({contacts,explosions})};}
const state=e=>e.intent?.state||e.flankState,timer=e=>e.intent?.stateTimer??e.stateTimer;
for(const shared of [false,true])for(const random of [.3,.8]){
 const N=setup(shared,random),{e,st,counts}=scene(),seen=[];let frames=0,inStarts=0,outStarts=0,last='',windX,windY,windFrames=0;
 while(frames++<1000&&state(e)!=='attack'){
  N.updateEnemies(1/165,st);const s=state(e);
  if(s!==last){seen.push(s);if(s==='feint_in')inStarts++;if(s==='feint_out')outStarts++;last=s;}
  if(s==='windup'){
   if(windX===undefined){windX=e.x;windY=e.y;assert(Math.hypot(st.player.x-e.x,st.player.y-e.y)>100);}
   else {assert.equal(e.x,windX);assert.equal(e.y,windY);windFrames++;}
  }
 }
 const goal=random<.5?2:3;assert.equal(e.runnerFeintGoal,goal);assert.equal(inStarts,goal);assert.equal(outStarts,goal);assert.equal(e.runnerFeints,goal);assert.equal(state(e),'attack');assert(windFrames/165>=.24);
 assert.equal(!!e.intent,shared);assert.equal(e.flankState!==undefined,!shared);
 const committed=[e.commitDirX,e.commitDirY,e.committedTargetX,e.committedTargetY],x=e.x,y=e.y;
 st.player.x=400;st.player.y=600;
 for(let i=0;i<10;i++)N.updateEnemies(1/165,st);
 assert.deepEqual([e.commitDirX,e.commitDirY,e.committedTargetX,e.committedTargetY],committed);
 assert(Math.abs(e.y-y)<1e-8,'no homing to the displaced player');assert(e.x>x);
 assert(Math.abs((e.x-x)/(10/165)-145*1.85)<1e-6,'medium dash uses 1.85x base speed');
 e.speed=0;const stoppedX=e.x;N.updateEnemies(1/165,st);assert.equal(e.x,stoppedX,'dash respects a later zero speed');e.speed=145;
 for(let i=0;i<200&&state(e)!=='recovery';i++)N.updateEnemies(1/165,st);
 assert.equal(state(e),'recovery');assert(timer(e)>0);assert.equal(st.bullets.length,0);assert.equal(counts().explosions,0);assert.equal(e.damage,10);assert.equal(e.radius,9);assert.equal(e.speed,145);
 for(let i=0;i<100&&state(e)==='recovery';i++)N.updateEnemies(1/165,st);
 assert.equal(e.runnerFeints,0);assert([2,3].includes(e.runnerFeintGoal));
}
// Forward/backwards motion is physical, not just sprite deformation.
{
 const N=setup(false),{e,st}=scene();st.waveEvent='mines';e.speed=250;
 e.runnerFeintGoal=2;e.runnerFeints=2;e.flankState='windup';e.stateTimer=0;e.commitDirX=170;e.commitDirY=0;
 N.updateEnemies(.01,st);assert.equal(e.runnerDashSpeed,260,'minefield global speed cap also applies to the dash');
 const x=e.x;N.updateEnemies(.01,st);assert(e.x-x<=2.600001);
}
{
 const N=setup(false),{e,st}=scene();N.updateEnemies(.01,st);const x=e.x;
 for(let i=0;i<10;i++)N.updateEnemies(.01,st);assert(e.x>x);
 while(state(e)!=='feint_out')N.updateEnemies(.01,st);const near=e.x;
 for(let i=0;i<10;i++)N.updateEnemies(.01,st);assert(e.x<near);
}
// The current contact pipeline still owns damage/death; no projectile or radial hit.
for(const hz of [30,60,165]){
 const N=setup(false),{e,st}=scene();let damage=0;
 st.applyPlayerDamage=(d,meta)=>{assert.equal(meta.cause,'contact');damage=d;return {applied:true};};
 for(let i=0;i<hz*6&&!e.dead;i++)N.updateEnemies(1/hz,st);
 assert(e.dead,'the staged dash must actually reach a stationary player at '+hz+' Hz');assert.equal(damage,10);assert.equal(st.bullets.length,0);
}
{
 const N=setup(false),{e,st}=scene();e.x=400;e.y=300;let damage=0;
 st.applyPlayerDamage=(d,meta)=>{assert.equal(meta.cause,'contact');damage=d;return {applied:true};};N.updateEnemies(.016,st);assert.equal(damage,10);assert(e.dead);assert.equal(st.bullets.length,0);
}
console.log('PASS runner swim: 2/3 feints, medium staging, stopped windup, fixed dash, slowing, recovery, both timer backends and contact-only damage');
