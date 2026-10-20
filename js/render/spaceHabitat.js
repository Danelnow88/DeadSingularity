// Traversable cosmic matter. Visual memory only: no collision/gameplay writes.
// Artwork is authored in source-image UV; interaction memory lives in arena UV.
(() => {
  'use strict';
  const NV=window.NV,COLS=65,ROWS=37,COUNT=COLS*ROWS;
  const IDS=['threshold','foundry','fracture','void-heart','ash-moon','jade-basin','drowned-vault','glass-desert'];
  const COLORS=[[92,153,157],[158,110,70],[123,105,161],[149,91,117],[142,118,111],[91,151,115],[83,123,171],[121,124,164]];
  const GAS_PATCHES=[[.03,.28,.30,.43],[.02,.13,.25,.61],[.62,.39,.35,.51],[.62,.44,.35,.52],
    [.01,.20,.30,.50],[.55,.44,.44,.52],[.03,.35,.36,.49],[.63,.40,.35,.52]];
  // x start/end, y start/end, arc, half-width. Continuations of approved sky gas,
  // not three identical ribbons or a second landscape pasted over the original.
  const PLUMES=[
    [[.02,.96,.24,.83,-.16,.058],[.12,.79,.72,.47,-.12,.052]],
    [[.02,.78,.25,.69,.09,.055],[.17,.91,.81,.48,-.13,.048]],
    [[.04,.94,.13,.83,-.10,.048],[.09,.83,.82,.43,.04,.043]],
    [[.02,.82,.16,.65,.12,.061],[.22,.95,.87,.39,-.07,.055]],
    [[.02,.81,.32,.76,-.07,.057],[.19,.94,.76,.45,-.10,.046]],
    [[.01,.95,.26,.78,.05,.052],[.10,.86,.73,.43,-.12,.045]],
    [[.01,.89,.22,.75,.02,.060],[.13,.85,.77,.44,-.10,.053]],
    [[.20,.97,.37,.74,.11,.043],[.14,.89,.83,.44,-.12,.048]]
  ];
  const clear=new Float32Array(COUNT),pile=new Float32Array(COUNT),baseMask=new Uint8Array(COUNT);
  const frame={width:COLS,height:ROWS,pixels:new Uint8Array(COUNT*4),revision:0,gain:0};
  const noiseData=new Float32Array(64*64),centres=new Float32Array(512*2),widths=new Float32Array(512*2);
  let materialNoise=null;
  const fronts=[];let surface=null,surfaceIndex=-1,surfaceRevision=0,buildMs=0,surfaceArt=null;
  let fallbackCanvas=null,maskCanvas=null,maskData=null,maskRevision=-1;
  let active=false,reactive=true,index=-1,W=1,H=1,variant=0,time=0,lastTime=-1,previous=new WeakMap();
  let revision=1,encoded=-1,playerSources=0,enemySources=0,projectileSources=0,updates=0,updateMs=0;
  let cropX=0,cropY=0,cropW=1,cropH=1,sx=0,sy=0,matter=0,depletion=0,compression=0;
  const clock=()=>typeof performance!=='undefined'?performance.now():0;
  let seed=9317;
  for(let i=0;i<noiseData.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;noiseData[i]=seed/4294967296;}
  function noise(x,y){
    const ix=Math.floor(x),iy=Math.floor(y),tx=x-ix,ty=y-iy,fx=tx*tx*(3-2*tx),fy=ty*ty*(3-2*ty);
    const a=noiseData[(iy&63)*64+(ix&63)],b=noiseData[(iy&63)*64+((ix+1)&63)];
    const c=noiseData[((iy+1)&63)*64+(ix&63)],d=noiseData[((iy+1)&63)*64+((ix+1)&63)];
    return (a+(b-a)*fx)*(1-fy)+(c+(d-c)*fx)*fy;
  }
  function line(p,u){const t=(u-p[0])/(p[1]-p[0]);return p[2]+(p[3]-p[2])*t+p[4]*Math.sin(t*Math.PI);}
  function reset(){clear.fill(0);pile.fill(0);previous=new WeakMap();lastTime=-1;revision++;}
  function hide(){if(active)reset();active=false;frame.gain=0;}
  function setCrop(){
    const entry=NV.getDimensionScenerySource&&NV.getDimensionScenerySource(IDS[index]);
    const iw=entry&&entry.ready?entry.image.naturalWidth:1536,ih=entry&&entry.ready?entry.image.naturalHeight:864;
    const ratio=Math.max(W/iw,H/ih);cropW=W/ratio/iw;cropH=H/ratio/ih;cropX=(1-cropW)*.5;cropY=(1-cropH)*.5;
  }
  function toSource(x,y){sx=cropX+(variant&1?1-x/W:x/W)*cropW;sy=cropY+(variant&2?1-y/H:y/H)*cropH;}
  function fieldAt(x,y){
    const gx=Math.max(0,Math.min(COLS-1.001,x/W*(COLS-1))),gy=Math.max(0,Math.min(ROWS-1.001,y/H*(ROWS-1)));
    const ix=Math.floor(gx),iy=Math.floor(gy),tx=gx-ix,ty=gy-iy,k=iy*COLS+ix;
    depletion=(clear[k]*(1-tx)+clear[k+1]*tx)*(1-ty)+(clear[k+COLS]*(1-tx)+clear[k+COLS+1]*tx)*ty;
    compression=(pile[k]*(1-tx)+pile[k+1]*tx)*(1-ty)+(pile[k+COLS]*(1-tx)+pile[k+COLS+1]*tx)*ty;
    toSource(x,y);
    const mx=Math.max(0,Math.min(COLS-1,Math.round(sx*(COLS-1)))),my=Math.max(0,Math.min(ROWS-1,Math.round(sy*(ROWS-1))));
    matter=baseMask[my*COLS+mx]/255;
  }
  function sweep(ax,ay,bx,by,radius,amount){
    const mx=bx-ax,my=by-ay,length=Math.hypot(mx,my);if(length<.08||length>Math.min(W,H)*.25)return false;
    const rr=radius*radius,reach=radius*1.55,inv=1/(mx*mx+my*my);
    const left=Math.max(0,Math.floor((Math.min(ax,bx)-reach)/W*(COLS-1))),right=Math.min(COLS-1,Math.ceil((Math.max(ax,bx)+reach)/W*(COLS-1)));
    const top=Math.max(0,Math.floor((Math.min(ay,by)-reach)/H*(ROWS-1))),bottom=Math.min(ROWS-1,Math.ceil((Math.max(ay,by)+reach)/H*(ROWS-1)));
    const impulse=1-Math.exp(-length/radius*amount);
    for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){
      const wx=x*W/(COLS-1),wy=y*H/(ROWS-1),t=Math.max(0,Math.min(1,((wx-ax)*mx+(wy-ay)*my)*inv));
      const ox=wx-ax-mx*t,oy=wy-ay-my*t,dist=(ox*ox+oy*oy)/rr,k=y*COLS+x;
      if(dist<1){const weight=(1-dist)*(1-dist);clear[k]=Math.min(.96,clear[k]+(1-clear[k])*impulse*weight);}
      // Gas accumulates at the SIDES, not in a radial glow around the body.
      const lateral=Math.abs(-my*ox+mx*oy)/(length*radius),along=Math.abs(mx*ox+my*oy)/(length*radius);
      if(lateral>.6&&lateral<1.55&&along<.8){const edge=Math.max(0,1-Math.abs(lateral-1.02)/.55);pile[k]=Math.min(.70,pile[k]+impulse*edge*.5);}
    }
    return true;
  }
  function source(entity,kind){
    if(!entity||entity.dead||!Number.isFinite(entity.x)||!Number.isFinite(entity.y))return;
    let old=previous.get(entity);
    if(!old){old=new Float64Array([entity.x,entity.y]);previous.set(entity,old);return;}
    const radius=kind===0?(entity.dashActive?41:31):kind===3?Math.min(56,Math.max(42,entity.radius||entity.r||48)):kind===1?Math.min(36,Math.max(22,(entity.radius||entity.size||entity.r||18)+7)):Math.max(12,Math.min(20,(entity.radius||4)+9));
    if(sweep(old[0],old[1],entity.x,entity.y,radius,kind===0?5:kind===1||kind===3?3.5:1.5)){
      if(kind===0)playerSources++;else if(kind===1||kind===3)enemySources++;else projectileSources++;
    }
    old[0]=entity.x;old[1]=entity.y;
  }
  function update(o){
    const next=IDS.indexOf(o.id);if(!o.enabled||next<0||!(o.W>0&&o.H>0)){hide();return;}
    const react=!(NV.settings&&NV.settings.graphics&&NV.settings.graphics.spaceResponse===false)&&!(NV.settings&&NV.settings.gameplay&&NV.settings.gameplay.reducedEffects);
    if(!active||index!==next||W!==o.W||H!==o.H||variant!==(o.variant||0)||reactive!==react||o.time<lastTime)reset();
    index=next;W=o.W;H=o.H;variant=o.variant||0;reactive=react;active=true;setCrop();
    if(o.paused||o.time===lastTime)return;
    const start=clock(),dt=lastTime<0?0:Math.min(.05,Math.max(0,o.time-lastTime));lastTime=o.time;time=o.time;
    if(!reactive)return;
    let changed=false;const recovery=Math.exp(-dt/1.55),settling=Math.exp(-dt/.8);
    for(let k=0;k<COUNT;k++){
      if(clear[k]>.0005||pile[k]>.0005){clear[k]*=recovery;pile[k]*=settling;changed=true;}
      else if(clear[k]||pile[k]){clear[k]=pile[k]=0;changed=true;}
    }
    const count=playerSources+enemySources+projectileSources;
    source(o.player,0);for(const e of o.enemies||[])source(e,1);source(o.boss,3);
    for(const b of o.bullets||[])source(b,2);for(const m of o.meteors||[])source(m,2);
    if(changed||count!==playerSources+enemySources+projectileSources)revision++;
    updates++;updateMs+=clock()-start;
  }
  function getGpuFrame(){
    if(encoded!==revision){for(let k=0;k<COUNT;k++){const p=k*4;frame.pixels[p]=Math.round(clear[k]*255);frame.pixels[p+1]=Math.round(pile[k]*255);frame.pixels[p+2]=0;frame.pixels[p+3]=255;}
      frame.revision=revision;encoded=revision;}
    frame.gain=active&&reactive?1:0;return frame;
  }
  function getSurface(){
    if(index<0||typeof document==='undefined')return null;
    const art=NV.getDimensionScenerySource&&NV.getDimensionScenerySource(IDS[index]);
    const image=art&&art.ready&&!art.error?art.image:null;
    if(surface&&surfaceIndex===index&&surfaceArt===image)return surface;
    const start=clock();if(!surface){surface=document.createElement('canvas');surface.width=512;surface.height=320;}
    if(!materialNoise){
      materialNoise=new Uint8Array(512*320*3);
      for(let y=0;y<320;y++)for(let x=0;x<512;x++){
        const u=x/511,v=y/319,k=(y*512+x)*3;
        materialNoise[k]=Math.round(noise(u*8,v*6)*255);materialNoise[k+1]=Math.round(noise(u*35+7,v*28)*255);materialNoise[k+2]=Math.round(noise(u*18,v*13)*255);
      }
    }
    const ctx=surface.getContext('2d'),data=ctx.createImageData(512,320),color=COLORS[index],plumes=PLUMES[index];baseMask.fill(0);
    for(let x=0;x<512;x++)for(let j=0;j<2;j++){
      const u=x/511,p=plumes[j],t=(u-p[0])/(p[1]-p[0]),k=x*2+j;
      centres[k]=line(p,u);widths[k]=t>0&&t<1?p[5]*Math.pow(Math.sin(t*Math.PI),.45):0;
    }
    for(let y=0;y<320;y++)for(let x=0;x<512;x++){
      const u=x/511,v=y/319,nk=(y*512+x)*3,n=materialNoise[nk]/255,fine=materialNoise[nk+1]/255,curl=materialNoise[nk+2]/255;
      let mass=0;
      for(let j=0;j<2;j++){const k=x*2+j,w=widths[k];if(w<=0)continue;
        const d=(v-centres[k]+(n-.5)*.055)/w;if(Math.abs(d)>3.2)continue;
        mass=Math.max(mass,Math.exp(-d*d)*( .35+n*.5+fine*.3));
      }
      // Interleaved folds, dark pockets and irregular wisps. Not a soft ellipse.
      const ridge=.42+.58*Math.pow(Math.max(0,1-Math.abs(curl-.47)*2.4),2);
      const alpha=Math.min(190,Math.round(mass*ridge*185)),k=(y*512+x)*4,shade=.62+n*.22+fine*.16;
      data.data[k]=color[0]*shade;data.data[k+1]=color[1]*shade;data.data[k+2]=color[2]*shade;data.data[k+3]=alpha;
      const mi=Math.round(v*(ROWS-1))*COLS+Math.round(u*(COLS-1));baseMask[mi]=Math.max(baseMask[mi],alpha);
    }
    ctx.putImageData(data,0,0);
    if(image){
      // Reuse real gas detail from THIS approved landscape, not unrelated puffs.
      // Source-atop retains our traversable alpha topology; no pixel readback.
      const p=GAS_PATCHES[index];ctx.globalCompositeOperation='source-atop';ctx.globalAlpha=.42;
      ctx.drawImage(image,p[0]*image.naturalWidth,p[1]*image.naturalHeight,p[2]*image.naturalWidth,p[3]*image.naturalHeight,0,0,512,320);
      ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
    }
    // Four local, feathered gas patches cross the body plane. Never a fullscreen veil.
    for(let j=0;j<4;j++){
      const p=plumes[Math.floor(j/2)],u=p[0]+(p[1]-p[0])*(j%2?.68:.38),v=line(p,u);
      let patch=fronts[j];if(!patch){const canvas=document.createElement('canvas');canvas.width=128;canvas.height=96;patch=fronts[j]={canvas,u,v};}
      patch.u=u;patch.v=v;const c=patch.canvas.getContext('2d');c.clearRect(0,0,128,96);c.globalCompositeOperation='source-over';
      c.drawImage(surface,u*512-42,v*320-24,84,48,0,0,128,96);
      c.globalCompositeOperation='destination-in';const g=c.createRadialGradient(64,48,9,64,48,64);
      g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,128,96);c.globalCompositeOperation='source-over';
    }
    surfaceIndex=index;surfaceArt=image;surfaceRevision++;buildMs=clock()-start;return surface;
  }
  function drawFront(ctx){
    if(!active||index<0||!surface)return;
    ctx.save();ctx.shadowBlur=0;
    if(!NV.spaceResponse||NV.spaceResponse.getVisualStyle()==='clouds')for(const p of fronts){
      let u=(p.u-cropX)/cropW,v=(p.v-cropY)/cropH;if(variant&1)u=1-u;if(variant&2)v=1-v;
      const x=u*W,y=v*H;fieldAt(x,y);const size=W*.095;
      const driftTime=NV.settings&&NV.settings.gameplay&&NV.settings.gameplay.reducedEffects?0:time;
      const ox=Math.sin(v*12+driftTime*.32+index)*6,oy=Math.cos(u*13-driftTime*.27+index)*6;
      ctx.globalAlpha=.17*(1-depletion*.92);ctx.drawImage(p.canvas,x+ox-size*.5,y+oy-size*.32,size,size*.64);
    }
    // Widely separated, tiny distant travelers; independent of combat actors.
    const reduced=NV.settings&&NV.settings.gameplay&&NV.settings.gameplay.reducedEffects,t=reduced?0:time;
    ctx.fillStyle='#a2aaa9';ctx.globalAlpha=.23;ctx.beginPath();
    for(let group=0;group<2;group++){
      const u=.12+((t*(.0014+group*.0003)+group*.47+index*.071)%1)*.75,v=.16+group*.57+Math.sin(t*.028+group*2+index)*.018;
      for(let k=0;k<3;k++)ctx.rect(u*W+k*3.5,v*H+Math.sin(k*2.1)*2,1.1,1.1);
    }ctx.fill();
    // Rare background meteor. Its thin dim trail cannot masquerade as a hostile shot.
    const phase=(t+index*5)%29;
    if(!reduced&&phase>2&&phase<2.8){const progress=(phase-2)/.8,x=W*(.16+progress*.20),y=H*(.12+progress*.045);
      ctx.globalAlpha=Math.sin(progress*Math.PI)*.25;ctx.strokeStyle='#a5adb5';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(x-15,y-3);ctx.lineTo(x,y);ctx.stroke();}
    ctx.restore();
  }
  function drawBehind(ctx,gpu){
    if(!active||gpu||NV.spaceResponse&&NV.spaceResponse.getVisualStyle()!=='clouds')return;
    const image=getSurface();if(!image)return;
    if(!fallbackCanvas){fallbackCanvas=document.createElement('canvas');fallbackCanvas.width=768;fallbackCanvas.height=448;
      maskCanvas=document.createElement('canvas');maskCanvas.width=COLS;maskCanvas.height=ROWS;maskData=maskCanvas.getContext('2d').createImageData(COLS,ROWS);}
    const c=fallbackCanvas.getContext('2d'),width=fallbackCanvas.width,height=fallbackCanvas.height;
    c.clearRect(0,0,width,height);c.save();
    if(variant&1){c.translate(width,0);c.scale(-1,1);}if(variant&2){c.translate(0,height);c.scale(1,-1);}
    c.drawImage(image,cropX*512,cropY*320,cropW*512,cropH*320,0,0,width,height);c.restore();
    const f=getGpuFrame();
    if(maskRevision!==f.revision){for(let k=0;k<COUNT;k++){const p=k*4;maskData.data[p]=maskData.data[p+1]=maskData.data[p+2]=0;maskData.data[p+3]=Math.round(f.pixels[p]*.94);}
      maskCanvas.getContext('2d').putImageData(maskData,0,0);maskRevision=f.revision;}
    c.globalCompositeOperation='destination-out';c.drawImage(maskCanvas,0,0,width,height);c.globalCompositeOperation='source-over';
    ctx.save();ctx.globalAlpha=1;ctx.drawImage(fallbackCanvas,0,0,W,H);ctx.restore();
  }
  NV.spaceHabitat=Object.freeze({update,hide,getSurface,getGpuFrame,getSurfaceRevision:()=>surfaceRevision,drawFront,drawBehind,
    sample(x,y){fieldAt(x,y);return {depletion,pile:compression,matter};},
    diagnostics(){let total=0,pushed=0,max=0;for(let k=0;k<COUNT;k++){total+=clear[k];pushed+=pile[k];max=Math.max(max,clear[k]);}
      return {active,reactive,scene:active?IDS[index]:null,grid:[COLS,ROWS],fieldBytes:COUNT*2*4,gpuBytes:COUNT*4,materialNoiseBytes:materialNoise?materialNoise.byteLength:0,revision,surfaceRevision,buildMs,
        totalDepletion:total,pushedMatter:pushed,maxDepletion:max,playerSources,enemySources,projectileSources,updates,updateMeanMs:updates?updateMs/updates:0,foregroundPatches:fronts.length};}
  });
})();
