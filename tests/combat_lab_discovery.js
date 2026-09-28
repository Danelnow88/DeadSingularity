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

console.log('RESULT combat_lab_discovery: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);