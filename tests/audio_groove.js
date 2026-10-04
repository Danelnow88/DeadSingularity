const assert=require('node:assert/strict'),make=require('./_audioHarness.cjs');
function record(){
  const h=make(),notes=[],original=h.NV.soundVoice;
  h.NV.soundVoice=s=>{notes.push({...s});return original(s);};
  return {...h,notes};
}
let h=record(),N=h.NV;
N.updateMusic(0);
const initial=h.notes.length;
for(let i=0;i<200;i++)N.updateMusic(0);
assert.equal(h.notes.length,initial,'un solo reloj: llamadas duplicadas no duplican notas');
for(let i=0;i<60*32;i++){h.advance(1/60);N.updateMusic(1/60);}
const kicks=h.notes.filter(s=>s.role==='kick'),bass=h.notes.filter(s=>s.role==='808');
assert.deepEqual(kicks.map(s=>s.at),bass.map(s=>s.at),'808 y kick comparten exactamente la cuadrícula');
assert(bass.every(s=>s.hold>0&&s.glideTime<s.duration),'el bajo sostiene, no golpea como otra batería');
assert(kicks.every((s,i)=>!i||s.at>kicks[i-1].at),'no amontonar bombos en un mismo instante');
assert.equal(N.musicState.tempo,144);
const snares=h.notes.filter(s=>s.role==='snare');
assert.equal(snares.length,Math.round(N.musicState.scheduledSteps/16),'una caja a medio tiempo por compás');
assert(snares.every((s,i)=>!i||s.at-snares[i-1].at>1.6),'ningún fill agrega una segunda caja');
const rolls=h.notes.filter(s=>s.role==='hat-roll');
assert(rolls.length>0&&rolls.length%3===0);
for(let i=0;i<rolls.length;i+=3){
  assert(rolls[i].at<rolls[i+1].at&&rolls[i+1].at<rolls[i+2].at);
  assert(!h.notes.some(s=>s.role==='hat'&&Math.abs(s.at-rolls[i].at)<.0001),'roll reemplaza hat');
}
assert(N.getAudioVoiceStats().byChannel.music<=14&&N.getAudioVoiceStats().peak<=48);
assert.equal(h.rngCalls(),0,'la partitura no consume RNG de gameplay');
function grooveAt(fps){
  const x=record();x.NV.updateMusic(0);
  for(let i=0;i<fps*8;i++){x.advance(1/fps);x.NV.updateMusic(1/fps);}
  return x.notes.filter(s=>s.role==='kick').map(s=>s.at);
}
assert.deepEqual(grooveAt(30),grooveAt(60),'onsets idénticos a 30 y 60 FPS');
// Cambios de escena entran en el próximo compás, no sobre una nota en curso.
N.getState=()=> 'shop';N.updateMusic(0);assert.equal(N.musicState.phase,'shop');
assert.equal(N.musicState.playingPhase,'normal');
for(let i=0;i<120;i++){h.advance(1/60);N.updateMusic(1/60);}
assert.equal(N.musicState.playingPhase,'shop');
// Una congelación no reproduce toda la deuda de tiempo en una ráfaga.
const count=N.musicState.scheduledSteps;
const beforeResync=h.notes.length;
h.advance(10);N.updateMusic(.25);
assert(N.musicState.scheduledSteps-count<=2);
assert(N.musicState.resyncs>0);
assert(h.notes.slice(beforeResync).every(s=>s.at>=h.ctx.currentTime),'ninguna nota atrasada');
N.setAudioHidden(true);const created=N.getAudioVoiceStats().created;
for(let i=0;i<100;i++){h.advance(.1);N.updateMusic(.1);}
assert.equal(N.getAudioVoiceStats().created,created);
N.setAudioHidden(false);N.updateMusic(.1);assert(N.getAudioVoiceStats().active<=14);
N.setSoundEnabled(false);h.advance(1);assert.equal(N.getAudioVoiceStats().active,0);
// SFX de UI con cuerpo, sin subir el volumen global ni convertir hover en alarma.
h=record();N=h.NV;N.sfx.ui('confirm');
assert(h.notes.some(s=>s.channel==='sfxUI'&&s.volume>=.06));
assert(h.notes.some(s=>s.noise&&s.duration<=.03));
h.advance(.2);h.notes.length=0;N.sfx.ui('hover');
assert.equal(h.notes.length,1);assert(h.notes[0].volume<.02);
// Instante absoluto, pitch glide corto y sustain, compatibles con SFX relativos.
h=make();N=h.NV;h.advance(2);
const v=N.soundVoice({freq:100,endFreq:50,glideTime:.05,attack:.02,hold:.1,duration:.3,at:3,channel:'music'});
assert.equal(v.start,3);assert(h.events.some(e=>e.v===50&&Math.abs(e.t-3.05)<1e-8));
assert(h.events.some(e=>e.v===.03&&Math.abs(e.t-3.12)<1e-8));
assert.equal(N.soundVoice({delay:.1,duration:.1}).start,2.1);
console.log('RESULT audio_groove: reloj absoluto, trap 144 BPM, kick/808, caja única, rolls, transiciones, UI y lifecycle OK');
