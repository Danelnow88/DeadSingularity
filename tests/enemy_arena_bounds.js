const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const math = Object.create(Math); let random = 0;
math.random = () => random;
const sandbox = { window: { NV: {} }, Math: math, console: { log() {} } };
for (const file of ['data/gameData', 'data/balance', 'engine/hostileBudget', 'engine/enemySpawnRegistry', 'engine/enemies', 'engine/boss']) {
  vm.runInNewContext(fs.readFileSync('js/' + file + '.js', 'utf8'), sandbox);
}
const NV = sandbox.window.NV;
for (const [W, H] of [[900,520], [1155,520], [360,240]]) {
  for (const value of [0, .5, .999999]) {
    random = value;
    for (const type of NV.ENEMY_TYPES) {
      const st = { enemies: [], boss: null, wave: 19, W, H, ENEMY_TYPES: NV.ENEMY_TYPES,
        player: { x: W * .5, y: H * .5 }, forceTypeId: type.id, MAX_HOSTILES: 30, MAX_HEAVY_HOSTILES: 7 };
      assert(NV.spawnEnemy(st));
      const enemy = st.enemies[0], safe = NV.enemyArenaPosition(enemy, W, H);
      assert.equal(enemy.x, safe.x); assert.equal(enemy.y, safe.y);
      assert(enemy.x > enemy.radius && enemy.x < W - enemy.radius);
      enemy.x = -200; enemy.y = H + 200; enemy.knockVelX = -900;
      NV.keepEnemyInArena(enemy, W, H);
      assert.equal(enemy.x, safe.margin); assert.equal(enemy.y, H - safe.margin);
      assert.equal(enemy.knockVelX, 0);
    }
    const eliteState = { enemies: [], boss: null, wave: 3, W, H, ELITE_TYPES: NV.ELITE_TYPES, MAX_HOSTILES:30, MAX_HEAVY_HOSTILES:7 };
    NV.spawnElite(eliteState);
    for (const enemy of eliteState.enemies) {
      const safe = NV.enemyArenaPosition(enemy, W, H);
      assert.equal(enemy.x, safe.x); assert.equal(enemy.y, safe.y);
    }
  }
}
const summons = { enemies: [], boss: null, wave: 3, W:900, H:520, ENEMY_TYPES:NV.ENEMY_TYPES, MAX_HOSTILES:30, MAX_HEAVY_HOSTILES:7 };
assert(NV.spawnMinion(-50, 900, summons));
assert(summons.enemies[0].x > 0 && summons.enemies[0].y < 520);
const game = fs.readFileSync('js/game.js', 'utf8');
assert(game.includes('keepInsideArena: !combatLabMode'));
assert(fs.readFileSync('js/ui/alpha.js','utf8').includes('s.showHUD === false'));
console.log('OK enemy_arena_bounds: spawn normal/élite/esbirro, tres arenas y empuje');
