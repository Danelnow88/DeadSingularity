// Optional FPS display: uses the existing game rAF, DOM changes at most twice/sec.
(() => {
  'use strict';
  const NV=window.NV;
  const output=document.createElement('output');
  output.id='fpsCounter';output.className='fps-counter';output.hidden=true;
  output.setAttribute('aria-label','Fotogramas por segundo');
  document.body.appendChild(output);
  let enabled=false,previous=null,elapsed=0,frames=0;
  function reset(){previous=null;elapsed=0;frames=0;output.textContent='-- FPS';}
  function sync(){
    const next=!!(NV.settings&&NV.settings.graphics&&NV.settings.graphics.showFPS);
    if(next!==enabled){enabled=next;reset();}
    output.hidden=!enabled;
  }
  NV.updateFpsCounter=function(now){
    if(!enabled||!Number.isFinite(now))return;
    if(previous===null){previous=now;return;}
    const delta=now-previous;previous=now;
    if(delta<=0)return;
    elapsed+=delta;frames++;
    if(elapsed<500)return;
    output.textContent=Math.round(frames*1000/elapsed)+' FPS';
    elapsed=0;frames=0;
  };
  document.addEventListener('visibilitychange',reset);
  if(NV.onSettingsChange)NV.onSettingsChange(sync);
  sync();
})();
