const fs=require('node:fs'),vm=require('node:vm');
module.exports=function(){
  const nodes=[],events=[];let rngCalls=0;
  const param=()=>({value:0,setValueAtTime(v,t){this.value=v;events.push({v,t});},linearRampToValueAtTime(v,t){this.value=v;events.push({v,t});},exponentialRampToValueAtTime(v,t){this.value=v;events.push({v,t});},cancelScheduledValues(){}});
  function node(kind){const n={kind,connections:[],connect(to){this.connections.push(to);return to;},disconnect(){this.disconnected=true;},start(t){this.started=t||0;},stop(t){this.ended=t==null?ctx.currentTime:t;}};nodes.push(n);return n;}
  const ctx={currentTime:0,sampleRate:8000,state:'running',destination:{},resume:()=>Promise.resolve(),
    createGain(){return Object.assign(node('gain'),{gain:param()});},
    createOscillator(){return Object.assign(node('osc'),{frequency:param()});},
    createBiquadFilter(){return Object.assign(node('filter'),{frequency:param(),Q:param()});},
    createStereoPanner(){return Object.assign(node('pan'),{pan:param()});},
    createBuffer(c,n,sr){return {getChannelData:()=>new Float32Array(n),duration:n/sr};},
    createBufferSource(){return node('buffer');},
    createWaveShaper(){return node('shaper');},
    createDynamicsCompressor(){const c=node('compressor');for(const p of ['threshold','knee','ratio','attack','release'])c[p]=param();return c;}
  };
  const math=Object.create(Math);math.random=()=>{rngCalls++;return .5;};
  const NV={getState:()=> 'playing',getWave:()=>1,getBoss:()=>null};
  const window={NV,AudioContext:function(){return ctx;}};
  const sb=vm.createContext({window,NV,Math:math,console,Float32Array});
  for(const file of ['voices','synth','weaponSfx'])vm.runInContext(fs.readFileSync('js/audio/'+file+'.js','utf8'),sb,{filename:file+'.js'});
  NV.initAudio();
  return {NV,ctx,nodes,events,rngCalls:()=>rngCalls,advance(t){ctx.currentTime+=t;for(const n of nodes)if(n.ended<=ctx.currentTime&&!n.fired){n.fired=true;if(n.onended)n.onended();}}};
};
