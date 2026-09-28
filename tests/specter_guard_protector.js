// ===== TEST: specter_guard meaningful protector/bodyguard =====
const fs = require('fs'), vm = require('vm');
let pass = 0, fail = 0, assertions = 0;
function ok(value, message) { assertions++; if (!value) throw new Error(message); }
function near(actual, expected, label, eps) { assertions++; if (Math.abs(actual - expected) > (eps == null ? 1e-6 : eps)) throw new Error(label + '=' + actual + ' expected=' + expected); }
function t(name, fn) { try { fn(); pass++; console.log('  ok  ' + name); } catch (err) { fail++; console.log('  FAIL ' + name + ' -> ' + err.message); } }

function setup(files) {
  const math = Object.create(Math); math.random = () => 0.5;
  const sandbox = { window: { NV: {} }, console, Math: math, Number, Object, Array, Set, Map, WeakMap, JSON };
  const list = ['js/data/balance.js', 'js/data/gameData.js', 'js/engine/hostileBudget.js', 'js/engine/enemies.js'].concat(files || []);
  list.forEach((file) => vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file }));
  return sandbox.window.NV;
}
function unit(id, x, y, over) {
  const types = {
    specter_guard: { hp: 55, damage: 12, speed: 45, radius: 18, behavior: 'shield', hostileClass: 'medium' },
    specter_archer: { hp: 18, damage: 9, speed: 60, radius: 12, behavior: 'ranged', hostileClass: 'medium' },
    drone: { hp: 100, damage: 12, speed: 75, radius: 11, behavior: 'chase', hostileClass: 'light' },
  };
  const base = types[id] || types.drone;
  return Object.assign({ x, y, hp: base.hp, maxHp: base.hp, damage: base.damage, speed: base.speed, radius: base.radius,
    behavior: base.behavior, hostileClass: base.hostileClass, enemyTypeId: id, dead: false, knockVelX: 0, knockVelY: 0,
    knockbackRes: 0, contactCd: 0, color: '#fff', shape: 'circle', stun: 0, hitFlash: 0, hitSlowUntil: 0, hitSlowImmunity: 0 }, over || {});
}
function state(enemies, player) {
  return { enemies, player: player || { x: -200, y: 0, radius: 20, invuln: 0, stun: 0 }, bullets: [], W: 900, H: 600,
    MAX_BULLETS: 50, MAX_ENEMY_BULLETS: 20, enemyBulletCount: () => 0, applyPlayerDamage: () => ({ applied: false }),
    addFloatText() {}, spawnExplosion() {}, boss: null, wave: 10, waveEvent: null };
}
function activate(NV, guard, ally, extra, player) {
  const st = state([guard, ally].concat(extra || []), player);
  NV.updateEnemies(0.01, st);
  return st;
}
function bulletCtx(NV, enemies, bullets, killEnemy) {
  return { bullets, W: 900, H: 600, player: { x: 0, y: 0, radius: 20, character: 'boti' }, enemies, boss: null,
    CHARACTERS: NV.CHARACTERS, SHIELD_COOLDOWN: 1, addFloatText() {}, killEnemy: killEnemy || ((e) => { e.dead = true; }),
    applyKnockback() {}, spawnExplosion() {}, applyPlayerDamage: () => ({ applied: false }) };
}
function hitBullet(NV, target, damage, pierce) {
  const b = { x: target.x, y: target.y, vx: 0, vy: 0, damage, dead: false, isEnemy: false, pierce: pierce || 1, hitTargets: [] };
  NV.updateBullets(0, bulletCtx(NV, [target], [b]));
}

console.log('specter_guard_protector:');

