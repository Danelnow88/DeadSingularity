// P1: stress lógico del presupuesto autoritativo (escenarios A-H).
const fs = require('fs'), vm = require('vm');
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('  ok  ' + name); } catch (e) { fail++; console.log('  FAIL ' + name + ' -> ' + e.message); } }
function load(file, sbx) { vm.runInNewContext(fs.readFileSync(file, 'utf8'), sbx, { filename: file }); }
function setup() {
  const math = Object.create(Math); math.random = () => 0;
  const sbx = { window: { NV: {} }, console, Math: math, Object, Array, Set, Map };
  for (const f of ['js/data/balance.js', 'js/data/gameData.js', 'js/engine/hostileBudget.js', 'js/engine/enemies.js', 'js/engine/boss.js']) load(f, sbx);
  return sbx.window.NV;
}
function setupTrackedRng() {
  let calls = 0;
  const math = Object.create(Math); math.random = () => { calls++; return 0.25; };
  const sbx = { window: { NV: {} }, console, Math: math, Object, Array, Set, Map };
  for (const f of ['js/data/balance.js', 'js/data/gameData.js', 'js/engine/hostileBudget.js', 'js/engine/enemies.js', 'js/engine/boss.js']) load(f, sbx);
  return { NV: sbx.window.NV, calls: () => calls };
}
function light(i) { return { x: i, y: 0, dead: false, hostileClass: 'light' }; }
function heavy(i) { return { x: i, y: 0, dead: false, hostileClass: 'heavy', isElite: true }; }
function assertBudget(NV, st) {
  const b = NV.getHostileBudget(st);
  if (b.hostiles > 30 || b.heavy > 7) throw new Error(JSON.stringify(b));
  return b;
}
function spawnState(NV, enemies, boss) {
  return { enemies, boss: boss || null, MAX_HOSTILES: 30, MAX_HEAVY_HOSTILES: 7, wave: 25, W: 900, H: 520, ENEMY_TYPES: NV.ENEMY_TYPES, ELITE_TYPES: NV.ELITE_TYPES };
}

t('constantes autoritativas son 30 hostiles / 7 heavy', () => {
  const NV = setup();
  if (NV.BALANCE.MAX_HOSTILES !== 30 || NV.BALANCE.MAX_HEAVY_HOSTILES !== 7 || NV.BALANCE.MAX_ENEMIES !== 30) throw new Error(JSON.stringify(NV.BALANCE));
});

t('A: 30 normales llenan presupuesto sin excederlo', () => {
  const NV = setup(), enemies = [], st = spawnState(NV, enemies);
  st.forceTypeId = 'drone';
  for (let i = 0; i < 30; i++) if (!NV.spawnEnemy(st)) throw new Error('falló spawn ' + i);
  if (NV.spawnEnemy(st) !== false) throw new Error('spawn 31 permitido');
  const b = assertBudget(NV, st);
  if (b.hostiles !== 30 || b.heavy !== 0) throw new Error(JSON.stringify(b));
});

t('B: 23 light + 7 heavy es el máximo mixto legal', () => {
  const NV = setup(), st = spawnState(NV, [...Array.from({ length: 23 }, (_, i) => light(i)), ...Array.from({ length: 7 }, (_, i) => heavy(i))]);
  const b = assertBudget(NV, st);
  if (b.hostiles !== 30 || b.heavy !== 7 || b.remainingHostiles !== 0 || b.remainingHeavy !== 0) throw new Error(JSON.stringify(b));
});

t('C: boss + máximo legal de summons termina en 30', () => {
  const NV = setup(), boss = { dead: false, isBoss: true, hostileClass: 'heavy' }, enemies = [], st = spawnState(NV, enemies, boss);
  for (let i = 0; i < 40; i++) NV.spawnMinion(i, 0, st);
  const b = assertBudget(NV, st);
  if (enemies.length !== 29 || b.hostiles !== 30 || b.heavy !== 1) throw new Error(JSON.stringify({ len: enemies.length, b }));
});

