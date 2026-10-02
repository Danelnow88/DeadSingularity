const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const sandbox = { window: { NV: {} }, Math };
for (const file of ['render/projectiles', 'render/hazards', 'engine/bossEncounters']) {
  vm.runInNewContext(fs.readFileSync('js/' + file + '.js', 'utf8'), sandbox);
}
const NV = sandbox.window.NV;
function context() {
  const calls = [], colors = [];
  const ctx = new Proxy({}, {
    get(target, key) { return target[key] || ((...args) => calls.push([key, ...args])); },
    set(target, key, value) { target[key] = value; if (key === 'strokeStyle' || key === 'fillStyle') colors.push(value); return true; },
  });
  return { ctx, calls, colors };
}
for (const state of ['telegraph', 'active', 'recovery']) {
  for (const kind of ['vent', 'rift', 'pulse']) {
    const hazard = { type: 'sectorHazard', kind, state, stateTime: .1, simTime: 1,
      telegraphTime: 1.15, activeTime: .65, recoveryTime: .32, x: 20, y: 20,
      W: 900, H: 520, radius: 120, width: 60, color: '#00ff00', hint: 'SALÍ DE LA FRANJA ROJA', label: 'PULSO' };
    const before = JSON.stringify(hazard), c = context();
    NV.drawHazards(c.ctx, [hazard], null, { tier: 'minimal' }, false);
    assert.equal(JSON.stringify(hazard), before, 'dibujar no cambia hitboxes');
    assert(c.colors.includes(NV.HOSTILE_SIGNALS.damage));
    assert(!c.colors.includes(hazard.color), 'el acento identitario no reemplaza el rojo de daño');
    if (kind === 'pulse') {
      const radii = c.calls.filter(call => call[0] === 'arc').map(call => call[3]);
      assert(radii.includes(90) && radii.includes(150), 'borde interior y exterior de la banda real');
    }
    const label = c.calls.filter(call => call[0] === 'fillRect').at(-1);
    assert(label[1] >= 0 && label[1] + label[3] <= hazard.W, 'cartel dentro del arena');
    assert(label[2] >= 0 && label[2] + label[4] <= hazard.H);
  }
}
const c = context();
NV.drawEncounterWarnings(c.ctx, { radius: 30, encounter: { idlePressure: { x: 200, y: 200, radius: 54, t: .4, duration: .95 } } }, []);
assert(c.calls.some(call => call[0] === 'arc' && call[3] === 54), 'presión de boss muestra el radio fijo de daño');
console.log('OK hostile_signal_geometry: paleta, banda, aviso fijo y etiquetas sin clipping');