t('41-45, 60, 62. exact 90%, 10% passes, Guard full, non-stacking, radius/death gates', () => {
  const NV = setup(['js/engine/bullets.js']), cfg = NV.SPECTER_GUARD_PROTECTOR;
  near(cfg.damageReduction, 0.90, 'damage reduction'); near(cfg.protectionRadius, 90, 'protection radius');
  const guard = unit('specter_guard', 52, 0), ally = unit('drone', 100, 0), second = unit('specter_guard', 55, 8);
  activate(NV, guard, ally, [second]);
  near(NV.guardProtectedDamage(ally, 10), 1, 'protected damage');
  hitBullet(NV, ally, 10); near(ally.hp, 99, 'bullet 10%'); ok(ally.hp < 100, 'ally invulnerable');
  hitBullet(NV, guard, 10); near(guard.hp, 45, 'Guard full damage');
  ok((guard.guardProtectionActive ? 1 : 0) + (second.guardProtectionActive ? 1 : 0) === 1, 'multiple claims stacked');
  ally.x = 200; near(NV.guardProtectedDamage(ally, 10), 10, 'protection outside 90px');
  ally.x = 100; guard.dead = true; near(NV.guardProtectedDamage(ally, 10), 10, 'dead Guard still protects');
});

t('46-49. bullet, piercing bullet, direct flame and burn all respect protection', () => {
  const NV = setup(['js/engine/flame.js', 'js/engine/bullets.js']);
  const guard = unit('specter_guard', 52, 0), ally = unit('drone', 100, 0), st = activate(NV, guard, ally);
  hitBullet(NV, ally, 10); near(ally.hp, 99, 'bullet');
  hitBullet(NV, ally, 10, 2); near(ally.hp, 98, 'piercing bullet');
  const zone = NV.createFlameZone({ x: 0, y: 0, angle: 0, range: 170, halfAngle: 1, damage: 10, burnDamage: 4, burnDuration: 1 });
  zone.x = 0; zone.y = 0; zone.hitTargets = [];
  NV.flameZoneDamage(zone, { player: st.player, enemies: [ally], boss: null, addFloatText() {}, killEnemy() {}, applyKnockback() {}, spawnExplosion() {} });
  near(ally.hp, 97, 'direct flame');
  NV.updateBurns(0.5, { enemies: [ally], boss: null, killEnemy() {}, spawnExplosion() {} });
  near(ally.hp, 96.8, 'burn');
});

t('50-52. splash AoE snapshots protection: Guard full, ally 10%, later damage normal after death', () => {
  const NV = setup(['js/engine/bullets.js']);
  const guard = unit('specter_guard', 52, 0, { hp: 5, maxHp: 5 }), ally = unit('drone', 100, 0);
  activate(NV, guard, ally);
  const splash = { x: guard.x, y: guard.y, vx: 0, vy: 0, damage: 10, dead: false, isEnemy: false, pierce: 1,
    impactType: 'splash', splashRadius: 100, color: '#fff', hitTargets: [] };
  NV.updateBullets(0, bulletCtx(NV, [guard, ally], [splash], (e) => { e.dead = true; }));
  near(guard.hp, -5, 'AoE Guard damage'); near(ally.hp, 99, 'AoE protected ally damage'); ok(guard.dead, 'Guard did not die');
  near(NV.guardProtectedDamage(ally, 10), 10, 'death did not immediately remove protection');
  hitBullet(NV, ally, 10); near(ally.hp, 89, 'subsequent damage remained protected');
});

t('50. meteor and phase detonation/AoE routes use the shared protection helper', () => {
  const NV = setup(['js/engine/meteors.js', 'js/engine/special.js']);
  NV.spawnShockwave = () => {};
  const guard = unit('specter_guard', 52, 0), ally = unit('drone', 100, 0); activate(NV, guard, ally);
  const meteors = [{ x: ally.x, y: ally.y, vx: 0, vy: 0, radius: 20, color: '#fff', dead: false }];
  NV.updateMeteors(0, meteors, { H: 600, enemies: [ally], boss: null, shake: 0 }, { killEnemy() {}, applyKnockback() {}, spawnExplosion() {} });
  near(ally.hp, 96, 'meteor');
  ally.phaseAcc = 20;
  NV.detonatePhase({ x: 0, y: 0 }, [ally], null, [], { addFloatText() {}, killEnemy() {}, spawnExplosion() {}, triggerFlash() {} }, NV.BALANCE);
  near(ally.hp, 95, 'phase detonation');
});

