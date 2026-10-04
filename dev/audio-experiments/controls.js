(() => {
  'use strict';
  const N=window.NV,E=N.audioExperiments,$=id=>document.getElementById(id);
  const storageKey='nv.audioLab.experiments.choice.v1';
  let choice={music:'hyperdrive',death:'current'},playing=false,last=0,burstLeft=0,nextDeath=0,nextShot=0,combatEnd=0;
  try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved&&E.music.some(p=>p.id===saved.music)&&E.deaths.some(p=>p.id===saved.death))choice={music:saved.music,death:saved.death};}catch(_){}
  N.getState=()=> 'playing';N.getWave=()=>1;N.getBoss=()=>null;
  const init=()=>{N.initAudio();N.applyMasterVolume(+$('volume').value);};
  function exportChoice(){return {version:1,lab:'neon-void-audio-experiments-20261003',musicRevision:E.musicRevision,music:choice.music,enemyDeath:choice.death};}
  function render(){
    $('from').disabled=choice.music==='current';
    for(const type of ['music','death'])for(const b of $(type+'-cards').children){const checked=b.dataset.id===choice[type];b.setAttribute('aria-checked',String(checked));b.tabIndex=checked?0:-1;}
    $('choice-summary').textContent=E.music.find(p=>p.id===choice.music).name+' · '+E.deaths.find(p=>p.id===choice.death).name;
    $('configuration').value=JSON.stringify(exportChoice(),null,2);
    try{localStorage.setItem(storageKey,JSON.stringify(choice));}catch(_){}
  }
  function stop(){playing=false;burstLeft=0;combatEnd=0;N.audio.stopAllWeapons();N.stopAudioVoices();$('status').textContent='Detenido';}
  function play(){init();E.setMusic(choice.music,+$('from').value);playing=true;last=performance.now();$('status').textContent='Escuchando '+E.music.find(p=>p.id===choice.music).name;}
  function hit(){E.death(choice.death,$('kind').value,{pan:0});}
  function cards(type,profiles){
    for(const p of profiles){
      const b=document.createElement('button');b.className='card';b.type='button';b.dataset.id=p.id;
      b.setAttribute('role','radio');b.setAttribute('aria-checked','false');
      for(const [cls,text] of [['tag',p.tag],['title',p.name],['description',p.description]]){const el=document.createElement(cls==='title'?'strong':'span');el.className=cls;el.textContent=text;b.append(el);}
      b.onclick=()=>{choice[type]=p.id;render();if(type==='music')play();else{init();burstLeft=0;hit();}};
      b.onkeydown=e=>{if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End'].includes(e.key)){
        e.preventDefault();const list=[...b.parentElement.children],direction=['ArrowRight','ArrowDown'].includes(e.key)?1:-1;
        const index=e.key==='Home'?0:e.key==='End'?list.length-1:(list.indexOf(b)+direction+list.length)%list.length;
        list[index].focus();list[index].click();
      }};
      $(type+'-cards').append(b);
    }
  }
  cards('music',E.music);cards('death',E.deaths);render();
  $('stop').onclick=stop;$('restart').onclick=play;
  $('from').onchange=()=>{if(playing)play();};
  $('single').onclick=()=>{init();hit();};
  $('burst').onclick=()=>{init();combatEnd=0;burstLeft=12;nextDeath=N.audioCtx.currentTime;};
  $('combat').onclick=()=>{play();burstLeft=0;nextDeath=nextShot=N.audioCtx.currentTime;combatEnd=nextShot+10;};
  $('without-music').onclick=()=>{playing=false;combatEnd=0;N.audio.stopAllWeapons();N.stopAudioVoices('music');init();hit();$('status').textContent='Bajas sin música';};
  $('mute').onclick=()=>{init();N.setSoundEnabled(!N.soundOn);$('mute').textContent=N.soundOn?'Silenciar':'Activar sonido';$('mute').setAttribute('aria-pressed',String(!N.soundOn));};
  $('volume').oninput=()=>{if(N.audioCtx)N.applyMasterVolume(+$('volume').value);};
  $('copy').onclick=async()=>{
    const text=$('configuration').value;let copied=false;
    try{if(navigator.clipboard){await navigator.clipboard.writeText(text);copied=true;}}catch(_){}
    if(!copied){$('configuration').focus();$('configuration').select();try{copied=document.execCommand('copy');}catch(_){} }
    $('copy-status').textContent=copied?'Copiado. Pegalo en el chat.':'Seleccioná y copiá el texto del recuadro.';
  };
  document.addEventListener('visibilitychange',()=>{N.setAudioHidden(document.hidden);if(document.hidden)stop();});
  window.addEventListener('blur',stop);window.addEventListener('pagehide',stop);
  function frame(t){
    const dt=Math.min(.1,Math.max(0,(t-(last||t))/1000));last=t;
    if(playing)N.updateMusic(dt);
    if(N.audioCtx){
      const now=N.audioCtx.currentTime;
      if(burstLeft&&now>=nextDeath){hit();burstLeft--;nextDeath=now+.16;}
      if(combatEnd){
        if(now>=combatEnd){combatEnd=0;N.audio.stopAllWeapons();}
        else {if(now>=nextShot){N.audio.weaponFire('smg');nextShot=now+.1;}if(now>=nextDeath){hit();nextDeath=now+.29;}}
      }
      N.audio.update({state:'playing'});
      const s=N.getAudioVoiceStats();$('stats').textContent=s.active+' / 48 voces · música '+s.byChannel.music+' / 14 · no modifica la partida';
      if(playing&&choice.music!=='current'){const d=E.getDiagnostics();$('stats').textContent+=' · '+d.section+' · compás '+(d.arrangementBar+1)+'/64';}
    }
    requestAnimationFrame(frame);
  }
  window.audioExperimentLab={getChoice:exportChoice,stop,isPlaying:()=>playing};
  requestAnimationFrame(frame);
})();
