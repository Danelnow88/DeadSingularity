// Fundición: persistent GPU sky + small cached near-field dust. Render only.
(() => {
  'use strict';
  const NV=window.NV;
  const base=typeof URL==='function'&&typeof document!=='undefined'&&document.currentScript&&document.currentScript.src
    ? new URL('../../assets/scenery/',document.currentScript.src).href : 'assets/scenery/';
  const sources=['sky-foundry-v1.webp','sky-foundry-clean-v2.webp'];
  const images=[],wake=new Float32Array(16*5);
  let canvas=null,gl=null,program=null,ready=false,failed=false,enabled=true;
  let loading=false,uploads=0,frames=0,lastTime=-1,lastX=0,lastY=0,emitTime=-1,wakeIndex=0,lastVariant=-1;
  let cloud=null,light=null,active=false;
  let mainPosition='',mainZ='';
  let lastDrawTime=-1,sceneW=1,sceneH=1,layoutDirty=true;
  const lastTransform=new Float64Array(6);
  const spots=[[.28,.35,125,58],[.57,.64,150,68],[.84,.77,115,52]];
  const locations={};
  const vertex=`attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
  const fragment=`precision highp float;
    uniform sampler2D art;uniform sampler2D plate;
    uniform vec2 resolution,scale,offset,arena,flips;uniform float time;
    mat2 rotation(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
    void main(){
      vec2 pixel=vec2(gl_FragCoord.x,resolution.y-gl_FragCoord.y);
      vec2 world=(pixel-offset)/scale;
      if(world.x<0.||world.y<0.||world.x>arena.x||world.y>arena.y){gl_FragColor=vec4(.004,.012,.039,1.);return;}
      // Match the existing cover crop, including aspect ratio and world camera.
      float imageAspect=1.77777778,viewAspect=arena.x/arena.y;
      vec2 cover=viewAspect>imageAspect?vec2(1.,imageAspect/viewAspect):vec2(viewAspect/imageAspect,1.);
      vec2 uv=((world+offset/scale*.12)/arena-.5)*cover+.5;
      uv=mix(uv,1.-uv,flips);
      vec2 centre=vec2(.855,.345);
      vec2 q=rotation(-.48)*((uv-centre)*vec2(imageAspect,1.));
      vec2 ellipse=vec2(.215,.36);vec2 local=q/ellipse;float r=length(local);
      float mask=1.-smoothstep(.70,1.62,r);
      // Differential circulation in the inclined galaxy, not a rotating screen.
      float angle=time*.043*mask/(1.+r*.22);
      vec2 twisted=rotation(angle)*local;
      vec2 warped=centre+(rotation(.48)*(twisted*ellipse))/vec2(imageAspect,1.);
      vec3 original=texture2D(art,uv).rgb;
      vec3 clean=texture2D(plate,uv).rgb;
      vec3 result=mix(mix(original,clean,mask),texture2D(art,warped).rgb,mask);
      gl_FragColor=vec4(result*.82,1.);
    }`;
  function hide(){
    if(active){NV.canvas.style.position=mainPosition;NV.canvas.style.zIndex=mainZ;}
    active=false;if(canvas){canvas.hidden=true;canvas.style.display='none';}
  }
  function fail(){failed=true;ready=false;hide();if(gl&&program)gl.deleteProgram(program);}
  function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error('Atmosphere shader');return s;}
  function init(){
    if(loading||failed)return;loading=true;
    canvas=document.createElement('canvas');canvas.className='foundry-sky';canvas.hidden=true;
    canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:absolute;pointer-events:none;z-index:0;display:none';
    NV.canvas.parentElement.insertBefore(canvas,NV.canvas);
    if(typeof ResizeObserver==='function')new ResizeObserver(()=>{layoutDirty=true;}).observe(NV.canvas);
    window.addEventListener('resize',()=>{layoutDirty=true;});
    gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false});
    if(!gl){fail();return;}
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fail();});
    try{
      const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment);
      program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
      gl.deleteShader(vs);gl.deleteShader(fs);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Atmosphere program');
      gl.useProgram(program);
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
      const p=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
      for(const key of ['art','plate','resolution','scale','offset','arena','flips','time'])locations[key]=gl.getUniformLocation(program,key);
      gl.uniform1i(locations.art,0);gl.uniform1i(locations.plate,1);
      sources.forEach((file,i)=>{const image=new Image();images[i]=image;
        image.onerror=fail;image.onload=()=>{
          if(failed)return;
          const tex=gl.createTexture();gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,tex);
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
          gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);uploads++;
          if(uploads===2){prepareDust();ready=true;}
        };image.src=base+file;
      });
    }catch{fail();}
  }
  function prepareDust(){
    cloud=document.createElement('canvas');cloud.width=256;cloud.height=128;
    const c=cloud.getContext('2d');
    c.drawImage(images[0],40,190,470,390,0,0,256,128);
    const mask=document.createElement('canvas');mask.width=256;mask.height=128;const m=mask.getContext('2d');
    for(let i=0;i<7;i++){
      const x=35+i*30,y=64+Math.sin(i*2.1)*13;
      const g=m.createRadialGradient(x,y,2,x,y,35);g.addColorStop(0,'rgba(255,255,255,.8)');g.addColorStop(1,'rgba(255,255,255,0)');
      m.fillStyle=g;m.fillRect(x-35,y-35,70,70);
    }
    c.globalCompositeOperation='destination-in';c.drawImage(mask,0,0);
    light=document.createElement('canvas');light.width=light.height=96;const l=light.getContext('2d');
    const g=l.createRadialGradient(48,48,0,48,48,48);g.addColorStop(0,'rgba(120,215,210,.38)');g.addColorStop(.35,'rgba(72,133,156,.16)');g.addColorStop(1,'rgba(40,100,120,0)');
    l.fillStyle=g;l.fillRect(0,0,96,96);
  }
  function render(o){
    if(!enabled||!o.enabled||o.id!=='foundry'||NV.dimensionSceneryLegacy===true){hide();lastTime=-1;return false;}
    if(!ready){init();hide();return false;}
    if(!active){mainPosition=NV.canvas.style.position;mainZ=NV.canvas.style.zIndex;NV.canvas.style.position=mainPosition||'relative';NV.canvas.style.zIndex='1';}
    active=true;canvas.hidden=false;canvas.style.display='block';sceneW=o.W;sceneH=o.H;
    const source=NV.canvas;
    if(canvas.width!==source.width||canvas.height!==source.height){canvas.width=source.width;canvas.height=source.height;gl.viewport(0,0,canvas.width,canvas.height);lastDrawTime=-1;}
    // Copy already-computed styles; no layout read or resize/write on every frame.
    if(layoutDirty){
      canvas.style.left=source.offsetLeft+'px';canvas.style.top=source.offsetTop+'px';
      canvas.style.width=source.clientWidth+'px';canvas.style.height=source.clientHeight+'px';layoutDirty=false;
    }
    canvas.style.transform=source.style.transform;
    const variant=o.variant||0;
    const changed=lastVariant!==variant||lastTransform[0]!==o.sx||lastTransform[1]!==o.sy||lastTransform[2]!==o.ox||lastTransform[3]!==o.oy||lastTransform[4]!==o.W||lastTransform[5]!==o.H;
    if(lastDrawTime!==o.time||changed){
      gl.useProgram(program);gl.uniform2f(locations.resolution,canvas.width,canvas.height);
      gl.uniform2f(locations.scale,o.sx,o.sy);gl.uniform2f(locations.offset,o.ox,o.oy);gl.uniform2f(locations.arena,o.W,o.H);gl.uniform1f(locations.time,o.time);
      gl.uniform2f(locations.flips,variant&1?1:0,variant&2?1:0);lastVariant=variant;
      gl.drawArrays(gl.TRIANGLES,0,3);frames++;lastDrawTime=o.time;
      lastTransform[0]=o.sx;lastTransform[1]=o.sy;lastTransform[2]=o.ox;lastTransform[3]=o.oy;lastTransform[4]=o.W;lastTransform[5]=o.H;
    }
    const p=o.player;
    if(o.time<lastTime){wake.fill(0);emitTime=-1;}
    if(lastTime<0&&p){lastX=p.x;lastY=p.y;}
    if(lastTime>=0&&o.time>lastTime&&p&&Math.hypot(p.x-lastX,p.y-lastY)>7&&o.time-emitTime>.045){
      const i=(wakeIndex++%16)*5;wake[i]=p.x;wake[i+1]=p.y;wake[i+2]=o.time;
      wake[i+3]=Math.atan2(p.moveVy||0,p.moveVx||1);wake[i+4]=p.dashActive?1:0;
      emitTime=o.time;lastX=p.x;lastY=p.y;
    }
    lastTime=o.time;return true;
  }
  function dust(ctx,time,front,p){
    if(!active||!cloud)return;
    ctx.save();ctx.shadowBlur=0;
    for(let i=0;i<spots.length;i++){
      const s=spots[i],x=sceneW*s[0]+Math.sin(time*.11+i)*18,y=sceneH*s[1]+Math.cos(time*.13+i)*12;
      const distance=p?Math.hypot((p.x-x)/s[2],(p.y-y)/s[3]):10;
      ctx.save();ctx.translate(x,y);ctx.rotate(-.25+Math.sin(time*.08+i)*.12);
      ctx.globalAlpha=(front?.10:.32)*(distance<1.2&&p&&p.dashActive?.4:1);
      ctx.drawImage(cloud,-s[2],-s[3],s[2]*2,s[3]*2);
      ctx.restore();
    }
    if(front&&p){
      ctx.globalCompositeOperation='lighter';
      for(let n=0;n<16;n++){const i=n*5,age=time-wake[i+2];if(wake[i+2]<=0||age<0||age>1.05)continue;
        ctx.save();ctx.translate(wake[i],wake[i+1]);ctx.rotate(wake[i+3]);
        ctx.globalAlpha=(1-age/1.05)*(wake[i+4]?.35:.12);
        ctx.drawImage(light,-42-age*12,-12-age*8,84+age*24,24+age*16);ctx.restore();
      }
      const speed=Math.min(1,Math.hypot(p.moveVx||0,p.moveVy||0)/300);
      ctx.globalAlpha=.12+speed*.12;ctx.drawImage(light,p.x-42,p.y-42,84,84);
    }
    ctx.restore();
  }
  NV.foundryAtmosphere=Object.freeze({render,hide,
    setEnabled(value){enabled=!!value;if(!enabled)hide();},
    drawBehind:(ctx,time,p)=>dust(ctx,time,false,p),drawFront:(ctx,time,p)=>dust(ctx,time,true,p),
    diagnostics:()=>({enabled,active,ready,failed,uploads,frames,wakeCapacity:16,wakeEmissions:wakeIndex})});
})();
