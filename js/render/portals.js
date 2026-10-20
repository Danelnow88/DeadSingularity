// Portal de energía plano: referencia estética guardada en docs/art-direction/references.
// Canvas puro; no altera el agujero negro, entidades, RNG ni recursos externos.
(() => {
  'use strict';
  const NV = window.NV;
  NV.drawStablePortal = function (ctx, portal, run, reduced) {
    const r=portal.radius,t=run.age,opening=Math.min(1,t/1.2);
    const active=run.phase==='transit'&&run.chosenRoute==='stable';
    const transit=active?run.transit/1.15:0;
    ctx.save();ctx.translate(portal.x,portal.y);
    ctx.scale(Math.max(.01,opening)*(1+transit*.35),Math.max(.01,opening)*(1+transit*.35));
    // Vista plana conservada. De la referencia: aros finos, borde energético y luz.
    // No cilindro, pedestal ni planos horizontales en perspectiva.
    const rx=r*.93,ry=r*1.25;
    // Luz exterior suave y continua: no es una zona de daño ni un indicador.
    // Gradiente elíptico en vez de shadowBlur para limitar el coste en móvil.
    ctx.save();ctx.scale(rx,ry);
    const halo=ctx.createRadialGradient(0,0,.65,0,0,1.85);
    halo.addColorStop(0,'#e000ff00');halo.addColorStop(.27,'#e000ff18');
    halo.addColorStop(.39,'#ff19df88');halo.addColorStop(.52,'#df00ff48');
    halo.addColorStop(.75,'#9400ff18');halo.addColorStop(1,'#9400ff00');
    ctx.fillStyle=halo;ctx.beginPath();ctx.arc(0,0,1.85,0,Math.PI*2);ctx.fill();ctx.restore();
    const interior=ctx.createRadialGradient(0,0,0,0,0,r*1.3);
    interior.addColorStop(0,'#310d48');interior.addColorStop(.62,'#750e89');interior.addColorStop(1,'#ce12b9');
    ctx.fillStyle=interior;ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.fill();
    for(const [width,color] of [[20,'#bc00ff18'],[12,'#e000ff38'],[7,'#ff13d988'],[3.5,'#ff43e5'],[1.3,'#fff0fc']]){
      ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.stroke();
    }
    ctx.save();ctx.beginPath();ctx.ellipse(0,0,rx*.94,ry*.94,0,0,Math.PI*2);ctx.clip();
    // Interior limpio: sólo motas pequeñas, sin líneas ni aros internos.
    const count=reduced?9:23;
    for(let i=0;i<count;i++){
      const fraction=(i/count+t*.09)%1,a=i*2.39996+t*.13;
      const size=i%4===0?.95:.6;
      ctx.fillStyle=i%4===0?'#fff5ff':'#ff9eea';
      ctx.fillRect(Math.cos(a)*rx*fraction-size/2,Math.sin(a)*ry*fraction-size/2,size,size);
    }
    ctx.restore();
    ctx.strokeStyle='#ffffff';ctx.lineWidth=1.6;
    for(let i=0;i<2;i++){const a=t*.32+i*Math.PI;ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,a,a+.24);ctx.stroke();}
    ctx.restore();
  };
  NV.drawDimensionRouteArrows = function(ctx,run,view){
    if(!run.routeChoices||!run.portal||!run.stablePortal||run.phase==='transit')return;
    const {vx,vy,vw,vh,scaleX,scaleY,worldScaleX,worldScaleY,worldOffsetX,worldOffsetY}=view;
    const ui=Math.max(1,Math.min(2.5,1/Math.min(scaleX,scaleY))),cx=vx+vw/2,cy=vy+vh/2;
    for(const [p,color] of [[run.portal,'#ffd34e'],[run.stablePortal,'#62aaff']]){
      const tx=vx+(worldScaleX*p.x+worldOffsetX)/scaleX,ty=vy+(worldScaleY*p.y+worldOffsetY)/scaleY;
      if(tx>=vx+26*ui&&tx<=vx+vw-26*ui&&ty>=vy+100*ui&&ty<=vy+vh-26*ui)continue;
      const dx=tx-cx,dy=ty-cy;
      const fx=dx>0?(vx+vw-26*ui-cx)/dx:dx<0?(vx+26*ui-cx)/dx:Infinity;
      const fy=dy>0?(vy+vh-26*ui-cy)/dy:dy<0?(vy+100*ui-cy)/dy:Infinity;
      const factor=Math.min(fx,fy);
      ctx.save();ctx.translate(cx+dx*factor,cy+dy*factor);ctx.rotate(Math.atan2(dy,dx));
      ctx.fillStyle=color;ctx.strokeStyle='#07101c';ctx.lineWidth=2*ui;
      ctx.beginPath();ctx.moveTo(10*ui,0);ctx.lineTo(-7*ui,-6*ui);ctx.lineTo(-3*ui,0);ctx.lineTo(-7*ui,6*ui);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
    }
  };
  NV.drawDimensionRouteHints = function (ctx, run, view) {
    if (NV.dimensionRouteHelpVisible === false || (NV.settings && NV.settings.gameplay && NV.settings.gameplay.showGuides === false) || !run.routeChoices || !run.portal || !run.stablePortal) return;
    const {vx, vy, vw, vh, scaleX, scaleY, worldScaleX, worldScaleY, worldOffsetX, worldOffsetY} = view;
    // Tamaños de texto en píxeles legibles, no miniaturas al contener el canvas móvil.
    const ui = Math.max(1, Math.min(2.5, 1 / Math.min(scaleX, scaleY)));
    const hintY = vy + vh - 101 * ui;
    ctx.save();
    const labels = [['stable', run.stablePortal, '#88baff', 'PORTAL · ESTABLE'], ['chaos', run.portal, '#ffd34e', 'AGUJERO NEGRO · RIESGO']];
    for (const [index, [id, p, color, text]] of labels.entries()) {
      const tx = vx + (worldScaleX * p.x + worldOffsetX) / scaleX;
      const ty = vy + (worldScaleY * p.y + worldOffsetY) / scaleY;
      const w = Math.min(222 * ui, (vw - 36 * ui) / 2), x = vx + vw / 2 + (index ? 1 : -1) * (w + 12 * ui) / 2, y = hintY - 63 * ui;
      ctx.fillStyle = '#06101bea'; ctx.beginPath(); ctx.roundRect(x - w / 2, y, w, 51 * ui, 8 * ui); ctx.fill();
      ctx.textAlign = 'center'; ctx.fillStyle = color; ctx.font = '700 ' + 13 * ui + 'px system-ui';
      ctx.fillText(text, x, y + 17 * ui);
      ctx.font = 12 * ui + 'px system-ui'; ctx.fillStyle = '#edf7ff';
      const bonus = 12 + run.wave * 2 + (run.depth + 1) * 4;
      ctx.fillText(id === 'stable' ? 'Progreso normal · sin riesgo extra' : 'Mayor peligro · +' + bonus + ' ◆ al vencer', x, y + 34 * ui);
    }
    const w = Math.min(vw - 24 * ui, 560 * ui), x = vx + (vw - w) / 2, y = hintY;
    ctx.fillStyle = '#040a15ef'; ctx.beginPath(); ctx.roundRect(x, y, w, 41 * ui, 8 * ui); ctx.fill();
    ctx.textAlign = 'center'; ctx.fillStyle = '#eaffff'; ctx.font = '700 ' + 12 * ui + 'px system-ui';
    ctx.fillText(run.phase === 'transit' ? (run.chosenRoute === 'stable' ? 'TRÁNSITO ESTABLE' : 'DESCENSO AL CAOS') : 'ELEGÍ LA RUTA DEL PRÓXIMO CAMPO', vx + vw / 2, y + 16 * ui);
    ctx.font = 12 * ui + 'px system-ui'; ctx.fillStyle = '#c5d7e4';
    ctx.fillText(run.phase === 'opening' ? 'Abriendo ambos cruces…' : 'Acercate a cualquiera de las dos salidas para atravesarla', vx + vw / 2, y + 32 * ui);
    ctx.restore();
  };
})();
