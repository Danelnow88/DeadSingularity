// Regresión del overlay compartido: la dirección errática no es un ataque.
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const NV = {};
const sandbox = { window: { NV }, Math, Map, WeakMap };
vm.runInNewContext(fs.readFileSync('js/data/gameData.js', 'utf8'), sandbox, { filename: 'gameData.js' });
vm.runInNewContext(fs.readFileSync('js/render/metaReadability.js', 'utf8'), sandbox, { filename: 'metaReadability.js' });

function trace() {
  const strokes = [];
  const ctx = {
    strokeStyle: '', save() {}, restore() {}, beginPath() {}, closePath() {},
    moveTo() {}, lineTo() {}, quadraticCurveTo() {}, arc() {},
    stroke() { strokes.push(this.strokeStyle); },
  };
  return { ctx, strokes };
}

let pass = 0;
function test(name, fn) {
  fn();
  pass++;
  console.log('  ok  ' + name);
}

const erratic = NV.ENEMY_TYPES.concat(NV.ELITE_TYPES).filter((type) => type.behavior === 'erratic');
test('roster erratic: Phantom, Wisp, Velocity y Specter Lite', () => {
  assert.deepStrictEqual(Array.from(erratic, (type) => type.id || type.visualId).sort(),
    ['elite_phantom', 'elite_velocity', 'specter_lite', 'wisp']);
});
for (const type of erratic) {
  const id = type.id || type.visualId;
  test(id + ': sin segmento naranja al iniciar, durante ni fuera del pulso', () => {
    for (const timer of [0, 0.08, 0.159, 0.16, 0.3, 0.5]) {
      const e = { x: 100, y: 80, radius: type.radius, behavior: type.behavior,
        enemyTypeId: type.id, visualId: type.visualId, angle: 0.8, erraticTimer: timer };
      const before = JSON.stringify(e);
      const { ctx, strokes } = trace();
      assert.strictEqual(NV.drawEnemyIntent(ctx, e, { x: 220, y: 80 }, { t: 2 }), false);
      assert.deepStrictEqual(strokes, []);
      assert.strictEqual(JSON.stringify(e), before);
    }
  });
}
test('ranged conserva semicírculo y ticks informativos; no depende de erratic', () => {
  const { ctx, strokes } = trace();
  assert.strictEqual(NV.drawEnemyIntent(ctx, { x: 100, y: 80, radius: 13, behavior: 'ranged' },
    { x: 220, y: 80 }, { t: 2 }), true);
  assert.strictEqual(strokes.length, 6);
  assert.ok(strokes.every((color) => color === NV.META_VIS_PALETTE.info));
});
test('el aviso de contacto naranja sigue disponible al acercarse', () => {
  const { ctx, strokes } = trace();
  assert.strictEqual(NV.drawContactReadability(ctx, { x: 100, y: 80, radius: 6 },
    { x: 140, y: 80 }, false, { t: 2 }), true);
  assert.deepStrictEqual(strokes, [NV.META_VIS_PALETTE.dangerSoft]);
});
console.log('RESULT enemy_intent_artifact: pass=' + pass + ' fail=0');