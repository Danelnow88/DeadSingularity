const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let now=0;
const NV={},box={window:{NV},Math,console,Date:{now:()=>now}};
for(const file of ['data/balance','data/gameData','data/consumables','engine/weapons','engine/performanceMonitor'])
  vm.runInNewContext(fs.readFileSync('js/'+file+'.js','utf8'),box);
const monitor=NV.performanceMonitor;monitor.record(8,1,2);const first=monitor.getSnapshot();
monitor.record(20,2,3);assert.equal(monitor.getSnapshot(),first,'record invalidates 250ms cache');
now=251;assert.equal(monitor.getSnapshot().frames,2);monitor.reset();assert.equal(monitor.getSnapshot().frames,0);
assert.equal(NV.weaponDropChanceForInterval(0),0);assert.equal(NV.weaponDropChanceForInterval(NaN),0);
const minute=1-Math.pow(1-NV.weaponDropChanceForInterval(1),60);
for(const interval of [.25,.6,1.3,2])assert(Math.abs(1-Math.pow(1-NV.weaponDropChanceForInterval(interval),60/interval)-minute)<1e-12);
assert(minute<.12&&minute>.10);assert.equal(NV.CONSUMABLES.bounty.price,2);assert.equal(NV.ECONOMY.bountyTokenCap,3);
for(const weapon of NV.WEAPONS){
  const base=JSON.stringify(weapon),f2=NV.evolvedWeaponImpact(weapon,2),f3=NV.evolvedWeaponImpact(weapon,3);
  assert(NV.weaponFusionTrait(weapon.id,3));assert.notEqual(NV.weaponFusionTrait(weapon.id,2),NV.weaponFusionTrait(weapon.id,3));
  assert.equal(JSON.stringify(weapon),base);assert.deepEqual(NV.evolvedWeaponImpact(weapon,300),f3,'fusion beyond cap scales trait');
  if(['pistol','rifle','sniper','laser'].includes(weapon.id))assert.equal(f3.pierce,f2.pierce+1);
  const bullets=[];NV.shoot({player:{x:100,y:100,luck:0},enemies:[],bullets,boss:null,currentWeapon:weapon,
    aimVector:{x:1,y:0},currentWeaponFusion:3,currentWeaponLevel:()=>1,weaponVisualTier:()=>0,
    BULLET_TIER_COLORS:['#fff'],MAX_BULLETS:50,permDamageBonus:0,playWeaponSound(){},onFlame:f=>assert.equal(f.range,225)});
  if(weapon.id==='shotgun')assert(bullets.every(b=>b.shotGroup.cap===7));
  if(weapon.id==='bow')assert.equal(bullets[0].splashRadius,270);
}
let rasterizations=0,draws=0;
const ctx=new Proxy({}, {get:(_,key)=>key==='drawImage'?()=>draws++:()=>{},set:()=>true});
box.document={createElement:()=>{rasterizations++;return {getContext:()=>ctx};}};
vm.runInNewContext(fs.readFileSync('js/render/dimensionalThreats.js','utf8'),box);
const enemy={enemyTypeId:'rift_weaver',x:0,y:0,dimensionalThreat:{kind:'cut',phase:'windup',weaveProgress:.2,age:0,geometry:{ax:0,ay:0,bx:220,by:0,halfWidth:30}}};
NV.drawDimensionalThreatFields(ctx,[enemy]);enemy.dimensionalThreat.weaveProgress=.8;NV.drawDimensionalThreatFields(ctx,[enemy]);
assert.equal(rasterizations,1,'progress invalidates static knit cache');assert.equal(draws,2);
for(let i=0;i<5;i++){enemy.dimensionalThreat.geometry.bx=230+i;NV.drawDimensionalThreatFields(ctx,[enemy]);}
enemy.dimensionalThreat.geometry.bx=220;NV.drawDimensionalThreatFields(ctx,[enemy]);assert.equal(rasterizations,7,'unbounded cache');
console.log('PASS overhaul: stable probability/time, bounded bounty, fusion III traits, cached percentiles and bounded full-detail knit');