t('53-57. cover formation: escort target stays 42px beyond the protected ally, 4px deadzone, x1.40 speed', () => {
  const NV = setup(), cfg = NV.SPECTER_GUARD_PROTECTOR;
  near(cfg.escortDistance, 42, 'escort distance'); near(cfg.escortDeadzone, 4, 'escort deadzone'); near(cfg.escortSpeedMult, 1.40, 'escort speed mult');
  // Jugador x=100, aliado x=200: el Guard debe quedar MAS ALLA del aliado (player -> aliado -> Guard), no delante.
  const guard = unit('specter_guard', 320, 100), ally = unit('drone', 200, 100, { speed: 0 }), p = { x: 100, y: 100, radius: 20, invuln: 0, stun: 0 };
  const st = state([guard, ally], p), before = guard.x;
  NV.updateEnemies(0.10, st);
  near(guard.guardEscortX, 242, 'escort x beyond the ally'); near(guard.guardEscortY, 100, 'escort y beyond the ally');
  ok(p.x < ally.x && ally.x < guard.guardEscortX, 'Guard target is not on the opposite side of the protected ally');
  ok((guard.guardEscortX - ally.x) * (p.x - ally.x) + (guard.guardEscortY - ally.y) * (p.y - ally.y) < 0, 'escort target is between player and protected ally');
  near(Math.hypot(guard.guardEscortX - ally.x, guard.guardEscortY - ally.y), 42, 'escort radius');
  near(before - guard.x, 45 * 1.40 * 0.10, 'escort movement toward the covered slot');
  ok(guard.guardState === 'escort', 'Guard did not escort the cover slot');
  // Guard ya en el slot con aliado estatico: mantiene posicion (deadzone) y protege sin importar el lado del jugador.
  const g2 = unit('specter_guard', 242, 100), a2 = unit('drone', 200, 100, { speed: 0 }), p2 = { x: 100, y: 100, radius: 20, invuln: 0, stun: 0 };
  const st2 = state([g2, a2], p2);
  NV.updateEnemies(0.10, st2);
  near(g2.x, 242, 'escort slot jitter x'); near(g2.guardEscortX, 242, 'escort slot target');
  ok(g2.guardProtectionActive === true && NV.getGuardProtectionSource(a2) === g2, 'covering Guard is not protecting');
  near(NV.guardProtectedDamage(a2, 10), 1, 'protection is not 90% behind the ally');
  NV.updateEnemies(0.10, st2);
  near(g2.x, 242, 'escort oscillation'); near(g2.guardEscortX, 242, 'escort target oscillation');
  p2.x = 300;
  NV.updateEnemies(0.10, st2);
  near(g2.guardEscortX, 158, 'flipped escort x');
  ok(p2.x > a2.x && a2.x > g2.guardEscortX, 'Guard did not flip to stay behind the ally');
  ok(g2.guardProtectionActive === true, 'flip frame dropped protection');
  near(NV.guardProtectedDamage(a2, 10), 1, 'protection became directional after the flip');
  // Rotacion continua alrededor del aliado: el destino orbita opuesto a 42px y el paso permanece acotado.
  const p3 = { x: 100, y: 100, radius: 20, invuln: 0, stun: 0 };
  const g3 = unit('specter_guard', 242, 100), a3 = unit('drone', 200, 100, { speed: 0 });
  const st3 = state([g3, a3], p3);
  let prevX = g3.x, prevY = g3.y, maxStep = 0;
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6;
    p3.x = a3.x + Math.cos(angle) * 160; p3.y = a3.y + Math.sin(angle) * 160;
    const allyX = a3.x, allyY = a3.y;
    NV.updateEnemies(0.10, st3);
    const dirX = allyX - p3.x, dirY = allyY - p3.y, dirLen = Math.hypot(dirX, dirY);
    near(g3.guardEscortX, allyX + dirX / dirLen * cfg.escortDistance, 'orbiting escort x ' + i, 1e-9);
    near(g3.guardEscortY, allyY + dirY / dirLen * cfg.escortDistance, 'orbiting escort y ' + i, 1e-9);
    near(Math.hypot(g3.guardEscortX - allyX, g3.guardEscortY - allyY), 42, 'orbiting escort radius ' + i, 1e-9);
    ok((g3.guardEscortX - allyX) * (p3.x - allyX) + (g3.guardEscortY - allyY) * (p3.y - allyY) < 0, 'escort target crossed in front of the ally at step ' + i);
    const step = Math.hypot(g3.x - prevX, g3.y - prevY);
    if (step > maxStep) maxStep = step;
    ok(step <= 45 * 1.40 * 0.10 + 1.6, 'escort step teleported at step ' + i);
    prevX = g3.x; prevY = g3.y;
  }
  ok(maxStep > 0, 'Guard never repositioned while the player rotated');
  ok(g3.guardState === 'escort' || g3.guardState === 'reposition', 'Guard stopped protecting while rotating');
});

