// Tarea #19: duración creciente, eventos proporcionales y autoridad única timer/HUD.
const fs = require('fs'), vm = require('vm');
let pass = 0, fail = 0;
function t(desc, fn) { try { fn(); pass++; console.log('  ok  ' + desc); } catch (e) { fail++; console.log('  FAIL ' + desc + ' -> ' + e.message); } }
function load(f, sbx) { vm.runInNewContext(fs.readFileSync(f, 'utf8'), sbx, { filename: f }); }

const sbx = { window: { NV: {} }, console, Math };
load('js/data/balance.js', sbx);
const NV = sbx.window.NV;

function close(actual, expected, label) {
  if (Math.abs(actual - expected) > 1e-9) throw new Error(label + ': ' + actual + ' != ' + expected);
}

t('curva base cumple los hitos aprobados', () => {
  for (const [w, expected] of [[1, 15], [5, 18], [10, 22], [15, 26], [20, 29], [25, 32], [30, 35]]) {
    close(NV.waveDuration(w), expected, 'wave ' + w);
  }
});

t('duración base es monotónica no decreciente y queda capada en 35s', () => {
  let previous = NV.waveDuration(1);
  for (let w = 2; w <= 200; w++) {
    const current = NV.waveDuration(w);
    if (current < previous) throw new Error('descenso en w=' + w);
    if (current > 35) throw new Error('cap superado en w=' + w + ': ' + current);
    previous = current;
  }
  close(NV.waveDuration(100), 35, 'cap tardío');
});

t('sin fórmula inline duplicada en game.js', () => {
  const g = fs.readFileSync('js/game.js', 'utf8');
  const uses = (g.match(/NV\.waveDuration\(wave[,\)]/g) || []).length;
  if (uses < 2) throw new Error('esperaba >=2 usos, hay ' + uses);
  if (/25\s*-\s*wave\s*\*\s*0\.4/.test(g)) throw new Error('quedó fórmula decreciente inline');
});

t('nextWave y barra leen de la MISMA función', () => {
  const g = fs.readFileSync('js/game.js', 'utf8');
  const nw = g.includes('waveTimer = NV.waveDuration(wave, waveEvent);');
  const bar = g.includes('const maxWaveTimer = NV.waveDuration(wave, waveEvent);');
  if (!nw || !bar) throw new Error('nextWave=' + nw + ' barra=' + bar);
});

t('evento agrega 15% proporcional, sin salto fijo de 25s', () => {
  for (const w of [1, 3, 10, 20, 25, 100]) {
    const base = NV.waveDuration(w);
    const event = NV.waveDuration(w, 'fog');
    close(event, Math.min(40.25, base * 1.15), 'evento w=' + w);
    if (event - base >= 10) throw new Error('salto excesivo en w=' + w + ': ' + (event - base));
  }
});

t('sin evento: duración base sin cambios', () => {
  for (const w of [1, 2, 5, 10, 25]) {
    close(NV.waveDuration(w, null), NV.waveDuration(w), 'null w=' + w);
    close(NV.waveDuration(w, false), NV.waveDuration(w), 'false w=' + w);
  }
});

t('waveSpawnFactor compensa sólo la mitad y deja actividad adicional', () => {
  close(NV.waveSpawnFactor(10, null), 1, 'factor normal');
  const factor = NV.waveSpawnFactor(10, 'fog');
  close(factor, 1.075, 'factor evento');
  const opportunityRatio = 1.15 / factor;
  if (!(opportunityRatio > 1.06 && opportunityRatio < 1.08)) throw new Error('ratio de actividad=' + opportunityRatio);
  if (Math.abs(factor - 1.15) < 1e-9) throw new Error('la compensación sigue siendo total');
});

t('bosses conservan final por muerte y no por timer', () => {
  const game = fs.readFileSync('js/game.js', 'utf8');
  if (!game.includes('waveTimer <= 0 && !boss')) throw new Error('falta exclusión de boss en fin temporizado');
  const boss = fs.readFileSync('js/engine/boss.js', 'utf8');
  if (!boss.includes('if (boss.hp <= 0)') || !boss.includes('st.triggerWaveVictory(true')) throw new Error('muerte de boss no conserva autoridad');
});

console.log('RESULT wave_duration: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);