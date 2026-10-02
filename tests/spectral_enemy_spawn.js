// ===== TEST: spawn de los 6 enemigos espectrales nuevos =====
// Valida stats, gating por minWave, selección ponderada de élites espectro
// y logs [SPAWN] sin tocar espectros legacy ni el ciclo de élites base.
const fs = require('fs'), vm = require('vm');
let pass = 0, fail = 0;
function t(d, fn) { try { fn(); pass++; console.log('  ok  ' + d); } catch (e) { fail++; console.log('  FAIL ' + d + ' -> ' + e.message); } }

const rm = { random: () => 0.5, floor: Math.floor, hypot: Math.hypot, min: Math.min, max: Math.max, round: Math.round, imul: Math.imul, sin: Math.sin, cos: Math.cos, atan2: Math.atan2, PI: Math.PI, abs: Math.abs };
const sbx = { window: { NV: {} }, console, Math: rm };

vm.runInNewContext(fs.readFileSync('js/data/gameData.js', 'utf8'), sbx, { filename: 'gameData.js' });
vm.runInNewContext(fs.readFileSync('js/data/balance.js', 'utf8'), sbx, { filename: 'balance.js' });
vm.runInNewContext(fs.readFileSync('js/engine/enemies.js', 'utf8'), sbx, { filename: 'enemies.js' });

const NV = sbx.window.NV;
NV.SPECTER_ENABLED = true;

function restoreRandom(r) { rm.random = r; }
function stubRandom(v) { rm.random = () => v; }

console.log('spectral_enemy_spawn:');

// ---- Básicos ----
t('specter_grunt registrado en ENEMY_TYPES', () => {
  const et = NV.ENEMY_TYPES.find(x => x.id === 'specter_grunt');
  if (!et) throw new Error('no encontrado');
  if (et.hp !== 20) throw new Error('hp=' + et.hp);
  if (et.speed !== 85) throw new Error('speed=' + et.speed);
  if (et.damage !== 10) throw new Error('damage=' + et.damage);
  if (et.minWave !== 3) throw new Error('minWave=' + et.minWave);
  if (et.weight !== 0.15) throw new Error('weight=' + et.weight);
  if (et.behavior !== 'chase') throw new Error('behavior=' + et.behavior);
  if (et.shape !== 'circle') throw new Error('shape=' + et.shape);
});

t('specter_archer registrado en ENEMY_TYPES', () => {
  const et = NV.ENEMY_TYPES.find(x => x.id === 'specter_archer');
  if (!et) throw new Error('no encontrado');
  if (et.hp !== 18) throw new Error('hp=' + et.hp);
  if (et.damage !== 9) throw new Error('damage=' + et.damage);
  if (et.minWave !== 3) throw new Error('minWave=' + et.minWave);
  if (et.weight !== 0.12) throw new Error('weight=' + et.weight);
  if (et.behavior !== 'ranged') throw new Error('behavior=' + et.behavior);
});

t('specter_guard registrado en ENEMY_TYPES', () => {
  const et = NV.ENEMY_TYPES.find(x => x.id === 'specter_guard');
  if (!et) throw new Error('no encontrado');
  if (et.hp !== 55) throw new Error('hp=' + et.hp);
  if (et.damage !== 12) throw new Error('damage=' + et.damage);
  if (et.minWave !== 5) throw new Error('minWave=' + et.minWave);
  if (et.weight !== 0.10) throw new Error('weight=' + et.weight);
  if (et.behavior !== 'shield') throw new Error('behavior=' + et.behavior);
  if (!et.shield) throw new Error('faltan shield');
  if (et.resist !== 2) throw new Error('resist=' + et.resist);
});

// ---- Élites ----
t('specter_elite_swift ausente de ELITE_TYPES', () => {
  if (NV.ELITE_TYPES.some(x => x.id === 'specter_elite_swift')) throw new Error('sigue registrado');
});

t('specter_elite_wrath ausente de ELITE_TYPES', () => {
  if (NV.ELITE_TYPES.some(x => x.id === 'specter_elite_wrath')) throw new Error('sigue registrado');
});

