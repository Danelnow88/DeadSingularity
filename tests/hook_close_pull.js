'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const c=vm.createContext({window:{NV:{}},Math,console});
for(const f of ['js/data/balance.js','js/data/gameData.js','js/engine/movement.js','js/engine/enemies.js','js/render/enemies.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);const NV=c.window.NV;
const archer=()=>({x:150,y:200,radius:12,enemyTypeId:'specter_archer',hp:18,dead:false});
const player=()=>({x:650,y:200,radius:20,hp:100,maxHp:100,invuln:0,stun:0,moveVx:0,moveVy:0,dashActive:false});
function latch(a,p,enemies=[a]){const h=NV.createHookSystem();h.phase='projectile';h.srcEnemy=a;h.projectile={x:p.x,y:p.y,vx:0,vy:0,dist:0};NV.updateHookSystem(0,h,enemies,p,{hazards:[],W:900,H:520});assert.equal(h.phase,'tether');return h;}
for(const hz of [30,60,144])for(const resist of [0,200,600]){
 const a=archer(),p=player(),h=latch(a,p);NV.configurePlayerMovement(p,resist||200,0);
 for(let i=0;i<hz*2&&h.phase==='tether';i++){if(resist)NV.updatePlayerMovement(p,1,0,1/hz);NV.applyHookPull(1/hz,h,p,false);assert(p.x>=200-1e-6,'pull overlaps source');NV.updateHookSystem(1/hz,h,[a],p);}
 assert(Math.abs(Math.hypot(p.x-a.x,p.y-a.y)-50)<1e-5,'released before reaching archer at '+hz);assert.equal(p.hp,100);assert.equal(p.stun,0);
}
{
 const a=archer(),p=player(),h=latch(a,p);NV.configurePlayerMovement(p,200,0);NV.configurePlayerDash(p);
 NV.updatePlayerDash(p,true,0,1,0,0,false,1/60);NV.applyHookPull(1/60,h,p,false);assert.equal(h.phase,'tether');assert.equal(h.dashEscapeCount,1);assert.equal(p.dashStamina,50);
 for(let i=0;i<20;i++){const was=p.dashActive;NV.updatePlayerDash(p,true,0,1,0,0,false,1/60);NV.applyHookPull(1/60,h,p,was);assert.equal(h.dashEscapeCount,1,'held dash counted repeatedly');}
 NV.updatePlayerDash(p,false,0,1,0,0,false,0);NV.updatePlayerDash(p,true,0,1,0,0,false,1/60);NV.applyHookPull(1/60,h,p,false);assert.equal(h.phase,'idle');assert.equal(p.dashStamina,0);assert.equal(h.dashEscapeCount,0);
 p.dashActive=false;const fresh=latch(a,p);assert.equal(fresh.dashEscapeCount,0);a.dead=true;NV.updateHookSystem(.01,fresh,[a],p);assert.equal(fresh.phase,'idle');
}
{
 const a=archer(),p=player(),allies=Array.from({length:8},(_,i)=>({x:170+i*12,y:220,radius:10,dead:false,behavior:'chase',enemyTypeId:'runner',speed:145,damage:10}));
 const elite={...allies[0],isElite:true},far={...allies[0],x:850},stunned={...allies[0],stun:1};latch(a,p,[a,...allies,elite,far,stunned]);
 assert.equal(allies.filter(e=>e.hookOpportunityTimer>0).length,3);assert(!elite.hookOpportunityTimer&&!far.hookOpportunityTimer&&!stunned.hookOpportunityTimer);assert(allies.every(e=>e.speed===145&&e.damage===10));
}
const page=fs.readFileSync('previews/enemy-roster-canonical.html','utf8');assert(page.includes('dos dash distintos')&&page.includes('dashEscapeCount:t>1.83?1:0'));
console.log('PASS close pull at 30/60/144 Hz with movement resistance, no overlap/damage/stun, two actual dash charges, held input rejection, fresh-catch/death cleanup and capped ally opportunity.');
