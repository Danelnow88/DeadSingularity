// Tests SFX unico oleada superada.
const fs = require('fs'), vm = require('vm');
let pass = 0, fail = 0;
function t(d, fn) { try { fn(); pass++; console.log('  ok  ' + d); } catch (e) { fail++; console.log('  FAIL ' + d + ' -> ' + e.message); } }
function makeSandbox() {
  const freqs = [], ramps = [], channels = [], stops = [];
  const fakeMath = Object.create(Math);
  fakeMath.random = () => 0.5;
  const gainApi = () => ({ value: 0.6, setValueAtTime(){}, linearRampToValueAtTime(v){ ramps.push(v); }, exponentialRampToValueAtTime(){}, cancelScheduledValues(){} });
  const oscFreq = () => ({ value: 0, setValueAtTime(v){ freqs.push(v); }, linearRampToValueAtTime(){}, exponentialRampToValueAtTime(v){ freqs.push(v); } });
  const filterFreq = () => ({ value: 0, setValueAtTime(){}, linearRampToValueAtTime(){}, exponentialRampToValueAtTime(){} });
  const sink = (list) => ({ start(){}, stop(tm){ list.push(tm); } });
  const ctx = {
    createOscillator: () => Object.assign({ connect(){}, type:'', frequency: oscFreq() }, sink(stops)),
    createGain: () => ({ connect(tg){ if (tg && tg._channel) channels.push(tg._channel); }, gain: gainApi() }),
    createBiquadFilter: () => ({ connect(){}, type:'', Q:{value:0}, frequency: filterFreq() }),
    createBuffer: () => ({ getChannelData: () => new Float32Array(4410) }),
    createBufferSource: () => Object.assign({ connect(){}, buffer:null }, sink(stops)),
    destination: {}, currentTime: 0, sampleRate: 44100, state: 'suspended', resume: () => Promise.resolve(),
  };
  const sb = { console, Math: fakeMath, Object, Array, Number, String, Boolean, Proxy, Reflect, Float32Array, window:{}, globalThis:{}, AudioContext: function () { return ctx; } };
  sb.window.AudioContext = sb.AudioContext; sb.window.NV = { getBoss: () => null, getState: () => 'playing', getFrame: () => 0 };
  sb._freqs = freqs; sb._ramps = ramps; sb._channels = channels; sb._stops = stops;
  return sb;
}
function loadSynth() { const sb = makeSandbox(); vm.runInNewContext(fs.readFileSync('js/audio/synth.js', 'utf8'), sb, { filename: 'synth.js' }); return { NV: sb.window.NV, sb }; }
function tagCh(NV) { for (const k in NV.mixer) { if (NV.mixer[k]) NV.mixer[k]._channel = k; } return NV; }
t('sfx.victory existe y no crashea en normal/hito/boss', () => {
  const { NV } = loadSynth(); NV.initAudio();
  if (typeof NV.sfx.victory !== 'function') throw new Error('falta sfx.victory');
  NV.sfx.victory(3, { milestone: false });
  NV.sfx.victory(5, { milestone: true });
  NV.sfx.victory(10, { milestone: true });
});
t('identidad UNICA: normal/hito/boss suenan igual', () => {
  const sig = (w, m) => { const s = loadSynth(); s.NV.initAudio(); s.NV.sfx.victory(w, { milestone: m }); return s.sb._freqs.map((x) => Math.round(x)).join(','); };
  const base = sig(3, false);
  for (const p of [[4, false], [5, true], [10, true], [25, true]]) { if (sig(p[0], p[1]) !== base) throw new Error('variante en wave=' + p[0]); }
});
t('evento con desarrollo, cabe en wave_end sin invadir tienda', () => {
  const s = loadSynth(); s.NV.initAudio(); tagCh(s.NV); s.NV.sfx.victory(3, { milestone: false });
  if (!s.sb._channels.length || s.sb._channels.some((c) => c !== 'sfxPlayer')) throw new Error('canales victory = ' + s.sb._channels);
  const mx = Math.max.apply(null, s.sb._stops);
  if (!(mx >= 0.60 && mx <= 1.10)) throw new Error('victory fuera de 0.60-1.10s: ' + s.sb._stops);
  if (s.sb._stops.length < 4) throw new Error('victory sin capas: ' + s.sb._stops);
  const uq = Array.from(new Set(s.sb._stops.map((x) => Math.round(x * 100)))).sort();
  if (uq.length < 3) throw new Error('victory sin etapas: ' + s.sb._stops);
  if (!fs.readFileSync('js/game.js', 'utf8').includes('const WAVE_END_DURATION = 2.10;')) throw new Error('WAVE_END_DURATION modificado');
});
t('presencia: golpe inicial + duck profundo/corto, sin fanfarra larga', () => {
  const s = loadSynth(); s.NV.initAudio(); tagCh(s.NV); s.NV.sfx.victory(3, { milestone: false });
  if (!s.sb._ramps.includes(0.10)) throw new Error('victory sin duck propio a 0.10');
  if (s.sb._ramps.includes(0.30)) throw new Error('victory aun usa duck leve v1 (0.30)');
  const mx = Math.max.apply(null, s.sb._stops);
  if (mx > 1.10) throw new Error('victory invade wave_end/tienda: ' + s.sb._stops);
  if (s.sb._stops.length < 6) throw new Error('victory sin golpe+capas: ' + s.sb._stops);
});
t('distinto de pickup/level-up/shop (no es un ding)', () => {
  const v = loadSynth(); v.NV.initAudio(); v.NV.sfx.victory(3, { milestone: false });
  const vsig = v.sb._freqs.map((x) => Math.round(x)).join(',');
  const one = (fn) => { const s = loadSynth(); s.NV.initAudio(); fn(s.NV); return s.sb._freqs.map((x) => Math.round(x)).join(','); };
  const others = [one((NV) => NV.sfx.pickup()), one((NV) => NV.sfx.playerLevelUp()), one((NV) => NV.sfx.shopBuy()), one((NV) => NV.sfx.consume('bomb'))];
  for (const o of others) if (o === vsig) throw new Error('victory igual a otro SFX');
  if (v.sb._stops.length <= 2) throw new Error('victory parece un ding');
});
t('triggerWaveVictory dispara victory una sola vez y no pre-dispara', () => {
  const game = fs.readFileSync('js/game.js', 'utf8');
  const st = game.indexOf('function triggerWaveVictory');
  const block = game.slice(st, game.indexOf('function triggerFlash', st));
  if (block.split('sfx.victory').length - 1 !== 1) throw new Error('victory no unico en trigger');
  if (!block.includes('return false;')) throw new Error('trigger sin guard idempotente');
  if (!game.includes('if (transition <= 0 && waveTimer <= 0 && !boss)')) throw new Error('falta condicion fin normal');
  if (!game.includes('if (player.hp <= 0) { gameOver(); return; }')) throw new Error('muerte ya no gana carrera');
  const boss = fs.readFileSync('js/engine/boss.js', 'utf8');
  if (!boss.includes('st.triggerWaveVictory(true, bossName, bossColor)')) throw new Error('boss no usa trigger unico');
  if (!boss.includes('if (boss.hp <= 0)')) throw new Error('boss sin condicion hp<=0');
});
console.log('RESULT wave_clear_sfx: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);