t('specter_elite_void registrado en ELITE_TYPES', () => {
  const et = NV.ELITE_TYPES.find(x => x.id === 'specter_elite_void');
  if (!et) throw new Error('no encontrado');
  if (!et.spectralElite) throw new Error('falta spectralElite');
  if (et.minWave !== 16) throw new Error('minWave=' + et.minWave);
  if (et.weight !== 0.03) throw new Error('weight=' + et.weight);
  if (et.stunChance !== 0.35) throw new Error('stunChance=' + et.stunChance);
  if (et.stunDuration !== 1.75) throw new Error('stunDuration=' + et.stunDuration);
});

// ---- Legacy intacto ----
t('specter_lite y specter_core NO cambian', () => {
  const lite = NV.ENEMY_TYPES.find(x => x.id === 'specter_lite');
  const core = NV.ENEMY_TYPES.find(x => x.id === 'specter_core');
  if (!lite || !core) throw new Error('faltan espectros legacy');
  if (lite.hp !== 18 || lite.damage !== 8 || lite.minWave !== 16 || lite.weight !== 0.08 || lite.shape !== 'specter') throw new Error('lite alterado');
  if (core.hp !== 28 || core.damage !== 12 || core.minWave !== 20 || core.weight !== 0.06 || core.shape !== 'specter') throw new Error('core alterado');
});

// ---- Gating por wave (básicos) ----
t('wave 2 NO puede spawnear espectros nuevos', () => {
  const r0 = rm.random; stubRandom(0);
  try {
    const newBasic = NV.ENEMY_TYPES.filter(t => t.id.indexOf('specter_') === 0);
    const w2 = [];
    NV.spawnEnemy({ enemies: w2, MAX_ENEMIES: 20, boss: null, wave: 2, ENEMY_TYPES: newBasic, W: 800, H: 600, waveEvent: null });
    if (w2.length !== 0) throw new Error('spawneó ' + w2.length + ' en wave 2');
  } finally { restoreRandom(r0); }
});

t('wave 3 spawnea specter_grunt (random bajo -> primer peso)', () => {
  const r0 = rm.random; stubRandom(0);
  try {
    const newBasic = NV.ENEMY_TYPES.filter(t => t.id === 'specter_grunt' || t.id === 'specter_archer');
    const w3 = [];
    NV.spawnEnemy({ enemies: w3, MAX_ENEMIES: 20, boss: null, wave: 3, ENEMY_TYPES: newBasic, W: 800, H: 600, waveEvent: null });
    if (w3.length !== 1) throw new Error('spawneó ' + w3.length);
    if (w3[0].enemyTypeId !== 'specter_grunt') throw new Error('tipo=' + w3[0].enemyTypeId);
  } finally { restoreRandom(r0); }
});

t('wave 5 spawnea specter_guard (random alto -> último peso)', () => {
  const r0 = rm.random; stubRandom(0.9999);
  try {
    const newBasic = NV.ENEMY_TYPES.filter(t => t.id === 'specter_grunt' || t.id === 'specter_archer' || t.id === 'specter_guard');
    const w5 = [];
    NV.spawnEnemy({ enemies: w5, MAX_ENEMIES: 20, boss: null, wave: 5, ENEMY_TYPES: newBasic, W: 800, H: 600, waveEvent: null });
    if (w5.length !== 1) throw new Error('spawneó ' + w5.length);
    if (w5[0].enemyTypeId !== 'specter_guard') throw new Error('tipo=' + w5[0].enemyTypeId);
  } finally { restoreRandom(r0); }
});

// ---- Gating por wave (élites espectrales) ----
t('wave 15 NO spawnea élites espectrales (minWave 16+)', () => {
  const r0 = rm.random; stubRandom(0);
  try {
    const spectralEt = NV.ELITE_TYPES.filter(t => t.spectralElite);
    const out = [];
    NV.spawnElite({ enemies: out, MAX_ENEMIES: 20, boss: null, wave: 15, W: 800, H: 600, ELITE_TYPES: spectralEt, waveEvent: null });
    if (out.length !== 0) throw new Error('spawneó ' + out.length);
  } finally { restoreRandom(r0); }
});

t('wave 17 spawnea élite espectral void', () => {
  const r0 = rm.random; stubRandom(0);
  try {
    const spectralEt = NV.ELITE_TYPES.filter(t => t.spectralElite);
    const out = [];
    NV.spawnElite({ enemies: out, MAX_ENEMIES: 20, boss: null, wave: 17, W: 800, H: 600, ELITE_TYPES: spectralEt, waveEvent: null });
    if (out.length === 0) throw new Error('no spawneó');
    for (const e of out) {
      if (!e.isElite) throw new Error('no es élite');
      if (e.enemyTypeId !== 'specter_elite_void') throw new Error('tipo=' + e.enemyTypeId);
    }
  } finally { restoreRandom(r0); }
});

