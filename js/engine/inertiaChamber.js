(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./coreEvasion.js'));
  else (root.NV=root.NV||{}).InertiaChamber=factory(root.NV.CoreEvasion);
})(typeof window==='undefined'?globalThis:window,function(evasion){
  'use strict';
  const REQUIRED=3,RELEASE_GRACE=.12;
  function clock() {
    let charge=.65,recharge=0;
    return {
      sample(dt,intent,safety) {
        if(!(dt>0))return {controlDt:0,combatDt:0,scale:1,held:false,charge};
        const moving=Math.hypot(intent.moveX||0,intent.moveY||0)>.12;
        const forced=safety.dashActive||safety.dashWillStart||safety.hardCC||safety.externalForcedMove;
        const held=!moving&&!forced&&charge>0;
        const heldDt=held?Math.min(dt,charge):0;
        charge=Math.max(0,charge-heldDt);
        if(moving&&!forced){recharge+=dt;if(recharge>=1.5){charge=.65;recharge=0;}}else recharge=0;
        return {controlDt:dt,combatDt:dt-heldDt*.45,scale:1-heldDt/dt*.45,held,charge};
      },
      reset(){charge=.65;recharge=0;}
    };
  }
  function safeTarget(point,ctx) {
    if(Math.hypot(point.x-ctx.player.x,point.y-ctx.player.y)<140)return false;
    if((ctx.enemies||[]).some(e=>!e.dead&&Math.hypot(point.x-e.x,point.y-e.y)<(e.radius||18)+48))return false;
    if((ctx.bullets||[]).some(b=>!b.dead&&b.isEnemy&&Math.hypot(point.x-b.x,point.y-b.y)<45))return false;
    return !(ctx.unsafe&&ctx.unsafe(point,24));
  }
  function position(ctx,serial) {
    const view=ctx.view||{x:0,y:0,width:ctx.W,height:ctx.H};
    const left=Math.max(48,view.x+45),right=Math.min(ctx.W-48,view.x+view.width-45);
    const top=Math.max(70,view.y+80),bottom=Math.min(ctx.H-48,view.y+view.height-55);
    if(right<=left||bottom<=top)return null;
    for(const radius of [210,260,170])for(let i=0;i<12;i++) {
      const angle=(i/12+serial*.381966)*Math.PI*2;
      const p={x:Math.max(left,Math.min(right,ctx.player.x+Math.cos(angle)*radius)),
        y:Math.max(top,Math.min(bottom,ctx.player.y+Math.sin(angle)*radius))};
      if(safeTarget(p,ctx))return p;
    }
    return null;
  }
  function create(options) {
    const opts=options||{};
    const required=opts.required===1?1:REQUIRED;
    const firstPattern=Number.isInteger(opts.pattern)?Math.max(0,Math.min(2,opts.pattern)):0;
    const guardCount=Number.isInteger(opts.guardCount)?Math.max(0,Math.min(6,opts.guardCount)):6;
    const wave=Number.isFinite(opts.wave)?Math.max(1,Math.floor(opts.wave)):1;
    const hpMultiplier=Number.isFinite(opts.hpMultiplier)&&opts.hpMultiplier>0?opts.hpMultiplier:1;
    const progression=1+Math.min(19,wave-1)*.18+Math.max(0,wave-20)*.08;
    let collected=0,target=null,cooldown=0,age=0,flash=null,retry=0,guardTimer=0,guardsSpawned=0,motion=null;
    return Object.freeze({
      update(combatDt,controlDt,ctx) {
        if(!(combatDt>0)||!(controlDt>0)||!ctx||!ctx.player)return false;
        age+=controlDt;cooldown=Math.max(0,cooldown-combatDt);retry=Math.max(0,retry-controlDt);
        if(flash){flash.life-=controlDt;if(flash.life<=0)flash=null;}
        if(target)target.hitFlash=Math.max(0,(target.hitFlash||0)-combatDt);
        if(collected>=required)return false;
        if(target&&(target.x<32||target.x>ctx.W-32||target.y<32||target.y>ctx.H-32))target=null;
        if(!target&&cooldown<=0&&retry<=0) {
          const point=position(ctx,collected);
          const pattern=required===1?firstPattern:collected;
          const hp=Math.round((360+pattern*100)*progression*hpMultiplier);
          target=point?Object.assign(point,{radius:24,hp,maxHp:hp,dead:false,isDimensionCore:true,color:'#ffc77f',knockbackRes:1,
            pattern,attackCooldown:.25,windup:0,aimAngle:0,vx:0,vy:0,ax:0,ay:0,braking:false}):null;
          if(target){guardTimer=0;guardsSpawned=0;motion=evasion.create(target);}
          if(!target)retry=.35;
        }
        if(target&&target.hp<=0) {
          flash={x:target.x,y:target.y,life:.45};collected++;target=null;motion=null;cooldown=3;
          return true;
        }
        const attackOpportunity=target&&motion&&evasion.update(motion,target,combatDt,ctx);
        if(target&&ctx.spawnGuard&&guardsSpawned<guardCount) {
          guardTimer=Math.max(0,guardTimer-combatDt);
          if(guardTimer<=0) {
            const roster=required!==1||target.pattern===0?['tank','runner','dimension_sniper','runner','rift_weaver','tank']:
              target.pattern===1?['rift_weaver','tank','runner','dimension_sniper','runner','tank']:
              ['dimension_sniper','runner','rift_weaver','tank','runner','tank'];
            if(ctx.spawnGuard(target,roster[guardsSpawned],guardsSpawned)) {
              guardsSpawned++;guardTimer=1.1;
            } else guardTimer=.4;
          }
        }
        if(target&&ctx.emit) {
          // The emitter charges in real time; travelling shots use the inertia clock.
          const attackDt=controlDt;
          if(target.windup>0) {
            target.windup=Math.max(0,target.windup-attackDt);
            if(target.windup===0) {
              const offsets=target.pattern===0?[-.18,.18]:target.pattern===1?[-.4,0,.4]:[0,Math.PI/2,Math.PI,Math.PI*1.5];
              ctx.emit(target,offsets.map(a=>target.aimAngle+a));target.attackCooldown=2.2;
            }
          } else {
            target.attackCooldown=Math.max(0,target.attackCooldown-attackDt);
            if(target.attackCooldown<=0&&attackOpportunity){target.aimAngle=Math.atan2(ctx.player.y-target.y,ctx.player.x-target.x);target.windup=.65;}
          }
        }
        return false;
      },
      complete(){return collected===required;},
      combatTarget(){return target&&!target.dead?target:null;},
      view(){return {collected,required,complete:collected===required,cooldown,age,
        target:target?Object.assign({},target):null,flash:flash?Object.assign({},flash):null};},
    });
  }
  function prepareShots(bullets,policy) {
    if(!policy)return;
    const real=Number.isFinite(policy.controlDt)?Math.max(0,policy.controlDt):0;
    if(!real)return;
    for(const b of bullets) {
      if(b.dead||!b.isEnemy)continue;
      b.inertiaReleaseGrace=Math.max(0,(b.inertiaReleaseGrace||0)-real);
      if(policy.held) {
        b.inertiaWasHeld=true;
      } else {
        if(b.inertiaWasHeld){
          if(!b.inertiaReleasedOnce){b.inertiaReleaseGrace=RELEASE_GRACE;b.inertiaReleasedOnce=true;}
          b.inertiaWasHeld=false;
        }
      }
    }
  }
  return Object.freeze({create,clock,position,prepareShots,REQUIRED,RELEASE_GRACE});
});
