const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),make=require('./_audioHarness.cjs');
const source=fs.readFileSync('js/audio/soundtrack.js','utf8');
// DOM real: el tema grabado reserva la música antes de descarga/decode.
const h=make(),document={head:{appendChild(){}},createElement(){return {remove(){}}},hidden:false};
vm.runInNewContext(source,{window:{NV:h.NV},document,console});
assert(h.NV.soundtrack.claimsMusic());
const created=h.NV.getAudioVoiceStats().created;
h.NV.updateMusic(.1);assert.equal(h.NV.getAudioVoiceStats().created,created,'no synth mientras está idle');
h.NV.soundtrack.update({state:'menu'});
assert.equal(h.NV.soundtrack.getDiagnostics().status,'loading');
h.advance(1);h.NV.updateMusic(.1);
assert.equal(h.NV.getAudioVoiceStats().created,created,'no synth durante carga');
// Los efectos siguen funcionando mientras la música carga.
h.NV.sfx.damage();assert(h.NV.getAudioVoiceStats().created>created);
const ramps=[],gain=h.NV.mixer.music.gain;let held=false;
gain.cancelAndHoldAtTime=()=>{held=true};gain.linearRampToValueAtTime=(v,t)=>ramps.push({v,t});
h.NV.duck('music',.2,.18);
assert(held,'preservar valor audible en retrigger');
assert(Math.abs(ramps[0].t-(h.ctx.currentTime+.10))<1e-9,'ataque gradual');
assert(Math.abs(ramps[1].t-(h.ctx.currentTime+.18+.45))<1e-9,'recuperación gradual');
const headless=make();vm.runInNewContext(source,{window:{NV:headless.NV},console});
assert(!headless.NV.soundtrack.claimsMusic(),'compatibilidad de tests/labs sin DOM');
console.log('PASS audio_soundtrack_ownership: exclusividad desde carga, SFX intactos, duck continuo y gradual');
