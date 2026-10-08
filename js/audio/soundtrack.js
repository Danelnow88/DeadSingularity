// Tema grabado: regiones musicales del mismo master, un contexto/mixer/allocator.
(() => {
  'use strict';
  const NV=window.NV;
  // document.currentScript existe SOLO durante la ejecución de este <script>: aquí
  // se captura la URL real del asset. En sandboxes headless sin document/URL queda
  // en null y se usa el fallback relativo a index.html (raíz del proyecto).
  let assetURL=null;
  try{
    const src=(typeof document!=='undefined'&&document.currentScript&&document.currentScript.src)||'';
    if(src)assetURL=new URL('../../assets/audio/main-theme-data.js?nv=theme-20261003',src).href;
  }catch(_){assetURL=null;}
  function assetSource(){
    if(assetURL)return assetURL;
    try{
      return new URL('assets/audio/main-theme-data.js?nv=theme-20261003',
        (typeof location!=='undefined'&&location.href)||undefined).href;
    }catch(_){return 'assets/audio/main-theme-data.js?nv=theme-20261003';}
  }
  // Pista grabada a ~100 BPM (compás = 2.4 s). Cortes en límites de sección reales,
  // medidos por energía en analysis.json: intro, drops de combate y clímax de jefe.
  const beat=.6, bar=beat*4;
  const regions=Object.freeze({
    menu:Object.freeze({start:0,end:24}),
    combat:Object.freeze({start:24,end:102}),
    boss:Object.freeze({start:114,end:164})
  });
  let status='idle',error=null,buffer=null,loading=null,active=null,pending=null;
  let desired='menu',scene='menu',suspended=true,resume=null,lastNow=null,changes=0;
  const nodes=new Set();
  // En producción el tema grabado es dueño de la música desde ANTES de cargar.
  // No usar el synth como relleno durante descarga/decode ni si falla el asset.
  const ownsMusic=typeof document!=='undefined'&&!!document.createElement&&!!document.head;
  // Ganancia base por escena. La tienda conserva el mismo tramo en segundo plano
  // (continuidad): mismo región, sólo baja el volumen, sin reiniciar ni cortar.
  function volume(state,region){return state==='shop'||state==='shop_enter'?.14
    :state==='wave_end'?.22:state==='menu'?.26:region==='boss'?.40:.36;}
  function gainAt(v,time){
    if(time<=v.fadeStart)return v.fadeFrom;
    const p=Math.min(1,(time-v.fadeStart)/v.fadeDuration);
    return v.fadeFrom+(v.level-v.fadeFrom)*p;
  }
  function fade(v,to,at,duration){
    const from=gainAt(v,at),p=v.voice.gain.gain;
    p.cancelScheduledValues(at);p.setValueAtTime(from,at);p.linearRampToValueAtTime(to,at+duration);
    v.fadeStart=at;v.fadeDuration=duration;v.fadeFrom=from;v.level=to;
  }
  function position(v,at){const r=regions[v.region],len=r.end-r.start;return r.start+((v.offset-r.start+Math.max(0,at-v.start))%len);}
  function stopAll(remember){
    if(active&&remember)resume={region:active.region,offset:position(active,NV.audioCtx.currentTime)};
    else if(!remember)resume=null;
    for(const v of nodes)v.voice.stop();nodes.clear();active=null;pending=null;lastNow=null;
  }
  function start(region,at,offset,level){
    const r=regions[region],voice=NV.soundVoice({buffer,loop:true,loopStart:r.start,loopEnd:r.end,
      offset:offset==null?r.start:offset,at,volume:.0001,attack:.005,filter:20000,channel:'music',priority:4});
    if(!voice)return null;
    const v={voice,region,start:at,offset:offset==null?r.start:offset,level:0,fadeStart:at,fadeDuration:.001,fadeFrom:0};
    nodes.add(v);fade(v,level,at,.45);return v;
  }
  function load(){
    if(loading)return loading;
    if(!NV.audioCtx||!NV.soundVoice)return Promise.resolve(false);
    // Sin DOM real (sandbox headless de tests) no se intenta cargar: queda en
    // 'idle', claimsMusic() es false y sigue la música procedural de synth.js.
    if(typeof document==='undefined'||!document.createElement||!document.head){loading=Promise.resolve(false);return loading;}
    status='loading';
    loading=new Promise((resolve,reject)=>{
      if(NV.mainThemeEncoded){resolve();return;}
      const script=document.createElement('script');script.src=assetSource();script.async=true;
      script.onload=()=>{script.remove();NV.mainThemeEncoded?resolve():reject(Error('MP3 ausente'));};
      script.onerror=()=>{script.remove();reject(Error('No se pudo cargar el tema principal'));};
      document.head.appendChild(script);
    }).then(async()=>{
      const raw=atob(NV.mainThemeEncoded),bytes=new Uint8Array(raw.length);
      for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
      delete NV.mainThemeEncoded;
      buffer=await NV.audioCtx.decodeAudioData(bytes.buffer);
      if(buffer.duration<regions.boss.end)throw Error('Duración inválida del tema');
      // Ganancia fija + fades de 5ms en los bordes de los cortes: sin clicks ni
      // timestretch. Se modifica sólo la copia PCM, el MP3 original queda intacto.
      for(let c=0;c<buffer.numberOfChannels;c++){
        const data=buffer.getChannelData(c),n=Math.round(buffer.sampleRate*.005);
        for(let i=0;i<data.length;i++)data[i]*=.82;
        for(const r of Object.values(regions))for(const [t,direction] of [[r.start,1],[r.end,-1]]){
          const p=Math.round(t*buffer.sampleRate);
          for(let i=0;i<n;i++){const j=direction===1?p+i:p-1-i;if(j>=0&&j<data.length)data[j]*=i/n;}
        }
      }
      status='ready';return true;
    }).catch(e=>{status='failed';error=e.message;buffer=null;console.warn('DeadSingularity soundtrack:',error);return false;});
    return loading;
  }
  function update(env={}){
    if(!NV.audioCtx)return;
    const state=env.state||(NV.getState?NV.getState():'menu');
    const snapshot=NV.alpha&&NV.alpha.snapshot?NV.alpha.snapshot():null;
    const paused=env.paused==null?!!(snapshot&&snapshot.paused):env.paused;
    const blocked=paused||env.hidden||document.hidden||!NV.soundOn||(NV.isAudioHidden&&NV.isAudioHidden());
    const eligible=['menu','playing','wave_end','shop_enter','shop'].includes(state);
    const now=NV.audioCtx.currentTime;
    if(blocked||!eligible){if(!suspended||active||pending)stopAll(eligible);suspended=true;return;}
    if(status==='idle')load();
    if(status!=='ready')return;
    const boss=env.boss!=null?!!env.boss:!!(NV.getBoss&&NV.getBoss());
    desired=state==='menu'?'menu':state==='playing'?(boss?'boss':'combat'):(active?active.region:resume?resume.region:'combat');
    NV.musicState.phase=state==='menu'?'menu':state==='shop'||state==='shop_enter'?'shop':desired==='boss'?'boss':'normal';
    NV.musicState.tempo=100;
    NV.musicTime+=(lastNow==null?0:Math.max(0,now-lastNow));lastNow=now;
    for(const v of nodes)if(v.retireAt<=now||v.voice.released){if(!v.voice.released)v.voice.stop();nodes.delete(v);if(v===active)active=null;}
    if(pending&&now>=pending.at){active=pending.next;pending=null;changes++;}
    const level=volume(state,desired);
    if(suspended||!active){
      // Traspaso limpio: corta las notas residuales del synth procedural (mismo
      // canal 'music') justo antes de crear la voz del tema grabado, para que no
      // se solapen en el arranque. Sólo si aún no hay voces grabadas activas.
      if(NV.stopAudioVoices&&nodes.size===0)NV.stopAudioVoices('music');
      active=start(desired,now+.02,resume&&resume.region===desired?resume.offset:null,level);
      resume=null;suspended=false;scene=state;return;
    }
    // Une demande qui change avant le compás annule la voix future précédente.
    if(pending&&pending.next.region!==desired){
      const old=pending.next;old.voice.stop();nodes.delete(old);pending=null;
      active.retireAt=Infinity;fade(active,level,now,.7);
    }
    if(desired!==active.region&&!pending){
      const r=regions[active.region],elapsed=position(active,now)-r.start;
      const at=now+(bar-elapsed%bar),next=start(desired,at,null,level);
      if(next){fade(active,0,at,.45);active.retireAt=at+.48;pending={at,next};}
    }
    if(scene!==state){
      if(!pending)fade(active,level,now,.7);
      else fade(pending.next,level,pending.at,.45);
      scene=state;
    }
  }
  NV.soundtrack={load,update,stop:()=>{stopAll(true);suspended=true;},
    claimsMusic:()=>ownsMusic,
    getDiagnostics:()=>({status,error,scene,desired,region:active&&active.region,
      position:active?position(active,NV.audioCtx.currentTime):resume&&resume.offset,
      gain:active?gainAt(active,NV.audioCtx.currentTime):0,pending:pending&&{region:pending.next.region,at:pending.at},
      voices:nodes.size,changes,tempo:100,duration:buffer&&buffer.duration,regions})};
})();
