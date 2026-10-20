// Shared presentation only. Fusion strength and purchasing remain in the engine.
(() => {
  'use strict';
  const NV=window.NV;
  const profiles=Object.freeze([0,1,2,3].map(tier=>Object.freeze({tier,fused:tier>0,
    background:'#382b1c',accent:'#f3c978',ink:'#fff0c1',
    label:tier?'Arma fusionada · Fusión '+tier+' de 3':'Sin fusión'})));
  NV.weaponFusionPresentation=function(level){const n=Number(level);return profiles[Number.isFinite(n)?Math.max(0,Math.min(3,Math.floor(n))):0];};
  NV.weaponFusionBadgeHTML=function(level){
    const p=NV.weaponFusionPresentation(level);if(!p.fused)return '';
    return '<span class="weapon-fusion-mark" aria-hidden="true"><svg viewBox="0 0 20 22" focusable="false"><path class="fusion-link" d="M7 2 12 7 7 12 2 7ZM13 2 18 7 13 12 8 7Z"/>'+
      [0,1,2].map(i=>'<path class="fusion-step'+(i<p.tier?' active':'')+'" d="M'+(2+i*6)+' 17h4v3h-4Z"/>').join('')+'</svg></span>';
  };
  NV.applyWeaponFusionPresentation=function(element,level){
    const p=NV.weaponFusionPresentation(level);element.classList.toggle('weapon-fused',p.fused);
    element.setAttribute('data-fusion-tier',String(p.tier));
    element.style.setProperty('--fusion-bg',p.background);element.style.setProperty('--fusion-accent',p.accent);
    return p;
  };
  NV.drawWeaponFusionBadge=function(ctx,x,y,size,level){
    const p=NV.weaponFusionPresentation(level);if(!p.fused)return;
    ctx.save();ctx.translate(x,y);ctx.scale(size/20,size/20);ctx.shadowBlur=0;
    ctx.fillStyle='#15151e';ctx.fillRect(0,0,20,22);
    ctx.strokeStyle=p.ink;ctx.lineWidth=1.8;ctx.lineJoin='round';
    for(let i=0;i<2;i++){const cx=7+i*6;ctx.beginPath();ctx.moveTo(cx,2);ctx.lineTo(cx+5,7);ctx.lineTo(cx,12);ctx.lineTo(cx-5,7);ctx.closePath();ctx.stroke();}
    for(let i=0;i<3;i++){ctx.fillStyle=i<p.tier?p.accent:'#655441';ctx.fillRect(2+i*6,17,4,3);}
    ctx.restore();
  };
})();
