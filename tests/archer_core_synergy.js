// ===== TEST: Archer/Core autonomy + optional event-time synergy =====
const fs = require('fs'), vm = require('vm');
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('  ok  ' + name); } catch (err) { fail++; console.log('  FAIL ' + name + ' -> ' + err.message); } }
function near(actual, expected, label, eps) { if (Math.abs(actual - expected) > (eps == null ? 1e-6 : eps)) throw new Error(label + '=' + actual + ' expected=' + expected); }
function setup(withRender) {
  const math = Object.create(Math); math.random = () => 0.5;
  const sandbox = { window: { NV: {} }, console, Math: math, Number, Object, Array, Set, Map, WeakMap, JSON };
  ['js/data/balance.js', 'js/data/gameData.js', 'js/engine/hostileBudget.js', 'js/engine/movement.js', 'js/engine/hazards.js', 'js/engine/enemies.js']
    .forEach((file) => vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file }));
  if (withRender) ['js/render/hazards.js', 'js/render/enemies.js'].forEach((file) => vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file }));
  return sandbox.window.NV;
}
function archer(x, y) { return { x, y, hp: 18, maxHp: 18, damage: 9, speed: 60, radius: 12, color: '#ffb24a', shape: 'triangle', behavior: 'ranged', enemyTypeId: 'specter_archer', dead: false, knockVelX: 0, knockVelY: 0, knockbackRes: 0.2, hostileClass: 'medium', contactCd: 0, shootTimer: 0, hookCooldown: 0, hookOwner: false, hookWindup: false }; }
function core(x, y, id) { return { x, y, hp: 28, maxHp: 28, damage: 12, speed: 55, radius: 16, color: '#ff2244', shape: 'specter', behavior: 'ranged', enemyTypeId: 'specter_core', dead: false, knockVelX: 0, knockVelY: 0, knockbackRes: 0.2, hostileClass: 'medium', contactCd: 0, coreZoneOwnerId: id, coreZoneState: 'positioning', coreZoneTimer: 0, coreZoneCooldown: 0 }; }
function player(x, y) { return { x, y, radius: 20, hp: 100, maxHp: 100, invuln: 0, stun: 0, moveVx: 0, moveVy: 0, dashActive: false }; }
function state(enemies, target, hazards, hookSystem) { return { enemies, player: target, hazards: hazards || [], hookSystem: hookSystem || null, bullets: [], W: 900, H: 520, wave: 20, waveEvent: null, MAX_BULLETS: 200, MAX_ENEMY_BULLETS: 40, enemyBulletCount: () => 0, applyPlayerDamage: () => ({ applied: false, killed: false }), addFloatText: () => {}, spawnExplosion: () => {} }; }
function latch(NV, source, target, enemies, hazards) {
  const hs = NV.createHookSystem();
  hs.phase = 'projectile'; hs.srcEnemy = source; source.hookOwner = true;
  hs.projectile = { x: target.x, y: target.y, vx: 0, vy: 0, dist: 10 };
  NV.updateHookSystem(0, hs, enemies, target, { hazards, W: 900, H: 520 });
  return hs;
}
function fakeCtx() { const calls = []; return new Proxy({ calls }, { get(o, k) { if (k === 'calls') return calls; if (k in o) return o[k]; return (...args) => calls.push([k].concat(args)); }, set(o, k, v) { o[k] = v; calls.push(['set', k, v]); return true; } }); }

