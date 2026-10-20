'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let attempts=0;
const IDS=['threshold','foundry','fracture','void-heart','ash-moon','jade-basin','drowned-vault','glass-desert'];
const entries=Object.fromEntries(IDS.map(id=>[id,{id,file:'sky-'+id+'-v1.webp',ready:true,error:false,
  image:{naturalWidth:1536,naturalHeight:864,width:1536,height:864}}]));
const calls=[],images=[],alpha=[],transforms=[];
const ctx={globalAlpha:1,save(){alpha.push(this.globalAlpha);},restore(){this.globalAlpha=alpha.pop();},
  translate(...args){transforms.push(['translate',...args]);},rotate(){},scale(...args){transforms.push(['scale',...args]);},
  drawImage(...args){images.push(args);},fillRect(...p){calls.push(p);},
  beginPath(){},rect(...p){calls.push(p);},fill(){},
  createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)};},putImageData(){},createRadialGradient(){return {addColorStop(){}};}};
const NV={canvas:{parentElement:{insertBefore(){}},style:{}},
  settings:{graphics:{spaceTravel:true},gameplay:{reducedEffects:false}},
  worldMetrics:Object.freeze({viewX:100,viewY:80,viewW:900,viewH:520,arenaW:1350,arenaH:780}),
  getDimensionScenerySource:id=>entries[id]||null,
  drawSectorBackdrop(context,width,height,frame,wave){
    const entry=entries[IDS[Math.min(IDS.length-1,Math.floor((wave-1)/5))]];
    if(entry&&entry.ready&&!entry.error)context.drawImage(entry.image,0,0,width,height);
    return entry;
  }};
const doc={createElement(){return {style:{},setAttribute(){},addEventListener(){},getContext(kind){if(kind==='webgl'){attempts++;return null;}return ctx;}};}};
const source=fs.readFileSync('js/render/spaceEnvironment.js','utf8');
vm.runInNewContext(source,{window:{NV,addEventListener(){}},document:doc,Math,Float32Array,Float64Array,Uint8Array});
assert(NV.spaceEnvironment.isRequested({id:'threshold'}));assert(!NV.spaceEnvironment.isRequested({id:'other'}));
const player=Object.freeze({x:20,y:30,dashActive:false}),before=JSON.stringify(player),metrics=NV.worldMetrics;
for(const id of IDS){
  assert(NV.spaceEnvironment.isRequested({id}),'approved sky cannot animate: '+id);
  assert.equal(NV.spaceEnvironment.render({enabled:true,id,W:900,H:520,player,time:0,paused:false}),false);
  images.length=0;
  NV.spaceEnvironment.drawFallback(ctx,900,520,id,0);
  assert(images.some(args=>args[0]===entries[id].image),'fallback replaced the approved nebula: '+id);
}
assert.equal(attempts,1,'failed WebGL retried in every map');assert.equal(JSON.stringify(player),before);
assert.equal(NV.worldMetrics,metrics,'environment replaced world/camera metrics');
const fallbackImages=images.length;
NV.spaceEnvironment.drawFallback(ctx,900,520,'unknown',0);assert.equal(images.length,fallbackImages);

