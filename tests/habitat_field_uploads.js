'use strict';
// Portable renderer contract: refine spring RG once and pack habitat BA in place.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('js/render/spaceEnvironment.js','utf8');
function fixture(withHabitat){
  const spring={width:33,height:19,pixels:new Uint8Array(33*19*4),revision:1,limit:38,gain:.20};
  const habitat={width:65,height:37,pixels:new Uint8Array(65*37*4),revision:1,gain:1};
  for(let y=0;y<19;y++)for(let x=0;x<33;x++){
    const k=(y*33+x)*4;spring.pixels[k]=(x*23+y*17+x*y%31)%256;
    spring.pixels[k+1]=(x*11+y*29+x*y%43)%256;spring.pixels[k+2]=199;spring.pixels[k+3]=255;
  }
  for(let y=0;y<37;y++)for(let x=0;x<65;x++){
    const k=(y*65+x)*4;habitat.pixels[k]=(x*7+y*11)%256;habitat.pixels[k+1]=(x*13+y*5)%256;
    habitat.pixels[k+2]=37;habitat.pixels[k+3]=111;
  }
  const near={width:512,height:320},textureAllocs=[],subUploads=[],bufferAllocs=[],shaders=[],uniforms=new Map();
  let textureUnit=10,textureCount=0,nearRevision=1;
  class TrackedBytes extends Uint8Array{constructor(...args){super(...args);bufferAllocs.push(this.byteLength);}}
  const gl={VERTEX_SHADER:1,FRAGMENT_SHADER:2,COMPILE_STATUS:3,LINK_STATUS:4,ARRAY_BUFFER:5,STATIC_DRAW:6,FLOAT:7,
    TEXTURE_2D:8,TEXTURE0:10,TEXTURE1:11,TEXTURE2:12,TEXTURE3:13,TEXTURE4:14,
    TEXTURE_MIN_FILTER:15,TEXTURE_MAG_FILTER:16,LINEAR:17,TEXTURE_WRAP_S:18,TEXTURE_WRAP_T:19,
    REPEAT:20,CLAMP_TO_EDGE:21,RGBA:22,UNSIGNED_BYTE:23,TRIANGLES:24,
    createShader(){return {};},shaderSource(shader,text){shaders.push(text);},compileShader(){},getShaderParameter(){return true;},
    createProgram(){return {};},attachShader(){},linkProgram(){},deleteShader(){},getProgramParameter(){return true;},useProgram(){},
    createBuffer(){return {};},bindBuffer(){},bufferData(){},getAttribLocation(){return 0;},enableVertexAttribArray(){},vertexAttribPointer(){},
    getUniformLocation(program,name){return name;},createTexture(){return {id:++textureCount};},bindTexture(){},texParameteri(){},
    activeTexture(unit){assert.notEqual(unit,this.TEXTURE4,'packing added another dynamic texture');textureUnit=unit;},
    texImage2D(...args){textureAllocs.push({unit:textureUnit,args});},texSubImage2D(...args){subUploads.push({unit:textureUnit,args});},
    uniform1i(name,...value){uniforms.set(name,value);},uniform1f(name,...value){uniforms.set(name,value);},
    uniform2f(name,...value){uniforms.set(name,value);},uniform4f(name,...value){uniforms.set(name,value);},
    uniform4fv(name,value){uniforms.set(name,Array.from(value));},viewport(){},drawArrays(){},
    readPixels(){throw Error('readback is not allowed');}};
  const entries=Object.fromEntries(['threshold','foundry'].map(id=>[id,{id,file:'sky-'+id+'-v1.webp',ready:true,error:false,
    image:{naturalWidth:1536,naturalHeight:864}}]));
  const NV={canvas:{parentElement:{insertBefore(){}},style:{position:'',zIndex:'',transform:''},
    width:1280,height:800,clientWidth:1280,clientHeight:800,offsetLeft:0,offsetTop:0},
    settings:{graphics:{spaceTravel:true},gameplay:{reducedEffects:false}},getDimensionScenerySource:id=>entries[id],
    spaceResponse:{update(){},hide(){},setGpuSurface(){},getVisualStyle:()=> 'clouds',getGpuFrame:()=>spring,
      getCloudSurface:()=>near,getCloudSurfaceRevision:()=>nearRevision}};
  if(withHabitat)NV.spaceHabitat={update(){},hide(){},getGpuFrame:()=>habitat,getSurface:()=>near,
    getSurfaceRevision:()=>nearRevision,drawBehind(){},drawFront(){}};
  const document={createElement(){return {style:{},setAttribute(){},addEventListener(){},getContext(kind){assert.equal(kind,'webgl');return gl;}};}};
  vm.runInNewContext(source,{window:{NV,addEventListener(){}},document,Math,Float32Array,Float64Array,Uint8Array:TrackedBytes});
  const options={enabled:true,id:'threshold',W:1350,H:780,time:0,paused:false,sx:1,sy:1,ox:0,oy:0,
    player:Object.freeze({x:300,y:280}),bullets:[],enemies:[]};
  function render(){assert.equal(NV.spaceEnvironment.render(options),true,'mock renderer failed');}
  const fieldAllocs=(width,height)=>textureAllocs.filter(record=>record.args.length===9&&record.args[3]===width&&record.args[4]===height);
  return {NV,spring,habitat,options,render,fieldAllocs,subUploads,textureAllocs,bufferAllocs,shaders,uniforms,
    textureCount:()=>textureCount,reviseSurface(){nearRevision++;}};
}
function interpolation(src,x,y,channel){
  const gx=x/2,gy=y/2,ix=Math.floor(gx),iy=Math.floor(gy),tx=gx-ix,ty=gy-iy;
  const x1=Math.min(32,ix+1),y1=Math.min(18,iy+1);
  const at=(xx,yy)=>src[(yy*33+xx)*4+channel];
  return (at(ix,iy)*(1-tx)+at(x1,iy)*tx)*(1-ty)+(at(ix,y1)*(1-tx)+at(x1,y1)*tx)*ty;
}
const f=fixture(true),oldBytes=Array.from(f.spring.pixels),habBytes=Array.from(f.habitat.pixels);
f.render();const allocs=f.fieldAllocs(65,37);assert.equal(allocs.length,1,'packed field allocated more than once');
assert.equal(f.fieldAllocs(33,19).length,0,'renderer also allocated the old dynamic texture');
assert.equal(allocs[0].unit,11,'packed field is not on response texture unit 1');
const packed=allocs[0].args[8];assert.equal(packed.byteLength,65*37*4);
function verify(){
  for(let y=0;y<37;y++)for(let x=0;x<65;x++){
    const k=(y*65+x)*4;
    for(let channel=0;channel<2;channel++){
      const exact=interpolation(f.spring.pixels,x,y,channel);
      assert.equal(packed[k+channel],Math.round(exact),'wrong corner/even/odd spring refinement at '+x+','+y);
      assert(Math.abs(packed[k+channel]-exact)*f.spring.limit/127*f.spring.gain<=.03+1e-9,'visible per-axis quantization exceeds .03 units');
    }
    assert.equal(packed[k+2],f.habitat.pixels[k],'depletion R did not become packed B');
    assert.equal(packed[k+3],f.habitat.pixels[k+1],'pile G did not become packed A');
  }
}
verify();assert.deepEqual(Array.from(f.spring.pixels),oldBytes,'packing mutates the old spring field');
assert.deepEqual(Array.from(f.habitat.pixels),habBytes,'packing mutates habitat bytes');
assert.equal(f.spring.width,33);assert.equal(f.spring.height,19);
assert.deepEqual(f.uniforms.get('responseSize'),[65,37]);assert.deepEqual(f.uniforms.get('responseField'),[1]);
assert.equal(f.textureCount(),4,'packed fields need no fifth texture');
const allocationCount=f.bufferAllocs.length;
for(let i=0;i<20;i++)f.render();assert.equal(f.subUploads.length,0,'unchanged revision uploads again');
function revisionChange(oldChange,habChange){
  const before=f.subUploads.length;
  if(oldChange){f.spring.revision++;f.spring.pixels[0]^=3;}
  if(habChange){f.habitat.revision++;f.habitat.pixels[1]^=7;}
  f.options.time+=1/60;f.render();
  assert.equal(f.subUploads.length,before+1,'combined revision did not produce exactly one upload');
  const upload=f.subUploads.at(-1);assert.equal(upload.unit,11);assert.equal(upload.args[4],65);assert.equal(upload.args[5],37);
  assert.equal(upload.args[8],packed,'packed pixel buffer was replaced');verify();
}
revisionChange(true,false);revisionChange(false,true);revisionChange(true,true);
f.options.paused=true;const pausedUploads=f.subUploads.length;
for(let i=0;i<20;i++){f.options.time+=1/60;f.render();}
assert.equal(f.subUploads.length,pausedUploads,'paused unchanged fields were uploaded');
f.options.W=1600;f.options.H=900;f.options.sx=.7;f.options.sy=.65;f.options.ox=-50;f.options.oy=-35;f.render();
assert.equal(f.subUploads.length,pausedUploads,'resize/camera repacks unchanged data');
f.options.id='foundry';f.reviseSurface();revisionChange(true,true);
assert.equal(f.fieldAllocs(65,37).length,1,'resize/scene reallocated the packed field');
assert.equal(f.bufferAllocs.length,allocationCount,'revision/resize/scene allocated new Uint8 buffers');
assert.equal(f.bufferAllocs.filter(size=>size===65*37*4).length,1,'packed pixel backing is not persistent');
const diagnostics=f.NV.spaceEnvironment.diagnostics();
assert.equal(diagnostics.packedFieldBytes,9620);assert.equal(diagnostics.responseTextureBytes,9620);assert.equal(diagnostics.habitatTextureBytes,0);
const fragment=f.shaders.find(text=>text.includes('nearMatter'));
assert(/opening\s*=\s*response\.b\s*\*\s*habitatGain/.test(fragment)&&
  /pushed\s*=\s*response\.a\s*\*\s*habitatGain/.test(fragment),'shader does not unpack density/pile from BA');
