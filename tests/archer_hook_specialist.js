'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context=vm.createContext({window:{NV:{}},Math,console});
for(const f of ['js/data/balance.js','js/data/gameData.js','js/engine/enemies.js','js/render/enemies.js'])vm.runInContext(fs.readFileSync(f,'utf8'),context);
const NV=context.window.NV;
const enemy=()=>({enemyTypeId:'specter_archer',behavior:'ranged',x:100,y:200,radius:12,hp:18,maxHp:18,speed:60,damage:9,dead:false,knockVelX:0,knockVelY:0,knockbackRes:.2,stun:0,contactCd:0});
for(const hz of [30,60,144]){
 const e=enemy(),p={x:400,y:200,radius:20,hp:100,moveVx:0,moveVy:160,dashActive:false},h=NV.createHookSystem();
 h.phase='windup';h.windupTimer=0;h.srcEnemy=e;e.hookOwner=true;NV.updateHookSystem(0,h,[e],p);
 assert(h.projectile.vy>0,'partial lead is required against lateral motion');
 const vx=h.projectile.vx,vy=h.projectile.vy;
 for(let n=0;n<hz&&h.phase==='projectile';n++){p.y+=160/hz;NV.updateHookSystem(1/hz,h,[e],p);if(h.projectile){assert.equal(h.projectile.vx,vx);assert.equal(h.projectile.vy,vy);}}
 assert.equal(h.phase,'tether','failed lateral target at '+hz+'Hz');assert.equal(p.hp,100);
}
// Walking sideways at ordinary speed can evade at medium range without dash;
// standing still and close-range movement must remain punishable.
for(const hz of [30,60,144])for(const sample of [
 {distance:300,speed:195,caught:false},
 {distance:300,speed:0,caught:true},
 {distance:160,speed:195,caught:true},
]){
 const e=enemy(),p={x:e.x+sample.distance,y:e.y,radius:20,hp:100,moveVx:0,moveVy:sample.speed,dashActive:false},h=NV.createHookSystem();
 h.phase='windup';h.windupTimer=0;h.srcEnemy=e;
 NV.updateHookSystem(0,h,[e],p);
 for(let n=0;n<hz&&h.phase==='projectile';n++){p.y+=sample.speed/hz;NV.updateHookSystem(1/hz,h,[e],p);}
 assert.equal(h.phase==='tether',sample.caught,'walking balance at '+hz+'Hz, distance '+sample.distance+', speed '+sample.speed);
}
{
 const e=enemy(),p={x:100,y:200,radius:20,hp:100},h=NV.createHookSystem();h.srcEnemy=e;h.phase='projectile';h.projectile={x:0,y:200,vx:720,vy:0,dist:0};NV.updateHookSystem(.25,h,[e],p);assert.equal(h.phase,'tether','swept head skipped target during long frame');
}
{
 const e=enemy(),p={x:350,y:200,radius:20,hp:100},h=NV.createHookSystem(),b=[];
 const st={enemies:[e],player:p,wave:3,hookSystem:h,bullets:b,MAX_BULLETS:200,MAX_ENEMY_BULLETS:100,enemyBulletCount:()=>b.length,W:900,H:520,applyPlayerDamage:()=>({applied:false}),addFloatText(){},spawnExplosion(){}};
 for(let n=0;n<1200;n++)NV.updateEnemies(1/60,st);assert.equal(b.length,0,'specialist emitted normal ammunition');
}
{
 const e=enemy(),p={x:300,y:200,radius:20},hs={phase:'projectile',srcEnemy:e,projectile:{x:220,y:200,vx:720,vy:0}};
 const before=JSON.stringify([hs,p]),colors=[],stack=[];
 const ctx=new Proxy({save(){stack.push(1);},restore(){stack.pop();},stroke(){colors.push(this.strokeStyle);},fill(){colors.push(this.fillStyle);}},{get(t,k){if(k in t)return t[k];return()=>{};},set(t,k,v){t[k]=v;return true;}});
 for(const phase of ['windup','projectile','tether']){const state={...hs,phase,windupTimer:.2,tetherTimer:.3};NV.drawHookEffects(ctx,state,p);}assert.equal(stack.length,0);assert.equal(JSON.stringify([hs,p]),before);assert(colors.includes('#e7d1ac')&&colors.includes('#f4cd40'),'family palette absent');
}
{
 const e=enemy(),p={x:350,y:200,radius:20,hp:100},h=NV.createHookSystem();
 let left=150;
 NV.viewport={intersectsWorldRect:(x,y,w,h)=>x+w>=left&&x<=600&&y+h>=0&&y<=520};
 const st={enemies:[e],player:p,wave:3,hookSystem:h,bullets:[],MAX_BULLETS:200,MAX_ENEMY_BULLETS:100,enemyBulletCount:()=>0,W:900,H:520,applyPlayerDamage:()=>({applied:false}),addFloatText(){},spawnExplosion(){}};
 NV.updateEnemies(0,st);assert.equal(h.phase,'idle','off-screen archer started preparing a hook');
 e.x=200;NV.updateEnemies(0,st);assert.equal(h.phase,'windup','visible archer could not prepare');
 left=250;NV.updateHookSystem(NV.BALANCE.HOOK_WINDUP_TIME,h,[e],p);
 assert.equal(h.phase,'idle','archer launched after leaving the camera during preparation');assert.equal(h.projectile,null);assert.equal(e.hookWindup,false);
 left=150;e.hookCooldown=0;h.lockoutTimer=0;NV.updateEnemies(0,st);
 NV.updateHookSystem(NV.BALANCE.HOOK_WINDUP_TIME,h,[e],p);assert.equal(h.phase,'projectile','visible archer could not launch');
 left=250;NV.updateHookSystem(0,h,[e],p);assert.equal(h.phase,'projectile','already launched hook was incorrectly cancelled');
 delete NV.viewport;
}
{
 const previousDifficulty=NV.runDifficulty;NV.runDifficulty='normal';
 const e=enemy(),other={...enemy(),x:200},p={x:400,y:200,radius:20,hp:100},h=NV.createHookSystem();
 const st={enemies:[e,other],player:p,wave:3,hookSystem:h,bullets:[],MAX_BULLETS:200,MAX_ENEMY_BULLETS:100,enemyBulletCount:()=>0,W:900,H:520,applyPlayerDamage:()=>({applied:false}),addFloatText(){},spawnExplosion(){}};
 h.srcEnemy=e;h.phase='tether';NV.resetHookState(h);
 NV.updateHookSystem(.99,h,st.enemies,p);NV.updateEnemies(0,st);
 assert.equal(h.phase,'idle','second archer bypassed the shared recovery');
 NV.updateHookSystem(.02,h,st.enemies,p);NV.updateEnemies(0,st);
 assert.equal(h.srcEnemy,other);assert.equal(h.phase,'windup','second archer failed to resume after shared recovery');
 NV.resetHookState(h);st.enemies=[e];e.hookCooldown=0;h.srcEnemy=e;NV.resetHookState(h);
 NV.updateHookSystem(2.5,h,st.enemies,p);NV.updateEnemies(0,st);assert.equal(h.phase,'idle','same archer recast too early');
 NV.updateHookSystem(.11,h,st.enemies,p);NV.updateEnemies(0,st);assert.equal(h.phase,'windup','same archer failed to recover');
 NV.runDifficulty=previousDifficulty;
}
const manifest=JSON.parse(fs.readFileSync('assets/singularity-family/manifest.json'));
assert.equal(manifest.sprites.find(s=>s.id==='kamikaze').visualScale,1.10);assert.equal(manifest.sprites.find(s=>s.id==='specter_archer').visualScale,1.15);
const roster=fs.readFileSync('previews/enemy-roster-canonical.html','utf8');assert(roster.includes('NV.drawHookEffects(ctx,demoHook,demoTarget)'));assert(!roster.includes('Desde la oleada 15 prepara'));
console.log('PASS hook specialist: early access, lateral interception at 30/60/144 Hz, swept collision, fixed flight, no generic bullets, immutable family rope rendering and shared roster scaling.');
