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
assert.equal(NV.waveClearReady(0, 6, 0, normal), false,
  'una especial no debe saltar los grupos por desplegar');
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
assert(game.includes('Math.min(timeProgress, cleared / waveGoal.total)'),
  'la barra no debe llenarse antes de cumplir el asalto');
assert(!game.includes('waveTravel'), 'la distancia recorrida no debe bloquear la victoria');
console.log('OK wave_clear_objective');
