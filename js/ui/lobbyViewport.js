/* Lobby presentation only: visual viewport in CSS pixels, never device models. */
(function () {
  'use strict';
  var NV=window.NV=window.NV||{},lobby=document.getElementById('startScreen');
  if(!lobby)return;
  // Explicit opt-in evidence from the physical browser; no saves or simulation.
  if(window.location && /[?&]lobbydiag=1(?:&|$)/.test(window.location.search)){
    var panel=document.createElement('section'),output=document.createElement('textarea');
    var close=document.createElement('button'),copy=document.createElement('button'),timer=0,previous=null,observer=null;
    var title=document.createElement('strong'),help=document.createElement('p');
    panel.setAttribute('aria-label','Diagnóstico del lobby');
    panel.style.cssText='position:fixed!important;z-index:2147483647!important;left:8px!important;right:8px!important;top:max(8px,env(safe-area-inset-top))!important;max-height:70dvh;overflow:auto;background:#8b0012!important;color:white!important;border:3px solid #ff5369;padding:10px;font:12px sans-serif;box-sizing:border-box;box-shadow:0 4px 30px #000';
    title.textContent='DIAGNÓSTICO TEMPORAL — V1';
    title.style.cssText='display:block!important;font:bold 17px sans-serif!important;color:white!important;margin:0 0 6px';
    help.textContent='Esperá 5 segundos, tocá COPIAR DIAGNÓSTICO y pegalo en el chat. No es Récords e informes.';
    help.style.cssText='font:12px sans-serif!important;color:white!important;margin:6px 0';
    output.readOnly=true;output.setAttribute('aria-label','Texto del diagnóstico para copiar');
    output.style.cssText='display:block!important;width:100%!important;height:90px!important;box-sizing:border-box;margin:6px 0;background:#130007!important;color:white!important;border:1px solid #ff8999;font:11px monospace!important;white-space:pre;overflow:auto;user-select:text!important;-webkit-user-select:text!important';
    close.type=copy.type='button';close.textContent='CERRAR';copy.textContent='COPIAR DIAGNÓSTICO';
    copy.style.cssText='display:inline-block!important;min-height:48px!important;padding:10px 16px!important;margin:0 8px 0 0!important;background:white!important;color:#9b0015!important;border:2px solid white!important;font:bold 15px sans-serif!important;border-radius:6px!important';
    close.style.cssText='display:inline-block!important;min-height:48px!important;padding:10px!important;margin:0!important;background:#52000b!important;color:white!important;border:1px solid #ff8999!important;font:bold 12px sans-serif!important;border-radius:6px!important';
    function rect(element){
      if(!element)return null;
      var r=element.getBoundingClientRect(),s=window.getComputedStyle(element);
      return {x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height),
        contentH:element.scrollHeight,visibleH:element.clientHeight,overflowY:s.overflowY,font:s.fontSize};
    }
    function snapshot(){
      var v=window.visualViewport,a=NV.lobbyAtmosphere&&NV.lobbyAtmosphere.getSnapshot();
      var data={revision:'lobby-diag-20261008h',mobile:NV.capabilities&&NV.capabilities.isMobile,
        orientation:NV.capabilities&&NV.capabilities.orientation,classes:document.documentElement.className,
        hidden:document.hidden,viewport:[window.innerWidth,window.innerHeight],
        visual:v?{w:v.width,h:v.height,scale:v.scale,left:v.offsetLeft,top:v.offsetTop}:null,
        atmosphere:a||'module-not-loaded',framesSinceSample:a&&previous!==null?a.frames-previous:null,
        panels:{}};
      ['.main-lobby-panel','.panel-piloto','.main-lobby-actions','.lobby-center','.lobby-modes','#heroName','#lobbyCosmos'].forEach(function(selector){data.panels[selector]=rect(lobby.querySelector(selector));});
      previous=a?a.frames:null;return data;
    }
    function update(){
      timer=0;output.value=JSON.stringify(snapshot(),null,2);
      if(!document.hidden)timer=window.setTimeout(update,1000);
    }
    function stop(){if(timer)window.clearTimeout(timer);timer=0;}
    function resume(){stop();update();}
    function syncPanel(){
      var hidden=document.hidden||(lobby.classList&&lobby.classList.contains('hidden'));
      panel.style.display=hidden?'none':'block';
      if(hidden)stop();else resume();
    }
    close.onclick=function(){stop();if(observer)observer.disconnect();document.removeEventListener('visibilitychange',syncPanel);window.removeEventListener('pagehide',stop);window.removeEventListener('pageshow',syncPanel);panel.remove();};
    copy.onclick=async function(){try{await window.navigator.clipboard.writeText(output.value);copy.textContent='COPIADO ✓';help.textContent='Pegalo en el chat e indicá si es Chrome o Brave.';}catch(error){stop();output.focus();output.select();help.textContent='La copia automática está bloqueada. Mantené pulsado el texto y elegí Copiar; después pegalo en el chat.';}};
    panel.append(title,copy,close,help,output);document.body.appendChild(panel);
    document.addEventListener('visibilitychange',syncPanel);window.addEventListener('pagehide',stop);window.addEventListener('pageshow',syncPanel);
    if(typeof MutationObserver!=='undefined'){observer=new MutationObserver(syncPanel);observer.observe(lobby,{attributes:true,attributeFilter:['class']});}
    syncPanel();
  }
  if(!NV.capabilities||!NV.capabilities.isMobile)return;
  function refresh(){
    var v=window.visualViewport;
    var width=Math.max(1,v&&v.width||window.innerWidth);
    var height=Math.max(1,v&&v.height||window.innerHeight);
    lobby.style.setProperty('--nv-lobby-width',width+'px');
    lobby.style.setProperty('--nv-lobby-height',height+'px');
    lobby.style.setProperty('--nv-lobby-left',(v&&v.offsetLeft||0)+'px');
    lobby.style.setProperty('--nv-lobby-top',(v&&v.offsetTop||0)+'px');
  }
  window.addEventListener('resize',refresh,{passive:true});
  window.addEventListener('orientationchange',refresh,{passive:true});
  window.addEventListener('pageshow',refresh);
  document.addEventListener('visibilitychange',refresh);
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize',refresh,{passive:true});
    window.visualViewport.addEventListener('scroll',refresh,{passive:true});
  }
  refresh();
})();