console.log('archer_core_synergy:');
t('1-9 Core tuning, hostile-red presentation and independent repeated casting', () => {
  const NV = setup(true), cfg = NV.SPECTER_CORE_ZONE;
  if (cfg.radius !== 84 || cfg.armTime !== 0.50 || cfg.activeTime !== 2.10 || cfg.cooldown !== 2.50 || cfg.tickInterval !== 0.50 || cfg.damageMult !== 0.50) throw new Error('Core tuning');
  const def = NV.ENEMY_TYPES.find((e) => e.id === 'specter_core'); if (!def || def.damage !== 12) throw new Error('Core damage changed');
  const e = core(100, 100, 1), p = player(200, 100), hazards = [], st = state([e], p, hazards, null);
  e.coreZoneCooldown = 0; NV.updateEnemies(0, st); if (e.coreZoneState !== 'windup') throw new Error('Core waits without Archer');
  NV.updateEnemies(0.55, st); if (hazards.length !== 1 || e.coreZoneState !== 'recovery') throw new Error('first autonomous cast');
  hazards[0].state = 'dead'; NV.updateEnemies(2.50, st); NV.updateEnemies(0, st); if (e.coreZoneState !== 'windup') throw new Error('normal cooldown/recast');
  const deadArcher = archer(120, 100); deadArcher.dead = true; hazards.length = 0; e.coreZoneState = 'positioning'; e.coreZoneCooldown = 0;
  NV.updateEnemies(0, state([deadArcher, e], p, hazards, null)); if (e.coreZoneState !== 'windup') throw new Error('Core dormant after Archer death');
  const failed = core(110, 100, 2); failed.coreZoneCooldown = 0.2; if (NV.requestArcherCoreSynergy(archer(100, 100), p, [failed], hazards, 900, 520) !== null || failed.coreZoneCooldown !== 0.2 || failed.coreZoneState !== 'positioning') throw new Error('failed synergy altered Core');
  NV.updateEnemies(0.2, state([failed], p, hazards, null)); if (failed.coreZoneState !== 'windup') throw new Error('failed synergy delayed normal Core cast');
  const activeCtx = fakeCtx(); NV.drawHazards(activeCtx, [{ type: 'coreZone', state: 'active', stateTime: 0, simTime: 0, x: 10, y: 10, radius: 84, armTime: 0.5 }], null, null, false);
  const armingCtx = fakeCtx(); NV.drawHazards(armingCtx, [{ type: 'coreZone', state: 'arming', stateTime: 0.25, simTime: 0, x: 10, y: 10, radius: 84, armTime: 0.5 }], null, null, false);
  if (!activeCtx.calls.some((x) => x[0] === 'set' && x[1] === 'fillStyle' && x[2] === '#ff3b4f')) throw new Error('active zone not hostile red');
  if (!armingCtx.calls.some((x) => x[0] === 'set' && x[1] === 'strokeStyle' && x[2] === '#ff6474')) throw new Error('arming warning not hostile red');
});

t('10-21 Archer tuning, autonomy, zero damage and dash break', () => {
  const NV = setup(), B = NV.BALANCE, a = archer(100, 100), p = player(250, 100), hs = NV.createHookSystem();
  if (B.HOOK_WINDUP_TIME !== 0.55 || B.HOOK_PROJECTILE_SPEED !== 560 || B.HOOK_PROJECTILE_MAX_RANGE !== 430 || B.HOOK_PULL_DURATION !== 0.50 || B.HOOK_PULL_EXTERNAL_SPEED !== 255 || B.HOOK_TETHER_MAX_RANGE !== 470 || B.HOOK_GLOBAL_LOCKOUT_POST_RELEASE !== 0.85 || B.HOOK_DIRECT_DAMAGE !== 0) throw new Error('Hook tuning');
  NV.updateEnemies(0, state([a], p, [], hs)); if (hs.phase !== 'windup' || hs.srcEnemy !== a) throw new Error('Archer waited for Core');
  hs.windupTimer = 0; NV.updateHookSystem(0, hs, [a], p); if (!hs.projectile || Math.hypot(hs.projectile.vx, hs.projectile.vy) < 559.99) throw new Error('Hook projectile weakened');
  hs.projectile.x = p.x; hs.projectile.y = p.y; const hp = p.hp; NV.updateHookSystem(0, hs, [a], p, { hazards: [], W: 900, H: 520 });
  if (hs.phase !== 'tether' || p.hp !== hp) throw new Error('normal Hook/no damage');
  NV.configurePlayerMovement(p, 200, 0); NV.configurePlayerDash(p); const was = p.dashActive; NV.updatePlayerDash(p, true, 1, 0, 0, 0, false, 0);
  if (NV.applyHookPull(1 / 60, hs, p, was) || hs.phase !== 'idle') throw new Error('dash did not break Hook');
});

t('22-33 synergy triggers one nearest eligible Core and ignores every invalid Core', () => {
  const NV = setup(), a = archer(100, 100), p = player(300, 100), hazards = [];
  const dead = core(120, 100, 1); dead.dead = true;
  const busy = core(130, 100, 2); busy.coreZoneState = 'windup';
  const cooldown = core(140, 100, 3); cooldown.coreZoneCooldown = 1;
  const outside = core(600, 100, 4);
  const active = core(150, 100, 5); NV.spawnCoreZone(hazards, active, 400, 300);
  const nearCore = core(180, 100, 6), farCore = core(260, 100, 7);
  const hs = latch(NV, a, p, [a, dead, busy, cooldown, outside, active, nearCore, farCore], hazards);
  if (hs.phase !== 'tether') throw new Error('Hook cancelled');
  if (nearCore.coreZoneState !== 'windup' || !nearCore.coreZoneForcedTarget) throw new Error('nearest eligible not selected');
  if (farCore.coreZoneState !== 'positioning') throw new Error('more than one Core responded');
  for (const invalid of [dead, busy, cooldown, outside, active]) if (invalid.coreZoneForcedTarget) throw new Error('invalid Core selected');
  const blocked = core(200, 100, 8), capHazards = []; for (let i = 0; i < 4; i++) NV.spawnCoreZone(capHazards, core(0, 0, 20 + i), i * 100, 0);
  const hs2 = latch(NV, archer(100, 100), p, [blocked], capHazards); if (hs2.phase !== 'tether' || blocked.coreZoneState !== 'positioning') throw new Error('global cap handling');
});

