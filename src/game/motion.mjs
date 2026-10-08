// Simulación nueva, independiente del DOM, del render y del namespace legacy.
export const MOTION_RULES = Object.freeze({
  accelerateSeconds: 0.13, brakeSeconds: 0.10, turnSeconds: 0.085,
  reverseSeconds: 0.11, permanentSpeed: 0.02, permanentControl: 0.025,
  permanentLimit: 10, energyMax: 100, energyCost: 50, dashSeconds: 0.15,
  dashSpeed: 560, rechargeDelay: 0.90, rechargeRate: 100 / 2.9, boostSpeed: 1.18
});
export function unitInput(x=0,y=0) {
  x=Number(x)||0;y=Number(y)||0;
  const size=Math.hypot(x,y);
  return size>1?{x:x/size,y:y/size}:{x,y};
}
export class MotionBody {
  constructor({x=0,y=0,speed=200,permanentLevel=0}={}) {
    const raw=Number(permanentLevel);
    this.permanentLevel=Number.isFinite(raw)?Math.max(0,Math.min(10,Math.floor(raw))):0;
    this.baseSpeed=Math.max(1,Number(speed)||200);
    this.position={x,y};this.velocity={x:0,y:0};this.lastDirection={x:0,y:-1};
    this.energy=100;this.dashRemaining=0;this.rechargeRemaining=0;
    this.dashDirection={x:0,y:-1};this.dashing=false;this.dashHeld=false;
    this.reversing=false;this.effectiveSpeed=this.baseSpeed*(1+this.permanentLevel*.02);
  }
  setPauseLatch(held){this.dashHeld=Boolean(held);}
  step(input={},elapsed=0) {
    const dt=Math.max(0,Number(elapsed)||0),r=MOTION_RULES;
    const move=unitInput(input.x,input.y),pressed=Boolean(input.dash);
    const freshPress=pressed&&!this.dashHeld;this.dashHeld=pressed;
    if(freshPress&&!this.dashing&&!(input.stun>0)&&this.energy>=r.energyCost){
      let direction=move;
      if(Math.hypot(direction.x,direction.y)<=.000001&&input.aimActive)direction={x:input.aimX||0,y:input.aimY||0};
      if(Math.hypot(direction.x,direction.y)<=.000001)direction=this.lastDirection;
      const magnitude=Math.hypot(direction.x,direction.y)||1;
      this.dashDirection={x:direction.x/magnitude,y:direction.y/magnitude};
      this.energy=Math.max(0,this.energy-r.energyCost);this.dashRemaining=r.dashSeconds;
      this.rechargeRemaining=r.rechargeDelay;this.dashing=true;this.reversing=false;
    }
    if(this.dashing){
      const duration=Math.min(dt,this.dashRemaining);
      this.velocity.x=this.dashDirection.x*r.dashSpeed;this.velocity.y=this.dashDirection.y*r.dashSpeed;
      this.position.x+=this.velocity.x*duration;this.position.y+=this.velocity.y*duration;
      this.dashRemaining=Math.max(0,this.dashRemaining-dt);
      if(this.dashRemaining<=0){this.dashing=false;this.velocity.x=0;this.velocity.y=0;}
      return this;
    }
    if(this.rechargeRemaining>0)this.rechargeRemaining=Math.max(0,this.rechargeRemaining-dt);
    else this.energy=Math.min(r.energyMax,this.energy+r.rechargeRate*dt);
    return this.move(input,dt);
  }
  // Movimiento normal reutilizable durante victoria, sin simular dash/recarga.
  move(input={},dt=0){
    const r=MOTION_RULES,move=unitInput(input.x,input.y);
    if(Math.hypot(move.x,move.y)>.000001)this.lastDirection={...move};
    this.effectiveSpeed=this.baseSpeed*(1+this.permanentLevel*r.permanentSpeed)*(input.boost?r.boostSpeed:1);
    const control=Math.max(1,Number(input.agility)||1)*(1+this.permanentLevel*r.permanentControl);
    const canMove=Math.hypot(move.x,move.y)>0&&!(input.stun>0);
    const target={x:canMove?move.x*this.effectiveSpeed:0,y:canMove?move.y*this.effectiveSpeed:0};
    const speed=Math.hypot(this.velocity.x,this.velocity.y);
    let rate=this.effectiveSpeed/r.accelerateSeconds*control;
    const controlSpeed=Math.max(this.effectiveSpeed,speed);
    if(!canMove){this.reversing=false;rate=controlSpeed/r.brakeSeconds*control;}
    else if(speed>.0001){
      const alignment=(this.velocity.x*move.x+this.velocity.y*move.y)/speed;
      if(alignment<-.1)this.reversing=true;
      if(this.reversing)rate=controlSpeed*2/r.reverseSeconds*control;
      else if(alignment<.85)rate=this.effectiveSpeed/r.turnSeconds*control;
    }
    const dx=target.x-this.velocity.x,dy=target.y-this.velocity.y,distance=Math.hypot(dx,dy);
    const reach=rate*dt;
    if(distance<=reach||distance<=.000001){this.velocity={...target};this.reversing=false;}
    else {this.velocity.x+=dx*reach/distance;this.velocity.y+=dy*reach/distance;}
    this.position.x+=this.velocity.x*dt;this.position.y+=this.velocity.y*dt;
    return this;
  }
}
