// ===== TEST: identidad mecánica del specter_grunt =====
const fs = require('fs'), vm = require('vm');
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('  ok  ' + name); } catch (err) { fail++; console.log('  FAIL ' + name + ' -> ' + err.message); } }

function setupEngine() {
  const math = Object.create(Math); math.random = function () { return 0.5; };
  const sandbox = { window: { NV: {} }, console, Math: math, Object, Array, Set, Map };
  ['js/data/balance.js', 'js/data/gameData.js', 'js/engine/hostileBudget.js', 'js/engine/enemies.js'].forEach(function (file) {
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
  });
  return sandbox.window.NV;
}
function enemy(x, y) {
  return {
    x, y, hp: 20, maxHp: 20, damage: 10, speed: 85, radius: 10, color: '#d8f6ff', shape: 'circle',
    behavior: 'chase', enemyTypeId: 'specter_grunt', dead: false, knockVelX: 0, knockVelY: 0,
    knockbackRes: 0.1, hostileClass: 'medium', contactCd: 0,
  };
}
function state(e, player) {
  return {
    enemies: [e], player: player || { x: 300, y: 100, invuln: 0, stun: 0 }, bullets: [],
    MAX_BULLETS: 10, MAX_ENEMY_BULLETS: 10, enemyBulletCount: function () { return 0; },
    applyPlayerDamage: function () { return { applied: false }; }, addFloatText: function () {},
    spawnExplosion: function () {}, MAX_HOSTILES: 30, MAX_HEAVY_HOSTILES: 7, boss: null,
  };
}
function step(NV, st, dt, frames) { for (let i = 0; i < frames; i++) NV.updateEnemies(dt, st); }

console.log('specter_grunt_charge:');

t('trigger 320, primer ataque sin cooldown inicial y windup 0.45', function () {
  const NV = setupEngine(), e = enemy(100, 100), st = state(e, { x: 420, y: 100, invuln: 0, stun: 0 });
  NV.updateEnemies(0.01, st);
  if (e.specterChargeState !== 'windup') throw new Error('state@320=' + e.specterChargeState);
  if (Math.abs(e.specterChargeTimer - 0.45) > 0.001) throw new Error('windup=' + e.specterChargeTimer);
  if (e.specterChargeCooldown !== 0) throw new Error('cooldown inicial=' + e.specterChargeCooldown);
  const x = e.x, y = e.y;
  NV.updateEnemies(0.2, st);
  if (e.x !== x || e.y !== y) throw new Error('se movió en windup');
  const outside = enemy(100, 100), outsideState = state(outside, { x: 421, y: 100, invuln: 0, stun: 0 });
  NV.updateEnemies(0.01, outsideState);
  if (outside.specterChargeState !== 'approach') throw new Error('activó fuera de 320');
});

t('snapshot ocurre al terminar windup y charge no hace homing', function () {
  const NV = setupEngine(), e = enemy(100, 100), st = state(e, { x: 300, y: 100, invuln: 0, stun: 0 });
  NV.updateEnemies(0.05, st);
  st.player.x = 100; st.player.y = 300;
  step(NV, st, 0.05, 9);
  if (e.specterChargeState !== 'charge') throw new Error('state=' + e.specterChargeState);
  if (Math.abs(e.specterChargeDirX) > 0.001 || e.specterChargeDirY < 0.999) throw new Error('snapshot=' + e.specterChargeDirX + ',' + e.specterChargeDirY);
  const dirX = e.specterChargeDirX, dirY = e.specterChargeDirY;
  st.player.x = 500; st.player.y = 100;
  NV.updateEnemies(0.05, st);
  if (e.specterChargeDirX !== dirX || e.specterChargeDirY !== dirY) throw new Error('homing detectado');
});

t('charge usa multiplicador 4.0 y termina a 260px', function () {
  const NV = setupEngine(), e = enemy(100, 100), st = state(e, { x: 800, y: 100, invuln: 0, stun: 0 });
  e.specterChargeState = 'charge'; e.specterChargeTimer = 10; e.specterChargeDirX = 1; e.specterChargeDirY = 0; e.specterChargeDistance = 0;
  NV.updateEnemies(0.1, st);
  if (Math.abs(e.x - 134) > 0.001 || Math.abs(e.specterChargeDistance - 34) > 0.001) throw new Error('step=' + e.x + '/' + e.specterChargeDistance);
  e.specterChargeDistance = 256.6;
  NV.updateEnemies(0.01, st);
  if (e.specterChargeState !== 'recovery') throw new Error('state=' + e.specterChargeState);
  if (Math.abs(e.specterChargeDistance - 260) > 0.001) throw new Error('distance=' + e.specterChargeDistance);
  if (Math.abs(e.specterChargeTimer - 0.70) > 0.001) throw new Error('timer=' + e.specterChargeTimer);
});

