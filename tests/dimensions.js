const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const ctx = { window: { NV: {} }, Math }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync('js/data/balance.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync('js/engine/dimensions.js', 'utf8'), ctx);
const NV = ctx.window.NV;
for (const difficulty of ['easy', 'normal', 'hard']) {
  for (let wave = 1; wave <= 50; wave++) {
    const goal = NV.waveClearObjective(wave, difficulty);
    const run = NV.createDimensionRun(wave, wave % 5 === 0, goal, NV.waveDuration(wave));
    let total = 0;
    assert.equal(run.duration, NV.waveDuration(wave), 'cada universo conserva el tiempo de oleada');
    assert.equal(new Set(run.environments).size, 4, 'ningún ambiente se repite');
    for (let depth = 0; depth < 4; depth++) {
      assert.equal(run.depth, depth); total += NV.dimensionObjective(run).total;
      if (depth === 3) { assert.equal(NV.openDimensionPortal(run, 1350, 780), false); break; }
      assert(NV.openDimensionPortal(run, 1350, 780));
      assert.equal(NV.openDimensionPortal(run, 1350, 780), false);
      const p = { x: 675, y: 390, hp: 87 };
      assert.equal(run.phase, 'opening');
      assert.equal(NV.stepDimensionPortal(run, p, 1), false);
      assert.equal(run.phase, 'opening');
      NV.stepDimensionPortal(run, p, 0.21);
      assert.equal(run.phase, 'portal');
      p.x = run.portal.x; p.y = run.portal.y;
      assert.equal(run.portal.model, depth);
      assert.equal(NV.stepDimensionPortal(run, p, 0.01), false);
      assert.equal(NV.stepDimensionPortal(run, p, 1.15), true);
      assert.equal(p.hp, 87); assert.equal(run.portal, null);
      assert.equal(NV.stepDimensionPortal(run, p, 2), false);
    }
    assert.equal(total, goal.total * 4, 'cada universo exige la oleada completa');
  }
}
console.log('PASS dimensiones: combate completo por universo, cuatro ambientes distintos, apertura y tres cruces únicos.');
