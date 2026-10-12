'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function load(legacy=false){
 const math=Object.create(Math);math.random=()=>.5;
 const box={window:{NV:{}},Math:math,console};
 for(const file of ['data/gameData','data/balance','engine/hostileBudget','engine/enemies']){
  let source=fs.readFileSync('js/'+file+'.js','utf8');
  if(legacy&&file==='engine/enemies')source=source.replace('* knockbackDecay;','* 0.92;').replace('* knockbackDecay;','* 0.92;');
  vm.runInNewContext(source,box);
 }
 return box.window.NV;
}
const NV=load(),old=load(true);
function state(){return {W:10000,H:10000,wave:1,enemies:[{enemyTypeId:'test-knockback',behavior:'chase',shape:'circle',x:1000,y:1000,hp:100,maxHp:100,radius:10,speed:0,angle:0,t:0,stun:0,dead:false,damage:1,knockVelX:240,knockVelY:-120}],player:{x:8000,y:8000,hp:100,radius:20},bullets:[],MAX_BULLETS:30,MAX_ENEMY_BULLETS:20,enemyBulletCount:()=>0,addFloatText(){},applyPlayerDamage(){throw Error('unexpected contact');}};}
const close=(a,b)=>assert(Math.abs(a-b)<1e-9,`${a} != ${b}`);
for(const fps of [30,60,120,144,165]){
 const st=state();for(let i=0;i<fps;i++)NV.updateEnemies(1/fps,st);
 close(st.enemies[0].knockVelX,240*Math.pow(.92,60));
 close(st.enemies[0].knockVelY,-120*Math.pow(.92,60));
 assert(Number.isFinite(st.enemies[0].x)&&Number.isFinite(st.enemies[0].y));
}
{
 const a=state(),b=state();
 for(let i=0;i<60;i++){NV.updateEnemies(1/60,a);old.updateEnemies(1/60,b);assert.equal(JSON.stringify(a.enemies),JSON.stringify(b.enemies),'60 Hz trajectory changed');}
}
{
 const st=state(),e=st.enemies[0];NV.updateEnemies(0,st);
 assert.equal(e.knockVelX,240);assert.equal(e.knockVelY,-120);assert.equal(e.x,1000);assert.equal(e.y,1000);
 const steps=[.003,.012,.024,.006,.018,.01,.02];let elapsed=0;
 for(let i=0;i<70;i++){const dt=steps[i%steps.length];elapsed+=dt;NV.updateEnemies(dt,st);}
 close(e.knockVelX,240*Math.pow(.92,elapsed*60));close(e.knockVelY,-120*Math.pow(.92,elapsed*60));
}
console.log('PASS elapsed-time knockback at 30/60/120/144/165 Hz, jitter, zero dt and exact legacy trajectory at 60 Hz.');
