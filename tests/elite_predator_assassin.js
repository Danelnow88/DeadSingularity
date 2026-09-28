// ===== TEST: elite_predator / Hunter-Executioner identity =====
const fs = require('fs'), vm = require('vm');
let pass = 0, fail = 0, assertions = 0;
function ok(value, message) { assertions++; if (!value) throw new Error(message); }
function near(actual, expected, label, eps) { assertions++; if (Math.abs(actual - expected) > (eps == null ? 1e-6 : eps)) throw new Error(label + '=' + actual + ' expected=' + expected); }
function t(name, fn) { try { fn(); pass++; console.log('  ok  ' + name); } catch (err) { fail++; console.log('  FAIL ' + name + ' -> ' + err.message); } }

function setup(withCombat, withRender) {
  const math = Object.create(Math); math.random = () => 0.5;
  const sandbox = { window: { NV: {} }, console, Math: math, Number, Object, Array, Set, Map, WeakMap, JSON };
  const files = ['js/data/balance.js', 'js/data/gameData.js', 'js/engine/hostileBudget.js', 'js/engine/enemies.js'];
  if (withCombat) files.push('js/engine/bullets.js', 'js/engine/flame.js');
  if (withRender) files.push('js/render/spectralEnemies2D.js');
  files.forEach((file) => vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file }));
  return sandbox.window.NV;
}
function predator(x, y) {
  return {
    x, y, hp: 55, maxHp: 55, speed: 165, radius: 12, color: '#f0f', shape: 'diamond',
    score: 40, xp: 40, behavior: 'chase', damage: 30, eliteDamage: 30, visualId: 'elite_predator',
    isElite: true, hostileClass: 'heavy', dead: false, knockVelX: 0, knockVelY: 0,
    knockbackRes: 0.3, contactCd: 0, hitFlash: 0, hitSlowUntil: 0, hitSlowImmunity: 0, stun: 0,
  };
}
function player(x, y) { return { x, y, radius: 20, hp: 200, maxHp: 200, invuln: 0, stun: 0, dashActive: false }; }
function state(enemies, target, hitFn) {
  return {
    enemies, player: target, bullets: [], W: 900, H: 520, wave: 20, waveEvent: null,
    MAX_BULLETS: 200, MAX_ENEMY_BULLETS: 40, MAX_HOSTILES: 30, MAX_HEAVY_HOSTILES: 7,
    enemyBulletCount: () => 0, applyPlayerDamage: hitFn || (() => ({ applied: false, dodged: false, killed: false })),
    addFloatText: () => {}, spawnExplosion: () => {}, onKill: () => {}, boss: null,
  };
}
function bulletContext(NV, st, bullets) {
  return Object.assign({}, st, { bullets, CHARACTERS: NV.CHARACTERS, SHIELD_COOLDOWN: 1, killEnemy(e) { e.dead = true; }, applyKnockback() {} });
}
function renderCtx() {
  const calls = { red: 0, body: 0, strokes: 0, fills: 0, lines: 0, curves: 0, arcs: [], rotations: [] };
  const base = { calls, createRadialGradient() { return { addColorStop() {} }; }, createLinearGradient() { return { addColorStop() {} }; }, measureText() { return { width: 10 }; } };
  return new Proxy(base, {
    get(obj, key) {
      if (key in obj) return obj[key];
      return (...args) => {
        if (key === 'stroke') calls.strokes++;
        if (key === 'fill') calls.fills++;
        if (key === 'lineTo') calls.lines++;
        if (key === 'quadraticCurveTo') calls.curves++;
        if (key === 'arc') calls.arcs.push(args.map(Number));
        if (key === 'rotate') calls.rotations.push(Number(args[0]));
      };
    },
    set(obj, key, value) {
      obj[key] = value;
      if ((key === 'strokeStyle' || key === 'fillStyle') && (value === '#ff3b4f' || String(value).includes('255,59,79'))) calls.red++;
      if ((key === 'strokeStyle' || key === 'fillStyle') && value === '#f0f') calls.body++;
      return true;
    },
  });
}

console.log('elite_predator_assassin:');

