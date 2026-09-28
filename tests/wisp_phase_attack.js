// ===== TEST: identidad PHASE / DELAYED POSITIONAL THREAT del Wisp =====
const fs = require('fs'), vm = require('vm');
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('  ok  ' + name); } catch (err) { fail++; console.log('  FAIL ' + name + ' -> ' + err.message); } }

function setupEngine(withWeapons) {
  const math = Object.create(Math); math.random = function () { return 0.5; };
  const sandbox = { window: { NV: {} }, console, Math: math, Object, Array, Set, Map, WeakMap };
  const files = ['js/data/balance.js', 'js/data/gameData.js', 'js/engine/hostileBudget.js', 'js/engine/enemies.js'];
  if (withWeapons) files.push('js/engine/fx.js', 'js/engine/flame.js', 'js/engine/bullets.js');
  files.forEach(function (file) { vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file }); });
  return sandbox.window.NV;
}
function wisp(x, y) {
  return { x, y, hp: 12, maxHp: 12, damage: 6, speed: 160, radius: 6, color: '#4ade80', shape: 'dot',
    behavior: 'erratic', enemyTypeId: 'wisp', dead: false, knockVelX: 0, knockVelY: 0,
    knockbackRes: 0.2, hostileClass: 'light', contactCd: 0, erraticTimer: 0, erraticTargetAngle: 0 };
}
function state(e, player) {
  return { enemies: [e], player: player || { x: 300, y: 200, invuln: 0, stun: 0 }, bullets: [], W: 900, H: 520,
    MAX_BULLETS: 20, MAX_ENEMY_BULLETS: 20, enemyBulletCount: function () { return 0; },
    applyPlayerDamage: function () { return { applied: false, killed: false }; }, addFloatText: function () {},
    spawnExplosion: function () {}, MAX_HOSTILES: 30, MAX_HEAVY_HOSTILES: 7, boss: null, wave: 15, waveEvent: null };
}
function step(NV, st, dt, frames) { for (let i = 0; i < frames; i++) NV.updateEnemies(dt, st); }
function enterMark(NV, e, st) {
  e.wispPhaseState = 'phase_out'; e.wispPhaseTimer = 0.01; e.wispAttackCooldown = 0; e.wispPhaseTargetable = true;
  NV.updateEnemies(0.01, st);
}

console.log('wisp_phase_attack:');

t('1-3. spawn tiene delay, trigger 300 y phase-out acotado a 0.30s', function () {
  const NV = setupEngine(), e = wisp(100, 100), st = state(e, { x: 200, y: 100, invuln: 0, stun: 0 });
  NV.updateEnemies(0.01, st);
  if (e.wispPhaseState !== 'drift' || e.wispAttackCooldown < 0.74) throw new Error('ataque inmediato/cd=' + e.wispAttackCooldown);
  step(NV, st, 0.05, 14);
  if (e.wispPhaseState !== 'drift') throw new Error('ignoró delay');
  step(NV, st, 0.05, 1);
  if (e.wispPhaseState !== 'phase_out' || Math.abs(e.wispPhaseTimer - 0.30) > 1e-9) throw new Error('sin phase_out=' + e.wispPhaseState + '/' + e.wispPhaseTimer);
  const x = e.x, y = e.y;
  step(NV, st, 0.05, 6);
  if (e.wispPhaseState !== 'mark' || Math.hypot(e.x - x, e.y - y) > 0.001) throw new Error('phase-out no acotado/quieto');
});

t('4-7. snapshot fijo, sin homing, clamp arena y MARK dura 0.48s', function () {
  const NV = setupEngine(), e = wisp(100, 100), st = state(e, { x: -40, y: 999, invuln: 0, stun: 0 });
  enterMark(NV, e, st);
  if (e.wispPhaseState !== 'mark' || Math.abs(e.wispPhaseTimer - 0.48) > 1e-9) throw new Error('mark timer=' + e.wispPhaseTimer);
  if (e.wispTargetX !== 68 || e.wispTargetY !== 452) throw new Error('clamp=' + e.wispTargetX + ',' + e.wispTargetY);
  const tx = e.wispTargetX, ty = e.wispTargetY;
  st.player.x = 700; st.player.y = 100;
  NV.updateEnemies(0.47, st);
  if (e.wispPhaseState !== 'mark' || e.wispTargetX !== tx || e.wispTargetY !== ty) throw new Error('retarget/mark corto');
  NV.updateEnemies(0.01, st);
  if (e.wispPhaseState !== 'pulse' || e.x !== tx || e.y !== ty) throw new Error('sin reappear snapshot');
});

