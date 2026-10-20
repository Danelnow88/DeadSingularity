// Laboratory only: retain original actor drawing, restrict its raster bounds.
(() => {
  const NV = window.NV;
  NV.__drawActorClipped = (draw, ctx, e, ...args) => {
    if (!['drone', 'runner'].includes(e.enemyTypeId)) return draw(ctx, e, ...args);
    // Generous allowance for body scale, lunge, hit rings and shadow kernels.
    const extent = 128 + Math.max(0, e.radius || 0) * 4;
    const clip = new Path2D();
    clip.rect(e.x - extent, e.y - extent, extent * 2, extent * 2);
    ctx.save(); ctx.clip(clip);
    try { return draw(ctx, e, ...args); } finally { ctx.restore(); }
  };
})();
