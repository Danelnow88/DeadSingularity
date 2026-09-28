// Tests del BACKEND de audio por categoría (Ajustes de audio - Parte A).
// Verifica el contrato real entre js/core/settings.js (esquema + persistencia) y
// js/audio/synth.js (mixer): defaults, migración, round-trip, reset, master vs
// mute, independencia entre categorías, separación Armas/Jugador, fallback de
// armas y lifecycle del ducking. No cubre UI (fuera de esta tarea).
const fs = require('fs'), vm = require('vm');
let pass = 0, fail = 0;
function t(desc, fn) { try { fn(); pass++; console.log('  ok  ' + desc); } catch (e) { fail++; console.log('  FAIL ' + desc + ' -> ' + e.message); } }

const settingsSrc = fs.readFileSync('js/core/settings.js', 'utf8');
const synthSrc = fs.readFileSync('js/audio/synth.js', 'utf8');
const weaponSrc = fs.readFileSync('js/audio/weaponSfx.js', 'utf8');

const CATEGORY_KEYS = ['masterVolume', 'musicVolume', 'weaponsVolume', 'uiVolume', 'playerVolume', 'enemiesVolume', 'ambientVolume'];

function makeSandbox(initial) {
  const store = {};
  if (initial) store.neonVoidSettings = JSON.stringify(initial);
  const setValues = [];
  const gainApi = () => ({
    value: 0,
    setValueAtTime(v) { setValues.push(v); },
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
    cancelScheduledValues() {},
  });
  const ctx = {
    createOscillator: () => ({ connect(){}, start(){}, stop(){}, type:'', frequency: gainApi() }),
    createGain: () => ({ connect(){}, gain: gainApi() }),
    createBiquadFilter: () => ({ connect(){}, type:'', Q:{value:0}, frequency: gainApi() }),
    createBuffer: () => ({ getChannelData: () => new Float32Array(64) }),
    createBufferSource: () => ({ connect(){}, start(){}, stop(){}, buffer:null, playbackRate:{ setValueAtTime(){} } }),
    createStereoPanner: () => ({ connect(){}, pan:{ setValueAtTime(){} } }),
    destination: {}, currentTime: 0, sampleRate: 44100, state: 'suspended', resume: () => Promise.resolve(),
  };
  const mathMock = Object.create(Math);
  mathMock.random = () => 0.5;
  const sb = {
    console, Math: mathMock, Object, Array, Number, String, Boolean, JSON, Proxy, Reflect, Float32Array,
    window: {}, globalThis: {}, AudioContext: function () { return ctx; },
    localStorage: {
      getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem(k, v) { store[k] = String(v); },
      removeItem(k) { delete store[k]; },
    },
  };
  sb.window.AudioContext = sb.AudioContext;
  sb.window.NV = { getBoss: () => null, getState: () => 'playing', getFrame: () => 1 };
  // weaponSfx.js resuelve NV como global (no vía window), igual que en el browser.
  sb.NV = sb.window.NV;
  sb._store = store; sb._setValues = setValues; sb._ctx = ctx;
  sb._context = vm.createContext(sb);
  return sb;
}

// Carga settings.js + synth.js en el MISMO contexto (orden de index.html).
function load(initial) {
  const sb = makeSandbox(initial);
  vm.runInContext(settingsSrc, sb._context, { filename: 'settings.js' });
  vm.runInContext(synthSrc, sb._context, { filename: 'synth.js' });
  return sb;
}
function baseGain(NV, ch) { return NV.mixerChannels[ch] * NV.masterVolume[ch]; }
function captureRamps(param) {
  const out = [];
  param.linearRampToValueAtTime = function (v, t) { out.push({ v: v, t: t }); };
  return out;
}

