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
  ok(guarded.includes('spawnEnemy(composition[i], squadPositions[i])') && guarded.includes('spawnElite(Math.max(0, softTarget - filled.hostiles))') && guarded.includes('spawnWeaponPickup()'), 'director calls moved outside guard');
  ok(guarded.includes('NV.waveSquadPositions(composition'),'formation planning moved outside production guard');
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
t('boss UI consumes detached bridge catalogs and enemy registry loads before enemies', () => {
  for (const token of ['runtime.getBosses()', 'runtime.getWeapons()', "encounterMode: 'boss'", 'bossIndex:', 'weaponId:', 'weaponLevel:', 'weaponFusion:', 'firePolicy:']) {
    ok(shell.includes(token), 'boss UI missing ' + token);
  }
  ok(!shell.includes('BOSS_TYPES'), 'authoritative boss array leaked into shell');
  ok(html.includes('id="bossSelect"') && html.includes('id="weaponSelect"') && html.includes('id="weaponFusionInput"'), 'boss selectors missing');
  ok(index.indexOf('js/engine/enemySpawnRegistry.js') < index.indexOf('js/engine/enemies.js'), 'registry load order');
});

// Execute real game.js bridge functions with production data/engines. Rendering,
// audio and DOM are inert; encounter state and telemetry remain observable.
function bossLabHarness(production = false) {
  const vm = require('vm');
  const silent = () => {};
  const context = vm.createContext({ window: { NV: {} }, console: { log: silent }, Math, Number, Object, Array, Map, Set, JSON });
  for (const file of ['js/data/gameData.js', 'js/data/balance.js', 'js/core/inputIntent.js', 'js/engine/movement.js', 'js/engine/hostileBudget.js', 'js/engine/enemySpawnRegistry.js', 'js/engine/enemies.js', 'js/engine/boss.js', 'js/engine/playtestTelemetry.js']) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  }
  const src = game.replace(/\r\n/g, '\n');
  const section = (a, b) => {
    const first = src.indexOf(a), last = src.indexOf(b, first + a.length);
    if (first < 0 || last < 0) throw new Error('Missing real game section ' + a);
    return src.slice(first, last);
  };
  const arrayNames = ['enemies', 'bullets', 'particles', 'pickups', 'floatTexts', 'shockwaves', 'trails', 'weaponPickups', 'drones', 'meteors', 'bossChests', 'hazards', 'flameZones', 'consumableVfx', 'pendingBombImpacts', 'consumableItems', 'inventory', 'upgradeSlots'];
  vm.runInContext(`
    const NV = window.NV;
    const combatLabMode = ${!production};
    const expeditionRun = null; // El fixture productivo de este test conserva ruta legacy.
    const CHARACTERS = NV.CHARACTERS, WEAPONS = NV.WEAPONS, BOSS_TYPES = NV.BOSS_TYPES, ENEMY_TYPES = NV.ENEMY_TYPES, WAVE_EVENTS = NV.WAVE_EVENTS;
    const MAX_HOSTILES = NV.BALANCE.MAX_HOSTILES, MAX_HEAVY_HOSTILES = NV.BALANCE.MAX_HEAVY_HOSTILES, MAX_BULLETS = 400, MAX_ENEMY_BULLETS = 120, MAX_PARTICLES = 400;
    let ${arrayNames.map((name) => name + ' = []').join(', ')};
    let wave = 1, score = 0, shards = 0, waveTimer = 0, spawnTimer = 0, boss = null, transition = 0, hookSystem = null, minefieldState = {};
    let state = 'menu', paused = false, fireTimer = 0, shake = 0, hitstop = 0, flashAlpha = 0, currentAutoTarget = null, specialVFX = null;
    let heartbeatTimer = 0, heartbeatWasCritical = false, countdownLastSecond = 0, waveEvent = null, metaShards = 0, permUpgrades = {}, consumSel = 0;
    let currentWeapon = NV.starterWeapon(), weaponLevels = {}, weaponKills = {}, weaponFus = {}, shopBought = {}, killCombo = {};
    const combatIntent = NV.inputIntent.createCombatIntent('manual');
    const player = { hp: 100, maxHp: 100, character: 'boti' };
    const combatLabState = ${section('  const combatLabState = {', '\n\n  // === INVENTARIO').split('= ').slice(1).join('= ')}
    NV.settings = { controls: { firePolicy: 'manual' }, gameplay: { difficulty: 'normal' } };
    NV.input = {
      setFire(v) { combatIntent.fireIntent = !!v; },
      getEffectiveFirePolicy() { return NV.inputIntent.effectiveFirePolicy(combatIntent, !!(NV.capabilities && NV.capabilities.isMobile)); },
      togglePause() { paused = !paused; clearCombatIntent(); },
    };
    const noop = () => {};
    const dom = Object.fromEntries(['startScreen', 'characterSelectScreen', 'shop', 'gameOver', 'permScreen'].map((id) => [id, { classList: { add: noop } }]));
    const sfx = new Proxy({ bossAttack: new Proxy({}, { get: () => noop }) }, { get: (obj, key) => obj[key] || noop });
    const presentation = {};
    const WAVE_END_DURATION = 1, BOSS_WAVE_END_DURATION = 1, BOSS_CHEST_HOLD = 1, SHOP_ENTER_DURATION = 1;
    NV.activateNormalShardMagnetPull = noop;
    function arenaW() { return 900; } function arenaH() { return 520; }
    function initAudio() {} function resetPresentation() {} function clearEspectroBridge() {} function syncGameState() {}
    function updateHUD() {} function notifyMobileWeapon() {} function notifyMobileConsumable() {}
    function spawnExplosion() {} function showBanner() {} function triggerFlash() {} function addFloatText() {}
    function applyPlayerDamage() { return { applied: false, killed: false }; }
    function gameOver() { state = 'gameover'; } function enemyBulletCount() { return bullets.filter((b) => b.enemy).length; }
    function currentWeaponLevel() { return weaponLevels[currentWeapon.id] || 1; }
    function currentWeaponFusion() { return weaponFus[currentWeapon.id] || 0; }
    ${section('  function clearCombatIntent()', '\n\n',)}
    ${section('  function playtestWeaponStates()', '\n  let killCombo')}
    ${section('  NV.initializeRunPlayer = function', '\n  function changePilot')}
    ${section('  function hideCombatLabOverlays()', '\n  function startGame()')}
    ${section('  function buildBossForWave(', '\n  // Elige un evento')}
    ${section('  function triggerWaveVictory(', '\n  function triggerFlash(')}
    ${section('  function updateBoss(dt)', '\n  function updateBossChests(')}
    ${section('  function spawnBossProj(', '\n  function updateBullets(')}
    const updateTime = ${section('  function update(dt)', "    if (NV.SPECTER_ENABLED === false)")} };
    installCombatLabRuntime();
    globalThis.inspect = () => ({ boss, enemies, bullets, bossChests, hazards, pickups, inventory, currentWeapon, weaponLevels, weaponFus, wave, state, paused, combatIntent });
    globalThis.tick = (dt) => { updateTime(dt); if (!paused && state === 'playing') updateBoss(dt); };
    globalThis.spawnProduction = (value, difficulty) => { wave = value; NV.settings.gameplay.difficulty = difficulty; nextWave(); };
    globalThis.triggerVictory = triggerWaveVictory;
  `, context);
  return { NV: context.window.NV, runtime: context.window.NV.combatLabRuntime, inspect: context.inspect, tick: context.tick, spawnProduction: context.spawnProduction, triggerVictory: context.triggerVictory };
}
function bossConfig(overrides = {}) {
  return Object.assign({ encounterMode: 'boss', bossIndex: 0, characterId: 'boti', difficultyId: 'normal', weaponId: 'rifle', weaponLevel: 25, weaponFusion: 0, firePolicy: 'manual', durationMode: 'infinite' }, overrides);
}
function expectedBoss(NV, wave, difficulty) {
  const index = ((wave / 5 - 1) % NV.BOSS_TYPES.length + NV.BOSS_TYPES.length) % NV.BOSS_TYPES.length;
  const type = NV.BOSS_TYPES[index];
  const mult = { easy: 0.8, normal: 1, hard: 1.2 }[difficulty];
  const hp = Math.round((type.hp + wave * wave * 12 + wave * 40) * 1.8 * mult);
  return { x: 450, y: 100, hp, maxHp: hp, radius: type.radius, color: type.color, timer: 0, atkTimer: 0, hitFlash: 0, hitSlowUntil: 0, hitSlowImmunity: 0, name: type.name, pattern: type.pattern, attack: type.attack, shape: type.shape, isBoss: true, hostileClass: 'heavy', stunChance: type.stunChance || 0 };
}
t('production construction parity at waves 5/15/50 and all difficulties, without RNG', () => {
  const h = bossLabHarness(true);
  h.NV.playtest.enable();
  const random = Math.random;
  Math.random = () => { throw new Error('Unexpected boss-construction RNG'); };
  try {
    for (const difficulty of ['easy', 'normal', 'hard']) for (const wave of [5, 15, 50, 55]) {
      h.NV.runDifficulty = 'hard'; // Production still reads Settings, as before C2a.
      h.NV.playtest.reset();
      h.spawnProduction(wave, difficulty);
      ok(JSON.stringify(h.inspect().boss) === JSON.stringify(expectedBoss(h.NV, wave, difficulty)), 'production spawn drift ' + wave + '/' + difficulty);
      ok(h.NV.playtest.snapshot().bosses.active.wave === wave, 'production start hook lost');
    }
  } finally { Math.random = random; }
});
t('every boss starts at canonical wave with real difficulty and exactly one selected weapon', () => {
  const h = bossLabHarness();
  for (const difficulty of ['easy', 'normal', 'hard']) for (const entry of h.runtime.getBosses()) {
    const config = bossConfig({ bossIndex: entry.index, difficultyId: difficulty, wave: 999 });
    ok(h.runtime.start(config).ok, 'start rejected');
    const st = h.inspect();
    ok(st.wave === entry.canonicalWave, 'canonical wave ignored');
    ok(JSON.stringify(st.boss) === JSON.stringify(expectedBoss(h.NV, st.wave, difficulty)), 'lab construction drift');
    ok(st.enemies.length === 0, 'arbitrary adds at start');
    ok(st.inventory.length === 1 && st.inventory[0] === st.currentWeapon && st.currentWeapon === h.NV.WEAPONS.find((w) => w.id === config.weaponId), 'loadout not authoritative');
    ok(st.weaponLevels.rifle === 25 && Object.keys(st.weaponFus).length === 0, 'level/fusion state');
    ok(h.NV.settings.gameplay.difficulty === 'normal', 'persisted difficulty changed');
    const telemetry = h.runtime.snapshot().telemetry;
    ok(telemetry.bosses.active.name === st.boss.name && telemetry.bosses.completed.length === 0, 'bossStart record missing/duplicated');
    ok(telemetry.bosses.active.weaponStateStart.rifle.level === 25, 'telemetry loadout missing');
    ok(telemetry.bosses.active.weaponStateStart.rifle.fusion === 0, 'telemetry fusion missing');
  }
});
t('boss loadout applies and reports production fusion levels', () => {
  const h = bossLabHarness();
  const result = h.runtime.start(bossConfig({ weaponFusion: 2 }));
  ok(result.ok && result.config.weaponFusion === 2, 'fusion config rejected');
  ok(h.inspect().weaponFus.rifle === 2 && h.runtime.snapshot().loadout.weaponFusion === 2, 'fusion state/loadout missing');
  ok(h.runtime.snapshot().telemetry.bosses.active.weaponStateStart.rifle.fusion === 2, 'fusion telemetry missing');
});
t('invalid configs are rejected before state, input or telemetry mutations', () => {
  const h = bossLabHarness(); h.runtime.start(bossConfig()); h.tick(0.1);
  const original = h.inspect().boss;
  const before = JSON.stringify(h.NV.playtest.snapshot());
  const bad = [{ encounterMode: 'other' }, { bossIndex: -1 }, { bossIndex: 0.5 }, { bossIndex: h.NV.BOSS_TYPES.length }, { weaponId: 'missing' }, { weaponLevel: 0 }, { weaponLevel: 101 }, { weaponLevel: 1.5 }, { weaponFusion: -1 }, { weaponFusion: 4 }, { weaponFusion: 1.5 }, { firePolicy: 'aimbot' }, { composition: [{ enemyId: h.NV.ENEMY_TYPES[0].id, quantity: 1 }] }, { difficultyId: 'other' }, { characterId: 'missing' }, { durationMode: 'timed', durationSeconds: 0 }];
  for (const patch of bad) {
    ok(!h.runtime.start(bossConfig(patch)).ok, 'invalid config accepted ' + JSON.stringify(patch));
    ok(h.inspect().boss === original && JSON.stringify(h.NV.playtest.snapshot()) === before && h.inspect().state === 'playing', 'partial initialization');
  }
  for (const level of [1, h.NV.BALANCE.WEAPON_MAX_LEVEL]) ok(h.runtime.start(bossConfig({ weaponLevel: level })).ok, 'valid boundary rejected');
  for (const fusion of [0, h.NV.BALANCE.MAX_WEAPON_FUSION]) ok(h.runtime.start(bossConfig({ weaponFusion: fusion })).ok, 'valid fusion boundary rejected');
});
t('legacy enemy config works after a boss and restores prior telemetry/input semantics', () => {
  const h = bossLabHarness(); h.runtime.start(bossConfig({ firePolicy: 'legacy-auto' }));
  const enemyId = h.NV.ENEMY_TYPES[0].id;
  ok(h.runtime.start({ characterId: 'boti', difficultyId: 'easy', wave: 9, durationMode: 'infinite', composition: [{ enemyId, quantity: 2 }] }).ok, 'legacy config rejected');
  ok(h.inspect().enemies.length === 2 && !h.inspect().boss && h.inspect().wave === 9, 'legacy encounter changed');
  ok(h.runtime.snapshot().encounterMode === 'enemies' && h.runtime.snapshot().telemetry === null && !h.NV.playtest.enabled, 'boss telemetry leaked');
  ok(h.NV.input.getEffectiveFirePolicy() === 'manual', 'boss fire override leaked');
});
t('real fire policy supports both desktop choices and preserves mobile auto', () => {
  const h = bossLabHarness();
  for (const policy of h.NV.inputIntent.FIRE_POLICIES) {
    h.runtime.start(bossConfig({ firePolicy: policy }));
    ok(h.NV.input.getEffectiveFirePolicy() === policy, 'desktop policy ignored');
    h.NV.capabilities = { isMobile: true };
    ok(h.NV.input.getEffectiveFirePolicy() === 'legacy-auto', 'mobile safeguard removed');
    h.NV.capabilities.isMobile = false;
  }
  ok((game.match(/NV\.shoot\(\{/g) || []).length === 1, 'duplicate targeting pipeline');
});
t('restart preserves validated config and clears every transient and previous telemetry', () => {
  const h = bossLabHarness();
  const config = bossConfig({ bossIndex: 2, difficultyId: 'hard', characterId: h.NV.characterList()[1].id, weaponLevel: 100, firePolicy: 'legacy-auto' });
  const result = h.runtime.start(config); h.tick(0.4); h.NV.playtest.bossHit('rifle', 50, 'direct');
  const oldBoss = h.inspect().boss;
  const st = h.inspect();
  for (const key of ['enemies', 'bullets', 'bossChests', 'pickups', 'hazards']) st[key].push({ dead: false });
  h.NV.playtest.bossEnd();
  const restart = h.runtime.restart();
  ok(restart.ok && JSON.stringify(restart.config) === JSON.stringify(result.config), 'restart config drift');
  ok(h.inspect().boss !== oldBoss && h.inspect().boss.hp === h.inspect().boss.maxHp, 'boss not fresh');
  for (const key of ['enemies', 'bullets', 'bossChests', 'pickups', 'hazards']) ok(h.inspect()[key].length === 0, key + ' leaked');
  const telemetry = h.runtime.snapshot().telemetry;
  ok(telemetry.run.simTime === 0 && telemetry.bosses.completed.length === 0 && telemetry.bosses.active.damage === 0 && telemetry.bosses.active.elapsed === 0, 'previous telemetry leaked');
});
t('pause/resume freezes boss timers and telemetry, reset removes encounter and restores enable state', () => {
  const h = bossLabHarness(); h.NV.playtest.enable(); h.runtime.start(bossConfig());
  h.tick(0.1); const before = JSON.stringify(h.runtime.snapshot());
  ok(h.runtime.pause(), 'pause failed'); const pausedTime = h.inspect().boss.timer;
  h.tick(10); ok(h.inspect().boss.timer === pausedTime && h.NV.playtest.snapshot().run.simTime === 0.1, 'paused time advanced');
  ok(h.runtime.resume(), 'resume failed'); h.tick(0.1);
  ok(h.inspect().boss.timer > pausedTime && JSON.stringify(h.runtime.snapshot()) !== before, 'resume failed to progress');
  h.runtime.reset();
  ok(!h.inspect().boss && h.inspect().enemies.length === 0 && h.runtime.snapshot().status === 'IDLE', 'reset kept encounter');
  ok(h.NV.playtest.enabled && h.NV.playtest.snapshot().bosses.active === null, 'prior telemetry opt-in not restored');
});
t('real boss attack/phase telemetry and summons run through production engines', () => {
  const h = bossLabHarness();
  const summon = h.NV.BOSS_TYPES.findIndex((entry) => entry.attack === 'summon');
  ok(summon >= 0, 'production summoner missing');
  h.runtime.start(bossConfig({ bossIndex: summon }));
  for (let i = 0; i < 27; i++) h.tick(0.1);
  ok(h.inspect().enemies.length === 3 && h.inspect().enemies.every((e) => e.enemyTypeId === 'boss_minion' && e.noFuse), 'production summons unavailable');
  let telemetry = h.runtime.snapshot().telemetry.bosses.active;
  ok(telemetry.attackSelected.phase1.summon === 1 && telemetry.attackExecuted.phase1.summon === 1, 'C1 initial/execution integration');
  h.inspect().boss.hp = h.inspect().boss.maxHp * 0.4; h.tick(0.1);
  telemetry = h.runtime.snapshot().telemetry.bosses.active;
  ok(telemetry.timeToPhase2 !== null && h.runtime.snapshot().boss.phase2, 'phase telemetry missing');
});
t('boss budget includes real hostile/heavy caps and does not allow forced bypass', () => {
  const h = bossLabHarness(); h.runtime.start(bossConfig());
  const st = h.inspect();
  ok(!h.NV.canSpawnBoss({ enemies: Array.from({ length: h.NV.BALANCE.MAX_HOSTILES }, () => ({ dead: false })), boss: null }), 'total cap bypass');
  ok(!h.NV.canSpawnBoss({ enemies: Array.from({ length: h.NV.BALANCE.MAX_HEAVY_HOSTILES }, () => ({ dead: false, hostileClass: 'heavy' })), boss: null }), 'heavy cap bypass');
  st.enemies.push(...Array.from({ length: h.NV.BALANCE.MAX_HOSTILES - 1 }, () => ({ dead: false })));
  ok(!h.NV.spawnMinion(0, 0, { enemies: st.enemies, boss: st.boss, wave: st.wave, ENEMY_TYPES: h.NV.ENEMY_TYPES }), 'summon bypassed cap');
  ok(!game.slice(game.indexOf('function startCombatLab'), game.indexOf('function combatLabSnapshot')).includes('ignoreHostileBudget'), 'lab forces budget bypass');
});
t('snapshot has detached boss/catalog/telemetry data and serializes safely', () => {
  const h = bossLabHarness(); h.runtime.start(bossConfig());
  const snapshot = h.runtime.snapshot(); JSON.stringify(snapshot);
  snapshot.boss.hp = -100; snapshot.telemetry.bosses.active.name = 'mutated'; snapshot.loadout.weaponId = 'mutated';
  ok(h.inspect().boss.hp > 0 && h.NV.playtest.snapshot().bosses.active.name !== 'mutated' && h.inspect().currentWeapon.id === 'rifle', 'mutable reference exposed');
  ok(snapshot.boss.index === 0 && snapshot.boss.present && snapshot.boss.active && snapshot.boss.attack === h.NV.BOSS_TYPES[0].attack, 'boss fields missing');
});
t('real boss death completes lab without production shop progression; production victory still works', () => {
  const h = bossLabHarness(); h.runtime.start(bossConfig());
  h.inspect().boss.hp = 0; h.tick(0.01);
  ok(h.inspect().boss === null && h.inspect().state === 'playing' && h.inspect().paused && h.inspect().wave === 5 && h.runtime.snapshot().status === 'COMPLETE', 'boss escaped lab lifecycle');
  ok(h.runtime.snapshot().telemetry.bosses.completed.length === 1 && !h.runtime.snapshot().telemetry.bosses.active, 'bossEnd missing/duplicated');
  h.tick(10); ok(h.inspect().state === 'playing', 'shop transition after completion');
  ok(h.runtime.restart().ok && h.runtime.snapshot().telemetry.bosses.completed.length === 0, 'death restart failed');
  const production = bossLabHarness(true); production.runtime.start(bossConfig());
  production.inspect().boss.hp = 0; production.tick(0.01);
  ok(production.inspect().state === 'wave_end' && !production.inspect().paused, 'production victory altered');
});

console.log('RESULT combat_lab_lifecycle: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);
