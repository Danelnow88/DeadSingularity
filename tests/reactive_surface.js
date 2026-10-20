'use strict';
// Portable field/upload contracts; no image assets, GPU window or local backups.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const responseSource=fs.readFileSync('js/render/spaceResponse.js','utf8');
const environmentSource=fs.readFileSync('js/render/spaceEnvironment.js','utf8');
const IDS=['threshold','foundry','fracture','void-heart','ash-moon','jade-basin','drowned-vault','glass-desert'];
function fixture(){
  const NV={settings:{graphics:{spaceResponse:true,spaceTravel:true},gameplay:{reducedEffects:false}}};
  const stats=NV.testSurfaceStats={creates:0,builds:0};
  const context={createImageData(w,h){stats.builds++;return {data:new Uint8ClampedArray(w*h*4)};},putImageData(){}};
  const document={createElement(){stats.creates++;return {width:0,height:0,getContext:()=>context};}};
  vm.runInNewContext(responseSource,{window:{NV},document,Math,Float32Array,Float64Array,Uint8Array,WeakMap,performance:{now:()=>0}});
  return NV;
}
function readonly(target){
  return new Proxy(target,{set(){throw Error('presentation mutated an actor');},
    defineProperty(){throw Error('presentation defined an actor property');},
    deleteProperty(){throw Error('presentation deleted an actor property');}});
}
function neutral(frame){
  for(let i=0;i<frame.pixels.length;i+=4){
    assert.equal(frame.pixels[i],128,'neutral horizontal displacement must encode exactly 128');
    assert.equal(frame.pixels[i+1],128,'neutral vertical displacement must encode exactly 128');
    assert.equal(frame.pixels[i+2],0,'reset field retained activity');
    assert.equal(frame.pixels[i+3],255);
  }
}
const NV=fixture(),response=NV.spaceResponse;
const player={x:310,y:285,radius:20},enemy={x:580,y:280,radius:25},bullet={x:220,y:200,vx:520,vy:0,radius:4};
const o={enabled:true,id:'threshold',W:900,H:540,time:0,paused:false,
  player:readonly(player),enemies:[readonly(enemy)],bullets:[readonly(bullet)]};
response.update(o);
const frame=response.getGpuFrame(),pixels=frame.pixels;
assert.equal(frame.width,33);assert.equal(frame.height,19);
assert(pixels instanceof Uint8Array);assert.equal(pixels.byteLength,33*19*4);
neutral(frame);assert(frame.gain>0&&frame.gain<=.20,'near response gain exceeds the small-wake contract');
assert(frame.limit*frame.gain<=7.6+1e-6);
assert.equal(response.getGpuFrame(),frame,'field descriptor allocates per call');
assert.equal(response.getGpuFrame().pixels,pixels,'field buffer allocates per call');
let revision=frame.revision;
for(let i=0;i<30;i++)response.update(o);
assert.equal(response.getGpuFrame().revision,revision,'repeated time invalidates field');
for(let i=1;i<=60;i++){
  o.time=i/120;player.x+=180/120;enemy.y+=110/120;bullet.x+=520/120;
  const before=JSON.stringify([player,enemy,bullet]);response.update(o);
  assert.equal(JSON.stringify([player,enemy,bullet]),before,'sources changed actor data');
}
const displaced=response.getGpuFrame();
assert.equal(displaced,frame);assert.equal(displaced.pixels,pixels);
assert(displaced.revision>revision,'integrating forces did not invalidate GPU data');
assert(response.diagnostics().energy>0);
assert(pixels.some((value,index)=>index%4<2&&value!==128),'movement did not encode displacement');
assert(pixels.some((value,index)=>index%4===2&&value>0),'movement did not encode activity');
for(let i=3;i<pixels.length;i+=4)assert.equal(pixels[i],255);
const signature=()=>JSON.stringify({sample:response.sample(player.x,player.y),
  energy:response.diagnostics().energy,steps:response.diagnostics().steps,revision:response.getGpuFrame().revision});
const beforeStyle=signature();
for(const style of ['lines','clouds']){
  assert.equal(response.setVisualStyle(style),true);assert.equal(response.getVisualStyle(),style);
  assert.equal(signature(),beforeStyle,'visual style changed simulation state');
}
assert.equal(response.setVisualStyle('unknown'),false);assert.equal(signature(),beforeStyle);
revision=frame.revision;const beforePause=signature();o.paused=true;o.time+=1;
response.update(o);assert.equal(signature(),beforePause,'pause changed the field');
assert.equal(response.getGpuFrame().revision,revision);
o.paused=false;o.time-=1;NV.settings.graphics.spaceResponse=false;
response.update(o);assert(response.getGpuFrame().revision>revision,'OFF reset did not invalidate GPU data');
assert.equal(response.getGpuFrame().gain,0);neutral(frame);
revision=frame.revision;response.update(o);assert.equal(response.getGpuFrame().revision,revision);
NV.settings.graphics.spaceResponse=true;o.time+=1/120;response.update(o);
revision=frame.revision;response.hide();assert(response.getGpuFrame().revision>revision,'hide reset did not invalidate GPU data');
neutral(frame);assert.equal(frame.gain,0);assert.equal(frame.pixels,pixels);