t('1-6. old dash removed; STALK -> MARK(0.35) -> HUNT(1.20, x1.35)', () => {
  const NV = setup(false, true), cfg = NV.ELITE_PREDATOR_HUNTER;
  const src = fs.readFileSync('js/engine/enemies.js', 'utf8');
  ok(!NV.ELITE_PREDATOR_ASSASSIN, 'legacy config still exported');
  ok(!src.includes("predatorState === 'dash'") && !src.includes('predatorDashDir'), 'legacy offensive dash remains');
  near(cfg.stalkRadius, 190, 'stalk radius'); near(cfg.markTime, 0.35, 'mark'); near(cfg.huntTime, 1.20, 'hunt'); near(cfg.huntSpeedMult, 1.35, 'hunt speed');
  const p = predator(200, 260), target = player(450, 260), st = state([p], target);
  NV.updateEnemies(0, st);
  ok(p.predatorState === 'stalk', 'spawn state'); near(p.predatorAttackCooldown, 0.65, 'initial delay');
  const side = p.predatorFlankSide, beforeY = p.y;
  NV.updateEnemies(0.10, st);
  ok(p.predatorFlankSide === side && Math.abs(p.y - beforeY) > 1, 'no stable lateral stalk');
  p.predatorAttackCooldown = 0; p.predatorStalkTimer = cfg.stalkFallback;
  NV.updateEnemies(0, st);
  ok(p.predatorState === 'mark' && p.predatorStateTimer === cfg.markTime, 'did not enter MARK');
  const c = renderCtx(), snapshot = JSON.stringify(p);
  NV.drawSpectralEnemy2D(c, p, 20, target, null);
  ok(c.calls.red > 0 && !src.includes('laneLength = 235'), 'MARK must be compact red warning without legacy trajectory lane');
  ok(JSON.stringify(p) === snapshot, 'render mutated gameplay');
  NV.updateEnemies(cfg.markTime, st);
  ok(p.predatorState === 'hunt' && p.predatorStateTimer === cfg.huntTime, 'did not enter HUNT');
  const phantom = NV.ELITE_TYPES.find((e) => e.visualId === 'elite_phantom');
  ok(phantom && phantom.hp === 65 && phantom.speed === 145 && phantom.damage === 25 && phantom.behavior === 'erratic', 'Phantom changed');
});

t('7-22. harmless contact, snapshotted bounded melee arc, one hit, recovery and failed hunt', () => {
  const NV = setup(), cfg = NV.ELITE_PREDATOR_HUNTER;
  let hits = 0, damage = 0;
  const target = player(180, 100), p = predator(100, 100);
  const st = state([p], target, (amount) => { hits++; damage += amount; return { applied: true, dodged: false, killed: false, crit: false }; });
  NV.updateEnemies(0, st);
  p.predatorState = 'hunt'; p.predatorStateTimer = cfg.huntTime; p.predatorAttackCooldown = 0;
  NV.updateEnemies(0, st);
  ok(p.predatorState === 'execution_windup', 'no execution windup within 90px');
  near(cfg.executionTriggerRange, 90, 'trigger range'); near(p.predatorStateTimer, 0.30, 'windup');
  near(p.predatorExecutionFacing, 0, 'facing snapshot');
  target.x = 100; target.y = 180;
  NV.updateEnemies(0.10, st);
  near(p.predatorExecutionFacing, 0, 'facing tracked after snapshot');
  near(cfg.executionRadius, 105, 'execution radius');
  near(cfg.executionArc, Math.PI * 130 / 180, 'execution arc');
  near(cfg.executionActiveTime, 0.14, 'execution active time');
  target.x = 180; target.y = 100;
  NV.updateEnemies(0.20, st);
  ok(p.predatorState === 'execution', 'windup did not complete');
  NV.updateEnemies(0.01, st);
  ok(hits === 1, 'valid forward arc did not hit'); near(damage, 30, 'production damage');
  near(p.predatorExecutionImpactTimer, 0.12, 'successful hit impact presentation');
  NV.updateEnemies(0.05, st); ok(hits === 1, 'execution hit more than once');
  NV.updateEnemies(0.08, st);
  ok(p.predatorState === 'recovery', 'successful execution did not recover'); near(p.predatorStateTimer, 0.85, 'execution recovery');

  const miss = predator(100, 100), missTarget = player(20, 100); let missHits = 0;
  const missState = state([miss], missTarget, () => { missHits++; return { applied: true, killed: false }; });
  NV.updateEnemies(0, missState);
  miss.predatorState = 'execution'; miss.predatorStateTimer = cfg.executionActiveTime; miss.predatorExecutionFacing = 0; miss.predatorExecutionSpent = false;
  NV.updateEnemies(cfg.executionActiveTime, missState);
  ok(missHits === 0, 'player behind arc was hit'); ok(miss.predatorState === 'recovery', 'miss did not recover');
  ok(!(miss.predatorExecutionImpactTimer > 0), 'miss triggered fake impact presentation');

  const far = predator(100, 100), farTarget = player(700, 100), farState = state([far], farTarget);
  NV.updateEnemies(0, farState); far.predatorState = 'hunt'; far.predatorStateTimer = cfg.huntTime;
  NV.updateEnemies(cfg.huntTime, farState);
  ok(far.predatorState === 'recovery', 'failed hunt did not time out'); near(far.predatorStateTimer, 0.45, 'failed recovery');

  for (const s of ['stalk', 'mark', 'hunt', 'evade', 'execution_windup', 'recovery']) {
    const q = predator(100, 100), qTarget = player(100, 100); let contacts = 0;
    const qState = state([q], qTarget, () => { contacts++; return { applied: true, killed: false }; });
    NV.updateEnemies(0, qState); q.predatorState = s; q.predatorStateTimer = 10; q.predatorAttackCooldown = 10;
    if (s === 'evade') { q.predatorEvadeTargetX = q.x; q.predatorEvadeTargetY = q.y; }
    NV.updateEnemies(0.01, qState);
    ok(contacts === 0, 'ordinary contact damaged in ' + s);
  }
  const active = predator(100, 100), activeTarget = player(20, 100); let activeHits = 0;
  const activeState = state([active], activeTarget, () => { activeHits++; return { applied: true, killed: false }; });
  NV.updateEnemies(0, activeState); active.predatorState = 'execution'; active.predatorStateTimer = 0.10; active.predatorExecutionFacing = 0; active.predatorExecutionSpent = false;
  NV.updateEnemies(0.01, activeState); ok(activeHits === 0, 'execution body overlap bypassed arc');
});

