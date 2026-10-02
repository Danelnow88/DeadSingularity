// BLOCK 3A — atribución factual de progreso al arma que causa el daño letal.
const fs = require('fs'), vm = require('vm'), assert = require('assert');
let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log('  ok  ' + name); }
  catch (e) { fail++; console.log('  FAIL ' + name + ' -> ' + e.message); }
}

function load() {
  const sbx = { window: { NV: {} }, console, Math, Number, Object, Array, JSON, Set, WeakMap };
  for (const file of [
    'js/data/balance.js', 'js/data/gameData.js', 'js/data/consumables.js',
    'js/engine/fx.js', 'js/engine/enemies.js', 'js/engine/boss.js',
    'js/engine/bullets.js', 'js/engine/flame.js', 'js/engine/meteors.js',
    'js/engine/drones.js', 'js/engine/special.js', 'js/engine/consumables.js',
  ]) vm.runInNewContext(fs.readFileSync(file, 'utf8'), sbx, { filename: file });
  const NV = sbx.window.NV;
  NV.hitSlowFor = NV.hitSlowFor || (() => ({ activeDuration: 0, immunity: 0 }));
  NV.bossHitReaction = NV.bossHitReaction || (() => {});
  return NV;
}

function enemy(hp, x, y) {
  return { x: x == null ? 100 : x, y: y == null ? 100 : y, radius: 10,
    hp, maxHp: hp, score: 10, xp: 0, color: '#fff', dead: false, resist: 0 };
}

function progression(NV, equippedId) {
  const state = {
    score: 0,
    player: { x: -1000, y: -1000, xp: 0, xpToNext: 100, level: 1, maxHp: 100, hp: 100, luck: 0, permGreed: 0, bounty: 0 },
    weaponLevels: {}, weaponKills: {}, currentWeapon: NV.weaponById(equippedId || 'plasma'),
    WEAPON_KILLS_PER_LEVEL: NV.BALANCE.WEAPON_KILLS_PER_LEVEL,
    weaponKillProgress: () => 1,
    addFloatText() {}, spawnExplosion() {}, triggerFlash() {},
    sfx: { enemyDeath() {}, levelup() {}, fuse() {} }, pickups: [], waveEvent: null,
    applyPlayerDamage: () => ({ killed: false }), W: 900,
  };
  state.kill = (e, source) => {
    state.score = NV.killEnemy(Object.assign({}, state, { e, damageSource: source }));
  };
  return state;
}

function bulletStep(NV, p, bullet, enemies) {
  return NV.updateBullets(0, {
    bullets: [bullet], W: 900, H: 520,
    player: p.player, enemies, boss: null, CHARACTERS: NV.CHARACTERS, SHIELD_COOLDOWN: 0.9,
    applyPlayerDamage: () => ({ applied: false }), addFloatText() {},
    killEnemy: p.kill, applyKnockback() {}, spawnExplosion() {},
  });
}

t('proyectil en vuelo acredita al arma A aunque B esté equipada', () => {
  const NV = load(), p = progression(NV, 'plasma'), e = enemy(10);
  bulletStep(NV, p, { x: 100, y: 100, vx: 0, vy: 0, damage: 10, wid: 'pistol',
    isEnemy: false, dead: false, pierce: 1, hitTargets: [] }, [e]);
  assert.strictEqual(p.weaponKills.pistol, 1);
  assert.strictEqual(p.weaponKills.plasma, undefined);
});

t('boss minion migrado acredita al arma causal por la ruta genérica', () => {
  const NV = load(), p = progression(NV, 'plasma'), enemies = [];
  const st = { enemies, boss: null, MAX_HOSTILES: 30, MAX_HEAVY_HOSTILES: 7, wave: 1, ENEMY_TYPES: NV.ENEMY_TYPES };
  assert.strictEqual(NV.spawnMinion(100, 100, st), true);
  const e = enemies[0];
  bulletStep(NV, p, { x: 100, y: 100, vx: 0, vy: 0, damage: e.hp, wid: 'pistol',
    isEnemy: false, dead: false, pierce: 1, hitTargets: [] }, enemies);
  assert.strictEqual(e.enemyTypeId, 'boss_minion');
  assert.strictEqual(p.weaponKills.pistol, 1);
  assert.strictEqual(p.weaponKills.plasma, undefined);
  assert.strictEqual(p.score, 8);
});

