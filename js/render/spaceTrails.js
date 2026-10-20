// Projectile material cuts, independent of cosmic/background deformation toggles.
// Read-only actor observation; bounded history and the established subtle artwork.
(() => {
  'use strict';
  const NV=window.NV;
  const IDS=['threshold','foundry','fracture','void-heart','ash-moon','jade-basin','drowned-vault','glass-desert'];
  const MATERIALS=['rgb(92,129,139)','rgb(143,108,78)','rgb(118,101,142)','rgb(128,92,111)',
    'rgb(117,113,115)','rgb(91,131,107)','rgb(86,117,145)','rgb(112,114,142)'];
  const CAPACITY=64,LIFE=.28,EMIT_INTERVAL=.03;
  const cuts=new Float32Array(CAPACITY*8);
  let previous=new WeakMap(),active=false,id='',sceneIndex=0,W=1,H=1,time=0,lastTime=-1,head=0;
  let updates=0,emissions=0,bulletSources=0,meteorSources=0,needleSources=0,overwritten=0,resets=0;
  function reset(){cuts.fill(0);previous=new WeakMap();head=0;lastTime=-1;resets++;}
  function hide(){if(active)reset();active=false;}
  function observe(key,x,y,kind){
    if(!Number.isFinite(x)||!Number.isFinite(y))return;
    let old=previous.get(key);
    if(!old){previous.set(key,new Float64Array([x,y,time-EMIT_INTERVAL,x,y]));return;}
    const dx=x-old[0],dy=y-old[1],step=Math.hypot(dx,dy);
    old[0]=x;old[1]=y;
    // No trails for stationary entities, spawning/relocation or out-of-arena shots.
    if(step<.001)return;
    if(step>Math.min(W,H)*.3){old[2]=time;old[3]=x;old[4]=y;return;}
    if(x<0||x>W||y<0||y>H){old[2]=time;old[3]=x;old[4]=y;return;}
    if(time-old[2]<EMIT_INTERVAL-1e-9)return;
    const ax=x-old[3],ay=y-old[4],distance=Math.hypot(ax,ay);
    const len=Math.min(46,distance+13),ux=dx/step,uy=dy/step,k=(head++%CAPACITY)*8;
    if(cuts[k+7]&&time-cuts[k+4]<LIFE)overwritten++;
    cuts[k]=x;cuts[k+1]=y;cuts[k+2]=x-ux*len;cuts[k+3]=y-uy*len;
    cuts[k+4]=time;cuts[k+5]=kind;cuts[k+6]=len;cuts[k+7]=1;
    old[2]=time;old[3]=x;old[4]=y;emissions++;
    if(kind===0)bulletSources++;else if(kind===1)meteorSources++;else needleSources++;
  }
  function projectile(entity,kind){
    if(!entity||entity.dead||!Number.isFinite(entity.vx)||!Number.isFinite(entity.vy))return;
    observe(entity,entity.x,entity.y,kind);
  }
  function update(o){
    if(!o.enabled||!(o.W>0&&o.H>0)||!Number.isFinite(o.time)){hide();return;}
    const nextId=o.id||'threshold';
    if(!active||id!==nextId||W!==o.W||H!==o.H||o.time<lastTime)reset();
    active=true;id=nextId;sceneIndex=Math.max(0,IDS.indexOf(id));W=o.W;H=o.H;
    if(o.paused||o.time===lastTime)return;
    time=o.time;lastTime=time;updates++;
    for(const b of o.bullets||[])projectile(b,0);
    for(const m of o.meteors||[])projectile(m,1);
    // These physical needles travel along attack geometry, not the bullets array.
    // Observe their real ray heads; never invent particles for warnings or beams.
    for(const e of o.enemies||[]){
      if(!e||e.dead||e.waveCleanup||e.killResolved||e.arrival)continue;
      const s=e.dimensionalThreat;
      if(!s||s.kind!=='snipe'||s.phase!=='active'||!s.geometry)continue;
      const cfg=NV.DIMENSIONAL_THREATS&&NV.DIMENSIONAL_THREATS[e.enemyTypeId||e.id];
      if(!cfg||!(cfg.active>0))continue;
      const t=Math.max(0,Math.min(1,s.elapsed/cfg.active));
      for(const ray of s.geometry.rays||[]){
        if(!Number.isFinite(ray.ax)||!Number.isFinite(ray.ay)||!Number.isFinite(ray.bx)||!Number.isFinite(ray.by))continue;
        observe(ray,ray.ax+(ray.bx-ray.ax)*t,ray.ay+(ray.by-ray.ay)*t,2);
      }
    }
  }
  function draw(ctx){
    if(!active)return;
    const reduced=!!(NV.settings&&NV.settings.gameplay&&NV.settings.gameplay.reducedEffects);
    ctx.save();ctx.shadowBlur=0;ctx.strokeStyle=MATERIALS[sceneIndex];ctx.lineWidth=1.5;ctx.lineCap='round';ctx.lineJoin='round';
    for(let group=0;group<4;group++){
      ctx.globalAlpha=(1-(group+.5)/4)*.32*(reduced?.55:1);ctx.beginPath();
      for(let i=0;i<CAPACITY;i++){
        const k=i*8,age=Math.max(0,time-cuts[k+4]);if(!cuts[k+7]||age>LIFE)continue;
        if(Math.min(3,Math.floor(age/.07))!==group)continue;
        const ex=cuts[k]-cuts[k+2],ey=cuts[k+1]-cuts[k+3],len=Math.hypot(ex,ey)||1,pad=3+age*12;
        ctx.moveTo(cuts[k+2]-ey/len*pad,cuts[k+3]+ex/len*pad);ctx.lineTo(cuts[k]-ey/len*pad,cuts[k+1]+ex/len*pad);
        ctx.moveTo(cuts[k+2]+ey/len*pad,cuts[k+3]-ex/len*pad);ctx.lineTo(cuts[k]+ey/len*pad,cuts[k+1]-ex/len*pad);
      }ctx.stroke();
    }ctx.restore();
  }
  NV.spaceTrails=Object.freeze({update,draw,hide,diagnostics(){
    let liveCuts=0;for(let i=0;i<CAPACITY;i++){const k=i*8,age=Math.max(0,time-cuts[k+4]);if(cuts[k+7]&&age<=LIFE)liveCuts++;}
    return {active,scene:active?id:null,time,capacity:CAPACITY,bytes:cuts.byteLength,life:LIFE,emitInterval:EMIT_INTERVAL,
      liveCuts,updates,emissions,bulletSources,meteorSources,needleSources,overwritten,resets};
  }});
})();