t('8-14. sin contacto phased; pulso radio 68, daño 6, una vez y evadible', function () {
  const NV = setupEngine(), e = wisp(100, 100), player = { x: 130, y: 100, invuln: 0, stun: 0 }, st = state(e, player);
  let hits = 0, damage = 0;
  st.applyPlayerDamage = function (amount, opts) { hits++; damage += amount; if (opts.cause !== 'wisp-pulse' || opts.enemy !== e) throw new Error('pipeline opts'); return { applied: true, killed: false }; };
  e.wispPhaseState = 'mark'; e.wispPhaseTimer = 0.01; e.wispTargetX = 100; e.wispTargetY = 100; e.wispPhaseTargetable = false; e.wispPulseSpent = false;
  NV.updateEnemies(0.01, st);
  NV.updateEnemies(0.01, st);
  if (hits !== 1 || damage !== 6 || !e.wispPulseSpent || !Number.isFinite(damage)) throw new Error('hits/damage=' + hits + '/' + damage);
  e.x = player.x; e.y = player.y; e.wispPhaseState = 'recovery'; e.wispPhaseTimer = 0.2;
  NV.updateEnemies(0.01, st);
  if (hits !== 1 || e.dead) throw new Error('contacto/repeat=' + hits + '/' + e.dead);

  const miss = wisp(100, 100), missPlayer = { x: 168.01, y: 100, invuln: 0, stun: 0 }, missState = state(miss, missPlayer);
  let missHits = 0; missState.applyPlayerDamage = function () { missHits++; return { applied: true, killed: false }; };
  miss.wispPhaseState = 'mark'; miss.wispPhaseTimer = 0.01; miss.wispTargetX = 100; miss.wispTargetY = 100; miss.wispPhaseTargetable = false;
  NV.updateEnemies(0.01, missState);
  if (missHits !== 0) throw new Error('radio >68 dañó');

  const evade = wisp(100, 100), evadeState = state(evade, { x: 140, y: 100, invuln: 0, stun: 0 });
  let evadeHits = 0; evadeState.applyPlayerDamage = function () { evadeHits++; return { applied: true, killed: false }; };
  enterMark(NV, evade, evadeState); evadeState.player.x = 300;
  step(NV, evadeState, 0.04, 12);
  if (evadeHits !== 0 || evade.x !== 140) throw new Error('no evadible/snapshot=' + evadeHits + '/' + evade.x);
});

t('15-17. pulse -> recovery 0.55, lockout y targetable al reaparecer', function () {
  const NV = setupEngine(), e = wisp(100, 100), st = state(e, { x: 500, y: 300, invuln: 0, stun: 0 });
  e.wispPhaseState = 'pulse'; e.wispPhaseTimer = 0.01; e.wispPhaseTargetable = true; e.wispPulseSpent = true;
  NV.updateEnemies(0.01, st);
  if (e.wispPhaseState !== 'recovery' || Math.abs(e.wispPhaseTimer - 0.55) > 1e-9 || !NV.isEnemyTargetable(e)) throw new Error('recovery/targetable');
  step(NV, st, 0.05, 10);
  if (e.wispPhaseState !== 'recovery') throw new Error('recovery corto');
  NV.updateEnemies(0.05, st);
  if (e.wispPhaseState !== 'drift' || Math.abs(e.wispAttackCooldown - 2.6) > 1e-9) throw new Error('sin cooldown=' + e.wispAttackCooldown);
  NV.updateEnemies(0.01, st);
  if (e.wispPhaseState !== 'drift') throw new Error('repeat inmediato');
});

t('targetability MARK bloquea bala y llama; reappear restaura impactos', function () {
  const NV = setupEngine(true), e = wisp(100, 100);
  e.wispPhaseState = 'mark'; e.wispPhaseTargetable = false;
  const bullets = [{ x: 100, y: 100, vx: 0, vy: 0, damage: 4, dead: false, isEnemy: false, pierce: 1, hitTargets: [] }];
  const bulletState = { bullets, W: 900, H: 520, player: { x: 0, y: 0, character: 'boti' }, enemies: [e], boss: null,
    CHARACTERS: NV.CHARACTERS, SHIELD_COOLDOWN: 1, addFloatText: function () {}, killEnemy: function () {}, applyKnockback: function () {}, spawnExplosion: function () {}, applyPlayerDamage: function () { return { applied: false }; } };
  NV.updateBullets(0, bulletState);
  const zone = NV.createFlameZone({ x: 0, y: 100, angle: 0, range: 170, damage: 4 });
  NV.flameZoneDamage(zone, { enemies: [e], boss: null, addFloatText: function () {}, killEnemy: function () {}, applyKnockback: function () {} });
  if (e.hp !== 12) throw new Error('MARK recibió daño=' + e.hp);
  e.wispPhaseTargetable = true; bullets[0].dead = false;
  NV.updateBullets(0, bulletState);
  if (e.hp !== 8) throw new Error('reappear no targetable=' + e.hp);
});

