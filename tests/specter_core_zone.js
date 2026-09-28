// ===== TEST: identidad AREA DENIAL / PERSISTENT ZONE del Specter Core =====
const fs = require('fs'), vm = require('vm');
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('  ok  ' + name); } catch (err) { fail++; console.log('  FAIL ' + name + ' -> ' + err.message); } }
function setup(withRender) {
  const sandbox = { window: { NV: {} }, console, Math, Object, Array, Set, Map, WeakMap };
  ['js/data/balance.js', 'js/data/gameData.js', 'js/engine/hostileBudget.js', 'js/engine/hazards.js', 'js/engine/enemies.js']
    .forEach((file) => vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file }));
  if (withRender) ['js/render/hazards.js', 'js/render/enemies.js'].forEach((file) => vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file }));
  return sandbox.window.NV;
}
function core(x, y, id) { return { x, y, hp: 28, maxHp: 28, damage: 12, speed: 55, radius: 16, color: '#ff2244', shape: 'specter', behavior: 'ranged', enemyTypeId: 'specter_core', dead: false, knockVelX: 0, knockVelY: 0, knockbackRes: 0, hostileClass: 'light', contactCd: 0, coreZoneOwnerId: id || 1 }; }
function state(e, player, hazards, damageFn) { return { enemies: [e], player: player || { x: 250, y: 200, invuln: 0 }, hazards: hazards || [], bullets: [], W: 900, H: 520, MAX_BULLETS: 200, MAX_ENEMY_BULLETS: 40, enemyBulletCount: () => 0, applyPlayerDamage: damageFn || (() => ({ applied: false, killed: false })), addFloatText: () => {}, spawnExplosion: () => {}, wave: 20, waveEvent: null }; }
function enemyStep(NV, st, dt, n) { for (let i = 0; i < (n || 1); i++) NV.updateEnemies(dt, st); }
function hazardStep(NV, hazards, player, apply, dt, n) { const mine = NV.createMinefieldState(); mine.spawnTimer = 999; let res; for (let i = 0; i < (n || 1); i++) res = NV.updateSpeakerMines(dt, hazards, mine, { waveEvent: null, wave: 20, boss: null, transitioning: false, player, playerRadius: 0, applyPlayerDamage: apply || (() => ({ applied: false })), shake: 0 }); return res; }

