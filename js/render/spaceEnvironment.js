// Living cosmos: original scenery + local gas circulation + reactive near matter.
// One persistent WebGL pass. Camera, bounds, actors and gameplay stay authoritative.
(() => {
  'use strict';
  const NV=window.NV;
  const IDS=['threshold','foundry','fracture','void-heart','ash-moon','jade-basin','drowned-vault','glass-desert'];
  // Authored in ORIGINAL image UVs, before cover-crop: planets/rings stay fixed.
  const SOLIDS=[
    [0,0,0,0,0,0,0,0],[.855,.345,.023,.040,0,0,0,0],
    [0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],
    [1.01,-.02,.255,.35,0,0,0,0],[0,0,0,0,0,0,0,0],
    [1.025,-.07,.29,.46,0,0,0,0],[-.035,.06,.34,.34,1.08,.855,.215,.44]
  ];
  let canvas=null,gl=null,program=null,active=false,failed=false,frames=0,uploads=0;
  let skyTexture=null,nearTexture=null,responseTexture=null,cloudReady=false,cloudFailed=false;
  let habitatReady=false,habitatUploads=0,lastHabitatRevision=-1,fieldWidth=1,fieldHeight=1;
  const packedField={width:65,height:37,pixels:new Uint8Array(65*37*4),limit:38,gain:0};
  let skyUploads=0,cloudUploads=0,responseUploads=0,lastResponseRevision=-1,surfaceRevision=-1;
  let skyImage=null,skyFile=null,skyIndex=-1,skyTextureBytes=0,nearTextureBytes=0;
  let layoutDirty=true,lastTime=-1,mainPosition='',mainZ='',current=-1,W=1,H=1;
  let fallbackSurface=null,fallbackKey='',fallbackVariant=0;
  const transform=new Float64Array(6),stars=new Float32Array(160*4),sourceRect=new Float32Array([0,0,1,1]);
  const uniforms={},coarse=new Float32Array(16*16);let seed=67421;
  function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  for(let i=0;i<coarse.length;i++)coarse[i]=random();
  for(let i=0;i<160;i++){const n=i*4;stars[n]=random();stars[n+1]=random();stars[n+2]=i%3;stars[n+3]=.55+random()*.45;}
  const smooth=x=>x*x*(3-2*x);
  function noise(x,y){
    const ix=Math.floor(x),iy=Math.floor(y),fx=smooth(x-ix),fy=smooth(y-iy);
    const a=coarse[((iy&15)*16)+(ix&15)],b=coarse[((iy&15)*16)+((ix+1)&15)];
    const c=coarse[(((iy+1)&15)*16)+(ix&15)],d=coarse[(((iy+1)&15)*16)+((ix+1)&15)];
    return (a+(b-a)*fx)*(1-fy)+(c+(d-c)*fx)*fy;
  }
  function requested(profile){return !!profile&&IDS.includes(profile.id)&&NV.dimensionSceneryLegacy!==true&&(!NV.settings||!NV.settings.graphics||NV.settings.graphics.spaceTravel!==false);}
  const vertex='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const fragment=`precision highp float;
    uniform sampler2D field,skyTexture,nearMatter,responseField;
    uniform vec2 resolution,scale,offset,arena,responseSize,flip;
    uniform vec4 sourceRect,solidA,solidB;
    uniform float time,mode,cloudEnabled,responseGain,responseLimit,habitatEnabled,habitatGain;
    float protection(vec2 uv,vec4 shape){
      if(shape.z<=0.)return 1.;
      float r=length((uv-shape.xy)/shape.zw);
      return smoothstep(.94,1.14,r);
    }
    void main(){
      vec2 pixel=vec2(gl_FragCoord.x,resolution.y-gl_FragCoord.y);
      vec2 world=(pixel-offset)/scale;
      vec3 ink=vec3(.004,.012,.039);
      if(world.x<0.||world.y<0.||world.x>arena.x||world.y>arena.y){gl_FragColor=vec4(ink*.6,1.);return;}
      vec2 uv=world/arena;
      vec2 artUV=sourceRect.xy+mix(uv,1.-uv,flip)*sourceRect.zw;
      vec3 original=texture2D(skyTexture,artUV).rgb;
      float stable=protection(artUV,solidA)*protection(artUV,solidB);
      // Internal bounded circulation: never pan the whole painting or follow player.
      vec2 n=texture2D(field,artUV*2.3+vec2(time*.003,-time*.002)).rg;
      vec2 flow=vec2(sin(artUV.y*9.+time*.14+mode*.7),cos(artUV.x*11.-time*.12+mode))*.72+(n-.5)*.55;
      vec2 movingUV=artUV+flow*vec2(8.,8.)/arena*sourceRect.zw*stable;
      if(mode>.5&&mode<1.5){
        // Slow differential rotation, restricted to copper arms; nucleus stays still.
        vec2 centre=vec2(.855,.345),q=(artUV-centre)*vec2(1.,.57);
        float radius=length(q),mask=(1.-smoothstep(.19,.29,radius))*smoothstep(.019,.065,radius);
        // Bounded angular drift stays well-conditioned even after hours of play.
        // Weight ANGLE, never lerp opposite rotated UVs (which collapses the ring).
        float angle=sin(time*.037)*.22*(.65+.35*smoothstep(.03,.20,radius))*mask*stable;
        float s=sin(angle),c=cos(angle);
        vec2 rotated=vec2(q.x*c-q.y*s,q.x*s+q.y*c)/vec2(1.,.57)+centre;
        movingUV=rotated+flow*vec2(8.,8.)/arena*sourceRect.zw*stable*(1.-mask);
      }
      float brightness=max(original.r,max(original.g,original.b));
      // Point stars and empty void do not smear with the gas.
      float gas=smoothstep(.012,.09,brightness)*(1.-smoothstep(.55,.92,brightness));
      vec3 sky=mix(original,texture2D(skyTexture,movingUV).rgb,gas*stable);
      float illumination=.975+.025*sin(time*.045+mode*.71);
      vec3 result=mix(sky*illumination,ink,.18);
      if(cloudEnabled>.5){
        vec4 response=texture2D(responseField,(uv*(responseSize-1.)+.5)/responseSize);
        vec2 displacement=(response.rg*255.-128.)/127.*responseLimit*responseGain;
        displacement*=min(1.,7.6/max(length(displacement),.001));
        // Only nearby GAS is displaced. No activity tint, vacuum/alpha or radial lens.
        vec2 quietFlow=vec2(sin(uv.y*12.+time*.32+mode),cos(uv.x*13.-time*.27+mode)) * 6.;
        vec2 matterUV=(world-displacement-quietFlow)/arena;
        if(habitatEnabled>.5)matterUV=sourceRect.xy+mix(matterUV,1.-matterUV,flip)*sourceRect.zw;
        vec4 matter=texture2D(nearMatter,matterUV);
        float opening=0.,pushed=0.;
        if(habitatEnabled>.5){
          opening=response.b*habitatGain;pushed=response.a*habitatGain;
        }
        float edge=smoothstep(0.,.025,min(min(uv.x,uv.y),min(1.-uv.x,1.-uv.y)));
        // A swept channel and displaced side-folds, not an aura or a warped sky.
        float opacity=matter.a*edge*(1.-opening*.94)*(1.+pushed*.65);
        vec3 gas=matter.rgb*illumination*(1.+pushed*.12);
        result=mix(result,gas,min(.72,opacity));
      }
      gl_FragColor=vec4(result,1.);
    }`;
  function deactivate(){
    if(active){NV.canvas.style.position=mainPosition;NV.canvas.style.zIndex=mainZ;}
    active=false;if(canvas)canvas.style.display='none';
  }
  function hide(){deactivate();if(NV.spaceResponse)NV.spaceResponse.hide();if(NV.spaceHabitat)NV.spaceHabitat.hide();}
  function fail(){failed=true;deactivate();}
  function compile(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Living cosmos shader');return s;}
  function texture(unit,repeat){
    gl.activeTexture(unit);const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,repeat?gl.REPEAT:gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,repeat?gl.REPEAT:gl.CLAMP_TO_EDGE);return tex;
  }
  function init(){
    if(canvas||failed)return;
    if(!NV.canvas||!NV.canvas.parentElement||typeof NV.canvas.parentElement.insertBefore!=='function'){fail();return;}
    canvas=document.createElement('canvas');canvas.className='space-environment';canvas.setAttribute('aria-hidden','true');
    canvas.style.cssText='position:absolute;pointer-events:none;z-index:0;display:none';NV.canvas.parentElement.insertBefore(canvas,NV.canvas);
    if(typeof ResizeObserver==='function')new ResizeObserver(()=>{layoutDirty=true;}).observe(NV.canvas);
    window.addEventListener('resize',()=>{layoutDirty=true;});
    gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false});if(!gl){fail();return;}
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fail();});
    try{
      const a=compile(gl.VERTEX_SHADER,vertex),b=compile(gl.FRAGMENT_SHADER,fragment);program=gl.createProgram();gl.attachShader(program,a);gl.attachShader(program,b);gl.linkProgram(program);gl.deleteShader(a);gl.deleteShader(b);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Living cosmos link');gl.useProgram(program);
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
      const p=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
      for(const key of ['field','skyTexture','resolution','scale','offset','arena','time','mode','nearMatter','responseField','cloudEnabled','responseGain','responseLimit','responseSize','sourceRect','solidA','solidB','flip','habitatEnabled','habitatGain'])uniforms[key]=gl.getUniformLocation(program,key);
      const data=new Uint8Array(128*128*4);for(let y=0;y<128;y++)for(let x=0;x<128;x++){
        const i=(y*128+x)*4;data[i]=Math.round(noise(x/8,y/8)*255);data[i+1]=Math.round(noise(x/8+5,y/8+9)*255);data[i+2]=data[i];data[i+3]=255;
      }
      texture(gl.TEXTURE0,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,128,128,0,gl.RGBA,gl.UNSIGNED_BYTE,data);uploads++;
      skyTexture=texture(gl.TEXTURE3,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));
      // Complete samplers even in the ribbons comparison or during async loading.
      responseTexture=texture(gl.TEXTURE1,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([128,128,0,255]));
      nearTexture=texture(gl.TEXTURE2,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));
      gl.uniform1i(uniforms.field,0);gl.uniform1i(uniforms.responseField,1);gl.uniform1i(uniforms.nearMatter,2);gl.uniform1i(uniforms.skyTexture,3);gl.activeTexture(gl.TEXTURE0);
    }catch{fail();}
  }
  function initClouds(){
    if(cloudFailed||!NV.spaceResponse||!NV.spaceResponse.getCloudSurface)return;
    try{
      const source=NV.spaceHabitat||NV.spaceResponse;
      const surface=NV.spaceHabitat?source.getSurface():source.getCloudSurface();if(!surface)return;
      const nextRevision=NV.spaceHabitat?source.getSurfaceRevision():source.getCloudSurfaceRevision?source.getCloudSurfaceRevision():1;
      if(cloudReady&&surfaceRevision===nextRevision)return;
      if(!cloudReady&&!NV.spaceHabitat){
        const field=NV.spaceResponse.getGpuFrame();gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,responseTexture);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,field.width,field.height,0,gl.RGBA,gl.UNSIGNED_BYTE,field.pixels);
        responseUploads++;lastResponseRevision=field.revision;fieldWidth=field.width;fieldHeight=field.height;
      }
      gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,nearTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,surface);
      cloudUploads++;surfaceRevision=nextRevision;nearTextureBytes=surface.width*surface.height*4;cloudReady=true;lastTime=-1;gl.activeTexture(gl.TEXTURE0);
    }catch{cloudFailed=true;gl.activeTexture(gl.TEXTURE0);}
  }
  function pack(response,habitat){
    // 65x37 is the exact half-cell refinement of 33x19. Reuse idle RGBA channels
    // for density/pile: one small upload and one shader lookup, not two textures.
    const src=response.pixels,dst=packedField.pixels,mask=habitat.pixels;
    for(let y=0;y<37;y++)for(let x=0;x<65;x++){
      const ix=x>>1,iy=y>>1,rx=Math.min(32,ix+1),by=Math.min(18,iy+1),tx=(x&1)*.5,ty=(y&1)*.5;
      const a=(iy*33+ix)*4,b=(iy*33+rx)*4,c=(by*33+ix)*4,d=(by*33+rx)*4,k=(y*65+x)*4;
      for(let channel=0;channel<2;channel++)dst[k+channel]=Math.round((src[a+channel]*(1-tx)+src[b+channel]*tx)*(1-ty)+(src[c+channel]*(1-tx)+src[d+channel]*tx)*ty);
      dst[k+2]=mask[k];dst[k+3]=mask[k+1];
    }
    packedField.limit=response.limit;packedField.gain=response.gain;return packedField;
  }
  function render(o){
    const index=IDS.indexOf(o.id);
    if(!o.enabled||index<0||!requested({id:o.id})){hide();return false;}
    current=index;W=o.W;H=o.H;fallbackVariant=(o.variant||0)>>>0;
    if(NV.spaceResponse){NV.spaceResponse.setGpuSurface(false);NV.spaceResponse.update(o);}
    if(NV.spaceHabitat)NV.spaceHabitat.update(o);
    if(!canvas&&!failed)init();if(failed)return false;
    const entry=NV.getDimensionScenerySource&&NV.getDimensionScenerySource(o.id);
    if(!entry||!entry.ready||entry.error){deactivate();return false;}
    if(skyIndex!==index||skyImage!==entry.image||skyFile!==entry.file){
      gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,skyTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,entry.image);gl.activeTexture(gl.TEXTURE0);
      skyImage=entry.image;skyFile=entry.file;skyIndex=index;skyTextureBytes=skyImage.naturalWidth*skyImage.naturalHeight*4;skyUploads++;lastTime=-1;
    }
    const ratio=Math.max(W/skyImage.naturalWidth,H/skyImage.naturalHeight);
    sourceRect[2]=W/ratio/skyImage.naturalWidth;sourceRect[3]=H/ratio/skyImage.naturalHeight;
    sourceRect[0]=(1-sourceRect[2])*.5;sourceRect[1]=(1-sourceRect[3])*.5;
    const wantsClouds=NV.spaceResponse&&NV.spaceResponse.getVisualStyle()==='clouds';
    if(wantsClouds)initClouds();
    const cloudMode=!!(wantsClouds&&cloudReady),response=cloudMode?NV.spaceResponse.getGpuFrame():null;
    const habitat=cloudMode&&NV.spaceHabitat?NV.spaceHabitat.getGpuFrame():null;
    const fieldChanged=!!(response&&response.revision!==lastResponseRevision);
    const habitatChanged=!!(habitat&&habitat.revision!==lastHabitatRevision);
    if(fieldChanged||habitatChanged){
      const data=habitat?pack(response,habitat):response;gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,responseTexture);
      if(fieldWidth!==data.width||fieldHeight!==data.height){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,data.width,data.height,0,gl.RGBA,gl.UNSIGNED_BYTE,data.pixels);fieldWidth=data.width;fieldHeight=data.height;}
      else gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,data.width,data.height,gl.RGBA,gl.UNSIGNED_BYTE,data.pixels);
      responseUploads++;lastResponseRevision=response.revision;
      if(habitat){habitatReady=true;habitatUploads++;lastHabitatRevision=habitat.revision;}gl.activeTexture(gl.TEXTURE0);
    }
    if(!active){mainPosition=NV.canvas.style.position;mainZ=NV.canvas.style.zIndex;NV.canvas.style.position=mainPosition||'relative';NV.canvas.style.zIndex='1';}
    active=true;canvas.style.display='block';const source=NV.canvas;
    if(canvas.width!==source.width||canvas.height!==source.height){canvas.width=source.width;canvas.height=source.height;gl.viewport(0,0,canvas.width,canvas.height);lastTime=-1;}
    // Same CSS shake as actors/borders, copied before either layer is presented.
    // Reading an existing inline style does not force a layout query.
    if(canvas.style.transform!==source.style.transform)canvas.style.transform=source.style.transform;
    if(layoutDirty){canvas.style.left=source.offsetLeft+'px';canvas.style.top=source.offsetTop+'px';canvas.style.width=source.clientWidth+'px';canvas.style.height=source.clientHeight+'px';layoutDirty=false;}
    canvas.style.transform=source.style.transform;
    const changed=transform[0]!==o.sx||transform[1]!==o.sy||transform[2]!==o.ox||transform[3]!==o.oy||transform[4]!==o.W||transform[5]!==o.H;
    const t=NV.settings&&NV.settings.gameplay&&NV.settings.gameplay.reducedEffects?0:o.time,variant=(o.variant||0)>>>0;
    if(lastTime!==t||changed||fieldChanged||habitatChanged||render.lastMode!==index||render.lastCloudMode!==cloudMode||render.lastGain!==(response?response.gain:0)||render.lastVariant!==variant){
      gl.useProgram(program);gl.uniform2f(uniforms.resolution,canvas.width,canvas.height);gl.uniform2f(uniforms.scale,o.sx,o.sy);gl.uniform2f(uniforms.offset,o.ox,o.oy);gl.uniform2f(uniforms.arena,W,H);
      gl.uniform1f(uniforms.time,t);gl.uniform1f(uniforms.mode,index);gl.uniform4fv(uniforms.sourceRect,sourceRect);gl.uniform2f(uniforms.flip,variant&1?1:0,variant&2?1:0);
      const solid=SOLIDS[index];gl.uniform4f(uniforms.solidA,solid[0],solid[1],solid[2],solid[3]);gl.uniform4f(uniforms.solidB,solid[4],solid[5],solid[6],solid[7]);
      gl.uniform1f(uniforms.cloudEnabled,cloudMode?1:0);gl.uniform1f(uniforms.responseGain,response?response.gain:0);
      gl.uniform1f(uniforms.habitatEnabled,habitat?1:0);gl.uniform1f(uniforms.habitatGain,habitat?habitat.gain:0);
      if(response){gl.uniform1f(uniforms.responseLimit,response.limit);gl.uniform2f(uniforms.responseSize,habitat?65:response.width,habitat?37:response.height);}
      gl.drawArrays(gl.TRIANGLES,0,3);frames++;lastTime=t;render.lastMode=index;render.lastCloudMode=cloudMode;render.lastGain=response?response.gain:0;render.lastVariant=variant;
      transform[0]=o.sx;transform[1]=o.sy;transform[2]=o.ox;transform[3]=o.oy;transform[4]=W;transform[5]=H;
    }
    if(NV.spaceResponse)NV.spaceResponse.setGpuSurface(cloudMode);return true;
  }
  function fallback(ctx,width,height,id){
    const index=IDS.indexOf(id);if(index<0)return;
    const entry=NV.getDimensionScenerySource&&NV.getDimensionScenerySource(id);
    if(!entry||!entry.ready||entry.error){
      if(NV.drawSectorBackdrop)NV.drawSectorBackdrop(ctx,width,height,0,1+index*5,{preview:true,variant:fallbackVariant});
      return;
    }
    const key=id+'|'+entry.file+'|'+width+'|'+height+'|'+fallbackVariant;
    if(!fallbackSurface||fallbackKey!==key){
      if(!fallbackSurface)fallbackSurface=document.createElement('canvas');
      const factor=Math.min(1,1536/width,1024/height);fallbackSurface.width=Math.ceil(width*factor);fallbackSurface.height=Math.ceil(height*factor);
      const c=fallbackSurface.getContext('2d'),image=entry.image,ratio=Math.max(width/image.naturalWidth,height/image.naturalHeight);
      const sw=width/ratio,sh=height/ratio;
      c.save();c.scale(fallbackSurface.width/width,fallbackSurface.height/height);
      if(fallbackVariant&1){c.translate(width,0);c.scale(-1,1);}
      if(fallbackVariant&2){c.translate(0,height);c.scale(1,-1);}
      c.drawImage(image,(image.naturalWidth-sw)/2,(image.naturalHeight-sh)/2,sw,sh,0,0,width,height);
      c.fillStyle='rgba(1,3,10,.18)';c.fillRect(0,0,width,height);c.restore();fallbackKey=key;
    }
    ctx.drawImage(fallbackSurface,0,0,width,height);
  }
  function travelStars(ctx,width,height,time,cx,cy){
    const t=NV.settings&&NV.settings.gameplay&&NV.settings.gameplay.reducedEffects?0:time;
    ctx.save();ctx.shadowBlur=0;ctx.fillStyle='#a3b5bd';
    // Three depth planes, calm lateral drift. No radial zoom / perpetual warp-speed.
    for(let layer=0;layer<3;layer++){
      ctx.globalAlpha=.16+layer*.065;ctx.beginPath();
      for(let i=layer;i<160;i+=3){const k=i*4,depth=.04+layer*.05;
        const x=((stars[k]*width-(cx||0)*depth+t*(.13+layer*.16))%width+width)%width;
        const y=((stars[k+1]*height-(cy||0)*depth+t*(.035+layer*.04))%height+height)%height;
        // Direct quads avoid rasterizing a sparse path spanning the viewport.
        const size=(.5+layer*.22)*stars[k+3];ctx.fillRect(x,y,size,size);
      }
    }ctx.restore();
  }
  NV.spaceEnvironment=Object.freeze({isRequested:requested,render,hide,drawFallback:fallback,drawTravelStars:travelStars,
    drawBehind:(ctx,t,p)=>{if(NV.spaceResponse)NV.spaceResponse.drawBehind(ctx,t,p);if(NV.spaceHabitat)NV.spaceHabitat.drawBehind(ctx,active&&cloudReady);},
    drawFront:(ctx,t,p)=>{if(NV.spaceResponse&&!NV.spaceHabitat)NV.spaceResponse.drawFront(ctx,t,p);if(NV.spaceHabitat)NV.spaceHabitat.drawFront(ctx);},
    diagnostics:()=>({active,failed,frames,uploads,noiseUploads:uploads,skyReady:skyIndex===current,skyFile,skyUploads,skyTextureBytes,sourceRect:Array.from(sourceRect),
      cloudReady,cloudFailed,cloudUploads,responseUploads,habitatReady,habitatUploads,habitatTextureBytes:0,packedFieldBytes:habitatReady?65*37*4:0,cloudTextureBytes:nearTextureBytes,responseTextureBytes:cloudReady?fieldWidth*fieldHeight*4:0,fieldBytes:128*128*4,starCount:160,scene:IDS[current]})});
})();
