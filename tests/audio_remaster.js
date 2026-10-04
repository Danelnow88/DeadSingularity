const assert=require('node:assert/strict'),make=require('./_audioHarness.cjs');
let h=make(),N=h.NV;
assert.equal(Object.keys(N.mixer).length,6);
assert(N.audioCompressor&&N.audioCeiling);
assert(Math.max(...N.audioCeiling.curve)<.9,'techo seguro');
for(let i=0;i<400;i++)N.soundVoice({freq:200,channel:'weapons',duration:1});
assert(N.getAudioVoiceStats().active<=16);assert(N.getAudioVoiceStats().stolen>0);
for(const channel of ['music','sfxUI','sfxEnemies','sfxAmbient'])for(let i=0;i<50;i++)N.soundVoice({channel,duration:1});
assert(N.getAudioVoiceStats().active<=48);
assert(N.soundVoice({channel:'sfxPlayer',priority:5,duration:.3}),'feedback crítico roba voz menor');
h.advance(2);assert.equal(N.getAudioVoiceStats().active,0,'todos los grafos expiran');
assert(h.nodes.filter(n=>n.kind==='osc'||n.kind==='buffer').every(n=>n.disconnected));
h=make();N=h.NV;
const heard=[];const original=N.soundVoice;N.soundVoice=s=>{heard.push(s);return original(s);};
for(let count=1;count<=1000;count++){N.sfx.combo(count);h.advance(.05);}
assert(heard.length<300);assert(heard.every(s=>s.freq<=587&&s.volume<=.034));
assert.equal(N.musicState.combo,30);
heard.length=0;for(let i=0;i<100;i++)N.sfx.enemyDeath('normal');
assert.equal(heard.length,2,'bajas simultáneas agregadas');
heard.length=0;for(let i=0;i<100;i++)N.sfx.pickup();assert.equal(heard.length,2,'shards agregados');
heard.length=0;for(let i=0;i<100;i++)N.sfx.ui('hover');assert.equal(heard.length,1,'hover limitado');
h.advance(1);
const signatures=[];for(const pilot of ['boti','nova','rook','swarm']){heard.length=0;N.sfx.special(pilot);signatures.push(JSON.stringify(heard));h.advance(1);}
assert.equal(new Set(signatures).size,4);
N.setChannelVolume('music',.01);N.duck('music',.4,.2);assert(h.events.slice(-4).every(e=>e.v<=.006),'duck no amplifica categoría');
assert.equal(h.rngCalls(),0,'audio no consume RNG de gameplay');
N.setSoundEnabled(false);const before=N.getAudioVoiceStats().created;N.sfx.playerDeath();N.audio.weaponFire('pistol');assert.equal(N.getAudioVoiceStats().created,before);
h.advance(1);assert.equal(N.getAudioVoiceStats().active,0);
N.setSoundEnabled(true);N.setAudioHidden(true);N.sfx.special('rook');assert.equal(N.getAudioVoiceStats().active,0);N.setAudioHidden(false);
const freqBefore=heard.length;N.sfx.dash();assert(heard.length>freqBefore);
// Robar una voz que ya está desvaneciéndose también tiene que desconectarla.
h=make();N=h.NV;
for(let i=0;i<16;i++)N.soundVoice({channel:'weapons',duration:1});
N.stopAudioVoices('weapons');
for(let i=0;i<100;i++)N.soundVoice({channel:'weapons',duration:1});
assert.equal(N.getAudioVoiceStats().active,16);
// Un láser continuo comparte presupuesto y no puede reaparecer en segundo plano.
N.stopAudioVoices();h.advance(1);
const hazards=[{laserHead:true,state:'telegraph',stateTime:1,emergeTime:.45,telegraphTime:1.65}];
const env={state:'playing',paused:false,hidden:false};
N.syncSectorLaserSound(hazards,env);
assert.equal(N.getAudioVoiceStats().active,2);
const laserCreated=N.getAudioVoiceStats().created;
N.syncSectorLaserSound(hazards,env);assert.equal(N.getAudioVoiceStats().created,laserCreated);
N.setAudioHidden(true);h.advance(1);N.syncSectorLaserSound(hazards,env);
assert.equal(N.getAudioVoiceStats().active,0);
assert.equal(N.getAudioVoiceStats().created,laserCreated);
N.setAudioHidden(false);hazards[0].state='active';N.syncSectorLaserSound(hazards,env);
assert.equal(N.getAudioVoiceStats().active,2);N.syncSectorLaserSound(hazards,{...env,paused:true});
h.advance(1);assert.equal(N.getAudioVoiceStats().active,0);
// Leer una transición no altera entidades ni reproduce avisos cada frame.
const e={x:50,swiftState:'windup'},snapshot=JSON.stringify(e);let notices=0,attacks=0;
N.sfx.telegraph=()=>notices++;N.sfx.enemyAttack=()=>attacks++;
N.observeEnemyAudio([e],100);N.observeEnemyAudio([e],100);
assert.equal(notices,1);assert.equal(JSON.stringify(e),snapshot);
e.swiftState='dash';N.observeEnemyAudio([e],100);N.observeEnemyAudio([e],100);
assert.equal(attacks,1);assert.equal(h.rngCalls(),0);
// Tempo estable a distintos FPS: no descartar la fracción de tiempo en cada beat.
function musicAt(fps){const x=make(),sections=new Set();for(let i=0;i<fps*60;i++){x.advance(1/fps);x.NV.updateMusic(1/fps);sections.add(x.NV.musicState.section);}return {state:x.NV.musicState,sections};}
const fast=musicAt(60),slow=musicAt(30);
assert(['viaje','impulso','respiro','resolución'].every(section=>fast.sections.has(section)),'se recorren todas las frases');
assert(Math.abs(fast.state.lastBeat-slow.state.lastBeat)<=.13,'tempo independiente de FPS');
console.log('RESULT audio_remaster: mixer, ceiling, 48 voces, limpieza, RNG aislado, hitos, densidad, identidad, mute y lifecycle OK');
