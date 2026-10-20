// State-derived emissive cadence only. No simulation timers or entity mutations.
(() => {
  'use strict';
  const NV = window.NV;
  const reducedMotion = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const clamp = v => Math.max(0, Math.min(1, v));
  const progress = (remaining, duration) => clamp(1 - Math.max(0, Number(remaining) || 0) / duration);
  function rise(p, start, end) {
    const x = clamp((p - start) / (end - start));
    return x * x * (3 - 2 * x);
  }
  function beat(p, center, halfWidth) {
    const x = Math.abs(p - center) / halfWidth;
    return x >= 1 ? 0 : .5 + .5 * Math.cos(x * Math.PI);
  }
  NV.singularityCoreIntensity = function (e, time, hook) {
    if (!e || e.dead || e.isElite || e.isBoss || NV.__singularityCoreLighting === false) return 0;
    const calm = !!reducedMotion?.matches;
    const id = e.enemyTypeId, state = e.intent?.state || e.spitState || e.flankState;
    const timer = e.intent ? e.intent.stateTimer : (e.spitTimer ?? e.stateTimer);
    let p;
    switch (id) {
      case 'runner':
        if (state === 'windup') {
          p = progress(timer, .26);
          return calm ? .18 + .65 * p : .12 + .76 * Math.max(.65 * beat(p, .18, .18), beat(p, .80, .24), rise(p, .82, .94));
        }
        if (state === 'attack' || state === 'COMMIT') return .65;
        return 0;
      case 'tank':
        if (e.tankCannonState === 'windup') {
          const total = NV.ENEMY_ROLE_REWORK?.tank?.windup || .9;
          const elapsed = total - Math.max(0, Number(e.tankCannonTimer) || 0);
          if (elapsed < .58) return 0; // No charge signal until the sleeves are fully deployed.
          p = clamp((elapsed - .58) / Math.max(.001, total - .58));
          return calm ? .12 + .78 * p : .12 + Math.max(.42 * beat(p, .24, .23), .78 * rise(p, .36, .98));
        }
        if (e.tankCannonState === 'recovery') return .9 * clamp(((e.tankCannonTimer || 0) - .89) / .16);
        return 0;
      case 'swarmlet':
        if (e.swarmState === 'form' && (e.swarmReady || e.swarmStateTimer <= .22)) {
          p = progress(e.swarmStateTimer, .22);
          return .32 + .50 * rise(p, 0, 1);
        }
        if (e.swarmState === 'commit') return .74;
        return 0;
      case 'spitter':
        if (state === 'windup') {
          p = progress(timer, .6);
          return calm ? .18 + .65 * p : .10 + .76 * Math.max(.65 * beat(p, .15, .13), .82 * beat(p, .46, .13), beat(p, .78, .16), .75 * rise(p, .90, 1));
        }
        if (state === 'attack') return .85;
        if (state === 'recovery') return .8 * clamp(((timer || 0) - .86) / .14);
        return 0;
      case 'wisp':
        if (e.wispPhaseState === 'phase_out') {
          p = progress(e.wispPhaseTimer, NV.WISP_PHASE_ATTACK?.phaseOutTime || .30);
          return .16 + .68 * rise(p, 0, 1);
        }
        if (e.wispPhaseState === 'mark') return 0;
        if (e.wispPhaseState === 'pulse') return .90;
        if (e.wispPhaseState === 'recovery') return .64 * clamp(((e.wispPhaseTimer || 0) - .30) / .25);
        return 0;
      case 'kamikaze':
        if (!e.armed) return 0;
        p = progress(e.fuse, .8);
        return calm ? .25 + .70 * p : .20 + .75 * Math.max(.48 * beat(p, .14, .17), .68 * beat(p, .43, .15), beat(p, .68, .12), rise(p, .78, .89));
      case 'specter_archer':
        hook = hook || NV.getCosmicSpecterHook?.();
        if (hook?.srcEnemy === e) {
          if (hook.phase === 'windup') return .16 + .72 * rise(progress(hook.windupTimer, NV.BALANCE?.HOOK_WINDUP_TIME || .55), 0, 1);
          if (hook.phase === 'projectile') return .70;
          if (hook.phase === 'tether') return .38;
        }
        if (e.hookWindup || e.hookOwner) return .18;
        return 0;
      case 'specter_guard':
        if (!(e.guardProtectionActive && e.guardTarget && !e.guardTarget.dead)) return 0;
        if (calm) return .52;
        p = ((Number.isFinite(time) ? time : 0) % 2.4 + 2.4) % 2.4 / 2.4;
        return .28 + .36 * Math.max(beat(p, .14, .12), .70 * beat(p, .43, .14));
      case 'specter_core':
        if (e.coreZoneState === 'windup') {
          p = progress(e.coreZoneTimer, NV.SPECTER_CORE_ZONE?.windup || .55);
          return .12 + .78 * rise(p, 0, .96);
        }
        if (e.coreZoneState === 'recovery') {
          const total = NV.SPECTER_CORE_ZONE?.cooldown || 2.5;
          return .78 * clamp(((e.coreZoneTimer || 0) - (total - .22)) / .22);
        }
        return 0;
      default: return 0;
    }
  };
})();