// ---- esquema persistente ----
t('esquema: 7 categorías independientes con defaults seguros', () => {
  const NV = load().window.NV;
  const a = NV.settings.audio;
  for (const k of CATEGORY_KEYS) {
    if (a[k] !== 1) throw new Error(k + ' default != 1: ' + a[k]);
    if (!(k in NV.settingsDefaults.audio)) throw new Error(k + ' ausente en defaults');
  }
  if (a.sfxVolume !== 1) throw new Error('agregado SFX heredado default != 1');
  // El contrato canal -> clave debe cubrir todos los buses del mixer.
  const map = NV.audioChannelSettings;
  for (const ch in NV.mixerChannels) {
    if (!map[ch]) throw new Error('bus sin categoría asociada: ' + ch);
    if (CATEGORY_KEYS.indexOf(map[ch]) < 0) throw new Error('categoría desconocida para ' + ch + ': ' + map[ch]);
  }
  for (const key of ['musicVolume', 'weaponsVolume', 'uiVolume', 'playerVolume', 'enemiesVolume', 'ambientVolume']) {
    if (!Object.keys(map).some((ch) => map[ch] === key)) throw new Error('categoría sin bus: ' + key);
  }
});

// ---- migración ----
t('migración: un setting previo con sfxVolume siembra las categorías de efectos', () => {
  const sb = load({ audio: { sfxVolume: 0.4 }, graphics: { quality: 'performance', particles: false }, controls: { firePolicy: 'legacy-auto' }, gameplay: { difficulty: 'hard' } });
  const NV = sb.window.NV, a = NV.settings.audio;
  if (a.masterVolume !== 1 || a.musicVolume !== 1) throw new Error('la migración alteró master/música: ' + JSON.stringify(a));
  for (const k of ['weaponsVolume', 'uiVolume', 'playerVolume', 'enemiesVolume', 'ambientVolume']) {
    if (a[k] !== 0.4) throw new Error('categoría ' + k + ' no heredó el SFX previo: ' + a[k]);
  }
  if (a.sfxVolume !== 0.4) throw new Error('agregado SFX heredado perdido');
  // El resto de preferencias no se toca.
  const g = NV.settings.graphics;
  if (g.quality !== 'performance' || g.particles !== false) throw new Error('gráficos perdidos en la migración');
  if (NV.settings.controls.firePolicy !== 'legacy-auto') throw new Error('controles perdidos en la migración');
  if (NV.settings.gameplay.difficulty !== 'hard') throw new Error('gameplay perdido en la migración');
});

t('migración: el mixer arranca con los valores heredados, no con defaults', () => {
  const NV = load({ audio: { sfxVolume: 0.5 } }).window.NV;
  NV.initAudio();
  const expect = { sfxUI: 0.7, sfxPlayer: 0.9, sfxEnemies: 0.8, sfxAmbient: 0.6, weapons: 0.9 };
  for (const ch in expect) {
    if (Math.abs(NV.mixer[ch].gain.value - expect[ch] * 0.5) > 1e-9) throw new Error(ch + ' no heredó: ' + NV.mixer[ch].gain.value);
  }
  if (Math.abs(NV.mixer.music.gain.value - 0.6) > 1e-9) throw new Error('música no quedó en default: ' + NV.mixer.music.gain.value);
});

t('migración: settings parciales mezclan categoría explícita con SFX heredado', () => {
  const NV = load({ audio: { sfxVolume: 0.5, uiVolume: 0.2 } }).window.NV;
  NV.initAudio();
  if (Math.abs(NV.mixer.sfxUI.gain.value - 0.7 * 0.2) > 1e-9) throw new Error('uiVolume explícito ignorado: ' + NV.mixer.sfxUI.gain.value);
  if (Math.abs(NV.mixer.sfxPlayer.gain.value - 0.9 * 0.5) > 1e-9) throw new Error('sfxPlayer no heredó: ' + NV.mixer.sfxPlayer.gain.value);
});

