// ===== RENDER: iconos SVG-approved de mejoras permanentes y habilidades convertidos a canvas =====
// Grilla lógica 32x32. Diseños aprobados en previews/meta-skill-icons-preview.html.
(() => {
  'use strict';
  const NV = window.NV;

  const COLORS = {
    damage: { c: '#ff5f9b', c2: '#fca5a5' },
    speed: { c: '#38bdf8', c2: '#bae6fd' },
    hp: { c: '#22c55e', c2: '#fb7185' },
    armor: { c: '#ffcf76', c2: '#fde68a' },
    luck: { c: '#84cc16', c2: '#fde68a' },
    crit: { c: '#f97316', c2: '#fecaca' },
    dodge: { c: '#7cf8ff', c2: '#cbd5e1' },
    regen: { c: '#4ade80', c2: '#86efac' },
    greed: { c: '#ffd700', c2: '#fbbf24' },
    meteor: { c: '#7cf8ff', c2: '#bfdbfe' },
    phase: { c: '#ff9d36', c2: '#fff0bc' },
    bulwark: { c: '#ffcf76', c2: '#fde68a' },
    hivemind: { c: '#fff3a3', c2: '#67f5da' },
  };

  function idOf(item) { return typeof item === 'string' ? item : (item && (item.key || item.special || item.id || item.type)) || 'damage'; }
  function color(id, cls) { const p = COLORS[id] || COLORS.damage; return cls[0] === '#' ? cls : cls === 'accent' ? p.c : cls === 'alt' ? p.c2 : cls === 'ghost' ? p.c : '#e5eefb'; }
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
      else if (cmd === 'S' || cmd === 's') { const x2 = (cmd === 's' ? x : 0) + num(), y2 = (cmd === 's' ? y : 0) + num(), x3 = (cmd === 's' ? x : 0) + num(), y3 = (cmd === 's' ? y : 0) + num(); if (typeof ctx.bezierCurveTo === 'function') ctx.bezierCurveTo(x, y, x2, y2, x3, y3); else ctx.lineTo(x3, y3); x = x3; y = y3; }
      else if (cmd === 'A' || cmd === 'a') { i += 5; const nx = (cmd === 'a' ? x : 0) + num(), ny = (cmd === 'a' ? y : 0) + num(); ctx.lineTo(nx, ny); x = nx; y = ny; }
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
  // Curved filled silhouettes remain vector-native and use the same dark keyline.
  function solidPath(ctx, cls, d) {
    ctx.fillStyle=color(this.id,cls); ctx.strokeStyle='#060b15';
    const width=ctx.lineWidth; ctx.lineWidth=2.4;
    if(typeof Path2D !== 'undefined'){const p=new Path2D(d);ctx.stroke(p);ctx.fill(p);}
    else {ctx.beginPath();if(fallbackPath(ctx,d)){ctx.stroke();ctx.fill();}}
    ctx.lineWidth=width;
  }
  function circle(ctx, cls, x, y, r, fill) { ctx.strokeStyle = color(this.id, cls); ctx.fillStyle = color(this.id, cls); ctx.globalAlpha = cls === 'ghost' ? 0.42 : 1; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); fill ? ctx.fill() : ctx.stroke(); ctx.globalAlpha = 1; }
  function polygon(ctx, cls, points, fill) { if (typeof ctx.moveTo !== 'function' || typeof ctx.lineTo !== 'function') return; ctx.strokeStyle = color(this.id, cls); ctx.fillStyle = color(this.id, cls); ctx.globalAlpha = 1; ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]); for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]); ctx.closePath(); if (fill) { const width=ctx.lineWidth,blur=ctx.shadowBlur; ctx.shadowBlur=0; ctx.strokeStyle='#060b15'; ctx.lineWidth=2.4; ctx.stroke(); ctx.fill(); ctx.lineWidth=width; ctx.shadowBlur=blur; } else ctx.stroke(); ctx.globalAlpha = 1; }
  function line(ctx, cls, x1, y1, x2, y2, width) { if (typeof ctx.moveTo !== 'function' || typeof ctx.lineTo !== 'function') return; ctx.strokeStyle = color(this.id, cls); ctx.globalAlpha = cls === 'ghost' ? 0.42 : 1; const old = ctx.lineWidth; if (width) ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.lineWidth = old; ctx.globalAlpha = 1; }

  const DRAW = {
    damage(ctx) { polygon.call(this,ctx,'base',[[5,25],[18,12],[17,6],[27,15],[21,16],[15,22]],true); line.call(this,ctx,'accent',17,6,27,15,2); line.call(this,ctx,'alt',7,26,13,20,1.3); },
    speed(ctx) {
      polygon.call(this,ctx,'accent',[[15,5],[24,5],[23,17],[28,19],[28,24],[9,24],[9,20],[15,17]],true);
      polygon.call(this,ctx,'#eefaff',[[14,19],[8,15],[3,8],[10,9],[8,5],[17,12],[18,16]],true);
      line.call(this,ctx,'#90cbea',7,10,13,15,1.3); line.call(this,ctx,'#90cbea',11,10,15,14,1.3);
      polygon.call(this,ctx,'#27628e',[[9,24],[28,24],[28,27],[9,27]],true);
      line.call(this,ctx,'alt',17,7,22,7,1.4); line.call(this,ctx,'alt',18,12,22,12,1.3);
      line.call(this,ctx,'alt',18,15,21,15,1.3); line.call(this,ctx,'alt',2,24,6,24,1.3);
    },
    hp(ctx) {
      solidPath.call(this,ctx,'accent','M16 28C13 25 3 18 3 11C3 3 12 2 16 9C20 2 29 3 29 11C29 18 19 25 16 28Z');
      solidPath.call(this,ctx,'#159868','M16 28C22 21 27 15 28 10C31 19 20 25 16 28Z');
      path.call(this,ctx,'#bcffd1','M6 11C6 7 10 6 12 9');
      line.call(this,ctx,'#edfff4',16,13,16,21,2.8); line.call(this,ctx,'#edfff4',12,17,20,17,2.8);
    },
    armor(ctx) {
      polygon.call(this,ctx,'#7b8ca9',[[6,5],[12,4],[13,8],[19,8],[20,4],[26,5],[29,12],[25,16],[23,27],[9,27],[7,16],[3,12]],true);
      polygon.call(this,ctx,'base',[[10,9],[13,11],[19,11],[22,9],[24,16],[21,24],[11,24],[8,16]],true);
      polygon.call(this,ctx,'#b0bfd0',[[16,11],[22,9],[24,16],[21,24],[16,24]],true);
      line.call(this,ctx,'accent',10,17,22,17,2); line.call(this,ctx,'accent',16,12,16,24,1.5);
      line.call(this,ctx,'#f1f6ff',5,8,9,6,1.4); line.call(this,ctx,'alt',11,26,21,26,1.3);
    },
    luck(ctx) {
      // Four broad heart-shaped leaves, not four disconnected dots.
      line.call(this,ctx,'#4d8b27',16,19,23,28,2.8);
      solidPath.call(this,ctx,'accent','M16 16C11 17 5 14 5 9C5 4 11 4 12 8C16 5 19 10 16 16Z');
      solidPath.call(this,ctx,'#6fae2c','M16 16C15 11 18 5 23 5C28 5 28 11 24 12C27 16 22 19 16 16Z');
      solidPath.call(this,ctx,'#4e952e','M16 16C21 15 27 18 27 23C27 28 21 28 20 24C16 27 13 22 16 16Z');
      solidPath.call(this,ctx,'#9ad945','M16 16C17 21 14 27 9 27C4 27 4 21 8 20C5 16 10 13 16 16Z');
      path.call(this,ctx,'#dbf79a','M8 9C8 7 10 7 11 9');
      line.call(this,ctx,'#d5f891',16,16,11,11,1); line.call(this,ctx,'#c0e28b',16,16,21,11,1);
    },
    crit(ctx) { circle.call(this,ctx,'base',16,16,9,true); line.call(this,ctx,'accent',16,7,16,12,2); line.call(this,ctx,'accent',16,20,16,25,2); line.call(this,ctx,'accent',7,16,12,16,2); line.call(this,ctx,'accent',20,16,25,16,2); line.call(this,ctx,'alt',12,12,20,20,1.4); line.call(this,ctx,'alt',20,12,12,20,1.4); },
    dodge(ctx) { path.call(this,ctx,'base','M11 7c6 4 6 14 0 18'); path.call(this,ctx,'ghost','M18 7c6 4 6 14 0 18'); polygon.call(this,ctx,'accent',[[3,16],[13,11],[13,14],[25,14],[25,18],[13,18],[13,21]],true); },
    regen(ctx) { path.call(this,ctx,'base','M25 11a10 10 0 0 0-17-3'); path.call(this,ctx,'base','M7 21a10 10 0 0 0 17 3'); polygon.call(this,ctx,'accent',[[8,5],[14,5],[14,11],[8,11]],true); line.call(this,ctx,'alt',16,12,16,21,1.8); line.call(this,ctx,'alt',12,16,20,16,1.8); },
    greed(ctx) { polygon.call(this,ctx,'base',[[16,4],[25,11],[22,25],[10,25],[7,11]],true); line.call(this,ctx,'accent',7,11,25,11,1.7); line.call(this,ctx,'accent',11,24,16,5,1.4); line.call(this,ctx,'accent',21,24,16,5,1.4); polygon.call(this,ctx,'alt',[[25,4],[27,8],[25,11],[23,8]],true); },
    meteor(ctx) { polygon.call(this,ctx,'base',[[5,14],[14,10],[23,16],[18,26],[8,24]],true); polygon.call(this,ctx,'alt',[[10,14],[15,13],[19,17],[15,22],[10,20]],true); line.call(this,ctx,'accent',26,4,17,13,2.2); line.call(this,ctx,'accent',29,9,20,18,1.2); },
    phase(ctx) { polygon.call(this,ctx,'accent',[[16,3],[20,10],[27,7],[24,15],[30,19],[22,21],[20,29],[15,24],[8,27],[10,19],[3,15],[11,11]],true); polygon.call(this,ctx,'base',[[16,10],[20,16],[17,23],[12,18]],true); circle.call(this,ctx,'alt',16,17,2,true); },
    bulwark(ctx) { polygon.call(this,ctx,'base',[[16,7],[24,12],[24,20],[16,25],[8,20],[8,12]],true); line.call(this,ctx,'accent',16,2,16,30,1.6); line.call(this,ctx,'accent',3,16,29,16,1.6); line.call(this,ctx,'alt',12,12,20,20,1.3); line.call(this,ctx,'alt',20,12,12,20,1.3); },
    hivemind(ctx) { circle.call(this,ctx,'base',16,16,4,true); circle.call(this,ctx,'ghost',16,16,11,false); for(let i=0;i<6;i++){const a=i*Math.PI/3; line.call(this,ctx,'ghost',16+Math.cos(a)*4,16+Math.sin(a)*4,16+Math.cos(a)*9,16+Math.sin(a)*9,1); circle.call(this,ctx,i%2?'accent':'alt',16+Math.cos(a)*11,16+Math.sin(a)*11,2.5,true);} },
  };

  NV.META_SKILL_ICON_IDS = Object.keys(DRAW);
  NV.metaSkillIconColors = COLORS;
  NV.drawMetaSkillIcon = function (ctx, idOrItem, x, y, size, opts) {
    const id = idOf(idOrItem);
    const draw = DRAW[id] || DRAW.damage;
    opts = opts || {};
    ctx.save();
    ctx.translate(x, y);
    const s = (size || 24) / 32;
    ctx.scale(s, s);
    ctx.translate(-16, -16);
    ctx.lineWidth = opts.lineWidth || 1.9;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (opts.glow) { ctx.shadowColor = (COLORS[id] || COLORS.damage).c; ctx.shadowBlur = opts.glow; }
    draw.call({ id }, ctx);
    ctx.shadowBlur = 0;
    ctx.restore();
  };

  NV.metaSkillIconToDataURL = function (idOrItem, size) {
    const c = document.createElement('canvas');
    c.width = c.height = size || 48;
    const ctx = c.getContext('2d');
    NV.drawMetaSkillIcon(ctx, idOrItem, c.width / 2, c.height / 2, Math.floor(c.width * 0.78), { glow: 2 });
    return c.toDataURL('image/png');
  };
})();
