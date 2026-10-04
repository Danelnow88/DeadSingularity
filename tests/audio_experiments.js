const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),make=require('./_audioHarness.cjs');
const source=fs.readFileSync('dev/audio-experiments/experiments.js','utf8');
function load(){
  const h=make(),notes=[],original=h.NV.soundVoice;
  h.NV.soundVoice=s=>{notes.push({...s});return original(s);};
  vm.runInNewContext(source,{window:{NV:h.NV},console});return {...h,notes};
}
function compose(id,fps=60){
  const h=load(),N=h.NV,snapshot=JSON.stringify(N.MUSIC_SECTOR_PROFILES);
  N.audioExperiments.setMusic(id);N.updateMusic(0);
  for(let i=0;i<fps*32;i++){h.advance(1/fps);N.updateMusic(1/fps);}
  assert.equal(JSON.stringify(N.MUSIC_SECTOR_PROFILES),snapshot,'no mutar perfiles del juego');
  assert(N.getAudioVoiceStats().peak<=48&&N.getAudioVoiceStats().byChannel.music<=14);
  assert.equal(h.rngCalls(),0);return h;
}
const signatures=['current','hyperdrive-plus','hyperdrive','gravity','gravity-plus'].map(id=>JSON.stringify(compose(id).notes));
assert.equal(new Set(signatures).size,5,'referencia interna y cuatro arreglos distintos');
const h=make(),baseline=[],original=h.NV.soundVoice;
h.NV.soundVoice=s=>{baseline.push({...s});return original(s);};h.NV.updateMusic(0);
for(let i=0;i<60*32;i++){h.advance(1/60);h.NV.updateMusic(1/60);}
assert.equal(signatures[0],JSON.stringify(baseline),'referencia idéntica al juego');
const fast=compose('hyperdrive'),slow=compose('hyperdrive',30);
assert.deepEqual(fast.notes.map(n=>n.at),slow.notes.map(n=>n.at),'reloj idéntico a 30 y 60 FPS');
assert.deepEqual(fast.notes.filter(n=>n.role==='experiment-kick').map(n=>n.at),
  fast.notes.filter(n=>n.role==='experiment-808').map(n=>n.at),'bajo/bombo alineados');
assert(fast.notes.filter(n=>n.role==='experiment-kick').every((n,i,a)=>!i||n.at>a[i-1].at));
assert(!fast.notes.some(n=>['kick','snare','lead'].includes(n.role)),'no superponer la pista original');
for(const id of ['hyperdrive-plus','hyperdrive','gravity','gravity-plus']){
  const a=load(),n=a.NV,sections=new Set();n.audioExperiments.setMusic(id);
  for(let i=0;i<3300;i++){a.advance(1/30);n.updateMusic(1/30);sections.add(n.audioExperiments.getDiagnostics().section);}
  assert.equal(sections.size,8,'ocho secciones en '+id);
  const kicks=a.notes.filter(v=>v.role==='experiment-kick').map(v=>v.at);
  assert.equal(new Set(kicks).size,kicks.length,'batería única');
  assert.deepEqual(kicks,a.notes.filter(v=>v.role==='experiment-808').map(v=>v.at),'808 sincronizado '+id);
  assert.equal(n.audioExperiments.getDiagnostics().steps,n.musicState.scheduledSteps,'sin huecos heredados');
  for(const bar of [7,16,30,40,48,56]){
    n.audioExperiments.setMusic(id,bar);a.advance(.2);n.updateMusic(0);
    assert.equal(n.audioExperiments.getDiagnostics().arrangementBar,bar,'salto correcto');
  }
  n.audioExperiments.setMusic(id,7);a.notes.length=0;n.updateMusic(0);
  for(let i=0;i<60;i++){a.advance(1/30);n.updateMusic(1/30);}
  const start=a.notes.find(v=>v.role==='experiment-kick').at,step=60/144/4;
  assert(!a.notes.some(v=>v.role==='experiment-kick'&&v.at>=start+8*step-1e-6&&v.at<start+16*step-1e-6),'suspenso sin kick');
  assert(a.notes.some(v=>v.role==='experiment-riser'),'carga de tensión');
  assert(a.notes.some(v=>v.role==='experiment-kick'&&Math.abs(v.at-(start+16*step))<1e-6),'retorno del beat');
  assert.throws(()=>n.audioExperiments.setMusic(id,64));
}
const crypto=require('node:crypto'),approved={hyperdrive:'572493f3e2928c38d55a8d9f03a9d73cc853bb0be4e66751a0155a73756fe652',gravity:'89c381d40e93c01b3bb89cd0b54547f52e17c8d44f3fb6953b5093c5169a220b'};
for(const [id,hash] of Object.entries(approved)){
  const a=load();a.NV.audioExperiments.setMusic(id);a.NV.updateMusic(0);
  for(let i=0;i<6600;i++){a.advance(1/60);a.NV.updateMusic(1/60);}
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(a.notes)).digest('hex'),hash,'conservar B/C exactas');
}
const x=load(),N=x.NV,deathSignatures=[];
for(const id of ['current','core','magnetic','scrap']){
  x.advance(1);x.notes.length=0;N.audioExperiments.death(id,'normal');
  deathSignatures.push(JSON.stringify(x.notes));assert(x.notes.length<=3);
}
assert.equal(new Set(deathSignatures).size,4,'bajas distintas');
x.advance(1);x.notes.length=0;
for(let i=0;i<100;i++)N.audioExperiments.death('core');
assert.equal(x.notes.length,3,'bajas simultáneas agregadas, no cien explosiones');
for(let i=0;i<100;i++){
  x.advance(.055);N.audioExperiments.death(['core','magnetic','scrap'][i%3],i%5?'normal':'elite');
  N.audio.weaponFire('smg');assert(N.getAudioVoiceStats().active<=48);
}
N.setSoundEnabled(false);x.advance(1);const created=N.getAudioVoiceStats().created;
N.audioExperiments.death('scrap','boss');N.updateMusic(.1);
assert.equal(N.getAudioVoiceStats().created,created);assert.equal(N.getAudioVoiceStats().active,0);
N.setSoundEnabled(true);N.setAudioHidden(true);N.audioExperiments.death('magnetic');
assert.equal(N.getAudioVoiceStats().active,0);assert.equal(x.rngCalls(),0);
assert.throws(()=>N.audioExperiments.setMusic('nope'));assert.throws(()=>N.audioExperiments.death('nope'));
assert(!fs.readFileSync('index.html','utf8').includes('audio-experiments'),'experimentos fuera de producción');
assert(!source.includes('new AudioContext')&&!source.includes('setInterval')&&!source.includes('Math.random'));
console.log('RESULT audio_experiments: referencia exacta, tres temas/tres bajas, reloj compartido, presupuesto, mute y producción intacta OK');
