const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const NV = {};
vm.runInNewContext(fs.readFileSync('js/engine/wavePressure.js','utf8'), {window:{NV}});
for (const difficulty of ['easy','normal','hard']) {
  let hits=0;
  const state=NV.createWavePressure();
  const st={state,difficulty,wave:1,active:true,player:{x:100,y:100,hp:100},enemies:[{x:100,y:100}],
    applyPlayerDamage(){hits++;}};
  for(let i=0;i<1200;i++)NV.updateWavePressure(.05,st);
  assert.equal(hits,0,'pulso retirado todavía daña');
  assert.equal(state.mark,null,'pulso retirado crea marcas');
  state.mark={x:100,y:100,t:0}; NV.updateWavePressure(.05,st);
  assert.equal(state.mark,null,'marca antigua persiste');
  NV.drawWavePressure(new Proxy({}, {get(){throw Error('pulso retirado dibuja');}}),state);
}
for(const file of ['js/render/enemies.js','js/render/spectralEnemies2D.js']) {
  const code=fs.readFileSync(file,'utf8');
  assert(!code.includes('NV.fusionMilestoneLabel'),'nombre de fusión visible');
  assert(code.includes("e.atkFlash > 0 && player && e.enemyTypeId !== 'tank'"),'tanque conserva aros de ataque');
}
console.log('PASS pulso global retirado, sin daño ni dibujos; fusión sin etiquetas; tanque sin aros');
{
  const context=vm.createContext({window:{NV},Math,console});
  for(const file of ['js/data/balance.js','js/data/gameData.js','js/engine/hostileBudget.js','js/engine/enemies.js','js/render/tankArticulation.js','js/render/singularityCoreLight.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
  function makeTank(){return {enemyTypeId:'tank',x:100,y:100,hp:60,maxHp:60,speed:40,radius:20,damage:18,behavior:'chase',color:'#ff9b32',dead:false,knockVelX:0,knockVelY:0,knockbackRes:.3,contactCd:0,hitFlash:0,hitSlowUntil:0,hitSlowImmunity:0,stun:0};}
  const tank=makeTank(),player={x:400,y:100,radius:20,hp:300,maxHp:300,invuln:0,stun:0};
  const state=NV.createWavePressure(),bullets=[];
  const st={state,wave:3,active:true,difficulty:'normal',player,enemies:[tank],bullets,W:900,H:520,boss:null,
    MAX_BULLETS:10,MAX_ENEMY_BULLETS:2,MAX_HOSTILES:30,MAX_HEAVY_HOSTILES:7,enemyBulletCount:()=>bullets.length,
    applyPlayerDamage(){return {applied:false};},addFloatText(){},spawnExplosion(){}};
  NV.updateWavePressure(1.8,st);assert.equal(bullets.length,0,'early artillery bypassed deployment');
  assert.equal(tank.tankCannonState,'windup');assert.equal(NV.tankArticulationPose(tank).extension,0);
  NV.updateEnemies(.3,st);assert.equal(bullets.length,0);assert(NV.tankArticulationPose(tank).extension<.6);assert.equal(NV.singularityCoreIntensity(tank,0),0);
  NV.updateWavePressure(2,st);assert(Math.abs(tank.tankCannonTimer-.6)<1e-9,'pressure restarted an active windup');
  NV.updateEnemies(.3,st);assert.equal(bullets.length,0);assert.equal(NV.tankArticulationPose(tank).extension,1);assert(NV.singularityCoreIntensity(tank,0)>0);
  player.y=400;NV.updateEnemies(.299,st);assert.equal(bullets.length,0);
  NV.updateEnemies(.0011,st);assert.equal(bullets.length,1);assert.equal(bullets[0].sourceEnemy,tank);assert.equal(bullets[0].vx,280);assert.equal(bullets[0].vy,0,'locked aim changed');
  assert.equal(bullets[0].damage,34);assert.equal(bullets[0].radius,9);assert.equal(tank.tankCannonShotEmitted,true);assert.equal(NV.tankArticulationPose(tank).extension,1);
  NV.updateWavePressure(2,st);assert.equal(tank.tankCannonState,'recovery');assert.equal(bullets.length,1,'recovery emitted another shot');
  NV.updateEnemies(1.05,st);assert.equal(NV.tankArticulationPose(tank).extension,0);
  NV.updateWavePressure(.01,st);assert.equal(tank.tankCannonState,'windup');NV.updateEnemies(.9,st);assert.equal(bullets.length,2);
  NV.updateEnemies(1.05,st);NV.updateWavePressure(2,st);assert.equal(tank.tankCannonState,'approach','pressure exceeded bullet budget');
  bullets.length=0;st.threatView={x:300,y:0,width:600,height:520};NV.updateWavePressure(2,st);assert.equal(tank.tankCannonState,'approach','queued off-camera');
  st.threatView=null;st.boss={};NV.updateWavePressure(2,st);assert.equal(tank.tankCannonState,'approach');
  st.boss=null;st.enemies=[{...tank,enemyTypeId:'drone'}];NV.updateWavePressure(2,st);assert.equal(bullets.length,0);
  // Both producers must reach fully extended + charged before any shot, at varied frame rates.
  for(const hz of [30,60,144])for(const pressure of [false,true]){
    const e=makeTank(),b=[],p={...player,x:400,y:100};const sample={...st,state:NV.createWavePressure(),threatView:null,enemies:[e],player:p,bullets:b,enemyBulletCount:()=>b.length};
    if(pressure)NV.updateWavePressure(2,sample);else{NV.updateEnemies(0,sample);e.tankCannonCooldown=0;NV.updateEnemies(0,sample);}
    let fullyDeployedFrames=0,chargedFrames=0;
    for(let n=0;n<Math.ceil(hz*1.1)&&!b.length;n++){
      const before=NV.tankArticulationPose(e);if(before.extension===1)fullyDeployedFrames++;
      if(NV.singularityCoreIntensity(e,0)>0){assert.equal(before.extension,1);chargedFrames++;}
      NV.updateEnemies(1/hz,sample);
      if(b.length){assert.equal(before.extension,1);assert.equal(NV.tankArticulationPose(e).extension,1);}
    }
    assert.equal(b.length,1);assert.equal(b[0].radius,9,'Both artillery routes must use the same ammunition size');assert(fullyDeployedFrames>=hz*.25);assert(chargedFrames>=hz*.25);
  }
  // A capped discharge must not paint a fake muzzle flame.
  const capped=makeTank(),budget={...st,enemies:[capped],player:{...player,x:400,y:100},bullets:[],MAX_BULLETS:0,enemyBulletCount:()=>0,threatView:null};NV.updateEnemies(0,budget);capped.tankCannonCooldown=0;NV.updateEnemies(0,budget);NV.updateEnemies(.9,budget);assert.equal(capped.tankCannonShotEmitted,false);
  console.log('PASS unified artillery: slow extension then light then one actual shell; both producers at 30/60/144 Hz; locked aim, budget, camera, no duplicate/retracted shots or phantom flash.');
}
