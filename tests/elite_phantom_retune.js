// ===== TEST: elite_phantom threat retune =====
const fs = require('fs'), vm = require('vm');
let pass = 0, fail = 0, assertions = 0;
function ok(value, message) { assertions++; if (!value) throw new Error(message); }
function near(actual, expected, message, epsilon) {
  assertions++;
  const eps = epsilon == null ? 1e-6 : epsilon;
  if (Math.abs(actual - expected) > eps) throw new Error(message + '=' + actual + ' expected=' + expected);
}
function t(name, fn) {
  try { fn(); pass++; console.log('  ok  ' + name); }
  catch (error) { fail++; console.log('  FAIL ' + name + ' -> ' + error.message); }
}
function setup() {
  const math = Object.create(Math); math.random = () => 0.5;
  const sandbox = {
    window: { NV: {}, matchMedia: () => ({ matches: false }) },
    console, Math: math, Number, Object, Array, Set, Map, WeakMap, WeakSet, JSON, Proxy, Reflect,
  };
  const files = [
    'js/data/balance.js', 'js/data/gameData.js', 'js/data/consumables.js',
    'js/engine/hostileBudget.js', 'js/engine/fx.js', 'js/engine/movement.js', 'js/engine/enemies.js',
    'js/engine/weapons.js', 'js/engine/bullets.js', 'js/engine/drones.js', 'js/engine/flame.js',
    'js/engine/meteors.js', 'js/engine/special.js', 'js/render/player.js', 'js/render/spectralEnemies2D.js',
  ];
  for (const file of files) vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
  return sandbox.window.NV;
}
function phantom(x, y) {
  return {
    x, y, hp: 65, maxHp: 65, speed: 145, radius: 16, color: '#e0ffff', shape: 'circle',
    score: 45, xp: 45, behavior: 'erratic', damage: 25, eliteDamage: 25,
    visualId: 'elite_phantom', isElite: true, hostileClass: 'heavy', dead: false,
    knockVelX: 0, knockVelY: 0, knockbackRes: 0.3, contactCd: 0, stun: 0,
    hitFlash: 0, hitSlowUntil: 0, hitSlowImmunity: 0, erraticTimer: 0, erraticTargetAngle: 0,
  };
}
function hostile(id, x, y, cls, extra) {
  return Object.assign({
    x, y, hp: 20, maxHp: 20, speed: 0, radius: 10, color: '#fff', shape: 'circle',
    enemyTypeId: id, visualId: id, hostileClass: cls || 'light', dead: false, killResolved: false,
    waveCleanup: false, knockVelX: 0, knockVelY: 0, knockbackRes: 0, contactCd: 0, stun: 0,
    hitFlash: 0, hitSlowUntil: 0, hitSlowImmunity: 0, behavior: 'chase', damage: 1,
  }, extra || {});
}
function player(x, y) {
  return { x, y, radius: 20, character: 'boti', hp: 200, maxHp: 200, invuln: 0, stun: 0,
    dashActive: false, overdrive: 0, agility: 1, moveVx: 0, moveVy: 0 };
}
function state(enemies, p, overrides) {
  return Object.assign({
    enemies, player: p, bullets: [], W: 1000, H: 700, wave: 19, waveEvent: null,
    gameState: 'playing', MAX_BULLETS: 200, MAX_ENEMY_BULLETS: 80,
    MAX_HOSTILES: 30, MAX_HEAVY_HOSTILES: 7, enemyBulletCount: () => 0,
    applyPlayerDamage: () => ({ applied: false, dodged: false, killed: false }),
    addFloatText() {}, spawnExplosion() {}, onKill() {}, boss: null, hazards: [], hookSystem: null,
  }, overrides || {});
}
function init(NV, e, p, overrides) {
  const st = state([e], p, overrides);
  NV.updateEnemies(0, st);
  return st;
}
function beginPossession(NV, e, st) {
  e.phantomState = 'entry_commit';
  e.phantomStateTimer = NV.ELITE_PHANTOM_POSSESSION.commitTime;
  e.phantomDirX = 1; e.phantomDirY = 0; e.phantomEntryAngle = 0;
  e.phantomStalkPhased = false;
  e.x = st.player.x - e.radius - NV.ELITE_PHANTOM_POSSESSION.capturePad + 1;
  e.y = st.player.y;
  NV.updateEnemies(0.01, st);
  ok(st.player.phantomPossession && st.player.phantomPossession.active, 'possession setup failed');
}
function renderCtx() {
  const calls = { rotations: [], strokes: 0, alphas: [] };
  const base = { calls, createRadialGradient() { return { addColorStop() {} }; }, createLinearGradient() { return { addColorStop() {} }; }, measureText() { return { width: 10 }; } };
  return new Proxy(base, {
    get(obj, key) {
      if (key in obj) return obj[key];
      return (...args) => { if (key === 'rotate') calls.rotations.push(Number(args[0])); if (key === 'stroke') calls.strokes++; };
    },
    set(obj, key, value) { obj[key] = value; if (key === 'globalAlpha') calls.alphas.push(value); return true; },
  });
}

