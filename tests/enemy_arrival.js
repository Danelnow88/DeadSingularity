const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const sandbox = { window: { NV: {} }, Math, console: { log() {} } };
for (const file of ['data/gameData', 'data/balance', 'engine/hostileBudget', 'engine/enemies', 'engine/enemyArrival', 'engine/boss']) {
  vm.runInNewContext(fs.readFileSync('js/' + file + '.js', 'utf8'), sandbox);
}
const NV = sandbox.window.NV;
function state() { return { enemies:[], boss:null, wave:3, W:900, H:520,
  player:{x:450,y:260,radius:20}, ENEMY_TYPES:NV.ENEMY_TYPES, ELITE_TYPES:NV.ELITE_TYPES,
  MAX_HOSTILES:30, MAX_HEAVY_HOSTILES:7, announceSpawn:true }; }
const st=state(); assert(NV.spawnEnemy(st)); const enemy=st.enemies[0];
assert.equal(enemy.arrival.stage,'warning'); assert.equal(NV.isEnemyTargetable(enemy),false);
assert.equal(NV.isEnemyDamageable(enemy),false);
assert.equal(NV.getHostileBudget(st).hostiles,1,'el aviso reserva su presupuesto');
st.MAX_HOSTILES=1; assert.equal(NV.spawnEnemy(st),false,'no sobrepasar cap con avisos');
assert.equal(NV.waveClearReady(0,1,1,{total:1}),false,'aviso pendiente impide cerrar');
NV.updateEnemyArrival(enemy,.89,st); assert.equal(enemy.arrival.stage,'warning');
NV.updateEnemyArrival(enemy,.02,st); assert.equal(enemy.arrival.stage,'puff');
assert(!NV.isEnemyCombatActive(enemy));
NV.updateEnemyArrival(enemy,.23,st); assert.equal(enemy.arrival,null); assert(NV.isEnemyTargetable(enemy));
const occupied=state(); NV.spawnEnemy(occupied); const moved=occupied.enemies[0];
occupied.player.x=moved.x; occupied.player.y=moved.y;
NV.updateEnemyArrival(moved,1,occupied);
assert.equal(moved.arrival.stage,'warning'); assert.equal(moved.arrival.remaining,.9);
assert(Math.hypot(moved.x-occupied.player.x,moved.y-occupied.player.y)>100);
NV.updateEnemyArrival(moved,1,occupied); assert.equal(moved.arrival.stage,'puff');
occupied.player.x=moved.x; occupied.player.y=moved.y;
const materializedPosition = { x:moved.x, y:moved.y };
NV.updateEnemyArrival(moved,1,occupied); assert.equal(moved.arrival,null,'el puff no debe teletransportar un cuerpo ya visible');
assert.equal(moved.x,materializedPosition.x); assert.equal(moved.y,materializedPosition.y);
const elites=state(); NV.spawnElite(elites); assert(elites.enemies.length && elites.enemies.every(e=>e.arrival));
const minions=state(); NV.spawnMinion(10,10,minions); assert(minions.enemies[0].arrival);
const lab=state(); lab.announceSpawn=false; NV.spawnEnemy(lab); assert(!lab.enemies[0].arrival,'Lab conserva pruebas inmediatas');
const calls=[]; const ctx=new Proxy({}, {get:(_,key)=>(...args)=>calls.push([key,...args]),set:()=>true});
NV.beginEnemyArrival(moved,{announceSpawn:true});
const before=JSON.stringify(moved); assert(NV.drawEnemyArrival(ctx,moved)); assert.equal(JSON.stringify(moved),before);
assert.equal(calls.filter(c=>c[0]==='moveTo').length,2,'X de dos diagonales');
assert.equal(calls.filter(c=>c[0]==='lineTo').length,2);
assert(!calls.some(c=>c[0]==='arc'||c[0]==='fillText'),'el warning anterior se reemplazó, no se superpuso');
occupied.player.x=450;occupied.player.y=260;
NV.updateEnemyArrival(moved,.91,occupied); assert.equal(moved.arrival.stage,'puff');
calls.length=0; assert.equal(NV.drawEnemyArrival(ctx,moved),false,'el cuerpo se dibuja durante el puff');
assert(calls.filter(c=>c[0]==='arc').length>=6,'nube con centro y lóbulos');
const game=fs.readFileSync('js/game.js','utf8'); assert(game.includes('announceSpawn: !combatLabMode'));
assert(fs.readFileSync('index.html','utf8').includes('js/engine/enemyArrival.js'));
console.log('OK enemy_arrival: aviso, nube, ocupación, IA/daño, caps, victoria y Lab');
