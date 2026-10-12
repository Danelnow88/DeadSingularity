const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const box = { window: { NV: {} }, console, Math, Object, Array, Map, Set, WeakMap };
for (const file of ['js/data/balance.js', 'js/data/gameData.js', 'js/engine/dimensionalThreats.js', 'js/engine/hostileBudget.js', 'js/engine/enemies.js'])
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), box, { filename: file });
const NV = box.window.NV;
function entity(id) { return { enemyTypeId: id, x: 250, y: 250, radius: 13, speed: 65, hp: 30, damage: 12, behavior: 'ranged', dead: false }; }
function state(enemies) { return { enemies, W: 900, H: 520, player: { x: 440, y: 250, hp: 170, radius: 14 }, bullets: [], wave: 4,
  MAX_BULLETS: 30, MAX_ENEMY_BULLETS: 20, enemyBulletCount: () => 0, addFloatText() {},
  applyPlayerDamage(amount, opts) { this.calls = (this.calls || 0) + 1; assert(opts.cause.startsWith('dimensional-')); return { applied: true, killed: false }; } }; }
function step(st, dt = .05, frames = 1) { for (let i = 0; i < frames; i++) { NV.prepareDimensionalThreats(st); for (const e of st.enemies) NV.updateDimensionalThreat(e, dt, st, 60); } }
for (const id of Object.keys(NV.DIMENSIONAL_THREATS)) {
  const e = entity(id), st = state([e]); step(st, .05, 8);
  assert.equal(e.dimensionalThreat.phase, 'windup'); assert(!st.calls, 'preparación hace daño');
  const snapshot = JSON.stringify(e.dimensionalThreat.geometry);
  st.player.x += 30; step(st, .05, 3);
  if(id!=='dimension_sniper')assert.equal(JSON.stringify(e.dimensionalThreat.geometry), snapshot, 'zona persigue al jugador');
  else assert.notEqual(JSON.stringify(e.dimensionalThreat.geometry),snapshot,'tirador no ajusta el apuntado');
  for (let i = 0; i < 160 && e.dimensionalThreat.phase !== 'position'; i++) step(st);
  assert.equal(e.dimensionalThreat.phase, 'position', 'ciclo no libera geometría');
  assert.equal(e.dimensionalThreat.geometry, null);
}
{
  const e = entity('rift_weaver'), st = state([e]); step(st, .05, 8);
  const g=e.dimensionalThreat.geometry,start={x:e.x,y:e.y};step(st,.05,23);
  assert(Math.hypot(e.x-start.x,e.y-start.y)>50,'no recorre físicamente la costura');
  assert(e.dimensionalThreat.weaveProgress>0 && e.dimensionalThreat.weaveProgress<1);
  assert(!st.calls,'construcción hace daño');step(st,.05,20);
  assert.equal(e.dimensionalThreat.phase,'active');
  st.player.x=(g.ax+g.bx)/2;st.player.y=(g.ay+g.by)/2;step(st,.05,1);
  assert.equal(st.calls,1,'costura completa no daña');step(st,.05,3);assert.equal(st.calls,1,'daño por frame');
  const other = entity('dimension_sniper'), busy = state([e, other]);
  e.dimensionalThreat = null; step(busy, .05, 32);
  assert.equal([e, other].filter(x => ['windup','active'].includes(x.dimensionalThreat.phase)).length, 2, 'costura silencia francotirador');
}
{
  const e = entity('void_devourer'), st = state([e]); step(st, .05, 8); step(st, .05, 29);
  assert.equal(e.dimensionalThreat.phase, 'active'); assert(!st.calls, 'núcleo seguro no es seguro');
  const g = e.dimensionalThreat.geometry, first = g.inner;
  st.player.x = g.x + g.outer - 4; st.player.y = g.y; step(st, .05, 20);
  assert(g.inner < first); assert(st.calls <= 2, 'daño por frame');
  e.dead = true; const calls = st.calls; step(st, .05, 30); assert.equal(st.calls, calls, 'zona persiste al morir');
}
{
  const e = entity('dimension_sniper'), st = state([e]); step(st, .05, 8);
  const g = e.dimensionalThreat.geometry;
  assert(Math.hypot(st.player.x - g.ax, st.player.y - g.ay) >= 100);
  step(st, .05, 21); assert(!st.calls, 'aguja hace daño antes de viajar hasta el jugador');
  step(st, .05, 12); assert.equal(st.calls, 1, 'disparo no conecta o duplica daño');
}
{
  const st = state([entity('rift_weaver'), entity('void_devourer')]);
  assert(!NV.dimensionalSpawnAllowed({ id: 'dimension_sniper' }, st));
  assert(!NV.dimensionalSpawnAllowed({ id: 'rift_weaver' }, st));
  st.enemies[1].dead = true; assert(NV.dimensionalSpawnAllowed({ id: 'dimension_sniper' }, st));
  st.boss = { dead: false }; assert(!NV.dimensionalSpawnAllowed({ id: 'dimension_sniper' }, st));
  st.enemies[0].arrival = { stage: 'warning' }; step(st); assert(!st.enemies[0].dimensionalThreat);
}
{
  const e = entity('rift_weaver'), st = state([e]); step(st, .05, 8);
  e.stun = 1; NV.prepareDimensionalThreats(st); assert.equal(e.dimensionalThreat.geometry, null);
  assert(NV.dimensionalLineHits({ ax: 300, ay: 100, bx: 300, by: 400 }, 350, 250, 250, 250, 14));
  assert(!NV.dimensionalLineHits({ ax: 300, ay: 100, bx: 300, by: 400 }, 350, 450, 250, 450, 14));
}
// Producción: ninguna de las tres identidades cae en ranged/contacto genérico.
for (const id of Object.keys(NV.DIMENSIONAL_THREATS)) {
  const e = entity(id), st = state([e]); st.player.x = e.x;
  NV.updateEnemies(.05, st); assert(!e.dead); assert.equal(st.bullets.length, 0);
  assert.equal(e.dimensionalThreat.phase, 'position');
}
{
  const st = state([entity('rift_weaver'), entity('dimension_sniper'), entity('void_devourer')]);
  for (let i = 0; i < 400; i++) {
    NV.updateEnemies(.025, st);
    const busy = st.enemies.filter(e => e.dimensionalThreat && e.dimensionalThreat.kind !== 'snipe'
      && ['windup', 'active'].includes(e.dimensionalThreat.phase));
    assert(busy.length <= 1, 'dos zonas persistentes simultáneas');
  }
}
for (const fps of [30, 60, 120]) {
  const e = entity('rift_weaver'), st = state([e]);step(st,1/fps,Math.ceil(fps*.4));
  const g=e.dimensionalThreat.geometry;st.player.x=(g.ax+g.bx)/2;st.player.y=(g.ay+g.by)/2;
  step(st,1/fps,fps*3);assert(st.calls>=2 && st.calls<=3,'cadencia acotada a FPS='+fps);
  const before = JSON.stringify(e); step(st, 0); assert.equal(JSON.stringify(e), before);
}
{
  const e = entity('rift_weaver'), st = state([e]);
  st.threatView = { x: 360, y: 0, width: 540, height: 520 };
  step(st, .05, 60); assert.equal(e.dimensionalThreat.phase, 'position', 'ataque iniciado fuera de cámara');
}
vm.runInNewContext(fs.readFileSync('js/render/dimensionalThreats.js', 'utf8'), box);
const context = new Proxy({}, { get: (_, key) => key === 'canvas' ? {} : () => {}, set: () => true });
for (const id of Object.keys(NV.DIMENSIONAL_THREATS)) {
  const e = entity(id), st = state([e]); e.color = '#abcdef';
  step(st, .05, 8);
  const before = JSON.stringify(st.enemies);
  NV.drawDimensionalThreatFields(context, st.enemies); assert(NV.drawDimensionalThreatBody(context, e));
  assert.equal(JSON.stringify(st.enemies), before, 'renderer muta IA');
  step(st,.025,80);const activeBefore=JSON.stringify(st.enemies);
  NV.drawDimensionalThreatFields(context,st.enemies);NV.drawDimensionalThreatBody(context,e);
  assert.equal(JSON.stringify(st.enemies),activeBefore,'renderer activo muta IA');
  e.dead = true; NV.drawDimensionalThreatFields(context, st.enemies);
}
{
  const oldMath = box.Math; box.Math = Object.create(Math); box.Math.random = () => 0;
  const st = state([]); Object.assign(st, { ENEMY_TYPES: NV.ENEMY_TYPES, MAX_HOSTILES: 30, MAX_HEAVY_HOSTILES: 7 });
  for (let i = 0; i < 12; i++) NV.spawnEnemy(st);
  assert.equal(st.enemies.filter(e => NV.isDimensionalThreat(e)).length, 2, 'pool natural excede cap');
  const weaver = st.enemies.find(e => e.enemyTypeId === 'rift_weaver');
  weaver.arrival = { stage: 'warning' };
  NV.spawnEnemy(st); assert.equal(st.enemies.filter(e => NV.isDimensionalThreat(e)).length, 2, 'aviso no reserva slot');
  weaver.dead = true; NV.spawnEnemy(st);
  assert.equal(st.enemies.filter(e => !e.dead && e.enemyTypeId === 'rift_weaver').length, 1, 'slot no liberado');
  box.Math = oldMath;
}
{
  const e = entity('void_devourer'), st = state([e]); step(st, .025, 220);
  assert(st.calls > 0, 'quedarse inmóvil en el núcleo evita toda la compresión');
}
for (const id of ['rift_weaver','dimension_sniper']) {
  const e = entity(id), st = state([e]); step(st,.05,8);
  if(id==='dimension_sniper')while(!e.dimensionalThreat.locked)step(st,.01);
  st.player.x = 650; st.player.y = 450; step(st,.025,120);
  assert(!st.calls,'esquivar antes del ataque no funciona: '+id);
}
{
  const e = entity('rift_weaver'), st = state([e]); step(st,.05,8);
  const original = JSON.stringify(e.dimensionalThreat.geometry);
  step(st,.05,40);assert.equal(JSON.stringify(e.dimensionalThreat.geometry),original,'la zona se mueve después de tejida');
  assert(e.dimensionalThreat.phase==='active');
}
{
  const e=entity('dimension_sniper'),st=state([e]);step(st,.01,40);
  for(let i=0;i<85;i++){st.player.x+=1;step(st,.01);}
  const s=e.dimensionalThreat;assert(!s.locked,'bloqueo prematuro');
  assert(s.geometry.targetX>st.player.x,'no anticipa el movimiento');
  while(!s.locked){st.player.x+=1;step(st,.01);}
  assert(s.elapsed>=.97 && s.elapsed<1.0,'bloqueo no está a 180 ms');
  const locked=JSON.stringify(s.geometry);st.player.y+=100;step(st,.01,15);
  assert.equal(JSON.stringify(s.geometry),locked,'el disparo bloqueado sigue al jugador');
}
{
  const e=entity('rift_weaver'),st=state([e]);e.x=700;e.y=450;st.player.x=880;st.player.y=500;step(st,.05,8);
  const g=e.dimensionalThreat.geometry;
  assert(!NV.dimensionalLineHits(g,st.player.x,st.player.y,st.player.x,st.player.y,st.player.radius+g.halfWidth+20),'costura nace sobre jugador junto a pared');
  step(st,.05,34);st.player.x=(g.ax+g.bx)/2;st.player.y=(g.ay+g.by)/2;
  let damage;st.applyPlayerDamage=amount=>{damage=amount;return {applied:true,killed:false};};step(st);
  assert.equal(damage,e.damage*2.2);
  e.stun=1;step(st);assert.equal(e.dimensionalThreat.geometry,null,'stun no desmonta costura activa');
}
{
  const alone=state([entity('dimension_sniper')]),crowd=state([entity('dimension_sniper'),{enemyTypeId:'drone',x:430,y:250},{enemyTypeId:'tank',x:420,y:250}]);
  for(let i=0;i<6;i++){NV.prepareDimensionalThreats(alone);NV.updateDimensionalThreat(alone.enemies[0],.05,alone,60);
    NV.prepareDimensionalThreats(crowd);NV.updateDimensionalThreat(crowd.enemies[0],.05,crowd,60);}
  assert.equal(crowd.enemies[0].dimensionalThreat.phase,'windup','no coordina con presión básica');
  assert.equal(alone.enemies[0].dimensionalThreat.phase,'position');
  assert.equal(crowd.enemies[2].x,420,'sinergia modifica tanque');
}
{
  const e=entity('dimension_sniper'),st=state([e]);step(st,.05,8);
  assert.equal(e.dimensionalThreat.phase,'windup');
  st.temporalShots={held:true,controlDt:.05};
  const charge=e.dimensionalThreat.elapsed;step(st,.0275,1);
  assert(Math.abs(e.dimensionalThreat.elapsed-charge-.05)<1e-9,'slow travel also delayed visible preparation');
  for(let i=0;i<30&&e.dimensionalThreat.phase!=='active';i++)step(st,.0275,1);
  assert.equal(e.dimensionalThreat.phase,'active');
  const slowStart=e.dimensionalThreat.elapsed;step(st,.0275,1);
  assert(Math.abs(e.dimensionalThreat.elapsed-slowStart-.0275*.15)<1e-9,'sniper needles ignore inertia');
  st.temporalShots={held:false,controlDt:.05};
  const released=e.dimensionalThreat.elapsed;step(st,.05,1);
  assert(Math.abs(e.dimensionalThreat.elapsed-released-.05)<1e-9,'sniper did not resume normal travel');
}
console.log('PASS dimensional threats: tejido físico, rutas, daño acotado, predicción/bloqueo, zonas, sinergia, muerte, stun, pausa, FPS, preparación/viaje temporal y render puro');