t('boss minion migrado conserva stats, identidad moderna y radio exacto', () => {
  const NV = setup();
  for (const wave of [1, 10, 25]) {
    const enemies = [], st = spawnState(NV, enemies); st.wave = wave;
    if (NV.spawnMinion(120, 80, st) !== true || enemies.length !== 1) throw new Error('spawn fallido w' + wave);
    const e = enemies[0], hp = Math.round(20 * (1 + wave * 0.3));
    if (e.hp !== hp || e.maxHp !== hp) throw new Error('hp w' + wave + '=' + e.hp + '/' + e.maxHp);
    if (e.speed !== NV.ENEMY_TYPES[0].speed + wave * 2) throw new Error('speed w' + wave + '=' + e.speed);
    if (e.radius !== 9 || e.damage !== 8 || e.score !== 8 || e.xp !== 8) throw new Error('stats w' + wave);
    if (e.enemyTypeId !== 'boss_minion' || e.hostileClass !== 'light' || e.behavior !== 'chase' || e.movementClass !== 'normal') throw new Error('identidad w' + wave);
    if (e.isElite !== false || e.eliteDamage !== 8 || e.stun !== 0 || e.noFuse !== true) throw new Error('campos legacy/declarativos w' + wave);
    if (e.erraticTargetAngle !== 0 || e.shieldCd !== 0 || e.resist !== 0 || e.coreZoneOwnerId !== 0) throw new Error('neutrales w' + wave);
    if ('visualId' in e) throw new Error('visualId innecesario');
  }
});

t('boss minion consume exactamente un Math.random para angle', () => {
  const tracked = setupTrackedRng(), enemies = [], st = spawnState(tracked.NV, enemies); st.wave = 7;
  const before = tracked.calls();
  if (!tracked.NV.spawnMinion(10, 20, st)) throw new Error('spawn fallido');
  if (tracked.calls() - before !== 1) throw new Error('Math.random=' + (tracked.calls() - before));
  if (enemies[0].angle !== Math.PI / 2 || enemies[0].erraticTargetAngle !== 0) throw new Error('ángulos=' + enemies[0].angle + '/' + enemies[0].erraticTargetAngle);
});

t('D: intentos repetidos no exceden 30', () => {
  const NV = setup(), enemies = [], st = spawnState(NV, enemies); st.forceTypeId = 'drone';
  for (let i = 0; i < 200; i++) NV.spawnEnemy(st);
  if (enemies.length !== 30) throw new Error('len=' + enemies.length);
  assertBudget(NV, st);
});

t('E: intentos repetidos no exceden 7 heavy', () => {
  const NV = setup(), enemies = [], st = spawnState(NV, enemies); st.wave = 3;
  for (let i = 0; i < 20; i++) NV.spawnElite(st);
  const b = assertBudget(NV, st);
  if (b.heavy !== 7 || enemies.length !== 7) throw new Error(JSON.stringify(b));
});

t('F: elite batch con un heavy slot restante se trunca a uno', () => {
  const NV = setup(), enemies = Array.from({ length: 6 }, (_, i) => heavy(i)), st = spawnState(NV, enemies); st.wave = 3; st.waveEvent = 'elites';
  NV.spawnElite(st);
  const b = assertBudget(NV, st);
  if (enemies.length !== 7 || b.heavy !== 7) throw new Error(JSON.stringify({ len: enemies.length, b }));
});

t('G: summon triple con sólo dos slots es all-or-nothing', () => {
  const NV = setup(), boss = { x: 400, y: 100, hp: 100, maxHp: 100, dead: false, attack: 'summon', atkTimer: 3, isBoss: true, hostileClass: 'heavy' };
  const enemies = Array.from({ length: 27 }, (_, i) => light(i));
  const st = Object.assign(spawnState(NV, enemies, boss), {
    player: { x: 400, y: 400 }, bullets: [], MAX_BULLETS: 200, MAX_ENEMY_BULLETS: 120, enemyBulletCount: () => 0,
    sfx: { bossAttack: new Proxy({}, { get: () => () => {} }) }, triggerFlash() {}, addFloatText() {}, spawnBossProj() {},
  });
  st.spawnMinion = (x, y) => NV.spawnMinion(x, y, st);
  NV.runBossAttack(boss, 0, st);
  if (enemies.length !== 27 || boss.atkTimer !== 3) throw new Error('partial summon len=' + enemies.length);
  assertBudget(NV, st);
});

