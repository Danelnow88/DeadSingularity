'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
function load(mobile = false, saved = '{}', width = 1600, height = 900) {
  let stored = saved;
  const canvas = { getBoundingClientRect: () => ({ left: 15, top: 20, width, height }) };
  const document = { documentElement: { setAttribute() {} }, getElementById: () => canvas, addEventListener() {} };
  const window = { NV: { capabilities: { isMobile: mobile, orientation: 'landscape' } }, devicePixelRatio: 2, addEventListener() {}, location: { search: '' } };
  const context = { window, document, localStorage: { getItem: () => stored, setItem: (_, value) => stored = value }, console };
  for (const file of ['js/core/settings.js', 'js/core/viewport.js']) vm.runInNewContext(fs.readFileSync(file, 'utf8'), context);
  return { NV: window.NV, saved: () => stored };
}
const { NV, saved } = load();
assert.equal(NV.viewport.getEffectiveDpr(), 1, 'El default conserva el render previo');
const arena = JSON.stringify(NV.worldMetrics);
const pointer = JSON.stringify(NV.screenToGame(415, 320));
const inverse = JSON.stringify(NV.gameToScreen(225, 173));
for (const [id, width, height] of [['720p', 1280, 720], ['1080p', 1920, 1080], ['1440p', 2560, 1440]]) {
  assert.equal(NV.setGraphicsResolution(id), true);
  assert.equal(Math.round(NV.viewport.cssW * NV.viewport.getEffectiveDpr()), width);
  assert.equal(Math.round(NV.viewport.cssH * NV.viewport.getEffectiveDpr()), height);
  assert.equal(JSON.stringify(NV.worldMetrics), arena, 'Resolución no altera arena/cámara');
  assert.equal(JSON.stringify(NV.screenToGame(415, 320)), pointer, 'Entrada usa píxeles CSS');
  assert.equal(JSON.stringify(NV.gameToScreen(225, 173)), inverse);
  assert.equal(load(false, saved()).NV.settings.graphics.resolution, id, 'Persistencia');
}
assert.equal(NV.setGraphicsResolution('8k'), false);
assert.equal(load(false, '{"graphics":{"resolution":"8k"}}').NV.settings.graphics.resolution, 'native');
NV.setWeaponsVolume(.37); NV.setFirePolicy('legacy-auto'); NV.setDifficulty('hard');
const untouched = JSON.stringify([NV.settings.audio, NV.settings.controls, NV.settings.gameplay]);
NV.resetGraphicsSettings();
assert.equal(NV.viewport.getEffectiveDpr(), 1);
assert.equal(JSON.stringify([NV.settings.audio, NV.settings.controls, NV.settings.gameplay]), untouched, 'Reset sólo gráficos');
const phone = load(true);
const phoneDpr = phone.NV.viewport.getEffectiveDpr();
phone.NV.setGraphicsResolution('1440p');
assert.equal(phone.NV.viewport.getEffectiveDpr(), phoneDpr, 'Móvil conserva su presupuesto automático');
const ultrawide = load(false, '{}', 3440, 1440);
ultrawide.NV.setGraphicsResolution('1440p');
assert.equal(Math.round(3440 * ultrawide.NV.viewport.getEffectiveDpr()), 2560);
assert(Math.round(1440 * ultrawide.NV.viewport.getEffectiveDpr()) <= 1440, 'Aspecto conservado dentro del presupuesto');
console.log('PASS resolución real 720/1080/1440p, persistencia, input/cámara invariantes, móvil, ultrawide y reset aislado');
