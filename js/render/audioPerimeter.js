/* Speaker V4 adaptation: shared geometric instrument, outside world bounds. */
(() => {
  'use strict';
  const NV=window.NV=window.NV||{},TAU=Math.PI*2;
  const enabled=!!window.deadSingularityDesktopAudio?.systemAudio&&
    !/(?:^|[?&])(?:combatLab|dimensionLab|dimensionExperiment)=/.test(window.location?.search||'');
  const motion=NV.AudioPerimeterMotion.create(),TW=320,TH=64;
  const styles=NV.AudioVisualizerStyles.styles;
  let style=styles[0].id;
  let visible=false,capturing=false,cache=null;
  const stats={builds:0,drawCalls:0,modules:0,paints:0,culled:0};
  function surface(w,h){
    const c=typeof OffscreenCanvas==='function'?new OffscreenCanvas(w,h):document.createElement('canvas');
    c.width=w;c.height=h;return {canvas:c,ctx:c.getContext('2d')};
  }
  function prepare(color){
    if(cache&&cache.color===color)return cache;
    const live=surface(TW,TH);
    cache={color,live:live.canvas,ctx:live.ctx,nextPaint:0,lastTime:-1,tier:null};
    stats.builds++;return cache;
  }
  function paint(c,tier){
    const time=motion._time,period=tier==='full'?1/60:tier==='reduced'?1/40:1/24;
    if(c.tier===tier&&c.wasSilent&&motion.visualActivity===0)return;
    if(c.tier===tier&&c.lastTime>=0&&time>=c.lastTime&&time<c.nextPaint)return;
    c.nextPaint=c.lastTime<0||time<c.lastTime||time-c.nextPaint>.1?time+period:c.nextPaint+period;
    c.lastTime=time;c.tier=tier;c.wasSilent=motion.visualActivity===0;stats.paints++;
    NV.AudioVisualizerStyles.draw(style,c.ctx,c,motion,tier);
  }
  function tick(dt,options){
    if(!enabled)return;
    const connected=!!(NV.rhythm?.enabled&&NV.rhythm.active&&NV.rhythm.state==='listening');
    if(!connected){visible=false;if(capturing){Object.assign(motion,NV.AudioPerimeterMotion.create());NV.AudioVisualizerStyles.reset();if(cache){cache.lastTime=-1;cache.tier=null;}}capturing=false;return;}
    capturing=true;const o=options||{};visible=!!o.active&&!o.hidden;
    if(!visible||o.paused)return;NV.AudioPerimeterMotion.update(motion,NV.rhythm,dt);
  }
  function onScreen(t,canvas,x,y,vertical){
    if(!t||!canvas)return true;
    const hx=vertical?13:70,hy=vertical?70:13;
    const cx=t.a*x+t.c*y+t.e,cy=t.b*x+t.d*y+t.f;
    const ex=Math.abs(t.a)*hx+Math.abs(t.c)*hy,ey=Math.abs(t.b)*hx+Math.abs(t.d)*hy;
    return cx+ex>=0&&cy+ey>=0&&cx-ex<=canvas.width&&cy-ey<=canvas.height;
  }
  function draw(ctx,W,H,wave,options){
    stats.modules=0;stats.culled=0;
    if(!enabled||!visible||!ctx||!Number.isFinite(W)||!Number.isFinite(H)||W<=0||H<=0)return 0;
    if(!NV.rhythm?.enabled||!NV.rhythm.active||NV.rhythm.state!=='listening')return 0;
    const pad=NV.viewport?.cameraExteriorPadding||0;if(pad<8)return 0;
    const color=NV.sectorVisualForWave?NV.sectorVisualForWave(wave,options).accent:'#63e8ff';
    let ready=null;const transform=ctx.getTransform?ctx.getTransform():null;ctx.save();ctx.beginPath();
    ctx.rect(-pad,-pad,W+pad*2,pad);ctx.rect(-pad,H,W+pad*2,pad);ctx.rect(-pad,0,pad,H);ctx.rect(W,0,pad,H);ctx.clip();
    for(let side=0;side<4;side++){
      const x=side===0?W*.28:side===1?W+pad*.5:side===2?W*.72:-pad*.5;
      const y=side===0?-pad*.5:side===1?H*.62:side===2?H+pad*.5:H*.38;
      if(!onScreen(transform,ctx.canvas,x,y,!!(side%2))){stats.culled++;continue;}
      if(!ready){ready=prepare(color);paint(ready,options?.tier||'full');}
      ctx.save();ctx.translate(x,y);ctx.rotate(side*Math.PI/2);
      const scale=Math.min(1,pad/28);ctx.scale(scale,scale);ctx.drawImage(ready.live,-70,-13,140,26);ctx.restore();
      stats.drawCalls++;stats.modules++;
    }
    ctx.restore();return stats.modules;
  }
  function setStyle(id){
    if(!enabled||!styles.some(s=>s.id===id))return false;
    if(style!==id){style=id;NV.AudioVisualizerStyles.reset();if(cache){cache.lastTime=-1;cache.tier=null;}}
    return true;
  }
  NV.AudioPerimeter=Object.freeze({enabled,tick,draw,styles,getStyle:()=>style,setStyle,snapshot:()=>({enabled,visible,style,design:NV.AudioVisualizerStyles.snapshot(),
    motion:{mode:motion.mode,connected:motion.connected,drive:motion.drive,strike:motion.strike,stroke:motion.stroke,
      microPulse:motion.microPulse,microHits:motion.microHits,sway:motion.sway,energy:motion.energy,
      intensity:motion.intensity,aggression:motion.aggression,sustain:motion.sustain,brightness:motion.brightness,
      tension:motion.tension,drop:motion.drop,release:motion.release,kickPulse:motion.kickPulse,snarePulse:motion.snarePulse,
      hatPulse:motion.hatPulse,attackPulse:motion.attackPulse,rush:motion.rush,dynamics:motion.dynamics,crest:motion.crest,
      musicLevel:motion.musicLevel,subBass:motion.subBass,body:motion.body,presence:motion.presence,air:motion.air,
      percussion:motion.percussion,percussionStroke:motion.percussionStroke,percussionId:motion.percussionId,visualIntensity:motion.visualIntensity,
      bandFlux:Array.from(motion.bandFlux),spectrum:Array.from(motion.spectrum),peaks:Array.from(motion.peaks)},stats:Object.assign({},stats)})});
  if(enabled){
    NV.drawRhythmLayer=function(){};NV.rhythmShakeBoost=function(){return 0;};
    const stars=NV.drawStarfield;
    if(stars)NV.drawStarfield=function(ctx,W,H,frame,px,py,rhythm,camera){return stars(ctx,W,H,frame,px,py,null,camera);};
  }
})();
