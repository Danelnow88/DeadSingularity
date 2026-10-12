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
  const tank={enemyTypeId:'tank',x:100,y:100}, player={x:400,y:100,hp:100};
  const state=NV.createWavePressure(),bullets=[];
  const st={state,wave:3,active:true,difficulty:'normal',player,enemies:[tank],bullets,
    MAX_BULLETS:10,MAX_ENEMY_BULLETS:2,enemyBulletCount:()=>bullets.length,
    applyPlayerDamage(){throw Error('artillería no puede dañar fuera del pipeline de proyectiles');}};
  NV.updateWavePressure(1.8,st);assert.equal(bullets.length,1);
  assert.equal(bullets[0].sourceEnemy,tank);assert.equal(bullets[0].vx,280);
  const old=bullets[0].vy;player.y=400;NV.updateWavePressure(.1,st);
  assert.equal(bullets[0].vy,old,'proyectil persigue');
  NV.updateWavePressure(2,st);assert.equal(bullets.length,2);
  NV.updateWavePressure(2,st);assert.equal(bullets.length,2,'excede cap');
  bullets.length=0;st.threatView={x:300,y:0,width:600,height:520};
  NV.updateWavePressure(2,st);assert.equal(bullets.length,0,'dispara fuera de cámara');
  st.threatView=null;st.boss={};NV.updateWavePressure(2,st);assert.equal(bullets.length,0);
  st.boss=null;st.enemies=[{...tank,enemyTypeId:'drone'}];NV.updateWavePressure(2,st);assert.equal(bullets.length,0);
  console.log('PASS artillería física: cadencia, trayectoria fija, presupuesto, cámara y fuente');
}
