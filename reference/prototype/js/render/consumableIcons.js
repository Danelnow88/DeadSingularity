// ===== RENDER: iconos SVG-approved de consumibles convertidos a canvas =====
// Grilla lógica 32x32. Volúmenes sólidos con luz superior y símbolos reconocibles a 24 px.
(() => {
  'use strict';
  const NV = window.NV;

  const COLORS = {
    potion: { c: '#22c55e', c2: '#86efac' },
    overdrive: { c: '#caa7ff', c2: '#f0abfc' },
    shield: { c: '#ffcf76', c2: '#fde68a' },
    bomb: { c: '#64748b', c2: '#ff7a45' },
    freeze: { c: '#67e8f9', c2: '#c4b5fd' },
    magnet: { c: '#7cf8ff', c2: '#93c5fd' },
    bounty: { c: '#ffd700', c2: '#fbbf24' },
  };

  function idOf(item) { return typeof item === 'string' ? item : (item && (item.type || item.id || item.key)) || 'potion'; }
  function color(id, cls) { const p = COLORS[id] || COLORS.potion; return cls[0] === '#' ? cls : cls === 'alt' || cls === 'accent' ? p.c2 : cls === 'ghost' ? '#263347' : p.c; }
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
  function circle(ctx, cls, x, y, r, fill) { ctx.strokeStyle = color(this.id, cls); ctx.fillStyle = color(this.id, cls); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); if(fill){ const width=ctx.lineWidth; ctx.strokeStyle='#060b15'; ctx.lineWidth=2.4; ctx.stroke(); ctx.fill(); ctx.lineWidth=width; }else ctx.stroke(); }
  function polygon(ctx, cls, points, fill) { if (typeof ctx.moveTo !== 'function' || typeof ctx.lineTo !== 'function') return; ctx.strokeStyle = color(this.id, cls); ctx.fillStyle = color(this.id, cls); ctx.globalAlpha = 1; ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]); for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]); ctx.closePath(); if (fill) { const width=ctx.lineWidth,blur=ctx.shadowBlur; ctx.shadowBlur=0; ctx.strokeStyle='#060b15'; ctx.lineWidth=2.4; ctx.stroke(); ctx.fill(); ctx.lineWidth=width; ctx.shadowBlur=blur; } else ctx.stroke(); ctx.globalAlpha = 1; }
  function line(ctx, cls, x1, y1, x2, y2, width) { if (typeof ctx.moveTo !== 'function' || typeof ctx.lineTo !== 'function') return; ctx.strokeStyle = color(this.id, cls); ctx.globalAlpha = cls === 'ghost' ? 0.42 : 1; const old = ctx.lineWidth; if (width) ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.lineWidth = old; ctx.globalAlpha = 1; }

  const DRAW = {
    potion(ctx) {
      polygon.call(this,ctx,'#acdace',[[12,8],[20,8],[20,13],[25,20],[24,25],[21,28],[11,28],[8,25],[7,20],[12,13]],true);
      polygon.call(this,ctx,'base',[[9,18],[23,18],[23,24],[20,26],[12,26],[9,24]],true);
      polygon.call(this,ctx,'#976849',[[12,4],[20,4],[20,8],[12,8]],true);
      line.call(this,ctx,'alt',11,20,11,23,1.7); line.call(this,ctx,'#ebfff6',12,11,12,14,1.5);
      line.call(this,ctx,'#d1a675',13,5,18,5,1.2); circle.call(this,ctx,'alt',19,21,1.4,true);
    },
    overdrive(ctx) {
      polygon.call(this,ctx,'#44335f',[[10,6],[20,6],[24,10],[22,25],[9,25],[7,10]],true);
      polygon.call(this,ctx,'base',[[19,3],[10,16],[16,16],[13,29],[24,13],[18,13]],true);
      line.call(this,ctx,'#fff0ff',17,8,13,14,1.4); line.call(this,ctx,'alt',5,10,2,10,1.5);
      line.call(this,ctx,'alt',5,18,2,18,1.5); line.call(this,ctx,'alt',27,21,30,21,1.5);
    },
    shield(ctx) {
      polygon.call(this,ctx,'#bf8737',[[16,3],[27,7],[26,18],[22,25],[16,29],[10,25],[6,18],[5,7]],true);
      polygon.call(this,ctx,'base',[[16,6],[24,9],[23,17],[20,23],[16,26],[12,23],[9,17],[8,9]],true);
      polygon.call(this,ctx,'#ffeeb8',[[16,6],[16,26],[12,23],[9,17],[8,9]],true);
      polygon.call(this,ctx,'#f0ab38',[[16,11],[20,16],[16,21],[12,16]],true);
      line.call(this,ctx,'#fff6da',9,9,14,7,1.3);
    },
    bomb(ctx) {
      circle.call(this,ctx,'base',14,19,9,true);
      polygon.call(this,ctx,'ghost',[[8,22],[16,25],[22,20],[20,26],[14,28],[8,26]],true);
      polygon.call(this,ctx,'#9facc0',[[15,9],[19,9],[20,12],[15,13]],true);
      path.call(this,ctx,'#ffcf76','M18 9C18 4 23 10 25 6');
      polygon.call(this,ctx,'alt',[[25,2],[26,5],[29,6],[26,8],[25,11],[23,8],[21,6],[24,5]],true);
      line.call(this,ctx,'#c5d5e8',9,14,13,12,2); line.call(this,ctx,'#8fa7c7',8,17,8,19,1.3);
      circle.call(this,ctx,'#fff0bd',25,6,1,true);
    },
    freeze(ctx) {
      polygon.call(this,ctx,'#387bc1',[[16,2],[26,10],[25,23],[16,30],[7,23],[6,10]],true);
      polygon.call(this,ctx,'base',[[16,5],[23,11],[22,22],[16,27],[10,22],[9,11]],true);
      line.call(this,ctx,'#edffff',16,8,16,24,1.8);
      line.call(this,ctx,'#edffff',10,12,22,20,1.8); line.call(this,ctx,'#edffff',22,12,10,20,1.8);
      path.call(this,ctx,'#edffff','M13 9L16 12L19 9M13 23L16 20L19 23');
      line.call(this,ctx,'alt',9,11,14,6,1.2);
    },
    magnet(ctx) {
      polygon.call(this,ctx,'base',[[6,5],[13,5],[13,18],[16,21],[19,18],[19,5],[26,5],[26,19],[22,26],[16,29],[10,26],[6,19]],true);
      polygon.call(this,ctx,'#e4f7ff',[[6,5],[13,5],[13,11],[6,11]],true);
      polygon.call(this,ctx,'#97b5f8',[[19,5],[26,5],[26,11],[19,11]],true);
      path.call(this,ctx,'alt','M8 13L8 19L11 24');
      line.call(this,ctx,'base',2,13,4,13,1.6); line.call(this,ctx,'base',28,13,30,13,1.6);
    },
    bounty(ctx) {
      polygon.call(this,ctx,'#ae7623',[[7,8],[13,8],[15,11],[17,11],[19,8],[25,8],[24,18],[20,22],[18,22],[18,26],[22,26],[22,29],[10,29],[10,26],[14,26],[14,22],[10,22],[8,18]],true);
      polygon.call(this,ctx,'base',[[10,4],[22,4],[22,15],[20,19],[16,22],[12,19],[10,15]],true);
      path.call(this,ctx,'alt','M10 8L5 8L5 13L9 17M22 8L27 8L27 13L23 17');
      polygon.call(this,ctx,'#fff1a8',[[16,8],[17,11],[20,12],[17,14],[16,17],[15,14],[12,12],[15,11]],true);
      line.call(this,ctx,'#fff1a8',11,5,20,5,1.3); line.call(this,ctx,'alt',12,27,20,27,1.2);
    },
  };

  NV.CONSUMABLE_ICON_IDS = Object.keys(DRAW);
  NV.consumableIconColors = COLORS;
  NV.drawConsumableIcon = function (ctx, itemOrId, x, y, size, opts) {
    const id = idOf(itemOrId);
    const draw = DRAW[id] || DRAW.potion;
    opts = opts || {};
    ctx.save();
    ctx.translate(x, y);
    const s = (size || 24) / 32;
    ctx.scale(s, s);
    ctx.translate(-16, -16);
    ctx.lineWidth = opts.lineWidth || 1.9;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (opts.glow) { ctx.shadowColor = (COLORS[id] || COLORS.potion).c; ctx.shadowBlur = opts.glow; }
    draw.call({ id }, ctx);
    ctx.shadowBlur = 0;
    ctx.restore();
  };

  NV.consumableIconToDataURL = function (itemOrId, size) {
    const c = document.createElement('canvas');
    c.width = c.height = size || 48;
    const ctx = c.getContext('2d');
    NV.drawConsumableIcon(ctx, itemOrId, c.width / 2, c.height / 2, Math.floor(c.width * 0.78), { glow: 2 });
    return c.toDataURL('image/png');
  };
})();
