const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function sandbox() {
  const frequencies = [], types = [];
  const param = () => ({ value: 0.6, setValueAtTime(v) { frequencies.push(Number(v)); }, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} });
  const ctx = {
    createOscillator: () => { const osc = { connect() {}, start() { types.push(osc.type); }, stop() {}, type: '', frequency: param() }; return osc; },
    createGain: () => ({ connect() {}, gain: param() }),
    createBiquadFilter: () => ({ connect() {}, type: '', Q: { value: 0 }, frequency: param() }),
    createBuffer: () => ({ getChannelData: () => new Float32Array(4410) }),
    createBufferSource: () => ({ connect() {}, start() {}, stop() {}, buffer: null }),
    destination: {}, currentTime: 0, sampleRate: 44100, state: 'running', resume: () => Promise.resolve(),
  };
  let wave = 1;
  const sb = { console, Math, Object, Array, Number, String, Boolean, window: {}, globalThis: {}, AudioContext: function () { return ctx; } };
  sb.window.AudioContext = sb.AudioContext;
  sb.window.NV = { getBoss: () => null, getState: () => 'playing', getFrame: () => 1, getWave: () => wave };
  sb.setWave = value => { wave = value; };
  sb.ctx = ctx; sb.frequencies = frequencies; sb.types = types;
  return sb;
}

const sb = sandbox();
vm.runInNewContext(fs.readFileSync('js/audio/synth.js', 'utf8'), sb, { filename: 'synth.js' });
const NV = sb.window.NV;
NV.initAudio();

assert.equal(NV.MUSIC_SECTOR_PROFILES.length, 4);
assert.deepStrictEqual([1, 6, 11, 16].map(w => NV.musicProfileForWave(w).id),
  ['threshold', 'foundry', 'fracture', 'void-heart']);
const signatures = NV.MUSIC_SECTOR_PROFILES.map(profile => JSON.stringify({
  chordRoots: profile.chordRoots, bass: profile.bass, lead: profile.lead, drums: profile.drums,
  stepDur: profile.stepDur, leadType: profile.leadType, bassType: profile.bassType,
}));
assert.equal(new Set(signatures).size, 4, 'cada sector necesita una firma musical propia');
for (const profile of NV.MUSIC_SECTOR_PROFILES) {
  assert.equal(profile.drums.length, 3);
  assert(profile.drums.every(row => row.length === 16));
  assert(profile.stepDur >= 0.10 && profile.stepDur <= 0.13, 'tempo fuera de rango seguro');
}

for (const [wave, id] of [[1, 'threshold'], [7, 'foundry'], [13, 'fracture'], [17, 'void-heart']]) {
  sb.setWave(wave);
  NV.updateMusic(0.2);
  assert.equal(NV.musicState.sector, id, 'cambio sectorial no aplicado para wave ' + wave);
}

// El aviso ambiental debe tener prioridad perceptual: duck + dos voces, sin crash.
let ducks = 0;
NV.mixer.music.gain.linearRampToValueAtTime = () => { ducks++; };
for (const kind of ['vent', 'rift', 'pulse']) NV.sfx.sectorHazard(kind);
assert(ducks >= 3, 'cada hazard debe apartar brevemente la música');
const h={laserHead:true,state:'telegraph',stateTime:1,emergeTime:.45,telegraphTime:1.65};
const env={state:'playing',paused:false,hidden:false};
const beforeVoices=sb.types.length;
NV.syncSectorLaserSound(Array.from({length:6},()=>h),env);
assert.equal(NV.sectorLaserSoundPhase(),'charge');
for(let i=0;i<20;i++)NV.syncSectorLaserSound([h],env);
assert.equal(sb.types.length-beforeVoices,2,'dos osciladores por grupo, no por frame/cabezal');
h.state='active';NV.syncSectorLaserSound([h],env);assert.equal(NV.sectorLaserSoundPhase(),'active');
NV.syncSectorLaserSound([h],{...env,paused:true});assert.equal(NV.sectorLaserSoundPhase(),null);
NV.syncSectorLaserSound([h],env);NV.syncSectorLaserSound([h],{...env,hidden:true});assert.equal(NV.sectorLaserSoundPhase(),null);
NV.syncSectorLaserSound([h],env);NV.setSoundEnabled(false);assert.equal(NV.sectorLaserSoundPhase(),null);
NV.setSoundEnabled(true);NV.syncSectorLaserSound([h],env);
NV.syncSectorLaserSound([],{...env,state:'shop'});assert.equal(NV.sectorLaserSoundPhase(),null);

const game = fs.readFileSync('js/game.js', 'utf8');
assert(game.includes('NV.getWave = () => wave'));
console.log('RESULT audio_sector_music: cuatro firmas, transición por oleada y prioridad de hazard OK');
