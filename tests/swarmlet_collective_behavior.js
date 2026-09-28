// ===== TEST: identidad colectiva FORM -> COMMIT -> REGROUP del Swarmlet =====
const fs = require('fs');
const vm = require('vm');

let pass = 0;
let fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log('  ok  ' + name); }
  catch (error) { fail++; console.log('  FAIL ' + name + ' -> ' + error.message); }
}

function setupEngine() {
  const math = Object.create(Math);
  math.random = function () { return 0.5; };
  const sandbox = { window: { NV: {} }, console, Math: math, Object, Array, Set, Map };
  ['js/data/balance.js', 'js/data/gameData.js', 'js/engine/hostileBudget.js', 'js/engine/enemies.js'].forEach(function (file) {
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
  });
  return sandbox.window.NV;
}

function swarmlet(x, y) {
  return {
    x, y, hp: 10, maxHp: 10, damage: 8, speed: 115, radius: 7, color: '#22d3ee', shape: 'atom',
    behavior: 'swarm', enemyTypeId: 'swarmlet', dead: false, knockVelX: 0, knockVelY: 0,
    knockbackRes: 0.1, hostileClass: 'light', contactCd: 0,
  };
}

function state(enemies, player) {
  return {
    enemies,
    player: player || { x: 400, y: 300, invuln: 0, stun: 0 },
    bullets: [], MAX_BULLETS: 10, MAX_ENEMY_BULLETS: 10,
    enemyBulletCount: function () { return 0; },
    applyPlayerDamage: function () { return { applied: false }; },
    addFloatText: function () {}, spawnExplosion: function () {},
    MAX_HOSTILES: 30, MAX_HEAVY_HOSTILES: 7, boss: null,
  };
}

function group() {
  return [swarmlet(250, 300), swarmlet(475, 170), swarmlet(500, 390)];
}

function step(NV, st, dt, frames) {
  for (let i = 0; i < frames; i++) NV.updateEnemies(dt, st);
}

console.log('swarmlet_collective_behavior:');

t('1. menos de 3 usa persecución simple y conserva contacto', function () {
  const NV = setupEngine();
  const enemies = [swarmlet(300, 300), swarmlet(500, 300)];
  const st = state(enemies);
  const x = enemies[0].x;
  NV.updateEnemies(0.1, st);
  if (enemies[0].swarmState !== 'approach' || enemies[0].x <= x) throw new Error('sin chase simple');
  enemies[0].x = 400; enemies[0].y = 300;
  let hits = 0;
  st.applyPlayerDamage = function () { hits++; return { applied: true }; };
  NV.updateEnemies(0.01, st);
  if (hits !== 1 || !enemies[0].dead) throw new Error('contacto sparse alterado');
});

t('2-4. 3 cercanos forman slots angulares distintos alrededor del jugador', function () {
  const NV = setupEngine();
  const enemies = group();
  const st = state(enemies);
  NV.updateEnemies(0.01, st);
  const angles = [];
  for (const e of enemies) {
    if (e.swarmState !== 'form') throw new Error('state=' + e.swarmState);
    const dx = e.swarmTargetX - st.player.x, dy = e.swarmTargetY - st.player.y;
    const radius = Math.hypot(dx, dy);
    if (Math.abs(radius - 150) > 0.001) throw new Error('radius=' + radius);
    if (Math.hypot(e.swarmTargetX - st.player.x, e.swarmTargetY - st.player.y) < 100) throw new Error('target al centro');
    angles.push(Math.atan2(dy, dx));
  }
  if (new Set(angles.map(function (a) { return a.toFixed(4); })).size !== 3) throw new Error('slots repetidos');
});

t('5. asignación colectiva es una pasada acotada, sin full-pair matching', function () {
  const src = fs.readFileSync('js/engine/enemies.js', 'utf8');
  const summary = src.slice(src.indexOf('// Resumen colectivo O(n)'), src.indexOf('for (const e of enemies)', src.indexOf('// Resumen colectivo O(n)')));
  const swarmBranch = src.slice(src.indexOf("} else if (e.behavior === 'swarm')"), src.indexOf("} else if (e.behavior === 'shield')"));
  if (!summary.includes('for (let i = 0; i < enemies.length; i++)')) throw new Error('sin pasada lineal');
  if (summary.includes('forEachGridNeighbor') || summary.match(/for\s*\([^)]*enemies[^)]*\)[\s\S]*for\s*\(/)) throw new Error('asignación por pares');
  if (swarmBranch.includes('for (const other of enemies)') || swarmBranch.includes('enemies.map(') || swarmBranch.includes('enemies.filter(')) throw new Error('full scan en branch');
});

t('6-8. FORM temporizado entra COMMIT snapshot a 1.65x', function () {
  const NV = setupEngine();
  const enemies = group();
  const st = state(enemies);
  NV.updateEnemies(0.01, st);
  step(NV, st, 0.01, 79);
  const e = enemies[0];
  if (e.swarmState !== 'commit') throw new Error('state=' + e.swarmState + ' timer=' + e.swarmStateTimer);
  const dirX = e.swarmCommitDirX, dirY = e.swarmCommitDirY;
  const x = e.x, y = e.y;
  st.player.x = 800; st.player.y = 50;
  NV.updateEnemies(0.1, st);
  if (e.swarmCommitDirX !== dirX || e.swarmCommitDirY !== dirY) throw new Error('homing detectado');
  const travel = Math.hypot(e.x - x, e.y - y);
  if (Math.abs(travel - 115 * 1.65 * 0.1) > 0.35) throw new Error('travel=' + travel);
});