assert.equal((fragment.match(/texture2D\s*\(\s*responseField/g)||[]).length,1,'shader samples two separate dynamic fields');
const distant=fragment.slice(fragment.indexOf('vec2 artUV'),fragment.indexOf('if(cloudEnabled'));
assert(distant&&!/response|displacement|habitat/.test(distant),'packed interaction warps the original sky');
assert(!/habitatField|TEXTURE4|readPixels|getImageData/.test(source),'packing added sampler/readback paths');

// Compatibility: no habitat means the exact original spring API/buffer still wins.
const legacy=fixture(false);legacy.render();const oldAlloc=legacy.fieldAllocs(33,19);
assert.equal(oldAlloc.length,1);assert.equal(oldAlloc[0].args[8],legacy.spring.pixels);
assert.equal(legacy.fieldAllocs(65,37).length,0);assert.deepEqual(legacy.uniforms.get('responseSize'),[33,19]);
legacy.spring.revision++;legacy.options.time+=1/60;legacy.render();assert.equal(legacy.subUploads.length,1);
assert.equal(legacy.subUploads[0].args[8],legacy.spring.pixels,'legacy buffer identity changed');
assert.equal(legacy.fieldAllocs(33,19).length,1);
console.log('PASS habitat field uploads: exact 33→65 RG refinement/BA memory, stable 9620-byte buffer, single revision upload, pause/scene/resize and untouched legacy API');
