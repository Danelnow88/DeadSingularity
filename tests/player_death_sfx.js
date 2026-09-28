// Tests SFX muerte del personaje: evento único "morí" vs "me pegaron".
const fs = require('fs'), vm = require('vm');
let pass = 0, fail = 0;
function t(desc, fn) { try { fn(); pass++; console.log('  ok  ' + desc); } catch (e) { fail++; console.log('  FAIL ' + desc + ' -> ' + e.message); } }

function makeSandbox() {
  const freqs = [], ramps = [], noiseBands = [], channels = [], stops = [];
  const gainApi = () => ({ value: 0.6, setValueAtTime(){}, linearRampToValueAtTime(v){ ramps.push(v); }, exponentialRampToValueAtTime(){}, cancelScheduledValues(){} });
  const oscFreq = () => ({ value: 0, setValueAtTime(v){ freqs.push(v); }, linearRampToValueAtTime(){}, exponentialRampToValueAtTime(v){ freqs.push(v); } });
  const filterFreq = () => ({ value: 0, setValueAtTime(v){ noiseBands.push(v); }, linearRampToValueAtTime(){}, exponentialRampToValueAtTime(){} });
  const sink = (list) => ({ start(){}, stop(t){ list.push(t); } });
  const ctx = {
    createOscillator: () => Object.assign({ connect(){}, type:'', frequency: oscFreq() }, sink(stops)),
    createGain: () => ({ connect(t){ if (t && t._channel) channels.push(t._channel); }, gain: gainApi() }),
    createBiquadFilter: () => ({ connect(){}, type:'', Q:{value:0}, frequency: filterFreq() }),
    createBuffer: () => ({ getChannelData: () => new Float32Array(4410) }),
    createBufferSource: () => Object.assign({ connect(){}, buffer:null }, sink(stops)),
    destination: {}, currentTime: 0, sampleRate: 44100, state: 'suspended', resume: () => Promise.resolve(),
  };
  const sb = { console, Math, Object, Array, Number, String, Boolean, Proxy, Reflect, Float32Array, window:{}, globalThis:{}, AudioContext: function () { return ctx; } };
  sb.window.AudioContext = sb.AudioContext; sb.window.NV = { getBoss: () => null, getState: () => 'playing', getFrame: () => 0 };
  sb._freqs = freqs; sb._ramps = ramps; sb._noiseBands = noiseBands; sb._channels = channels; sb._stops = stops;
  return sb;
}
function loadSynth() { const sb = makeSandbox(); vm.runInNewContext(fs.readFileSync('js/audio/synth.js', 'utf8'), sb, { filename: 'synth.js' }); return { NV: sb.window.NV, sb }; }
function tagChannels(NV) { for (const k in NV.mixer) { if (NV.mixer[k]) NV.mixer[k]._channel = k; } return NV; }

t('sfx.playerDeath existe y no crashea (alias deathTone delega)', () => {
  const { NV } = loadSynth(); NV.initAudio();
  if (typeof NV.sfx.playerDeath !== 'function') throw new Error('falta sfx.playerDeath');
  NV.sfx.playerDeath();
  for (const p of ['boti', 'nova', 'rook', 'swarm']) NV.sfx.deathTone(p);
});

t('muerte es evento largo multi-etapa en sfxPlayer, encaja en player_dying (0.82s)', () => {
  const d = loadSynth(); d.NV.initAudio(); tagChannels(d.NV); d.NV.sfx.playerDeath();
  // Todo el gesto entra por el bus del jugador.
  if (!d.sb._channels.length || d.sb._channels.some((c) => c !== 'sfxPlayer')) throw new Error('canales muerte = ' + d.sb._channels);
  // Desarrollo perceptible pero sin pasarse de la transición 0.82s.
  const maxStop = Math.max.apply(null, d.sb._stops);
  if (!(maxStop >= 0.70 && maxStop <= 0.82)) throw new Error('muerte fuera de 0.70-0.82s: ' + d.sb._stops);
  // Multi-etapa: varias voces con fines escalonados (colapso/corte/resolución).
  if (d.sb._stops.length < 5) throw new Error('muerte sin capas suficientes: ' + d.sb._stops);
  const uniq = Array.from(new Set(d.sb._stops.map((s) => Math.round(s * 100)))).sort();
  if (uniq.length < 3) throw new Error('muerte sin etapas escalonadas: ' + d.sb._stops);
  // Duck propio, más profundo y largo que el del daño no letal.
  if (!d.sb._ramps.includes(0.08)) throw new Error('muerte no usa su duck propio a 0.08');
  const game = fs.readFileSync('js/game.js', 'utf8');
  if (!game.includes('DEATH_TRANSITION_DURATION')) throw new Error('falta DEATH_TRANSITION_DURATION');
  if (!game.includes('0.82')) throw new Error('transición muerte ya no es 0.82s');
});

t('morí distinto de me pegaron (no es hit más grave)', () => {
  const death = loadSynth(); death.NV.initAudio(); death.NV.sfx.playerDeath();
  const hit = loadSynth(); hit.NV.initAudio(); hit.NV.sfx.playerHit();
  const sig = (sb) => sb._freqs.map((x) => Math.round(x)).join(',');
  if (sig(death.sb) === sig(hit.sb)) throw new Error('muerte igual a playerHit');
  // La muerte baja al sub-grave (<=40Hz destino), el hit no letal no llega ahí.
  const minDeath = Math.min.apply(null, death.sb._freqs);
  const minHit = Math.min.apply(null, hit.sb._freqs);
  if (!(minDeath <= 41 && minDeath < minHit)) throw new Error('muerte sin hundimiento propio: minDeath=' + minDeath + ' minHit=' + minHit);
  if (death.sb._ramps.includes(0.14)) throw new Error('muerte reutiliza duck del hit (0.14)');
});

t('gameOver dispara muerte una vez; pipeline no duplica hit letal', () => {
  const game = fs.readFileSync('js/game.js', 'utf8');
  if (!game.includes('sfx.deathTone(player.character)')) throw new Error('gameOver no dispara deathTone');
  // Una sola llamada de muerte dentro de gameOver (guard anti-doble).
  const calls = game.split('sfx.deathTone(player.character)').length - 1;
  if (calls !== 1) throw new Error('deathTone llamado ' + calls + ' veces');
  if (!game.includes("if (state === 'player_dying' || state === 'gameover') return false")) throw new Error('gameOver sin guard doble-muerte');
  const combat = fs.readFileSync('js/engine/combat.js', 'utf8');
  if (!combat.includes('!result.killed')) throw new Error('pipeline sin gate no-letal');
  if (combat.includes('playerDeath') || combat.includes('deathTone')) throw new Error('muerte sonando desde pipeline (duplicaría con gameOver)');
});

console.log('RESULT player_death_sfx: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);