// Each approved sky has the same physics, a bounded cached near surface, and a
// scene transition clears the previous scene's displacement rather than leaking.
const shared=fixture(),sharedResponse=shared.spaceResponse,pilot={x:300,y:280};
const sceneFrame={enabled:true,W:1350,H:780,time:0,paused:false,player:pilot,enemies:[],bullets:[]};
let cachedSurface=null,surfaceRevision=-1;
for(const id of IDS){
  sceneFrame.id=id;sharedResponse.update(sceneFrame);
  assert.equal(sharedResponse.diagnostics().scene,id);assert.equal(sharedResponse.diagnostics().energy,0);
  neutral(sharedResponse.getGpuFrame());
  const nextSurface=sharedResponse.getCloudSurface();assert(nextSurface);
  assert.equal(nextSurface.width,512);assert.equal(nextSurface.height,320);
  if(cachedSurface)assert.equal(nextSurface,cachedSurface,'scene changes accumulate near-surface canvases');
  cachedSurface=nextSurface;
  assert(sharedResponse.getCloudSurfaceRevision()>surfaceRevision,'scene material did not invalidate its cache');
  surfaceRevision=sharedResponse.getCloudSurfaceRevision();
  const builds=shared.testSurfaceStats.builds;
  for(let i=0;i<20;i++)assert.equal(sharedResponse.getCloudSurface(),cachedSurface);
  assert.equal(shared.testSurfaceStats.builds,builds,'near material regenerates per frame');
  assert.equal(sharedResponse.getCloudSurfaceRevision(),surfaceRevision);
  const start=sceneFrame.time;
  for(let i=1;i<=8;i++){sceneFrame.time=start+i/120;pilot.x+=2;sharedResponse.update(sceneFrame);}
  assert(sharedResponse.diagnostics().energy>0,'motion is not reactive in '+id);
  assert(sharedResponse.getGpuFrame().gain<=.20);assert(sharedResponse.getGpuFrame().limit*sharedResponse.getGpuFrame().gain<=7.6+1e-6);
}
assert.equal(shared.testSurfaceStats.creates,1);assert.equal(shared.testSurfaceStats.builds,IDS.length);
sceneFrame.id='unknown';sharedResponse.update(sceneFrame);assert.equal(sharedResponse.diagnostics().active,false);
neutral(sharedResponse.getGpuFrame());

// Mock only graphics resources. Exercise the real render/upload scheduler without
// assuming the asynchronous cloud artwork is already available or inspecting it.
const gpuNV=fixture(),gpuResponse=gpuNV.spaceResponse;
const surface={width:512,height:320};
let surfaceVersion=1,nearReady=false;
gpuNV.spaceResponse={...gpuResponse,getCloudSurface:()=>nearReady?surface:null,getCloudSurfaceRevision:()=>surfaceVersion};
const entries=Object.fromEntries(IDS.map(id=>[id,{id,file:'sky-'+id+'-v1.webp',
  image:{naturalWidth:1536,naturalHeight:864,width:1536,height:864},ready:true,error:false}]));
entries.threshold.ready=false;
gpuNV.getDimensionScenerySource=id=>entries[id]||null;
const allocations=[],uploads=[],shaderSources=[],uniforms=new Map();
const gl={VERTEX_SHADER:1,FRAGMENT_SHADER:2,COMPILE_STATUS:3,LINK_STATUS:4,ARRAY_BUFFER:5,STATIC_DRAW:6,FLOAT:7,
  TEXTURE_2D:8,TEXTURE0:10,TEXTURE1:11,TEXTURE2:12,TEXTURE3:23,TEXTURE_MIN_FILTER:13,TEXTURE_MAG_FILTER:14,
  LINEAR:15,TEXTURE_WRAP_S:16,TEXTURE_WRAP_T:17,REPEAT:18,CLAMP_TO_EDGE:19,RGBA:20,UNSIGNED_BYTE:21,TRIANGLES:22,
  createShader(){return {};},shaderSource(shader,source){shaderSources.push(source);},compileShader(){},getShaderParameter(){return true;},
  createProgram(){return {};},attachShader(){},linkProgram(){},deleteShader(){},getProgramParameter(){return true;},useProgram(){},
  createBuffer(){return {};},bindBuffer(){},bufferData(){},getAttribLocation(){return 0;},enableVertexAttribArray(){},vertexAttribPointer(){},
  getUniformLocation(program,name){return name;},createTexture(){return {};},bindTexture(){},texParameteri(){},activeTexture(){},
  texImage2D(...args){allocations.push(args);},texSubImage2D(...args){uploads.push(args);},
  uniform1i(name,value){uniforms.set(name,[value]);},uniform1f(name,value){uniforms.set(name,[value]);},
  uniform2f(name,...value){uniforms.set(name,value);},uniform3fv(name,value){uniforms.set(name,Array.from(value));},
  uniform4f(name,...value){uniforms.set(name,value);},uniform4fv(name,value){uniforms.set(name,Array.from(value));},
  pixelStorei(){},deleteTexture(){},viewport(){},drawArrays(){},
  readPixels(){throw Error('GPU readback is not allowed');}};