console.log('elite_phantom_retune:');

t('1-10 HP unchanged; stalk AI/lifecycle gates; materialization and normal death', () => {
  const NV = setup(), cfg = NV.ELITE_PHANTOM_POSSESSION;
  const def = NV.ELITE_TYPES.find((entry) => entry.visualId === 'elite_phantom');
  ok(def.hp === 65, 'Phantom HP changed');
  const p = player(600, 300), e = phantom(100, 300), st = init(NV, e, p);
  const beforeX = e.x, beforeY = e.y;
  ok(e.phantomState === 'roam_stalk' && e.phantomStalkPhased, 'not in stalk');
  ok(NV.isEnemyCombatActive(e), 'stalk AI combat-active gate disabled');
  ok(!NV.isEnemyTargetable(e) && !NV.isEnemyDamageable(e), 'stalk targetable/damageable');
  NV.updateEnemies(0.25, st);
  ok(e.x !== beforeX || e.y !== beforeY, 'stalk did not move');
  const budget = NV.getHostileBudget({ enemies: [e], boss: null, MAX_HOSTILES: 30, MAX_HEAVY_HOSTILES: 7 });
  ok(budget.hostiles === 1 && budget.heavy === 1, 'stalk disappeared from budget');
  const hp = e.hp;
  NV.updateBullets(0, { bullets: [{ x: e.x, y: e.y, vx: 0, vy: 0, damage: 999, isEnemy: false, dead: false, pierce: 1, hitTargets: [] }], W: 1000, H: 700, player: p, enemies: [e], boss: null, CHARACTERS: NV.CHARACTERS, SHIELD_COOLDOWN: 1, addFloatText() {}, killEnemy() { throw new Error('stalk killed'); }, applyKnockback() {}, spawnExplosion() {}, applyPlayerDamage() {} });
  ok(e.hp === hp && !e.dead, 'stalk took accidental damage');
  e.x = p.x - cfg.entryRange; e.y = p.y;
  NV.updateEnemies(0, st);
  ok(e.phantomState === 'materialize', 'materialization did not start');
  near(e.phantomStateTimer, 0.25, 'materialization duration');
  ok(NV.isEnemyTargetable(e) && NV.isEnemyDamageable(e), 'materialization not damageable');
  p.x += 200;
  NV.updateEnemies(0.10, st);
  ok(e.phantomState === 'materialize', 'materialization oscillated back to stalk');
  let kills = 0;
  e.hp = 1;
  NV.updateBullets(0, { bullets: [{ x: e.x, y: e.y, vx: 0, vy: 0, damage: 5, isEnemy: false, dead: false, pierce: 1, hitTargets: [] }], W: 1000, H: 700, player: p, enemies: [e], boss: null, CHARACTERS: NV.CHARACTERS, SHIELD_COOLDOWN: 1, addFloatText() {}, killEnemy(target) { target.dead = true; target.killResolved = true; kills++; }, applyKnockback() {}, spawnExplosion() {}, applyPlayerDamage() {} });
  ok(e.dead && e.killResolved && kills === 1, 'materialization kill was not normal death');
  NV.updateEnemies(1, st);
  ok(e.phantomState === 'materialize' && !p.phantomPossession, 'dead Phantom advanced into attack');
});

