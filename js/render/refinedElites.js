// Painted living creatures. Material detail is cached; gaze and motion stay live.
(() => {
  'use strict';
  const NV=window.NV,TAU=Math.PI*2,BODY_SCALE=.8*1.30*1.15,EYE_SCALE=1.20;
  const base=typeof document!=='undefined'&&document.currentScript
    ?new URL('../../assets/elite-creatures/',document.currentScript.src).href:'assets/elite-creatures/';
  const specs={
    elite_predator:{file:'asesino-painted-v1.png',color:'#d399e8',kind:0,eyeX:.438,eyeY:.51},
    elite_phantom:{file:'fantasma-painted-v1.png',color:'#cceef1',kind:1,eyeX:.502,eyeY:.36},
    elite_titan:{file:'goliat-painted-v1.png',color:'#eea0c3',kind:2,eyeX:.63,eyeY:.49}
  };
  const cache=new Map(),readableCache=new Map(),chasePoses=new WeakMap();
  const LIGHT_LEVELS=8,LIGHT_COLUMNS=4,LIGHT_PAD=32,lightFilters=new Map();
  const reducedMotion=typeof window.matchMedia==='function'?window.matchMedia('(prefers-reduced-motion: reduce)'):null;
  const clamp=v=>Math.max(0,Math.min(1,v));
  function charge(timer,total){return clamp(1-Math.max(0,Number(timer)||0)/Math.max(.001,total));}
  function rise(p,a,b){const x=clamp((p-a)/(b-a));return x*x*(3-2*x);}
  function beat(p,center,width){const x=Math.abs(p-center)/width;return x>=1?0:(1+Math.cos(x*Math.PI))*.5;}
  // Only existing attack timers drive this signal. No independent animation clock,
  // new simulation state, or lighting while roaming/recovering/possessing.
  NV.refinedEliteAttackIntensity=function(e){
    if(!e||e.dead||e.waveCleanup||e.isBoss||NV.__refinedEliteAttackLighting===false)return 0;
    let p;
    switch(e.visualId){
      case 'elite_predator':
        if(e.predatorState!=='execution_windup')return 0;
        p=charge(e.predatorStateTimer,NV.ELITE_PREDATOR_HUNTER?.executionWindup||.30);
        return reducedMotion?.matches ? .16+.84*p : .12+.88*Math.max(.6*beat(p,.22,.18),rise(p,.42,.98));
      case 'elite_phantom':
        if(e.phantomState==='materialize')return .12+.23*charge(e.phantomStateTimer,NV.ELITE_PHANTOM_POSSESSION?.materializeTime||.25);
        if(e.phantomState!=='entry_windup')return 0;
        p=charge(e.phantomStateTimer,NV.ELITE_PHANTOM_POSSESSION?.windup||.42);
        return reducedMotion?.matches ? .35+.65*p : .35+.65*Math.max(.55*beat(p,.26,.2),rise(p,.4,.96));
      case 'elite_titan':
        if(e.goliathState==='slam_windup'){
          p=charge(e.goliathStateTimer,NV.ELITE_GOLIATH_SEISMIC?.windup||.35);
          return .16+.84*rise(p,0,.97);
        }
        if(e.goliathState==='aftershock_window'){
          p=charge(e.goliathStateTimer,NV.ELITE_GOLIATH_SEISMIC?.aftershockDelay||1.5);
          return .65*rise(p,.65,1);
        }
        return 0;
      default:return 0;
    }
  };
  function lightFilter(kind){
    if(lightFilters.has(kind))return lightFilters.get(kind);
    if(typeof document.createElementNS!=='function'||!document.documentElement)return null;
    const ns='http://www.w3.org/2000/svg',make=(tag,attrs)=>{const n=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs||{}))n.setAttribute(k,String(v));return n;};
    const svg=make('svg',{width:0,height:0,'aria-hidden':'true'});svg.style.position='absolute';svg.style.pointerEvents='none';
    const defs=make('defs'),id='nv-elite-attack-light-'+kind;
    const filter=make('filter',{id,x:0,y:0,width:1,height:1,'color-interpolation-filters':'sRGB'});
    // Saturated violet / cyan / rose tissue only. Basalt and neutral eye whites
    // are not emitters. Complementary masks preserve silhouette alpha.
    const mask=['4 -8 4 0 -.6','-8 4 4 0 -.6','6 -8 2 0 -.6'][kind];
    filter.appendChild(make('feColorMatrix',{in:'SourceGraphic',result:'energy',type:'matrix',values:'0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  '+mask}));
    const lit=make('feComponentTransfer',{in:'SourceGraphic',result:'lit'});
    for(const channel of ['R','G','B'])lit.appendChild(make('feFunc'+channel,{type:'linear',slope:1.16,intercept:.32}));
    filter.appendChild(lit);filter.appendChild(make('feComposite',{in:'lit',in2:'energy',operator:'in',result:'emission'}));
    filter.appendChild(make('feComposite',{in:'SourceGraphic',in2:'energy',operator:'out',result:'unlit'}));
    filter.appendChild(make('feComposite',{in:'emission',in2:'unlit',operator:'arithmetic',k1:0,k2:1,k3:1,k4:0,result:'bodyLit'}));
    // Local spill like the nine-family maps, but baked into the same body atlas.
    // Gaussian work happens once on loading; the combat renderer never blurs.
    filter.appendChild(make('feComposite',{in:'energy',in2:'SourceAlpha',operator:'in',result:'energyAlpha'}));
    filter.appendChild(make('feGaussianBlur',{in:'energyAlpha',stdDeviation:3,result:'close'}));
    filter.appendChild(make('feGaussianBlur',{in:'energyAlpha',stdDeviation:10,result:'wide'}));
    filter.appendChild(make('feComposite',{in:'close',in2:'wide',operator:'arithmetic',k1:0,k2:1.5,k3:1.7,k4:0,result:'spill'}));
    filter.appendChild(make('feFlood',{'flood-color':['#a65bff','#58eaff','#ff4caa'][kind],result:'color'}));
    filter.appendChild(make('feComposite',{in:'color',in2:'spill',operator:'in',result:'glow'}));
    filter.appendChild(make('feBlend',{in:'bodyLit',in2:'glow',mode:'screen'}));
    defs.appendChild(filter);svg.appendChild(defs);document.documentElement.appendChild(svg);
    const url='url(#'+id+')';lightFilters.set(kind,url);return url;
  }
  function lightAtlas(bitmap,kind){
    const filter=lightFilter(kind);if(!filter)return null;
    const padded=document.createElement('canvas');padded.width=bitmap.width+LIGHT_PAD*2;padded.height=bitmap.height+LIGHT_PAD*2;
    const baseCtx=padded.getContext('2d');if(!baseCtx)return null;baseCtx.drawImage(bitmap,LIGHT_PAD,LIGHT_PAD);
    const light=document.createElement('canvas');light.width=padded.width;light.height=padded.height;
    const c=light.getContext('2d');if(!c||typeof c.filter!=='string')return null;
    c.filter=filter;c.drawImage(padded,0,0);c.filter='none';
    // Transparent gutters prevent bilinear sampling from touching another frame.
    const strideW=padded.width+4,strideH=padded.height+4;
    const atlas=document.createElement('canvas');atlas.width=strideW*LIGHT_COLUMNS;atlas.height=strideH*2;
    const a=atlas.getContext('2d');if(!a)return null;
    for(let level=0;level<LIGHT_LEVELS;level++){
      const x=level%LIGHT_COLUMNS*strideW+2,y=Math.floor(level/LIGHT_COLUMNS)*strideH+2;
      a.globalAlpha=1;a.drawImage(padded,x,y);
      // Interpolate premultiplied RGBA by replacement, not source-over: avoid
      // increasing opacity on Fantasma or on antialiased transparent edges.
      if(level){a.globalCompositeOperation='destination-out';a.globalAlpha=level/(LIGHT_LEVELS-1);a.fillRect(x,y,padded.width,padded.height);
        a.globalCompositeOperation='lighter';a.drawImage(light,x,y);a.globalCompositeOperation='source-over';}
    }
    a.globalAlpha=1;return atlas;
  }
  const BUSY_POSE=/windup|execution|recovery|slam|materialize|possess/;
  // Approved posture follows actual displacement, never changes entity state.
  NV.refinedEliteChasePose=function(e,time,lookX,lookY){
    let p=chasePoses.get(e);
    if(!p){p={x:e.x||0,y:e.y||0,time,bank:0,leanX:0,leanY:0};chasePoses.set(e,p);return p;}
    const dt=time-p.time;if(dt<=0)return p;
    const x=e.x||0,y=e.y||0,dx=x-p.x,dy=y-p.y;
    const busy=BUSY_POSE.test(e.predatorState||'')||BUSY_POSE.test(e.goliathState||'')||BUSY_POSE.test(e.phantomState||'');
    const valid=dt<.25&&Math.hypot(dx,dy)<60;
    const speed=valid&&!busy?Math.min(1,Math.hypot(dx,dy)/dt/80):0;
    const distance=Math.hypot(lookX,lookY),nx=distance>1e-6?lookX/distance:0,ny=distance>1e-6?lookY/distance:0;
    const blend=1-Math.exp(-Math.min(dt,.1)*10);
    p.bank+=(nx*.075*speed-p.bank)*blend;
    p.leanX+=(nx*1.5*speed-p.leanX)*blend;p.leanY+=(ny*1.5*speed-p.leanY)*blend;
    p.x=x;p.y=y;p.time=time;return p;
  };
  function prepare(image,s){
    const scan=document.createElement('canvas');scan.width=image.naturalWidth;scan.height=image.naturalHeight;
    const c=scan.getContext('2d');if(!c)return null;c.drawImage(image,0,0);
    let x0=0,y0=0,x1=scan.width-1,y1=scan.height-1,transparent=null;
    try{
      const pixels=c.getImageData(0,0,scan.width,scan.height).data;
      x0=scan.width;y0=scan.height;x1=y1=-1;let alpha=0;
      for(let y=0;y<scan.height;y++)for(let x=0;x<scan.width;x++){
        const a=pixels[(y*scan.width+x)*4+3];if(a===0)alpha++;
        if(a>20){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
      }
      transparent=alpha/(scan.width*scan.height);if(x1<0)return null;
    }catch(_){/* file:// can restrict readback; retain full alpha image. */}
    const sw=x1-x0+1,sh=y1-y0+1,ratio=sw/sh;
    const h=100/Math.max(1,ratio),w=h*ratio;
    const bitmap=document.createElement('canvas');bitmap.width=Math.ceil(w*4);bitmap.height=Math.ceil(h*4);
    const b=bitmap.getContext('2d');if(!b)return null;b.imageSmoothingQuality='high';
    const materialFilter=NV.cachedBasaltMaterialFilter?.('elite');
    const materialReady=!!materialFilter&&typeof b.filter==='string';
    if(materialReady)b.filter=materialFilter;
    b.drawImage(image,x0,y0,sw,sh,0,0,bitmap.width,bitmap.height);
    if(materialReady)b.filter='none';
    const eyeX=((s.eyeX*image.naturalWidth-x0)/sw-.5)*w;
    const eyeY=((s.eyeY*image.naturalHeight-y0)/sh-.5)*h;
    const lens=document.createElement('canvas');lens.width=lens.height=64;
    const l=lens.getContext('2d');if(!l)return null;
    l.translate(32,32);l.fillStyle='#050b14';l.beginPath();l.arc(0,0,27,0,TAU);l.fill();
    l.strokeStyle=s.color;l.lineWidth=3;l.stroke();
    const shade=l.createRadialGradient(-6,-8,2,0,0,22);shade.addColorStop(0,'#fff');shade.addColorStop(.4,s.color);shade.addColorStop(1,'#627184');
    l.fillStyle=shade;l.beginPath();l.arc(0,0,22,0,TAU);l.fill();
    const atlas=lightAtlas(bitmap,s.kind);
    return {bitmap:atlas||bitmap,lightReady:!!atlas,cellWidth:bitmap.width,cellHeight:bitmap.height,
      textureBytes:(atlas||bitmap).width*(atlas||bitmap).height*4,lens,w,h,eyeX,eyeY,transparent,materialReady};
  }
  function prewarm(target,readable){
    if(typeof Image==='undefined'||typeof document==='undefined')return;
    for(const [id,s]of Object.entries(specs)){
      if(target.has(id))continue;
      const image=new Image(),entry={ready:false,error:false};target.set(id,entry);
      image.onload=()=>{const prepared=prepare(image,s);if(prepared)Object.assign(entry,prepared,{ready:true});else entry.error=true;};
      image.onerror=()=>{entry.error=true;};image.src=base+(readable?s.file.replace('-painted-v1','-readable-v2'):s.file);
    }
  }
  NV.prewarmRefinedElites=()=>prewarm(cache,false);
  NV.prewarmRefinedEliteReadability=()=>prewarm(readableCache,true);
  NV.refinedEliteReadabilityStats=()=>({species:[...readableCache].map(([id,a])=>({id,ready:a.ready,error:a.error,transparent:a.transparent,width:a.w,height:a.h,materialReady:a.materialReady,lightReady:a.lightReady,textureBytes:a.textureBytes}))});
  NV.refinedEliteRenderStats=()=>({bodyScale:BODY_SCALE,eyeScale:EYE_SCALE,species:[...cache].map(([id,a])=>({id,ready:a.ready,error:a.error,transparent:a.transparent,width:a.w,height:a.h,eyeX:a.eyeX,eyeY:a.eyeY,materialReady:a.materialReady}))});
  NV.drawRefinedEliteBody=function(ctx,e,time,color,lookX,lookY){
    const readable=NV.__eliteReadability!==false&&(NV.__eliteReadability===true||e.refinedEliteReadability===true);
    const s=specs[e.visualId],a=(readable?readableCache.get(e.visualId):null)||cache.get(e.visualId);
    if(!s||!a||!a.ready||NV.__refinedEliteBody===false)return false;
    const t=Number.isFinite(time)?time:0,phase=s.kind*2.1;
    const breath=Math.sin(t*(s.kind===2?1.6:2.5)+phase),sway=Math.sin(t*1.9+phase);
    const pose=readable&&NV.__eliteChasePose!==false?NV.refinedEliteChasePose(e,t,lookX,lookY):null;
    const leanX=pose?pose.leanX:0,leanY=pose?pose.leanY:0;
    const rotation=sway*(s.kind===0?.045:.025)+(pose?pose.bank:0),sx=BODY_SCALE*(1+breath*.025),sy=BODY_SCALE*(1-breath*.018);
    ctx.save();ctx.shadowBlur=0;ctx.filter='none';ctx.translate(leanX,sway*1.3+leanY);ctx.rotate(rotation);ctx.scale(sx,sy);
    ctx.save();
    // One existing small sprite draw, no extra layer/blur/filter or extra gas.
    // The eyes retain their full inherited opacity, including possession states.
    if(s.kind===1)ctx.globalAlpha*=.60+.06*Math.sin(t*1.35+phase);
    if(a.lightReady){
      const level=Math.round(NV.refinedEliteAttackIntensity(e)*(LIGHT_LEVELS-1));
      const cw=a.cellWidth+LIGHT_PAD*2,ch=a.cellHeight+LIGHT_PAD*2;
      const x=level%LIGHT_COLUMNS*(cw+4)+2,y=Math.floor(level/LIGHT_COLUMNS)*(ch+4)+2;
      if(level){
        const px=LIGHT_PAD*a.w/a.cellWidth,py=LIGHT_PAD*a.h/a.cellHeight;
        ctx.drawImage(a.bitmap,x,y,cw,ch,-a.w/2-px,-a.h/2-py,a.w+px*2,a.h+py*2);
      }else ctx.drawImage(a.bitmap,x+LIGHT_PAD,y+LIGHT_PAD,a.cellWidth,a.cellHeight,-a.w/2,-a.h/2,a.w,a.h);
    }else ctx.drawImage(a.bitmap,-a.w/2,-a.h/2,a.w,a.h);
    ctx.restore();
    const lx=(lookX-leanX)*Math.cos(rotation)+(lookY-leanY)*Math.sin(rotation),ly=-(lookX-leanX)*Math.sin(rotation)+(lookY-leanY)*Math.cos(rotation);
    const angle=Math.atan2(ly,lx),distance=Math.min(2.2,Math.hypot(lx,ly)*.045)*EYE_SCALE;
    const px=Math.cos(angle)*distance,py=Math.sin(angle)*distance,radius=(s.kind===1?5.2:4.5)*EYE_SCALE;
    for(let i=0;i<3;i++){
      const x=a.eyeX+(i===2?0:(i?radius*1.15:-radius*1.15)),y=a.eyeY+(i===2?-radius*1.6:0);
      const blink=1-.07*Math.pow(Math.max(0,Math.sin(t*1.7+phase+i*.15)),14);
      ctx.save();ctx.translate(x,y);ctx.scale(1,blink);ctx.drawImage(a.lens,-radius,-radius,radius*2,radius*2);
      ctx.fillStyle='#060910';ctx.beginPath();ctx.ellipse(px*.65,py*.65,radius*.42,radius*(s.kind===0?.54:.42),0,0,TAU);ctx.fill();
      ctx.fillStyle='#fff';ctx.fillRect(px*.65-1,py*.65-1,.8,.8);ctx.restore();
    }
    ctx.restore();return true;
  };
  // Promoted gameplay warms these approved assets before combat; previews and
  // diagnostics use the same bounded cache. Legacy lab retains its old models.
})();