t('charge dura como máximo 0.75s', function () {
  const NV = setupEngine(), e = enemy(100, 100), st = state(e, { x: 800, y: 400, invuln: 0, stun: 0 });
  e.specterChargeState = 'charge'; e.specterChargeTimer = 0.75; e.specterChargeDirX = 1; e.specterChargeDirY = 0; e.specterChargeDistance = 0;
  step(NV, st, 0.25, 2);
  if (e.specterChargeState !== 'charge' || Math.abs(e.specterChargeTimer - 0.25) > 0.001) throw new Error('terminó antes=' + e.specterChargeState + '/' + e.specterChargeTimer);
  NV.updateEnemies(0.25, st);
  if (e.specterChargeState !== 'recovery' || Math.abs(e.specterChargeTimer - 0.70) > 0.001) throw new Error('no terminó a 0.75');
});

t('objetivo estático a distancia realista queda al alcance de la carga', function () {
  const NV = setupEngine(), e = enemy(100, 100), st = state(e, { x: 340, y: 100, invuln: 0, stun: 0 });
  let hits = 0;
  st.applyPlayerDamage = function () { hits++; return { applied: true }; };
  NV.updateEnemies(0.01, st);
  step(NV, st, 0.05, 9);
  for (let i = 0; i < 20 && e.specterChargeState === 'charge'; i++) NV.updateEnemies(0.05, st);
  if (hits !== 1 || e.specterChargeState !== 'recovery' || e.dead) throw new Error('hits=' + hits + ' state=' + e.specterChargeState + ' dead=' + e.dead);
});

t('desplazamiento lateral hace fallar la carga sin homing', function () {
  const NV = setupEngine(), e = enemy(100, 100), st = state(e, { x: 340, y: 100, invuln: 0, stun: 0 });
  let hits = 0;
  st.applyPlayerDamage = function () { hits++; return { applied: true }; };
  NV.updateEnemies(0.01, st);
  step(NV, st, 0.05, 9);
  const dirX = e.specterChargeDirX, dirY = e.specterChargeDirY;
  st.player.y = 220;
  for (let i = 0; i < 20 && e.specterChargeState === 'charge'; i++) NV.updateEnemies(0.05, st);
  if (hits !== 0 || e.specterChargeState !== 'recovery') throw new Error('hits=' + hits + ' state=' + e.specterChargeState);
  if (e.specterChargeDirX !== dirX || e.specterChargeDirY !== dirY) throw new Error('homing lateral');
});

t('recovery crea cooldown antes de otra carga', function () {
  const NV = setupEngine(), e = enemy(100, 100), st = state(e);
  e.specterChargeState = 'recovery'; e.specterChargeTimer = 0.02; e.specterChargeCooldown = 0;
  NV.updateEnemies(0.05, st);
  if (e.specterChargeState !== 'approach') throw new Error('state=' + e.specterChargeState);
  if (Math.abs(e.specterChargeCooldown - 1.40) > 0.001) throw new Error('cooldown=' + e.specterChargeCooldown);
  NV.updateEnemies(0.05, st);
  if (e.specterChargeState !== 'approach') throw new Error('recargó inmediatamente');
});

t('overlap fuera de charge no daña y charge aplicado sobrevive en recovery', function () {
  const NV = setupEngine();
  for (const phase of ['windup', 'recovery', 'charge']) {
    const e = enemy(100, 100), st = state(e, { x: 100, y: 100, invuln: 0, stun: 0 });
    let hits = 0, kills = 0;
    e.specterChargeState = phase; e.specterChargeTimer = 1; e.specterChargeDirX = 1; e.specterChargeDirY = 0; e.specterChargeDistance = 0;
    st.applyPlayerDamage = function () { hits++; return { applied: true }; };
    st.onKill = function () { kills++; };
    NV.updateEnemies(0.01, st);
    if (phase === 'charge') {
      if (hits !== 1 || e.dead || kills !== 0) throw new Error('charge hits=' + hits + ' dead=' + e.dead + ' kills=' + kills);
      if (e.specterChargeState !== 'recovery' || Math.abs(e.specterChargeTimer - 0.70) > 0.001) throw new Error('recovery=' + e.specterChargeState + '/' + e.specterChargeTimer);
    } else if (hits !== 0 || e.dead || kills !== 0) {
      throw new Error(phase + ' hits=' + hits + ' dead=' + e.dead + ' kills=' + kills);
    }
  }
});

