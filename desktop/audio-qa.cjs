// La misma suite usa Web Audio real en Edge y en el EXE. Perfil QA, sin saves reales.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=async function(evaluate,saveClip,sourceRoot=path.resolve(__dirname,'..')){
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  await evaluate(`NV.initAudio();NV.setSoundEnabled(true);if(NV.getState()==='playing')NV.input.togglePause();`);
  await wait(900);
  const live=await evaluate(`(()=>{NV.setAudioHidden(false);NV.sfx.special('boti');NV.audio.weaponFire('smg');return {state:NV.getState(),voices:NV.getAudioVoiceStats(),channels:Object.keys(NV.mixer),compressor:!!NV.audioCompressor,ceiling:!!NV.audioCeiling};})()`);
  assert(live.compressor&&live.ceiling);assert.equal(live.channels.length,6);assert(live.voices.active>0&&live.voices.active<=48);
  await evaluate('NV.setSoundEnabled(false)');await wait(1000);
  assert.equal(await evaluate('NV.getAudioVoiceStats().active'),0,'mute limpia voces reales');
  await evaluate('NV.setSoundEnabled(true);NV.audio.weaponStart("flamethrower");NV.audio.update({state:"playing",paused:true})');
  assert.equal(await evaluate('NV.audio.getWeaponSfxStats().continuous.flamethrower'),false);
  const sources=['voices','synth','weaponSfx'].map(f=>fs.readFileSync(path.join(sourceRoot,'js/audio',f+'.js'),'utf8')).join('\n');
  const results=[];
  for(const scenario of ['weapons','density','ui','menu','shop','threshold','foundry','fracture','void-heart','boss','muted']){
    const seconds=scenario==='weapons'?21:['threshold','foundry','fracture','void-heart','boss'].includes(scenario)?32:8;
    // Instancia OFFLINE aislada de las mismas fuentes, no otro motor de producción.
    const output=await evaluate(`(async()=>{
      const raw=new OfflineAudioContext(2,24000*${seconds},24000);
      const window={NV:{},AudioContext:function(){return raw;}},document=undefined;
      ${sources}
      const N=window.NV;N.initAudio();N.applyMasterVolume(1);
      const kind=${JSON.stringify(scenario)},duration=${seconds};
      N.getState=()=>kind==='menu'||kind==='shop'?kind:'playing';N.getBoss=()=>kind==='boss'?{}:null;
      N.getWave=()=>({'foundry':6,'fracture':11,'void-heart':16}[kind]||1);
      const ids=Object.keys(N.WEAPON_SFX_PRESETS);let peakVoices=0;
      function tick(i){
        if(kind==='muted'){N.setSoundEnabled(false);N.sfx.playerDeath();N.audio.weaponFire('railgun');N.updateMusic(.1);return;}
        if(kind==='weapons'){const id=ids[Math.min(9,Math.floor(i/20))];N.audio.weaponFire(id);if(i%20===19)N.audio.stopAllWeapons();}
        else if(kind==='density'){
          N.updateMusic(.1);N.audio.weaponFire('smg');if(i%3===0){for(let k=0;k<30;k++){N.sfx.enemyDeath(k===0?'elite':'normal');N.sfx.pickup();}}
          N.sfx.combo((i+1)*5);if(i%12===0)N.sfx.playerHit();if(i%19===0)N.sfx.special(['boti','nova','rook','swarm'][Math.floor(i/19)%4]);
          if(i===68)N.sfx.victory(5);
        }else if(kind==='ui'){
          if(i%3===0)N.sfx.ui(['hover','select','confirm','back','open','close','setting'][Math.floor(i/3)%7]);
          if(i%17===0)N.sfx.shopBuy();
        }else N.updateMusic(.1);
        peakVoices=Math.max(peakVoices,N.getAudioVoiceStats().active);
      }
      tick(0);const suspensions=[];
      for(let i=1;i<duration*10-8;i++)suspensions.push([i,raw.suspend(i*.1)]);
      const rendered=raw.startRendering();
      for(const [i,p] of suspensions){await p;tick(i);await raw.resume();}
      const b=await rendered;let peak=0,sum=0,delta=0,previous=0;
      const pcm=new Uint8Array(b.length*4),view=new DataView(pcm.buffer);
      for(let i=0;i<b.length;i++)for(let c=0;c<2;c++){const v=b.getChannelData(c)[i];peak=Math.max(peak,Math.abs(v));sum+=v*v;if(c===0){delta+=(v-previous)**2;previous=v;}view.setInt16((i*2+c)*2,Math.round(Math.max(-1,Math.min(1,v))*32767),true);}
      let binary='';for(let i=0;i<pcm.length;i+=8192)binary+=String.fromCharCode(...pcm.subarray(i,i+8192));
      return {kind,peak,rms:Math.sqrt(sum/(b.length*2)),highFrequencyProxy:delta/(sum/2||1),peakVoices,sampleRate:b.sampleRate,pcm:btoa(binary)};
    })()`);
    assert(output.peak<.90,scenario+' supera techo');assert(output.peakVoices<=48);
    if(scenario==='muted')assert.equal(output.peak,0);else assert(output.rms>.0008,scenario+' inaudible');
    if(saveClip)await saveClip(scenario,output);
    delete output.pcm;results.push(output);
  }
  await evaluate('NV.setSoundEnabled(true)');
  return {pass:true,live,results,subjectiveListening:'Pendiente escucha humana prolongada; RMS y picos no evalúan gusto/fatiga.'};
};
module.exports.saveWav=function(file,result){
  const pcm=Buffer.from(result.pcm,'base64'),header=Buffer.alloc(44);
  header.write('RIFF');header.writeUInt32LE(36+pcm.length,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);
  header.writeUInt16LE(1,20);header.writeUInt16LE(2,22);header.writeUInt32LE(result.sampleRate,24);header.writeUInt32LE(result.sampleRate*4,28);
  header.writeUInt16LE(4,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);
  fs.writeFileSync(file,Buffer.concat([header,pcm]));
};
