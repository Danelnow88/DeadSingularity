// Tres destinos visuales. Sólo presentación: no RNG de combate ni colisiones.
(() => {
  'use strict';
  const NV = window.NV;
  const models = Object.freeze([
    Object.freeze({ id: 'lens', name: 'LENTE AZUL', color: '#a3dfff', accent: '#e9c99c', tilt: -0.35, flatten: 0.82 }),
    Object.freeze({ id: 'accretion', name: 'CORONA ÁMBAR', color: '#efc38d', accent: '#f8f0dc', tilt: 0.18, flatten: 0.36 }),
    Object.freeze({ id: 'abyss', name: 'ABISMO VIOLETA', color: '#c4b4f5', accent: '#88c9e1', tilt: -0.62, flatten: 0.63 }),
  ]);
  NV.BLACK_HOLE_MODELS = models;
  let sample;
  NV.drawBlackHole = function (ctx, x, y, radius, time, modelIndex, options) {
    const m = models[Math.max(0, Math.min(2, modelIndex | 0))];
    const reduced = options && options.reduced;
    const r = radius, outer = r * 2.1;
    // Captura acotada del fondo ya pintado. Nunca captura HUD/hostiles si se llama
    // en la capa de fondo. Los anillos remuestrean estrellas reales del mapa.
    if (ctx.canvas && ctx.getTransform && typeof document !== 'undefined') {
      if (!sample) { sample = document.createElement('canvas'); sample.width = sample.height = 256; }
      const transform = ctx.getTransform();
      const px = transform.a * x + transform.c * y + transform.e;
      const py = transform.b * x + transform.d * y + transform.f;
      const scale = Math.hypot(transform.a, transform.b);
      const sc = sample.getContext('2d');
      sc.clearRect(0, 0, 256, 256);
      sc.drawImage(ctx.canvas, px - outer * scale, py - outer * scale, outer * scale * 2, outer * scale * 2, 0, 0, 256, 256);
      const bands = reduced ? 5 : 10;
      for (let i = bands - 1; i >= 0; i--) {
        const inner = r * (0.96 + i / bands * 1.1), edge = inner + r * 1.1 / bands;
        const magnify = 1 + 0.23 * (1 - i / bands) ** 2;
        ctx.save(); ctx.beginPath();
        ctx.arc(x, y, edge, 0, Math.PI * 2);
        ctx.arc(x, y, inner, 0, Math.PI * 2, true);
        ctx.clip('evenodd'); ctx.globalAlpha = 0.76;
        ctx.translate(x, y); ctx.rotate(0.025 * Math.sin(time * 0.45) * (1 - i / bands));
        ctx.drawImage(sample, -outer * magnify, -outer * magnify, outer * 2 * magnify, outer * 2 * magnify);
        ctx.restore();
      }
    }
    ctx.save(); ctx.translate(x, y);
    const halo = ctx.createRadialGradient(0, 0, r * 0.9, 0, 0, r * 1.8);
    halo.addColorStop(0, m.color + '20'); halo.addColorStop(0.3, m.color + '10'); halo.addColorStop(1, m.color + '00');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, r * 1.8, 0, Math.PI * 2); ctx.fill();
    // Disco elíptico separado del núcleo: las tres formas se reconocen incluso
    // sin color. Filamentos discontinuos, nunca un aro grueso opaco.
    ctx.save(); ctx.rotate(m.tilt); ctx.scale(1, m.flatten);
    const count = reduced ? 8 : 18;
    for (let i = 0; i < count; i++) {
      const angle = i * 2.399963 + time * (0.09 + (i % 3) * 0.018);
      ctx.globalAlpha = 0.12 + (i % 4) * 0.045;
      ctx.strokeStyle = i % 3 === 0 ? m.accent : m.color;
      ctx.lineWidth = i % 4 === 0 ? 1.2 : 0.55;
      ctx.beginPath(); ctx.arc(0, 0, r * (1.3 + (i % 7) * 0.052), angle, angle + 0.65 + (i % 3) * 0.4); ctx.stroke();
    }
    ctx.restore(); ctx.globalAlpha = 1;
    // Concentraciones breves de luz: volumen sin convertir el disco en neón.
    ctx.save(); ctx.rotate(m.tilt); ctx.scale(1, m.flatten);
    for (let i = 0; i < 3; i++) {
      const a = time * 0.13 + i * 2.12;
      const rr = r * (1.42 + i * 0.04);
      const gx = Math.cos(a) * rr, gy = Math.sin(a) * rr;
      const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, r * 0.17);
      glow.addColorStop(0, m.accent + '8a'); glow.addColorStop(0.18, m.color + '42'); glow.addColorStop(1, m.color + '00');
      ctx.fillStyle = glow; ctx.fillRect(gx - r * 0.17, gy - r * 0.17, r * 0.34, r * 0.34);
      ctx.strokeStyle = m.accent; ctx.globalAlpha = 0.55; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(0, 0, rr, a - 0.08, a + 0.08); ctx.stroke(); ctx.globalAlpha = 1;
    }
    ctx.restore();
    // Estrellas estiradas por la lente: trayectorias tangentes, polvo frío y
    // cálido entremezclado. Hash local, sin partículas ni RNG en la simulación.
    const colors = modelIndex === 1 ? ['#ffe2ad', '#ffbc85', '#a8d4ff', '#f8efff']
      : modelIndex === 2 ? ['#c6baff', '#8ad8f5', '#f1cfb4', '#e6e9ff']
        : ['#92d6ff', '#cadfff', '#f2c8a1', '#f8edf1'];
    const sparks = reduced ? 24 : 64;
    const hash = i => { const v = Math.sin(i * 127.1 + modelIndex * 73.3) * 43758.5453; return v - Math.floor(v); };
    ctx.save(); ctx.rotate(m.tilt);
    for (let i = 0; i < sparks; i++) {
      const orbit = r * (1.08 + hash(i + 31) * 0.91);
      const angle = hash(i + 1) * Math.PI * 2 + time * (0.07 + hash(i + 19) * 0.09);
      const flatten = modelIndex === 1 ? 0.48 : modelIndex === 2 && i % 2 ? 0.78 : 0.95;
      const stretch = 0.008 + hash(i + 72) * 0.057;
      ctx.save(); if (modelIndex === 2 && i % 2) ctx.rotate(1.05);
      ctx.scale(1, flatten);
      ctx.strokeStyle = colors[i % 4];
      ctx.globalAlpha = 0.15 + hash(i + 44) * 0.48;
      ctx.lineWidth = 0.45 + hash(i + 56) * 0.65;
      ctx.beginPath(); ctx.arc(0, 0, orbit, angle - stretch, angle + stretch * 0.22); ctx.stroke();
      const px = Math.cos(angle) * orbit, py = Math.sin(angle) * orbit;
      ctx.globalAlpha *= 0.7; ctx.fillStyle = colors[i % 4];
      ctx.beginPath(); ctx.arc(px, py, 0.45 + hash(i + 88) * 0.65, 0, Math.PI * 2); ctx.fill();
      if (i % 17 === 0) {
        ctx.globalAlpha = 0.4; ctx.lineWidth = 0.45;
        ctx.beginPath(); ctx.moveTo(px - 2.2, py); ctx.lineTo(px + 2.2, py);
        ctx.moveTo(px, py - 2.2); ctx.lineTo(px, py + 2.2); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
    const core = ctx.createRadialGradient(-r * 0.08, -r * 0.12, r * 0.35, 0, 0, r * 1.05);
    core.addColorStop(0, '#000000'); core.addColorStop(0.84, '#000000');
    core.addColorStop(0.93, '#02040a'); core.addColorStop(1, '#080c15');
    ctx.fillStyle = core; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = m.color; ctx.lineWidth = 0.65;
    ctx.globalAlpha = 0.24 + Math.sin(time * 0.65) * 0.05;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.014, 0, Math.PI * 2); ctx.stroke();
    // Arco superior de luz curvada por detrás del horizonte.
    ctx.globalAlpha = 0.35; ctx.strokeStyle = m.accent;
    ctx.beginPath(); ctx.ellipse(0, -r * 0.02, r * 1.11, r * 1.08, m.tilt * 0.12, Math.PI * 1.06, Math.PI * 1.92); ctx.stroke();
    if (modelIndex === 2) {
      ctx.globalAlpha = 0.15; ctx.strokeStyle = m.color;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.7, r * 1.08, -m.tilt, 0.2, 2.5); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.7, r * 1.08, -m.tilt, 3.3, 5.65); ctx.stroke();
    }
    ctx.restore();
  };
})();
