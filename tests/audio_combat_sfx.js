// Tests Audio Tarea 4: SFX de combate diferenciado + heartbeat crítico.
const fs = require('fs'), vm = require('vm');
let pass = 0, fail = 0;
function t(desc, fn) { try { fn(); pass++; console.log('  ok  ' + desc); } catch (e) { fail++; console.log('  FAIL ' + desc + ' -> ' + e.message); } }

function makeSandbox() {
  const freqs = [], ramps = [], noiseBands = [], channels = [], stops = [];
  const gainApi = () => ({ value: 0.6, setValueAtTime(){}, linearRampToValueAtTime(v){ ramps.push(v); }, exponentialRampToValueAtTime(){}, cancelScheduledValues(){} });
  // Frecuencias de oscilador: registra arranque y destino del barrido (playToneSweep).
  const oscFreq = () => ({ value: 0, setValueAtTime(v){ freqs.push(v); }, linearRampToValueAtTime(){}, exponentialRampToValueAtTime(v){ freqs.push(v); } });
  // Frecuencias de filtro: registra la banda de cada burst de ruido (scheduleNoise).
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
// Nombra los GainNode del mixer para poder verificar a qué bus entra cada capa de SFX.
function tagChannels(NV) { for (const k in NV.mixer) { if (NV.mixer[k]) NV.mixer[k]._channel = k; } return NV; }

t('sfx.enemyDeath y sfx.playerHit existen y no crashean', () => {
  const { NV } = loadSynth(); NV.initAudio();
  for (const k of ['normal', 'elite', 'boss']) NV.sfx.enemyDeath(k);
  NV.sfx.playerHit();
});

t('enemyDeath usa firmas distintas para normal/elite/boss', () => {
  const normal = loadSynth(); normal.NV.initAudio(); normal.NV.sfx.enemyDeath('normal');
  const elite = loadSynth(); elite.NV.initAudio(); elite.NV.sfx.enemyDeath('elite');
  const boss = loadSynth(); boss.NV.initAudio(); boss.NV.sfx.enemyDeath('boss');
  const sig = (sb) => sb._freqs.map((x) => Math.round(x)).join(',');
  if (sig(normal.sb) === sig(elite.sb)) throw new Error('normal y elite suenan igual');
  if (sig(elite.sb) === sig(boss.sb)) throw new Error('elite y boss suenan igual');
});

// Rediseño de identidad sonora (Tarea 3 — 2º rediseño): el daño del piloto debe
// leerse como ALARMA DE CASCO ROTO, no como click/golpe corto. Se valida el
// GESTO (propiedades estructurales), no números rígidos de síntesis, para no
// congelar futuras iteraciones de sonido.
t('playerHit: gesto largo multi-etapa en sfxPlayer, distinto de damage (game over)', () => {
  const hit = loadSynth(); hit.NV.initAudio(); tagChannels(hit.NV); hit.NV.sfx.playerHit();
  const dmg = loadSynth(); dmg.NV.initAudio(); dmg.NV.sfx.damage();
  const sig = (sb) => sb._freqs.map((x) => Math.round(x)).join(',');
  if (sig(hit.sb) === sig(dmg.sb)) throw new Error('playerHit igual a damage/game over');
  // Todo el gesto entra por el bus del jugador: ninguna capa se cuela en otro canal.
  if (!hit.sb._channels.length || hit.sb._channels.some((c) => c !== 'sfxPlayer')) throw new Error('canales del golpe = ' + hit.sb._channels);
  // Evento perceptiblemente largo: gesto completo entre 0.35 y 0.70s (ni click
  // corto ni drone de segundos). Los stops registran t0+dur de cada capa.
  const maxStop = Math.max.apply(null, hit.sb._stops);
  if (!(maxStop >= 0.35 && maxStop <= 0.70)) throw new Error('playerHit fuera de 0.35-0.70s: ' + hit.sb._stops);
  // Multi-etapa desacoplada: varias capas con stops escalonados, no un único
  // golpe simultáneo. Al menos 5 voces y al menos 3 instantes de fin distintos.
  if (hit.sb._stops.length < 5) throw new Error('playerHit sin capas suficientes: ' + hit.sb._stops);
  const uniqStops = Array.from(new Set(hit.sb._stops.map((s) => Math.round(s * 100)))).sort();
  if (uniqStops.length < 3) throw new Error('playerHit sin etapas escalonadas: ' + hit.sb._stops);
  // Ducking largo y propio (difiere del 0.22 corto anterior) para dar aire al gesto.
  if (!hit.sb._ramps.includes(0.14)) throw new Error('playerHit no usa su duck propio a 0.14');
  // Estructura temporal + técnicas del nuevo diseño (verificadas en fuente para
  // no congelar frecuencias exactas): etapas con delay, barrido de filtro en
  // el ruido, pulsos de alarma y contraste estéreo.
  const src = fs.readFileSync('js/audio/synth.js', 'utf8');
  for (const pat of ['noiseSweepAt', 'sweepAt', 'toneAt', 'filter.frequency.exponentialRampToValueAtTime', 'pan: -0.55', 'pan: 0.55', "duck('music', 0.14, 0.55)"]) {
    if (!src.includes(pat)) throw new Error('falta técnica del nuevo diseño: ' + pat);
  }
});

t('enemies.js conecta muerte por tipo y delega daño al pipeline único', () => {
  const src = fs.readFileSync('js/engine/enemies.js', 'utf8');
  if (!src.includes("sfx.enemyDeath(e.isElite ? 'elite' : 'normal',")) throw new Error('killEnemy no usa enemyDeath por tipo');
  if (!src.includes('applyPlayerDamage(baseDmg') || !src.includes("cause: 'contact'")) throw new Error('updateEnemies no delega daño de contacto');
});

t('bullets delega proyectiles y combat.js conecta playerHit solo si no es fatal', () => {
  const bullets = fs.readFileSync('js/engine/bullets.js', 'utf8');
  const combat = fs.readFileSync('js/engine/combat.js', 'utf8');
  if (!bullets.includes('applyPlayerDamage(b.damage') || !bullets.includes("cause: 'projectile'")) throw new Error('updateBullets no delega proyectiles');
  if (!combat.includes('st.sfx.playerHit') || !combat.includes('!result.killed')) throw new Error('pipeline no conecta playerHit no fatal');
});

t('boss.js conecta muerte de jefe a enemyDeath("boss")', () => {
  const src = fs.readFileSync('js/engine/boss.js', 'utf8');
  if (!src.includes("st.sfx.enemyDeath('boss',")) throw new Error('muerte de jefe no usa enemyDeath boss');
});

t('game.js maneja heartbeat crítico con timer y reset al recuperarse', () => {
  const src = fs.readFileSync('js/game.js', 'utf8');
  for (const pat of ['heartbeatTimer', 'heartbeatWasCritical', 'hpRatio <= 0.3', 'sfx.heartbeat', 'heartbeatTimer = 0']) {
    if (!src.includes(pat)) throw new Error('falta ' + pat);
  }
});

console.log('RESULT audio_combat_sfx: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);