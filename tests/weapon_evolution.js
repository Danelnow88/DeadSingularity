const assert = require('assert');
const fs = require('fs'), vm = require('vm');
const sandbox = { window: { NV: {} }, console, Math };
for (const file of ['data/gameData','data/balance','engine/weapons']) vm.runInNewContext(fs.readFileSync('js/' + file + '.js','utf8'), sandbox);
const NV = sandbox.window.NV;
for (const w of NV.WEAPONS) {
  assert(NV.WEAPON_EVOLUTIONS[w.id], 'todas las propiedades documentadas');
  const original = JSON.stringify(w);
  assert.deepStrictEqual(NV.evolvedWeaponImpact(w, 0), NV.evolvedWeaponImpact(w, 1), 'hito sólo en fusión 2');
  const impact = NV.evolvedWeaponImpact(w, 2);
  assert.equal(impact.type, NV.weaponImpactProfile(w).type, 'no cambia la familia de colisión');
  assert.equal(JSON.stringify(w), original, 'datos compartidos inmutados');
}
assert.equal(NV.evolvedWeaponImpact(NV.weaponById('rifle'), 2).pierce, 3);
assert.equal(NV.evolvedWeaponImpact(NV.weaponById('plasma'), 2).radius, 76);
assert.equal(NV.evolvedWeaponImpact(NV.weaponById('bow'), 2).radius, 230);
assert.equal(NV.evolvedWeaponImpact(NV.weaponById('railgun'), 2).knockback, 105);
const flame = NV.weaponById('flamethrower');
let range;
const st = { player: { x: 0, y: 0, luck: 0 }, enemies: [{x:190,y:0}], boss: null, bullets: [], currentWeapon: flame,
  currentWeaponLevel: () => 1, weaponVisualTier: () => 0, BULLET_TIER_COLORS: ['#fff'], MAX_BULLETS: 200,
  permDamageBonus: 0, playWeaponSound() {}, currentWeaponFusion: 1, onFlame(c) { range = c.range; } };
assert.equal(NV.shoot(st), false, 'base fuera de alcance no dispara');
st.currentWeaponFusion = 2; assert(NV.shoot(st)); assert.equal(range, 205, 'evolución funciona en auto y zona física');
st.currentWeapon = NV.weaponById('rifle'); st.enemies[0].x = 100; assert(NV.shoot(st)); assert.equal(st.bullets[0].pierce, 3);
st.currentWeapon = NV.weaponById('shotgun'); st.bullets = []; assert(NV.shoot(st));
assert.equal(st.bullets[0].shotGroup.cap, 6); assert.equal(st.bullets[0].shotGroup.bossCap, 8, 'preservar límite justo contra jefes');
console.log('RESULT weapon_evolution: diez hitos, flujo real de disparo y balance de escopeta OK');