t('41-48. manifested claw uses gameplay geometry/facing, is phase-gated and render-only', () => {
  const NV = setup(false, true), cfg = NV.ELITE_PREDATOR_HUNTER, target = player(200, 100);
  const p = predator(100, 100); p.predatorExecutionFacing = 0.72;
  const draw = (stateName, timer, impact) => {
    p.predatorState = stateName; p.predatorStateTimer = timer; p.predatorExecutionImpactTimer = impact || 0;
    const ctx = renderCtx(), snapshot = JSON.stringify(p);
    NV.drawSpectralEnemy2D(ctx, p, 30, target, null);
    ok(JSON.stringify(p) === snapshot, 'render mutated gameplay in ' + stateName);
    return ctx.calls;
  };
  ok(draw('stalk', 0).curves === 0, 'weapon visible during stalk');
  ok(draw('execution_windup', cfg.executionWindup).curves === 0, 'weapon manifested too early');
  ok(draw('execution_windup', 0.03).curves >= 2, 'weapon absent near windup end');
  const active = draw('execution', cfg.executionActiveTime * 0.5);
  ok(active.curves >= 2, 'active spectral blade absent');
  const authorityArc = active.arcs.find((a) => Math.abs(a[2] - cfg.executionRadius) < 1e-6 && Math.abs((a[4] - a[3]) - cfg.executionArc) < 1e-6);
  ok(!!authorityArc, 'visual warning does not use gameplay radius/arc');
  ok(active.rotations.some((angle) => Math.abs(angle - p.predatorExecutionFacing) < 1e-6), 'sweep ignores snapshotted facing');
  ok(draw('recovery', cfg.executionRecovery).curves === 0, 'weapon persists after execution');
  const impact = draw('recovery', cfg.executionRecovery, 0.08);
  ok(impact.lines >= 3 && impact.curves === 0, 'hit impact missing or weapon persisted');
});