t('Plasma directo acredita Plasma', () => {
  const NV = load(), p = progression(NV, 'pistol'), e = enemy(10);
  bulletStep(NV, p, { x: 100, y: 100, vx: 0, vy: 0, damage: 10, wid: 'plasma',
    impactType: 'splash', splashRadius: 40, isEnemy: false, dead: false, pierce: 1, hitTargets: [] }, [e]);
  assert.strictEqual(p.weaponKills.plasma, 1);
});

t('Plasma splash acredita Plasma', () => {
  const NV = load(), p = progression(NV, 'pistol'), direct = enemy(100), splash = enemy(10, 130, 100);
  bulletStep(NV, p, { x: 100, y: 100, vx: 0, vy: 0, damage: 10, wid: 'plasma', color: '#a855f7',
    impactType: 'splash', splashRadius: 40, isEnemy: false, dead: false, pierce: 1, hitTargets: [] }, [direct, splash]);
  assert.strictEqual(p.weaponKills.plasma, 1);
});

t('pellet de Shotgun acredita Shotgun', () => {
  const NV = load(), p = progression(NV, 'pistol'), e = enemy(5);
  bulletStep(NV, p, { x: 100, y: 100, vx: 0, vy: 0, damage: 5, wid: 'shotgun',
    impactType: 'pellet', shotGroup: { targets: [], cap: 3 }, isEnemy: false, dead: false, pierce: 1, hitTargets: [] }, [e]);
  assert.strictEqual(p.weaponKills.shotgun, 1);
});

t('impacto inicial de Bow acredita Bow', () => {
  const NV = load(), p = progression(NV, 'plasma'), e = enemy(10);
  bulletStep(NV, p, { x: 100, y: 100, vx: 0, vy: 0, damage: 10, wid: 'bow',
    impactType: 'bounce', bounceLeft: 0, splashRadius: 180, isEnemy: false, dead: false, pierce: 1, hitTargets: [] }, [e]);
  assert.strictEqual(p.weaponKills.bow, 1);
});

t('rebote tardío de Bow conserva Bow tras cambio de arma', () => {
  // `second` muere con el rebote: HP por debajo del 8.5 (daño de rebote1) para
  // que la atribución de la baja siga siendo lo que se prueba, no la cantidad.
  const NV = load(), p = progression(NV, 'pistol'), first = enemy(100), second = enemy(8, 130, 100);
  const bullet = { x: 100, y: 100, vx: 0, vy: 0, damage: 10, wid: 'bow', impactType: 'bounce',
    bounceLeft: 1, splashRadius: 180, isEnemy: false, dead: false, pierce: 1, hitTargets: [] };
  let result = bulletStep(NV, p, bullet, [first, second]);
  p.currentWeapon = NV.weaponById('plasma');
  result = NV.updateBullets(0, {
    bullets: result.bullets, W: 900, H: 520, player: p.player, enemies: [first, second], boss: null,
    CHARACTERS: NV.CHARACTERS, SHIELD_COOLDOWN: 0.9, applyPlayerDamage: () => ({ applied: false }),
    addFloatText() {}, killEnemy: p.kill, applyKnockback() {}, spawnExplosion() {},
  });
  assert.strictEqual(result.bullets.length, 0);
  // Atribución: la baja sigue acreditándose al Bow, el arma que reveló la cadena.
  if (p.weaponKills.bow !== 1) throw new Error('bowKills=' + JSON.stringify(p.weaponKills));
  if (p.weaponKills.plasma !== undefined) throw new Error('atribución errónea a plasma');
});

