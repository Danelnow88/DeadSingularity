(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else (root.NV=root.NV||{}).CoreEvasion=factory();
})(typeof window==='undefined'?globalThis:window,function(){
  'use strict';
  const STEP=1/120,ANGLES=[0,.65,-.65,1.25,-1.25,Math.PI];
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  function create(target) {
    return {originX:target.x,originY:target.y,time:0,accumulator:0,think:0,heading:0,
      wantedSpeed:0,burst:0,burstCooldown:0,recovery:0,hitMemory:0,lastHp:target.hp,
      danger:0,opportunity:false,point:{x:target.x,y:target.y},bulletCursor:0};
  }
  function decide(brain,target,ctx) {
    const dx=target.x-ctx.player.x,dy=target.y-ctx.player.y,distance=Math.hypot(dx,dy);
    const away=Math.atan2(dy,dx),side=target.pattern===1?-1:1;
    let danger=clamp((300-distance)/170,0,1),incoming=false,dodge=0;
    const bullets=ctx.bullets||[],count=Math.min(96,bullets.length);
    // Only observable shots, sampled at decision ticks; no perfect instant dodge.
    for(let i=0;i<count;i++) {
      const b=bullets[(brain.bulletCursor+i)%bullets.length];
      if(!b||b.dead||b.isEnemy)continue;
      const vx=b.vx||0,vy=b.vy||0,speed2=vx*vx+vy*vy;if(speed2<1)continue;
      const rx=target.x-b.x,ry=target.y-b.y,t=(rx*vx+ry*vy)/speed2;
      if(t<.12||t>.65)continue;
      if(Math.hypot(rx-vx*t,ry-vy*t)<target.radius+15) {
        incoming=true;dodge=Math.atan2(vy,vx)+side*Math.PI/2;break;
      }
    }
    if(bullets.length)brain.bulletCursor=(brain.bulletCursor+count)%bullets.length;
    if(incoming)danger=Math.max(danger,.85);
    if(brain.hitMemory>0)danger=Math.max(danger,.9);
    brain.danger=danger;
    const playerSpeed=ctx.player.effectiveMoveSpeed||ctx.player.speed||195;
    const top=Math.min(145,Math.max(55,playerSpeed*.76));
    if(danger>.78&&brain.burstCooldown<=0&&brain.recovery<=0) {
      brain.burst=.85;brain.burstCooldown=4.2;
    }
    brain.wantedSpeed=brain.recovery>0?Math.min(48,top):brain.burst>0?top:
      danger>.5?Math.min(108,top):danger>.12?Math.min(78,top):Math.min(38,top);
    const desired=incoming?dodge:away+side*(distance>300?1.85:distance>200?.85:.3);
    let best=-Infinity,bestAngle=desired;
    for(const offset of ANGLES) {
      const angle=desired+offset,look=Math.max(65,brain.wantedSpeed*.9);
      const x=target.x+Math.cos(angle)*look,y=target.y+Math.sin(angle)*look;
      if(x<48||x>ctx.W-48||y<48||y>ctx.H-48)continue;
      brain.point.x=x;brain.point.y=y;
      if(ctx.unsafe&&ctx.unsafe(brain.point,target.radius))continue;
      const nextDistance=Math.hypot(x-ctx.player.x,y-ctx.player.y);
      let score=Math.cos(offset)*45+(nextDistance-distance)*danger*.55;
      score-=Math.abs(nextDistance-270)*.12;
      score-=Math.max(0,Math.hypot(x-brain.originX,y-brain.originY)-360)*.8;
      score+=Math.min(x-48,ctx.W-48-x,y-48,ctx.H-48-y)*.05;
      if(ctx.view)score-=Math.max(0,ctx.view.x+44-x,x-ctx.view.x-ctx.view.width+44,
        ctx.view.y+44-y,y-ctx.view.y-ctx.view.height+44)*2;
      if(score>best){best=score;bestAngle=angle;}
    }
    brain.heading=bestAngle;if(best===-Infinity)brain.wantedSpeed=0;
    brain.opportunity=distance>=185&&distance<=470&&danger<.8&&brain.burst<=0;
    target.aiState=brain.recovery>0?'recover':brain.burst>0?'escape':brain.opportunity?'skirmish':'evade';
    target.danger=danger;
  }
  function update(brain,target,dt,ctx) {
    if(target.hp<brain.lastHp)brain.hitMemory=.9;brain.lastHp=target.hp;
    brain.accumulator+=Math.min(dt,.1);
    let iterations=0;
    while(brain.accumulator+1e-9>=STEP&&iterations++<12) {
      brain.accumulator=Math.max(0,brain.accumulator-STEP);brain.time+=STEP;
      brain.hitMemory=Math.max(0,brain.hitMemory-STEP);
      brain.burstCooldown=Math.max(0,brain.burstCooldown-STEP);
      brain.recovery=Math.max(0,brain.recovery-STEP);
      if(brain.burst>0){brain.burst=Math.max(0,brain.burst-STEP);if(!brain.burst)brain.recovery=.85;}
      brain.think-=STEP;
      if(brain.think<=0){decide(brain,target,ctx);brain.think=.18;}
      const speed=brain.wantedSpeed*(target.windup>0?.35:1);
      const desiredX=Math.cos(brain.heading)*speed,desiredY=Math.sin(brain.heading)*speed;
      const oldVx=target.vx,oldVy=target.vy,deltaX=desiredX-oldVx,deltaY=desiredY-oldVy;
      const change=Math.hypot(deltaX,deltaY),scale=change>0?Math.min(1,240*STEP/change):0;
      let vx=oldVx+deltaX*scale,vy=oldVy+deltaY*scale;
      brain.point.x=clamp(target.x+vx*STEP,48,ctx.W-48);
      brain.point.y=clamp(target.y+vy*STEP,48,ctx.H-48);
      const oldDistance=Math.hypot(target.x-ctx.player.x,target.y-ctx.player.y);
      const nextDistance=Math.hypot(brain.point.x-ctx.player.x,brain.point.y-ctx.player.y);
      const blocked=(nextDistance<72&&nextDistance<oldDistance)||
        (ctx.unsafe&&ctx.unsafe(brain.point,target.radius));
      if(blocked){vx=0;vy=0;brain.think=Math.min(brain.think,.06);}
      else {vx=(brain.point.x-target.x)/STEP;vy=(brain.point.y-target.y)/STEP;target.x=brain.point.x;target.y=brain.point.y;}
      target.vx=vx;target.vy=vy;target.ax=(vx-oldVx)/STEP;target.ay=(vy-oldVy)/STEP;
      target.braking=vx*target.ax+vy*target.ay<-.5;
    }
    return brain.opportunity;
  }
  return Object.freeze({create,update});
});
