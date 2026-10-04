const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const game = fs.readFileSync('js/game.js', 'utf8');
const start = game.indexOf('  const HUD_REVEAL_SECONDS');
const end = game.indexOf('  let settingsRestorePaused', start);
const box = vm.createContext({ paused: false, state: 'playing' });
vm.runInContext(game.slice(start, end), box);
const run = code => vm.runInContext(code, box);
run('revealHUD(); updateHudReveal(0.32)');
assert.equal(run('hudReveal'), 1);
run('updateHudReveal(2.68); updateHudReveal(0.16)');
assert(Math.abs(run('hudReveal') - 0.5) < 1e-9);
run('revealHUD(); updateHudReveal(0.16)');
assert.equal(run('hudReveal'), 1);
const hold = run('hudHold');
run('paused=true; updateHudReveal(10)');
assert.equal(run('hudHold'), hold);
assert.equal(run('hudReveal'), 1);
run('paused=false; state="shop"; updateHudReveal(10)');
assert.equal(run('hudHold'), hold);
run('state="playing"; updateHudReveal(10)');
assert.equal(run('hudReveal'), 0);
run('revealHUD(); updateHudReveal(-1)');
assert.equal(run('hudHold'), 3);
for (const name of ['notifyMobileWeapon', 'notifyMobileConsumable', 'useSpecial']) {
  assert(game.includes(`function ${name}() {${name === 'useSpecial' ? '\n   ' : ''} revealHUD();`), name);
}
assert(game.includes('if (showHUD) revealHUD();'));
assert(game.includes('if (combatIntent.abilityIntent && player.specialCd <= 0) useSpecial();'));
assert.equal((game.match(/NV\.drawBossHUD\(/g) || []).length, 1);
assert(game.includes('const maxWaveTimer = NV.waveDuration('));
assert(fs.readFileSync('js/ui/alpha.js', 'utf8').includes('s.showHUD === false'));
const render = game.slice(game.indexOf("    if (showHUD && (state === 'playing' || state === 'wave_end')) {"), game.indexOf('    if (showStats) {'));
const calls = [];
let offset = 0, stack = [];
Object.assign(box, {
  showHUD: true, vx: 12, vy: 20, vw: 1000, vh: 600, killCombo: {}, boss: {}, player: {},
  viewX: () => 12, viewY: () => 20, viewW: () => 1000, viewH: () => 600,
  easeOutCubic: v => 1 - (1 - v) ** 3, drawSpecialCooldown() {},
  ctx: { save() { stack.push(offset); }, restore() { offset = stack.pop(); },
    beginPath() {}, rect() {}, clip() {}, translate(x, y) { offset += y; } },
  NV: { capabilities: { isMobile: false }, consumSlotRects: [],
    drawCombo() { calls.push(['combo', offset]); },
    drawBossHUD() { calls.push(['boss', offset]); },
    drawDashStamina() { calls.push(['dash', offset]); } },
  drawWeaponHUD() { calls.push(['weapons', offset]); box.NV.consumSlotRects = [{ x: 10, y: 200, w: 30, h: 40 }]; }
});
for (const progress of [0, 0.5, 1]) {
  calls.length = 0;
  run(`hudReveal=${progress}`); run(render);
  assert.equal(calls.find(c => c[0] === 'boss')[1], 0);
  assert.equal(calls.find(c => c[0] === 'dash')[1], 0);
  assert.equal(calls.find(c => c[0] === 'combo')[1], 20 - (1 - progress) ** 3 * 664);
  assert.equal(calls.some(c => c[0] === 'weapons'), progress > 0);
  if (!progress) assert.equal(box.NV.consumSlotRects.length, 0);
  assert.equal(stack.length, 0);
}
run('showHUD=false'); run(render);
assert.equal(box.NV.consumSlotRects.length, 0);
box.NV.capabilities.isMobile = true; run('showHUD=true'); run(render);
assert.equal(box.NV.consumSlotRects.length, 0);
const rects = run('curtainConsumableRects([{x:10,y:20,w:30,h:40},{x:50,y:200,w:30,h:40}],40,600)');
assert.equal(rects[0].y, 0); assert.equal(rects[0].h, 20);
assert.equal(rects[1].y, 160);
assert.equal(run('curtainConsumableRects([{x:10,y:20,w:30,h:40}],100,600)[0].w'), 0);
console.log('PASS HUD curtain: timer, retrigger, pause, layers, mobile and hitboxes');
