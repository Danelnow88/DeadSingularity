const fs = require('fs'), vm = require('vm');
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('  ok  ' + name); } catch (e) { fail++; console.log('  FAIL ' + name + ' -> ' + e.message); } }
function load(file, sbx) { vm.runInNewContext(fs.readFileSync(file, 'utf8'), sbx, { filename: file }); }
function setup() {
  const math = Object.create(Math); math.random = () => 0.25;
  const sbx = { window: { NV: {} }, console, Math: math, Object, Array, Set, Map, WeakSet };
  for (const file of ['js/data/balance.js', 'js/data/gameData.js', 'js/render/spectralEnemies2D.js', 'js/engine/enemies.js', 'js/engine/bullets.js']) load(file, sbx);
  const NV = sbx.window.NV;
  NV.hitSlowFor = () => ({ activeDuration: 0, immunity: 0, multiplier: 1 });
  NV.bossHitReaction = () => {};
  return NV;
}
function spawnHydra(NV) {
  const enemies = [];
  NV.spawnElite({ enemies, MAX_ENEMIES: 30, MAX_HOSTILES: 30, MAX_HEAVY_HOSTILES: 7, boss: null, wave: 3, W: 900, H: 520, ELITE_TYPES: NV.ELITE_TYPES, waveEvent: null });
  if (!enemies[0]) throw new Error('Hydra no spawneó');
  return enemies[0];
}
function bulletState(bullet, enemy) {
  return {
    bullets: [bullet], W: 900, H: 520, player: { x: -500, y: -500, character: 'boti', invuln: 0 }, enemies: [enemy], boss: null,
    CHARACTERS: { boti: { size: 20 } }, SHIELD_COOLDOWN: 1,
    applyPlayerDamage() { return { applied: false }; }, addFloatText() {}, killEnemy(e) { e.dead = true; }, applyKnockback() {}, spawnExplosion() {},
  };
}
function enemyState(enemy, player, applyPlayerDamage) {
  return {
    enemies: [enemy], player, bullets: [], MAX_BULLETS: 10, MAX_ENEMY_BULLETS: 10, enemyBulletCount() { return 0; },
    applyPlayerDamage, addFloatText() {}, spawnExplosion() {}, onKill() {}, wave: 3, waveEvent: null, boss: null,
    MAX_HOSTILES: 30, MAX_HEAVY_HOSTILES: 7,
  };
}

t('radio físico Hydra final = radio de datos × factor RB6 × 0.65; stats semánticos intactos', () => {
  const NV = setup(), e = spawnHydra(NV);
  const base = NV.ELITE_TYPES.find((type) => (e.enemyTypeId && type.id === e.enemyTypeId) || (e.visualId && type.visualId === e.visualId));
  if (!base) throw new Error('definición base no encontrada para ' + (e.enemyTypeId || e.visualId));
  const expected = base.radius * (0.85 / 0.8) * 0.65;
  if (Math.abs(e.radius - expected) > 0.001) throw new Error('radius=' + e.radius + ' expected=' + expected);
  const expectedDamage = (base.damage + Math.min(80, Math.round(3 * 2))) * 0.8;
  if (e.hp !== Math.round((base.hp + 3 * 3 * 1.5) * 0.85) || e.speed !== base.speed + 3 || e.damage !== expectedDamage) throw new Error('HP/speed/damage cambiaron');
  const src = fs.readFileSync('js/engine/enemies.js', 'utf8');
  for (const invariant of ['const FUSION_RADIUS = 40', 'const SPIT_FAR = 320', 'const SPIT_NEAR = 180', 'dist < 130']) if (!src.includes(invariant)) throw new Error('rango semántico alterado: ' + invariant);
});

t('proyectil atraviesa el antiguo shell Hydra pero impacta el cuerpo nuevo', () => {
  const NV = setup(), outer = spawnHydra(NV), oldRadius = outer.radius / 0.65;
  outer.x = 100; outer.y = 100; outer.hp = 100; outer.maxHp = 100;
  const shellDistance = outer.radius + 5;
  if (!(shellDistance < oldRadius)) throw new Error('punto no está dentro del shell anterior');
  let r = NV.updateBullets(0, bulletState({ x: 100 + shellDistance, y: 100, vx: 0, vy: 0, damage: 10, dead: false, isEnemy: false, pierce: 1 }, outer));
  if (outer.hp !== 100 || r.bullets.length !== 1) throw new Error('shell anterior todavía colisiona');
  const body = spawnHydra(NV); body.x = 100; body.y = 100; body.hp = 100; body.maxHp = 100;
  r = NV.updateBullets(0, bulletState({ x: 100 + body.radius, y: 100, vx: 0, vy: 0, damage: 10, dead: false, isEnemy: false, pierce: 1 }, body));
  if (body.hp !== 90 || r.bullets.length !== 0) throw new Error('borde visible no colisiona');
});

