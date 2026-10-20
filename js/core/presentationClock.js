// One presentation timeline; never changes the simulation frame counter or dt.
(() => {
  'use strict';
  const NV=window.NV;
  let active=false,seconds=0,delta=0;
  NV.presentationClock=Object.freeze({
    beginFrame(time,dt){
      if(!Number.isFinite(time)||!Number.isFinite(dt))return;
      active=true;seconds=Math.max(0,time);delta=Math.max(0,Math.min(.03,dt));
    },
    resolveFrame(fallback){return active?seconds*60:fallback;},
    blend(per60Frame){
      if(!active)return per60Frame;
      return 1-Math.pow(1-Math.max(0,Math.min(1,per60Frame)),delta*60);
    },
    get active(){return active;},get seconds(){return seconds;},get delta(){return delta;},
    snapshot(){return {active,seconds,delta,referenceFrame:seconds*60};}
  });
})();
