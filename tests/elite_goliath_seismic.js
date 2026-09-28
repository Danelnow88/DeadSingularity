// ===== TEST: elite_titan / Goliath sísmico territorial =====
const fs = require('fs'), vm = require('vm');
let pass = 0, fail = 0, assertions = 0;
function ok(value, message) { assertions++; if (!value) throw new Error(message); }
function near(actual, expected, label, eps) { assertions++; if (Math.abs(actual - expected) > (eps == null ? 1e-6 : eps)) throw new Error(label + '=' + actual + ' expected=' + expected); }
function t(name, fn) { try { fn(); pass++; console.log('  ok  ' + name); } catch (err) { fail++; console.log('  FAIL ' + name + ' -> ' + err.message); } }

function setup(randomValue) {
  const math = Object.create(Math);
  math.random = () => randomValue == null ? 0 : randomValue;
  const sandbox = { window: { NV: {} }, console, Math: math, Number, Object, Array, Set, Map, WeakMap, JSON };
  ['js/data/balance.js', 'js/data/gameData.js', 'js/engine/playerStun.js', 'js/engine/enemies.js'].forEach((file) => {
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
  });
  return { NV: sandbox.window.NV, math };
}
function goliath(x, y) {
  return {
    x, y, hp: 210, maxHp: 210, speed: 25, radius: 36, color: '#ff1493', shape: 'rock',
    score: 100, xp: 100, behavior: 'chase', damage: 35, eliteDamage: 35, visualId: 'elite_titan',
    isElite: true, hostileClass: 'heavy', dead: false, knockVelX: 0, knockVelY: 0,
    knockbackRes: 0.3, contactCd: 0, hitFlash: 0, hitSlowUntil: 0, hitSlowImmunity: 0,
    stun: 0, stunChance: 0.35, stunDuration: 1.0, resist: 3,
  };
}
function player(x, y) { return { x, y, radius: 20, hp: 500, maxHp: 500, invuln: 0, stun: 0, stunReapplyLockout: 0 }; }
function state(enemies, target, hitFn, onKill) {
  return {
    enemies, player: target, bullets: [], W: 900, H: 520, wave: 20, waveEvent: null,
    MAX_BULLETS: 200, MAX_ENEMY_BULLETS: 40, MAX_HOSTILES: 30, MAX_HEAVY_HOSTILES: 7,
    enemyBulletCount: () => 0,
    applyPlayerDamage: hitFn || (() => ({ applied: false, dodged: false, killed: false })),
    addFloatText: () => {}, spawnExplosion: () => {}, onKill: onKill || (() => {}), boss: null, hookSystem: null,
  };
}
function init(NV, e, target, st) { NV.updateEnemies(0, st || state([e], target)); }

console.log('elite_goliath_seismic:');

t('1-7. configuración, cooldown inicial, trigger y posicionamiento 118-138 / retreat 0.35x', () => {
  const { NV } = setup(), cfg = NV.ELITE_GOLIATH_SEISMIC;
  near(cfg.triggerRange, 130, 'trigger'); near(cfg.slamRadius, 145, 'slam radius'); near(cfg.windup, 0.35, 'windup'); near(cfg.aftershockDelay, 1.5, 'aftershock delay');
  near(cfg.holdMin, 118, 'hold min'); near(cfg.holdMax, 138, 'hold max'); near(cfg.retreatRange, 108, 'retreat'); near(cfg.retreatSpeedMult, 0.35, 'retreat mult');
  const target = player(300, 100), e = goliath(100, 100), st = state([e], target);
  init(NV, e, target, st);
  ok(e.goliathState === 'approach', 'initial state'); near(e.goliathAttackCooldown, 0.75, 'initial cooldown');
  NV.updateEnemies(0.1, st); ok(e.goliathState === 'approach', 'attacked outside 130'); ok(e.x > 100, 'did not approach beyond 138');
  e.x = 172; e.goliathAttackCooldown = 0.5; const holdX = e.x; NV.updateEnemies(0.1, st); near(e.x, holdX, 'hold band');
  e.x = 200; e.goliathAttackCooldown = 2; const retreatX = e.x; NV.updateEnemies(1, st); near(e.x, retreatX - 25 * 0.35, 'retreat distance');
  e.x = 187; e.goliathAttackCooldown = 0.5; const correctionX = e.x; NV.updateEnemies(0.1, st); ok(e.x < correctionX && e.x > correctionX - 0.875, '108-118 correction');
  e.x = 170; e.goliathAttackCooldown = 0; NV.updateEnemies(0, st); ok(e.goliathState === 'slam_windup', 'no windup at 130'); near(e.goliathStateTimer, 0.35, 'windup timer');
  const windupX = e.x, windupY = e.y; NV.updateEnemies(0.2, st); near(e.x, windupX, 'windup x'); near(e.y, windupY, 'windup y');
});