t('9-11. COMMIT acotado entra REGROUP y no recomite inmediatamente', function () {
  const NV = setupEngine();
  const enemies = group();
  const st = state(enemies);
  for (const e of enemies) {
    e.swarmState = 'commit'; e.swarmStateTimer = 0.45;
    e.swarmCommitDirX = 1; e.swarmCommitDirY = 0; e.swarmCommitContactSpent = false;
  }
  step(NV, st, 0.05, 9);
  if (enemies.some(function (e) { return e.swarmState !== 'regroup'; })) throw new Error('sin regroup');
  const before = enemies[0].swarmStateTimer;
  NV.updateEnemies(0.05, st);
  if (enemies[0].swarmState !== 'regroup' || enemies[0].swarmStateTimer >= before) throw new Error('recommit inmediato');
  step(NV, st, 0.05, 12);
  if (enemies[0].swarmState !== 'form') throw new Error('sin vuelta a form');
});

t('12. overlap durante FORM no daña', function () {
  const NV = setupEngine();
  const enemies = [swarmlet(400, 300), swarmlet(410, 300), swarmlet(390, 300)];
  const st = state(enemies);
  let hits = 0;
  st.applyPlayerDamage = function () { hits++; return { applied: true }; };
  NV.updateEnemies(0.01, st);
  if (hits !== 0) throw new Error('form dañó');
});

t('13-14. contacto COMMIT daña una vez con daño base y consume al atacante', function () {
  const NV = setupEngine();
  const e = swarmlet(399, 300);
  const st = state([e, swarmlet(500, 300), swarmlet(300, 300)]);
  let hits = 0, damage = 0, kills = 0;
  e.swarmState = 'commit'; e.swarmStateTimer = 0.4; e.swarmCommitDirX = 1; e.swarmCommitDirY = 0; e.swarmCommitContactSpent = false;
  st.applyPlayerDamage = function (amount) { hits++; damage += amount; return { applied: true }; };
  st.onKill = function (killed) { if (killed === e) kills++; };
  NV.updateEnemies(0.001, st);
  NV.updateEnemies(0.001, st);
  if (hits !== 1 || damage !== 8 || !e.dead || kills !== 1 || !e.swarmCommitContactSpent) throw new Error('hits=' + hits + ' damage=' + damage + ' kills=' + kills);
});

t('15. sistemas de movimiento/dash del jugador no fueron modificados', function () {
  const src = fs.readFileSync('js/engine/enemies.js', 'utf8');
  const game = fs.readFileSync('js/game.js', 'utf8');
  if (src.includes('player.dashActive =') || src.includes('player.moveVx =') || src.includes('player.moveVy =')) throw new Error('motor enemigo muta movimiento');
  if (!game.includes('combatIntent.dashIntent')) throw new Error('pipeline dash ausente');
});

t('16. roster Swarmlet conserva producción', function () {
  const NV = setupEngine();
  const type = NV.ENEMY_TYPES.find(function (entry) { return entry.id === 'swarmlet'; });
  const expected = { hp: 10, speed: 115, damage: 8, radius: 7, minWave: 9, behavior: 'swarm' };
  for (const key of Object.keys(expected)) if (type[key] !== expected[key]) throw new Error(key + '=' + type[key]);
  if (type.weight !== undefined) throw new Error('weight añadido=' + type.weight);
});

t('17-19. Specter Grunt, Runner y Spitter conservan contratos', function () {
  const NV = setupEngine();
  const expected = {
    specter_grunt: { hp: 20, speed: 85, damage: 10, radius: 10, minWave: 3, weight: 0.15, behavior: 'chase' },
    runner: { hp: 15, speed: 145, damage: 10, radius: 9, minWave: 1, behavior: 'flank' },
    spitter: { hp: 22, speed: 50, damage: 15, radius: 13, minWave: 12, behavior: 'ranged' },
  };
  for (const id of Object.keys(expected)) {
    const type = NV.ENEMY_TYPES.find(function (entry) { return entry.id === id; });
    for (const key of Object.keys(expected[id])) if (type[key] !== expected[id][key]) throw new Error(id + '.' + key + '=' + type[key]);
  }
  const src = fs.readFileSync('js/engine/enemies.js', 'utf8');
  for (const marker of ['SPECTER_GRUNT_TRIGGER_RANGE = 320', 'SPECTER_GRUNT_WINDUP = 0.45', 'SPECTER_GRUNT_CHARGE_SPEED_MULT = 4.0', 'SPECTER_GRUNT_CHARGE_DISTANCE = 260']) {
    if (!src.includes(marker)) throw new Error('grunt alterado: ' + marker);
  }
});

t('20. caps hostiles conservados', function () {
  const NV = setupEngine();
  if (NV.BALANCE.MAX_HOSTILES !== 30 || NV.BALANCE.MAX_HEAVY_HOSTILES !== 7 || NV.BALANCE.SOFT_HEAVY_TARGET !== 4) throw new Error('caps alterados');
});

console.log('\nRESULT swarmlet_collective_behavior: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);