const context={createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)};},putImageData(){},
  createRadialGradient(){return {addColorStop(){}};},fillRect(){}};
gpuNV.canvas={parentElement:{insertBefore(){}},style:{position:'',zIndex:'',transform:''},
  width:1280,height:800,offsetLeft:0,offsetTop:0,clientWidth:1280,clientHeight:800};
let gpuCanvas=null,gpuAttempts=0;
const document={createElement(){return {style:{},events:new Map(),setAttribute(){},
  addEventListener(name,handler){this.events.set(name,handler);},
  getContext(kind){if(kind==='webgl'){gpuCanvas=this;gpuAttempts++;return gl;}return context;}};}};
vm.runInNewContext(environmentSource,{window:{NV:gpuNV,addEventListener(){}},document,Math,Float32Array,Float64Array,Uint8Array});
const render=gpuNV.spaceEnvironment.render,p={x:300,y:280};
const ro={enabled:true,id:'threshold',W:900,H:540,time:0,paused:false,sx:1,sy:1,ox:0,oy:0,player:p,enemies:[],bullets:[]};
const fieldAllocations=()=>allocations.filter(args=>args.length===9&&args[3]===33&&args[4]===19);
const fieldUploads=()=>uploads.filter(args=>args[4]===33&&args[5]===19);
const skyUploads=id=>allocations.filter(args=>args.at(-1)===entries[id].image);
for(let i=0;i<5;i++)assert.equal(render(ro),false,'pending original art must use the classic fallback');
assert.equal(skyUploads('threshold').length,0);
assert.equal(gpuResponse.diagnostics().active,true,'waiting for artwork resets the response field');
assert.equal(gpuNV.spaceEnvironment.diagnostics().failed,false,'pending art permanently failed WebGL');
entries.threshold.ready=true;assert.equal(render(ro),true,'ready art did not recover from its pending state');
assert.equal(skyUploads('threshold').length,1,'original sky source was not uploaded exactly once');
assert.equal(fieldAllocations().length,0,'pending near material allocated an unnecessary field');
for(let i=0;i<5;i++)assert.equal(render(ro),true,'pending near material hides the approved sky');
assert.equal(gpuNV.spaceEnvironment.diagnostics().cloudFailed,false,'pending near material permanently failed');
nearReady=true;assert.equal(render(ro),true,'near material did not recover after becoming available');
assert.equal(gpuNV.spaceEnvironment.diagnostics().cloudReady,true);
assert.equal(fieldAllocations().length,1,'GPU field must be allocated exactly once');
const allocation=fieldAllocations()[0];assert.equal(allocation[8],gpuResponse.getGpuFrame().pixels);
assert.equal(fieldUploads().length,0);
for(let i=0;i<20;i++)render(ro);
assert.equal(fieldAllocations().length,1);assert.equal(fieldUploads().length,0,'unchanged time caused GPU uploads');
assert.equal(skyUploads('threshold').length,1,'unchanged scene reloads its original sky');
p.x+=12;ro.time=1/60;render(ro);
assert.equal(fieldUploads().length,1,'changed field did not use subimage upload');
assert.equal(fieldUploads()[0][8],gpuResponse.getGpuFrame().pixels,'upload copied/allocated field pixels');
ro.paused=true;const beforeUploads=fieldUploads().length;
for(let i=0;i<20;i++)render(ro);
assert.equal(fieldUploads().length,beforeUploads,'pause uploaded identical field repeatedly');
ro.sx=.7;ro.sy=.65;ro.ox=-80;ro.oy=-35;render(ro);
assert.equal(fieldUploads().length,beforeUploads,'camera transform invalidated world-space simulation');
gpuNV.settings.graphics.spaceResponse=false;render(ro);
assert.equal(fieldUploads().length,beforeUploads+1,'OFF while paused did not clear GPU field');
neutral(gpuResponse.getGpuFrame());
for(let i=0;i<20;i++)render(ro);
assert.equal(fieldUploads().length,beforeUploads+1);assert.equal(fieldAllocations().length,1,'field texture reallocates per frame');

