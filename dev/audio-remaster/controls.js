(() => {
  'use strict';const NV=window.NV,$=id=>document.getElementById(id);let music=false,last=0,timer=null;
  NV.getState=()=>['menu','shop'].includes($('phase').value)?$('phase').value:'playing';NV.getBoss=()=>$('phase').value==='boss'?{}:null;NV.getWave=()=>+$('wave').value;
  const init=()=>{NV.initAudio();NV.applyMasterVolume(+$('volume').value);};
  function stop(){clearInterval(timer);timer=null;music=false;NV.audio.stopAllWeapons();NV.stopAudioVoices();NV.stopSectorLaserSound();}
  function button(label,fn,parent){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{init();fn();};$(parent).append(b);}
  for(const id of Object.keys(NV.WEAPON_SFX_PRESETS))button(id,()=>{clearInterval(timer);NV.audio.stopAllWeapons();let count=0;const fire=()=>{NV.audio.weaponFire(id);if(++count>=80){clearInterval(timer);NV.audio.stopAllWeapons();}};fire();if($('burst').checked)timer=setInterval(fire,100);},'weapons');
  const events={Hover:()=>NV.sfx.ui('hover'),Confirmar:()=>NV.sfx.ui('confirm'),Volver:()=>NV.sfx.ui('back'),Comprar:()=>NV.sfx.shopBuy(),Vender:()=>NV.sfx.shopSell(),Dash:()=>NV.sfx.dash(),Baja:()=>NV.sfx.enemyDeath('normal'),Élite:()=>NV.sfx.enemyDeath('elite'),'30 bajas':()=>{for(let i=0;i<30;i++)NV.sfx.enemyDeath('normal');},'30 shards':()=>{for(let i=0;i<30;i++)NV.sfx.pickup();},'Combo 50':()=>NV.sfx.combo(50),'Combo 500':()=>NV.sfx.combo(500),Cofre:()=>NV.sfx.chest(),Fusión:()=>NV.sfx.fuse(3),Nivel:()=>NV.sfx.playerLevelUp(),Daño:()=>NV.sfx.playerHit(),'Vida crítica':()=>NV.sfx.heartbeat(1),Escudo:()=>NV.sfx.shield(),Muerte:()=>NV.sfx.playerDeath(),Oleada:()=>NV.sfx.wave(),Victoria:()=>NV.sfx.victory(5),Boss:()=>NV.sfx.bossEnter(),Fase:()=>NV.sfx.bossPhaseShift(),'Boss derrotado':()=>NV.sfx.enemyDeath('boss'),Aviso:()=>NV.sfx.telegraph(),Spawn:()=>NV.sfx.spawn()};
  for(const [name,fn] of Object.entries(events))button(name,fn,'events');
  for(const p of ['boti','nova','rook','swarm'])button('Especial '+p,()=>NV.sfx.special(p),'events');
  for(const c of ['potion','bomb','freeze','overdrive','bounty','shield','magnet'])button(c,()=>NV.sfx.consume(c),'events');
  for(const b of Object.keys(NV.sfx.bossAttack))button('Ataque '+b,()=>NV.sfx.bossAttack[b](),'events');
  for(const kind of ['vent','rift','pulse'])button('Hazard '+kind,()=>NV.sfx.sectorHazard(kind),'events');
  button('Impacto enemigo',()=>NV.sfx.impact('enemy'),'events');
  button('Impacto boss',()=>NV.sfx.impact('boss'),'events');
  button('Mina',()=>NV.sfx.speakerMineArm(),'events');
  button('Explosión',()=>NV.sfx.speakerMineExplosion(),'events');
  for(const [label,state] of [['Láser: carga sostenida','telegraph'],['Láser: activo','active']])button(label,()=>NV.syncSectorLaserSound([{laserHead:true,state,stateTime:1,emergeTime:.45,telegraphTime:1.65}],{state:'playing'}),'events');
  $('stop').onclick=stop;$('mute').onclick=()=>{init();NV.setSoundEnabled(!NV.soundOn);};$('volume').oninput=()=>NV.applyMasterVolume(+$('volume').value);
  $('music').onclick=()=>{init();music=!music;if(!music)NV.stopAudioVoices('music');};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  function frame(t){const dt=Math.min(.1,(t-(last||t))/1000);last=t;if(music)NV.updateMusic(dt);NV.audio.update({state:'playing'});$('stats').textContent=JSON.stringify(NV.getAudioVoiceStats());requestAnimationFrame(frame);}requestAnimationFrame(frame);
})();
