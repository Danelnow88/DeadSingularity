// ===== AUDIO SYNTHWAVE + SFX =====
// Estado mutable en NV (soundOn/audioCtx/musicState/musicTime) y getters de game.js
// (getFrame/getBoss/getState) para valores que solo lee. Se carga ANTES de game.js.
(() => {
  'use strict';
  const NV = window.NV;

    NV.soundOn = true;
  NV.audioCtx = null;
  NV.musicState = {
    step: 0,
    lastBeat: 0,
    intensity: 0,
    combo: 0,        // kills sin morir → capas musicales de intensidad (Tarea 1 - audio adaptativo)
    phase: 'normal', // 'normal' | 'boss' | 'shop' | 'menu' (manejado por game.js)
  };
  NV.musicTime = 0;

  // Progresión de acordes y bajo (estilo Karl Casey dark synthwave)
  const CHORD_ROOTS = [65.41, 87.31, 110.00, 146.83]; // C2 - F2 - G2 - C3
  const BASS_LINE = [65.41, 87.31, 65.41, 146.83];    // C - F - C - G (bajo)
  const LEAD_SEQ = [329.63, 440.00, 493.88, 587.33, 659.26, 587.33, 493.88, 440.00];
  const DRUM_PATTERN = [
    [1,0,1,0, 1,0,0,0, 1,0,1,0, 1,0,0,0], // Kick (16 steps)
    [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], // Snare
    [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1], // Hi-hat
  ];

  // === Identidad sonora de jefe (Tarea 3) ===
  // Capa musical distinta y más oscura/tensa: raíces una octava abajo, progresión
  // más disonante y percusión más densa (más presión rítmica en pelea de jefe).
  const BOSS_CHORD_ROOTS = [49.00, 55.00, 61.74, 73.42]; // G1 - A1 - B1 - D2 (grave y tenso)
  const BOSS_BASS_LINE = [49.00, 61.74, 55.00, 73.42];
  const BOSS_LEAD_SEQ = [220.00, 246.94, 261.63, 293.66, 329.63, 293.66, 261.63, 246.94];
  const BOSS_DRUM_PATTERN = [
    [1,0,1,0, 1,1,0,0, 1,0,1,0, 1,1,0,0], // Kick más denso (doble golpe en el 2do compás)
    [0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,0,1], // Snare con contratiempo extra
    [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1], // Hi-hat (mismo pulso)
  ];
  // Lookup de capas por fase. 'shop'/'menu' caen a 'normal' hasta que se les
  // asigne identidad propia (Tarea 5 - ambiente de menú).
  const MENU_CHORD_ROOTS = [82.41, 98.00, 123.47, 164.81]; // E2 - G2 - B2 - E3
  const MENU_BASS_LINE = [82.41, 0, 98.00, 0];
  const MENU_LEAD_SEQ = [329.63, 392.00, 493.88, 587.33, 493.88, 392.00, 329.63, 246.94];
  const MENU_DRUM_PATTERN = [
    [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
  ];
  const MUSIC_LAYERS = {
    normal: { chordRoots: CHORD_ROOTS, bass: BASS_LINE, lead: LEAD_SEQ, drums: DRUM_PATTERN },
    boss: { chordRoots: BOSS_CHORD_ROOTS, bass: BOSS_BASS_LINE, lead: BOSS_LEAD_SEQ, drums: BOSS_DRUM_PATTERN },
    menu: { chordRoots: MENU_CHORD_ROOTS, bass: MENU_BASS_LINE, lead: MENU_LEAD_SEQ, drums: MENU_DRUM_PATTERN },
    shop: { chordRoots: MENU_CHORD_ROOTS, bass: MENU_BASS_LINE, lead: MENU_LEAD_SEQ, drums: MENU_DRUM_PATTERN },
  };
  function currentLayers() { return MUSIC_LAYERS[NV.musicState.phase] || MUSIC_LAYERS.normal; }

  function initMusic() {
    if (!NV.audioCtx) NV.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  // === MEZCLADOR DE CANALES (Tarea 1) ===
  // Canales con GainNode propios sobre destination: permite ducking, volúmenes
  // relativos y prioridad. Se crea de forma perezosa dentro de initAudio() para
  // no romper los tests headless (audioCtx es null hasta COMENZAR).
  //  - music:        música base / capas musicales
  //  - sfxUI:        UI, tienda, pickups, wheel, level-up
  //  - sfxPlayer:    recibir daño, heartbeat, muerte, victoria, consumibles
  //  - sfxEnemies:   muerte de enemigos, ataques de jefe
  //  - sfxAmbient:   eventos de oleada, cofres, combos, explosiones auxiliares
  //  - weapons:      salida propia del submix de armas (weaponSfx.js). Estar fuera
  //                  de sfxPlayer es lo que hace independientes weaponsVolume y
  //                  playerVolume; conserva la mezcla relativa previa (0.9).
  const CHANNELS = { music:0.6, sfxUI:0.7, sfxPlayer:0.9, sfxEnemies:0.8, sfxAmbient:0.6, weapons:0.9 };
  // Volumen de categoría (0..1) por canal: es lo que gobiernan los ajustes de audio.
  const MASTER_VOLUME = { music:1, sfxUI:1, sfxPlayer:1, sfxEnemies:1, sfxAmbient:1, weapons:1 };
  // Mapa canal del mixer -> clave persistida en NV.settings.audio. Es el contrato
  // entre el backend de ajustes y el routing real.
  const AUDIO_CHANNEL_SETTINGS = {
    music: 'musicVolume',
    weapons: 'weaponsVolume',
    sfxUI: 'uiVolume',
    sfxPlayer: 'playerVolume',
    sfxEnemies: 'enemiesVolume',
    sfxAmbient: 'ambientVolume',
  };
  // Buses que gobierna el agregado SFX heredado (sfxVolume) para que el control
  // actual de la UI siga afectando exactamente lo mismo que antes (las armas
  // viajaban dentro de sfxPlayer, por eso se incluyen).
  const LEGACY_SFX_CHANNELS = ['sfxUI', 'sfxPlayer', 'sfxEnemies', 'sfxAmbient', 'weapons'];
  let masterGain = null;
  // Salida principal (0..1). El mute es INDEPENDIENTE: la salida efectiva es
  // masterOutputVolume con sonido activo y 0 al mutear, así desmutear restaura
  // el volumen general elegido y no fuerza 1.
  let masterOutputVolume = 1;
  // Duración de los tramos de la automatización de duck.
  const DUCK_RAMP_IN = 0.01;
  const DUCK_RAMP_OUT = 0.12;

  // Ganancia base real de un canal: mezcla deliberada del mixer × volumen de la
  // categoría. La relación interna entre buses (0.6/0.7/0.9/0.8/0.6/0.9) se
  // conserva intacta; lo que cambia por categoría es solo el factor de volumen.
  function channelBaseGain(name) {
    return MASTER_VOLUME[name] * CHANNELS[name];
  }

  function settingsAudio() {
    return (NV.settings && NV.settings.audio) ? NV.settings.audio : null;
  }

  // Normaliza un volumen a [0,1] con fallback (mismo criterio que core/settings.js).
  function readVolume(value, fallback) {
    if (typeof value === 'number') return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
    if (typeof value === 'string' && value.trim() !== '') {
      const n = Number(value);
      if (Number.isFinite(n)) return Math.max(0, Math.min(1, n));
    }
    return fallback;
  }

  // Crea y expone el mixer. Llamado por initAudio(); si audioCtx ya no existe
  // (modo headless/test) simplemente no hace nada → fallback a destination directo.
  // Materializa el ESTADO ACTUAL del mixer (MASTER_VOLUME + masterOutputVolume),
  // que ya viene sembrado desde las preferencias persistidas. Por eso funciona
  // igual si los settings se cargaron antes o después de inicializar Web Audio.
  function createMixer() {
    if (!NV.audioCtx) return;
    if (NV.mixer && masterGain) return;
    const ctx = NV.audioCtx;
    const mixer = {};
    masterGain = ctx.createGain();
    masterGain.gain.value = NV.soundOn ? masterOutputVolume : 0;
    masterGain.connect(ctx.destination);
    for (const ch in CHANNELS) {
      const g = ctx.createGain();
      g.gain.value = channelBaseGain(ch);
      g.connect(masterGain);
      mixer[ch] = g;
    }
    NV.mixer = mixer;
    NV.audioMasterGain = masterGain;
  }

  // Enruta un GainNode a su canal; si no hay mixer (headless), cae a destination.
  function channelFor(name) {
    return (NV.mixer && NV.mixer[name]) || NV.audioCtx.destination;
  }

  function panForX(x, worldWidth) {
    if (typeof x !== 'number') return 0;
    const w = worldWidth || 900;
    return Math.max(-1, Math.min(1, (x / w) * 2 - 1));
  }

  function connectOutput(node, channel, opts) {
    opts = opts || {};
    const target = (channel && channelFor(channel)) || channelFor('sfxPlayer');
    if (NV.audioCtx && typeof NV.audioCtx.createStereoPanner === 'function' && (typeof opts.pan === 'number' || typeof opts.x === 'number')) {
      const pan = NV.audioCtx.createStereoPanner();
      pan.pan.setValueAtTime(typeof opts.pan === 'number' ? opts.pan : panForX(opts.x, opts.worldWidth), NV.audioCtx.currentTime);
      node.connect(pan); pan.connect(target);
    } else {
      node.connect(target);
    }
  }

  // Fija el volumen de UNA categoría (0..1) en su bus real. Si el mixer todavía no
  // existe, solo actualiza el estado interno: createMixer() lo materializará.
  function setChannelVolume(name, value) {
    if (!Object.prototype.hasOwnProperty.call(MASTER_VOLUME, name)) return;
    const level = readVolume(value, MASTER_VOLUME[name]);
    MASTER_VOLUME[name] = level;
    const g = NV.mixer && NV.mixer[name];
    if (!g) return level;
    const base = channelBaseGain(name);
    // Cancelar la automatización pendiente: si había un duck en curso, el volumen
    // de la categoría manda sobre su restauración programada.
    if (NV.audioCtx && typeof g.gain.cancelScheduledValues === 'function') {
      const now = NV.audioCtx.currentTime;
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(base, now);
    }
    g.gain.value = base;
    return level;
  }

  // Volumen general (salida principal). Independiente del mute: aplicarlo NO altera
  // NV.soundOn y desmutear restaura este valor en lugar de forzar 1.
  function applyMasterVolume(value) {
    masterOutputVolume = readVolume(value, 1);
    if (masterGain && NV.audioCtx) {
      const gain = masterGain.gain;
      const now = NV.audioCtx.currentTime;
      const target = NV.soundOn ? masterOutputVolume : 0;
      if (typeof gain.cancelScheduledValues === 'function') gain.cancelScheduledValues(now);
      gain.setValueAtTime(target, now);
      gain.value = target;
    }
    return masterOutputVolume;
  }

  // Aplica al mixer un objeto de preferencias de audio (NV.settings.audio).
  // Idempotente y seguro antes o después de inicializar Web Audio. Si una categoría
  // no existe (settings previos o synth cargado sin settings.js), los buses de
  // efectos heredan `sfxVolume` para no alterar la mezcla anterior.
  function applyAudioSettings(audio) {
    const src = audio || settingsAudio() || {};
    const legacySfx = readVolume(src.sfxVolume, 1);
    applyMasterVolume(src.masterVolume);
    for (const ch in AUDIO_CHANNEL_SETTINGS) {
      const key = AUDIO_CHANNEL_SETTINGS[ch];
      const fallback = key === 'musicVolume' ? 1 : legacySfx;
      setChannelVolume(ch, readVolume(src[key], fallback));
    }
    return src;
  }

  // Agregado SFX heredado (sfxVolume): mantiene el comportamiento del único control
  // que la UI expone hoy. Escala todos los buses de efectos, armas incluidas.
  function applySfxVolume(value) {
    const level = readVolume(value, 1);
    for (const name of LEGACY_SFX_CHANNELS) setChannelVolume(name, level);
    return level;
  }

  function setSoundEnabled(enabled) {
    NV.soundOn = !!enabled;
    if (masterGain && NV.audioCtx) {
      const t = NV.audioCtx.currentTime;
      const target = NV.soundOn ? masterOutputVolume : 0;
      masterGain.gain.cancelScheduledValues(t);
      masterGain.gain.setValueAtTime(masterGain.gain.value, t);
      masterGain.gain.linearRampToValueAtTime(target, t + 0.025);
    }
    if (!NV.soundOn && NV.audio && typeof NV.audio.stopAllWeapons === 'function') NV.audio.stopAllWeapons();
    if (typeof NV.syncSoundUI === 'function') NV.syncSoundUI();
    return NV.soundOn;
  }

  // Ducking temporal: atenúa `byChannel` a `to` durante `secs` segundos de audioCtx.
  // La bajada Y la restauración se programan en la propia automatización del
  // AudioParam, así que se cumplen solas sin depender de ningún update por frame.
  // Antes la restauración vivía en restoreDucking(), invocado solo desde
  // updateMusic(): durante wave_end / player_dying / gameover ese update no corre y
  // la música quedaba atenuada mucho más de lo pedido (victoria duckea 0.8s y la
  // transición dura 2.1s+). La restauración siempre vuelve al volumen de la
  // categoría vigente, no a un valor capturado.
  function duck(byChannel, to, secs) {
    const g = NV.mixer && NV.mixer[byChannel];
    if (!g || !NV.audioCtx) return;
    const gain = g.gain;
    const now = NV.audioCtx.currentTime;
    const base = channelBaseGain(byChannel);
    const level = readVolume(to, base);
    const hold = Math.max(0, Number(secs) || 0.15);
    const until = now + hold;
    if (typeof gain.cancelScheduledValues === 'function') gain.cancelScheduledValues(now);
    gain.setValueAtTime(base, now);
    gain.linearRampToValueAtTime(level, now + DUCK_RAMP_IN);
    gain.setValueAtTime(level, until);
    gain.linearRampToValueAtTime(base, until + DUCK_RAMP_OUT);
  }

  function initAudio() {
    initMusic();
    createMixer(); // perezoso: solo cuando realmente hay contexto
    if (NV.audioCtx.state === 'suspended') NV.audioCtx.resume();
  }
  function createDrone(freq, time, dur) {
    if (!NV.audioCtx || !NV.soundOn) return;
    const osc = NV.audioCtx.createOscillator();
    const lfo = NV.audioCtx.createOscillator();
    const filter = NV.audioCtx.createBiquadFilter();
    const gain = NV.audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(5, time);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 2, time);
    gain.gain.setValueAtTime(0.01, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    lfo.connect(filter.frequency);
    osc.connect(filter); filter.connect(gain); gain.connect(channelFor('music'));
    lfo.start(time); osc.start(time);
    osc.stop(time + dur); lfo.stop(time + dur);
  }
  function scheduleNote(type, freq, dur, vol) {
    if (!NV.audioCtx || !NV.soundOn) return;
    const osc = NV.audioCtx.createOscillator();
    const filter = NV.audioCtx.createBiquadFilter();
    const gain = NV.audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, NV.audioCtx.currentTime);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, NV.audioCtx.currentTime);
    gain.gain.setValueAtTime(vol || 0.03, NV.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, NV.audioCtx.currentTime + dur);
    osc.connect(filter); filter.connect(gain); gain.connect(channelFor('music'));
    osc.start(); osc.stop(NV.audioCtx.currentTime + dur);
  }
  // opts?: { channel, freq } → banda y bus opcionales. Sin opts mantiene la banda
  // ambiental 200-400 Hz en `sfxAmbient` que usan todos los callers históricos
  // (armas, ataques de jefe, explosiones, combo). El rediseño del daño del piloto
  // necesita además un crack AGUDO entrando por `sfxPlayer`.
  function scheduleNoise(dur, vol, opts) {
    if (!NV.audioCtx || !NV.soundOn) return;
    opts = opts || {};
    const buffer = NV.audioCtx.createBuffer(1, NV.audioCtx.sampleRate * dur, NV.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    const src = NV.audioCtx.createBufferSource();
    const filter = NV.audioCtx.createBiquadFilter();
    const gain = NV.audioCtx.createGain();
    src.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(opts.freq || 200 + Math.random() * 200, NV.audioCtx.currentTime);
    gain.gain.setValueAtTime(vol || 0.04, NV.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, NV.audioCtx.currentTime + dur);
    src.connect(filter); filter.connect(gain); gain.connect(channelFor(opts.channel || 'sfxAmbient'));
    src.start(); src.stop(NV.audioCtx.currentTime + dur);
  }
  function scheduleDrum(type, dur, vol) {
    if (!NV.audioCtx || !NV.soundOn) return;
    if (type === 'noise') { scheduleNoise(dur, vol); return; }
    const osc = NV.audioCtx.createOscillator();
    const filter = NV.audioCtx.createBiquadFilter();
    const gain = NV.audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(type === 'kick' ? 60 : 120, NV.audioCtx.currentTime);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(type === 'kick' ? 150 : 4000, NV.audioCtx.currentTime);
    gain.gain.setValueAtTime(vol || 0.04, NV.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, NV.audioCtx.currentTime + dur);
    osc.connect(filter); filter.connect(gain); gain.connect(channelFor('music'));
    osc.start(); osc.stop(NV.audioCtx.currentTime + dur);
  }
  function updateMusic(dt) {
    if (!NV.audioCtx || !NV.soundOn) return;
    const gameState = NV.getState ? NV.getState() : 'playing';
    if (gameState !== 'playing' && gameState !== 'menu' && gameState !== 'shop') return;
    // Sincroniza la fase de música con la presencia de jefe (Tarea 3: identidad
    // sonora de jefe). El cambio de capa ocurre en el próximo step, nunca a mitad
    // de nota, así que no hay glitch/corte audible al entrar o salir de fase boss.
    const wantPhase = gameState === 'menu' ? 'menu' : (gameState === 'shop' ? 'shop' : (NV.getBoss && NV.getBoss() ? 'boss' : 'normal'));
    if (wantPhase !== NV.musicState.phase) NV.musicState.phase = wantPhase;
    const layers = currentLayers();
    const comboLayer = Math.min(1, (NV.musicState.combo || 0) / 20);
    const isMenuLike = NV.musicState.phase === 'menu' || NV.musicState.phase === 'shop';
    NV.musicTime += dt * (isMenuLike ? 0.55 : (1 + NV.musicState.intensity * 0.6 + comboLayer * 0.18));
    const stepDur = isMenuLike ? 0.18 : 0.12;
    NV.musicState.intensity = Math.max(0, Math.min(1, NV.musicState.intensity + ((NV.getBoss && NV.getBoss()) ? 0.02 : -0.015) * dt));
    if (NV.musicTime - NV.musicState.lastBeat >= stepDur) {
      NV.musicState.lastBeat = NV.musicTime;
      NV.musicState.step = (NV.musicState.step + 1) % 16;
      const step = NV.musicState.step;
      // Kick (808 punch)
      if (layers.drums[0][step]) scheduleDrum('kick', 0.1, 0.1 + NV.musicState.intensity * 0.05);
      // Snare (808 clap)
      if (layers.drums[1][step]) scheduleDrum('noise', 0.15, 0.06 + NV.musicState.intensity * 0.03);
      // Hi-hats
      if (layers.drums[2][step]) scheduleNote('square', 8000 + (step % 3) * 3000, 0.03, 0.02 + NV.musicState.intensity * 0.015 + comboLayer * 0.012);
      // Capa extra por combo: arpegio fino en contratiempos, aparece progresivamente
      // sin cambiar la base de la oleada.
      if (comboLayer > 0.25 && step % 2 === 1) {
        const note = layers.lead[(step + Math.floor(NV.musicState.combo || 0)) % layers.lead.length] * 2;
        scheduleNote('triangle', note, 0.06, 0.012 + comboLayer * 0.018);
      }
      // Bajo cada 4 steps (subby sawtooth)
      if (step % 4 === 0) {
        const bassIdx = Math.floor(step / 4) % layers.bass.length;
        if (layers.bass[bassIdx]) scheduleNote(isMenuLike ? 'sine' : 'sawtooth', layers.bass[bassIdx], isMenuLike ? 0.5 : 0.2, (isMenuLike ? 0.025 : 0.05) + NV.musicState.intensity * 0.02);
      }
      // Lead melódico (guitarra synth) → solo cada 8 steps
      if (step % 8 === 0 || (NV.musicState.intensity > 0.7 && step % 4 === 0)) {
        const note = layers.lead[Math.floor(step / 2) % layers.lead.length];
        scheduleNote('sawtooth', note, 0.25, 0.04 + NV.musicState.intensity * 0.02 + comboLayer * 0.012);
      }
    }
        // Drone atmosférico continuo (loop)
    if (NV.getFrame() % (isMenuLike ? 180 : 120) === 0) {
      const droneFreq = layers.chordRoots[Math.floor(NV.getFrame() / 120) % layers.chordRoots.length] * (isMenuLike ? 2 : 4);
      createDrone(droneFreq, NV.audioCtx.currentTime, isMenuLike ? 3.4 : 2.5);
    }
    // Nota: el ducking ya no se restaura acá. Su bajada y su vuelta viven en la
    // automatización del AudioParam (ver duck()), así que no dependen de que este
    // update corra (no corre durante wave_end / player_dying / gameover).
  }
  function playTone(freq, dur, type, vol, channel, opts) {
    if (!NV.audioCtx || !NV.soundOn) return;
    const ctx = NV.audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    // Detune aleatorio leve (±0.8%) evita fatiga auditiva en disparos rápidos (Tarea 1).
    const detune = (Math.random() * 2 - 1) * 0.008;
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq * (1 + detune), ctx.currentTime);
    gain.gain.setValueAtTime(vol || 0.03, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain);
    connectOutput(gain, channel, opts);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  // Variante extendida: permite pasar { channel, detune, priority } desde callers
  // que conocen el contexto del juego (arma rara, combo, daño crítico, etc.).
  // Se usa para la Tarea 4 (anti-fatiga en SMG/railgun) y combo de kills.
  function playToneEx(freq, dur, type, vol, opts) {
    opts = opts || {};
    const det = typeof opts.detune === 'number' ? opts.detune : ((Math.random() * 2 - 1) * 0.008);
    const f = freq * (1 + det);
    return playTone(f, dur, type, vol, opts.channel, opts);
  }

  // Golpe con BARRIDO de frecuencia: mismo enrutado (connectOutput), mismo detune
  // anti-fatiga y mismo envelope de ataque instantáneo que playTone, pero el pitch
  // viaja de f1 a f2 durante `dur`. Es el gesto de "impacto" (descendente), opuesto
  // a los SFX positivos del juego, que suben (pickup/tienda/level-up/victoria).
  function playToneSweep(f1, f2, dur, type, vol, channel, opts) {
    if (!NV.audioCtx || !NV.soundOn) return;
    const ctx = NV.audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const detune = (Math.random() * 2 - 1) * 0.008;
    osc.type = type || 'sawtooth';
    osc.frequency.setValueAtTime(f1 * (1 + detune), ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f2 * (1 + detune)), ctx.currentTime + dur);
    gain.gain.setValueAtTime(vol || 0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain);
    connectOutput(gain, channel, opts);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }
  // Helpers con OFFSET temporal para gestos multi-etapa (rediseño daño piloto).
  // Reusan el mismo enrutado (connectOutput → sfxPlayer + paneo opcional) y el
  // mismo envelope de ataque instantáneo + decaimiento exponencial que el resto
  // del proyecto. Los nodos opcionales (WaveShaper) usan guards defensivos como
  // en weaponSfx.js, así que en headless/tests simplemente se omiten.
  function toneAt(freq, dur, type, vol, channel, delay, opts) {
    if (!NV.audioCtx || !NV.soundOn) return;
    const ctx = NV.audioCtx;
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const detune = (Math.random() * 2 - 1) * 0.008;
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq * (1 + detune), t0);
    gain.gain.setValueAtTime(vol || 0.03, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    let out = osc;
    if (typeof ctx.createWaveShaper === 'function' && opts && opts.drive) {
      const sh = ctx.createWaveShaper();
      const n = 256, curve = new Float32Array(n);
      const k = 2 + opts.drive * 20;
      for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; curve[i] = Math.tanh(x * k); }
      sh.curve = curve;
      osc.connect(sh); out = sh;
    }
    out.connect(gain);
    connectOutput(gain, channel, opts);
    osc.start(t0);
    osc.stop(t0 + dur);
  }
  function sweepAt(f1, f2, dur, type, vol, channel, delay, opts) {
    if (!NV.audioCtx || !NV.soundOn) return;
    const ctx = NV.audioCtx;
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const detune = (Math.random() * 2 - 1) * 0.008;
    osc.type = type || 'sawtooth';
    osc.frequency.setValueAtTime(f1 * (1 + detune), t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f2 * (1 + detune)), t0 + dur);
    gain.gain.setValueAtTime(vol || 0.05, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    connectOutput(gain, channel, opts);
    osc.start(t0);
    osc.stop(t0 + dur);
  }
  function noiseSweepAt(dur, vol, f1, f2, channel, delay) {
    if (!NV.audioCtx || !NV.soundOn) return;
    const ctx = NV.audioCtx;
    const t0 = ctx.currentTime + (delay || 0);
    const buffer = ctx.createBuffer(1, Math.max(16, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = buffer;
    filter.type = 'bandpass';
    filter.Q.value = 1.1;
    filter.frequency.setValueAtTime(f1, t0);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, f2), t0 + dur);
    gain.gain.setValueAtTime(vol || 0.04, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter); filter.connect(gain); gain.connect(channelFor(channel || 'sfxPlayer'));
    src.start(t0); src.stop(t0 + dur);
  }
  const rapidFireFatigue = {};
  function rapidFireVolume(id, baseVol) {
    if (!NV.audioCtx || (id !== 'smg' && id !== 'railgun')) return baseVol;
    const now = NV.audioCtx.currentTime;
    const st = rapidFireFatigue[id] || { last: -99, heat: 0 };
    const cadence = now - st.last;
    if (cadence < (id === 'smg' ? 0.09 : 0.22)) st.heat = Math.min(1, st.heat + 0.16);
    else st.heat = Math.max(0, st.heat - cadence * 1.2);
    st.last = now;
    rapidFireFatigue[id] = st;
    return baseVol * (1 - st.heat * 0.32);
  }
  const sfx = {
    // SFX existentes: redirigidos a canales con ducking automático.
    explosion: (enemyType, opts) => { sfx.enemyDeath(enemyType || 'normal', opts); },
    enemyDeath: (enemyType, opts) => {
      opts = opts || {};
      const kind = enemyType || 'normal';
      if (kind === 'boss') {
        duck('music', 0.12, 0.35);
        scheduleNoise(0.38, 0.08);
        playTone(70, 0.42, 'sawtooth', 0.13, 'sfxEnemies', opts);
        playTone(110, 0.25, 'triangle', 0.08, 'sfxEnemies', opts);
      } else if (kind === 'elite') {
        scheduleNoise(0.14, 0.055);
        playTone(165, 0.22, 'sawtooth', 0.085, 'sfxEnemies', opts);
        playTone(95, 0.18, 'square', 0.055, 'sfxEnemies', opts);
      } else {
        playTone(220, 0.12, 'square', 0.045, 'sfxEnemies', opts);
        playTone(140, 0.14, 'sawtooth', 0.035, 'sfxEnemies', opts);
      }
    },
    pickup: () => playTone(1320, 0.12, 'square', 0.04, 'sfxUI'),
    consume: (type) => {
      const f = type === 'bomb' ? 180 : type === 'freeze' ? 520 : type === 'overdrive' ? 900 : type === 'bounty' ? 740 : 620;
      duck('music', 0.42, 0.08);
      playTone(f, 0.1, 'triangle', 0.045, 'sfxPlayer');
      playTone(f * 1.5, 0.12, 'sine', 0.035, 'sfxUI');
    },
    fuse: (level) => {
      duck('music', 0.28, 0.16);
      playTone(440 + (level || 1) * 70, 0.12, 'triangle', 0.055, 'sfxUI');
      playTone(880 + (level || 1) * 90, 0.18, 'square', 0.04, 'sfxAmbient');
    },
    shopBuy: () => { playTone(1040, 0.07, 'square', 0.04, 'sfxUI'); playTone(1560, 0.08, 'triangle', 0.025, 'sfxUI'); },
    shopSell: () => { playTone(780, 0.08, 'triangle', 0.04, 'sfxUI'); playTone(520, 0.09, 'square', 0.03, 'sfxUI'); },
    wheelSelect: () => playTone(1180, 0.045, 'square', 0.03, 'sfxUI'),
    damage: () => { duck('music', 0.2, 0.18); playTone(80, 0.15, 'square', 0.07, 'sfxPlayer'); },
    // Daño recibido por el piloto — SEGUNDO REDISEÑO: "ALARMA DE CASCO ROTO".
    // Ruptura total con el gesto anterior (crack agudo simultáneo + sweep grave
    // corto <0.2s). Ahora es un gesto SECUENCIAL de ~0.55s en 4 etapas
    // desacopladas, todo por `sfxPlayer` con duck largo de música:
    //  E1 CRUNCH (0.00s): ruido bandpass medio-bajo con barrido 900→240 Hz
    //     (0.10s) + square 140 Hz con drive leve: rotura, no brillo agudo.
    //  E2 SUB-DROP (0.02s): sine 150→38 Hz durante 0.30s: peso corporal que el
    //     diseño anterior no tenía (su sweep grave duraba 0.17s y moría solo).
    //  E3 ALARMA (0.14/0.26/0.38s): 3 pulsos square 620→470 Hz con paneo
    //     alterno L/R/centro: urgencia/peligro, capa inexistente antes.
    //  E4 COLA (0.16s): ruido bandpass 2400→500 Hz, 0.38s: resolución/chisporroteo.
    // Timbre, envelope, duración, estructura temporal, dinámica, movimiento y
    // estéreo cambian a la vez: comparación A/B obvia. El golpe letal sigue por
    // sfx.damage/deathTone; esto es solo daño no fatal (ver combat.js).
    playerHit: () => {
      duck('music', 0.14, 0.55);
      // E1 — crunch de rotura.
      noiseSweepAt(0.10, 0.11, 900, 240, 'sfxPlayer', 0);
      toneAt(140, 0.09, 'square', 0.075, 'sfxPlayer', 0, { drive: 0.35 });
      // E2 — caída corporal grave y larga.
      sweepAt(150, 38, 0.30, 'sine', 0.12, 'sfxPlayer', 0.02);
      // E3 — triple pulso de alarma con contraste estéreo.
      toneAt(620, 0.07, 'square', 0.05, 'sfxPlayer', 0.14, { pan: -0.55 });
      toneAt(545, 0.07, 'square', 0.05, 'sfxPlayer', 0.26, { pan: 0.55 });
      toneAt(470, 0.10, 'square', 0.055, 'sfxPlayer', 0.38, { pan: 0 });
      sweepAt(620, 470, 0.10, 'square', 0.04, 'sfxPlayer', 0.38);
      // E4 — cola de chisporroteo descendente.
      noiseSweepAt(0.38, 0.05, 2400, 500, 'sfxPlayer', 0.16);
    },
    special: () => playTone(660, 0.4, 'triangle', 0.05, 'sfxPlayer'),
    playerLevelUp: () => { duck('music', 0.3, 0.14); playTone(523, 0.1, 'square', 0.05, 'sfxUI'); playTone(784, 0.13, 'triangle', 0.04, 'sfxUI'); },
    wave: () => playTone(440, 0.3, 'triangle', 0.06, 'sfxUI'),
    // Speaker mines: eventos discretos sobre el mixer existente. El baile no
    // genera voz continua; armado y explosión respetan mute/volumen/paneo.
    speakerMineArm: (opts) => {
      opts = opts || {};
      playTone(210, 0.08, 'square', 0.025, 'sfxAmbient', opts);
      playTone(315, 0.11, 'triangle', 0.018, 'sfxAmbient', opts);
    },
    speakerMineExplosion: (opts) => {
      opts = opts || {};
      duck('music', 0.18, 0.2);
      scheduleNoise(0.22, 0.07);        // punch bajo + ataque
      playTone(60, 0.3, 'sawtooth', 0.11, 'sfxAmbient', opts);   // graves fuertes
      playTone(120, 0.09, 'triangle', 0.055, 'sfxAmbient', opts); // ataque claro
      playTone(250, 0.13, 'square', 0.04, 'sfxAmbient', opts);   // tono percusivo sutil
    },
  };

  sfx.levelup = () => sfx.playerLevelUp(); // alias legacy

  // Eventos Tanda C: cada modificador de oleada tiene una firma breve e identificable.
  sfx.waveEvent = (eventKey) => {
    if (eventKey === 'mines') {
      duck('music', 0.38, 0.18);
      playTone(95, 0.18, 'sawtooth', 0.075, 'sfxAmbient');
      scheduleNoise(0.16, 0.05);
    } else if (eventKey === 'fog') {
      duck('music', 0.45, 0.12);
      playTone(260, 0.45, 'sine', 0.045, 'sfxAmbient');
      playTone(195, 0.55, 'triangle', 0.03, 'sfxAmbient');
    } else if (eventKey === 'elites') {
      duck('music', 0.32, 0.16);
      playTone(330, 0.14, 'square', 0.055, 'sfxAmbient');
      playTone(660, 0.14, 'square', 0.04, 'sfxAmbient');
    } else if (eventKey === 'payday') {
      playTone(880, 0.09, 'triangle', 0.045, 'sfxUI');
      playTone(1320, 0.1, 'square', 0.04, 'sfxUI');
      playTone(1760, 0.12, 'triangle', 0.035, 'sfxUI');
    }
  };

  // SFX nuevos de la Tarea 1 (esqueleto: hooks de ducking para combo/victoria).
  sfx.combo = (count) => {
    NV.musicState.combo = Math.max(NV.musicState.combo || 0, count || 0);
    duck('music', 0.35, 0.12);
    playTone(880 + (count * 40), 0.08, 'square', 0.05 + count * 0.008, 'sfxAmbient');
  };
  sfx.heartbeat = (intensity) => { playTone(120, 0.3, 'sine', 0.03 + intensity * 0.12, 'sfxPlayer'); };
  sfx.countdown = (sec) => { playTone(660 - sec * 60, 0.12, 'square', 0.04, 'sfxAmbient'); };
  sfx.bossEnter = () => { duck('music', 0.1, 0.4); playTone(90, 0.6, 'sawtooth', 0.12, 'sfxEnemies'); };
  sfx.victory = (wave, opts) => {
    // SFX ÚNICO DE OLEADA SUPERADA — "RESPIRO LUMINOSO" (v2 con presencia).
    // Una sola identidad para TODA victoria de oleada (normal, hito o boss):
    // se ignora wave/milestone a propósito para que cada vez que suena
    // signifique exactamente "OLEADA SUPERADA".
    //  Por qué la v1 se perdía: bus sfxUI (0.7, el más bajo de SFX) + ataque
    //  blando (triangle/sine sin transitorio) + duck leve de música + arranque
    //  en 523Hz (zona media ya saturada por música/disparos). Todo sumaba a
    //  "hay algo ahí si presto atención".
    //  Qué cambia en v2 (misma melodía, otra presencia):
    //  E0 GOLPE (0.00s): transitorio percusivo grave+brillo que MARCA el corte
    //     "SE TERMINÓ EL COMBATE" antes de que la melodía respire.
    //  E1 APERTURA (0.02-0.28s): misma quinta, más densa y con ataque (square
    //     con drive + triangle), paneo amplio: ya no compite, lidera.
    //  E2 RESPUESTA (0.16-0.52s): confirma una octava arriba, abre el estéreo.
    //  E3 ASENTAMIENTO (0.40-0.85s): tónica que aterriza + brillo que se apaga
    //     dentro del wave_end (2.10s): deja espacio para recoger y la tienda.
    //  Mezcla: bus `sfxPlayer` (0.9, el más alto de SFX) + duck PROFUNDO y
    //  corto de música (0.10/0.8s): la música se aparta, la victoria manda,
    //  y vuelve sola para el respiro/tienda. Volumen por voz comedido: golpe
    //  único, sin fanfarra larga ni estridencia que canse en la oleada 50.
    void wave; void opts;
    duck('music', 0.10, 0.8);
    // E0 — golpe de corte: peso grave + crack que anuncia el fin del combate.
    sweepAt(180, 55, 0.22, 'sine', 0.14, 'sfxPlayer', 0);
    toneAt(1560, 0.05, 'square', 0.06, 'sfxPlayer', 0, { drive: 0.4, pan: -0.5 });
    noiseSweepAt(0.14, 0.09, 2400, 500, 'sfxPlayer', 0);
    // E1 — apertura: misma quinta, con cuerpo y ataque.
    toneAt(523.25, 0.16, 'square', 0.075, 'sfxPlayer', 0.02, { drive: 0.3, pan: -0.45 });
    toneAt(523.25, 0.16, 'triangle', 0.06, 'sfxPlayer', 0.02, { pan: -0.45 });
    toneAt(784.00, 0.20, 'square', 0.075, 'sfxPlayer', 0.10, { drive: 0.3, pan: 0.45 });
    toneAt(784.00, 0.20, 'triangle', 0.06, 'sfxPlayer', 0.10, { pan: 0.45 });
    // E2 — respuesta: confirma una octava arriba, abre el estéreo.
    toneAt(1046.50, 0.22, 'triangle', 0.06, 'sfxPlayer', 0.18, { pan: -0.45 });
    toneAt(1318.51, 0.26, 'triangle', 0.055, 'sfxPlayer', 0.28, { pan: 0.45 });
    // E3 — asentamiento: tónica que aterriza + brillo que se apaga.
    toneAt(261.63, 0.34, 'sine', 0.075, 'sfxPlayer', 0.42);
    noiseSweepAt(0.30, 0.03, 3200, 900, 'sfxPlayer', 0.48);
  };
  // Firma sonora de transición de fase de jefe (Tarea 3, idea 6): golpe grave + swell
  // ascendente distinto del bossEnter, para que "entró en fase 2" se sienta único.
  sfx.bossPhaseShift = () => {
    duck('music', 0.15, 0.35);
    playTone(70, 0.35, 'sawtooth', 0.13, 'sfxEnemies');
    playToneEx(220, 0.4, 'sawtooth', 0.07, { channel: 'sfxEnemies', detune: 0 });
    scheduleNoise(0.3, 0.06);
  };

  const PILOT_TRANSITION_TONES = {
    boti:  { death: [110, 87],  stable: [330, 440], deathType: 'sawtooth', stableType: 'sine' },
    nova:  { death: [220, 132], stable: [520, 660], deathType: 'sawtooth', stableType: 'sine' },
    rook:  { death: [72, 55],   stable: [146, 196], deathType: 'triangle', stableType: 'triangle' },
    swarm: { death: [330, 220], stable: [440, 880], deathType: 'square', stableType: 'sine' }
  };

  sfx.playerDeath = () => {
    // SFX MUERTE DEL PERSONAJE — "COLAPSO + CORTE + HUNDIMIENTO".
    // Evento único de ~0.80s que cabe justo en la transición player_dying→FIN
    // (0.82s): arranca ANTES del overlay FIN y resuelve hacia él.
    //  E1 IMPACTO/COLAPSO (0.00-0.12s): crack agudo + crunch descendente +
    //     ruido de impacto: marca inequívoca "MORÍ" (nada que ver con el
    //     gesto de alarma del playerHit no letal).
    //  E2 CORTE/INTERRUPCIÓN (0.22s): silencio funcional de ~60ms + barrido
    //     descendente que "apaga" la acción (la anti-alarma: donde playerHit
    //     pondría su 2º pulso, acá hay vacío).
    //  E3 HUNDIMIENTO/RESOLUCIÓN (0.30-0.80s): pedal grave + sub que cae a
    //     30-38 Hz + cola de ruido que se apaga: conduce al FIN.
    // Todo por `sfxPlayer` con duck profundo y largo de música (0.08/0.9s):
    // la música se retira para que la muerte mande, y vuelve sola para el FIN.
    duck('music', 0.08, 0.9);
    // E1 — colapso: rotura brillante que se desploma al grave.
    toneAt(720, 0.07, 'square', 0.09, 'sfxPlayer', 0, { drive: 0.5, pan: -0.4 });
    sweepAt(320, 70, 0.32, 'sawtooth', 0.11, 'sfxPlayer', 0, { pan: 0.4 });
    noiseSweepAt(0.30, 0.10, 1600, 220, 'sfxPlayer', 0);
    // E1b — peso corporal que se viene abajo (núcleo + sub).
    sweepAt(210, 48, 0.55, 'sine', 0.13, 'sfxPlayer', 0.05);
    sweepAt(110, 30, 0.60, 'triangle', 0.10, 'sfxPlayer', 0.08, { pan: -0.25 });
    // E2 — corte: tras ~60ms de aire, barrido que interrumpe en seco.
    toneAt(1100, 0.03, 'square', 0.045, 'sfxPlayer', 0.22, { pan: 0.4 });
    sweepAt(880, 110, 0.06, 'sawtooth', 0.07, 'sfxPlayer', 0.22);
    // E3 — hundimiento: pedal grave + sub final + cola que se disuelve a FIN.
    toneAt(55, 0.34, 'sine', 0.11, 'sfxPlayer', 0.30);
    sweepAt(82, 38, 0.48, 'sine', 0.10, 'sfxPlayer', 0.32);
    noiseSweepAt(0.42, 0.045, 900, 120, 'sfxPlayer', 0.38);
  };

  sfx.deathTone = (pilotId) => {
    // Compat: la firma por piloto quedó obsoleta; el SFX de muerte es único
    // para que "morí" siempre se lea igual. Se ignora pilotId a propósito.
    void pilotId;
    sfx.playerDeath();
  };

  sfx.stabilizeTone = (pilotId, isBoss) => {
    const tone = PILOT_TRANSITION_TONES[pilotId] || PILOT_TRANSITION_TONES.boti;
    const gain = isBoss ? 0.045 : 0.032;
    playTone(tone.stable[0], 0.18, tone.stableType, gain, 'sfxUI');
    playTone(tone.stable[1], 0.24, 'sine', gain * 0.72, 'sfxAmbient');
  };

  function defaultWeaponSound(_weapon, opts, fus, vol) {
    playToneEx(880, 0.08, 'square', 0.03 * vol, opts);
  }

  const WEAPON_SOUND_HANDLERS = {
    pistol: (_weapon, opts, _fus, vol) => playToneEx(880, 0.08, 'square', 0.03 * vol, opts),
    rifle: (_weapon, opts, _fus, vol) => playToneEx(640, 0.07, 'square', 0.035 * vol, opts),
    smg: (_weapon, opts, _fus, vol) => playToneEx(990, 0.04, 'square', rapidFireVolume('smg', 0.028 * vol), opts),
    shotgun: (_weapon, opts, fus, vol) => { scheduleNoise(0.18, 0.07); playToneEx(170 * fus, 0.18, 'sawtooth', 0.09 * vol, opts); },
    sniper: (_weapon, opts, _fus, vol) => { playToneEx(110, 0.45, 'square', 0.11 * vol, opts); scheduleNoise(0.25, 0.05); },
    laser: (_weapon, opts, _fus, vol) => playToneEx(1250, 0.12, 'sine', 0.045 * vol, opts),
    plasma: (_weapon, opts, _fus, vol) => playToneEx(720, 0.1, 'triangle', 0.05 * vol, opts),
    flamethrower: (_weapon, opts, fus, vol) => { scheduleNoise(0.14, 0.05); playToneEx(95 * fus, 0.13, 'sawtooth', 0.08 * vol, opts); },
    bow: (_weapon, opts, _fus, vol) => playToneEx(430, 0.09, 'sine', 0.045 * vol, opts),
    railgun: (_weapon, opts, fus, vol) => { playToneEx(150 * fus, 0.5, 'sawtooth', rapidFireVolume('railgun', 0.12 * vol), opts); scheduleNoise(0.3, rapidFireVolume('railgun', 0.06)); },
  };

  // Sonido distintivo por tipo de arma
  // opts?: { crit, fusion, channel } → variación de timbre/pitch (Tarea 1).
  // playWeaponSound(weapon) sigue funcionando (backwards compatible).
  function playWeaponSound(weapon, opts) {
    if (!NV.soundOn) return;
    opts = opts || {};
    if (NV.audio && typeof NV.audio.weaponFire === 'function') {
      return NV.audio.weaponFire((weapon && weapon.id) || 'pistol', opts);
    }
    // Fallback sintetizado (sin weaponSfx.js disponible): las armas entran por su
    // propio bus para que weaponsVolume siga siendo independiente de playerVolume.
    // Un opts.channel explícito del caller se respeta tal cual.
    const fallbackOpts = opts.channel ? opts : Object.assign({}, opts, { channel: 'weapons' });
    const fus = opts.fusion > 0 ? 1 + opts.fusion * 0.05 : 1; // pitch ↑ +5% por nivel de fusión
    const vol = (opts.crit ? 1.15 : 1) * (opts.fusion ? 1 + opts.fusion * 0.03 : 1);
    const handler = WEAPON_SOUND_HANDLERS[weapon.id] || defaultWeaponSound;
    handler(weapon, fallbackOpts, fus, vol);
  }

  NV.WEAPON_SOUND_HANDLERS = WEAPON_SOUND_HANDLERS;

  // Sonidos de ataque distintos para cada jefe
  sfx.bossAttack = {
    repeater: () => { scheduleNoise(0.04, 0.045); playTone(220, 0.05, 'square', 0.055); },
    heavy: () => { scheduleNoise(0.09, 0.07); playTone(100, 0.3, 'sawtooth', 0.11); },
    summon: () => { scheduleNoise(0.14, 0.06); playTone(75, 0.5, 'sawtooth', 0.11); },
    spread: () => playTone(330, 0.09, 'triangle', 0.07),
    beam: () => { scheduleNoise(0.55, 0.11); playTone(150, 0.7, 'sawtooth', 0.14); },
    volley: () => { playTone(440, 0.05, 'square', 0.05); playTone(880, 0.05, 'square', 0.045); },
    bomb: () => { scheduleNoise(0.22, 0.08); playTone(120, 0.45, 'sawtooth', 0.11); },
    orbs: () => playTone(660, 0.07, 'sine', 0.05),
    split: () => playTone(520, 0.1, 'triangle', 0.07),
    rage: () => { scheduleNoise(0.05, 0.06); playTone(190, 0.06, 'square', 0.07); },
  };

  // Siembra del estado del mixer desde las preferencias persistidas. Si settings.js
  // todavía no cargó, queda en defaults y settings.js lo reaplicará en su arranque.
  applyAudioSettings(settingsAudio());

  // Exportar API pública
  NV.initAudio = initAudio;
  NV.updateMusic = updateMusic;
  NV.playWeaponSound = playWeaponSound;
  NV.playToneEx = playToneEx;
  NV.playToneSweep = playToneSweep;
  NV.duck = duck;
  NV.channelFor = channelFor;
  NV.panForX = panForX;
  NV.setChannelVolume = setChannelVolume;
  NV.applyMasterVolume = applyMasterVolume;
  NV.applyAudioSettings = applyAudioSettings;
  NV.applySfxVolume = applySfxVolume;
  NV.setSoundEnabled = setSoundEnabled;
  NV.mixerChannels = CHANNELS;
  // Volumen de categoría por canal del mixer (mapa canal -> 0..1).
  NV.masterVolume = MASTER_VOLUME;
  // Contrato canal del mixer -> clave persistida en NV.settings.audio.
  NV.audioChannelSettings = AUDIO_CHANNEL_SETTINGS;
  NV.sfx = sfx;
})();
