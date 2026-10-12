'use strict';
const assert=require('node:assert/strict');
const events=require('../js/engine/dimensionEvents.js'),rules=require('../js/experiments/dimensionRules.js'),chamber=require('../js/engine/inertiaChamber.js');
for(const mode of ['expedition','endless'])for(const value of [0,.35,.99]){
  const schedule=events.createCoreSchedule(()=>value),seen=[];
  for(let wave=1;wave<=100;wave++){
    const bossWave=mode==='expedition'?wave%2===0:wave%5===0;
    const encounter=schedule.pick({wave,mode,bossWave});
    assert.deepEqual(schedule.pick({wave,mode,bossWave}),encounter,'idempotent wave');
    const session=events.createSession({wave,mode,bossWave,preview:true,coreEncounter:encounter},rules,chamber);
    assert.equal(session.snapshot().plan.filter(x=>x==='museum-time').length,encounter?1:0);
    if(!encounter)continue;
    assert(wave>=3&&!bossWave);assert(encounter.depth>=0&&encounter.depth<4);
    const previous=seen.at(-1);if(previous){assert(wave-previous.wave>=3);assert.notEqual(encounter.pattern,previous.pattern);}
    seen.push({wave,...encounter});session.enter(encounter.depth);
    const ctx={W:1200,H:800,player:{x:600,y:400},bullets:[],enemies:[]};
    session.updateObjective(.02,.02,ctx);assert.equal(session.objectiveView().required,1);
    assert.equal(session.combatTarget().pattern,encounter.pattern);
    session.combatTarget().hp=0;session.updateObjective(.02,.02,ctx);
    assert(session.objectiveReady());session.updateObjective(20,20,ctx);assert.equal(session.combatTarget(),null);
    const stable=events.createSession({wave,preview:false,coreEncounter:encounter,legacyEvent:'museum-time'},rules,chamber);
    assert(stable.snapshot().plan.every(id=>id===null));
  }
  assert.equal(mode==='expedition'?seen.length===3:seen.length>3,true);
}
const fresh=events.createCoreSchedule(()=>0);assert.equal(fresh.snapshot().count,0);
console.log('PASS core schedule: wave 3+, one per field, rest, boss exclusion, nonrepeat, story cap, endless, completion and stable isolation');