t('18-25. producción, regresiones, formato y caps intactos', function () {
  const NV = setupEngine(true);
  const expected = {
    wisp: { hp: 12, speed: 160, damage: 6, radius: 6, minWave: 15, behavior: 'erratic' },
    specter_grunt: { hp: 20, speed: 85, damage: 10, radius: 10, minWave: 3, weight: 0.15, behavior: 'chase' },
    swarmlet: { hp: 10, speed: 115, damage: 8, radius: 7, minWave: 9, behavior: 'swarm' },
    specter_guard: { hp: 55, speed: 45, damage: 12, radius: 18, minWave: 5, weight: 0.1, behavior: 'shield' },
    runner: { hp: 15, speed: 145, damage: 10, radius: 9, minWave: 1, behavior: 'flank' },
    spitter: { hp: 22, speed: 50, damage: 15, radius: 13, minWave: 12, behavior: 'ranged' },
  };
  for (const id of Object.keys(expected)) {
    const type = NV.ENEMY_TYPES.find(function (entry) { return entry.id === id; });
    for (const key of Object.keys(expected[id])) if (type[key] !== expected[id][key]) throw new Error(id + '.' + key + '=' + type[key]);
  }
  if (NV.ENEMY_TYPES.find(function (entry) { return entry.id === 'wisp'; }).weight !== undefined) throw new Error('Wisp weight cambió');
  if (Math.abs(NV.WISP_PHASE_ATTACK.markTime - 0.48) > 1e-9 || Math.abs(NV.WISP_PHASE_ATTACK.pulseRadius - 68) > 1e-9 || NV.formatDamageText(3.5999999999999996) !== '3.6') throw new Error('tuning/formato');
  if (NV.WISP_PHASE_ATTACK.phaseOutTime !== 0.30 || NV.WISP_PHASE_ATTACK.recoveryTime !== 0.55 || NV.WISP_PHASE_ATTACK.cooldown !== 2.60 || NV.WISP_PHASE_ATTACK.triggerRange !== 300) throw new Error('timings preservados');
  if (NV.SPECTER_GUARD_PROTECTOR.damageReduction !== 0.90) throw new Error('Guard reduction');
  if (NV.BALANCE.MAX_HOSTILES !== 30 || NV.BALANCE.MAX_HEAVY_HOSTILES !== 7 || NV.BALANCE.SOFT_HEAVY_TARGET !== 4) throw new Error('caps');
});

function renderSetup() {
  const sandbox = { window: { NV: {} }, console, Math, Object, Array, Set, Map, WeakMap };
  vm.runInNewContext(fs.readFileSync('js/render/enemies.js', 'utf8'), sandbox, { filename: 'js/render/enemies.js' });
  vm.runInNewContext(fs.readFileSync('js/render/metaReadability.js', 'utf8'), sandbox, { filename: 'js/render/metaReadability.js' });
  return sandbox.window.NV;
}
function ctx() {
  const calls = { strokes: 0, lines: 0, arcs: 0, strokeStyles: [] };
  const c = { calls, save: function () {}, restore: function () {}, translate: function () {}, rotate: function () {}, scale: function () {},
    beginPath: function () {}, closePath: function () {}, moveTo: function () {}, lineTo: function () { calls.lines++; }, bezierCurveTo: function () {}, quadraticCurveTo: function () {},
    arc: function () { calls.arcs++; }, ellipse: function () {}, fill: function () {}, stroke: function () { calls.strokes++; calls.strokeStyles.push(c.strokeStyle); }, fillRect: function () {}, strokeRect: function () {}, fillText: function () {}, setLineDash: function () {},
    getTransform: function () { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; } };
  return c;
}
t('mark rojo hostil es distinto del auto-aim; fases renderizan sin mutar gameplay', function () {
  const NV = renderSetup();
  for (const phase of ['phase_out', 'mark', 'pulse', 'recovery']) {
    const e = wisp(100, 100); e.wispPhaseState = phase; e.wispPhaseTimer = phase === 'mark' ? 0.4 : 0.1; e.wispTargetX = 180; e.wispTargetY = 140;
    const before = JSON.stringify(e), c = ctx();
    NV.drawEnemy(c, e, 60, { x: 300, y: 200 }, null, 1);
    if (c.calls.strokes < 2 || JSON.stringify(e) !== before) throw new Error(phase + ' feedback/mutación');
    if ((phase === 'mark' || phase === 'pulse') && c.calls.strokeStyles.indexOf('#d94b55') < 0) throw new Error(phase + ' sin rojo hostil');
  }
  const aim = ctx();
  if (!NV.drawAutofireTarget(aim, { x: 10, y: 10, radius: 8 }, 0, { x: 0, y: 0 }, true, false, { t: 1 })) throw new Error('auto-aim no dibujó');
  if (NV.META_VIS_PALETTE.safe !== '#66FF33' || NV.META_VIS_PALETTE.danger !== '#FF3333') throw new Error('paleta auto-aim cambió');
  if (aim.calls.strokeStyles.indexOf('#66FF33') < 0 || aim.calls.strokeStyles.indexOf('#d94b55') >= 0) throw new Error('auto-aim recoloreado');
});

console.log('\nRESULT wisp_phase_attack: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);