t('élite espectral lleva enemyTypeId y visualId', () => {
  const r0 = rm.random; stubRandom(0);
  try {
    const spectralEt = NV.ELITE_TYPES.filter(t => t.spectralElite);
    const out = [];
    NV.spawnElite({ enemies: out, MAX_ENEMIES: 20, boss: null, wave: 17, W: 800, H: 600, ELITE_TYPES: spectralEt, waveEvent: null });
    if (!out.length) throw new Error('sin spawn');
    const e = out[0];
    if (e.enemyTypeId !== 'specter_elite_void') throw new Error('enemyTypeId=' + e.enemyTypeId);
    if (e.visualId !== 'elite_specter_void') throw new Error('visualId=' + e.visualId);
  } finally { restoreRandom(r0); }
});

// ---- Ciclo base intacto ----
t('el ciclo de élites base sigue intacto (wave 3 da élites no-espectrales)', () => {
  const r0 = rm.random; stubRandom(0.5);
  try {
    const out = [];
    NV.spawnElite({ enemies: out, MAX_ENEMIES: 20, boss: null, wave: 3, W: 800, H: 600, ELITE_TYPES: NV.ELITE_TYPES, waveEvent: null });
    if (out.length !== 2) throw new Error('count=' + out.length);
    for (const e of out) { if (e.enemyTypeId && e.enemyTypeId.indexOf('specter_') === 0) throw new Error('base dio espectro con random 0.5'); }
  } finally { restoreRandom(r0); }
});

// ---- Logs ----
t('spawnEnemy loguea [SPAWN] para espectros', () => {
  const logs = [];
  const orig = console.log;
  console.log = (m) => { logs.push(String(m)); };
  try {
    const r0 = rm.random; stubRandom(0);
    const newBasic = NV.ENEMY_TYPES.filter(t => t.id === 'specter_grunt' || t.id === 'specter_archer');
    const out = [];
    NV.spawnEnemy({ enemies: out, MAX_ENEMIES: 20, boss: null, wave: 3, ENEMY_TYPES: newBasic, W: 800, H: 600, waveEvent: null });
    restoreRandom(r0);
    if (!logs.some(l => l.indexOf('[SPAWN] wave=3 type=specter_grunt') !== -1)) throw new Error('log ausente: ' + logs.join(','));
  } finally { console.log = orig; }
});

t('spawnElite loguea [SPAWN] para élites espectrales', () => {
  const logs = [];
  const orig = console.log;
  console.log = (m) => { logs.push(String(m)); };
  try {
    const r0 = rm.random; stubRandom(0);
    const spectralEt = NV.ELITE_TYPES.filter(t => t.spectralElite);
    const out = [];
    NV.spawnElite({ enemies: out, MAX_ENEMIES: 20, boss: null, wave: 17, W: 800, H: 600, ELITE_TYPES: spectralEt, waveEvent: null });
    restoreRandom(r0);
    if (!logs.some(l => l.indexOf('[SPAWN] wave=17 type=specter_elite_void') !== -1)) throw new Error('log ausente: ' + logs.join(','));
  } finally { console.log = orig; }
});

// ============================================================================
// ACT-B1a — Contrato de construcción de enemigos NORMALES
// ----------------------------------------------------------------------------
// La construcción normal se divide en dos capas dentro de enemies.js:
//   A) resolución PRIVATIVA de valores (oleada, dificultad, rol, hitbox del
//      modelo visual, score/xp y los dos Math.random), y
//   B) NV.buildEnemyEntityFromResolved, ensamblador PURO que solo copia valores
//      ya resueltos en una entidad nueva.
// Estas pruebas fijan que la división no cambió ningún valor, ninguna clave, ni
// el número/orden de llamadas a Math.random, y que el ensamblador no escala el
// hitbox ni consume aleatoriedad (requisito para que un consumidor futuro pueda
// pedir un radius exacto sin heredar el factor del modelo).
// Sandbox propio que carga el renderer para que el hitbox con modelo sea real;
// el sandbox compartido de las pruebas anteriores queda intacto.
// ============================================================================
const PARITY_FILES = ['js/data/balance.js', 'js/data/gameData.js', 'js/engine/enemySpawnRegistry.js', 'js/render/spectralEnemies2D.js', 'js/engine/enemies.js'];