t('8-20. slam y aftershock resuelven una vez, usan origen fijo, daño/radios y stun contractual', () => {
  const { NV, math } = setup(0); const cfg = NV.ELITE_GOLIATH_SEISMIC;
  const target = player(100, 100), e = goliath(100, 100); const hits = []; let stunRolls = 0;
  math.random = () => { stunRolls++; return 0; };
  const st = state([e], target, (damage, opts) => { hits.push({ damage, cause: opts.cause }); return { applied: true, dodged: false, killed: false, crit: false }; });
  init(NV, e, target, st); e.goliathAttackCooldown = 0; NV.updateEnemies(0, st);
  NV.updateEnemies(0.35, st);
  ok(hits.length === 1 && hits[0].cause === 'goliath-seismic-slam', 'primary count/cause'); near(hits[0].damage, e.eliteDamage, 'primary damage');
  ok(stunRolls === 1, 'primary stun rolls'); near(target.stun, 1.0, 'stun duration'); near(e.stunChance, 0.35, 'stun chance');
  ok(e.goliathState === 'aftershock_window', 'aftershock state'); near(e.goliathStateTimer, 1.5, 'aftershock timer');
  const ix = e.goliathImpactX, iy = e.goliathImpactY; e.x = 400; e.y = 400; target.x = ix + cfg.aftershockRadius; target.y = iy;
  NV.updateEnemies(0.5, st); near(e.goliathImpactX, ix, 'fixed impact x'); near(e.goliathImpactY, iy, 'fixed impact y');
  NV.updateEnemies(1.0, st);
  ok(hits.length === 2 && hits[1].cause === 'goliath-aftershock', 'aftershock count/cause'); near(hits[1].damage, Math.round(e.eliteDamage * 0.35), 'aftershock damage');
  ok(stunRolls === 1, 'aftershock stunned'); ok(e.goliathState === 'recovery', 'recovery state'); near(e.goliathStateTimer, 0.75, 'recovery timer');
  NV.updateEnemies(5, st); ok(hits.length === 2, 'dt spike double-resolved');

  const outside = goliath(100, 100), outsideTarget = player(246, 100); let outsideHits = 0;
  const outsideSt = state([outside], outsideTarget, () => { outsideHits++; return { applied: true, killed: false }; });
  init(NV, outside, outsideTarget, outsideSt); outside.goliathAttackCooldown = 0; outsideTarget.x = 230; NV.updateEnemies(0, outsideSt); outsideTarget.x = 246; NV.updateEnemies(0.35, outsideSt);
  ok(outsideHits === 0, 'outside 145 damaged');

  const blocked = goliath(100, 100), blockedTarget = player(100, 100); let blockedRolls = 0;
  math.random = () => { blockedRolls++; return 0; };
  const blockedSt = state([blocked], blockedTarget, () => ({ applied: false, dodged: false, killed: false }));
  init(NV, blocked, blockedTarget, blockedSt); blocked.goliathAttackCooldown = 0; NV.updateEnemies(0, blockedSt); NV.updateEnemies(0.35, blockedSt);
  ok(blockedRolls === 0 && blockedTarget.stun === 0, 'blocked damage stunned'); ok(blocked.goliathState === 'aftershock_window', 'blocked slam did not schedule aftershock');
});