// Canvas fallback bakes the approved source once, not the old procedural art.
// Subsequent frames are one cached-image submission even after GPU failure.
images.length=0;
NV.spaceEnvironment.drawFallback(ctx,1350,780,'threshold',0);
assert.equal(images.length,2,'first fallback must bake once and submit once');
const baked=images.find(args=>args[0]===entries.threshold.image),cached=images.at(-1)[0];
assert(baked&&baked.length===9,'fallback did not cover-crop the original source');
assert.equal(baked[3]/baked[4],1350/780,'fallback source crop changes aspect');
assert.equal(baked[1],(1536-baked[3])*.5);assert.equal(baked[2],(864-baked[4])*.5);
assert(cached.width<=1536&&cached.height<=1024,'fallback backing cache is unbounded');
images.length=0;transforms.length=0;
for(let frame=1;frame<=30;frame++)NV.spaceEnvironment.drawFallback(ctx,1350,780,'threshold',frame);
assert.equal(images.length,30,'unchanged fallback performs more than one blit per frame');
assert(images.every(args=>args[0]===cached),'unchanged fallback rebakes its source');
assert.equal(transforms.length,0,'unchanged fallback rebuilds cover/flip transforms');
for(const variant of [1,2,3]){
  NV.spaceEnvironment.render({enabled:true,id:'threshold',W:1350,H:780,player,time:30,paused:false,variant});
  images.length=0;transforms.length=0;
  NV.spaceEnvironment.drawFallback(ctx,1350,780,'threshold',30);
  assert.equal(images.length,2,'variant did not invalidate the cached fallback once');
  assert.equal(images.at(-1)[0],cached,'variant accumulates fallback canvases');
  assert.equal(transforms.some(args=>args[0]==='scale'&&args[1]===-1&&args[2]===1),!!(variant&1),'horizontal mirror lost in GPU fallback');
  assert.equal(transforms.some(args=>args[0]==='scale'&&args[1]===1&&args[2]===-1),!!(variant&2),'vertical mirror lost in GPU fallback');
  images.length=0;NV.spaceEnvironment.drawFallback(ctx,1350,780,'threshold',31);
  assert.equal(images.length,1);assert.equal(images[0][0],cached);
}
images.length=0;NV.spaceEnvironment.drawFallback(ctx,3000,1800,'threshold',40);
assert.equal(images.length,2,'resize did not rebuild the cached fallback once');
assert.equal(images.at(-1)[0],cached);assert(cached.width<=1536&&cached.height<=1024);
entries.threshold.file='sky-threshold-revised.webp';images.length=0;
NV.spaceEnvironment.drawFallback(ctx,3000,1800,'threshold',41);
assert.equal(images.length,2,'source file replacement did not invalidate the fallback');
entries.threshold.ready=false;images.length=0;
NV.spaceEnvironment.drawFallback(ctx,3000,1800,'threshold',42);
assert.equal(images.length,0,'pending source displays a stale cached scene');
entries.threshold.ready=true;
assert.equal(attempts,1,'Canvas fallback retries failed WebGL');
calls.length=0;NV.spaceEnvironment.drawTravelStars(ctx,900,520,10,0,0);const reference=JSON.stringify(calls);
calls.length=0;for(let i=0;i<165;i++)NV.spaceEnvironment.drawTravelStars(ctx,900,520,i/165*10,0,0);
calls.length=0;NV.spaceEnvironment.drawTravelStars(ctx,900,520,10,0,0);assert.equal(JSON.stringify(calls),reference,'motion depends on call count/FPS');
calls.length=0;NV.spaceEnvironment.drawTravelStars(ctx,900,520,10,80,50);
assert.notEqual(JSON.stringify(calls),reference,'star layers ignore camera displacement');
NV.settings.gameplay.reducedEffects=true;
calls.length=0;NV.spaceEnvironment.drawTravelStars(ctx,900,520,5,0,0);const quiet=JSON.stringify(calls);
calls.length=0;NV.spaceEnvironment.drawTravelStars(ctx,900,520,50,0,0);
assert.equal(JSON.stringify(calls),quiet,'reduced-effects star motion continues');
NV.settings={graphics:{spaceTravel:false},gameplay:{reducedEffects:false}};assert(!NV.spaceEnvironment.isRequested({id:'foundry'}));
assert.equal(NV.spaceEnvironment.diagnostics().starCount,160);assert.equal(NV.spaceEnvironment.diagnostics().fieldBytes,65536);
assert(source.includes('getDimensionScenerySource'),'renderer bypasses the approved scenery source cache');
assert(!source.includes('new Image')&&!source.includes('readPixels')&&!source.includes('getImageData'));
assert(source.includes('if(layoutDirty)'));
console.log('PASS living cosmic space: eight approved source fallbacks, bounded GPU attempts, preserved world/actors, camera and FPS-independent quiet motion');