t('tick directo de Flamethrower acredita Flamethrower', () => {
  const NV = load(), p = progression(NV, 'plasma'), e = enemy(10, 150, 100);
  const z = NV.createFlameZone({ x: 100, y: 100, angle: 0, range: 170, damage: 10, burnDamage: 2, burnDuration: 1 });
  NV.flameZoneDamage(z, { enemies: [e], boss: null, killEnemy: p.kill, addFloatText() {}, applyKnockback() {} });
  assert.strictEqual(p.weaponKills.flamethrower, 1);
  assert.strictEqual(p.weaponKills.plasma, undefined);
});

t('burn tardío conserva Flamethrower tras cambio de arma', () => {
  const NV = load(), p = progression(NV, 'pistol'), e = enemy(5);
  NV.applyBurn(e, 5, 2, 'flamethrower');
  p.currentWeapon = NV.weaponById('plasma');
  NV.updateBurns(1, { enemies: [e], boss: null, killEnemy: p.kill });
  assert.strictEqual(p.weaponKills.flamethrower, 1);
  assert.strictEqual(p.weaponKills.plasma, undefined);
});

t('NOVA detonation no acredita el arma equipada', () => {
  const NV = load(), p = progression(NV, 'plasma'), e = enemy(5);
  e.phaseAcc = 20;
  NV.detonatePhase(p.player, [e], null, [], { killEnemy: p.kill, addFloatText() {}, spawnExplosion() {}, triggerFlash() {} });
  assert.deepStrictEqual(p.weaponKills, {});
});

t('meteor no acredita el arma equipada', () => {
  const NV = load(), p = progression(NV, 'plasma'), e = enemy(40);
  NV.updateMeteors(0, [{ x: 100, y: 100, vx: 0, vy: 0, radius: 10, color: '#fff', dead: false }],
    { H: 520, enemies: [e], boss: null, shake: 0 },
    { killEnemy: p.kill, applyKnockback() {}, spawnExplosion() {} });
  assert.deepStrictEqual(p.weaponKills, {});
});

t('drone no acredita el arma equipada', () => {
  const NV = load(), p = progression(NV, 'plasma'), e = enemy(15), bullets = [];
  const drones = [{ angle: 0, orbitRadius: 0, speed: 0, fireTimer: 0, life: 1, color: '#fff', dead: false }];
  NV.updateDrones(0, drones, { x: 100, y: 100 }, bullets, 10, [e], null, 300);
  bulletStep(NV, p, bullets[0], [e]);
  assert.deepStrictEqual(p.weaponKills, {});
});

t('proyectil hostil reflejado no acredita aunque conserve wid', () => {
  const NV = load(), p = progression(NV, 'plasma'), e = enemy(30);
  bulletStep(NV, p, { x: 100, y: 100, vx: 0, vy: 0, damage: 30, wid: 'pistol', reflected: true,
    isEnemy: false, dead: false, pierce: 1, hitTargets: [] }, [e]);
  assert.deepStrictEqual(p.weaponKills, {});
});

t('Void Bomb no acredita el arma equipada', () => {
  const NV = load(), p = progression(NV, 'plasma'), e = enemy(40);
  NV.voidBomb([e], null, p.kill);
  assert.deepStrictEqual(p.weaponKills, {});
});

t('fuente ausente o weaponId desconocido no acredita', () => {
  const NV = load(), p = progression(NV, 'plasma');
  p.kill(enemy(1));
  p.kill(enemy(1), { kind: 'weapon', weaponId: 'not-a-weapon', mode: 'direct' });
  assert.deepStrictEqual(p.weaponKills, {});
});

t('cantidad y umbral existentes se conservan para una baja válida', () => {
  const NV = load(), p = progression(NV, 'plasma'), levels = [];
  p.weaponKills.pistol = NV.BALANCE.WEAPON_KILLS_PER_LEVEL - 1;
  p.weaponKillProgress = () => 1;
  p.sfx.fuse = (level) => levels.push(level);
  p.kill(enemy(1), { kind: 'weapon', weaponId: 'pistol', mode: 'direct' });
  assert.strictEqual(p.weaponKills.pistol, NV.BALANCE.WEAPON_KILLS_PER_LEVEL);
  assert.strictEqual(p.weaponLevels.pistol, 2);
  assert.deepStrictEqual(levels, [2]);
});

console.log('RESULT weapon_progression_attribution: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);