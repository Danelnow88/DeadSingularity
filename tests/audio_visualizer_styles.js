'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Motion=require('../js/engine/audioPerimeterMotion.js');
const root=require('node:path').resolve(__dirname,'..');
function fixture(native=true,preview=true){
  let surfaces=0,gradients=0;const operations=[];
  function context(canvas){
    const c={canvas,globalAlpha:1,globalCompositeOperation:'source-over',
      getTransform(){return {a:1,b:0,c:0,d:1,e:30,f:30};},
      createLinearGradient(){gradients++;return {addColorStop(){}};},
      createRadialGradient(){gradients++;return {addColorStop(){}};}};
    for(const name of ['save','restore','beginPath','closePath','clearRect','drawImage','rect','clip','translate','rotate','scale',
      'moveTo','lineTo','arc','ellipse','quadraticCurveTo','bezierCurveTo','stroke','fill','fillRect','strokeRect'])c[name]=(...args)=>{
      for(const arg of args)if(typeof arg==='number')assert(Number.isFinite(arg),'non-finite '+name);
      operations.push(name);
    };
    return c;
  }
  class Canvas{constructor(w,h){surfaces++;this.width=w;this.height=h;this.c=context(this);}getContext(){return this.c;}}
  const NV={AudioPerimeterMotion:Motion,viewport:{cameraExteriorPadding:28},rhythm:{enabled:false,active:false,state:'off'},
    drawRhythmLayer(){},rhythmShakeBoost(){return 1;},sectorVisualForWave(){return {accent:'#63e8ff'};}};
  const win={NV,location:{search:preview?'?dimensionEvents=preview':''},deadSingularityDesktopAudio:native?{systemAudio:true}:undefined};
  const box={window:win,OffscreenCanvas:Canvas,console};
  for(const file of ['audioVisualizerStyles.js','audioPerimeter.js'])vm.runInNewContext(fs.readFileSync(root+'/js/render/'+file,'utf8'),box);
  return {NV,c:context({width:900,height:560}),operations,counts:()=>({surfaces,gradients})};
}
const f=fixture(),api=f.NV.AudioPerimeter;
assert.equal(api.getStyle(),'sparkler');assert.equal(api.snapshot().style,'sparkler');
assert.deepEqual(Array.from(api.styles,s=>s.id),['sparkler','chorus','prism','volt']);
assert(Object.isFrozen(api.styles));assert(api.styles.every(Object.isFrozen));
assert.equal(api.setStyle('__proto__'),false);assert.equal(api.setStyle('constructor'),false);
for(const s of api.styles){
  assert(api.setStyle(s.id));assert.equal(api.getStyle(),s.id);assert.equal(f.NV.rhythm.state,'off');
  api.tick(1/60,{active:true});assert.equal(api.draw(f.c,844,504,1),0);
}
Object.assign(f.NV.rhythm,{enabled:true,active:true,state:'listening',energy:.7,energyRaw:.6,bass:.6,mids:.5,highs:.4,
  density:5,tempoBpm:120,accent:1,analysisRevision:0,data:new Uint8Array(256).fill(180)});
const signatures=[];
for(const design of api.styles){
  api.setStyle(design.id);const start=f.operations.length;
  for(const tier of ['full','reduced','minimal'])for(let frame=0;frame<20;frame++){
    f.NV.rhythm.analysisRevision++;api.tick(1/60,{active:true});assert.equal(api.draw(f.c,844,504,1,{tier}),4);
  }
  signatures.push(f.operations.slice(start).join(','));
  const pool=api.snapshot().design;
  assert(pool.particleCount<=pool.capacity&&pool.capacity===120,'unbounded particle pool');
  assert(pool.ringCount<=pool.ringCapacity&&pool.ringCapacity===8,'unbounded percussion rings');
  assert.equal(f.counts().surfaces,1,'style switch allocated another atlas');
  assert.equal(f.counts().gradients,0,'style switch created gradients');
  const paints=api.snapshot().stats.paints;api.setStyle(design.id);api.draw(f.c,844,504,1,{tier:'minimal'});
  assert.equal(api.snapshot().stats.paints,paints,'reselecting style repainted cache');
}
assert.equal(new Set(signatures).size,4,'styles must have different geometry');
// Changing the design invalidates the silent tile even though motion is still.
Object.assign(f.NV.rhythm,{energy:0,energyRaw:0,bass:0,mids:0,highs:0});
for(let i=0;i<600;i++)api.tick(1/60,{active:true});
api.draw(f.c,844,504,1);const silentPaints=api.snapshot().stats.paints;
api.draw(f.c,844,504,1);assert.equal(api.snapshot().stats.paints,silentPaints);
api.setStyle('sparkler');api.draw(f.c,844,504,1);assert.equal(api.snapshot().stats.paints,silentPaints+1);
Object.assign(f.NV.rhythm,{enabled:false,active:false,state:'off'});api.tick(1/60,{active:true});
assert.equal(api.draw(f.c,844,504,1),0);
assert.equal(api.snapshot().design.particleCount,0,'disconnected graphic retained particles');
for(const [native,preview]of [[false,true],[false,false]]){
  const other=fixture(native,preview);assert.equal(other.NV.AudioPerimeter.enabled,false);
  assert.equal(other.NV.AudioPerimeter.setStyle('chorus'),false);assert.equal(other.NV.AudioPerimeter.getStyle(),'sparkler');
  assert.deepEqual(other.counts(),{surfaces:0,gradients:0});
}
const normalNative=fixture(true,false);assert.equal(normalNative.NV.AudioPerimeter.enabled,true);
const html=fs.readFileSync(root+'/index.html','utf8');
assert(html.indexOf('js/render/audioVisualizerStyles.js')<html.indexOf('js/render/audioPerimeter.js'));
const src=fs.readFileSync(root+'/js/render/audioVisualizerStyles.js','utf8');
for(const forbidden of ['requestAnimationFrame','getByteFrequencyData','shadowBlur','new AudioContext','Math.random'])assert(!src.includes(forbidden));
console.log('PASS four visualizers: preserved default, distinct geometry, finite tiers, shared atlas, silent switching, strict native isolation and no capture side effects');