t('contacto del jugador usa el nuevo radio y no conserva shell invisible ni hueco interior', () => {
  const NV = setup(), miss = spawnHydra(NV), oldRadius = miss.radius / 0.65;
  miss.x = 100; miss.y = 100; miss.speed = 0; miss.behavior = 'chase'; miss.contactCd = 0;
  let hits = 0;
  const missDistance = miss.radius + 22;
  if (!(missDistance < oldRadius + 20)) throw new Error('punto no está dentro del contacto anterior');
  NV.updateEnemies(0, enemyState(miss, { x: 100 + missDistance, y: 100, invuln: 0, stun: 0 }, () => { hits++; return { applied: true }; }));
  if (hits !== 0 || miss.dead) throw new Error('shell de contacto anterior persiste');
  const hit = spawnHydra(NV); hit.x = 100; hit.y = 100; hit.speed = 0; hit.behavior = 'chase'; hit.contactCd = 0;
  NV.updateEnemies(0, enemyState(hit, { x: 100 + hit.radius + 19, y: 100, invuln: 0, stun: 0 }, () => { hits++; return { applied: true, killed: false }; }));
  if (hits !== 1 || !hit.dead) throw new Error('hueco dentro del contacto nuevo');
});

t('separación deriva del nuevo cuerpo; no empuja como si ocupara el radio anterior', () => {
  const NV = setup(), a = spawnHydra(NV), b = spawnHydra(NV);
  a.x = 100; a.y = 100; b.x = 100 + (a.radius + b.radius + 7); b.y = 100;
  for (const e of [a, b]) { e.speed = 0; e.behavior = 'chase'; e.contactCd = 0; }
  const before = [a.x, b.x];
  const st = enemyState(a, { x: 800, y: 500, invuln: 0, stun: 0 }, () => ({ applied: false })); st.enemies = [a, b];
  NV.updateEnemies(0.016, st);
  if (Math.abs(a.x - before[0]) > 0.0001 || Math.abs(b.x - before[1]) > 0.0001) throw new Error('separación conserva huella antigua');
});

t('fusión conserva radio semántico fijo y crecimiento físico parte del nuevo tamaño', () => {
  const NV = setup(), enemies = [spawnHydra(NV), spawnHydra(NV), spawnHydra(NV)];
  enemies.forEach((e, i) => { e.x = 100 + i * 10; e.y = 100; e.speed = 0; e.behavior = 'chase'; e.contactCd = 0; });
  const baseRadius = enemies[0].radius;
  const st = enemyState(enemies[0], { x: 800, y: 500, invuln: 0, stun: 0 }, () => ({ applied: false })); st.enemies = enemies;
  const result = NV.updateEnemies(0, st);
  if (result.enemies.length !== 1 || result.enemies[0].fusionLevel !== 1) throw new Error('fusión semántica cambió');
  if (Math.abs(result.enemies[0].radius - baseRadius * 1.36) > 0.001) throw new Error('crecimiento no parte del cuerpo nuevo');
});

t('FULL y CHEAP comparten exactamente la misma huella física', () => {
  const NV = setup(), e = spawnHydra(NV), radius = e.radius;
  NV.setHydraDiagnosticMode('cheap');
  if (e.radius !== radius || NV.labModelHitboxFactor(5) !== (0.85 / 0.8) * 0.65) throw new Error('diagnóstico alteró física');
});

t('no-Hydra: tabla RB5 intacta; specter_guard spawnea con body scale ×0.65', () => {
  const NV = setup();
  if (NV.labModelHitboxFactor(4) !== 0.82 / 0.8 || NV.labModelVisualRadius(4) !== 42 * 0.82) throw new Error('RB5 alterado');
  const type = NV.ENEMY_TYPES.find((entry) => entry.id === 'specter_guard'), out = [];
  NV.spawnEnemy({ enemies: out, MAX_ENEMIES: 20, boss: null, wave: 25, ENEMY_TYPES: [type], W: 900, H: 520, forceTypeId: 'specter_guard' });
  // El ×0.65 corporal de los cinco espectros es POR enemyTypeId: el modelo RB5
  // no cambia, la entidad spawnea con su factor de modelo × 0.65.
  if (!out[0] || Math.abs(out[0].radius - type.radius * 1.025 * 0.65) > 0.001) throw new Error('hitbox del espectro no aplicó ×0.65');
  if (Math.abs(out[0].radius - 11.9925) > 0.001) throw new Error('radius=' + out[0].radius);
});

console.log('RESULT hydra_size_collision: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);