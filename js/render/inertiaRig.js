// Visual thrust vector adapter. It never moves or changes a gameplay entity.
(() => {
  'use strict';const NV=window.NV,DOWN=Math.PI/2;
  function component(value){return Number.isFinite(value)?value:0;}
  function direction(x,y){return Math.hypot(x,y)>.001?Math.atan2(y,x):DOWN;}
  function exhaustAngle(target,auxiliary,stabilizeOnBrake) {
    const m=target.propulsion||target;
    const vx=component(m.vx),vy=component(m.vy),ax=component(m.ax),ay=component(m.ay);
    const speed=Math.hypot(vx,vy);
    // Braking exhaust points WITH velocity: the applied force is opposite it.
    if(m.braking&&speed>.001)return !auxiliary&&stabilizeOnBrake?DOWN:direction(vx,vy);
    if(auxiliary) {
      const sx=component(m.steeringX),sy=component(m.steeringY);
      if(Math.hypot(sx,sy)>.001)return direction(-sx,-sy);
      if(speed>.001) {
        const parallel=(ax*vx+ay*vy)/(speed*speed);
        return direction(-(ax-vx*parallel),-(ay-vy*parallel));
      }
      return DOWN;
    }
    // Drive pods follow travel; the third gold pod handles lateral correction.
    if(speed>.001)return direction(-vx,-vy);
    return Math.hypot(ax,ay)>.001?direction(-ax,-ay):DOWN;
  }
  function approachAngle(current,desired,dt) {
    const delta=Math.atan2(Math.sin(desired-current),Math.cos(desired-current));
    return current+Math.max(-dt*9,Math.min(dt*9,delta));
  }
  NV.InertiaRig=Object.freeze({exhaustAngle,approachAngle});
})();