t('impacto de charge aplica una vez máximo sin onKill, score, xp ni drop', function () {
  const NV = setupEngine(), e = enemy(100, 100), st = state(e, { x: 100, y: 100, invuln: 0, stun: 0 });
  let hits = 0, kills = 0;
  st.score = 17; st.xp = 23; st.pickups = [];
  e.specterChargeState = 'charge'; e.specterChargeTimer = 0.005; e.specterChargeDirX = 0; e.specterChargeDirY = 0; e.specterChargeDistance = 259;
  st.applyPlayerDamage = function () { hits++; return { applied: true }; };
  st.onKill = function () { kills++; st.score += 100; st.xp += 10; st.pickups.push({ type: 'xp' }); };
  NV.updateEnemies(0.01, st);
  st.player.invuln = 0;
  NV.updateEnemies(0.01, st);
  st.player.invuln = 0;
  NV.updateEnemies(0.01, st);
  if (hits !== 1) throw new Error('hits=' + hits);
  if (e.dead || kills !== 0) throw new Error('dead=' + e.dead + ' kills=' + kills);
  if (e.specterChargeState !== 'recovery') throw new Error('state=' + e.specterChargeState);
  if (st.score !== 17 || st.xp !== 23 || st.pickups.length !== 0) throw new Error('recompensa lateral');
});

t('charge fallida por tiempo entra en recovery sin daño', function () {
  const NV = setupEngine(), e = enemy(100, 100), st = state(e, { x: 500, y: 100, invuln: 0, stun: 0 });
  let hits = 0;
  e.specterChargeState = 'charge'; e.specterChargeTimer = 0.005; e.specterChargeDirX = 1; e.specterChargeDirY = 0; e.specterChargeDistance = 0;
  st.applyPlayerDamage = function () { hits++; return { applied: true }; };
  NV.updateEnemies(0.01, st);
  if (hits !== 0 || e.dead || e.specterChargeState !== 'recovery') throw new Error('hits=' + hits + ' dead=' + e.dead + ' state=' + e.specterChargeState);
});

t('contacto de otro enemigo conserva muerte y onKill globales', function () {
  const NV = setupEngine(), e = enemy(100, 100), st = state(e, { x: 100, y: 100, invuln: 0, stun: 0 });
  let hits = 0, kills = 0;
  e.enemyTypeId = 'drone';
  st.applyPlayerDamage = function () { hits++; return { applied: true }; };
  st.onKill = function (killed) { if (killed !== e) throw new Error('entidad incorrecta'); kills++; };
  NV.updateEnemies(0.01, st);
  if (hits !== 1 || !e.dead || kills !== 1) throw new Error('hits=' + hits + ' dead=' + e.dead + ' kills=' + kills);
});

t('spawn conserva HP, speed, damage, radius, minWave y roster', function () {
  const NV = setupEngine(), out = [];
  const type = NV.ENEMY_TYPES.find(function (entry) { return entry.id === 'specter_grunt'; });
  if (!type) throw new Error('tipo ausente');
  const expected = { hp: 20, speed: 85, damage: 10, radius: 10, minWave: 3, weight: 0.15, behavior: 'chase' };
  for (const key of Object.keys(expected)) if (type[key] !== expected[key]) throw new Error(key + '=' + type[key]);
  NV.spawnEnemy({ enemies: out, MAX_ENEMIES: 20, boss: null, wave: 3, forceTypeId: 'specter_grunt', ENEMY_TYPES: NV.ENEMY_TYPES, W: 800, H: 600, waveEvent: null });
  if (out.length !== 1 || out[0].behavior !== 'chase' || out[0].enemyTypeId !== 'specter_grunt') throw new Error('spawn alterado');
  const st = state(out[0], { x: out[0].x + 500, y: out[0].y, invuln: 0, stun: 0 }); st.enemies = out;
  NV.updateEnemies(0.01, st);
  if (out[0].specterChargeState !== 'approach') throw new Error('sin init transient');
});

