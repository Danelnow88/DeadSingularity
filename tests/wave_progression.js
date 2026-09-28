// Tarea #19: densidad creciente y observación determinista de throughput potencial.
const fs = require('fs'), vm = require('vm');
let pass = 0, fail = 0;
function t(desc, fn) { try { fn(); pass++; console.log('  ok  ' + desc); } catch (e) { fail++; console.log('  FAIL ' + desc + ' -> ' + e.message); } }

const sbx = { window: { NV: {} }, console, Math };
vm.runInNewContext(fs.readFileSync('js/data/balance.js', 'utf8'), sbx, { filename: 'balance.js' });
const NV = sbx.window.NV;

t('densidad normal cumple hitos y crece de temprano a avanzado', () => {
  for (const [w, expected] of [[1, 18], [5, 20], [10, 22], [15, 24], [20, 25], [25, 26], [100, 26]]) {
    const actual = NV.softHostileTarget(w, 'normal');
    if (actual !== expected) throw new Error('w=' + w + ': ' + actual + ' != ' + expected);
  }
  let previous = NV.softHostileTarget(1, 'normal');
  for (let w = 2; w <= 100; w++) {
    const current = NV.softHostileTarget(w, 'normal');
    if (current < previous) throw new Error('descenso en w=' + w);
    previous = current;
  }
});

t('Fácil < Normal < Difícil sin alcanzar el cap duro ordinariamente', () => {
  for (const w of [1, 5, 10, 15, 20, 25, 50]) {
    const easy = NV.softHostileTarget(w, 'easy');
    const normal = NV.softHostileTarget(w, 'normal');
    const hard = NV.softHostileTarget(w, 'hard');
    if (!(easy < normal && normal < hard)) throw new Error('orden w=' + w + ': ' + [easy, normal, hard]);
    if (hard >= NV.BALANCE.MAX_HOSTILES) throw new Error('hard pegado al cap w=' + w + ': ' + hard);
    if (easy < NV.BALANCE.SOFT_DENSITY_MIN) throw new Error('easy bajo piso w=' + w + ': ' + easy);
  }
});

function oldDuration(w, event) {
  return Math.max(15, 25 - w * 0.4) + (event ? 25 : 0);
}
function interval(w) {
  return Math.max(NV.BALANCE.LATE_REFILL_FLOOR, 1.3 - w * 0.035);
}
function refillCycles(duration, spawnFactor, w) {
  const step = interval(w) * spawnFactor;
  return 1 + Math.floor((duration - 1e-9) / step);
}
function throughput(w, event, killProfile, useNew) {
  const duration = useNew ? NV.waveDuration(w, event) : oldDuration(w, event);
  const factor = useNew ? NV.waveSpawnFactor(w, event) : (event ? duration / oldDuration(w, false) : 1);
  const cycles = refillCycles(duration, factor, w);
  const target = useNew ? NV.softHostileTarget(w, 'normal') : (w <= 10 ? 30 : Math.max(16, Math.round(30 - (w - 10) * 0.4)));
  const batch = NV.spawnBatchForWave(w);
  const refillPerCycle = Math.min(batch, Math.max(1, Math.round(batch * killProfile)));
  return Math.min(target, batch) + Math.max(0, cycles - 1) * refillPerCycle;
}

t('simulación simple expone el impacto económico sin modificar recompensas', () => {
  const profiles = { lenta: 0.25, media: 0.6, rapida: 1 };
  for (const w of [1, 10, 20, 25]) {
    for (const [name, rate] of Object.entries(profiles)) {
      const before = throughput(w, false, rate, false);
      const after = throughput(w, false, rate, true);
      if (!(before > 0 && after > 0)) throw new Error(name + ' w=' + w + ' inválido');
    }
  }
  const eventNormal = throughput(24, false, 1, true);
  const eventSpecial = throughput(24, true, 1, true);
  if (!(eventSpecial > eventNormal && eventSpecial < eventNormal * 1.15)) {
    throw new Error('evento no deja aumento moderado: ' + eventNormal + ' -> ' + eventSpecial);
  }
});

console.log('RESULT wave_progression: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);