function paritySetup(difficulty) {
  const math = Object.create(Math);
  let rngCalls = 0;
  math.random = () => { rngCalls++; return 0.5; };
  const sbx = { window: { NV: {} }, console: { log() {} }, Math: math, Object, Array, Set, Map, WeakSet, JSON, Number, String, Boolean, isNaN, parseInt, parseFloat };
  for (const file of PARITY_FILES) vm.runInNewContext(fs.readFileSync(file, 'utf8'), sbx, { filename: file });
  const P = sbx.window.NV;
  P.SPECTER_ENABLED = true;
  P.runDifficulty = difficulty;
  return { NV: P, rngCalls: () => rngCalls };
}

function spawnAt(NV, wave, enemyId) {
  const st = { enemies: [], MAX_HOSTILES: 30, MAX_HEAVY_HOSTILES: 7, boss: null, wave, W: 900, H: 520, ENEMY_TYPES: NV.ENEMY_TYPES, ELITE_TYPES: NV.ELITE_TYPES };
  const res = NV.spawnProductionEnemy(st, enemyId, { position: { x: 123, y: 456 } });
  if (!res || res.ok !== true) throw new Error('spawn fallido ' + enemyId + ': ' + (res && res.code));
  return st.enemies[0];
}

// Entrada ya resuelta, determinista, para probar el ensamblador por separado.
function resolvedFixture(over) {
  return Object.assign({
    x: 40, y: 80, hp: 20, maxHp: 20, speed: 85, radius: 10, color: '#d8f6ff', shape: 'circle',
    enemyTypeId: 'drone', hostileClass: 'light', movementClass: 'normal', score: 10, xp: 10,
    dead: false, behavior: 'chase', angle: 1.5, erraticTimer: 0, knockbackRes: 0, knockVelX: 0, knockVelY: 0,
    damage: 12, shield: false, shieldCd: 0, resist: 0, hitFlash: 0, hitSlowUntil: 0, hitSlowImmunity: 0,
    erraticTargetAngle: 2.5, shootTimer: 0, stunChance: 0, stunDuration: 0, coreZoneOwnerId: 0,
  }, over || {});
}


// Fórmula EXISTENTE reescrita a mano sobre los helpers de balance (módulos que
// este ACT no toca). Es la referencia, no la implementación bajo prueba.
function expectedNormal(NV, type, wave, difficulty) {
  const dmgScale = Math.min(60, Math.round(wave * 1.5));
  const modelIndex = NV.LAB_SPECTER_IDS[type.id];
  const fallbackMove = (type.behavior === 'kami' || type.speed >= 150) ? 'fast' : (type.speed <= 70 ? 'slow' : 'normal');
  const hp = Math.round(type.hp * NV.enemyHpScale(wave) * 0.85 * NV.difficultySafeMult('hp', difficulty) * NV.roleHpMult(type.id));
  return {
    x: 123, y: 456,
    hp, maxHp: hp,
    speed: type.speed + Math.min(40, wave * 1.5),
    radius: modelIndex === undefined ? type.radius : type.radius * NV.labModelHitboxFactor(modelIndex, type.id),
    color: type.color, shape: type.shape,
    enemyTypeId: type.id,
    hostileClass: type.hostileClass || 'light',
    movementClass: type.movementClass || (NV.enemyMovementClass ? NV.enemyMovementClass(type) : fallbackMove),
    score: type.score * (1 + wave * 0.1), xp: type.xp * (1 + wave * 0.1),
    dead: false, behavior: type.behavior,
    knockbackRes: type.knockbackRes || 0, knockVelX: 0, knockVelY: 0,
    damage: ((type.damage || 10) + dmgScale) * 0.80 * NV.difficultySafeMult('dmg', difficulty) * NV.roleDmgMult(type.id),
    shield: type.shield || false, shieldCd: 0, resist: type.resist || 0,
    hitFlash: 0, hitSlowUntil: 0, hitSlowImmunity: 0,
    erraticTimer: 0, shootTimer: 0,
    stunChance: type.stunChance || 0, stunDuration: type.stunDuration || 0,
  };
}