t('11-24 exact entry values, one snapshot, lead cap, straight commit, reach and dodge fairness', () => {
  const NV = setup(), cfg = NV.ELITE_PHANTOM_POSSESSION;
  near(cfg.entryRange, 210, 'entry range'); near(cfg.roamMin, 150, 'roam min'); near(cfg.roamMax, 205, 'roam max');
  near(cfg.windup, 0.42, 'windup'); near(cfg.commitTime, 0.50, 'commit time'); near(cfg.commitSpeedMult, 3.4, 'speed mult');
  near(cfg.commitSpeedCap, 620, 'speed cap'); near(cfg.capturePad, 26, 'capture pad'); near(cfg.missRecovery, 1.0, 'miss recovery'); near(cfg.retryCooldown, 2.5, 'retry cooldown');
  const p = player(500, 300), e = phantom(290, 300), st = init(NV, e, p);
  ok(e.phantomState === 'materialize', '210 trigger missing');
  NV.updateEnemies(cfg.materializeTime, st);
  p.moveVx = 300; p.moveVy = 400;
  NV.updateEnemies(cfg.windup, st);
  ok(e.phantomState === 'entry_commit', 'windup did not commit');
  near(e.phantomPredictionLead, 40, 'prediction cap');
  const dirX = e.phantomDirX, dirY = e.phantomDirY, predictedX = e.phantomPredictedX, predictedY = e.phantomPredictedY;
  p.x -= 120; p.y += 160; p.moveVx = -500; p.moveVy = 0;
  NV.updateEnemies(0.05, st);
  near(e.phantomDirX, dirX, 'commit homed x'); near(e.phantomDirY, dirY, 'commit homed y');
  near(e.phantomPredictedX, predictedX, 'prediction recalculated x'); near(e.phantomPredictedY, predictedY, 'prediction recalculated y');
  const wave19Speed = 145 * (1 + 0.007 * 19);
  const effectiveReach = Math.min(cfg.commitSpeedCap, wave19Speed * cfg.commitSpeedMult) * cfg.commitTime + 16 + cfg.capturePad;
  ok(effectiveReach > cfg.entryRange, 'reach defect remains=' + effectiveReach);

  const staticPlayer = player(500, 300), staticPhantom = phantom(290, 300), staticState = init(NV, staticPhantom, staticPlayer);
  NV.updateEnemies(cfg.materializeTime, staticState); NV.updateEnemies(cfg.windup, staticState);
  for (let i = 0; i < 40 && !staticPlayer.phantomPossession; i++) NV.updateEnemies(1 / 120, staticState);
  ok(!!staticPlayer.phantomPossession, 'static player was not possessed');

  const dodgePlayer = player(500, 300), dodgePhantom = phantom(290, 300), dodgeState = init(NV, dodgePhantom, dodgePlayer);
  NV.updateEnemies(cfg.materializeTime, dodgeState); NV.updateEnemies(cfg.windup, dodgeState);
  for (let i = 0; i < 60; i++) {
    dodgePlayer.y += 220 / 60;
    NV.updateEnemies(1 / 120, dodgeState);
  }
  ok(!dodgePlayer.phantomPossession && dodgePhantom.phantomState === 'miss_recovery', 'deliberate perpendicular dodge failed');
});

t('25-27 possession strength, normalization and meaningful counter-steer', () => {
  const NV = setup(), cfg = NV.ELITE_PHANTOM_POSSESSION, p = player(0, 0);
  p.phantomPossession = { active: true, forceAngle: 0, entryAngle: 2, elapsed: 8 };
  const idle = NV.phantomPossessionIntent(p, 0, 0, false);
  near(idle.x, cfg.driftStrength, 'force strength'); near(idle.y, 0, 'force y');
  const counter = NV.phantomPossessionIntent(p, -1, 0, false);
  near(counter.x, -0.60, 'counter authority');
  const aligned = NV.phantomPossessionIntent(p, 1, 0, false);
  near(Math.hypot(aligned.x, aligned.y), 1, 'speed normalization');
});