// ---- persistencia y reset ----
t('persistencia: round-trip de todas las categorías', () => {
  const first = load(); const NV = first.window.NV;
  const want = { masterVolume: 0.8, musicVolume: 0.35, weaponsVolume: 0.6, uiVolume: 0.4, playerVolume: 0.9, enemiesVolume: 0.2, ambientVolume: 0.5 };
  NV.setMasterVolume(want.masterVolume); NV.setMusicVolume(want.musicVolume); NV.setWeaponsVolume(want.weaponsVolume);
  NV.setUiVolume(want.uiVolume); NV.setPlayerVolume(want.playerVolume); NV.setEnemiesVolume(want.enemiesVolume);
  NV.setAmbientVolume(want.ambientVolume);
  const saved = JSON.parse(first._store.neonVoidSettings);
  const a = load(saved).window.NV.settings.audio;
  for (const k of CATEGORY_KEYS) {
    if (a[k] !== want[k]) throw new Error(k + ' no sobrevivió a la recarga: ' + a[k]);
  }
});

t('reset: devuelve categorías y agregado a defaults', () => {
  const NV = load().window.NV;
  NV.setMasterVolume(0.2); NV.setUiVolume(0); NV.setSfxVolume(0.3); NV.setWeaponsVolume(0.1);
  NV.resetSettings();
  const a = NV.settings.audio;
  for (const k of CATEGORY_KEYS) {
    if (a[k] !== 1) throw new Error(k + ' no volvió a default: ' + a[k]);
  }
  if (a.sfxVolume !== 1) throw new Error('agregado SFX no volvió a default');
});

t('normalización: claves y valores inválidos no rompen el rango', () => {
  const NV = load().window.NV;
  if (NV.setAudioVolume('inexistente', 0.5) !== false) throw new Error('aceptó una clave desconocida');
  if (NV.setMasterVolume(4) !== 1 || NV.setMasterVolume(-3) !== 0) throw new Error('clamp de master incorrecto');
  if (NV.setMusicVolume('alto') !== 1) throw new Error('valor no numérico no cayó al default');
  const a = load({ audio: { masterVolume: null, uiVolume: 'x', ambientVolume: 5 } }).window.NV.settings.audio;
  if (a.masterVolume !== 1 || a.uiVolume !== 1 || a.ambientVolume !== 1) throw new Error('entrada inválida mal normalizada: ' + JSON.stringify(a));
});

// ---- aplicación ----
t('aplicación: los settings se aplican aunque el mixer se cree después', () => {
  const NV = load().window.NV;
  NV.setMusicVolume(0.5); NV.setUiVolume(0.25); NV.setMasterVolume(0.75);
  if (NV.mixer) throw new Error('el mixer existe antes de initAudio()');
  NV.initAudio();
  if (Math.abs(NV.mixer.music.gain.value - 0.6 * 0.5) > 1e-9) throw new Error('música no aplicada: ' + NV.mixer.music.gain.value);
  if (Math.abs(NV.mixer.sfxUI.gain.value - 0.7 * 0.25) > 1e-9) throw new Error('ui no aplicada: ' + NV.mixer.sfxUI.gain.value);
  if (Math.abs(NV.audioMasterGain.gain.value - 0.75) > 1e-9) throw new Error('master no aplicado: ' + NV.audioMasterGain.gain.value);
});

t('aplicación: cambiar una categoría en ejecución actúa sobre su bus', () => {
  const NV = load().window.NV; NV.initAudio();
  NV.setEnemiesVolume(0.5);
  if (Math.abs(NV.mixer.sfxEnemies.gain.value - 0.8 * 0.5) > 1e-9) throw new Error('sfxEnemies no se actualizó: ' + NV.mixer.sfxEnemies.gain.value);
  NV.setMusicVolume(0);
  if (NV.mixer.music.gain.value !== 0) throw new Error('música no llegó a 0');
  NV.setAmbientVolume(0.5);
  if (Math.abs(NV.mixer.sfxAmbient.gain.value - 0.6 * 0.5) > 1e-9) throw new Error('sfxAmbient no se actualizó');
});