console.log('specter_core_zone:');
t('1-6. delay inicial, windup 0.55, snapshot tardío fijo y clamp', () => {
  const NV = setup(), e = core(100, 100), p = { x: 200, y: 100 }, hazards = [], st = state(e, p, hazards);
  enemyStep(NV, st, 0.01); if (e.coreZoneState !== 'positioning' || e.coreZoneCooldown < 0.78) throw new Error('cast inmediato');
  enemyStep(NV, st, 0.05, 15); if (e.coreZoneState !== 'positioning') throw new Error('delay corto');
  enemyStep(NV, st, 0.05); if (e.coreZoneState !== 'windup' || e.coreZoneTimer !== 0.55) throw new Error('sin windup');
  p.x = -50; p.y = 999; enemyStep(NV, st, 0.54); if (hazards.length) throw new Error('seed temprano');
  enemyStep(NV, st, 0.01); if (hazards.length !== 1 || e.coreZoneTargetX !== 84 || e.coreZoneTargetY !== 436) throw new Error('snapshot/clamp');
  const z = hazards[0], pos = [z.x, z.y]; p.x = 700; p.y = 80; enemyStep(NV, st, 0.4); if (z.x !== pos[0] || z.y !== pos[1]) throw new Error('homing');
});
t('7-10. arming sin daño, radio 84, activo 2.10 y world-space fijo', () => {
  const NV = setup(), hazards = [], e = core(100, 100), z = NV.spawnCoreZone(hazards, e, 300, 200); let calls = 0;
  hazardStep(NV, hazards, { x: 300, y: 200 }, () => { calls++; return { applied: true }; }, 0.49); if (calls || z.state !== 'arming') throw new Error('daño arming');
  hazardStep(NV, hazards, { x: 300, y: 200 }, () => ({ applied: false }), 0.01); if (z.state !== 'active' || z.radius !== 84) throw new Error('arm/radio');
  const xy = [z.x, z.y]; hazardStep(NV, hazards, { x: 800, y: 400 }, null, 2.08); if (z.state !== 'active' || z.x !== xy[0] || z.y !== xy[1]) throw new Error('duración/movimiento');
  hazardStep(NV, hazards, { x: 800, y: 400 }, null, 0.02); if (z.state !== 'expiring') throw new Error('activeTime');
});
t('11-15. daño sólo dentro, finito, 0.50s, 50% y pipeline central', () => {
  const NV = setup(), e = core(100, 100), hazards = [], z = NV.spawnCoreZone(hazards, e, 300, 200); z.state = 'active'; z.stateTime = 0; let hits = [];
  const apply = (d, opts) => { hits.push([d, opts]); return { applied: true, killed: false }; };
  hazardStep(NV, hazards, { x: 500, y: 200 }, apply, 0.01); if (hits.length) throw new Error('daño fuera');
  hazardStep(NV, hazards, { x: 300, y: 200 }, apply, 0.01); if (hits.length !== 1 || hits[0][0] !== 6 || !Number.isFinite(hits[0][0])) throw new Error('tick damage');
  hazardStep(NV, hazards, { x: 300, y: 200 }, apply, 0.49); if (hits.length !== 1) throw new Error('per-frame damage');
  hazardStep(NV, hazards, { x: 300, y: 200 }, apply, 0.01); if (hits.length !== 2 || hits[1][1].hazard !== z || hits[1][1].cause !== 'specter-core-zone' || hits[1][1].allowCrit !== false || hits[1][1].allowDodge !== false || hits[1][1].respectInvulnerability !== true) throw new Error('interval/pipeline');
});
t('16-20. ownership/cap, expiry/cleanup y muerte del Core no corrompe zona', () => {
  const NV = setup(), hazards = [], a = core(0, 0, 1), b = core(0, 0, 2), c = core(0, 0, 3), d = core(0, 0, 4), e = core(0, 0, 5);
  if (!NV.spawnCoreZone(hazards, a, 100, 100) || NV.spawnCoreZone(hazards, a, 120, 100)) throw new Error('owner cap');
  [b, c, d].forEach((owner, i) => NV.spawnCoreZone(hazards, owner, 200 + i * 80, 100));
  if (hazards.length !== 4 || NV.spawnCoreZone(hazards, e, 600, 100)) throw new Error('global cap');
  const first = hazards[0]; a.dead = true; hazardStep(NV, hazards, { x: 800, y: 400 }, null, 0.2); if (first.state === 'dead') throw new Error('owner death removed zone');
  first.state = 'expiring'; first.stateTime = 0.17; hazardStep(NV, hazards, { x: 800, y: 400 }, null, 0.02); if (hazards.includes(first)) throw new Error('expiry cleanup');
  NV.clearHazards(hazards, NV.createMinefieldState()); if (hazards.length) throw new Error('reset cleanup');
});
t('21-27. stats/roles/caps no cambian', () => {
  const NV = setup(), expected = { specter_core: { hp: 28, speed: 55, damage: 12, radius: 16, minWave: 20, weight: 0.06 }, wisp: { hp: 12, speed: 160, damage: 6, radius: 6, minWave: 15, behavior: 'erratic' }, specter_guard: { hp: 55, speed: 45, damage: 12, radius: 18, minWave: 5, behavior: 'shield' }, swarmlet: { hp: 10, speed: 115, damage: 8, radius: 7, minWave: 9, behavior: 'swarm' }, specter_grunt: { hp: 20, speed: 85, damage: 10, radius: 10, minWave: 3, behavior: 'chase' }, runner: { hp: 15, speed: 145, damage: 10, radius: 9, behavior: 'flank' }, spitter: { hp: 22, speed: 50, damage: 15, radius: 13, behavior: 'ranged' } };
  Object.keys(expected).forEach((id) => { const got = NV.ENEMY_TYPES.find((x) => x.id === id); Object.keys(expected[id]).forEach((k) => { if (got[k] !== expected[id][k]) throw new Error(id + '.' + k); }); });
  if (NV.WISP_PHASE_ATTACK.markTime !== 0.48 || NV.SPECTER_GUARD_PROTECTOR.damageReduction !== 0.90) throw new Error('Wisp/Guard');
  if (NV.BALANCE.MAX_HOSTILES !== 30 || NV.BALANCE.MAX_HEAVY_HOSTILES !== 7 || NV.BALANCE.MAX_BULLETS !== 200 || NV.BALANCE.MAX_PARTICLES !== 200) throw new Error('caps');
});
function fakeCtx() { const calls = []; return new Proxy({ calls }, { get(t, k) { if (k === 'calls') return calls; if (k in t) return t[k]; return (...args) => calls.push([k].concat(args)); }, set(t, k, v) { t[k] = v; calls.push(['set', k, v]); return true; } }); }
t('28. render de windup/zona no muta gameplay', () => {
  const NV = setup(true), e = core(100, 100); e.coreZoneState = 'windup'; e.coreZoneTimer = 0.3; const z = NV.spawnCoreZone([], e, 300, 200); const eb = JSON.stringify(e), zb = JSON.stringify(z);
  const c1 = fakeCtx(); NV.drawEnemy(c1, e, 60, { x: 200, y: 100 }, null, 1);
  const c2 = fakeCtx(); NV.drawHazards(c2, [z], null, { tier: 'minimal' }, false);
  if (JSON.stringify(e) !== eb || JSON.stringify(z) !== zb || !c2.calls.some((x) => x[0] === 'arc')) throw new Error('mutación/render ausente');
});

console.log('\nRESULT specter_core_zone: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);