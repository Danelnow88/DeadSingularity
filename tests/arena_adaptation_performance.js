const assert=require('node:assert/strict');
const {runArenaIntegration}=require('../tools/performance/stress_harness.js');
const results=runArenaIntegration(720);
assert.equal(results.length,3);
for(const r of results) {
  assert.equal(r.simulatedFrames,720);assert.equal(r.maxHostiles,30);
  assert(r.maxHeavy<=7);assert.equal(r.maxHazards,2);
  assert(r.sawActive,'pipeline integrado nunca disparó láser: '+r.quality);
  assert(Number.isFinite(r.update.p95)&&Number.isFinite(r.draw.p95));
  // No asserts frágiles de milisegundos: distintos equipos/CI tienen CPUs distintas.
}
console.log('RESULT arena_adaptation_performance: High/Auto/Performance, presupuesto, refill y láser integrado OK');