const PARITY_FIELDS = ['x', 'y', 'hp', 'maxHp', 'speed', 'radius', 'color', 'shape', 'enemyTypeId', 'hostileClass',
  'movementClass', 'score', 'xp', 'dead', 'behavior', 'erraticTimer', 'knockbackRes', 'knockVelX', 'knockVelY',
  'damage', 'shield', 'shieldCd', 'resist', 'hitFlash', 'hitSlowUntil', 'hitSlowImmunity', 'shootTimer',
  'stunChance', 'stunDuration'];

// Orden de claves histórico de la entidad normal (32 claves).
const NORMAL_KEY_ORDER = ['x', 'y', 'hp', 'maxHp', 'speed', 'radius', 'color', 'shape', 'enemyTypeId', 'hostileClass',
  'movementClass', 'score', 'xp', 'dead', 'behavior', 'angle', 'erraticTimer', 'knockbackRes', 'knockVelX', 'knockVelY',
  'damage', 'shield', 'shieldCd', 'resist', 'hitFlash', 'hitSlowUntil', 'hitSlowImmunity', 'erraticTargetAngle',
  'shootTimer', 'stunChance', 'stunDuration', 'coreZoneOwnerId'];

console.log('\nspectral_enemy_spawn / ACT-B1a construccion normal:');

t('paridad exacta: tipos normales x oleada x dificultad vs formulas existentes', () => {
  const IDS = ['drone', 'runner', 'tank', 'shielder', 'swarmlet', 'spitter', 'wisp', 'kamikaze', 'specter_grunt', 'specter_archer', 'specter_guard', 'specter_lite', 'specter_core'];
  const CASES = [['easy', 1], ['normal', 7], ['hard', 25], ['normal', 40]];
  for (const pair of CASES) {
    const difficulty = pair[0], wave = pair[1];
    const env = paritySetup(difficulty);
    for (const id of IDS) {
      const type = env.NV.ENEMY_TYPES.find((x) => x.id === id);
      if (!type) throw new Error('tipo ausente: ' + id);
      const e = spawnAt(env.NV, wave, id);
      const exp = expectedNormal(env.NV, type, wave, difficulty);
      if (e.maxHp !== e.hp) throw new Error(id + ' w' + wave + ' maxHp!=hp');
      for (const field of PARITY_FIELDS) {
        if (e[field] !== exp[field]) throw new Error(id + ' w' + wave + '/' + difficulty + ' ' + field + ': ' + e[field] + ' != ' + exp[field]);
      }
      if (e.angle !== Math.PI || e.erraticTargetAngle !== Math.PI) throw new Error(id + ' angulos fuera de secuencia (random=0.5)');
    }
  }
});


t('valores literales anclados: drone y escopetas sin deriva de redondeo', () => {
  const env = paritySetup('normal');
  const drone = spawnAt(env.NV, 7, 'drone');
  if (drone.hp !== 66 || drone.maxHp !== 66) throw new Error('hp=' + drone.hp);
  if (drone.speed !== 85.5) throw new Error('speed=' + drone.speed);
  if (drone.radius !== 11) throw new Error('radius=' + drone.radius);
  if (drone.score !== 17 || drone.xp !== 17) throw new Error('score/xp=' + drone.score + '/' + drone.xp);
  if (drone.damage !== 18.400000000000002) throw new Error('damage=' + drone.damage);
  if (drone.hostileClass !== 'light' || drone.movementClass !== 'normal') throw new Error('clases=' + drone.hostileClass + '/' + drone.movementClass);
  const spitter = spawnAt(env.NV, 7, 'spitter');
  if (spitter.hp !== 67 || spitter.damage !== 26 * 0.80 * 1.15) throw new Error('spitter hp/dmg=' + spitter.hp + '/' + spitter.damage);
  if (spitter.radius !== 13) throw new Error('spitter radius=' + spitter.radius);
  if (spitter.movementClass !== 'slow') throw new Error('spitter movement=' + spitter.movementClass);
  if (spitter.stunChance !== 0.5 || spitter.stunDuration !== 1.25) throw new Error('spitter stun=' + spitter.stunChance + '/' + spitter.stunDuration);
});

