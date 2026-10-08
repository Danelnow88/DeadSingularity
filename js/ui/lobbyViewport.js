/* Lobby presentation only: visual viewport in CSS pixels, never device models. */
(function () {
  'use strict';
  var NV=window.NV=window.NV||{},lobby=document.getElementById('startScreen');
  if(!lobby||!NV.capabilities||!NV.capabilities.isMobile)return;
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
