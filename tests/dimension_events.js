'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const events=require('../js/engine/dimensionEvents.js');
const rules=require('../js/experiments/dimensionRules.js');
const still={moveX:0,moveY:0},moving={moveX:1,moveY:0};
assert.equal(events.catalog().length,7);
assert.equal(events.catalog({preview:true}).length,8);
assert.deepEqual(events.legacyKeys(),['elites','payday','fog','mines']);
assert.equal(events.routeAllowed('museum-time',false),false);
assert.equal(events.routeAllowed('museum-time',true),true);
assert.equal(events.routeAllowed('sector-foundry',true),false);
assert.equal(events.routeAllowed('__proto__',true),false);
for(const random of [()=>0,()=>1,()=>-1,()=>NaN]) {
  assert.notEqual(events.pickLegacy('fog',random),'fog');
  assert.notEqual(events.pickLegacy(null,random),'museum-time');
}
for(const mode of ['expedition','endless']) {
  const stable=events.createSession({wave:3,mode,legacyEvent:'mines'},rules);
  assert.deepEqual(stable.snapshot().plan,['mines','mines','mines','mines']);
  for(let depth=0;depth<4;depth++) {
    stable.enter(depth);assert.equal(stable.isTemporal(),false);
    assert.equal(stable.sample(.02,still,{}).combatDt,.02);
  }
  const preview=events.createSession({wave:1,mode,preview:true},rules);
  assert.deepEqual(preview.snapshot().plan,[null,'museum-time',null,null]);
  preview.enter(1);
  for(let i=0;i<120;i++)preview.sample(1/60,still,{});
  assert(preview.snapshot().scale<.081);
  const before=preview.snapshot();preview.sample(0,moving,{});assert.deepEqual(preview.snapshot(),before);
  assert.equal(preview.sample(.02,still,{dashActive:true}).scale,1);
  assert.equal(preview.sample(.02,still,{hardCC:true}).scale,1);
  assert.equal(preview.sample(.02,still,{externalForcedMove:true}).scale,1);
  assert.equal(preview.healTicks(4.9),0);assert.equal(preview.healTicks(.1),1);
  preview.reset();assert.equal(preview.snapshot().scale,1);assert.equal(preview.snapshot().simulated,0);
  preview.enter(2);assert.equal(preview.isTemporal(),false);assert.equal(preview.sample(.02,still,{}).combatDt,.02);
  assert.throws(()=>preview.enter(4));
  const detached=preview.snapshot();detached.plan[2]='museum-time';assert.equal(preview.snapshot().plan[2],null);
  const boss=events.createSession({wave:3,mode,bossWave:true,preview:true,legacyEvent:'museum-time'},rules);
  assert(boss.snapshot().plan.every(id=>id!=='museum-time'));
  const bossLegacy=events.createSession({wave:3,mode,bossWave:true,preview:true,legacyEvent:'mines'},rules);
  assert(bossLegacy.snapshot().plan.every(id=>id===null));
  const forged=events.createSession({wave:3,mode,preview:false,legacyEvent:'museum-time'},rules);
  assert(forged.snapshot().plan.every(id=>id!=='museum-time'));
}
const g=fs.readFileSync('js/game.js','utf8');
assert(g.includes('isolatedMode || dimensionEventPreview ||'));
assert(g.includes('fieldEventSession.enter(dimensionRun.depth)'));
assert(g.includes('if (combatClock) dt=clocks.combatDt;'));
assert(g.includes('updateBombImpacts(combatClock ? clocks.combatDt : dt)'));
assert(g.includes('playerPrevious: experimentPreviousPlayer'));
assert(g.includes('combatClock ? clocks.combatDt : undefined'));
assert(g.includes('specialVFX.life -= combatClock ? clocks.combatDt : dt'));
assert(!g.slice(g.indexOf('  function updatePresentation(dt)'),g.indexOf('  function update(dt)')).includes('combatClock'));
assert(g.includes('NV.DimensionEvents.routeAllowed(event,dimensionContentEnabled)'));
assert(g.includes("dimensionEventPreview && /(?:^|[?&])eventWeapon=plasma(?:&|$)/.test(queryString)"));
assert(g.includes("inventory = [previewWeapon]; currentWeapon = previewWeapon; weaponLevels.plasma = 1"));
const ui=fs.readFileSync('js/ui/alpha.js','utf8');
assert(ui.includes('dimensionEventPreviewBtn'));assert(ui.includes('PRUEBA SIN GUARDAR'));
assert(ui.includes('routeAllowed(id,true)'));
assert(ui.includes("url.searchParams.set('eventPilot',NV.alpha.snapshot().character)"));
const sandbox={window:{NV:{}},console,Math};
vm.runInNewContext(fs.readFileSync('js/data/gameData.js','utf8'),sandbox);
vm.runInNewContext(fs.readFileSync('js/data/balance.js','utf8'),sandbox);
const NV=sandbox.window.NV;
for(const wave of [1,3,9,50]) {
  assert.equal(NV.waveDuration(wave,'museum-time'),NV.baseWaveDuration(wave));
  assert.equal(NV.waveSpawnFactor(wave,'museum-time'),1);
  assert.equal(NV.spawnRefillInterval(wave,'museum-time',false,'normal'),NV.spawnRefillInterval(wave,null,false,'normal'));
  assert(NV.waveDuration(wave,'mines')>=NV.baseWaveDuration(wave));
}
console.log('PASS dimension_events: shared catalog, stable/preview isolation, four fields, clocks, reset, compatibility and route guards');