t('H: boss sólo entra si quedan hostile y heavy slots', () => {
  const NV = setup();
  if (!NV.canSpawnBoss(spawnState(NV, Array.from({ length: 29 }, (_, i) => light(i))))) throw new Error('29 light debería admitir boss');
  if (NV.canSpawnBoss(spawnState(NV, Array.from({ length: 30 }, (_, i) => light(i))))) throw new Error('30 no debería admitir boss');
  const sixHeavy = Array.from({ length: 6 }, (_, i) => heavy(i));
  if (!NV.canSpawnBoss(spawnState(NV, sixHeavy))) throw new Error('6 heavy debería admitir boss');
  const sevenHeavy = Array.from({ length: 7 }, (_, i) => heavy(i));
  if (NV.canSpawnBoss(spawnState(NV, sevenHeavy))) throw new Error('7 heavy no debería admitir boss');
});

t('Mutante split es all-or-nothing y usa el mismo presupuesto', () => {
  const NV = setup(), boss = { x: 400, y: 100, hp: 40, maxHp: 100, dead: false, attack: 'split', atkTimer: 0, isBoss: true, hostileClass: 'heavy' };
  const enemies = Array.from({ length: 27 }, (_, i) => light(i));
  const st = Object.assign(spawnState(NV, enemies, boss), { player: { x: 0, y: 0 }, bullets: [], MAX_BULLETS: 10, MAX_ENEMY_BULLETS: 10, enemyBulletCount: () => 0, sfx: { bossAttack: new Proxy({}, { get: () => () => {} }) }, spawnBossProj() {} });
  st.spawnMinion = (x, y) => NV.spawnMinion(x, y, st);
  NV.runBossAttack(boss, 0, st);
  if (boss.split || enemies.length !== 27) throw new Error('split parcial');
  assertBudget(NV, st);
});

t('force spawn respeta budget; bypass requiere ignoreHostileBudget=true', () => {
  const NV = setup(), enemies = Array.from({ length: 30 }, (_, i) => light(i)), st = spawnState(NV, enemies); st.forceTypeId = 'specter_lite';
  if (NV.spawnEnemy(st) !== false || enemies.length !== 30) throw new Error('force saltó límite');
  st.ignoreHostileBudget = true;
  if (!NV.spawnEnemy(st) || enemies.length !== 31) throw new Error('bypass explícito no funcionó');
});

t('fusión reduce hostiles y no inventa heavy slots', () => {
  const NV = setup();
  const enemies = Array.from({ length: 3 }, (_, i) => ({ x: 100 + i, y: 100, hp: 10, maxHp: 10, damage: 2, speed: 0, radius: 10, color: '#fff', shape: 'circle', behavior: 'chase', enemyTypeId: 'drone', dead: false, knockVelX: 0, knockVelY: 0, hostileClass: 'light' }));
  const st = { enemies, player: { x: 800, y: 500, invuln: 0, stun: 0 }, bullets: [], MAX_BULLETS: 10, MAX_ENEMY_BULLETS: 10, enemyBulletCount: () => 0, applyPlayerDamage() { return { applied: false }; }, addFloatText() {}, spawnExplosion() {} };
  const r = NV.updateEnemies(0, st);
  const b = NV.getHostileBudget({ enemies: r.enemies, boss: null });
  if (r.enemies.length !== 1 || b.hostiles !== 1 || b.heavy !== 0) throw new Error(JSON.stringify({ len: r.enemies.length, b }));
});

t('tres boss minions migrados no fusionan; noFuse se aplica bilateralmente', () => {
  const NV = setup(), enemies = [], spawnSt = spawnState(NV, enemies); spawnSt.wave = 5;
  NV.spawnMinion(100, 100, spawnSt);
  NV.spawnMinion(101, 100, spawnSt);
  NV.spawnMinion(102, 100, spawnSt);
  if (enemies.length !== 3 || enemies.some((e) => e.enemyTypeId !== 'boss_minion' || e.noFuse !== true)) throw new Error('spawns no migrados');
  const st = { enemies, player: { x: 800, y: 500, invuln: 0, stun: 0 }, bullets: [], MAX_BULLETS: 10, MAX_ENEMY_BULLETS: 10, enemyBulletCount: () => 0, applyPlayerDamage() { return { applied: false }; }, addFloatText() {}, spawnExplosion() {}, MAX_HOSTILES: 30, MAX_HEAVY_HOSTILES: 7, boss: null };
  const r = NV.updateEnemies(0, st);
  if (r.enemies.length !== 3 || r.enemies.some((e) => e.enemyTypeId !== 'boss_minion' || e.noFuse !== true || e.fusionLevel !== undefined)) throw new Error('fusión cambió');
});

