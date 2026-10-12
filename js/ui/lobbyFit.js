/* Desktop lobby only. Fit the complete composition, not the gameplay canvas. */
(() => {
  'use strict';
  const lobby=document.getElementById('startScreen');
  if(!lobby||window.NV?.capabilities?.isMobile)return;
  if(typeof MutationObserver==='undefined'||typeof requestAnimationFrame==='undefined')return;
  const parts=['.lobby-masthead','.main-lobby-panel','.lobby-footer'].map(s=>lobby.querySelector(s));
  if(parts.some(p=>!p))return;
  const shell=document.createElement('div');shell.className='lobby-fit-content';
  lobby.classList.add('lobby-fit-enabled');
  lobby.append(shell);parts.forEach(p=>shell.append(p));
  let pending=0;
  function fit(){
    pending=0;if(lobby.classList.contains('hidden'))return;
    const width=lobby.clientWidth,height=lobby.clientHeight;if(!width||!height)return;
    shell.style.zoom='1';shell.style.minHeight='0';
    shell.style.width=Math.max(width,1100)+'px';
    const naturalWidth=Math.max(shell.offsetWidth,shell.scrollWidth);
    const naturalHeight=Math.max(shell.offsetHeight,shell.scrollHeight);
    let scale=Math.min(1,width/naturalWidth,(height-2)/naturalHeight);
    shell.style.zoom=String(scale);shell.style.minHeight=(height-2)/scale+'px';
    // Zoom can reflow a label at a fractional width. Measure the final geometry,
    // not just the unscaled estimate, before hiding the scroll container.
    for(let i=0;i<3;i++) {
      const used=parts[2].getBoundingClientRect().bottom-lobby.getBoundingClientRect().top;
      if(used<=height-1)break;
      scale*=(height-3)/used;shell.style.minHeight='0';shell.style.zoom=String(scale);
    }
    // Full-bleed bars must not shrink with the fitted composition. Increasing
    // logical width compensates zoom while preserving the world canvas untouched.
    shell.style.width=width/scale+'px';
    shell.style.minHeight=(height-3)/scale+'px';
    lobby.scrollTop=0;
  }
  function schedule(){if(!pending)pending=requestAnimationFrame(fit);}
  window.addEventListener('resize',schedule,{passive:true});
  window.visualViewport?.addEventListener('resize',schedule,{passive:true});
  new MutationObserver(schedule).observe(shell,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','hidden']});
  new MutationObserver(schedule).observe(lobby,{attributes:true,attributeFilter:['class']});
  new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['data-large-text']});
  document.fonts?.ready.then(schedule);schedule();
})();
