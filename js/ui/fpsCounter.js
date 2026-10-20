// Optional FPS display: uses the existing game rAF, DOM changes at most twice/sec.
(() => {
  'use strict';
  const NV=window.NV;
  const output=document.createElement('output');
  output.id='fpsCounter';output.className='fps-counter';output.hidden=true;
  output.setAttribute('aria-label','Cadencia de actualización rAF por segundo');
  output.title='Cadencia del bucle rAF; no mide cuadros físicamente presentados ni el refresco del monitor.';
  document.body.appendChild(output);
  let enabled=false,previous=null,elapsed=0,frames=0,lastFPS=null,lastWindow=0,worst=0,lastWorst=0;
  function reset(){previous=null;elapsed=0;frames=0;lastFPS=null;lastWindow=0;worst=lastWorst=0;output.textContent='-- FPS';}
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
    elapsed+=delta;frames++;worst=Math.max(worst,delta);
    if(elapsed<500)return;
    lastFPS=frames*1000/elapsed;lastWindow=elapsed;lastWorst=worst;
    output.textContent=Math.round(lastFPS)+' FPS';
    output.title='Cadencia rAF: '+lastFPS.toFixed(1)+' FPS · peor intervalo '+lastWorst.toFixed(1)+' ms. No mide presentación física ni Hz del monitor.';
    elapsed=0;frames=0;worst=0;
  };
  NV.getFpsCounterSnapshot=()=>({enabled,metric:'raf-callbacks',fps:lastFPS,windowMs:lastWindow,worstMs:lastWorst,presentedFPS:null});
  document.addEventListener('visibilitychange',reset);
  if(NV.onSettingsChange)NV.onSettingsChange(sync);
  sync();
})();
