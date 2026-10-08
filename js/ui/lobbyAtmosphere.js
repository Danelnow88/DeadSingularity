/* Decorative lobby only. Own seeded randomness: never consumes simulation RNG. */
(function () {
  'use strict';
  var NV = window.NV = window.NV || {};
  var lobby = document.getElementById('startScreen');
  var canvas = document.getElementById('lobbyCosmos');
  if (!lobby || !canvas || typeof window.matchMedia !== 'function' ||
      typeof MutationObserver === 'undefined' || typeof window.requestAnimationFrame !== 'function') return;
  var ctx = canvas.getContext('2d', { alpha:true });
  if (!ctx) return;
  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mobile=!!(NV.capabilities&&NV.capabilities.isMobile);
  var travelSpeed=mobile?.18:.09;
  var colors = ['#81dfff','#d59bff','#ffd4a0','#ff9cd7','#eef7ff'];
  var sprites = colors.map(function (color) {
    var sprite = document.createElement('canvas'); sprite.width = sprite.height = 64;
    var c = sprite.getContext('2d');
    var glow = c.createRadialGradient(32,32,0,32,32,30);
    glow.addColorStop(0,'#ffffff'); glow.addColorStop(.05,color);
    glow.addColorStop(.22,color+'85'); glow.addColorStop(.55,color+'16'); glow.addColorStop(1,color+'00');
    c.fillStyle = glow; c.fillRect(0,0,64,64);
    c.strokeStyle = color+'b8'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(32,5); c.lineTo(32,59); c.moveTo(5,32); c.lineTo(59,32); c.stroke();
    return sprite;
  });
  var width=1,height=1,dpr=1,stars=[],raf=0,last=null,elapsed=0,frames=0,quality=null;
  var active=false,suspended=false,pointerX=0,pointerY=0,wake=0,renderedCalm=null;
  function graphics() { return NV.settings && NV.settings.graphics || {}; }
  function reduced() {
    return motion.matches || graphics().particles === false ||
      !!(NV.settings && NV.settings.gameplay && NV.settings.gameplay.reducedEffects);
  }
  function visible() { return !suspended && !document.hidden && !(mobile && NV.capabilities.orientation === 'portrait') && !lobby.classList.contains('hidden') && lobby.getClientRects().length > 0; }
  function resize() {
    var nextWidth=Math.max(1,canvas.clientWidth),nextHeight=Math.max(1,canvas.clientHeight);
    var nextDpr=Math.min(window.devicePixelRatio || 1,1.5),nextQuality=graphics().quality;
    if(stars.length && width===nextWidth && height===nextHeight && dpr===nextDpr && quality===nextQuality) return false;
    width=nextWidth; height=nextHeight; dpr=nextDpr; quality=nextQuality;
    canvas.width=Math.round(width*dpr); canvas.height=Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    var seed=94117;
    function random() { seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; }
    var low=graphics().quality === 'performance';
    var count=Math.min(low?420:1000,Math.max(160,Math.round(width*height/(low?2100:1200))));
    stars=[];
    for(var i=0;i<count;i++) stars.push({x:random(),y:random(),depth:.2+random()*.8,
      radius:.35+random()*.8,phase:random()*Math.PI*2,color:Math.floor(random()*colors.length),
      bright:i%(mobile?14:23)===0,alpha:.28+random()*.6});
    render();
    return true;
  }
  function render() {
    ctx.clearRect(0,0,width,height);
    var calm=reduced(),time=calm?0:elapsed;
    renderedCalm=calm;
    for(var i=0;i<stars.length;i++) {
      var s=stars[i];
      // Move towards the camera: perspective expands out of one vanishing point.
      // Wrapped depth recycles the same bounded pool, without allocations/RNG.
      var z=.12+((s.depth-time*travelSpeed)%1+1)%1;
      var scale=1/(z+.35);
      var x=width*.5+(s.x-.5)*width*scale+pointerX*5;
      var y=height*.44+(s.y-.5)*height*scale+pointerY*4;
      if(x < -32 || y < -32 || x > width+32 || y > height+32) continue;
      var fade=Math.min(1,z/.2,(1.12-z)/.08);
      ctx.globalAlpha=(s.bright?.9:s.alpha)*(.78+.22*Math.sin(time*.65+s.phase))*fade;
      if(!calm&&(s.bright||i%11===0)) {
        var dx=x-width*.5,dy=y-height*.44,distance=Math.hypot(dx,dy)||1;
        var length=Math.min(24,(mobile?5:3)+scale*scale*3);
        var alpha=ctx.globalAlpha;ctx.globalAlpha=alpha*.38;
        ctx.strokeStyle=colors[s.color];ctx.lineWidth=mobile?1.2:1;
        ctx.beginPath();ctx.moveTo(x-dx/distance*length,y-dy/distance*length);ctx.lineTo(x,y);ctx.stroke();
        ctx.globalAlpha=alpha;
      }
      if(s.bright) {
        var size=12+scale*12;
        ctx.drawImage(sprites[s.color],x-size/2,y-size/2,size,size);
      } else { ctx.fillStyle=colors[s.color]; var radius=s.radius*Math.min(scale,1.8); ctx.fillRect(x,y,radius,radius); }
    }
    ctx.globalAlpha=1; frames++;
  }
  function tick(now) {
    raf=0;
    if(!active) return;
    if(!visible()) { stop(); return; }
    if(reduced()) { stop(); render(); return; }
    // Keep one clock domain: privacy browsers can offset performance.now().
    if(last===null || now<last) last=now;
    var interval=graphics().quality === 'performance'?50:1000/30;
    if(now-last>=interval) {
      elapsed+=Math.min((now-last)/1000,.1); last=now; render();
    }
    raf=window.requestAnimationFrame(tick);
  }
  function stop() { active=false; if(raf) window.cancelAnimationFrame(raf); raf=0; last=null; }
  function cancelWake() { if(wake) window.clearTimeout(wake); wake=0; }
  function watchVisibility() {
    // Some restored/hidden browser surfaces update media matches without a
    // change event. Cheap recovery only while this lobby is actually visible;
    // no Canvas redraw, gameplay timer or second RAF loop.
    if(wake || typeof window.setTimeout!=='function') return;
    wake=window.setTimeout(function(){wake=0;sync();},500);
  }
  function sync() {
    if(!visible()) { stop(); cancelWake(); pointerX=pointerY=0; return; }
    watchVisibility();
    var changed=resize();
    if(reduced()) { stop(); if(!changed && renderedCalm!==true) render(); return; }
    // ResizeObserver/settings notifications must not cancel every pending frame
    // or restart the animation clock, even while mobile browser chrome changes.
    if(!active) { active=true; last=null; raf=window.requestAnimationFrame(tick); }
  }
  new MutationObserver(sync).observe(lobby,{attributes:true,attributeFilter:['class','style']});
  if(window.ResizeObserver) new ResizeObserver(sync).observe(canvas.parentElement);
  window.addEventListener('resize',sync,{passive:true});
  window.addEventListener('orientationchange',sync,{passive:true});
  if(window.visualViewport) window.visualViewport.addEventListener('resize',sync,{passive:true});
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('pagehide',function(){suspended=true;stop();cancelWake();});
  window.addEventListener('pageshow',function(){suspended=false;sync();});
  lobby.addEventListener('pointermove',function(event){
    if(!active || event.pointerType==='touch') return;
    pointerX=event.clientX/width-.5; pointerY=event.clientY/height-.5;
  },{passive:true});
  lobby.addEventListener('pointerleave',function(){pointerX=pointerY=0;},{passive:true});
  if(motion.addEventListener) motion.addEventListener('change',sync);
  else if(motion.addListener) motion.addListener(sync);
  if(NV.onSettingsChange) NV.onSettingsChange(sync);
  NV.lobbyAtmosphere={getSnapshot:function(){
    var s=stars[0],z=s?.12+((s.depth-(reduced()?0:elapsed)*travelSpeed)%1+1)%1:1;
    return {active:active,stars:stars.length,frames:frames,motion:'forward',time:elapsed,
      probe:s?{depth:z,distance:Math.hypot((s.x-.5)*width,(s.y-.5)*height)/(z+.35)}:null,
      reducedMotion:reduced(),travelSpeed:travelSpeed,
      stopReason:!visible()?'hidden':motion.matches?'system-reduced-motion':graphics().particles===false?'particles-disabled':reduced()?'reduced-effects':null,
      width:width,height:height,dpr:dpr};}};
  sync();
})();
