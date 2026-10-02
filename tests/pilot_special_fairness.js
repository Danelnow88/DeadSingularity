// ===== TEST: D1 especiales de piloto contra jefes =====
const assert = require('node:assert/strict'), fs = require('fs'), vm = require('vm');
const sb = { window: { NV: {} }, console, Math, Number, Object, Array, Set, Map, WeakMap, JSON };
for (const file of ['js/data/balance.js', 'js/data/gameData.js', 'js/engine/playtestTelemetry.js', 'js/engine/drones.js', 'js/engine/bullets.js']) {
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), sb, { filename: file });
}
const NV = sb.window.NV;
NV.bossHitReaction = function () {};

function bulletState(bullets, enemies, boss) {
  return { bullets, W: 900, H: 520, player: { x: 100, y: 100, character: 'swarm', invuln: 0, stun: 0 }, enemies, boss,
    CHARACTERS: NV.CHARACTERS, SHIELD_COOLDOWN: 0.9, applyPlayerDamage() { return { applied: false }; },
    addFloatText() {}, killEnemy(e) { e.dead = true; }, applyKnockback() {}, spawnExplosion() {}, shake: 0, hitstop: 0 };
}

assert.equal(NV.BALANCE.DRONE_BOSS_DMG_MULT, 0.35, 'multiplicador autoritativo');

const bullets = [];
const boss = { x: 100, y: 100, hp: 1000, maxHp: 1000, radius: 50, dead: false, hitFlash: 0, hitSlowUntil: 0, hitSlowImmunity: 0 };
const drones = [{ angle: 0, orbitRadius: 0, speed: 0, fireTimer: 0, life: 1, color: '#8dfaff', dead: false }];
NV.updateDrones(0, drones, { x: 100, y: 100 }, bullets, 10, [], boss, 300);
assert.equal(bullets.length, 1);
assert.equal(bullets[0].specialId, 'hivemind');
assert.equal(bullets[0].bossDamageMult, 0.35);

NV.playtest.enable(); NV.playtest.reset(); NV.playtest.enable();
NV.playtest.startRun('swarm', 'normal', 'pistol');
NV.playtest.bossStart(5, 'JEFE', 'chase', boss.maxHp, {});
NV.updateBullets(0, bulletState(bullets, [], boss));
assert(Math.abs(boss.hp - (1000 - 15 * 0.35)) < 1e-9, 'daño boss=' + (1000 - boss.hp));
const telemetry = NV.playtest.snapshot().bosses.active;
assert.equal(telemetry.byWeapon['special:hivemind'].damage, 15 * 0.35);
assert.equal(telemetry.bySource.special.damage, 15 * 0.35);

// Contra enemigos comunes no cambia el daño de identidad del especial.
const normalBullets = [], enemy = { x: 100, y: 100, hp: 100, maxHp: 100, radius: 12, dead: false, hitFlash: 0, hitSlowUntil: 0, hitSlowImmunity: 0, knockVelX: 0, knockVelY: 0 };
NV.updateDrones(0, [{ angle: 0, orbitRadius: 0, speed: 0, fireTimer: 0, life: 1, color: '#8dfaff' }], { x: 100, y: 100 }, normalBullets, 10, [enemy], null, 300);
NV.updateBullets(0, bulletState(normalBullets, [enemy], null));
assert.equal(enemy.hp, 85, 'daño normal alterado');

console.log('RESULT pilot_special_fairness: drones completos contra normales, x0.35 contra boss y telemetría propia OK');
