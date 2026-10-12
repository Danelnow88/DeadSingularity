const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const ctx = { window: { NV: {} } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('js/data/balance.js', 'utf8'), ctx);
const NV = ctx.window.NV;

const easy = NV.waveClearObjective(1, 'easy');
const normal = NV.waveClearObjective(1, 'normal');
const hard = NV.waveClearObjective(1, 'hard');
assert.equal(easy.total, 18);
assert.equal(normal.total, 22);
assert.equal(hard.total, 26);
assert.equal('travel' in normal, false, 'no debe haber contador de movimiento artificial');
assert.equal(NV.waveClearReady(0, 6, 0, normal), true,
  'no queda cuota de bajas tras finalizar el tiempo y limpiar el campo');
assert.equal(NV.waveClearReady(0, normal.total, 1, normal), false,
  'un hostil vivo impide cerrar la oleada');
assert.equal(NV.waveClearReady(0.01, normal.total, 0, normal), false,
  'el reloj sigue siendo un tiempo mínimo');
assert.equal(NV.waveClearReady(0, normal.total, 0, normal), true);
assert.equal(NV.waveClearReady(0, 999, 999, null), false);
assert(NV.waveClearObjective(1000, 'hard').total <= 60);

const game = fs.readFileSync('js/game.js', 'utf8');
assert(game.includes('waveGoal = bossWave ? null : NV.waveClearObjective(wave, NV.runDifficulty)'),
  'la oleada debe crear el objetivo para la dificultad seleccionada');
assert(game.includes('if (NV.waveClearReady(waveTimer, waveSpawned, remainingHostiles, waveGoal))'),
  'el cierre debe exigir todos los objetivos');
assert(game.includes("'BAJAS ' + waveDefeats"),
  'el HUD debe mostrar progreso real del asalto');
assert(game.includes('cleared / waveSpawned'), 'limpieza usa enemigos realmente desplegados');
assert.equal(NV.waveDeploymentOpen(0, false), false);
assert.equal(NV.waveDeploymentOpen(-1, false), false);
assert.equal(NV.waveDeploymentOpen(0.1, false), true);
assert.equal(NV.waveDeploymentOpen(0, true), true, 'boss conserva soporte original');
assert.equal(NV.waveClearReady(1, 1000, 0, normal), false, 'bajas no adelantan el reloj');
for (const diff of ['easy', 'normal', 'hard']) for (let w = 1; w <= 100; w++) {
  const old = NV.softHostileTarget(w, diff);
  const next = NV.fieldHostileTarget(w, diff);
  assert.equal(next, Math.min(NV.BALANCE.ACTIVE_HOSTILE_LIMIT, Math.max(old, Math.min(NV.BALANCE.SOFT_DENSITY_MAX, old + 3))));
  assert(NV.fieldSpawnBatch(w) >= NV.spawnBatchForWave(w));
  assert(NV.fieldSpawnBatch(w) <= NV.BALANCE.LATE_BATCH_CAP);
}
assert(!game.includes('waveTravel'), 'la distancia recorrida no debe bloquear la victoria');
console.log('OK wave_clear_objective');