t('hitbox con modelo: el spawn conserva el radio del calculo de datos', () => {
  const env = paritySetup('normal');
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  // 6.09375 es exacto en binario (6 + 3/32): se puede anclar al literal.
  const grunt = spawnAt(env.NV, 7, 'specter_grunt');
  if (grunt.radius !== 6.09375) throw new Error('grunt radius=' + grunt.radius);
  const guard = spawnAt(env.NV, 7, 'specter_guard');
  if (!near(guard.radius, 11.9925)) throw new Error('guard radius=' + guard.radius);
  const archer = spawnAt(env.NV, 7, 'specter_archer');
  if (!near(archer.radius, 7.8)) throw new Error('archer radius=' + archer.radius);
  const lite = spawnAt(env.NV, 7, 'specter_lite');
  if (!near(lite.radius, 7.3125)) throw new Error('lite radius=' + lite.radius);
  // Cruce con la formula publicada: la entidad recibe EXACTAMENTE ese radio.
  for (const id of ['specter_grunt', 'specter_guard', 'specter_archer', 'specter_lite', 'specter_core', 'drone', 'tank']) {
    const expected = env.NV.productionEnemySpawnRadius(env.NV.getProductionEnemyDefinition(id));
    const got = spawnAt(env.NV, 25, id).radius;
    if (got !== expected) throw new Error(id + ' radius=' + got + ' esperado ' + expected);
  }
});

t('conjunto y orden de claves de la entidad normal intactos (32 claves)', () => {
  const env = paritySetup('normal');
  const keys = Object.keys(spawnAt(env.NV, 7, 'specter_grunt'));
  if (keys.length !== NORMAL_KEY_ORDER.length) throw new Error('n=' + keys.length);
  for (let i = 0; i < keys.length; i++) if (keys[i] !== NORMAL_KEY_ORDER[i]) throw new Error('clave[' + i + ']=' + keys[i]);
});

t('RNG: construir un normal consume exactamente 2 Math.random (angle, erraticTargetAngle)', () => {
  const env = paritySetup('normal');
  const before = env.rngCalls();
  spawnAt(env.NV, 7, 'specter_grunt');
  const used = env.rngCalls() - before;
  if (used !== 2) throw new Error('Math.random llamadas=' + used);
});

t('RNG: NV.buildEnemyEntityFromResolved no consume NINGUN Math.random', () => {
  const env = paritySetup('normal');
  if (typeof env.NV.buildEnemyEntityFromResolved !== 'function') throw new Error('ensamblador no expuesto en NV');
  const before = env.rngCalls();
  env.NV.buildEnemyEntityFromResolved(resolvedFixture());
  env.NV.buildEnemyEntityFromResolved(resolvedFixture());
  const used = env.rngCalls() - before;
  if (used !== 0) throw new Error('el ensamblador consumio ' + used + ' Math.random');
});

t('pureza: el ensamblador no muta la entrada, no hace push y devuelve entidad nueva', () => {
  const env = paritySetup('normal');
  const input = resolvedFixture();
  const snapshot = JSON.stringify(input, Object.keys(input).sort());
  const entity = env.NV.buildEnemyEntityFromResolved(input);
  if (JSON.stringify(input, Object.keys(input).sort()) !== snapshot) throw new Error('mutacion de la entrada');
  if (entity === input) throw new Error('devolvio el mismo objeto');
  if (Object.keys(entity).length !== NORMAL_KEY_ORDER.length) throw new Error('n claves=' + Object.keys(entity).length);
  for (const key of Object.keys(input)) if (entity[key] !== input[key]) throw new Error(key + ' no copiado');
  // Acepta solo valores resueltos: no necesita st, wave ni dificultad.
  if (env.NV.buildEnemyEntityFromResolved.length !== 1) throw new Error('arity=' + env.NV.buildEnemyEntityFromResolved.length);
});

t('ensamblador: radius llega resuelto y NUNCA se reescala (9 sigue siendo 9)', () => {
  const env = paritySetup('normal');
  const e = env.NV.buildEnemyEntityFromResolved(resolvedFixture({ radius: 9 }));
  if (e.radius !== 9) throw new Error('radius alterado por factor de modelo: ' + e.radius);
});

t('resolucion privada: coreZoneOwnerId sigue incrementando por core', () => {
  const env = paritySetup('normal');
  const a = spawnAt(env.NV, 7, 'specter_core');
  const b = spawnAt(env.NV, 7, 'specter_core');
  if (a.coreZoneOwnerId !== 1 || b.coreZoneOwnerId !== 2) throw new Error('serial=' + a.coreZoneOwnerId + '/' + b.coreZoneOwnerId);
  const drone = spawnAt(env.NV, 7, 'drone');
  if (drone.coreZoneOwnerId !== 0) throw new Error('no-core con serial=' + drone.coreZoneOwnerId);
});


console.log('\nRESULT spectral_enemy_spawn: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);