function renderSetup() {
  const sandbox = { window: { NV: { enemyRhythmBand: function () { return 'medios'; }, state: { player: { x: 200, y: 100 } } } }, console, Math };
  vm.runInNewContext(fs.readFileSync('js/render/spectralEnemies2D.js', 'utf8'), sandbox, { filename: 'spectralEnemies2D.js' });
  return sandbox.window.NV;
}
function ctx() {
  const calls = { strokes: 0, lines: 0, strokeStyles: [], coords: [] };
  const c = {
    calls, save() {}, restore() {}, translate() {}, rotate() {}, scale() {}, beginPath() {}, closePath() {}, moveTo() {},
    lineTo(x, y) { calls.lines++; calls.coords.push([x, y]); }, bezierCurveTo() {}, quadraticCurveTo() {}, arc() {}, ellipse() {}, fill() {}, stroke() { calls.strokes++; calls.strokeStyles.push(c.strokeStyle); },
    fillRect() {}, strokeRect() {}, fillText() {}, createRadialGradient() { return { addColorStop() {} }; }, createLinearGradient() { return { addColorStop() {} }; },
  };
  return c;
}

t('render windup/charge/recovery añade telegraph sin mutar enemigo', function () {
  const NV = renderSetup(), player = { x: 300, y: 100 };
  for (const phase of ['windup', 'charge', 'recovery']) {
    const e = enemy(100, 100); e.specterChargeState = phase; e.specterChargeTimer = 0.3; e.specterChargeDirX = 1; e.specterChargeDirY = 0;
    const snapshot = JSON.stringify(e), c = ctx();
    if (NV.drawSpectralEnemy2D(c, e, 20, player, null) !== true) throw new Error('render false');
    if (c.calls.strokes < 2) throw new Error(phase + ' sin feedback');
    if (JSON.stringify(e) !== snapshot) throw new Error(phase + ' mutó gameplay');
  }
});

t('render: windup usa rojo de warning y la carga activa usa rojo de peligro', function () {
  const NV = renderSetup(), player = { x: 300, y: 100 };
  const seen = {};
  for (const phase of ['windup', 'charge', 'recovery']) {
    const e = enemy(100, 100);
    e.specterChargeState = phase; e.specterChargeTimer = 0.3; e.specterChargeDirX = 1; e.specterChargeDirY = 0;
    const c = ctx();
    NV.drawSpectralEnemy2D(c, e, 20, player, null);
    // El telegraph se dibuja antes que el cuerpo, así que sus trazos son los primeros.
    seen[phase] = c.calls.strokeStyles;
  }
  if (seen.windup.indexOf('#ff6474') < 0) throw new Error('windup sin rojo de warning');
  if (seen.windup.indexOf('#b8efff') >= 0) throw new Error('windup conserva el cian de identidad');
  if (seen.charge.indexOf('#ff3b4f') < 0) throw new Error('charge sin rojo activo');
  if (seen.charge.indexOf('#b8efff') >= 0) throw new Error('charge conserva el cian de identidad');
  if (seen.charge.indexOf('#ff6474') >= 0) throw new Error('charge usa el rojo de warning');
  // Recovery mantiene su presentación previa (cian, ya sin peligro activo).
  if (seen.recovery.indexOf('#b8efff') < 0) throw new Error('recovery alteró su presentación');
});

t('render de colores no altera timings, radios ni estado de carga', function () {
  const NV = renderSetup(), player = { x: 300, y: 100 };
  for (const phase of ['windup', 'charge']) {
    for (const timer of [0.05, 0.3, 0.44]) {
      const e = enemy(100, 100);
      e.specterChargeState = phase; e.specterChargeTimer = timer; e.specterChargeDirX = 1; e.specterChargeDirY = 0;
      const before = JSON.stringify(e), c = ctx();
      NV.drawSpectralEnemy2D(c, e, 20, player, null);
      if (JSON.stringify(e) !== before) throw new Error(phase + ' mutó estado de carga');
      if (c.calls.strokes < 1) throw new Error(phase + ' sin trazos');
    }
  }
  // Las constantes de gameplay viven en el engine y no deben cambiar con un recoloreado.
  const engine = fs.readFileSync('js/engine/enemies.js', 'utf8');
  for (const [name, value] of [['SPECTER_GRUNT_TRIGGER_RANGE', 320], ['SPECTER_GRUNT_WINDUP', 0.45],
    ['SPECTER_GRUNT_CHARGE_TIME', 0.75], ['SPECTER_GRUNT_CHARGE_DISTANCE', 260],
    ['SPECTER_GRUNT_RECOVERY', 0.70], ['SPECTER_GRUNT_COOLDOWN', 1.40]]) {
    if (engine.indexOf('const ' + name + ' = ' + value) < 0) throw new Error('constante alterada: ' + name);
  }
});

console.log('\nRESULT specter_grunt_charge: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);