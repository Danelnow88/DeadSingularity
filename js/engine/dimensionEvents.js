// Shared dimension-event policy. Rendering, hazards and rewards stay in their
// existing adapters; this module owns selection, compatibility and clock scope.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.NV = root.NV || {}).DimensionEvents = factory(root.NV.DimensionRules,root.NV.InertiaChamber);
})(typeof window === 'undefined' ? globalThis : window, function (rules,inertiaModule) {
  'use strict';
  const definitions = Object.freeze([
    {id:'elites',name:'RONDA DE ÉLITES',kind:'roster',stage:'stable',scope:'wave',adapter:'elite-spawns',rule:'standard'},
    {id:'payday',name:'DÍA DE PAGO',kind:'economy',stage:'stable',scope:'wave',adapter:'shard-drops',rule:'standard'},
    {id:'fog',name:'NEBLINA',kind:'visibility',stage:'stable',scope:'wave',adapter:'fog-overlay',rule:'standard'},
    {id:'mines',name:'MINAS PARLANTES',kind:'hazard',stage:'stable',scope:'wave',adapter:'speaker-mines',rule:'standard'},
    {id:'museum-time',name:'CÁMARA DE INERCIA',kind:'ruleset',stage:'preview',scope:'field',adapter:'combat-clock',rule:'museum-time',
      cue:'DESTRUÍ EL NÚCLEO · INERCIA',color:'#a8dfff'},
    {id:'sector-foundry',name:'FUNDICIÓN',kind:'hazard',stage:'stable',scope:'sector',adapter:'sector-vent',rule:'standard'},
    {id:'sector-fracture',name:'FRACTURA',kind:'hazard',stage:'stable',scope:'sector',adapter:'sector-rift',rule:'standard'},
    {id:'sector-void-heart',name:'CORAZÓN DEL VACÍO',kind:'hazard',stage:'stable',scope:'sector',adapter:'sector-pulse',rule:'standard'},
  ].map(entry => Object.freeze(Object.assign({bossAllowed:false,exclusive:true},entry))));
  const byId = Object.freeze(Object.assign(Object.create(null),Object.fromEntries(definitions.map(entry => [entry.id,entry]))));
  function catalog(options) {
    const preview=!!(options&&options.preview);
    return definitions.filter(entry=>entry.stage==='stable'||preview);
  }
  function routeAllowed(id, preview) {
    const entry=byId[id];
    return !!(entry&&entry.scope!=='sector'&&(entry.stage==='stable'||preview===true));
  }
  function legacyKeys() { return definitions.filter(entry=>entry.scope==='wave'&&entry.stage==='stable').map(entry=>entry.id); }
  function pickLegacy(previous, random) {
    const pool=legacyKeys().filter(id=>id!==previous);
    const value=(random||Math.random)();
    const index=Number.isFinite(value)?Math.max(0,Math.min(pool.length-1,Math.floor(value*pool.length))):0;
    return pool[index]||null;
  }
  function createSession(config, clockFactory, objectiveFactory) {
    const opts=config||{}, preview=opts.preview===true;
    const wave=Number.isInteger(opts.wave)&&opts.wave>0?opts.wave:1;
    // Never promote a preview event through a forged route or old checkpoint.
    const requested=!opts.bossWave&&routeAllowed(opts.legacyEvent,preview)?opts.legacyEvent:null;
    const base=requested==='museum-time'?null:requested;
    const scheduled=Object.prototype.hasOwnProperty.call(opts,'coreEncounter');
    const encounter=preview&&!opts.bossWave?opts.coreEncounter:null;
    const temporal=preview&&!opts.bossWave&&(scheduled?!!encounter:(requested==='museum-time'||wave===1||wave%3===0));
    const eventDepth=scheduled&&encounter?encounter.depth:1;
    const plan=[base,base,base,base];if(temporal)plan[eventDepth]='museum-time';
    const factory=clockFactory||rules;
    const chamber=objectiveFactory||inertiaModule;
    const coreOptions={wave,hpMultiplier:opts.coreHpMultiplier};
    if(scheduled&&encounter)Object.assign(coreOptions,{required:1,pattern:encounter.pattern,guardCount:encounter.guardCount});
    let depth=0, clock=null, elapsed=0, simulated=0, scale=1, regen=0,objective=null,shotPolicy=null;
    function enter(next) {
      if(!Number.isInteger(next)||next<0||next>3)throw new Error('Invalid dimension depth');
      depth=next; elapsed=0; simulated=0; scale=1; regen=0;
      clock=plan[depth]==='museum-time' ? factory&&factory.create('museum-time') : null;
      objective=clock&&chamber?chamber.create(coreOptions):null;shotPolicy=null;
      if(objective&&chamber.clock)clock=chamber.clock();
      if(plan[depth]==='museum-time'&&!clock)throw new Error('Missing temporal rule adapter');
      return plan[depth];
    }
    enter(0);
    return Object.freeze({
      enter,
      isTemporal() { return plan[depth]==='museum-time'; },
      hasInertiaObjective() { return !!objective; },
      objectiveReady() { return !!objective&&objective.complete(); },
      updateObjective(dt,real,context) { return objective ? objective.update(dt,real,context) : false; },
      objectiveView() { return objective ? objective.view() : null; },
      combatTarget() { return objective ? objective.combatTarget() : null; },
      projectilePolicy() { return shotPolicy ? Object.assign({},shotPolicy) : null; },
      sample(dt,intent,safety) {
        const step=Number.isFinite(dt)?Math.max(0,dt):0;
        const result=clock?clock.sample(step,intent||{moveX:0,moveY:0},safety||{}):{controlDt:step,combatDt:step,scale:1};
        if(objective&&step>0) {
          shotPolicy={controlDt:step,held:result.held===true,charge:result.charge||0};
        }
        elapsed+=result.controlDt; simulated+=result.combatDt; scale=result.scale;
        return result;
      },
      healTicks(dt) { regen+=Math.max(0,dt||0);const ticks=Math.floor(regen/5);regen-=ticks*5;return ticks; },
      reset() { if(clock)clock.reset(); elapsed=0;simulated=0;scale=1;regen=0;objective=clock&&chamber?chamber.create(coreOptions):null;shotPolicy=null; },
      snapshot() { return {category:'dimension-events',preview,mode:opts.mode==='endless'?'endless':'expedition',wave,depth,
        id:plan[depth],ruleId:clock?'museum-time':'standard',scale,elapsed,simulated,plan:plan.slice(),
        exclusive:!!plan[depth],stage:clock?'preview':'stable',objective:objective?objective.view():null,
        suspension:shotPolicy?Object.assign({},shotPolicy):null}; },
    });
  }
  function normalizeCoreSchedule(raw) {
    if(!raw||!['nextWave','count','lastPattern','lastWave'].every(k=>Number.isInteger(raw[k])))return null;
    if(raw.lastWave<0||raw.lastWave>1e6||raw.nextWave<3||raw.nextWave>1e6||raw.count<0||raw.count>1e6||raw.lastPattern< -1||raw.lastPattern>2)return null;
    return {nextWave:raw.nextWave,count:raw.count,lastPattern:raw.lastPattern,lastWave:raw.lastWave};
  }
  function createCoreSchedule(random, saved) {
    const rng=random||Math.random;
    const roll=n=>Math.min(n-1,Math.max(0,Math.floor((Number(rng())||0)*n)));
    let nextWave=3+roll(3),count=0,lastPattern=-1,lastWave=0,cached=null;
    const restored=normalizeCoreSchedule(saved);
    if(restored)({nextWave,count,lastPattern,lastWave}=restored);
    return Object.freeze({
      pick(config) {
        const opts=config||{},wave=opts.wave;
        if(wave===lastWave)return cached?Object.assign({},cached):null;
        if(!Number.isInteger(wave)||wave<lastWave)return null;
        lastWave=wave;cached=null;
        if(opts.bossWave||wave<nextWave||(opts.mode!=='endless'&&count>=3))return null;
        const pool=[0,1,2].filter(p=>p!==lastPattern);
        lastPattern=pool[roll(pool.length)];count++;nextWave=wave+3+roll(3);
        cached={depth:roll(4),pattern:lastPattern,guardCount:Math.min(6,3+Math.floor(wave/6))};
        return Object.assign({},cached);
      },
      snapshot(){return {nextWave,count,lastPattern,lastWave};}
    });
  }
  return Object.freeze({catalog,routeAllowed,legacyKeys,pickLegacy,createSession,createCoreSchedule,normalizeCoreSchedule});
});