t('28-40 danger scan cadence/radius/eligibility/weights/tie/hysteresis/smoothing/fallback', () => {
  const NV = setup(), cfg = NV.ELITE_PHANTOM_POSSESSION;
  const p = player(500, 350), owner = phantom(450, 350);
  const light = hostile('drone', 620, 350, 'light');
  const medium = hostile('specter_grunt', 500, 520, 'medium');
  const ranged = hostile('specter_archer', 300, 350, 'medium', { behavior: 'ranged' });
  const inactiveHeavy = hostile('elite_titan', 500, 120, 'heavy', { isElite: true, phantomCombatInactive: true });
  const bossBody = hostile('boss', 560, 350, 'heavy', { isBoss: true });
  const tooClose = hostile('spitter', 540, 350, 'light', { behavior: 'ranged' });
  const outside = hostile('elite_titan', 900, 350, 'heavy', { isElite: true });
  const st = state([owner, light, medium, ranged, inactiveHeavy, bossBody, tooClose, outside], p);
  NV.updateEnemies(0, st); beginPossession(NV, owner, st);
  const possession = p.phantomPossession;
  NV.updateEnemies(0.10, st);
  ok(possession.dangerAnchor === ranged, 'weighting/eligibility selected wrong anchor=' + (possession.dangerAnchor && (possession.dangerAnchor.enemyTypeId || possession.dangerAnchor.visualId)));
  ok(possession.dangerAnchor !== owner && possession.dangerAnchor !== inactiveHeavy && possession.dangerAnchor !== bossBody && possession.dangerAnchor !== tooClose && possession.dangerAnchor !== outside, 'excluded anchor selected');
  ok(!NV.isEnemyCombatActive({ dead: false, waveCleanup: true }), 'waveCleanup accepted by authoritative helper');
  ok(possession.dangerScanCount === 1, 'first scan count');
  const afterTurn = possession.forceAngle;
  ok(Math.abs(afterTurn) <= cfg.dangerTurnRate * 0.10 + 1e-9, 'turn rate exceeded');
  for (let i = 0; i < 8; i++) NV.updateEnemies(0.10, st);
  ok(possession.dangerScanCount === 1, 'scan ran every frame');
  NV.updateEnemies(0.21, st);
  ok(possession.dangerScanCount === 2, '1s cadence missing');

  const tieA = hostile('drone', 600, 350, 'light'), tieB = hostile('drone', 600, 350, 'light');
  st.enemies.splice(1, st.enemies.length - 1, tieA, tieB);
  possession.dangerScanTimer = 0; possession.dangerAnchor = null; possession.forceAngle = 0;
  NV.updateEnemies(0, st);
  ok(possession.dangerAnchor === tieA, 'stable order tie-break failed');
  tieB.x = 595; tieB.y = 360;
  possession.dangerScanTimer = 0;
  NV.updateEnemies(0, st);
  ok(possession.dangerAnchor === tieA, 'hysteresis allowed trivial flip');

  st.enemies.splice(1);
  possession.dangerAnchor = null; possession.dangerScanTimer = 0; possession.forceAngle = Math.PI - 0.05;
  NV.updateEnemies(0.2, st);
  const expectedFallback = -Math.PI + 0.06;
  near(possession.forceAngle, expectedFallback, 'fallback shortest wrap', 1e-6);
  ok(!possession.dangerActive, 'fallback marked danger active');
  const source = fs.readFileSync('js/engine/enemies.js', 'utf8');
  const scanBody = source.slice(source.indexOf('function scanPhantomDanger'), source.indexOf('function updatePhantomForceAngle'));
  ok(!scanBody.includes('Math.random') && !scanBody.includes('[]'), 'scan uses randomness or arrays');
});

