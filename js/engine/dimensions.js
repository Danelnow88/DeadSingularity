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
      objective: Object.assign({}, objective), portal: null,
      routeChoices: !!(options && options.routes), stablePortal: null,
      activeRoute: 'stable', chosenRoute: null, hoverRoute: null, activation: 0, rewardedDepth: -1 };
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
    if (run.routeChoices) {
      const allCorners = [[W - 110,H - 110],[110,110],[W - 110,110],[110,H - 110]];
      const holeIndex = ((run.seed >>> 0) + run.depth) % 4;
      const stableIndex = (holeIndex + 1 + (((run.seed >>> 3) + run.depth) % 3)) % 4;
      const hole = allCorners[holeIndex], stable = allCorners[stableIndex];
      run.portal.x = hole[0]; run.portal.y = hole[1];
      run.stablePortal = {x: stable[0], y: stable[1], radius: 32};
      run.chosenRoute = null; run.hoverRoute = null; run.activation = 0;
    }
    run.phase = 'opening'; run.age = 0;
    return true;
  };
  NV.stepDimensionPortal = function (run, player, dt) {
    if (!run || run.phase === 'combat' || !player || player.hp <= 0 || !(dt > 0) || !Number.isFinite(dt)) return false;
    run.age += dt;
    if (run.phase === 'opening' && run.age >= 1.2) run.phase = 'portal';
    if (run.phase === 'portal' && run.age >= 0.6) {
      if (run.routeChoices) {
        const over = Math.hypot(player.x - run.stablePortal.x, player.y - run.stablePortal.y) < 42 ? 'stable'
          : Math.hypot(player.x - run.portal.x, player.y - run.portal.y) < 42 ? 'chaos' : null;
        if (over) {
          run.chosenRoute = over; run.phase = 'transit'; run.transit = 0;
        }
      } else if (Math.hypot(player.x - run.portal.x, player.y - run.portal.y) < 42) {
        run.phase = 'transit'; run.transit = 0;
      }
    }
    if (run.phase === 'transit') {
      const target = run.chosenRoute === 'stable' ? run.stablePortal : run.portal;
      const pull = Math.min(1, dt * 7);
      player.x += (target.x - player.x) * pull;
      player.y += (target.y - player.y) * pull;
      run.transit = Math.min(1.15, run.transit + dt);
      if (run.transit >= 1.15) {
        run.depth++; run.phase = 'combat'; run.portal = null; run.stablePortal = null;
        run.activeRoute = run.chosenRoute || 'stable'; run.hoverRoute = null; run.activation = 0;
        return true;
      }
    }
    return false;
  };
  NV.DIMENSION_ROUTES = Object.freeze({
    stable: Object.freeze({hp: 1, damage: 1, speed: 1, reward: 0}),
    chaos: Object.freeze({hp: 1.8, damage: 1.5, speed: 1.18, reward: 12})
  });
  NV.dimensionRouteBonus = function (run) {
    return run && run.routeChoices && run.activeRoute === 'chaos' ? 12 + run.wave * 2 + run.depth * 4 : 0;
  };
  NV.claimDimensionRouteReward = function (run) {
    if (!run || !run.routeChoices || run.rewardedDepth === run.depth) return 0;
    run.rewardedDepth = run.depth;
    return NV.dimensionRouteBonus(run);
  };
  NV.applyDimensionRoute = function (entity, run) {
    if (!entity || !run || !run.routeChoices || run.activeRoute !== 'chaos' || entity.dimensionRouteApplied) return entity;
    const profile = NV.DIMENSION_ROUTES.chaos;
    for (const key of ['hp', 'maxHp']) if (Number.isFinite(entity[key])) entity[key] = Math.round(entity[key] * profile.hp);
    if (Number.isFinite(entity.speed)) entity.speed *= profile.speed;
    entity.dimensionRouteApplied = true;
    return entity;
  };
  NV.dimensionRouteDamage = function (base, run) {
    return run && run.routeChoices && run.phase === 'combat' && run.activeRoute === 'chaos'
      ? base * NV.DIMENSION_ROUTES.chaos.damage : base;
  };
  NV.dimensionRouteHostileLimit = function (run, base, hardCap) {
    return run && run.routeChoices && run.activeRoute === 'chaos'
      ? Math.min(hardCap, Math.ceil(base * 1.5)) : base;
  };
  NV.dimensionRouteDeployment = function (run, batch, target, refill, limit) {
    const chaos = !!(run && run.routeChoices && run.activeRoute === 'chaos');
    return {batch: chaos ? Math.min(5, batch + 1) : batch,
      target: chaos ? Math.min(limit, Math.ceil(target * 1.4)) : target,
      refill: chaos ? Math.max(.35, refill * .65) : refill};
  };
})();
