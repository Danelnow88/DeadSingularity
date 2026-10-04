// Exclusivo del laboratorio. Reutiliza reloj, AudioContext, mixer y allocator
// reales; NO se carga desde index.html del juego ni persiste preferencias de juego.
(() => {
  'use strict';
  const N=window.NV,original=N.soundVoice,originalUpdate=N.updateMusic;
  const music=[
    {id:'hyperdrive-plus',name:'Hyperdrive · reactor nocturno',tag:'A · EVOLUCIÓN',description:'La base de B con respuestas melódicas, apertura progresiva, anticipaciones y un clímax más desarrollado.'},
    {id:'hyperdrive',name:'Hyperdrive · neón negro',tag:'B · DARK V2',description:'Pulso electrónico industrial. Bajo insistente, secuencia hipnótica y cargas antes del impacto.'},
    {id:'gravity',name:'Gravedad abisal',tag:'C · DARK V2',description:'Trap pesado y futurista. Bajo áspero filtrado, metal corto, vacío tenso y regreso con peso.'},
    {id:'gravity-plus',name:'Gravedad · singularidad',tag:'D · EVOLUCIÓN',description:'La base de C con graves articulados, motivos que se responden, tensión creciente y drops más contrastados.'},
  ];
  const deaths=[
    {id:'current',name:'Actual · referencia',tag:'0',description:'El sonido de baja que ya escuchás in game.'},
    {id:'core',name:'Crack de núcleo',tag:'1',description:'Crack nítido + golpe corporal + residuo de energía. Corto y contundente.'},
    {id:'magnetic',name:'Pop magnético',tag:'2',description:'Compresión, pop elástico y liberación brillante. Más redondo y juguetón.'},
    {id:'scrap',name:'Chatarra estelar',tag:'3',description:'Rotura metálica, peso grave y fragmentos cortos. Más físico e industrial.'},
  ];
  // Composiciones originales: vocabulario menor, pedal y tensiones breves que
  // resuelven. No samples ni transcripciones de artistas/canciones de referencia.
  const themes={
    pulsar:{roots:[0,5,0,7,0,8,7,-1],octave:1,
      riffs:[[0,7,10,7,1,0,7,3],[12,7,3,0,10,7,1,0],[0,3,7,10,7,1,0,7]],
      kicks:[[0,3,6,10,14],[0,2,6,10,12,14]]},
    hyperdrive:{roots:[0,0,-2,0,3,0,-5,-2],octave:1,
      riffs:[[0,0,7,0,1,0,7,10],[12,7,1,0,10,7,1,0],[0,7,0,3,0,1,7,0]],
      kicks:[[0,4,8,12],[0,4,8,12]]},
    gravity:{roots:[0,0,7,0,3,0,-1,0],octave:.5,
      riffs:[[0,1,7,0,10,7,1,0],[0,7,1,0,3,1,0,7],[12,10,7,1,0,7,3,0]],
      kicks:[[0,3,6,10,14],[0,2,4,10,14]]},
  };
  const sections=['umbral oscuro','impulso','mutación','respiro activo','segundo drop','vacío tenso','respuesta','clímax'];
  // Igualación aproximada de energía frente a la referencia, medida en los
  // renders QA. No es normalización LUFS ni garantiza igual volumen percibido.
  const musicLevels={pulsar:.927,hyperdrive:.955,gravity:1.166,'hyperdrive-plus':.955,'gravity-plus':1.166};
  const deathLevels={core:.818,magnetic:.675,scrap:.739};
  let selected='current';
  const heardSteps=new Set(),diagnostics={steps:0,notes:0,arrangementBar:0,section:'referencia',suspense:false};
  function voice(spec,at){diagnostics.notes++;return original({...spec,volume:spec.volume*musicLevels[selected],at,channel:'music'});}
  function score(at,step=N.musicState.step,counter=N.musicState.scheduledSteps){
    const evolved=selected.endsWith('-plus'),base=selected.replace('-plus','');
    const m=N.musicState,bar=Math.floor(counter/16)%64,part=Math.floor(bar/8);
    const drop=[1,4,7].includes(part),breakdown=part===3||part===5;
    const profile=N.musicProfileForWave(m.playingWave||1);
    const theme=themes[base],tonic=m.playingPhase==='boss'?49:profile.chordRoots[0];
    const progression=theme.roots[(bar+(part===6?2:0))%8];
    const root=Math.max(32,tonic*theme.octave*Math.pow(2,progression/12));
    const beat=60/m.tempo/4,build=bar%8>=6,suspense=bar%8===7&&step>=8;
    const gain=suspense?.55:breakdown?.72:drop?1:part===0?.84:.91;
    const emit=(role,s,offset=0)=>voice({...s,role:'experiment-'+role},at+offset);
    const kickSteps=theme.kicks[part===2||part===6||bar%4===2?1:0];
    if(kickSteps.includes(step)&&!suspense&&(!breakdown||build||step===0||step===8||step===10)){
      const heavy=base==='gravity';
      const velocity=step===0?1:step===14?.8:.94;
      emit('kick',{freq:heavy?175:150,endFreq:heavy?42:48,glideTime:.045,
        type:'sine',duration:heavy?.17:.13,attack:.002,filter:850,volume:(heavy?.22:.19)*gain*velocity});
      const next=kickSteps.find(s=>s>step),gap=(next==null?16-step:next-step)*beat;
      const duration=Math.min(heavy?.60:.40,gap-.018);
      const interval=base==='hyperdrive'&&part>0?[0,0,7,-5][Math.floor(step/4)]:drop&&step===14&&bar%2?7:0;
      const bass=Math.max(32,root*Math.pow(2,interval/12));
      emit('808',{freq:bass*(evolved?1.075:1.035),endFreq:bass,glideTime:evolved?.095:.065,type:heavy?'sawtooth':'triangle',
        duration,attack:.011,hold:duration*(drop?.48:.32),filter:heavy?(evolved?560:420):520,endFilter:heavy?110:260,
        volume:(heavy?.083:.115)*gain*velocity});
    }
    if(step===8&&!suspense){
      emit('snare',{noise:true,duration:base==='gravity'?.12:.14,attack:.002,
        filter:base==='gravity'?1850:2700,endFilter:1150,q:.72,volume:.13*gain});
      emit('snare-body',{freq:195,endFreq:140,type:'triangle',duration:.10,filter:1250,volume:.043*gain});
    }
    if(step%2===0&&(!breakdown||build||step%4===2)){
      const roll=step===14&&(build||bar%4===3);
      const hits=roll?(base==='hyperdrive'?4:3):1;
      for(let i=0;i<hits;i++)emit('hat',{noise:true,filter:6100,q:.7,
        duration:roll?.022:.034,volume:(step%4===0?.041:bar%2?.031:.025)*gain*(1-i*.14),
        pan:step%4===0?.19:-.19},roll?beat*i/hits:step%4===2?beat*.05:0);
    }
    if(step===0){
      // Quinta hueca y tercera menor; tritono sólo en el vacío de tensión.
      const chord=part===5?[0,6]:progression===8&&selected==='pulsar'?[0,7]:[0,3];
      for(const [i,note] of chord.entries())emit('pad',{
        freq:root*2*Math.pow(2,note/12),type:'triangle',filter:breakdown?650:950,
        duration:beat*16-.10,attack:.22,hold:beat*(breakdown?8:5),volume:breakdown?.024:.017,
        pan:i?.3:-.3,priority:-1});
    }
    if(suspense&&step===8){
      // Medio compás de carga, no una canción que se apaga durante segundos.
      emit('riser',{noise:true,filter:320,endFilter:1900,q:.55,duration:beat*7.7,
        attack:.08,hold:beat*3,volume:.032,pan:bar%2?.12:-.12,priority:-1});
      emit('tension',{freq:root*2,endFreq:root*2*Math.pow(2,1/12),type:'triangle',
        duration:beat*7.5,attack:.08,hold:beat*3,filter:1000,volume:.026});
    }
    if((part===2||part===6||drop)&&step===6&&!suspense){
      emit('metal',{freq:base==='gravity'?730:980,endFreq:280,type:'square',
        duration:.045,filter:1400,volume:base==='gravity'?.017:.012,pan:bar%2?.25:-.25},beat*.1);
    }
    const melodic=base==='hyperdrive'?step%2===0:base==='gravity'?[0,6,10,14].includes(step):[0,2,4,6,10,12,14].includes(step);
    if(melodic&&!suspense&&(!breakdown||build||[0,6,10].includes(step))){
      const index=base==='gravity'?[0,6,10,14].indexOf(step):Math.floor(step/2);
      const motif=theme.riffs[(part===2||part===6)?1:part===7?2:0];
      const semitone=motif[(index+(bar%2?2:0)+(evolved&&bar%4>=2?1:0))%8]+(evolved&&part===7&&index===0?12:0);
      const freq=root*4*Math.pow(2,semitone/12);
      const duration=base==='hyperdrive'?.145:base==='gravity'?.23:.21;
      emit('hook',{freq,type:base==='gravity'?'triangle':'sawtooth',duration,attack:.012,hold:.025,
        filter:(drop?1750:breakdown?850:1300)+(evolved?180*(bar%4):0),endFilter:base==='gravity'?620:780,
        volume:selected==='pulsar'?.048:.042,pan:bar%2?.15:-.15});
      // Una respuesta afinada, no otra batería ni una pared de ecos.
      if((drop||part===6)&&step===10)emit('answer',{freq:freq*1.5,type:'sine',duration:.19,
        filter:2300,volume:.023,pan:bar%2?-.3:.3},beat*.65);
    }
    if(build&&step===14)emit('pickup',{freq:root*4*Math.pow(2,1/12),endFreq:root*4,
      type:'triangle',duration:beat*1.8,filter:1500,volume:.026,pan:-.2},beat*.35);
    // Réplicas afinadas y anticipaciones: enriquecen el arreglo sin otra batería.
    if(evolved&&!suspense&&step===12&&(drop||part===6)&&bar%2===1){
      const intervals=base==='hyperdrive'?[7,10,3,7]:[3,7,10,1];
      emit('countermelody',{freq:root*8*Math.pow(2,intervals[bar%4]/12),type:'sine',
        duration:beat*2.7,attack:.012,filter:1900,endFilter:800,volume:.022,pan:bar%4===1?-.38:.38},beat*.4);
    }
    if(evolved&&step===0&&[8,32,56].includes(bar))emit('drop-bloom',{
      freq:root*4,endFreq:root*2,type:'triangle',duration:beat*3.5,attack:.02,
      filter:2100,endFilter:500,volume:.032,pan:.1,priority:-1});
    if(evolved&&build&&step===6)emit('anticipation',{
      freq:root*4*Math.pow(2,(base==='gravity'?1:10)/12),endFreq:root*4,
      type:'sine',duration:beat*1.4,attack:.02,filter:1500,volume:.019,pan:.28});
    diagnostics.steps++;
    Object.assign(diagnostics,{arrangementBar:bar,section:sections[part],suspense});
  }
  N.soundVoice=spec=>{
    const m=N.musicState;
    if(selected==='current'||spec.channel!=='music'||!spec.role||!['normal','boss'].includes(m.playingPhase))return original(spec);
    // El score real ya avanzó el reloj. Interceptar una sola vez por paso evita
    // baterías superpuestas; el arreglo experimental decide sus propios respiros.
    if(!heardSteps.has(m.scheduledSteps)){heardSteps.add(m.scheduledSteps);score(m.nextNoteAt);}
    return null;
  };
  N.updateMusic=dt=>{
    const before=N.musicState.scheduledSteps||0;heardSteps.clear();originalUpdate(dt);
    const m=N.musicState,after=m.scheduledSteps||0;
    if(selected==='current'||!N.soundOn||N.isAudioHidden()||!['normal','boss'].includes(m.playingPhase))return;
    // Recuperar pasos silenciosos del score base usando SU reloj ya avanzado.
    // Esto permite un arreglo de 64 compases sin heredar huecos ajenos del loop
    // de 16; no hay otro timer, BPM ni acumulador de tiempo en el laboratorio.
    const beat=60/m.tempo/4;
    for(let counter=before;counter<after;counter++)if(!heardSteps.has(counter)){
      const remaining=after-counter;
      score(m.nextNoteAt-remaining*beat,(m.nextStep-remaining+32)%16,counter);
    }
  };
  function restart(fromBar=0){
    if(!Number.isInteger(fromBar)||fromBar<0||fromBar>63)throw Error('Compás inválido');
    N.stopAudioVoices('music');
    Object.assign(N.musicState,{step:0,bar:fromBar?(fromBar+15)%16:0,lastBeat:0,nextStep:0,scheduledSteps:fromBar*16,
      nextNoteAt:undefined,playingPhase:undefined,wasInactive:false});
    N.musicTime=0;heardSteps.clear();diagnostics.steps=diagnostics.notes=0;
  }
  function setMusic(id,fromBar=0){if(id!=='current'&&!music.some(p=>p.id===id))throw Error('Tema desconocido');selected=id;restart(id==='current'?0:fromBar);}
  function death(id,kind='normal',opts={}){
    if(!deaths.some(p=>p.id===id)||!['normal','elite','boss'].includes(kind))throw Error('Baja desconocida');
    if(id==='current')return N.sfx.enemyDeath(kind,opts);
    if(!N.allowAudioEvent('audio-experiment-death-'+kind,kind==='boss'?.5:kind==='elite'?.09:.055))return;
    const scale=kind==='boss'?.58:kind==='elite'?.82:1;
    const length=kind==='boss'?2:kind==='elite'?1.22:1;
    const power=kind==='boss'?1.2:kind==='elite'?1.08:1;
    const pitch=scale*(.975+N.audioRandom()*.05),now=N.audioCtx.currentTime;
    const emit=(s,delay=0)=>original({...opts,...s,freq:s.freq&&s.freq*pitch,
      endFreq:s.endFreq&&s.endFreq*pitch,duration:s.duration*length,
      volume:s.volume*power*deathLevels[id],at:now+delay,channel:'sfxEnemies',priority:kind==='boss'?4:2});
    if(kind==='boss')N.duck('music',.12,.45);
    if(id==='core'){
      emit({freq:225,endFreq:76,type:'triangle',duration:.14,glideTime:.065,filter:1500,volume:.14});
      emit({noise:true,filter:2700,endFilter:850,q:.6,duration:.055,volume:.115});
      emit({freq:392,endFreq:196,type:'sine',duration:.10,filter:1300,volume:.035},.016);
    }else if(id==='magnetic'){
      emit({freq:310,endFreq:85,type:'sine',duration:.11,glideTime:.065,filter:2000,volume:.16});
      emit({noise:true,filter:1550,endFilter:550,q:.85,duration:.045,volume:.078});
      emit({freq:480,endFreq:245,type:'triangle',duration:.11,filter:1600,volume:.046},.027);
    }else{
      emit({freq:170,endFreq:57,type:'triangle',duration:.18,glideTime:.09,filter:1150,volume:.14});
      emit({freq:1150,endFreq:370,type:'square',duration:.045,filter:1850,volume:.042});
      emit({noise:true,filter:780,endFilter:210,q:.6,duration:.095,volume:.10},.008);
    }
  }
  N.audioExperiments={music,deaths,setMusic,restart,death,getSelection:()=>selected,
    getDiagnostics:()=>({...diagnostics}),version:1,musicRevision:'dark-v3',arrangementBars:64};
})();
