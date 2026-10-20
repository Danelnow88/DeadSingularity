(() => {
  const canvas = document.getElementById('preview'), ctx = canvas.getContext('2d');
  function render(time) {
    ctx.fillStyle = '#01030d'; ctx.fillRect(0, 0, 1200, 650);
    for (let i = 0; i < 1800; i++) {
      const hash = v => { const n = Math.sin(v * 127.1) * 43758.5453; return n - Math.floor(n); };
      const x = hash(i + 1) * 1200, y = hash(i + 718) * 650;
      ctx.globalAlpha = 0.12 + (i % 7) * 0.07;
      ctx.fillStyle = i % 5 ? '#b8c9e1' : '#91b6de';
      ctx.fillRect(x, y, i % 9 ? 0.8 : 1.5, i % 9 ? 0.8 : 1.5);
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 3; i++) {
      const x = 200 + i * 400;
      NV.drawBlackHole(ctx, x, 140, 32, time / 1000, i);
      NV.drawBlackHole(ctx, x, 410, 88, time / 1000, i);
      ctx.fillStyle = '#b8c9dc'; ctx.textAlign = 'center'; ctx.font = '13px system-ui';
      ctx.fillText('CRUCE ' + (i + 1) + ' · ' + NV.BLACK_HOLE_MODELS[i].name, x, 45);
      ctx.fillStyle = '#76869e'; ctx.fillText('UNIVERSO ' + (i + 2), x, 615);
    }
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
})();