t('aplicación: settings.js cargado DESPUÉS de synth.js también se aplica', () => {
  const sb = makeSandbox({ audio: { masterVolume: 0.5, uiVolume: 0.25, musicVolume: 0.4 } });
  vm.runInContext(synthSrc, sb._context, { filename: 'synth.js' });
  vm.runInContext(settingsSrc, sb._context, { filename: 'settings.js' });
  const NV = sb.window.NV;
  NV.initAudio();
  if (Math.abs(NV.mixer.sfxUI.gain.value - 0.7 * 0.25) > 1e-9) throw new Error('ui no aplicada: ' + NV.mixer.sfxUI.gain.value);
  if (Math.abs(NV.mixer.music.gain.value - 0.6 * 0.4) > 1e-9) throw new Error('música no aplicada: ' + NV.mixer.music.gain.value);
  if (Math.abs(NV.audioMasterGain.gain.value - 0.5) > 1e-9) throw new Error('master no aplicado: ' + NV.audioMasterGain.gain.value);
});
// ---- master vs mute ----
t('master y mute: desmutear restaura masterVolume (no 1) y el mute no se persiste', () => {
  const sb = load(); const NV = sb.window.NV; NV.initAudio();
  const targets = [];
  NV.audioMasterGain.gain.linearRampToValueAtTime = function (v) { targets.push(v); };
  NV.setMasterVolume(0.4);
  if (NV.audioMasterGain.gain.value !== 0.4) throw new Error('master no aplicado con sonido activo: ' + NV.audioMasterGain.gain.value);
  NV.setSoundEnabled(false);
  if (NV.soundOn || targets[targets.length - 1] !== 0) throw new Error('el mute no silenció la salida');
  if (NV.settings.audio.masterVolume !== 0.4) throw new Error('el mute alteró la preferencia de master');
  NV.setSoundEnabled(true);
  if (!NV.soundOn || targets[targets.length - 1] !== 0.4) throw new Error('unmute no restauró masterVolume: ' + targets[targets.length - 1]);
  const saved = JSON.parse(sb._store.neonVoidSettings);
  for (const key of ['enabled', 'muted', 'soundOn']) {
    if (key in saved.audio) throw new Error('el mute no debe persistirse (' + key + ')');
  }
});

t('mute: no destruye los volúmenes de categoría', () => {
  const NV = load().window.NV; NV.initAudio();
  NV.setUiVolume(0.3); NV.setMusicVolume(0.2); NV.setWeaponsVolume(0.6);
  const before = { ui: NV.mixer.sfxUI.gain.value, music: NV.mixer.music.gain.value, weapons: NV.mixer.weapons.gain.value, master: NV.audioMasterGain.gain.value };
  NV.setSoundEnabled(false); NV.setSoundEnabled(true);
  if (NV.mixer.sfxUI.gain.value !== before.ui || NV.mixer.music.gain.value !== before.music || NV.mixer.weapons.gain.value !== before.weapons) {
    throw new Error('el mute alteró volúmenes de categoría');
  }
  if (NV.audioMasterGain.gain.value !== before.master) throw new Error('el mute alteró el master');
});

// ---- independencia entre categorías ----
t('independencia: mover una categoría no altera ninguna otra', () => {
  const NV = load().window.NV; NV.initAudio();
  const channels = ['sfxUI', 'sfxPlayer', 'sfxEnemies', 'sfxAmbient', 'weapons', 'music'];
  const snapshot = () => { const o = { master: NV.audioMasterGain.gain.value }; for (const ch of channels) o[ch] = NV.mixer[ch].gain.value; return o; };
  const movers = [
    ['setMusicVolume', 'music'], ['setWeaponsVolume', 'weapons'], ['setUiVolume', 'sfxUI'],
    ['setPlayerVolume', 'sfxPlayer'], ['setEnemiesVolume', 'sfxEnemies'], ['setAmbientVolume', 'sfxAmbient'],
  ];
  for (const [setter, channel] of movers) {
    const before = snapshot();
    NV[setter](0.3);
    const after = snapshot();
    if (Math.abs(after[channel] - baseGain(NV, channel)) > 1e-9) throw new Error(setter + ' no se aplicó a ' + channel);
    for (const other in after) {
      if (other === channel) continue;
      if (Math.abs(after[other] - before[other]) > 1e-9) throw new Error(setter + ' alteró ' + other + ' (' + before[other] + ' -> ' + after[other] + ')');
    }
    NV[setter](1);
  }
  // El master también es independiente de las categorías.
  const beforeMaster = snapshot();
  NV.setMasterVolume(0.5);
  const afterMaster = snapshot();
  for (const ch of channels) {
    if (Math.abs(afterMaster[ch] - beforeMaster[ch]) > 1e-9) throw new Error('masterVolume alteró ' + ch);
  }
});