// The sky uses cover-crop, never stretches or responds to actor forces. Camera
// offset moves the scene projection; the source crop depends only on arena size.
function close(actual,expected,message){assert(Math.abs(actual-expected)<1e-6,message+' ('+actual+' vs '+expected+')');}
function crop(width,height){
  ro.W=width;ro.H=height;assert.equal(render(ro),true);
  const rect=uniforms.get('sourceRect');assert(rect&&rect.length===4,'missing source crop rectangle');
  close(rect[0],(1-rect[2])*.5,'source crop is not horizontally centered');
  close(rect[1],(1-rect[3])*.5,'source crop is not vertically centered');
  assert(rect.every(value=>value>=0&&value<=1));assert(rect[2]>0&&rect[3]>0);
  close(rect[2]*1536/(rect[3]*864),width/height,'cover crop changed source aspect');
  close(Math.max(rect[2],rect[3]),1,'cover crop unnecessarily shrinks both axes');
}
crop(900,540);crop(1600,520);crop(800,900);
assert.equal(skyUploads('threshold').length,1,'resize/crop recreated the original sky texture');
for(const variant of [0,1,2,3]){ro.variant=variant;render(ro);
  assert.deepEqual(uniforms.get('flip'),[variant&1?1:0,variant&2?1:0],'source variant mirror bits were lost');}
const nearUploads=()=>allocations.filter(args=>args.at(-1)===surface).length;
const previousNear=nearUploads();surfaceVersion++;render(ro);
assert.equal(nearUploads(),previousNear+1,'near-surface revision did not refresh its texture');
for(let i=0;i<10;i++)render(ro);
assert.equal(nearUploads(),previousNear+1,'near material reuploads without a revision');
for(const id of IDS.slice(1)){
  ro.id=id;surfaceVersion++;assert.equal(render(ro),true,'approved sky not rendered: '+id);
  assert.equal(gpuResponse.diagnostics().scene,id,'response not active for '+id);
  assert.equal(skyUploads(id).length,1,'original sky upload missing for '+id);
  for(let i=0;i<5;i++)render(ro);
  assert.equal(skyUploads(id).length,1,'original sky reloads each frame: '+id);
}
assert.equal(fieldAllocations().length,1,'scene transitions reallocate the fixed field');
const fragment=shaderSources.find(source=>source.includes('nearMatter'));
assert(fragment,'near-matter shader is missing');
assert(/vec2\s+uv\s*=\s*world\s*\/\s*arena/.test(fragment),'near matter is not anchored in actor world coordinates');
assert(/vec2\s+matterUV\s*=\s*\(\s*world\s*-\s*displacement\s*-\s*quietFlow\s*\)\s*\/\s*arena/.test(fragment)&&/texture2D\s*\(\s*nearMatter\s*,\s*matterUV\s*\)/.test(fragment),
  'material warp must use world displacement rather than distant-background parallax');
assert(fragment.includes('skyTexture'),'approved original sky is absent from the shader');
const skySample=fragment.match(/texture2D\s*\(\s*skyTexture\s*,[^;\n]+/);
assert(skySample&&!/displacement|response|activity/.test(skySample[0]),'actor response warps the original sky');
const distant=fragment.slice(fragment.indexOf('vec2 artUV'),fragment.indexOf('if(cloudEnabled'));
assert(distant&&!/displacement|response|nearMatter/.test(distant),'near response contaminates distant scenery coordinates');
assert(fragment.includes('length(displacement)')&&fragment.includes('7.6'),'near displacement lacks its magnitude cap');
assert.equal(uniforms.get('skyTexture')[0],3,'original sky overwrites a noise/near/response texture unit');
assert(!/readPixels|getImageData/.test(responseSource+environmentSource),'response introduced pixel readback');
assert(!responseSource.includes('umbral-garden-matter')&&!responseSource.includes('new Image'),'retired garden asset is still requested');
const stateBeforeLoss=JSON.stringify([gpuResponse.diagnostics().energy,gpuResponse.diagnostics().steps]);
let prevented=false;
gpuCanvas.events.get('webglcontextlost')({preventDefault(){prevented=true;}});
assert(prevented);assert.equal(gpuNV.spaceEnvironment.diagnostics().failed,true);
assert.equal(gpuNV.spaceEnvironment.diagnostics().active,false);
assert.equal(render(ro),false,'lost GPU context did not fall back to Canvas');
assert.equal(gpuAttempts,1,'context loss caused repeated WebGL construction');
assert.equal(JSON.stringify([gpuResponse.diagnostics().energy,gpuResponse.diagnostics().steps]),stateBeforeLoss,
  'context loss changed the paused spring field');
console.log('PASS reactive surface: eight cached near fields, bounded wakes, pause/reset, read-only actors, async original skies/crops, stable subimage uploads');