t('34-43 authoritative prediction snapshots once, survives movement/dash and both AIs recover', () => {
  const NV = setup(), a = archer(100, 100), p = player(300, 100), c = core(160, 100, 1), hazards = [];
  const predicted = NV.predictHookPullDestination(a, p, 900, 520); near(predicted.x, 172.5, 'predicted x'); near(predicted.y, 100, 'predicted y');
  const hs = latch(NV, a, p, [a, c], hazards); near(c.coreZoneTargetX, predicted.x, 'snapshot x'); near(c.coreZoneTargetY, predicted.y, 'snapshot y');
  p.x = 700; p.y = 400; a.x = 500; a.y = 400; const snap = [c.coreZoneTargetX, c.coreZoneTargetY];
  NV.updateEnemies(0.55, state([a, c], p, hazards, hs)); if (hazards.length !== 1 || hazards[0].x !== snap[0] || hazards[0].y !== snap[1]) throw new Error('retarget after movement');
  const zoneDamage = hazards[0].damage; if (zoneDamage !== c.damage * 0.5) throw new Error('combo damage buffed');
  const was = p.dashActive; p.dashActive = true; NV.applyHookPull(0.01, hs, p, was); if (hs.phase !== 'idle' || hazards[0].x !== snap[0]) throw new Error('dash retarget/break');
  if (c.coreZoneState !== 'recovery' || c.coreZoneTimer !== 2.50) throw new Error('Core normal recovery');
  NV.updateEnemies(2.50, state([a, c], p, hazards, hs)); if (c.coreZoneState !== 'positioning' || Object.prototype.hasOwnProperty.call(c, 'archerPartner')) throw new Error('Core autonomy/pairing');
  if (a.hookCooldown <= 0 || a.hookOwner) throw new Error('Archer normal cooldown');
});

t('44-48 composition safety: no spawning, weights, waves or fixed ownership added', () => {
  const balance = fs.readFileSync('js/data/balance.js', 'utf8'), enemies = fs.readFileSync('js/engine/enemies.js', 'utf8'), game = fs.readFileSync('js/game.js', 'utf8');
  const synergyStart = enemies.indexOf('function requestArcherCoreSynergy');
  const synergyEnd = enemies.indexOf('\n  NV.requestArcherCoreSynergy', synergyStart);
  const block = enemies.slice(synergyStart, synergyEnd);
  if (block.includes('spawnEnemy') || block.includes('enemies.push') || block.includes('weight')
      || /\bst\.wave\b|\bwaveEvent\b|\bnextWave\b|\bspawnBatch\b/.test(block)) throw new Error('composition coupling in synergy');
  if (/partner|pairId|ownerArcher|ownedCore/i.test(block)) throw new Error('fixed partner ownership');
  if (!balance.includes('HOOK_SOURCE_PRESENCE_MULT = 2.5') || game.includes('ARCHER_CORE_SYNERGY')) throw new Error('spawn/wave system changed');
});

t('49-55 untouched families, caps and player pierce contracts remain unchanged', () => {
  const NV = setup();
  const expected = { wisp: [12, 160, 6], specter_guard: [55, 45, 12], swarmlet: [10, 115, 8], specter_grunt: [20, 85, 10], runner: [15, 145, 10], spitter: [22, 50, 15] };
  for (const id of Object.keys(expected)) { const e = NV.ENEMY_TYPES.find((x) => x.id === id), v = expected[id]; if (!e || e.hp !== v[0] || e.speed !== v[1] || e.damage !== v[2]) throw new Error(id + ' changed'); }
  if (NV.BALANCE.MAX_HOSTILES !== 30 || NV.BALANCE.MAX_HEAVY_HOSTILES !== 7) throw new Error('hostile caps changed');
  const bullets = fs.readFileSync('js/engine/bullets.js', 'utf8'); if (!bullets.includes('pierce')) throw new Error('player pierce contract missing');
});

console.log('\nRESULT archer_core_synergy: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);