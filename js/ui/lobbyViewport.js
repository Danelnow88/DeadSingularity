/* Lobby presentation only: visual viewport in CSS pixels, never device models. */
(function () {
  'use strict';
  var NV=window.NV=window.NV||{},lobby=document.getElementById('startScreen');
  if(!lobby)return;
  // Explicit opt-in evidence from the physical browser; no saves or simulation.
  if(window.location && /[?&]lobbydiag=1(?:&|$)/.test(window.location.search)){
    var panel=document.createElement('section'),output=document.createElement('pre');
    var close=document.createElement('button'),copy=document.createElement('button'),timer=0,previous=null;
    panel.setAttribute('aria-label','Diagnóstico del lobby');
    panel.style.cssText='position:fixed;z-index:2147483647;left:4px;top:4px;max-width:calc(100vw - 8px);max-height:45vh;overflow:auto;background:#020812f2;color:#d4ffff;border:1px solid #23c9cf;padding:6px;font:11px monospace;box-sizing:border-box';
    output.style.cssText='margin:4px 0;white-space:pre-wrap;overflow-wrap:anywhere;font:inherit';
    close.textContent='Cerrar diagnóstico';copy.textContent='Copiar diagnóstico';
    function rect(element){
      if(!element)return null;
      var r=element.getBoundingClientRect(),s=window.getComputedStyle(element);
      return {x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height),
        contentH:element.scrollHeight,visibleH:element.clientHeight,overflowY:s.overflowY,font:s.fontSize};
    }
    function snapshot(){
      var v=window.visualViewport,a=NV.lobbyAtmosphere&&NV.lobbyAtmosphere.getSnapshot();
      var data={revision:'lobby-diag-20261008g',mobile:NV.capabilities&&NV.capabilities.isMobile,
        orientation:NV.capabilities&&NV.capabilities.orientation,classes:document.documentElement.className,
        hidden:document.hidden,viewport:[window.innerWidth,window.innerHeight],
        visual:v?{w:v.width,h:v.height,scale:v.scale,left:v.offsetLeft,top:v.offsetTop}:null,
        atmosphere:a||'module-not-loaded',framesSinceSample:a&&previous!==null?a.frames-previous:null,
        panels:{}};
      ['.main-lobby-panel','.panel-piloto','.main-lobby-actions','.lobby-center','.lobby-modes','#heroName','#lobbyCosmos'].forEach(function(selector){data.panels[selector]=rect(lobby.querySelector(selector));});
      previous=a?a.frames:null;return data;
    }
    function update(){
      timer=0;output.textContent=JSON.stringify(snapshot(),null,2);
      if(!document.hidden)timer=window.setTimeout(update,1000);
    }
    function stop(){if(timer)window.clearTimeout(timer);timer=0;}
    function resume(){stop();update();}
    close.onclick=function(){stop();document.removeEventListener('visibilitychange',resume);window.removeEventListener('pagehide',stop);window.removeEventListener('pageshow',resume);panel.remove();};
    copy.onclick=async function(){try{await window.navigator.clipboard.writeText(output.textContent);copy.textContent='Copiado';}catch(error){copy.textContent='No se pudo copiar; enviá una captura';}};
    panel.append(close,copy,output);document.body.appendChild(panel);
    document.addEventListener('visibilitychange',resume);window.addEventListener('pagehide',stop);window.addEventListener('pageshow',resume);update();
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
