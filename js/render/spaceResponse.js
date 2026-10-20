// Shared cosmic near-field response: world-space elastic dust, presentation only.
// No actor properties, collision grids, damage or gameplay RNG are modified.
(() => {
  'use strict';
  const NV=window.NV;
  const IDS=['threshold','foundry','fracture','void-heart','ash-moon','jade-basin','drowned-vault','glass-desert'];
  const MATERIALS=[[92,129,139],[143,108,78],[118,101,142],[128,92,111],[117,113,115],[91,131,107],[86,117,145],[112,114,142]];
  const MATERIAL_CSS=MATERIALS.map(c=>'rgb('+c.join(',')+')');
  const RESPONSE_GAIN=.20,MAX_VISIBLE_DISPLACEMENT=7.6;
  const COLS=33,ROWS=19,COUNT=COLS*ROWS,STEP=1/120,CUTS=64;
  const dx=new Float32Array(COUNT),dy=new Float32Array(COUNT);
  const previousDx=new Float32Array(COUNT),previousDy=new Float32Array(COUNT);
  const renderDx=new Float32Array(COUNT),renderDy=new Float32Array(COUNT);
  const vx=new Float32Array(COUNT),vy=new Float32Array(COUNT);
  const fx=new Float32Array(COUNT),fy=new Float32Array(COUNT);
  const cuts=new Float32Array(CUTS*8),points=new Float32Array(COLS*2);
  const GRAINS=256,grains=new Float32Array(GRAINS*3);
  const grainDraw=new Float32Array(GRAINS*4);
  const gpuFrame={width:COLS,height:ROWS,pixels:new Uint8Array(COUNT*4),revision:0,limit:38,gain:1};
  let revision=1,encodedRevision=-1,cloudSurface=null,gpuSurface=false,visualStyle='clouds';
  let sceneIndex=-1,surfaceIndex=-1,surfaceRevision=0;
  const density=new Uint8Array(COUNT),grainNoise=new Float32Array(64*64);
  const laneCentre=new Float32Array(512*3),laneKnots=new Float32Array(512*3);
  let surfaceBuilds=0,surfaceBuildMs=0;
  let seed=13231;
  for(let i=0;i<grains.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;grains[i]=seed/4294967296;}
  for(let i=0;i<grainNoise.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;grainNoise[i]=seed/4294967296;}
  let active=false,reactive=true,W=1,H=1,lastTime=-1,accumulator=0,time=0,variant=0;
  let previous=new WeakMap(),cutHead=0,playerSources=0,enemySources=0,bulletSources=0;
  let steps=0,updates=0,updateMs=0,drawMs=0,draws=0,sampleX=0,sampleY=0;
  const now=()=>typeof performance!=='undefined'?performance.now():0;
  function reset(){
    dx.fill(0);dy.fill(0);vx.fill(0);vy.fill(0);fx.fill(0);fy.fill(0);cuts.fill(0);
    previousDx.fill(0);previousDy.fill(0);renderDx.fill(0);renderDy.fill(0);
    previous=new WeakMap();lastTime=-1;accumulator=0;cutHead=0;
    revision++;
  }
  function hide(){if(active)reset();active=false;gpuSurface=false;}
  function enabled(){return !(NV.settings&&NV.settings.graphics&&NV.settings.graphics.spaceResponse===false)&&
    !(NV.settings&&NV.settings.gameplay&&NV.settings.gameplay.reducedEffects);}
  function sample(x,y){
    const gx=Math.max(0,Math.min(COLS-1.001,x/W*(COLS-1))),gy=Math.max(0,Math.min(ROWS-1.001,y/H*(ROWS-1)));
    const ix=Math.floor(gx),iy=Math.floor(gy),tx=gx-ix,ty=gy-iy,k=iy*COLS+ix;
    sampleX=(renderDx[k]*(1-tx)+renderDx[k+1]*tx)*(1-ty)+(renderDx[k+COLS]*(1-tx)+renderDx[k+COLS+1]*tx)*ty;
    sampleY=(renderDy[k]*(1-tx)+renderDy[k+1]*tx)*(1-ty)+(renderDy[k+COLS]*(1-tx)+renderDy[k+COLS+1]*tx)*ty;
  }
  function visualSample(x,y){
    sample(x,y);const length=Math.hypot(sampleX,sampleY),gain=Math.min(RESPONSE_GAIN,MAX_VISIBLE_DISPLACEMENT/(length||1));
    sampleX*=gain;sampleY*=gain;
  }
  function force(x,y,mx,my,radius,strength){
    const speed=Math.hypot(mx,my);if(speed<3)return false;
    const sx=mx/speed,sy=my/speed,limited=Math.min(speed,900),rr=radius*radius;
    const left=Math.max(1,Math.floor((x-radius)/W*(COLS-1))),right=Math.min(COLS-2,Math.ceil((x+radius)/W*(COLS-1)));
    const top=Math.max(1,Math.floor((y-radius)/H*(ROWS-1))),bottom=Math.min(ROWS-2,Math.ceil((y+radius)/H*(ROWS-1)));
    for(let j=top;j<=bottom;j++)for(let i=left;i<=right;i++){
      const ox=i*W/(COLS-1)-x,oy=j*H/(ROWS-1)-y,d2=(ox*ox+oy*oy)/rr;if(d2>=1)continue;
      const k=j*COLS+i,weight=(1-d2)*(1-d2),side=(-sy*ox+sx*oy)/radius;
      // Forward advection + lateral separation opens a path through the dust.
      fx[k]+=(sx*.8-sy*side*3.2)*limited*strength*weight;
      fy[k]+=(sy*.8+sx*side*3.2)*limited*strength*weight;
    }
    return true;
  }
  function body(entity,dt,isPlayer){
    if(!entity||entity.dead||!Number.isFinite(entity.x)||!Number.isFinite(entity.y))return;
    let old=previous.get(entity);
    if(!old){old=new Float64Array([entity.x,entity.y]);previous.set(entity,old);return;}
    const mx=(entity.x-old[0])/dt,my=(entity.y-old[1])/dt;
    old[0]=entity.x;old[1]=entity.y;
    if(Math.hypot(mx,my)*dt>Math.min(W,H)*.3)return; // relocation/spawn, not a swept wake
    const radius=Math.max(isPlayer?64:48,(Number(entity.radius)||18)+30)*(isPlayer&&entity.dashActive?1.12:1);
    if(force(entity.x,entity.y,mx,my,radius,isPlayer?(entity.dashActive?26:16):6)){
      if(isPlayer)playerSources++;else enemySources++;
    }
  }
  function projectile(b,dt){
    if(!b||b.dead||!Number.isFinite(b.x)||!Number.isFinite(b.y)||!Number.isFinite(b.vx)||!Number.isFinite(b.vy))return;
    const speed=Math.hypot(b.vx,b.vy);if(speed<10)return;
    const distance=Math.min(speed*dt,Math.min(W,H)*.25),segments=Math.max(1,Math.min(5,Math.ceil(distance/16)));
    const ux=b.vx/speed,uy=b.vy/speed,radius=26+Math.min(8,b.radius||0);
    for(let j=0;j<segments;j++){
      const back=distance*j/segments;
      force(b.x-ux*back,b.y-uy*back,b.vx,b.vy,radius,.9/segments);
    }
    bulletSources++;
    // The approved air cuts now belong to spaceTrails, independent of F6.
  }
  function integrate(){
    previousDx.set(dx);previousDy.set(dy);
    const damping=Math.exp(-4.5*STEP),limit=Math.min(38,Math.min(W,H)*.065);
    for(let y=1;y<ROWS-1;y++)for(let x=1;x<COLS-1;x++){
      const k=y*COLS+x;
      const lapX=dx[k-1]+dx[k+1]+dx[k-COLS]+dx[k+COLS]-dx[k]*4;
      const lapY=dy[k-1]+dy[k+1]+dy[k-COLS]+dy[k+COLS]-dy[k]*4;
      vx[k]=(vx[k]+(fx[k]-dx[k]*18+lapX*12)*STEP)*damping;
      vy[k]=(vy[k]+(fy[k]-dy[k]*18+lapY*12)*STEP)*damping;
    }
    for(let k=0;k<COUNT;k++){
      dx[k]=Math.max(-limit,Math.min(limit,dx[k]+vx[k]*STEP));
      dy[k]=Math.max(-limit,Math.min(limit,dy[k]+vy[k]*STEP));
    }
    steps++;
    revision++;
  }
  function update(o){
    const nextIndex=IDS.indexOf(o.id);
    if(!o.enabled||nextIndex<0||!(o.W>0&&o.H>0)){hide();return;}
    const next=enabled(),nextVariant=o.variant||0;
    if(!active||sceneIndex!==nextIndex||W!==o.W||H!==o.H||variant!==nextVariant||reactive!==next||o.time<lastTime){reset();}
    W=o.W;H=o.H;variant=nextVariant;sceneIndex=nextIndex;active=true;reactive=next;
    // Paused rendering may continue, but sources and simulation never do.
    if(o.paused||o.time===lastTime)return;
    const start=now(),dt=lastTime<0?0:Math.min(.05,Math.max(0,o.time-lastTime));
    lastTime=o.time;time=o.time;
    if(!reactive)return;
    if(dt===0){
      if(o.player)previous.set(o.player,new Float64Array([o.player.x,o.player.y]));
      for(const e of o.enemies||[])if(e&&!e.dead)previous.set(e,new Float64Array([e.x,e.y]));
      return;
    }
    fx.fill(0);fy.fill(0);
    body(o.player,dt,true);
    for(const e of o.enemies||[])body(e,dt,false);
    for(const b of o.bullets||[])projectile(b,dt);
    accumulator+=dt;
    while(accumulator>=STEP){integrate();accumulator-=STEP;}
    // The spring remains fixed at 120 Hz, but its presentation is continuous at
    // every rAF (including 165 Hz). Standard interpolation, no actor prediction.
    const alpha=Math.max(0,Math.min(1,accumulator/STEP));
    for(let k=0;k<COUNT;k++){
      renderDx[k]=previousDx[k]+(dx[k]-previousDx[k])*alpha;
      renderDy[k]=previousDy[k]+(dy[k]-previousDy[k])*alpha;
    }
    revision++;
    updates++;updateMs+=now()-start;
  }
  function path(ctx,band,current,shift){
    for(let i=0;i<COLS;i++){
      const u=i/(COLS-1),x=u*W;
      const y=H*(.20+current*.29+u*.08+Math.sin(u*5.4+current*2)*.055)+(band-2)*(4+Math.sin(u*Math.PI)*6);
      visualSample(x,y);points[i*2]=x+sampleX;points[i*2+1]=y+sampleY+shift;
    }
    ctx.moveTo(points[0],points[1]);
    for(let i=1;i<COLS-1;i++)ctx.quadraticCurveTo(points[i*2],points[i*2+1],(points[i*2]+points[i*2+2])*.5,(points[i*2+1]+points[i*2+3])*.5);
    ctx.lineTo(points[(COLS-1)*2],points[(COLS-1)*2+1]);
  }
  function getGpuFrame(){
    if(encodedRevision!==revision){
      gpuFrame.limit=Math.min(38,Math.min(W,H)*.065);const factor=127/(gpuFrame.limit||38);
      for(let i=0;i<COUNT;i++){const k=i*4;
        gpuFrame.pixels[k]=Math.max(0,Math.min(255,Math.round(128+renderDx[i]*factor)));
        gpuFrame.pixels[k+1]=Math.max(0,Math.min(255,Math.round(128+renderDy[i]*factor)));
        gpuFrame.pixels[k+2]=Math.min(255,Math.round((Math.abs(renderDx[i])+Math.abs(renderDy[i]))*5));gpuFrame.pixels[k+3]=255;
      }
      encodedRevision=revision;gpuFrame.revision=revision;
    }
    gpuFrame.gain=active&&reactive?RESPONSE_GAIN:0;return gpuFrame;
  }
  function textureNoise(x,y){
    const ix=Math.floor(x),iy=Math.floor(y),tx=x-ix,ty=y-iy,fx=tx*tx*(3-2*tx),fy=ty*ty*(3-2*ty);
    const a=grainNoise[(iy&63)*64+(ix&63)],b=grainNoise[(iy&63)*64+((ix+1)&63)];
    const c=grainNoise[((iy+1)&63)*64+(ix&63)],d=grainNoise[((iy+1)&63)*64+((ix+1)&63)];
    return (a+(b-a)*fx)*(1-fy)+(c+(d-c)*fx)*fy;
  }
  function getCloudSurface(){
    if(cloudSurface&&surfaceIndex===sceneIndex)return cloudSurface;
    if(typeof document==='undefined'||sceneIndex<0)return null;
    if(!cloudSurface){cloudSurface=document.createElement('canvas');cloudSurface.width=512;cloudSurface.height=320;}
    const start=now(),ctx=cloudSurface.getContext('2d'),pixels=ctx.createImageData(512,320),color=MATERIALS[sceneIndex];
    // Quiet, ragged gas folds rather than a tiled grid, opaque hull or new landscape.
    // Prepared once per scene: the original nebula remains the dominant artwork.
    density.fill(0);
    for(let x=0;x<512;x++)for(let c=0;c<3;c++){
      const u=x/511,k=x*3+c;laneCentre[k]=.18+c*.29+u*.08+Math.sin(u*5.4+c*2+sceneIndex*.17)*.065;
      laneKnots[k]=.3+.7*Math.pow(Math.max(0,Math.sin(u*7.1+c*1.9)),2);
    }
    for(let y=0;y<320;y++)for(let x=0;x<512;x++){
      const u=x/511,v=y/319,n=textureNoise(u*7+sceneIndex*2,v*5),fine=textureNoise(u*27,v*22);
      let envelope=0;
      for(let c=0;c<3;c++){
        const centre=laneCentre[x*3+c];
        const width=.033+n*.033,fold=(v-centre+(n-.5)*.06)/width;
        if(Math.abs(fold)>3.6)continue;
        const knots=laneKnots[x*3+c];
        envelope=Math.max(envelope,Math.exp(-fold*fold)*knots);
      }
      const fringe=Math.max(0,Math.min(1,Math.min(u,1-u)*12));
      const alpha=Math.round(envelope*fringe*(.35+n*.4+fine*.25)*62),k=(y*512+x)*4;
      const shade=.52+fine*.30+n*.18;
      pixels.data[k]=color[0]*shade;pixels.data[k+1]=color[1]*shade;pixels.data[k+2]=color[2]*shade;pixels.data[k+3]=alpha;
      const mi=Math.round(v*18)*33+Math.round(u*32);density[mi]=Math.max(density[mi],alpha);
    }
    ctx.putImageData(pixels,0,0);surfaceIndex=sceneIndex;surfaceRevision++;surfaceBuilds++;surfaceBuildMs=now()-start;
    return cloudSurface;
  }
  function drawCloudFallback(ctx){
    const surface=getCloudSurface();if(!surface)return;
    // One cached gas submission, with reactive grains/cuts below. No affine tile seams.
    ctx.globalAlpha=1;ctx.drawImage(surface,0,0,W,H);
  }
  function drawBehind(ctx){
    if(!active)return;const start=now();ctx.save();ctx.shadowBlur=0;ctx.lineCap='round';ctx.lineJoin='round';
    if(visualStyle==='clouds'){if(!gpuSurface&&!NV.spaceHabitat)drawCloudFallback(ctx);}
    else {
    ctx.globalAlpha=.5;ctx.strokeStyle='#243945';ctx.lineWidth=9;ctx.beginPath();
    for(let current=0;current<3;current++)for(let band=0;band<5;band++)path(ctx,band,current,0);ctx.stroke();
    ctx.globalAlpha=.28;ctx.strokeStyle='#47747a';ctx.lineWidth=1.5;ctx.beginPath();
    for(let current=0;current<3;current++)for(let band=0;band<5;band+=2)path(ctx,band,current,-2);ctx.stroke();
    ctx.globalAlpha=.18;ctx.strokeStyle='#896c50';ctx.lineWidth=2;ctx.beginPath();
    for(let current=0;current<3;current++)path(ctx,3,current,1);ctx.stroke();
    }
    // Persistent world-space grains: no newly spawned particle objects per frame.
    ctx.fillStyle=MATERIAL_CSS[sceneIndex];
    for(let i=0;i<GRAINS;i++){
      const k=i*3,x=grains[k]*W,y=grains[k+1]*H;visualSample(x,y);
      const n=i*4;grainDraw[n]=x+sampleX;grainDraw[n+1]=y+sampleY;grainDraw[n+2]=1.1+grains[k+2]*1.3;
      grainDraw[n+3]=Math.abs(sampleX)+Math.abs(sampleY)>2?1:0;
    }
    for(let group=0;group<2;group++){ctx.globalAlpha=group?.36:.19;ctx.beginPath();
      // Keep every grain and its interpolated position; avoid the large sparse mask.
      for(let i=0;i<GRAINS;i++){const n=i*4;if(grainDraw[n+3]===group)ctx.fillRect(grainDraw[n],grainDraw[n+1],grainDraw[n+2],grainDraw[n+2]);}}
    if(reactive&&!NV.spaceTrails){
      ctx.lineWidth=1.5;ctx.strokeStyle=MATERIAL_CSS[sceneIndex];
      for(let group=0;group<4;group++){ctx.globalAlpha=(1-(group+.5)/4)*.32;ctx.beginPath();
      for(let i=0;i<CUTS;i++){
        const k=i*8,age=time-cuts[k+4];if(!cuts[k+7]||age<0||age>.28)continue;
        if(Math.min(3,Math.floor(age/.07))!==group)continue;
        const ex=cuts[k]-cuts[k+2],ey=cuts[k+1]-cuts[k+3],len=Math.hypot(ex,ey)||1,pad=3+age*12;
        ctx.moveTo(cuts[k+2]-ey/len*pad,cuts[k+3]+ex/len*pad);ctx.lineTo(cuts[k]-ey/len*pad,cuts[k+1]+ex/len*pad);
        ctx.moveTo(cuts[k+2]+ey/len*pad,cuts[k+3]-ex/len*pad);ctx.lineTo(cuts[k]+ey/len*pad,cuts[k+1]-ex/len*pad);
      }ctx.stroke();}
    }
    ctx.restore();draws++;drawMs+=now()-start;
  }
  function drawFront(ctx,t,p){
    if(!active||!reactive||!p)return;
    const gx=Math.max(0,Math.min(32,Math.round(p.x/W*32))),gy=Math.max(0,Math.min(18,Math.round(p.y/H*18)));
    if(density[gy*33+gx]<=5)return; // no contact edge in empty vacuum
    visualSample(p.x,p.y);const amount=Math.min(1,Math.hypot(sampleX,sampleY)/7.6);if(amount<.06)return;
    ctx.save();ctx.shadowBlur=0;ctx.strokeStyle=MATERIAL_CSS[sceneIndex];ctx.globalAlpha=amount*.20;ctx.lineWidth=1.5;ctx.lineCap='round';
    // Local material edges below the eyes/body; no fullscreen fog or actor tint.
    ctx.beginPath();ctx.moveTo(p.x-22,p.y+19);ctx.quadraticCurveTo(p.x+sampleX*.4,p.y+25+sampleY*.4,p.x+22,p.y+19);ctx.stroke();ctx.restore();
  }
  NV.spaceResponse=Object.freeze({update,hide,drawBehind,drawFront,getCloudSurface,getGpuFrame,getCloudSurfaceRevision:()=>surfaceRevision,
    setGpuSurface(value){gpuSurface=!!value;},getVisualStyle:()=>visualStyle,
    setVisualStyle(value){if(value!=='lines'&&value!=='clouds')return false;visualStyle=value;return true;},
    sample(x,y){sample(x,y);return {x:sampleX,y:sampleY};},
    diagnostics(){let energy=0;for(let i=0;i<COUNT;i++)energy+=dx[i]*dx[i]+dy[i]*dy[i];
      return {active,reactive,scene:active?IDS[sceneIndex]:null,visualStyle,gpuSurface,cloudReady:!!cloudSurface,cloudBytes:512*320*4,surfaceBuilds,surfaceBuildMs,visibleGain:RESPONSE_GAIN,maxVisibleDisplacement:MAX_VISIBLE_DISPLACEMENT,gpuFieldBytes:COUNT*4,grid:[COLS,ROWS],fieldBytes:COUNT*6*4,cutCapacity:CUTS,grainCount:GRAINS,
        interpolationBytes:COUNT*4*4,interpolationAlpha:Math.max(0,Math.min(1,accumulator/STEP)),
        steps,updates,time,energy,playerSources,enemySources,bulletSources,updateMeanMs:updates?updateMs/updates:0,drawMeanMs:draws?drawMs/draws:0};}
  });
})();
