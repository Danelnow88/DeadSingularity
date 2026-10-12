(() => {
  'use strict';
  const NV = window.NV;
  let visualSequence = 0;
  NV.createDimensionRun = function (wave, bossWave, objective, duration, options) {
    const seed = ((Date.now() >>> 0) + ++visualSequence * 7919 + wave * 104729) >>> 0;
    const count=options&&options.preview&&NV.DIMENSION_VISUALS?NV.DIMENSION_VISUALS.length:4;
    const first = count>4 ? seed%count : Math.min(3, Math.floor((wave - 1) / 5));
    const remaining = Array.from({length:count},(_,i)=>i).filter(index => index !== first);
    if (seed & 1) remaining.reverse();
    const offset = seed % remaining.length;
    const environments = [first, ...remaining.slice(offset), ...remaining.slice(0, offset)].slice(0,4);
    return { wave, bossWave: !!bossWave, depth: 0, phase: 'combat', age: 0,
      transit: 0, duration, seed, environments,
      environmentNames: environments.map(i=>(count>4?NV.DIMENSION_VISUALS:NV.SECTOR_VISUALS)?.[i]?.name||'UNIVERSO '+(i+1)),
      objective: Object.assign({}, objective), portal: null };
  };
  NV.dimensionObjective = function (run) {
    const goal = Object.assign({}, run.objective);
    return goal;
  };
  NV.openDimensionPortal = function (run, W, H) {
    if (!run || run.phase !== 'combat' || run.depth >= 3) return false;
    const corners = [[W - 110, H - 110], [110, 110], [W - 110, 110]];
    const corner = corners[run.depth];
    run.portal = { x: Math.max(70, corner[0]), y: Math.max(70, corner[1]), radius: 32, model: run.depth };
    run.phase = 'opening'; run.age = 0;
    return true;
  };
  NV.stepDimensionPortal = function (run, player, dt) {
    if (!run || run.phase === 'combat') return false;
    run.age += dt;
    if (run.phase === 'opening' && run.age >= 1.2) run.phase = 'portal';
    if (run.phase === 'portal' && run.age >= 0.6 && Math.hypot(player.x - run.portal.x, player.y - run.portal.y) < 42) {
      run.phase = 'transit'; run.transit = 0;
    }
    if (run.phase === 'transit') {
      const pull = Math.min(1, dt * 7);
      player.x += (run.portal.x - player.x) * pull;
      player.y += (run.portal.y - player.y) * pull;
      run.transit = Math.min(1.15, run.transit + dt);
      if (run.transit >= 1.15) { run.depth++; run.phase = 'combat'; run.portal = null; return true; }
    }
    return false;
  };
})();
