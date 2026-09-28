const fs = require('fs');
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('  ok  ' + name); } catch (error) { fail++; console.log('  FAIL ' + name + ' -> ' + error.message); } }
function ok(value, message) { if (!value) throw new Error(message); }

const game = fs.readFileSync('js/game.js', 'utf8');
const html = fs.readFileSync('dev/combat-test-lab.html', 'utf8');
const shell = fs.readFileSync('dev/combat-test-lab.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

console.log('combat_lab_lifecycle:');
t('iframe loads one real production runtime with combatLab and fresh flags', () => {
  ok(html.includes('../index.html?combatLab=1&amp;fresh=1'), 'iframe URL missing');
  ok((html.match(/<iframe\b/g) || []).length === 1, 'iframe count');
  ok(/<iframe[^>]+tabindex="0"/.test(html), 'iframe is not focusable');
  ok(!shell.includes('requestAnimationFrame'), 'shell created gameplay loop');
  ok(!shell.includes('contentWindow.location.reload'), 'iframe recreated/reloaded');
});
t('start, restart and resume restore production gameplay focus without key proxying', () => {
  for (const token of ['function prepareGameplayFocusTarget', 'function focusGameplay', 'frame.contentWindow.focus()', 'canvas.tabIndex = 0']) {
    ok(shell.includes(token), 'focus handoff missing ' + token);
  }
  ok(/const result = runtime\.start\(readConfig\(\)\);[\s\S]*if \(result && result\.ok\) focusGameplay\(\);/.test(shell), 'start focus handoff missing');
  ok(/const result = runtime\.restart\(\);[\s\S]*if \(result && result\.ok\) focusGameplay\(\);/.test(shell), 'restart focus handoff missing');
  ok(/if \(ok && snapshot\.paused\) focusGameplay\(\);/.test(shell), 'resume focus handoff missing');
  ok(!shell.includes("addEventListener('keydown'"), 'parent keydown proxy added');
  ok(!shell.includes("addEventListener('keyup'"), 'parent keyup proxy added');
  ok((shell.match(/function focusGameplay/g) || []).length === 1, 'duplicate focus helper');
});
t('bridge is narrow and only installed in combatLab init branch', () => {
  ok(game.includes("const runMode = /(?:^|[?&])combatLab=1"), 'query gate missing');
  ok(/if \(combatLabMode\) \{\s*enterCombatLabIdle\(\);\s*installCombatLabRuntime\(\);/.test(game), 'private install gate missing');
  for (const method of ['getCatalog', 'getCharacters', 'getDifficulties', 'start', 'reset()', 'restart()', 'pause()', 'resume()', 'snapshot']) ok(game.includes(method), 'missing ' + method);
  ok(!game.includes('NV.combatLabRuntime = { enemies'), 'mutable internals exposed');
});
t('normal production flow remains default and nextWave is untouched by lab start', () => {
  const startLab = game.slice(game.indexOf('function startCombatLab'), game.indexOf('function combatLabSnapshot'));
  ok(!startLab.includes('nextWave()'), 'lab called nextWave');
  const startGame = game.slice(game.indexOf('function startGame()'), game.indexOf('function nextWave()'));
  ok(startGame.includes('nextWave();'), 'production start lost nextWave');
  ok(/\}\s*else \{\s*showMenu\(\);\s*\}/.test(game), 'production menu branch missing');
});
t('random spawner, pickup and wave victory are suppressed only in combatLab', () => {
  ok(game.includes('if (!combatLabMode && transition <= 0)'), 'director guard missing');
  ok(game.includes('if (transition <= 0 && waveTimer <= 0 && !boss)') && game.includes('if (!combatLabMode) {'), 'wave progression guard missing');
  const guarded = game.slice(game.indexOf('if (!combatLabMode && transition <= 0)'), game.indexOf('updateHazards(dt)'));
  ok(guarded.includes('spawnEnemy()') && guarded.includes('spawnElite()') && guarded.includes('spawnWeaponPickup()'), 'director calls moved outside guard');
});
t('timed and infinite modes use simulation dt and no authoritative timeout', () => {
  const update = game.slice(game.indexOf('function update(dt)'), game.indexOf('function shoot('));
  ok(update.includes('combatLabState.elapsed + dt'), 'simulation timer missing');
  ok(update.includes("combatLabState.status = 'COMPLETE'"), 'complete status missing');
  ok(!update.includes('setTimeout'), 'timeout used in update');
  ok(game.includes("duration: null") && game.includes("durationMode === 'timed'"), 'infinite representation missing');
});
t('pause, reset and restart share full production pause/cleanup paths', () => {
  ok(game.includes('NV.input.togglePause();'), 'pause semantics not reused');
  const cleanup = game.slice(game.indexOf('function clearCombatLabTransientState'), game.indexOf('function enterCombatLabIdle'));
  for (const token of ['clearPhantomPossession', 'resetHookSystem', 'clearHazards', 'stopAllWeapons', 'enemies = []', 'bullets = []', 'drones = []', 'meteors = []', 'flameZones = []', 'bossChests = []']) ok(cleanup.includes(token), 'cleanup missing ' + token);
  ok(game.includes('return startCombatLab(combatLabState.lastConfig);'), 'restart config path missing');
});
t('caps are validated all-or-nothing before transient state mutation', () => {
  const validate = game.slice(game.indexOf('function validateCombatLabConfig'), game.indexOf('function startCombatLab'));
  ok(validate.includes('requested.length > MAX_HOSTILES'), 'total cap missing');
  ok(validate.includes('heavy > MAX_HEAVY_HOSTILES'), 'heavy cap missing');
  ok(!validate.includes('clearCombatLabTransientState'), 'validation mutates transient state');
  const start = game.slice(game.indexOf('function startCombatLab'), game.indexOf('function combatLabSnapshot'));
  ok(start.indexOf('if (!validation.ok)') < start.indexOf('clearCombatLabTransientState()'), 'mutation before validation');
});
t('positions use real radius, player distance and overlap checks', () => {
  ok(game.includes('NV.productionEnemySpawnRadius(request.descriptor)'), 'real radius missing');
  ok(game.includes('Math.max(180, radius + playerRadius + 24)'), 'player distance missing');
  ok(game.includes('radius + other.radius + 12'), 'overlap check missing');
});
t('bosses remain deferred and registry module loads before enemies', () => {
  ok(!shell.includes('BOSS_TYPES') && !game.slice(game.indexOf('function combatLabCatalog'), game.indexOf('function combatLabCharacters')).includes('BOSS_TYPES'), 'boss selector integration found');
  ok(index.indexOf('js/engine/enemySpawnRegistry.js') < index.indexOf('js/engine/enemies.js'), 'registry load order');
});

console.log('RESULT combat_lab_lifecycle: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);