t('boss minion conserva variante de invocación sin cambiar su identidad ni presupuesto', () => {
  const NV = setup(), enemies = [], spawnSt = spawnState(NV, enemies); spawnSt.wave = 45;
  if (!NV.spawnMinion(100, 100, spawnSt, 'mutant')) throw new Error('no invocó clon');
  const clone = enemies[0];
  if (!clone || clone.enemyTypeId !== 'boss_minion' || clone.summonVariant !== 'mutant' || !clone.noFuse) throw new Error('identidad clon=' + JSON.stringify(clone));
  assertBudget(NV, spawnSt);
});

t('noFuse bilateral excluye un vecino same-key y evita fusión', () => {
  const NV = setup();
  const base = (x) => ({ x, y: 100, hp: 10, maxHp: 10, damage: 2, speed: 0, radius: 10, color: '#fff', shape: 'circle', behavior: 'chase', enemyTypeId: 'same_key', dead: false, knockVelX: 0, knockVelY: 0, hostileClass: 'light' });
  const enemies = [base(100), Object.assign(base(101), { noFuse: true }), base(102)];
  const st = { enemies, player: { x: 800, y: 500, invuln: 0, stun: 0 }, bullets: [], MAX_BULLETS: 10, MAX_ENEMY_BULLETS: 10, enemyBulletCount: () => 0, applyPlayerDamage() { return { applied: false }; }, addFloatText() {}, spawnExplosion() {}, MAX_HOSTILES: 30, MAX_HEAVY_HOSTILES: 7, boss: null };
  const r = NV.updateEnemies(0, st);
  if (r.enemies.length !== 3 || r.enemies.some((e) => e.fusionLevel !== undefined || e.dead)) throw new Error('vecino noFuse consumido');
});

t('fusión extrema se promociona a heavy cuando hay slot', () => {
  const NV = setup();
  const enemies = Array.from({ length: 3 }, (_, i) => ({ x: 100 + i, y: 100, hp: 10, maxHp: 10, damage: 2, speed: 0, radius: 39, color: '#fff', shape: 'circle', behavior: 'chase', enemyTypeId: 'tank', dead: false, knockVelX: 0, knockVelY: 0, fusionLevel: 2, hostileClass: 'medium' }));
  const st = { enemies, player: { x: 800, y: 500, invuln: 0, stun: 0 }, bullets: [], MAX_BULLETS: 10, MAX_ENEMY_BULLETS: 10, enemyBulletCount: () => 0, applyPlayerDamage() { return { applied: false }; }, addFloatText() {}, spawnExplosion() {}, MAX_HOSTILES: 30, MAX_HEAVY_HOSTILES: 7, boss: null };
  const r = NV.updateEnemies(0, st);
  const b = assertBudget(NV, { enemies: r.enemies, boss: null });
  if (r.enemies.length !== 1 || r.enemies[0].hostileClass !== 'heavy' || b.heavy !== 1) throw new Error(JSON.stringify({ cls: r.enemies[0] && r.enemies[0].hostileClass, b }));
});

t('fusión extrema no excede cap heavy ya lleno', () => {
  const NV = setup();
  const heavies = Array.from({ length: 7 }, (_, i) => Object.assign(heavy(500 + i * 50), { enemyTypeId: 'elite_' + i }));
  const fusables = Array.from({ length: 3 }, (_, i) => ({ x: 100 + i, y: 100, hp: 10, maxHp: 10, damage: 2, speed: 0, radius: 39, color: '#fff', shape: 'circle', behavior: 'chase', enemyTypeId: 'tank', dead: false, knockVelX: 0, knockVelY: 0, fusionLevel: 2, hostileClass: 'medium' }));
  const enemies = heavies.concat(fusables);
  const st = { enemies, player: { x: 800, y: 500, invuln: 0, stun: 0 }, bullets: [], MAX_BULLETS: 10, MAX_ENEMY_BULLETS: 10, enemyBulletCount: () => 0, applyPlayerDamage() { return { applied: false }; }, addFloatText() {}, spawnExplosion() {}, MAX_HOSTILES: 30, MAX_HEAVY_HOSTILES: 7, boss: null };
  const r = NV.updateEnemies(0, st);
  const b = assertBudget(NV, { enemies: r.enemies, boss: null });
  const survivor = r.enemies.find((e) => e.enemyTypeId === 'tank');
  if (!survivor || survivor.hostileClass !== 'medium' || b.heavy !== 7) throw new Error(JSON.stringify({ cls: survivor && survivor.hostileClass, b }));
});

console.log('RESULT hostile_budget: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);