t('el agregado SFX heredado escala exactamente los mismos buses que antes', () => {
  const NV = load().window.NV; NV.initAudio();
  const legacyBuses = { sfxUI: 0.7, sfxPlayer: 0.9, sfxEnemies: 0.8, sfxAmbient: 0.6, weapons: 0.9 };
  NV.setSfxVolume(0.4);
  for (const ch in legacyBuses) {
    if (Math.abs(NV.mixer[ch].gain.value - legacyBuses[ch] * 0.4) > 1e-9) throw new Error(ch + ' no escaló con el agregado: ' + NV.mixer[ch].gain.value);
  }
  if (Math.abs(NV.mixer.music.gain.value - 0.6) > 1e-9) throw new Error('el agregado SFX alteró la música');
  // Y deja las categorías coherentes para cuando la UI migre a ellas.
  for (const ch in legacyBuses) {
    if (NV.settings.audio[NV.audioChannelSettings[ch]] !== 0.4) throw new Error('categoría no reflejada por el agregado: ' + ch);
  }
});

// ---- separación armas / jugador ----
// Las armas disponen de su propio bus del mixer (`weapons`) y NO viajan dentro de
// sfxPlayer: mover playerVolume no toca armas, y mover weaponsVolume no toca sfxPlayer.
t('armas: el bus weapons es independiente de sfxPlayer', () => {
  const NV = load().window.NV; NV.initAudio();
  if (!NV.mixer.weapons) throw new Error('falta el bus weapons');
  const playerBase = NV.mixer.sfxPlayer.gain.value;
  const weaponsBase = NV.mixer.weapons.gain.value;
  NV.setPlayerVolume(0.2);
  if (Math.abs(NV.mixer.weapons.gain.value - weaponsBase) > 1e-9) throw new Error('setPlayerVolume alteró las armas');
  NV.setPlayerVolume(1);
  if (Math.abs(NV.mixer.sfxPlayer.gain.value - playerBase) > 1e-9) throw new Error('sfxPlayer no se restauró tras setPlayerVolume');
  NV.setWeaponsVolume(0.1);
  if (Math.abs(NV.mixer.sfxPlayer.gain.value - playerBase) > 1e-9) throw new Error('setWeaponsVolume alteró sfxPlayer');
  if (NV.mixerChannels.weapons !== NV.mixerChannels.sfxPlayer) throw new Error('el bus weapons alteró la mezcla relativa legacy');
});

t('armas: el submix real sale por el bus weapons y conserva su techo interno', () => {
  const sb = load(); const NV = sb.window.NV; NV.initAudio();
  vm.runInContext(weaponSrc, sb._context, { filename: 'weaponSfx.js' });
  NV.getWeaponBus();
  if (!NV.weaponBus) throw new Error('el submix de armas falta');
  if (NV.weaponBus.parent !== NV.mixer.weapons) throw new Error('las armas no salen por el bus weapons');
  if (NV.weaponBus.parent === NV.mixer.sfxPlayer) throw new Error('las armas siguen colgando de sfxPlayer');
  if (NV.WEAPON_MASTER !== 0.06) throw new Error('el techo interno de armas cambió: ' + NV.WEAPON_MASTER);
  if (!sb._setValues.includes(0.06)) throw new Error('el ceiling del submix no usó WEAPON_MASTER');
  NV.setWeaponsVolume(0.4);
  if (NV.getWeaponBus() !== NV.weaponBus.input) throw new Error('el cambio de volumen recreó el submix de armas');
  if (NV.WEAPON_MASTER !== 0.06) throw new Error('weaponsVolume alteró el techo interno de armas');
});

