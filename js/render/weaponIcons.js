// ===== RENDER: iconos SVG-approved de armas convertidos a canvas =====
// Grilla lógica 32x32: silueta primero, paneles grandes y luz en el borde superior.
(() => {
  'use strict';
  const NV = window.NV;

  const COLORS = {
    pistol: { c: '#e5eefb', c2: '#93c5fd' },
    rifle: { c: '#4ade80', c2: '#bbf7d0' },
    smg: { c: '#facc15', c2: '#fde68a' },
    shotgun: { c: '#f97316', c2: '#fed7aa' },
    sniper: { c: '#ef4444', c2: '#fecaca' },
    laser: { c: '#f472b6', c2: '#fbcfe8' },
    plasma: { c: '#9b5cff', c2: '#67e8f9' },
    flamethrower: { c: '#fb923c', c2: '#fca5a5' },
    bow: { c: '#ac7545', c2: '#86efac' },
    railgun: { c: '#06b6d4', c2: '#67e8f9' },
  };

  function idOf(w) { return typeof w === 'string' ? w : (w && w.id) || 'pistol'; }
  function color(id, cls) { const p = COLORS[id] || COLORS.pistol; return cls[0] === '#' ? cls : cls === 'alt' ? p.c2 : cls === 'ghost' ? '#263347' : p.c; }
  function fallbackPath(ctx, d) {
    if (typeof ctx.moveTo !== 'function' || typeof ctx.lineTo !== 'function') return false;
    const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+/g) || [];
    let i = 0, cmd = '', x = 0, y = 0;
    const num = () => parseFloat(tokens[i++]);
    while (i < tokens.length) {
      if (/^[a-zA-Z]$/.test(tokens[i])) cmd = tokens[i++];
      if (cmd === 'M') { x = num(); y = num(); ctx.moveTo(x, y); cmd = 'L'; }
      else if (cmd === 'm') { x += num(); y += num(); ctx.moveTo(x, y); cmd = 'l'; }
      else if (cmd === 'L') { x = num(); y = num(); ctx.lineTo(x, y); }
      else if (cmd === 'l') { x += num(); y += num(); ctx.lineTo(x, y); }
      else if (cmd === 'H') { x = num(); ctx.lineTo(x, y); }
      else if (cmd === 'h') { x += num(); ctx.lineTo(x, y); }
      else if (cmd === 'V') { y = num(); ctx.lineTo(x, y); }
      else if (cmd === 'v') { y += num(); ctx.lineTo(x, y); }
      else if (cmd === 'C') { const x1 = num(), y1 = num(), x2 = num(), y2 = num(), x3 = num(), y3 = num(); if (typeof ctx.bezierCurveTo === 'function') ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3); else ctx.lineTo(x3, y3); x = x3; y = y3; }
      else if (cmd === 'c') { const x1 = x + num(), y1 = y + num(), x2 = x + num(), y2 = y + num(), x3 = x + num(), y3 = y + num(); if (typeof ctx.bezierCurveTo === 'function') ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3); else ctx.lineTo(x3, y3); x = x3; y = y3; }
      else if (cmd === 'Z' || cmd === 'z') { if (typeof ctx.closePath === 'function') ctx.closePath(); }
      else break;
    }
    return true;
  }
  function path(ctx, cls, d) {
    ctx.strokeStyle = color(this.id, cls); ctx.globalAlpha = cls === 'ghost' ? 0.42 : 1;
    if (typeof Path2D !== 'undefined') { const p = new Path2D(d); ctx.stroke(p); }
    else { ctx.beginPath(); if (fallbackPath(ctx, d)) ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  function rect(ctx, cls, x, y, w, h, r) { ctx.strokeStyle = color(this.id, cls); ctx.globalAlpha = cls === 'ghost' ? 0.42 : 1; ctx.beginPath(); if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r || 0); else ctx.rect(x, y, w, h); ctx.stroke(); ctx.globalAlpha = 1; }
  function circle(ctx, cls, x, y, r, fill) { ctx.strokeStyle = color(this.id, cls); ctx.fillStyle = color(this.id, cls); ctx.globalAlpha = cls === 'ghost' ? 0.42 : 1; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); fill ? ctx.fill() : ctx.stroke(); ctx.globalAlpha = 1; }
  function polygon(ctx, cls, points, fill) {
    if (typeof ctx.moveTo !== 'function' || typeof ctx.lineTo !== 'function') {
      if (typeof Path2D !== 'undefined' && typeof ctx.stroke === 'function') {
        const d = 'M' + points.map(p => p[0] + ' ' + p[1]).join('L') + 'Z';
        ctx.stroke(new Path2D(d));
      }
      return;
    }
    ctx.strokeStyle = color(this.id, cls); ctx.fillStyle = color(this.id, cls); ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
    if (fill) { const width=ctx.lineWidth,blur=ctx.shadowBlur; ctx.shadowBlur=0; ctx.strokeStyle='#060b15'; ctx.lineWidth=2.4; ctx.stroke(); ctx.fill(); ctx.lineWidth=width; ctx.shadowBlur=blur; }
    else ctx.stroke(); ctx.globalAlpha = 1;
  }
  function line(ctx, cls, x1, y1, x2, y2, width) {
    if (typeof ctx.moveTo !== 'function' || typeof ctx.lineTo !== 'function') {
      if (typeof Path2D !== 'undefined' && typeof ctx.stroke === 'function') ctx.stroke(new Path2D('M' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2));
      return;
    }
    ctx.strokeStyle = color(this.id, cls); ctx.globalAlpha = cls === 'ghost' ? 0.42 : 1;
    const old = ctx.lineWidth; if (width) ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.lineWidth = old; ctx.globalAlpha = 1;
  }

  const DRAW = {
    pistol(ctx) {
      polygon.call(this,ctx,'ghost',[[10,16],[17,16],[17,21],[12,21],[11,25],[6,25],[9,15]],true);
      polygon.call(this,ctx,'base',[[5,9],[27,9],[28,14],[23,17],[10,17],[6,15]],true);
      polygon.call(this,ctx,'#57708d',[[9,17],[13,17],[11,24],[7,24]],true);
      line.call(this,ctx,'alt',7,10,25,10,1.4); line.call(this,ctx,'ghost',20,12,24,12,1.3);
      line.call(this,ctx,'#060b15',27,10,27,14,1.8); line.call(this,ctx,'alt',6,8,9,8,1.5);
      path.call(this,ctx,'alt','M13 17L14 19L16 19');
    },
    rifle(ctx) {
      polygon.call(this,ctx,'ghost',[[2,11],[7,11],[9,14],[7,20],[2,21]],true);
      polygon.call(this,ctx,'base',[[7,12],[24,12],[24,17],[12,18],[7,17]],true);
      polygon.call(this,ctx,'base',[[15,17],[20,17],[19,25],[15,24]],true);
      polygon.call(this,ctx,'ghost',[[9,17],[13,17],[11,23],[8,23]],true);
      polygon.call(this,ctx,'ghost',[[24,13],[30,13],[30,16],[24,16]],true);
      line.call(this,ctx,'alt',9,12,22,12,1.3); line.call(this,ctx,'alt',18,14,22,14,1.2);
      line.call(this,ctx,'#060b15',19,13,19,16,1.1); line.call(this,ctx,'alt',25,10,25,12,1.4);
    },
    smg(ctx) {
      polygon.call(this,ctx,'ghost',[[2,12],[8,12],[8,15],[4,15],[4,20],[2,20]],true);
      polygon.call(this,ctx,'base',[[7,10],[22,10],[25,13],[24,17],[8,17]],true);
      polygon.call(this,ctx,'ghost',[[23,12],[29,12],[29,16],[23,16]],true);
      polygon.call(this,ctx,'base',[[11,17],[15,17],[15,25],[10,25]],true);
      polygon.call(this,ctx,'ghost',[[19,17],[22,17],[21,22],[18,22]],true);
      line.call(this,ctx,'alt',9,11,21,11,1.3); line.call(this,ctx,'ghost',18,13,21,13,1.5);
      line.call(this,ctx,'alt',11,23,14,23,1.2); line.call(this,ctx,'alt',11,8,15,8,1.5);
    },
    shotgun(ctx) {
      polygon.call(this,ctx,'ghost',[[11,11],[30,11],[30,14],[11,14]],true);
      polygon.call(this,ctx,'base',[[2,16],[9,13],[14,13],[14,18],[10,18],[7,23],[2,23]],true);
      polygon.call(this,ctx,'#d79b50',[[15,15],[25,15],[25,19],[15,19]],true);
      line.call(this,ctx,'alt',12,11,29,11,1.2); line.call(this,ctx,'alt',3,17,8,15,1.1);
      for(let x=18;x<=23;x+=2.5) line.call(this,ctx,'#704522',x,16,x,18,1.1);
      path.call(this,ctx,'alt','M10 18L11 21L14 20');
    },
    sniper(ctx) {
      polygon.call(this,ctx,'base',[[2,15],[8,13],[19,13],[20,17],[11,18],[7,22],[2,22]],true);
      polygon.call(this,ctx,'ghost',[[19,14],[30,14],[30,16],[19,17]],true);
      polygon.call(this,ctx,'ghost',[[10,7],[21,7],[21,11],[10,11]],true);
      line.call(this,ctx,'base',12,11,12,13,1.4); line.call(this,ctx,'base',19,11,19,13,1.4);
      line.call(this,ctx,'alt',11,8,19,8,1.2); line.call(this,ctx,'alt',8,14,17,14,1.1);
      line.call(this,ctx,'alt',21,8,21,10,1.7); line.call(this,ctx,'base',24,17,21,23,1.4);
      line.call(this,ctx,'base',24,17,27,23,1.4); line.call(this,ctx,'ghost',14,18,14,21,2);
    },
    laser(ctx) {
      polygon.call(this,ctx,'ghost',[[3,12],[9,12],[10,17],[7,23],[3,23],[5,17]],true);
      polygon.call(this,ctx,'base',[[7,10],[18,10],[22,12],[26,12],[26,19],[18,20],[9,18]],true);
      polygon.call(this,ctx,'ghost',[[19,12],[27,12],[27,18],[19,18]],true);
      line.call(this,ctx,'alt',9,11,17,11,1.4); line.call(this,ctx,'alt',21,12,21,18,1.5);
      line.call(this,ctx,'alt',25,12,25,18,1.5); line.call(this,ctx,'#fff2fc',27,15,30,15,1.7);
      line.call(this,ctx,'alt',10,15,15,15,1.4);
    },
    plasma(ctx) {
      polygon.call(this,ctx,'base',[[2,11],[7,11],[9,13],[17,10],[24,10],[27,13],[27,19],[18,21],[12,18],[10,24],[6,24],[7,18],[2,19]],true);
      polygon.call(this,ctx,'ghost',[[15,12],[24,12],[24,18],[15,18]],true);
      circle.call(this,ctx,'alt',19,15,2.7,true);
      polygon.call(this,ctx,'base',[[25,12],[29,12],[29,19],[25,19]],true);
      line.call(this,ctx,'alt',27,13,29,13,1.3); line.call(this,ctx,'alt',27,18,29,18,1.3);
      line.call(this,ctx,'#e8d8ff',9,13,13,12,1.2); line.call(this,ctx,'alt',8,15,11,15,1.2);
      line.call(this,ctx,'#e8d8ff',17,10,23,10,1.2);
    },
    flamethrower(ctx) {
      polygon.call(this,ctx,'#b94531',[[3,8],[8,8],[10,11],[10,22],[8,24],[3,24],[2,21],[2,11]],true);
      path.call(this,ctx,'#eaa450','M6 24C7 28 19 27 19 18');
      polygon.call(this,ctx,'base',[[7,11],[19,11],[21,13],[21,17],[16,18],[16,24],[12,24],[12,17],[7,17]],true);
      polygon.call(this,ctx,'ghost',[[20,12],[26,12],[26,17],[20,17]],true);
      polygon.call(this,ctx,'#ff6b35',[[26,14],[28,9],[29,12],[30,11],[30,20],[28,18]],true);
      polygon.call(this,ctx,'#ffe4a1',[[27,15],[29,13],[29,17],[28,16]],true);
      line.call(this,ctx,'alt',9,12,17,12,1.2); line.call(this,ctx,'alt',3,10,7,10,1.2);
      line.call(this,ctx,'#9ba8bd',22,13,22,16,1.3);
    },
    bow(ctx) {
      // Recurved wood limbs, taut string, green wrapped grip and nocked arrow.
      const width=ctx.lineWidth;ctx.lineWidth=5;
      path.call(this,ctx,'#060b15','M9 3C8 8 18 9 17 16C18 23 8 24 9 29');
      ctx.lineWidth=3; path.call(this,ctx,'base','M9 3C8 8 18 9 17 16C18 23 8 24 9 29'); ctx.lineWidth=width;
      path.call(this,ctx,'#ffe0aa','M10 5C11 8 16 10 16 13');
      line.call(this,ctx,'#e3e8d3',9,3,9,29,1.2);
      polygon.call(this,ctx,'alt',[[14,13],[18,13],[18,19],[14,19]],true);
      line.call(this,ctx,'#e3e8d3',3,16,27,16,1.3);
      polygon.call(this,ctx,'alt',[[29,16],[24,13],[25,16],[24,19]],true);
      line.call(this,ctx,'alt',3,14,6,16,1.4); line.call(this,ctx,'alt',3,18,6,16,1.4);
    },
    railgun(ctx) {
      polygon.call(this,ctx,'ghost',[[2,11],[7,11],[8,17],[6,21],[2,20]],true);
      polygon.call(this,ctx,'base',[[7,11],[16,11],[18,14],[16,20],[12,20],[10,25],[6,25],[8,18]],true);
      polygon.call(this,ctx,'ghost',[[15,9],[29,9],[29,13],[17,13],[17,18],[29,18],[29,22],[15,22]],true);
      line.call(this,ctx,'alt',17,10,28,10,1.3); line.call(this,ctx,'base',17,21,28,21,1.6);
      line.call(this,ctx,'#e0ffff',18,15.5,30,15.5,1.3);
      for(let x=20;x<=26;x+=6) {line.call(this,ctx,'base',x,10,x,13,2.2);line.call(this,ctx,'base',x,18,x,21,2.2);}
      circle.call(this,ctx,'alt',12,15,2.1,true); line.call(this,ctx,'alt',8,12,12,12,1.2);
    },
  };

  NV.WEAPON_ICON_IDS = Object.keys(DRAW);
  NV.weaponIconColors = COLORS;
  NV.drawWeaponIcon = function (ctx, weaponOrId, x, y, size, opts) {
    const id = idOf(weaponOrId);
    const draw = DRAW[id] || DRAW.pistol;
    opts = opts || {};
    ctx.save();
    ctx.translate(x, y);
    const s = (size || 24) / 32;
    ctx.scale(s, s);
    ctx.translate(-16, -16);
    ctx.lineWidth = opts.lineWidth || 1.9;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (opts.glow) { ctx.shadowColor = (COLORS[id] || COLORS.pistol).c; ctx.shadowBlur = opts.glow; }
    draw.call({ id }, ctx);
    ctx.shadowBlur = 0;
    ctx.restore();
  };

  NV.weaponIconToDataURL = function (weaponOrId, size) {
    const c = document.createElement('canvas');
    c.width = c.height = size || 48;
    const ctx = c.getContext('2d');
    NV.drawWeaponIcon(ctx, weaponOrId, c.width / 2, c.height / 2, Math.floor(c.width * 0.78), { glow: 2 });
    return c.toDataURL('image/png');
  };
})();
