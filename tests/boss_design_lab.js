const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = { window: { NV: {} } };
vm.createContext(context);
for (const file of ['js/data/bossDesignLab.js','js/render/bossDesignLab.js']) vm.runInContext(fs.readFileSync(file,'utf8'), context);
const NV = context.window.NV;
let saves=0, operations=0;
const gradient={addColorStop(){}};
const ctx = new Proxy({}, { get(target,key){
 if(key==='save') return ()=>{saves++;};
 if(key==='restore') return ()=>{saves--;assert(saves>=0);};
 if(key==='createRadialGradient'||key==='createLinearGradient') return ()=>gradient;
 return ()=>{operations++;};
}, set(target,key,value){target[key]=value;return true;} });
assert.equal(NV.BOSS_DESIGNS.length,10);
for(let i=0;i<10;i++) {
 const boss={isBoss:true,hp:100,maxHp:100,radius:43,x:700,y:500,shape:'legacy',attack:'legacy',color:'#abc'};
 const physics=JSON.stringify(boss);
 NV.attachBossDesign(boss,i);
 assert.equal(JSON.stringify(Object.fromEntries(Object.entries(boss).filter(([key])=>!['visual','designPass','bossIndex'].includes(key)))),physics);
 for(const scale of [1,1.15,1.3]) {
  const before=JSON.stringify(boss), count=operations;
  assert(NV.drawBossDesign(ctx,boss,120,{scale,showHitbox:true}));
  assert(operations>count);
  assert.equal(JSON.stringify(boss),before,'render mutó el jefe');
  assert.equal(saves,0,'Canvas no restaurado');
 }
 const costs=[];
 for(const tier of ['full','reduced','minimal']) {
  NV.getVisualBudget=()=>({tier});const start=operations;
  NV.drawBossDesign(ctx,boss,120);costs.push(operations-start);
 }
 assert(costs[2]<costs[0] && costs[1]<costs[0], 'el presupuesto no reduce decoración');
 delete NV.getVisualBudget;
 boss.hp=0;assert.equal(NV.drawBossDesign(ctx,boss,120),false);
 boss.hp=100;boss.isBoss=false;assert.equal(NV.drawBossDesign(ctx,boss,120),false);
}
console.log('PASS boss_design_lab: 10 diseños, 3 escalas, pureza, física y restauración Canvas');
