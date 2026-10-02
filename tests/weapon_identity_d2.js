const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const context = vm.createContext({ window: { NV: {} }, console, Math, Object, Array, Map, Set });
for (const file of ['js/data/gameData.js', 'js/engine/weapons.js']) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}
const NV = context.window.NV;
const pistol = NV.weaponById('pistol');
const smg = NV.weaponById('smg');

assert(smg.range >= 360, 'Subfusil vuelve a perder continuidad contra blancos laterales');
assert(smg.range < pistol.range, 'Subfusil perdió su debilidad de corto alcance');
assert(smg.fireRate < pistol.fireRate, 'Subfusil dejó de tener mayor cadencia que Pistola');
assert.equal(NV.evolvedWeaponImpact(smg, 2).knockback, 90, 'Fusión II perdió supresión');

console.log('RESULT weapon_identity_d2: pass=4 fail=0');
