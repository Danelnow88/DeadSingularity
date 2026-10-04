// Contratos del remaster: reemplaza presets del laboratorio anterior por presupuestos medibles.
const assert=require('node:assert/strict'),fs=require('node:fs'),make=require('./_audioHarness.cjs');
const h=make(),N=h.NV;
assert.equal(Object.keys(N.WEAPON_SFX_PRESETS).length,10);
assert.equal(new Set(Object.values(N.WEAPON_SFX_PRESETS).map(p=>JSON.stringify(p))).size,10);
for(const id of Object.keys(N.WEAPON_SFX_PRESETS)){
  h.advance(1);const before=N.getAudioVoiceStats().created;
  N.audio.weaponFire(id,{x:0,worldWidth:900});
  assert(N.getAudioVoiceStats().created>before,id+' audible');
  assert(N.getAudioVoiceStats().created-before<=3,id+' máximo tres capas');
  N.audio.weaponStop(id);
}
h.advance(1);
for(let i=0;i<200;i++){N.audio.weaponFire('smg');h.advance(.055);}
const shots=N.audio.getRecentWeaponEvents().filter(e=>e.id==='smg');
assert(shots.every(s=>s.volume<=.075&&s.duration<=.065));
assert(shots.at(-1).volume<.06,'ráfaga reduce transitorio/cola');
assert(N.getAudioVoiceStats().peak<=48);
N.audio.stopAllWeapons();h.advance(1);
const ignitions=N.audio.getWeaponSfxStats().flameIgnitions;
N.audio.weaponStart('flamethrower');const created=N.getAudioVoiceStats().created;
for(let i=0;i<50;i++)N.audio.weaponFire('flamethrower');
assert.equal(N.audio.getWeaponSfxStats().flameIgnitions,ignitions+1);
assert.equal(N.getAudioVoiceStats().created,created,'sustain sin nuevos grafos');
for(const env of [{paused:true,state:'playing'},{hidden:true,state:'playing'},{state:'shop'},{state:'menu'}]){
  N.audio.weaponStart('flamethrower');N.audio.update(env);assert.equal(N.audio.getWeaponSfxStats().continuous.flamethrower,false);h.advance(1);
}
N.audio.weaponStart('flamethrower');h.advance(.5);N.audio.update({state:'playing'});assert.equal(N.audio.getWeaponSfxStats().continuous.flamethrower,false);
N.setSoundEnabled(false);const muted=N.getAudioVoiceStats().created;N.audio.weaponFire('shotgun');N.audio.reload('shotgun');assert.equal(N.getAudioVoiceStats().created,muted);
h.advance(1);assert.equal(N.getAudioVoiceStats().active,0);
assert.equal(h.rngCalls(),0);
N.setSoundEnabled(true);N.audio.weaponFire('rifle');assert.equal(N.weaponBus.parent,N.mixer.weapons);
const src=fs.readFileSync('js/audio/weaponSfx.js','utf8');
assert(!/setTimeout|setInterval|Math.random|bullets.push/.test(src),'audio no controla mecánicas');
console.log('RESULT weapon_sfx_engine: diez firmas, tres capas, ráfaga, sustain, watchdog, mute, routing y RNG OK');
