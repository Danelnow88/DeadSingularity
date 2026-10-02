const fs = require('fs');
const vm = require('vm');
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('  ok  ' + name); } catch (error) { fail++; console.log('  FAIL ' + name + ' -> ' + error.message); } }
function ok(value, message) { if (!value) throw new Error(message); }

const sandbox = { window: { NV: {} }, console, Math, Object, Array, Map, Set };
for (const file of ['js/data/gameData.js', 'js/engine/enemySpawnRegistry.js']) {
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
}
const NV = sandbox.window.NV;
const labJs = fs.readFileSync('dev/combat-test-lab.js', 'utf8');

console.log('combat_lab_discovery:');
t('all eligible normal and elite registry entries appear', () => {
  const defs = NV.getProductionEnemyDefinitions();
  const ids = new Set(defs.map((entry) => entry.id));
  for (const type of NV.ENEMY_TYPES) ok(ids.has(type.id), 'missing normal ' + type.id);
  for (const type of NV.ELITE_TYPES) ok(ids.has(type.id || type.visualId), 'missing elite ' + (type.id || type.visualId));
});
t('canonical IDs are unique and labels derive from production names', () => {
  const defs = NV.getProductionEnemyDefinitions();
  ok(new Set(defs.map((entry) => entry.id)).size === defs.length, 'duplicate canonical ID');
  for (const entry of defs) ok(entry.name === entry.definition.name, 'copied label for ' + entry.id);
});
t('temporary production enemy and elite fixtures auto-appear', () => {
  const normal = { id: 'fixture_dynamic_normal', name: 'FIXTURE NORMAL', hostileClass: 'light' };
  const elite = { visualId: 'fixture_dynamic_elite', name: 'FIXTURE ELITE', hostileClass: 'heavy' };
  NV.ENEMY_TYPES.push(normal); NV.ELITE_TYPES.push(elite);
  try {
    const defs = NV.getProductionEnemyDefinitions();
    ok(defs.some((entry) => entry.id === normal.id && entry.definition === normal), 'normal fixture missing');
    ok(defs.some((entry) => entry.id === elite.visualId && entry.definition === elite), 'elite fixture missing');
  } finally { NV.ENEMY_TYPES.pop(); NV.ELITE_TYPES.pop(); }
});
t('temporary character fixture auto-appears through characterList', () => {
  NV.CHARACTERS.fixture_pilot = { name: 'FIXTURE PILOT' };
  NV.CHARACTER_ORDER.push('fixture_pilot');
  try { ok(NV.characterList().some((entry) => entry.id === 'fixture_pilot'), 'character fixture missing'); }
  finally { NV.CHARACTER_ORDER.pop(); delete NV.CHARACTERS.fixture_pilot; }
});
t('lab shell contains no authoritative enemy or pilot ID arrays', () => {
  ok(!/\[(?:\s*['"][a-z0-9_]+['"]\s*,){2,}/i.test(labJs), 'hardcoded ID array found');
  ok(!/BOTI|NOVA|ROOK|ENJAMBRE/.test(labJs), 'hardcoded pilot label found');
  ok(!/elite_phantom|specter_grunt|elite_titan/.test(labJs), 'hardcoded enemy ID found');
  ok(labJs.includes('runtime.getCatalog()') && labJs.includes('runtime.getCharacters()'), 'runtime discovery not used');
});
t('boss registry is not part of production enemy discovery', () => {
  const refs = new Set(NV.getProductionEnemyDefinitions().map((entry) => entry.definition));
  ok(!NV.BOSS_TYPES.some((boss) => refs.has(boss)), 'boss leaked into selector');
});

t('boss_minion: identidad declarada FUERA de los pools de produccion', () => {
  // El descriptor existe y es estable.
  const descriptor = NV.BOSS_MINION_TYPE;
  ok(descriptor, 'BOSS_MINION_TYPE ausente');
  ok(descriptor.id === 'boss_minion', 'id inesperado: ' + descriptor.id);
  ok(descriptor.hostileClass === 'light', 'hostileClass inesperado');
  ok(descriptor.noFuse === true, 'noFuse no declarado');

  // ExCLUSION ESTRUCTURAL: vive fuera de ENEMY_TYPES y ELITE_TYPES, que son
  // la unica fuente de spawn normal, spawn elite y descubrimiento. No se
  // modifica getProductionEnemyDefinitions para filtrar por id.
  ok(!NV.ENEMY_TYPES.some((type) => type.id === 'boss_minion'), 'boss_minion en ENEMY_TYPES');
  ok(!NV.ELITE_TYPES.some((type) => (type.id || type.visualId) === 'boss_minion'), 'boss_minion en ELITE_TYPES');
  ok(!NV.BOSS_TYPES.some((boss) => boss.id === 'boss_minion'), 'boss_minion en BOSS_TYPES');

  // No aparece en el catalogo de produccion (y por tanto, tampoco en el Combat Lab).
  const defs = NV.getProductionEnemyDefinitions();
  ok(!defs.some((entry) => entry.id === 'boss_minion'), 'boss_minion en el catalogo de produccion');
  ok(NV.getProductionEnemyDefinition('boss_minion') === null, 'getProductionEnemyDefinition lo devuelve');

  // La shell del Combat Lab sigue sin Arrays de IDs autoritativos.
  ok(!/boss_minion/.test(labJs), 'boss_minion hardcodeado en el shell del lab');
});

t('los conteos del roster de produccion siguen intactos', () => {
  ok(NV.ENEMY_TYPES.length === 13, 'ENEMY_TYPES = ' + NV.ENEMY_TYPES.length);
  ok(NV.ELITE_TYPES.length === 8, 'ELITE_TYPES = ' + NV.ELITE_TYPES.length);
  ok(NV.BOSS_TYPES.length === 10, 'BOSS_TYPES = ' + NV.BOSS_TYPES.length);
  const defs = NV.getProductionEnemyDefinitions();
  ok(defs.length === NV.ENEMY_TYPES.length + NV.ELITE_TYPES.length,
    'catalogo = ' + defs.length + ' vs pools ' + (NV.ENEMY_TYPES.length + NV.ELITE_TYPES.length));
});

t('boss and weapon bridge catalogs derive from production definitions and remain detached', () => {
  const src = fs.readFileSync('js/game.js', 'utf8');
  const start = src.indexOf('  function combatLabBosses()');
  const end = src.indexOf('  function combatLabPlacementCandidates', start);
  const context = { NV, WEAPONS: NV.WEAPONS };
  NV.BALANCE = { WEAPON_MAX_LEVEL: 100, MAX_WEAPON_FUSION: 3 };
  vm.runInNewContext(src.slice(start, end) + '\nthis.bosses = combatLabBosses; this.weapons = combatLabWeapons;', context);
  const bosses = context.bosses(), weapons = context.weapons();
  ok(bosses.length === NV.BOSS_TYPES.length && weapons.length === NV.WEAPONS.length, 'catalog count mismatch');
  bosses.forEach((entry, index) => {
    ok(entry.index === index && entry.name === NV.BOSS_TYPES[index].name && entry.pattern === NV.BOSS_TYPES[index].pattern && entry.canonicalWave === (index + 1) * 5, 'boss catalog fields');
  });
  weapons.forEach((entry, index) => ok(entry.id === NV.WEAPONS[index].id && entry.name === NV.WEAPONS[index].name && entry.maxLevel === 100 && entry.maxFusion === 3, 'weapon catalog fields'));
  bosses[0].name = 'changed'; weapons[0].name = 'changed';
  ok(NV.BOSS_TYPES[0].name !== 'changed' && NV.WEAPONS[0].name !== 'changed', 'live registry references');
  NV.BOSS_TYPES.push({ name: 'FIXTURE BOSS', pattern: 'fixture' });
  NV.WEAPONS.push({ id: 'fixture_weapon', name: 'FIXTURE WEAPON' });
  try {
    ok(context.bosses().at(-1).name === 'FIXTURE BOSS' && context.bosses().at(-1).canonicalWave === NV.BOSS_TYPES.length * 5, 'dynamic boss absent');
    ok(context.weapons().at(-1).id === 'fixture_weapon', 'dynamic weapon absent');
  } finally { NV.BOSS_TYPES.pop(); NV.WEAPONS.pop(); }
});

console.log('RESULT combat_lab_discovery: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);
