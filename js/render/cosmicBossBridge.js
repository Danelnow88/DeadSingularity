// Presentation-only adapter. Never writes boss, player, attacks or hitboxes.
(() => {
  'use strict';
  const NV=window.NV,shots=new WeakMap();
  const clamp=v=>Math.max(0,Math.min(1,v));
  const neutralLook=Object.freeze({x:0,y:0});
  function pose(boss,time){
    const encounter=boss.encounter,stage=encounter&&encounter.stage;
    let charge=0,fire=0;
    if(encounter){
      const cast=Number(encounter.cast)||0,previous=shots.get(boss);
      let firedAt=previous?previous.firedAt:-Infinity;
      // A completed cast can go straight from windup to recovery in one tick.
      if(previous&&cast>previous.cast)firedAt=time;
      if(previous&&time<previous.time)firedAt=-Infinity;
      shots.set(boss,{cast,firedAt,time});
      fire=clamp(1-(time-firedAt)/.22);
      if(stage==='windup'){
        const profile=NV.BOSS_ENCOUNTER_PROFILES&&NV.BOSS_ENCOUNTER_PROFILES[boss.primaryAttack||boss.attack];
        const timing=NV.bossEncounterTiming?NV.bossEncounterTiming(NV.runDifficulty):{windup:1};
        const duration=(profile?profile.windup:1)*(timing.windup||1);
        charge=clamp(1-Math.max(0,Number(encounter.t)||0)/duration);
      }
      if(stage==='fire')fire=Math.max(fire,.8);
    }
    return {phase:stage==='windup'?'charge':fire>0?'release':boss.phase2?'fury':'idle',charge,fire,rage:boss.phase2?1:0,strike:fire};
  }
  NV.cosmicBossVisualPose=pose;
  NV.drawCosmicBoss=function(ctx,boss,frame,options){
    if(!NV.cosmicBossArt||!boss||boss.isBoss!==true||boss.dead||boss.hp<=0)return false;
    const index=Number(boss.visual?boss.visual.bossIndex:boss.bossIndex)-1;
    const definition=NV.cosmicBossArt.definitions[index];
    if(!definition)return false;
    options=options||{};
    const referenceFrame=NV.presentationClock?NV.presentationClock.resolveFrame(frame):frame;
    const time=Math.max(0,Number(referenceFrame)||0)/60;
    const target=options.player;
    let look=neutralLook;
    if(target&&Number.isFinite(target.x)&&Number.isFinite(target.y)){
      const dx=target.x-boss.x,dy=target.y-boss.y,d=Math.hypot(dx,dy)||1;
      look={x:dx/d,y:dy/d};
    }
    const radius=Math.max(1,Number(boss.radius)||1);
    // Stay within the established ~2.1-radius presentation envelope. The
    // physical circle and projectile origins remain exactly where they were.
    const scale=radius*3.8/definition.bounds*(Number(options.scale)>0?options.scale/1.15:1);
    ctx.save();
    try{
      ctx.translate(boss.x,boss.y);ctx.shadowBlur=0;
      ctx.save();
      try{
        ctx.scale(scale,scale);ctx.translate(0,-definition.cy);
        NV.cosmicBossArt.drawLocal(ctx,index,time,look,pose(boss,time));
      }finally{ctx.restore();}
      if(options.showHitbox){ctx.strokeStyle='#ff6097';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.stroke();}
    }finally{ctx.restore();}
    return true;
  };
})();