t('51, 54-61. target selection, stats and unrelated enemy production values remain unchanged', () => {
  const NV = setup();
  const guard = unit('specter_guard', 100, 0), otherGuard = unit('specter_guard', 105, 0), dead = unit('specter_archer', 110, 0, { dead: true });
  const far = unit('specter_archer', 381, 0), drone = unit('drone', 130, 0), archer = unit('specter_archer', 250, 0);
  NV.updateEnemies(0.01, state([guard, otherGuard, dead, far, drone, archer]));
  ok(guard.guardTarget === archer, 'target selection changed');
  const type = NV.ENEMY_TYPES.find((e) => e.id === 'specter_guard');
  const expectedGuard = { hp: 55, speed: 45, damage: 12, radius: 18, minWave: 5, weight: 0.10, behavior: 'shield' };
  for (const key of Object.keys(expectedGuard)) ok(type[key] === expectedGuard[key], 'Guard ' + key);
  const expected = {
    specter_grunt: { hp: 20, speed: 85, damage: 10 }, swarmlet: { hp: 10, speed: 115, damage: 8 },
    wisp: { hp: 12, speed: 160, damage: 6 }, specter_core: { hp: 28, speed: 55, damage: 12 },
    runner: { hp: 15, speed: 145, damage: 10 }, spitter: { hp: 22, speed: 50, damage: 15 },
  };
  for (const id of Object.keys(expected)) {
    const entry = NV.ENEMY_TYPES.find((e) => e.id === id);
    for (const key of Object.keys(expected[id])) ok(entry[key] === expected[id][key], id + '.' + key);
  }
  ok(NV.BALANCE.MAX_HOSTILES === 30 && NV.BALANCE.MAX_HEAVY_HOSTILES === 7, 'hostile caps changed');
});

t('Guard tether/brackets render remains O(1) and does not mutate gameplay', () => {
  const NV = setup(), guard = unit('specter_guard', 52, 0), ally = unit('drone', 100, 0); activate(NV, guard, ally);
  const sandbox = { window: { NV }, console, Math, Number, Object, Array, Set, Map, WeakMap };
  vm.runInNewContext(fs.readFileSync('js/render/spectralEnemies2D.js', 'utf8'), sandbox, { filename: 'spectralEnemies2D.js' });
  const calls = { lines: 0, strokes: 0 };
  const ctx = new Proxy({ calls }, { get(obj, key) {
    if (key in obj) return obj[key];
    if (key === 'lineTo') return () => { calls.lines++; };
    if (key === 'stroke') return () => { calls.strokes++; };
    if (key === 'createRadialGradient' || key === 'createLinearGradient') return () => ({ addColorStop() {} });
    return () => {};
  }, set() { return true; } });
  const snapshot = JSON.stringify({ guard: Object.assign({}, guard, { guardTarget: null, guardEncounterPlayer: null }), ally });
  NV.drawSpectralEnemy2D(ctx, guard, 20, { x: 0, y: 0 }, null);
  const after = JSON.stringify({ guard: Object.assign({}, guard, { guardTarget: null, guardEncounterPlayer: null }), ally });
  ok(calls.lines >= 1 && calls.strokes >= 1, 'tether/brackets absent'); ok(snapshot === after, 'render mutated gameplay');
});

console.log('\nRESULT specter_guard_protector: pass=' + pass + ' fail=' + fail + ' assertions=' + assertions);
process.exit(fail ? 1 : 0);