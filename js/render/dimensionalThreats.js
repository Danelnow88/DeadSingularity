// Materia, lentes y fisuras: efectos locales sin partículas persistentes ni HUD.
(() => {
  'use strict';
  const NV = window.NV, TAU = Math.PI * 2;
  // Materiales controlados; saturación alta sólo en peligro y fuentes de energía.
  const ART = NV.DIMENSIONAL_ART = Object.freeze({
    cut: Object.freeze({body:'#9b4c79',rim:'#dc86b7',light:'#f2c5dc',dark:'#352039',field:'#19121f',thread:'#b98cac',danger:'#ed5264'}),
    snipe: Object.freeze({body:'#456d7c',rim:'#83aeba',light:'#c6d7de',dark:'#172b39',rail:'#58828f',energy:'#b6ebed'}),
    devour: Object.freeze({body:'#775a89',rim:'#a284b0',light:'#ead4ee',dark:'#21162c',energy:'#f0baff'})
  });
  function line(ctx, ax, ay, bx, by) { ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); }
  // Silueta material compartida por las agujas. Sin emisores ni trails acumulados.
  function needle(ctx, x, y, angle, size, color) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    ctx.fillStyle = '#101725'; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(size, 0); ctx.lineTo(-size * .55, -4);
    ctx.lineTo(-size * .3, 0); ctx.lineTo(-size * .55, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#fff5e9'; line(ctx, 0, 0, size * .85, 0); ctx.restore();
  }
  function mouth(ctx, x, y, radius, angle) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    ctx.fillStyle = '#010208'; ctx.beginPath(); ctx.ellipse(0, 0, radius * .48, radius, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle='#246d8b';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.ellipse(0, 0, radius * (.55 + i * .09), radius * (1.08 + i * .11), -.12 + i * .07, -.9, 1.7); ctx.stroke();
    }
    ctx.strokeStyle = '#e7fbff';
    ctx.beginPath(); ctx.ellipse(0, 0, radius * .5, radius, 0, 0, .8); ctx.stroke();
    ctx.restore();
  }
  function capsule(ctx,length,radius) {
    // Curvas orgánicas dentro de la misma cápsula de colisión, sin puntas externas.
    ctx.beginPath();ctx.moveTo(0,-radius);
    ctx.bezierCurveTo(length*.33,-radius+1.2,length*.66,-radius+1.2,length,-radius);
    ctx.arc(length,0,radius,-Math.PI/2,Math.PI/2);
    ctx.bezierCurveTo(length*.66,radius-1.2,length*.33,radius-1.2,0,radius);
    ctx.arc(0,0,radius,Math.PI/2,Math.PI*1.5);ctx.closePath();
  }
  function crochetVector(ctx,length,radius,color) {
    // Lana compacta: coronas detrás, puntadas en V delante y fibra sobre la hebra.
    ctx.lineCap='round';ctx.lineJoin='round';
    // Construcción de la textura en capas acotadas; glints y revelado son dinámicos.
    for(let layer=0;layer<3;layer++){
      ctx.beginPath();let row=0;
      for(let y=-radius-12;y<=radius+12;y+=12,row++){
        for(let x=-radius-10;x<length+radius+10;x+=10){
          const bend=Math.sin(x*.37+row*1.7)*.35;
          if(layer===0){
            // Arco que pasa por debajo del nudo de la siguiente hilera.
            ctx.moveTo(x-4.8,y+5.5);
            ctx.bezierCurveTo(x-2.4,y+2.2,x+2.4,y+2.2,x+4.8,y+5.5);
          } else {
            ctx.moveTo(x-4.8+bend,y-5);
            ctx.bezierCurveTo(x-4.4,y-.7,x-1.5,y+3,x,y+5.5);
            ctx.bezierCurveTo(x+1.5,y+3,x+4.4,y-.7,x+4.8+bend,y-5);
          }
        }
      }
      if(layer===0){ctx.strokeStyle='#634662';ctx.lineWidth=3.7;ctx.stroke();}
      else if(layer===1){
        ctx.strokeStyle='#100e18';ctx.lineWidth=5;ctx.stroke();
        ctx.strokeStyle=color;ctx.lineWidth=3.5;ctx.stroke();
      } else {
        // Luz estrecha en el centro del hilo: volumen de lana, no aro luminoso.
        ctx.strokeStyle='#d0afc0';ctx.lineWidth=.8;ctx.stroke();
      }
    }
    ctx.strokeStyle='#8c6a88';ctx.lineWidth=.65;ctx.beginPath();
    for(let y=-radius;y<=radius;y+=12)for(let x=-radius;x<length+radius;x+=10){
      // Microtorsión/fibras cortas, deterministas, sin una rejilla de cruces completos.
      ctx.moveTo(x-3.8,y-1.8);ctx.lineTo(x-2.0,y-2.6);
      ctx.moveTo(x+1.8,y+.8);ctx.lineTo(x+3.5,y+1.6);
    }
    ctx.stroke();
  }
  const knitCache = new Map();
  function crochet(ctx,length,radius,color) {
    // Cache bounded to four full-size fields. The moving clip reveals the same yarn.
    // 3x raster preserves strand detail at desktop zoom without per-frame tessellation.
    if (typeof document === 'undefined') return crochetVector(ctx,length,radius,color);
    const key = length.toFixed(3)+':'+radius+':'+color;
    let tile = knitCache.get(key);
    if (!tile) {
      const pad=radius+16,w=Math.ceil(length+pad*2),h=Math.ceil(pad*2),scale=3;
      const canvas=document.createElement('canvas');canvas.width=w*scale;canvas.height=h*scale;
      const off=canvas.getContext('2d');
      if (!off) return crochetVector(ctx,length,radius,color);
      off.scale(scale,scale);off.translate(pad,pad);crochetVector(off,length,radius,color);
      tile={canvas,pad,w,h};
      if(knitCache.size>=4)knitCache.delete(knitCache.keys().next().value);
      knitCache.set(key,tile);
    }
    ctx.drawImage(tile.canvas,-tile.pad,-tile.pad,tile.w,tile.h);
  }
  function weaveField(ctx,e,s) {
    const g=s.geometry,active=s.phase==='active',angle=Math.atan2(g.by-g.ay,g.bx-g.ax);
    const length=Math.hypot(g.bx-g.ax,g.by-g.ay),progress=active?1:(s.weaveProgress||0);
    const art=ART.cut;
    ctx.save();ctx.translate(g.ax,g.ay);ctx.rotate(angle);
    ctx.lineJoin='round';ctx.lineCap='round';
    // Contorno de preparación y superficie física sólo donde el cuerpo ya pasó.
    ctx.lineWidth=1.5;ctx.strokeStyle=art.rim;capsule(ctx,length,g.halfWidth);ctx.stroke();
    if(progress>0){
      const laid=length*progress;
      ctx.fillStyle=art.field;capsule(ctx,laid,g.halfWidth);ctx.fill();
      ctx.save();capsule(ctx,laid,g.halfWidth-3);ctx.clip();
      crochet(ctx,length,g.halfWidth,art.thread);
      const glint=(s.age*65)%(Math.max(1,laid)+g.halfWidth*2)-g.halfWidth;
      ctx.fillStyle=art.light;
      for(let i=0;i<3;i++){
        ctx.beginPath();ctx.ellipse(glint+i*5,(i-1)*11,1.1,2.2,-.35,0,TAU);ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle=active?art.danger:art.rim;ctx.lineWidth=4;capsule(ctx,laid,g.halfWidth);ctx.stroke();
    }
    ctx.restore();
    if(!active && progress>0){
      // Hilo de las piezas laterales al tejido, no de un emisor remoto.
      const beat=Math.sin(s.age*32)*5,ux=Math.cos(angle),uy=Math.sin(angle);
      for(const side of [-1,1]){
        const x=e.x-uy*side*13+ux*beat,y=e.y+ux*side*13+uy*beat;
        ctx.strokeStyle=art.light;ctx.lineWidth=1.2;
        line(ctx,x,y,e.x-ux*15-uy*side*23,e.y-uy*15+ux*side*23);
      }
    }
  }
  function devourField(ctx,e,s) {
    const g=s.geometry,active=s.phase==='active';
    const progress=active?1:Math.min(1,s.elapsed/NV.DIMENSIONAL_THREATS[e.enemyTypeId].windup);
    const inner=active?g.inner:g.outer-8*progress;
    // Un vacío sólido con material fracturado; la zona de daño es el anillo.
    if(active){ctx.fillStyle='#06040e';ctx.beginPath();ctx.arc(g.x,g.y,g.outer,0,TAU);ctx.arc(g.x,g.y,inner,0,TAU,true);ctx.fill('evenodd');}
    for(let i=0;i<16;i++){
      const a=i*TAU/16,b=(i+1)*TAU/16-.025;
      if(active){
        ctx.fillStyle=i%2?'#201137':'#321945';
        ctx.beginPath();ctx.arc(g.x,g.y,g.outer-3,a,b);ctx.arc(g.x,g.y,Math.min(g.outer-3,inner+13),b,a,true);ctx.closePath();ctx.fill();
      }
      const radius=inner+6,mid=(a+b)/2;
      ctx.fillStyle=i%2?'#dfb0ff':'#8e52de';ctx.strokeStyle='#f0d2ff';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(g.x+Math.cos(a)*radius,g.y+Math.sin(a)*radius);
      // La punta queda en el límite real, no invade el núcleo seguro.
      ctx.lineTo(g.x+Math.cos(mid)*inner,g.y+Math.sin(mid)*inner);
      ctx.lineTo(g.x+Math.cos(b)*radius,g.y+Math.sin(b)*radius);ctx.closePath();ctx.fill();ctx.stroke();
    }
    ctx.lineWidth=3;ctx.strokeStyle='#7e419e';ctx.beginPath();ctx.arc(g.x,g.y,g.outer,0,TAU);ctx.stroke();
    ctx.lineWidth=3;ctx.strokeStyle='#f0baff';ctx.beginPath();ctx.arc(g.x,g.y,inner,0,TAU);ctx.stroke();
    if(active){
      // Fragmentos sólidos caen hacia la boca: todos están dentro de la zona real.
      for(let i=0;i<12;i++){
        const a=i*TAU/12+s.age*.16,t=(i/12+s.elapsed*.48)%1,r=inner+(g.outer-inner)*(1-t);
        const x=g.x+Math.cos(a)*r,y=g.y+Math.sin(a)*r,size=2+(1-t)*3;
        ctx.fillStyle=i%3?'#633485':'#c08cee';ctx.save();ctx.translate(x,y);ctx.rotate(a+t*3);ctx.fillRect(-size,-size,size*2,size*1.3);ctx.restore();
      }
    }
    // La unión liga visualmente al dueño con su ataque sin colorear todo el mapa.
    ctx.strokeStyle='#9d65ce';ctx.lineWidth=2;const a=Math.atan2(e.y-g.y,e.x-g.x);
    line(ctx,e.x,e.y,g.x+Math.cos(a)*g.outer,g.y+Math.sin(a)*g.outer);
  }
  function sniperField(ctx,e,s) {
    const g=s.geometry,active=s.phase==='active',cfg=NV.DIMENSIONAL_THREATS[e.enemyTypeId];
    const charge=active?1:Math.min(1,s.elapsed/cfg.windup);
    const angle=Math.atan2(g.by-g.ay,g.bx-g.ax);
    ctx.strokeStyle='#53ecff';ctx.lineWidth=3;
    mouth(ctx,g.entryX,g.entryY,12+charge*7,angle);mouth(ctx,g.ax,g.ay,12+charge*7,angle);
    ctx.strokeStyle='#337384';ctx.lineWidth=2;line(ctx,e.x,e.y,g.entryX,g.entryY);
    for(const ray of g.rays||[g]){
      const a=Math.atan2(ray.by-ray.ay,ray.bx-ray.ax);
      if(!active){
        // Aviso direccional fino y material: el jugador ve de dónde saldrá el tiro.
        ctx.strokeStyle=s.locked?'#9cf6ff':'#36788d';ctx.lineWidth=s.locked?2:1;
        line(ctx,ray.ax,ray.ay,ray.bx,ray.by);
      } else {
        const t=Math.min(1,s.elapsed/cfg.active),x=ray.ax+(ray.bx-ray.ax)*t,y=ray.ay+(ray.by-ray.ay)*t;
        ctx.strokeStyle='#2b9fcb';ctx.lineWidth=6;line(ctx,x-Math.cos(a)*28,y-Math.sin(a)*28,x,y);
        ctx.strokeStyle='#e8ffff';ctx.lineWidth=2;line(ctx,x-Math.cos(a)*25,y-Math.sin(a)*25,x,y);
        needle(ctx,x,y,a,19,'#6bf5ff');
      }
    }
    if(!active){
      needle(ctx,g.ax,g.ay,angle,10+charge*7,s.locked?'#ffffff':'#89f6ff');
      if(Number.isFinite(g.targetX)){
        const r=s.locked?10:17-charge*5;
        ctx.strokeStyle=s.locked?'#ffffff':'#65dbe9';ctx.lineWidth=s.locked?2.5:1.5;
        // Cuatro muescas: bloqueo legible sin cartel ni círculo difuso.
        for(let i=0;i<4;i++){
          const a=i*Math.PI/2;
          ctx.beginPath();ctx.arc(g.targetX,g.targetY,r,a+.15,a+.65);ctx.stroke();
        }
      }
    }
  }
  NV.drawDimensionalThreatFields = function (ctx, enemies) {
    for (const e of enemies) {
      const s = e.dimensionalThreat;
      if (e.dead || e.waveCleanup || e.arrival || e.killResolved || !s || !s.geometry) continue;
      const active = s.phase === 'active';
      if (!active && s.phase !== 'windup') continue;
      ctx.save(); ctx.shadowBlur = 0; ctx.strokeStyle = e.color;
      ctx.lineWidth = active ? 2.5 : 1.4; ctx.globalAlpha = 1;
      ctx.setLineDash([]);
      if(s.kind==='cut')weaveField(ctx,e,s);
      else if(s.kind==='devour')devourField(ctx,e,s);
      else sniperField(ctx,e,s);
      ctx.restore();
    }
  };
  NV.drawDimensionalThreatBody = function (ctx, e) {
    if (!NV.isDimensionalThreat || !NV.isDimensionalThreat(e)) return false;
    const s = e.dimensionalThreat, cfg = NV.DIMENSIONAL_THREATS[e.enemyTypeId];
    const art=ART[cfg.kind],bodyColor=art?art.body:e.color;
    const progress = s && s.phase === 'windup' ? Math.min(1, s.elapsed / cfg.windup) : 0;
    const recoil = s && s.phase === 'active' ? Math.max(0, 1 - s.elapsed / .22) : 0;
    ctx.save(); ctx.translate(e.x, e.y); ctx.shadowBlur = 0;
    ctx.strokeStyle = e.hitFlash > 0 ? '#ffffff' : (art?art.rim:e.color);
    ctx.fillStyle = '#121b2b'; ctx.lineWidth = 1.8;
    const r = e.radius * 1.2, age = s ? s.age || 0 : 0;
    const material = ctx.createLinearGradient(-r, -r, r, r);
    if (material && material.addColorStop) {
      material.addColorStop(0, art?art.light:'#cbd7e7'); material.addColorStop(.2, bodyColor);
      material.addColorStop(.48, art?art.dark:'#243149'); material.addColorStop(1, '#080c17');
      ctx.fillStyle = material;
    }
    if (cfg.kind === 'snipe') ctx.rotate((e.dimensionalFacing || 0) + Math.PI / 2);
    else if (cfg.kind === 'cut' && s && s.geometry) {
      ctx.rotate(Math.atan2(s.geometry.by - s.geometry.ay, s.geometry.bx - s.geometry.ax)+Math.PI/2);
    }
    if (cfg.kind === 'cut') {
      // Carapaza partida: dos filos dimensionales flanquean la bobina luminosa.
      const gap = 2 + progress * 7 - recoil * 1.5;
      for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(side * gap, -r * 1.25);
        ctx.bezierCurveTo(side * (gap + r * 1.1), -r * .75, side * (gap + r * 1.05), r * .7, side * gap, r * 1.15);
        ctx.lineTo(side * (gap + r * .2), r * .4); ctx.lineTo(side * gap, -r * .15);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        for (let i = 0; i < 3; i++) {
          const y = (i - 1) * r * .38;
          line(ctx, side * (gap + r * .2), y, side * (gap + r * .55), y - r * .15);
        }
      }
      ctx.strokeStyle = art.light; ctx.lineWidth = 2;
      line(ctx, 0, -r * .7, 0, r * .7);
      ctx.fillStyle = art.light; ctx.beginPath(); ctx.ellipse(0, 0, 2.5, 4 + progress * 3, 0, 0, TAU); ctx.fill();
      // Bobina axial y dientes suspendidos: figura flotante, sin cabeza ni miembros.
      ctx.fillStyle=art.dark;ctx.strokeStyle=art.rim;
      ctx.beginPath();ctx.ellipse(0,r*.5,r*.27,r*.39,0,0,TAU);ctx.fill();ctx.stroke();
      const stitching=s && s.phase==='windup' && s.elapsed>=cfg.approach;
      const beat=stitching?Math.sin(age*32)*5:0;
      for(const side of [-1,1]){
        ctx.fillStyle=art.dark;ctx.strokeStyle=art.rim;ctx.lineWidth=1.5;
        ctx.beginPath();ctx.ellipse(side*(r+3),beat,4,7,side*.35,0,TAU);ctx.fill();ctx.stroke();
        needle(ctx,side*(r+7),beat-4,-Math.PI/2+side*.6,10,art.light);
      }
    } else if (cfg.kind === 'devour') {
      for (let i = 0; i < 3; i++) {
        ctx.save(); ctx.rotate(i * TAU / 3 + Math.sin(age * .7) * .04 + progress * .22);
        ctx.translate(progress * 4 - recoil * 2, 0);
        ctx.beginPath(); ctx.moveTo(r * .43, -r * .17);
        ctx.bezierCurveTo(r * .8, -r * .62, r * 1.12, -r * .4, r * 1.02, r * .08);
        ctx.lineTo(r * 1.32, -r * .27); ctx.lineTo(r * .98, r * .25);
        ctx.lineTo(r * .72, r * .42); ctx.lineTo(r * .48, r * .18); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      }
      ctx.fillStyle = '#01020a'; ctx.beginPath(); ctx.arc(0, 0, r * .57, 0, TAU); ctx.fill(); ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a=i*TAU/6+age*.3;
        ctx.fillStyle=i%2?'#683f8e':'#ba85ea';
        ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.50,Math.sin(a)*r*.50);
        ctx.lineTo(Math.cos(a+.32)*r*.27,Math.sin(a+.32)*r*.27);
        ctx.lineTo(Math.cos(a+.43)*r*.45,Math.sin(a+.43)*r*.45);ctx.closePath();ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.fillStyle = '#e9dbff';
      ctx.beginPath(); ctx.arc(-r * .18, -r * .12, 1.5 + progress, 0, TAU); ctx.fill();
      // Tres colmillos convergen en una garganta negra: mandíbula abierta.
      for(let i=0;i<3;i++){
        const a=i*TAU/3+progress*.22;
        ctx.fillStyle='#ead9ff';ctx.beginPath();ctx.moveTo(Math.cos(a-.12)*r*.64,Math.sin(a-.12)*r*.64);
        ctx.lineTo(Math.cos(a)*r*.26,Math.sin(a)*r*.26);
        ctx.lineTo(Math.cos(a+.12)*r*.64,Math.sin(a+.12)*r*.64);ctx.closePath();ctx.fill();
      }
    } else {
      ctx.translate(0, recoil * 5);
      for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(side * r * .22, -r * .6);
        ctx.lineTo(side * r * .7, -r * 1.12); ctx.lineTo(side * r * 1.04, r * .5);
        ctx.lineTo(side * r * .43, r * .94); ctx.lineTo(side * r * .19, r * .3); ctx.closePath(); ctx.fill(); ctx.stroke();
        line(ctx, side * r * .5, -r * .15, side * r * .7, r * .6);
      }
      ctx.fillStyle = '#060b14'; ctx.beginPath(); ctx.ellipse(0, 0, r * .42, r * .72, 0, 0, TAU); ctx.fill(); ctx.stroke();
      line(ctx, -r * .17, -r * .6, -r * .17, -r * (1 + progress * .25));
      line(ctx, r * .17, -r * .6, r * .17, -r * (1 + progress * .25));
      mouth(ctx, 0, -r * .12, 5 + progress * 3, 0);
      // Dos raíles largos y el visor blanco identifican al francotirador aun quieto.
      for(const side of [-1,1]){
        ctx.fillStyle=art.dark;ctx.strokeStyle=progress>0?art.energy:art.rail;ctx.lineWidth=1.5;
        ctx.beginPath();ctx.moveTo(side*r*.18,-r*.35);ctx.lineTo(side*r*.38,-r*1.95);
        ctx.lineTo(side*r*.16,-r*2.1);ctx.lineTo(side*r*.05,-r*.35);ctx.closePath();ctx.fill();ctx.stroke();
      }
      ctx.fillStyle=art.energy;ctx.fillRect(-r*.28,-r*.42,r*.56,3+progress*3);
      // Cañón axial y aletas flotantes, sin apoyos ni extremidades.
      ctx.fillStyle=art.dark;ctx.strokeStyle=art.rail;ctx.lineWidth=2;
      ctx.fillRect(-3,-r*1.95,6,r*1.35);ctx.strokeRect(-3,-r*1.95,6,r*1.35);
      for(const side of [-1,1]){
        ctx.beginPath();ctx.moveTo(side*r*.85,r*.55);ctx.lineTo(side*r*1.15,r*1.1);
        ctx.lineTo(side*r*.65,r*.95);ctx.closePath();ctx.fill();ctx.stroke();
      }
    }
    if (e.maxHp > 0 && e.hp < e.maxHp) {
      ctx.lineWidth = 2; line(ctx, -r, -r - 8, -r + 2 * r * Math.max(0, e.hp / e.maxHp), -r - 8);
    }
    ctx.restore(); return true;
  };
})();