t('41-50 forceAngle authority, precedence, timers, duration, recovery and cooldown', () => {
  const NV = setup(), cfg = NV.ELITE_PHANTOM_POSSESSION, p = player(500, 350), e = phantom(450, 350), st = init(NV, e, p);
  beginPossession(NV, e, st);
  const possession = p.phantomPossession;
  possession.forceAngle = 1.234; possession.entryAngle = -2; possession.elapsed = 7;
  const intent = NV.phantomPossessionIntent(p, 0, 0, false);
  near(Math.atan2(intent.y, intent.x), possession.forceAngle, 'movement not using forceAngle');
  const ctx = renderCtx(); NV.drawPlayerPhantomPossession(ctx, p, NV.CHARACTERS.boti, 30);
  ok(ctx.calls.rotations.some((angle) => Math.abs(angle - possession.forceAngle) < 1e-9), 'chevron not using forceAngle');
  const timer = e.phantomStateTimer;
  p.dashActive = true; ok(!NV.phantomPossessionIntent(p, 0, 0, false).applied, 'dash drift'); NV.updateEnemies(0.2, st); p.dashActive = false;
  p.stun = 1; ok(!NV.phantomPossessionIntent(p, 0, 0, false).applied, 'stun drift'); NV.updateEnemies(0.2, st); p.stun = 0;
  st.hookSystem = { phase: 'tether', srcEnemy: { x: 0, y: 0 } }; ok(!NV.phantomPossessionIntent(p, 0, 0, true).applied, 'Hook drift'); NV.updateEnemies(0.2, st); st.hookSystem = null;
  near(e.phantomStateTimer, timer - 0.6, 'timer did not continue through precedence', 1e-5);
  ok(possession.active, 'possession ended under precedence');
  near(NV.phantomPossessionDuration(1, null), 6, 'duration lower clamp'); near(NV.phantomPossessionDuration(999, 'mines'), 9, 'duration upper clamp');
  e.phantomStateTimer = 0.01; e.phantomPossessionElapsed = e.phantomPossessionDuration - 0.01;
  NV.updateEnemies(0.01, st); NV.updateEnemies(cfg.expelTime, st);
  ok(e.phantomState === 'return_recovery' && NV.isEnemyDamageable(e), 'return recovery not material');
  near(e.phantomStateTimer, 1.20, 'return recovery');
  NV.updateEnemies(cfg.returnRecovery, st);
  ok(e.phantomState === 'cooldown' && NV.isEnemyTargetable(e) && NV.isEnemyDamageable(e) && !e.phantomStalkPhased, 'post cooldown not material');
  near(e.phantomCooldown, 12.0, 'post cooldown');
});

t('51-56 neighbors unchanged, finite values, renderer purity and performance structure', () => {
  const NV = setup(), data = fs.readFileSync('js/data/gameData.js', 'utf8'), enemiesSource = fs.readFileSync('js/engine/enemies.js', 'utf8');
  ok(data.includes("id: 'specter_grunt'") && enemiesSource.includes('SPECTER_GRUNT_CHARGE_TIME = 0.75'), 'Grunt changed');
  ok(data.includes("id: 'wisp'") && enemiesSource.includes('WISP_MARK_TIME = 0.48'), 'Wisp changed');
  ok(data.includes("visualId: 'elite_predator'") && enemiesSource.includes('PREDATOR_HUNT_TIME = 1.20'), 'Predator changed');
  ok(data.includes("visualId: 'elite_titan'") && enemiesSource.includes('GOLIATH_SLAM_WINDUP = 0.35'), 'Goliath changed');
  const p = player(500, 350), e = phantom(290, 350), st = init(NV, e, p);
  NV.updateEnemies(NV.ELITE_PHANTOM_POSSESSION.materializeTime, st); NV.updateEnemies(NV.ELITE_PHANTOM_POSSESSION.windup, st);
  for (const value of [e.x, e.y, e.phantomDirX, e.phantomDirY, e.phantomPredictionLead, e.phantomStateTimer]) ok(Number.isFinite(value), 'NaN/Infinity');
  const enemyBefore = JSON.stringify(e), playerBefore = JSON.stringify(p);
  NV.drawSpectralEnemy2D(renderCtx(), e, 20, p, null);
  if (p.phantomPossession) NV.drawPlayerPhantomPossession(renderCtx(), p, NV.CHARACTERS.boti, 20);
  ok(JSON.stringify(e) === enemyBefore && JSON.stringify(p) === playerBefore, 'renderer mutated gameplay');
  ok(enemiesSource.includes('for (let i = 0; i < enemies.length; i++)') && !enemiesSource.includes('PHANTOM_DANGER_SCAN_INTERVAL = 0'), 'danger scan/performance structure missing');
  const spectralSource = fs.readFileSync('js/render/spectralEnemies2D.js', 'utf8');
  ok(!spectralSource.includes('requestAnimationFrame') && spectralSource.includes("state === 'roam_stalk'"), 'new render pass or stalk visual missing');
  ok(spectralSource.includes("matchMedia('(prefers-reduced-motion: reduce)')") && spectralSource.includes('const unstable = reducedMotion ? 0'), 'stalk reduced-motion gate missing');
});

console.log('\nRESULT elite_phantom_retune: pass=' + pass + ' fail=' + fail + ' assertions=' + assertions);
process.exit(fail ? 1 : 0);