t('21-26. body contact harmless; recovery 0.75 y cooldown 1.50', () => {
  const { NV } = setup(); const target = player(100, 100), e = goliath(110, 100); let damageCalls = 0, kills = 0;
  const st = state([e], target, () => { damageCalls++; return { applied: true, killed: false }; }, () => { kills++; });
  init(NV, e, target, st);
  ok(damageCalls === 0 && target.stun === 0, 'contact damage/stun'); ok(!e.dead && kills === 0, 'contact killed/rewarded'); ok(!e.contactCd && !e.atkFlash && target.invuln === 0, 'contact feedback/cooldown/invuln');
  e.goliathState = 'recovery'; e.goliathStateTimer = 0.75; e.goliathAttackCooldown = 0;
  NV.updateEnemies(0.75, st); ok(e.goliathState === 'approach', 'recovery did not end'); near(e.goliathAttackCooldown, 1.5, 'post recovery cooldown');
});

t('27-31. muerte, cleanup y dt spikes cancelan offense sin NaN', () => {
  const { NV } = setup(); const target = player(100, 100); let hits = 0;
  const windup = goliath(100, 100), windupSt = state([windup], target, () => { hits++; return { applied: true, killed: false }; });
  init(NV, windup, target, windupSt); windup.goliathAttackCooldown = 0; NV.updateEnemies(0, windupSt); windup.dead = true; NV.updateEnemies(2, windupSt); ok(hits === 0, 'death during windup attacked');
  const pending = goliath(100, 100), pendingSt = state([pending], target, () => { hits++; return { applied: true, killed: false }; });
  init(NV, pending, target, pendingSt); pending.goliathAttackCooldown = 0; NV.updateEnemies(0, pendingSt); NV.updateEnemies(0.35, pendingSt); const afterPrimary = hits; pending.dead = true; NV.updateEnemies(2, pendingSt); ok(hits === afterPrimary, 'death after impact kept aftershock');
  const cleanup = goliath(100, 100), cleanupSt = state([cleanup], target, () => { hits++; return { applied: true, killed: false }; });
  init(NV, cleanup, target, cleanupSt); cleanup.goliathAttackCooldown = 0; NV.updateEnemies(0, cleanupSt); cleanup.waveCleanup = true; NV.updateEnemies(2, cleanupSt); ok(hits === afterPrimary, 'cleanup kept offense');
  for (const entity of [windup, pending, cleanup]) for (const key of Object.keys(entity)) if (typeof entity[key] === 'number') ok(Number.isFinite(entity[key]), key + ' NaN');
});

t('32-33. producción Goliath intacta y Predator sin cambios', () => {
  const { NV } = setup(); const titan = NV.ELITE_TYPES.find((entry) => entry.visualId === 'elite_titan');
  ok(!!titan, 'missing titan'); near(titan.hp, 210, 'hp'); near(titan.speed, 25, 'speed'); near(titan.radius, 36, 'radius'); near(titan.damage, 35, 'damage'); near(titan.stunChance, 0.35, 'stun chance'); near(titan.stunDuration, 1.0, 'stun duration'); near(titan.resist, 3, 'resist'); ok(titan.hostileClass === 'heavy', 'hostile class');
  const predatorSource = fs.readFileSync('js/engine/enemies.js', 'utf8');
  ok(predatorSource.includes('const PREDATOR_EXECUTION_TRIGGER_RANGE = 90;'), 'Predator trigger changed');
  ok(predatorSource.includes('const PREDATOR_ATTACK_COOLDOWN = 2.30;'), 'Predator cooldown changed');
});

console.log('\nRESULT elite_goliath_seismic: pass=' + pass + ' fail=' + fail + ' assertions=' + assertions);
process.exit(fail ? 1 : 0);