t('23-36. two pre-hit projectile evades, 75px/0.18s, recharge, gates, flame validity and bounds', () => {
  const NV = setup(true), cfg = NV.ELITE_PREDATOR_HUNTER;
  const target = player(100, 100), p = predator(200, 100), st = state([p], target);
  NV.updateEnemies(0, st);
  ok(p.predatorEvadeCharges === 2, 'initial charges'); near(cfg.evadeMaxCharges, 2, 'max charges');
  const hp0 = p.hp;
  NV.updateBullets(0, bulletContext(NV, st, [{ x: p.x, y: p.y, vx: 0, vy: 0, damage: 999, radius: 4, isEnemy: false, dead: false, pierce: 1, hitTargets: [] }]));
  ok(p.hp === hp0, 'triggering projectile dealt damage'); ok(p.predatorState === 'evade' && p.predatorEvadeCharges === 1, 'charge not consumed pre-hit');
  near(p.predatorStateTimer, 0.18, 'evade duration');
  near(Math.hypot(p.predatorEvadeTargetX - p.predatorEvadeStartX, p.predatorEvadeTargetY - p.predatorEvadeStartY), 75, 'evade distance', 0.01);
  ok(Math.abs(p.predatorEvadeTargetX - p.predatorEvadeStartX) < 0.01, 'evade not lateral');
  NV.updateBullets(0, bulletContext(NV, st, [{ x: p.x, y: p.y, vx: 0, vy: 0, damage: 20, radius: 4, isEnemy: false, dead: false, pierce: 1, hitTargets: [] }]));
  ok(p.hp === hp0 && p.predatorEvadeCharges === 1, 'projectile during evade was not ignored');

  const flame = NV.createFlameZone({ x: target.x, y: target.y, angle: 0, range: 170, halfAngle: 1, damage: 10, burnDamage: 2, burnDuration: 1 });
  flame.x = target.x; flame.y = target.y; flame.hitTargets = [];
  NV.flameZoneDamage(flame, { player: target, enemies: [p], boss: null, addFloatText() {}, killEnemy() {}, applyKnockback() {}, spawnExplosion() {} });
  ok(p.hp === hp0 - 10, 'non-projectile flame was blocked');
  const hpAfterFlame = p.hp; NV.updateBurns(0.5, { enemies: [p], boss: null, killEnemy() {}, spawnExplosion() {} });
  ok(p.hp < hpAfterFlame, 'burn was blocked by projectile evade');

  for (const blocked of ['execution_windup', 'execution', 'recovery', 'evade']) {
    const q = predator(200, 100); NV.updateEnemies(0, state([q], target)); q.predatorState = blocked; q.predatorStateTimer = 1;
    ok(!NV.tryElitePredatorProjectileEvade(q, target, 900, 520), 'evade allowed during ' + blocked);
  }
  const edge = predator(200, 13); NV.updateEnemies(0, state([edge], target));
  ok(NV.tryElitePredatorProjectileEvade(edge, target, 900, 520), 'edge evade rejected');
  ok(edge.predatorEvadeTargetX >= edge.radius && edge.predatorEvadeTargetX <= 900 - edge.radius && edge.predatorEvadeTargetY >= edge.radius && edge.predatorEvadeTargetY <= 520 - edge.radius, 'arena bounds violated');

  const recharge = predator(300, 200), rechargeState = state([recharge], target); NV.updateEnemies(0, rechargeState);
  recharge.predatorEvadeCharges = 0; recharge.predatorEvadeRechargeTimer = 5; recharge.predatorState = 'recovery'; recharge.predatorStateTimer = 20;
  NV.updateEnemies(4.99, rechargeState); ok(recharge.predatorEvadeCharges === 0, 'recharged early');
  NV.updateEnemies(0.01, rechargeState); ok(recharge.predatorEvadeCharges === 1, 'one charge not restored at 5s');
  NV.updateEnemies(5.0, rechargeState); ok(recharge.predatorEvadeCharges === 2, 'second charge not restored');
  NV.updateEnemies(10, rechargeState); ok(recharge.predatorEvadeCharges === 2, 'stored above max');
  ok(!Object.prototype.hasOwnProperty.call(p, 'invulnerable') && !Object.prototype.hasOwnProperty.call(p, 'invuln'), 'global invulnerability introduced');
});

t('21, 37-40. recovery damageable and Predator production stats/spawn fields unchanged', () => {
  const NV = setup(true), p = predator(200, 100), target = player(100, 100), st = state([p], target);
  NV.updateEnemies(0, st); p.predatorState = 'recovery'; p.predatorStateTimer = 1;
  NV.updateBullets(0, bulletContext(NV, st, [{ x: p.x, y: p.y, vx: 0, vy: 0, damage: 10, radius: 4, isEnemy: false, dead: false, pierce: 1, hitTargets: [] }]));
  near(p.hp, 45, 'recovery projectile damage');
  const type = NV.ELITE_TYPES.find((e) => e.visualId === 'elite_predator');
  const expected = { hp: 55, speed: 165, damage: 30, radius: 12, behavior: 'chase' };
  for (const key of Object.keys(expected)) ok(type[key] === expected[key], 'Predator ' + key);
  ok(type.minWave === undefined && type.weight === undefined, 'Predator spawn fields changed');
});

console.log('\nRESULT elite_predator_assassin: pass=' + pass + ' fail=' + fail + ' assertions=' + assertions);
process.exit(fail ? 1 : 0);