t('armas: el fallback sintetizado entra por el bus weapons', () => {
  const sb = load(); const NV = sb.window.NV; NV.initAudio();
  for (const k in NV.mixer) { if (NV.mixer[k]) NV.mixer[k]._channel = k; }
  const reached = [];
  const origCreateGain = sb._ctx.createGain;
  sb._ctx.createGain = function () {
    const g = origCreateGain.call(sb._ctx);
    const origConnect = g.connect;
    g.connect = function (target) { if (target && target._channel) reached.push(target._channel); return origConnect.call(g, target); };
    return g;
  };
  NV.playWeaponSound({ id: 'pistol' });
  if (!reached.length) throw new Error('el fallback no entró por ningún bus: ' + reached);
  if (reached.some((c) => c === 'sfxPlayer')) throw new Error('el fallback sigue entrando por sfxPlayer: ' + reached);
  if (!reached.includes('weapons')) throw new Error('el fallback no usó el bus weapons: ' + reached);
});

t('armas: el fallback respeta un channel explícito del caller', () => {
  const sb = load(); const NV = sb.window.NV; NV.initAudio();
  for (const k in NV.mixer) { if (NV.mixer[k]) NV.mixer[k]._channel = k; }
  const reached = [];
  const origCreateGain = sb._ctx.createGain;
  sb._ctx.createGain = function () {
    const g = origCreateGain.call(sb._ctx);
    const origConnect = g.connect;
    g.connect = function (target) { if (target && target._channel) reached.push(target._channel); return origConnect.call(g, target); };
    return g;
  };
  NV.playWeaponSound({ id: 'pistol' }, { channel: 'sfxPlayer' });
  if (!reached.includes('sfxPlayer')) throw new Error('se ignoró el channel explícito: ' + reached);
});

// ---- lifecycle del ducking ----
// La bajada Y la restauración se programan en la automatización del AudioParam, así
// que no dependen de updateMusic (que no corre en wave_end / player_dying / gameover).
t('ducking: la restauración es autónoma y no depende de updateMusic', () => {
  const NV = load().window.NV; NV.initAudio();
  const ramps = captureRamps(NV.mixer.music.gain);
  NV.duck('music', 0.2, 0.18);
  if (ramps.length < 2) throw new Error('el duck no programó la restauración');
  if (ramps[0].v !== 0.2) throw new Error('el duck no bajó al nivel pedido');
  const back = ramps[ramps.length - 1];
  if (Math.abs(back.v - 0.6) > 1e-9) throw new Error('la restauración no vuelve al nivel base: ' + back.v);
  if (!(back.t >= 0.18)) throw new Error('la restauración vuela antes del hold');
  ramps.length = 0;
  NV.updateMusic(0.02); NV.updateMusic(0.02);
  if (ramps.length) throw new Error('updateMusic intervino en la música: ' + ramps.length);
});

t('ducking: la restauración vuelve al volumen de la categoría vigente', () => {
  const NV = load().window.NV; NV.initAudio();
  NV.setMusicVolume(0.5);
  const ramps = captureRamps(NV.mixer.music.gain);
  NV.duck('music', 0.1, 0.2);
  const back = ramps[ramps.length - 1];
  if (Math.abs(back.v - 0.6 * 0.5) > 1e-9) throw new Error('la restauración ignoró musicVolume: ' + back.v);
});

t('ducking: cambiar el volumen de la categoría cancela el duck pendiente', () => {
  const NV = load().window.NV; NV.initAudio();
  const g = NV.mixer.music.gain;
  const cancels = [];
  g.cancelScheduledValues = function () { cancels.push(1); };
  NV.duck('music', 0.05, 5);
  const afterDuck = cancels.length;
  NV.setMusicVolume(0.5);
  if (cancels.length <= afterDuck) throw new Error('el cambio de volumen no canceló el duck pendiente');
  if (Math.abs(g.value - 0.6 * 0.5) > 1e-9) throw new Error('la categoría no mandó sobre el duck: ' + g.value);
});

t('ducking: seguro sin mixer inicializado (headless)', () => {
  const NV = load().window.NV;
  if (NV.mixer) throw new Error('el mixer no debería existir todavía');
  NV.duck('music', 0.2, 0.1); // no debe lanzar
});

console.log('RESULT audio_category_volumes: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);
