// Verificación de la comparativa: navegador real y render de las fuentes reales.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=async function(evaluate,shot,saveClip,resize,options={}){
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  assert(await evaluate('document.body.innerText.includes("Encontrar") && !!NV.audioExperiments'));
  const layouts=[];
  for(const [width,height] of [[1280,800],[915,412],[844,390]]){
    await resize(width,height);await wait(80);
    const layout=await evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth,cards:document.querySelectorAll(".card").length})');
    assert.equal(layout.cards,8);assert(layout.scroll<=layout.width,'overflow horizontal');
    layouts.push(layout);await shot('experiments-'+width);
  }
  await resize(1280,800);
  for(const id of ['hyperdrive-plus','hyperdrive','gravity','gravity-plus']){
    await evaluate(`document.querySelector('#music-cards [data-id="${id}"]').click()`);await wait(220);
    assert.equal(await evaluate('NV.audioExperiments.getSelection()'),id);
    assert(await evaluate('audioExperimentLab.isPlaying() && NV.getAudioVoiceStats().active>0'));
    assert.equal(await evaluate('document.querySelectorAll("#music-cards [aria-checked=true]").length'),1);
  }
  for(const id of ['current','core','magnetic','scrap']){
    await evaluate(`document.querySelector('#death-cards [data-id="${id}"]').click()`);await wait(100);
    assert.equal(await evaluate('audioExperimentLab.getChoice().enemyDeath'),id);
  }
  const chosen=await evaluate('JSON.parse(document.getElementById("configuration").value)');
  assert.equal(chosen.music,'gravity-plus');assert.equal(chosen.enemyDeath,'scrap');
  assert.equal(chosen.musicRevision,'dark-v3');
  await evaluate('document.getElementById("from").value="7";document.getElementById("from").dispatchEvent(new Event("change"))');await wait(80);
  assert.equal(await evaluate('NV.audioExperiments.getDiagnostics().arrangementBar'),7);
  await wait(1900);
  assert.equal(await evaluate('NV.audioExperiments.getDiagnostics().arrangementBar'),8);
  await evaluate('document.getElementById("from").value="0"');
  await evaluate('document.querySelector("#music-cards [data-id=gravity]").dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowLeft",bubbles:true}))');
  assert.equal(await evaluate('audioExperimentLab.getChoice().music'),'hyperdrive');
  await evaluate('document.getElementById("combat").click()');await wait(700);
  assert(await evaluate('NV.getAudioVoiceStats().active<=48'));
  await evaluate('document.getElementById("mute").click()');await wait(100);
  assert.equal(await evaluate('NV.getAudioVoiceStats().active'),0);
  await evaluate('document.getElementById("mute").click();document.getElementById("stop").click()');await wait(100);
  assert.equal(await evaluate('NV.getAudioVoiceStats().active'),0);
  await evaluate('document.getElementById("restart").click();window.dispatchEvent(new Event("blur"))');await wait(100);
  assert.equal(await evaluate('NV.getAudioVoiceStats().active'),0,'blur no detiene');
  const sources=['js/audio/voices.js','js/audio/synth.js','js/audio/weaponSfx.js','dev/audio-experiments/experiments.js']
    .map(f=>fs.readFileSync(path.resolve(__dirname,'../..',f),'utf8')).join('\n');
  const scenarios=[...['current','hyperdrive-plus','hyperdrive','gravity','gravity-plus'].map(id=>['music',id]),
    ...['current','core','magnetic','scrap'].map(id=>['death',id]),
    ...['hyperdrive-plus','hyperdrive','gravity','gravity-plus'].map(id=>['density',id])];
  const results=[];
  for(const [type,id] of scenarios){
    const duration=type==='music'?110:type==='density'?10:6;
    const result=await evaluate(`(async()=>{
      const raw=new OfflineAudioContext(2,24000*${duration},24000);
      const window={NV:{},AudioContext:function(){return raw;}};
      ${sources}
      const N=window.NV;N.initAudio();N.applyMasterVolume(.65);N.getState=()=> 'playing';N.getWave=()=>1;N.getBoss=()=>null;
      const type=${JSON.stringify(type)},id=${JSON.stringify(id)},duration=${duration};
      N.audioExperiments.setMusic(type==='death'?'current':id);
      const deathId=type==='density'?({'hyperdrive-plus':'core',hyperdrive:'magnetic',gravity:'scrap','gravity-plus':'scrap'}[id]):id;
      let peakVoices=0;
      function tick(i){
        if(type!=='death')N.updateMusic(.1);
        if(type==='density'){N.audio.weaponFire('smg');if(i%3===0)N.audioExperiments.death(deathId,i%9?'normal':'elite');}
        if(type==='death'&&i%6===0)N.audioExperiments.death(id,i<20?'normal':i<40?'elite':'boss');
        peakVoices=Math.max(peakVoices,N.getAudioVoiceStats().active);
      }
      tick(0);const suspensions=[];
      for(let i=1;i<duration*10-8;i++)suspensions.push([i,raw.suspend(i*.1)]);
      const rendered=raw.startRendering();for(const [i,p] of suspensions){await p;tick(i);await raw.resume();}
      const b=await rendered,pcm=new Uint8Array(b.length*4),view=new DataView(pcm.buffer);let peak=0,sum=0;
      for(let i=0;i<b.length;i++)for(let c=0;c<2;c++){const v=b.getChannelData(c)[i];peak=Math.max(peak,Math.abs(v));sum+=v*v;view.setInt16((i*2+c)*2,Math.round(Math.max(-1,Math.min(1,v))*32767),true);}
      let binary='';for(let i=0;i<pcm.length;i+=8192)binary+=String.fromCharCode(...pcm.subarray(i,i+8192));
      return {kind:type+'-'+id,peak,rms:Math.sqrt(sum/(b.length*2)),peakVoices,sampleRate:b.sampleRate,pcm:btoa(binary)};
    })()`);
    assert(result.peak<.90&&result.rms>.0008&&result.peakVoices<=48,result.kind+' mezcla inválida');
    await saveClip(result.kind,result);delete result.pcm;results.push(result);
  }
  for(const type of ['music','death']){
    if(type==='music'&&options.levelProbe)continue; // Sólo diagnóstico previo a calibrar, nunca validación final.
    const reference=results.find(r=>r.kind===type+'-current');
    for(const candidate of results.filter(r=>r.kind.startsWith(type+'-')))
      assert(Math.abs(20*Math.log10(candidate.rms/reference.rms))<1,type+' no está igualado aproximadamente');
  }
  return {pass:true,levelMatched:!options.levelProbe,layouts,results,choice:chosen,subjectiveListening:'Elegir tras escuchar; no certifica adicción, gusto ni un ranking mundial. Igualación RMS aproximada, no LUFS.'};
};
