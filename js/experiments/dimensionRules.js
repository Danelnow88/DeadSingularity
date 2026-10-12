// Isolated rules: no Canvas, DOM, persistence or global clocks.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.NV = root.NV || {}).DimensionRules = factory();
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  function museumClock() {
    let scale = 1;
    return {
      sample(dt, intent, safety) {
        if (!(dt > 0)) return { controlDt: 0, combatDt: 0, scale };
        const forced = safety.dashActive || safety.dashWillStart || safety.hardCC || safety.externalForcedMove;
        const moving = Math.hypot(intent.moveX, intent.moveY) > .12;
        const target = forced || moving ? 1 : .08;
        scale = forced ? 1 : scale + (target - scale) * (1 - Math.exp(-dt / .12));
        return { controlDt: dt, combatDt: dt * scale, scale };
      },
      reset() { scale = 1; }
    };
  }
  function create(id) {
    if (id === 'museum-time') return museumClock();
    if (id !== 'standard') throw new Error('Unsupported dimension rule: ' + id);
    return { sample: dt => ({controlDt:dt, combatDt:dt, scale:1}), reset() {} };
  }
  function session(preset) {
    if (!['museum-time','traversal','pursuit'].includes(preset)) throw new Error('Unknown experiment');
    let rule = create(preset === 'museum-time' ? preset : 'standard');
    return {
      preset, status:'RUNNING', depth:0, objective:false, admitted:0, simulated:0, scale:1, regen:0,
      ruleId: preset === 'museum-time' ? preset : 'standard',
      sample(dt, intent, safety) {
        const c = rule.sample(dt,intent,safety);
        this.admitted += c.controlDt; this.simulated += c.combatDt; this.scale = c.scale;
        return c;
      },
      enter(depth) {
        this.depth=depth; this.objective=false; this.regen=0;
        this.ruleId=depth===1 ? 'museum-time' : 'standard';
        rule=create(this.ruleId); this.scale=1;
      },
      resetClock() { rule.reset(); this.scale=1; },
      healTicks(dt) {
        this.regen+=dt; const ticks=Math.floor(this.regen/5);
        this.regen-=ticks*5; return ticks;
      }
    };
  }
  function plasmaTrialProfile(preview) {
    if (preview !== true) return null;
    return Object.freeze({
      damageMultiplier: 0.90,
      bossDamageMultiplier: 0.60,
      splashCenterMultiplier: 0.55,
      splashEdgeMultiplier: 0.25,
      levelGrowthMultiplier: 0.60,
      fusionGrowthMultiplier: 0.55,
      fusionRadius: Object.freeze([58, 58, 66, 72]),
      blast: Object.freeze({ radius:58, color:'#c084fc', innerColor:'#8be9ff', width:2.5 }),
    });
  }
  return Object.freeze({create,session,plasmaTrialProfile});
});
