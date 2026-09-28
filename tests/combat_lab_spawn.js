const fs = require('fs');
const vm = require('vm');
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('  ok  ' + name); } catch (error) { fail++; console.log('  FAIL ' + name + ' -> ' + error.message); } }
function ok(value, message) { if (!value) throw new Error(message); }
function near(a, b, message) { if (Math.abs(a - b) > 1e-9) throw new Error(message + ': ' + a + ' != ' + b); }

function setup(randomValues) {
  const values = randomValues.slice();
  const math = Object.create(Math);
  math.random = () => values.length ? values.shift() : 0.5;
  const sandbox = { window: { NV: {} }, console, Math: math, Number, Object, Array, Map, Set, WeakMap, WeakSet, JSON, Proxy, Reflect };
  for (const file of ['js/data/gameData.js', 'js/data/balance.js', 'js/engine/hostileBudget.js', 'js/engine/enemySpawnRegistry.js', 'js/engine/enemies.js']) {
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
  }
  sandbox.window.NV.SPECTER_ENABLED = true;
  sandbox.window.NV.runDifficulty = 'normal';
  return { NV: sandbox.window.NV, remaining: values };
}
function state(NV, wave) {
  return { enemies: [], boss: null, wave, W: 900, H: 520, MAX_HOSTILES: NV.BALANCE.MAX_HOSTILES, MAX_HEAVY_HOSTILES: NV.BALANCE.MAX_HEAVY_HOSTILES, ENEMY_TYPES: NV.ENEMY_TYPES, ELITE_TYPES: NV.ELITE_TYPES, waveEvent: null };
}

console.log('combat_lab_spawn:');
t('normal spawn-by-ID matches production final construction', () => {
  const a = setup([0.2, 0.3, 0.4, 0.6]);
  const b = setup([0.2, 0.3, 0.4, 0.6]);
  const stA = state(a.NV, 9), stB = state(b.NV, 9);
  stA.forceTypeId = a.NV.ENEMY_TYPES[0].id;
  a.NV.spawnEnemy(stA);
  const result = b.NV.spawnProductionEnemy(stB, b.NV.ENEMY_TYPES[0].id);
  ok(result.ok, result.code);
  ok(JSON.stringify(stA.enemies[0]) === JSON.stringify(stB.enemies[0]), 'construction mismatch');
});
t('elite-by-ID works with explicit position and real scaling', () => {
  const { NV } = setup([0.25, 0.75]);
  const st = state(NV, 19);
  const descriptor = NV.getProductionEnemyDefinitions().find((entry) => entry.spawnKind === 'elite');
  const result = NV.spawnProductionEnemy(st, descriptor.id, { position: { x: 75, y: 95 } });
  ok(result.ok && result.entity.isElite, 'elite failed');
  ok(result.entity.x === 75 && result.entity.y === 95, 'position override ignored');
  const expectedHp = Math.round((descriptor.definition.hp + 19 * 19 * 1.5) * 0.85 * NV.difficultySafeMult('hp', 'normal'));
  ok(result.entity.hp === expectedHp, 'elite hp scaling');
});
t('wave, difficulty and role multipliers are production-owned', () => {
  const { NV } = setup([0.1, 0.2]);
  const descriptor = NV.getProductionEnemyDefinitions().find((entry) => entry.spawnKind === 'normal' && NV.roleHpMult(entry.id) !== 1);
  const st = state(NV, 29);
  NV.runDifficulty = 'hard';
  const result = NV.spawnProductionEnemy(st, descriptor.id, { position: { x: 40, y: 80 } });
  const expected = Math.round(descriptor.definition.hp * NV.enemyHpScale(29) * 0.85 * NV.difficultySafeMult('hp', 'hard') * NV.roleHpMult(descriptor.id));
  ok(result.entity.hp === expected, 'scaled hp=' + result.entity.hp + ' expected=' + expected);
});
t('specialized enemies keep lazy production initialization', () => {
  const { NV } = setup(new Array(60).fill(0.5));
  const ids = ['specter_grunt', 'wisp', 'specter_guard', 'specter_core', 'specter_archer', 'elite_predator', 'elite_titan', 'elite_phantom'];
  const available = ids.filter((id) => NV.getProductionEnemyDefinition(id));
  const st = state(NV, 29);
  st.player = { x: 450, y: 260, radius: 20, hp: 1000, maxHp: 1000, character: 'boti', invuln: 0, stun: 0, dashActive: false, moveVx: 0, moveVy: 0, agility: 1 };
  st.bullets = []; st.MAX_BULLETS = 200; st.MAX_ENEMY_BULLETS = 80; st.enemyBulletCount = () => 0;
  st.applyPlayerDamage = () => ({ applied: false, killed: false }); st.addFloatText = () => {}; st.spawnExplosion = () => {}; st.onKill = () => {};
  st.hazards = []; st.hookSystem = NV.createHookSystem(); st.gameState = 'playing';
  available.forEach((id, index) => {
    const result = NV.spawnProductionEnemy(st, id, { position: { x: 30 + index * 70, y: 60 } });
    ok(result.ok, id + ' spawn failed');
  });
  const core = st.enemies.find((enemy) => enemy.enemyTypeId === 'specter_core');
  if (core) ok(core.coreZoneOwnerId > 0, 'core owner ID missing');
  NV.updateEnemies(0, st);
  const phantom = st.enemies.find((enemy) => enemy.visualId === 'elite_phantom');
  if (phantom) ok(phantom.phantomState === 'roam_stalk', 'phantom state=' + phantom.phantomState);
  const predator = st.enemies.find((enemy) => enemy.visualId === 'elite_predator');
  if (predator) ok(!!predator.predatorState, 'predator state missing');
  const goliath = st.enemies.find((enemy) => enemy.visualId === 'elite_titan');
  if (goliath) ok(!!goliath.goliathState, 'goliath state missing');
});
t('budget failure is structured and does not mutate state', () => {
  const { NV } = setup([0.5, 0.5]);
  const st = state(NV, 20);
  for (let i = 0; i < NV.BALANCE.MAX_HOSTILES; i++) st.enemies.push({ dead: false, hostileClass: 'light' });
  const before = st.enemies.length;
  const result = NV.spawnProductionEnemy(st, NV.ENEMY_TYPES[0].id, { position: { x: 0, y: 100 } });
  ok(!result.ok && result.code === 'HOSTILE_BUDGET', 'wrong failure');
  ok(st.enemies.length === before, 'partial mutation');
});
t('production wrappers preserve random call count and order', () => {
  const values = [0.13, 0.24, 0.35, 0.46, 0.57, 0.68, 0.79, 0.81, 0.92];
  const a = setup(values), st = state(a.NV, 7);
  a.NV.spawnEnemy(st);
  ok(a.remaining.length === values.length - 5, 'normal consumed ' + (values.length - a.remaining.length));
  const b = setup(values), stElite = state(b.NV, 3);
  b.NV.spawnElite(stElite);
  ok(b.remaining.length === values.length - 8, 'elite consumed ' + (values.length - b.remaining.length));
  near(stElite.enemies[0].angle, 0.35 * Math.PI * 2, 'elite angle order');
});

console.log('RESULT combat_lab_spawn: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);