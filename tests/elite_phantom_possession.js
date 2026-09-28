// ===== TEST: elite_phantom possession / movement corruption =====
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
    'js/engine/weapons.js', 'js/engine/bullets.js', 'js/engine/drones.js',
    'js/engine/flame.js', 'js/engine/meteors.js', 'js/engine/special.js',
    'js/render/player.js', 'js/render/spectralEnemies2D.js',
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
function player(x, y) {
  return {
    x, y, radius: 20, character: 'boti', hp: 200, maxHp: 200, invuln: 0, stun: 0,
    dashActive: false, overdrive: 0, agility: 1, moveVx: 0, moveVy: 0,
  };
}
function state(enemies, target, overrides) {
  return Object.assign({
    enemies, player: target, bullets: [], W: 900, H: 520, wave: 20, waveEvent: null,
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
function forceCommitHit(NV, e, st) {
  e.phantomState = 'entry_commit';
  e.phantomStateTimer = NV.ELITE_PHANTOM_POSSESSION.commitTime;
  e.phantomDirX = 1; e.phantomDirY = 0; e.phantomEntryAngle = 0;
  e.x = st.player.x - e.radius - 19; e.y = st.player.y;
  NV.updateEnemies(0.01, st);
}
function renderCtx() {
  const calls = { strokes: 0, fills: 0, rotations: [], lines: 0, ellipses: 0 };
  const base = {
    calls,
    createRadialGradient() { return { addColorStop() {} }; },
    createLinearGradient() { return { addColorStop() {} }; },
    measureText() { return { width: 10 }; },
  };
  return new Proxy(base, {
    get(obj, key) {
      if (key in obj) return obj[key];
      return (...args) => {
        if (key === 'stroke') calls.strokes++;
        if (key === 'fill') calls.fills++;
        if (key === 'rotate') calls.rotations.push(Number(args[0]));
        if (key === 'lineTo') calls.lines++;
        if (key === 'ellipse') calls.ellipses++;
      };
    },
    set(obj, key, value) { obj[key] = value; return true; },
  });
}

console.log('elite_phantom_possession:');

t('1-9 base stats, stalk/materialize, harmless contact, range, windup snapshot and straight commit', () => {
  const NV = setup(), cfg = NV.ELITE_PHANTOM_POSSESSION;
  const def = NV.ELITE_TYPES.find((entry) => entry.visualId === 'elite_phantom');
  ok(def.hp === 65 && def.speed === 145 && def.radius === 16 && def.damage === 25, 'base stats changed');
  const p = player(500, 250), e = phantom(100, 250); let contacts = 0;
  const st = init(NV, e, p, { applyPlayerDamage() { contacts++; return { applied: true, killed: false }; } });
  ok(e.phantomState === 'roam_stalk', 'initial state=' + e.phantomState);
  e.x = p.x; e.y = p.y; e.phantomState = 'roam_stalk'; e.phantomCooldown = 1;
  NV.updateEnemies(0.01, st);
  ok(contacts === 0 && p.stun === 0, 'ordinary contact damaged or stunned');
  e.x = p.x - cfg.entryRange - 1; e.y = p.y; e.phantomCooldown = 0; e.phantomState = 'roam_stalk'; e.phantomStalkPhased = true;
  NV.updateEnemies(0, st); ok(e.phantomState === 'roam_stalk', 'entry outside range');
  e.x = p.x - cfg.entryRange; NV.updateEnemies(0, st);
  ok(e.phantomState === 'materialize', 'entry range not respected'); near(e.phantomStateTimer, cfg.materializeTime, 'materialize');
  ok(NV.isEnemyTargetable(e) && NV.isEnemyDamageable(e), 'materialize not targetable/damageable');
  NV.updateEnemies(cfg.materializeTime, st);
  ok(e.phantomState === 'entry_windup', 'materialize did not enter windup'); near(e.phantomStateTimer, cfg.windup, 'windup');
  p.x += 80;
  NV.updateEnemies(cfg.windup, st);
  const snappedX = e.phantomDirX, snappedY = e.phantomDirY;
  ok(e.phantomState === 'entry_commit' && snappedX > 0.99, 'snapshot not taken at windup end');
  p.y += 160;
  const beforeX = e.x, beforeY = e.y;
  NV.updateEnemies(0.05, st);
  ok(e.phantomDirX === snappedX && e.phantomDirY === snappedY && Math.abs(e.y - beforeY) < 1e-6 && e.x > beforeX, 'commit homed');
  ok(cfg.commitTime === 0.50 && Math.min(cfg.commitSpeedCap, e.speed * cfg.commitSpeedMult) === 493, 'commit tuning');
});

t('10-18 successful entry is unique, non-damaging and wave-duration scaled on same owner', () => {
  const NV = setup(), p = player(300, 200), e = phantom(100, 200); let hits = 0, kills = 0;
  const st = init(NV, e, p, {
    wave: 20,
    applyPlayerDamage() { hits++; return { applied: true, killed: false }; },
    onKill() { kills++; },
  });
  forceCommitHit(NV, e, st);
  ok(p.phantomPossession && p.phantomPossession.active, 'possession did not start');
  ok(p.phantomPossession.owner === e && e.phantomState === 'possessed', 'same entity not owner');
  ok(hits === 0 && p.hp === 200 && p.stun === 0 && p.invuln === 0, 'entry caused damage/stun/invuln');
  ok(kills === 0 && !e.dead && !e.killResolved, 'entry killed/rewarded Phantom');
  near(p.phantomPossession.duration, Math.max(6, Math.min(9, NV.waveDuration(20, null) * 0.28)), 'duration formula');
  near(NV.phantomPossessionDuration(1, null), Math.max(6, Math.min(9, NV.waveDuration(1, null) * 0.28)), 'low wave formula');
  near(NV.phantomPossessionDuration(999, 'mines'), 9, 'duration upper clamp');
});

t('13-16 invulnerable/dashing hits miss, recovery 1.00 and retry cooldown 2.5', () => {
  const NV = setup(), cfg = NV.ELITE_PHANTOM_POSSESSION;
  for (const mode of ['invuln', 'dash']) {
    const p = player(300, 200), e = phantom(100, 200), st = init(NV, e, p);
    if (mode === 'invuln') p.invuln = 1; else p.dashActive = true;
    forceCommitHit(NV, e, st);
    ok(!p.phantomPossession && e.phantomState === 'miss_recovery', mode + ' player possessed');
    near(e.phantomStateTimer, cfg.missRecovery, 'miss recovery ' + mode);
    NV.updateEnemies(cfg.missRecovery, st);
    ok(e.phantomState === 'cooldown', 'miss did not enter cooldown');
    near(e.phantomCooldown, cfg.retryCooldown, 'retry cooldown');
  }
});

t('19-28 owner is hidden/inactive and all production damage/target gates ignore it', () => {
  const NV = setup(), p = player(300, 200), e = phantom(100, 200), st = init(NV, e, p);
  forceCommitHit(NV, e, st);
  const hp = e.hp;
  ok(e.phantomCombatInactive && !NV.isEnemyCombatActive(e), 'owner combat active');
  ok(!NV.isEnemyTargetable(e) && !NV.isEnemyDamageable(e), 'owner targetable/damageable');
  ok(NV.findTarget({ player: p, enemies: [e], boss: null }) === null, 'weapon selected owner');
  ok(NV.findDroneTarget(p, [e], null, 500) === null, 'drone selected owner');
  NV.updateBullets(0, { bullets: [{ x: e.x, y: e.y, vx: 0, vy: 0, damage: 999, isEnemy: false, dead: false, pierce: 1, hitTargets: [] }], W: 900, H: 520, player: p, enemies: [e], boss: null, CHARACTERS: NV.CHARACTERS, SHIELD_COOLDOWN: 1, addFloatText() {}, killEnemy() { throw new Error('bullet kill'); }, applyKnockback() {}, spawnExplosion() {}, applyPlayerDamage() {} });
  const flame = NV.createFlameZone({ x: p.x, y: p.y, angle: 0, range: 200, halfAngle: Math.PI, damage: 999, burnDamage: 999, burnDuration: 2 });
  NV.flameZoneDamage(flame, { enemies: [e], boss: null, killEnemy() { throw new Error('flame kill'); }, addFloatText() {}, applyKnockback() {} });
  e.burn = { dps: 999, remaining: 2 }; NV.updateBurns(1, { enemies: [e], boss: null, killEnemy() { throw new Error('burn kill'); } });
  NV.updateMeteors(0, [{ x: e.x, y: e.y, vx: 0, vy: 0, radius: 20, dead: false }], { W: 900, H: 520, enemies: [e], boss: null }, { killEnemy() { throw new Error('meteor kill'); }, applyKnockback() {}, spawnExplosion() {} });
  NV.voidBomb([e], null, () => { throw new Error('void kill'); });
  NV.freezeEnemies([e], 9);
  e.phaseAcc = 100; NV.detonatePhase(p, [e], null, [], { killEnemy() { throw new Error('phase kill'); }, addFloatText() {}, spawnExplosion() {}, triggerFlash() {} }, NV.BALANCE);
  ok(e.hp === hp && e.burn.remaining === 2 && !e.slowUntil, 'damage/status reached owner');
  ok(NV.getGuardProtectionSource(e) === null, 'Guard protects owner');
  const ctx = renderCtx(); ok(NV.drawSpectralEnemy2D(ctx, e, 1, p, null) === false, 'owner rendered');
});

t('29-37 authoritative forceAngle drift 0.40, counter-steering, normalization, dash/stun/Hook and no input mutation', () => {
  const NV = setup(), cfg = NV.ELITE_PHANTOM_POSSESSION;
  const p = player(0, 0); NV.configurePlayerMovement(p, 200, 0); NV.configurePlayerDash(p);
  p.phantomPossession = { active: true, owner: {}, entryAngle: 0, forceAngle: 1.1, elapsed: 2, duration: 8 };
  const a = NV.phantomPossessionIntent(p, 0, 0, false);
  near(Math.hypot(a.x, a.y), cfg.driftStrength, 'drift strength');
  near(Math.atan2(a.y, a.x), 1.1, 'authoritative force angle');
  const b = NV.phantomPossessionIntent(p, 0, 0, false);
  near(a.x, b.x, 'deterministic x'); near(a.y, b.y, 'deterministic y');
  p.phantomPossession.forceAngle = 0;
  const against = NV.phantomPossessionIntent(p, -1, 0, false);
  near(against.x, -0.60, 'counter authority');
  const perpendicular = NV.phantomPossessionIntent(p, 0, 1, false);
  ok(perpendicular.x > 0 && perpendicular.y > 0, 'perpendicular input not bent');
  const withDrift = NV.phantomPossessionIntent(p, 1, 0, false);
  near(Math.hypot(withDrift.x, withDrift.y), 1, 'with-drift normalization');
  const combat = { moveX: 0.25, moveY: -0.5, aimX: 0.7, aimY: 0.2, fireIntent: true };
  const snapshot = JSON.stringify(combat);
  NV.phantomPossessionIntent(p, combat.moveX, combat.moveY, false);
  ok(JSON.stringify(combat) === snapshot, 'combat input mutated');
  p.dashActive = true; ok(!NV.phantomPossessionIntent(p, 0, 0, false).applied, 'dash did not suspend drift');
  p.dashActive = false; p.stun = 1; ok(!NV.phantomPossessionIntent(p, 0, 0, false).applied, 'stun did not suspend drift');
  p.stun = 0; ok(!NV.phantomPossessionIntent(p, 0, 0, true).applied, 'Hook did not suspend drift');
});

t('34-45 timer continues through dash/stun/Hook; one owner; expiry, expel, return, recovery, cooldown and cleanup', () => {
  const NV = setup(), cfg = NV.ELITE_PHANTOM_POSSESSION, p = player(450, 260);
  const first = phantom(200, 260), second = phantom(700, 260);
  const st = state([first, second], p);
  NV.updateEnemies(0, st); forceCommitHit(NV, first, st);
  const initial = first.phantomStateTimer;
  p.dashActive = true; NV.updateEnemies(0.2, st); p.dashActive = false;
  p.stun = 1; NV.updateEnemies(0.2, st); p.stun = 0;
  st.hookSystem = { phase: 'tether', srcEnemy: { x: 0, y: 0 } }; NV.updateEnemies(0.2, st); st.hookSystem = null;
  near(first.phantomStateTimer, initial - 0.6, 'timer did not continue under precedence', 1e-5);
  second.x = p.x - 100; second.phantomState = 'roam_stalk'; second.phantomStalkPhased = true; second.phantomCooldown = 0;
  NV.updateEnemies(0, st); ok(second.phantomState === 'roam_stalk', 'second Phantom started/stacked');
  first.phantomStateTimer = 0.01; first.phantomPossessionElapsed = first.phantomPossessionDuration - 0.01;
  NV.updateEnemies(0.01, st);
  ok(!p.phantomPossession && first.phantomState === 'expel', 'expiry did not stop possession immediately');
  near(first.phantomStateTimer, cfg.expelTime, 'expel duration');
  const returnDistance = Math.hypot(first.phantomReturnX - p.x, first.phantomReturnY - p.y);
  ok(returnDistance >= cfg.returnMinDistance && returnDistance <= cfg.returnDistance + 1, 'unsafe return=' + returnDistance);
  NV.updateEnemies(cfg.expelTime, st);
  ok(first.phantomState === 'return_recovery' && NV.isEnemyTargetable(first), 'return recovery targetability');
  near(first.phantomStateTimer, cfg.returnRecovery, 'return recovery');
  NV.updateEnemies(cfg.returnRecovery, st);
  ok(first.phantomState === 'cooldown', 'no post recovery cooldown'); near(first.phantomCooldown, cfg.postCooldown, 'post cooldown');

  const deathOwner = phantom(100, 100), deathPlayer = player(200, 100), deathState = init(NV, deathOwner, deathPlayer);
  forceCommitHit(NV, deathOwner, deathState); deathPlayer.hp = 0; NV.updateEnemies(0.01, deathState);
  ok(!deathPlayer.phantomPossession && deathOwner.phantomState === 'cleanup', 'death reappeared owner');
  const waveOwner = phantom(100, 100), wavePlayer = player(200, 100), waveState = init(NV, waveOwner, wavePlayer);
  forceCommitHit(NV, waveOwner, waveState); waveOwner.waveCleanup = true; NV.updateEnemies(0.01, waveState);
  ok(!wavePlayer.phantomPossession && waveOwner.phantomState === 'cleanup', 'wave cleanup reappeared owner');
  NV.clearPhantomPossession(wavePlayer, true); ok(!wavePlayer.phantomPossession, 'restart/next wave not clean');
});

t('46-50 finite state, protected mechanics unchanged and renderers are gameplay-pure', () => {
  const NV = setup();
  const p = player(300, 200), e = phantom(100, 200), st = init(NV, e, p); forceCommitHit(NV, e, st);
  NV.updateEnemies(0.016, st);
  for (const value of [e.x, e.y, e.hp, e.phantomStateTimer, p.phantomPossession.elapsed]) ok(Number.isFinite(value), 'NaN/Infinity');
  const data = fs.readFileSync('js/data/gameData.js', 'utf8');
  const enemiesSource = fs.readFileSync('js/engine/enemies.js', 'utf8');
  ok(data.includes("id: 'specter_grunt'") && enemiesSource.includes("e.enemyTypeId === 'specter_grunt'"), 'specter_grunt changed/removed');
  ok(data.includes("id: 'wisp'") && enemiesSource.includes("e.enemyTypeId === 'wisp'"), 'Wisp changed/removed');
  ok(data.includes("visualId: 'elite_predator'") && enemiesSource.includes('PREDATOR_HUNT_TIME = 1.20'), 'Predator changed');
  ok(data.includes("visualId: 'elite_titan'") && enemiesSource.includes('GOLIATH_SLAM_WINDUP = 0.35'), 'Goliath changed');
  const playerCtx = renderCtx(), playerSnapshot = JSON.stringify(p), enemySnapshot = JSON.stringify(e);
  NV.drawPlayer(playerCtx, p, NV.CHARACTERS, 30, null);
  NV.drawSpectralEnemy2D(renderCtx(), e, 30, p, null);
  ok(JSON.stringify(p) === playerSnapshot && JSON.stringify(e) === enemySnapshot, 'renderer mutated gameplay');
  ok(playerCtx.calls.ellipses >= 2 && playerCtx.calls.rotations.length >= 1, 'eyes/chevron VFX missing');
});

console.log('\nRESULT elite_phantom_possession: pass=' + pass + ' fail=' + fail + ' assertions=' + assertions);
process.exit(fail ? 1 : 0);