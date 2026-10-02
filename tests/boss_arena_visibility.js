const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const context = vm.createContext({ window: { NV: {} }, console, Math, Object, Array, Map, Set });
for (const file of ['js/data/gameData.js', 'js/data/balance.js', 'js/engine/boss.js']) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}
const NV = context.window.NV;

for (const boss of NV.BOSS_TYPES) {
  for (const [x, y] of [[-500, -500], [1400, 1000], [450, 100]]) {
    const result = NV.bossVisibleArenaPosition({ x, y, radius: boss.radius }, 900, 520);
    assert(result.x >= result.margin && result.x <= 900 - result.margin, boss.name + ' x fuera de arena');
    assert(result.y >= result.margin && result.y <= 520 - result.margin, boss.name + ' y fuera de arena');
    assert(result.margin >= boss.radius, boss.name + ' margen menor que hitbox');
  }
}

const apocalypse = NV.BOSS_TYPES.find((boss) => boss.name === 'APOCALIPSIS');
const top = NV.bossVisibleArenaPosition({ x: 730, y: -20, radius: apocalypse.radius }, 900, 520);
assert.equal(top.y, apocalypse.radius * 2.1 + 10, 'APOCALIPSIS vuelve a quedar cortado arriba');
console.log('RESULT boss_arena_visibility: pass=31 fail=0');
