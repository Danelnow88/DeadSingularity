// Adaptación de gameplay al mundo mayor: nunca usar camera origin como bounds.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const math=Object.create(Math); let seed=1337;
math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
const NV={}; const sandbox={window:{NV},Math:math,console:{log(){}},Number,Object,Array,Set,Map,WeakMap};
for(const file of ['data/gameData','data/balance','engine/hostileBudget','engine/enemies','engine/enemyArrival','engine/boss','engine/bossEncounters','engine/hazards','engine/sectorEncounters','engine/cameraSafety'])
  vm.runInNewContext(fs.readFileSync('js/'+file+'.js','utf8'),sandbox,{filename:file});
const metrics={arenaW:1350,arenaH:780,refW:900,refH:520,viewW:900,viewH:520,viewX:0,viewY:0};
NV.worldMetrics=metrics;
NV.viewport={intersectsWorldRect(x,y,w,h){return x+w>=metrics.viewX && x<=metrics.viewX+metrics.viewW && y+h>=metrics.viewY && y<=metrics.viewY+metrics.viewH;}};
const base={W:1350,H:780,player:{x:675,y:390,radius:10},spawnExplosion(){}};

// Todas las identidades alcanzan regiones nuevas, con velocidad y límites reales.
const traces=[];
for(const type of NV.BOSS_TYPES) {
  const b={...type,x:675,y:140,timer:0,encounter:{stage:'recovery'},hp:1000,maxHp:1000};
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(let frame=0;frame<3000;frame++) {
    b.timer+=1/60;
    base.player.x=frame<1500?1010:340; base.player.y=frame<1500?590:200;
    NV.updateBossWorldMovement(b,1/60,base,1);
    const bound=NV.bossVisibleArenaPosition(b,base.W,base.H);
    assert.equal(b.x,bound.x,type.name+' x bounds'); assert.equal(b.y,bound.y,type.name+' y bounds');
    assert(Number.isFinite(b.x)&&Number.isFinite(b.y));
    minX=Math.min(minX,b.x);maxX=Math.max(maxX,b.x);minY=Math.min(minY,b.y);maxY=Math.max(maxY,b.y);
  }
  assert(maxX-minX>400,type.name+' no cambia región horizontal');
  assert(maxY-minY>300,type.name+' sigue atrapado arriba');
  const pos={x:b.x,y:b.y}; b.encounter.stage='windup'; NV.updateBossWorldMovement(b,2,base,1);
  assert.equal(b.x,pos.x); assert.equal(b.y,pos.y,'origen de cast se movió');
  traces.push([Math.round(maxX-minX),Math.round(maxY-minY)].join(','));
}
assert(new Set(traces).size>6,'identidades no deben compartir trayectoria genérica');

// Targets puros: aumento limitado +4, dificultades y hard cap 30/7 conservados.
assert.equal(NV.arenaDensityCompensation(metrics),4);
assert.equal(NV.arenaDensityCompensation({arenaW:900,arenaH:520}),0);
assert.equal(NV.arenaDensityCompensation({arenaW:8000,arenaH:8000}),4);
for(const wave of [1,5,10,15,25,50]) {
  const targets=['easy','normal','hard'].map(d=>NV.softHostileTarget(wave,d,metrics));
  assert(targets[0]<=targets[1] && targets[1]<=targets[2]);
  assert(targets.every(t=>t<=28));
  assert.equal(NV.softHostileTarget(wave,'normal',metrics),Math.min(28,NV.softHostileTarget(wave,'normal')+4));
  assert(NV.spawnRefillInterval(wave,null,false,'normal',metrics)>=.35);
}
assert.equal(NV.BALANCE.MAX_HOSTILES,30);assert.equal(NV.BALANCE.MAX_HEAVY_HOSTILES,7);
assert.equal(NV.bossSupportTarget(5,'easy'),5);assert.equal(NV.bossSupportTarget(5,'normal'),7);assert.equal(NV.bossSupportTarget(5,'hard'),9);
assert.equal(NV.spawnRefillInterval(5,null,true,'normal',metrics),2.5);

// Soporte normal usa entidades y budget existentes, incluyendo reservas arrival.
const st={...base,player:{x:675,y:390,radius:10},enemies:[],boss:{dead:false,isBoss:true,hostileClass:'heavy'},wave:6,
 ENEMY_TYPES:NV.ENEMY_TYPES,ELITE_TYPES:NV.ELITE_TYPES,MAX_HOSTILES:30,MAX_HEAVY_HOSTILES:7,announceSpawn:true,forceTypeId:'drone'};
assert.equal(NV.spawnEnemy(st),undefined,'Lab/otros callers no autorizan soporte implícito');
st.allowBossSupport=true;
for(let i=0;i<40;i++) NV.spawnEnemy(st);
let budget=NV.getHostileBudget(st);assert.equal(budget.hostiles,30);assert.equal(budget.heavy,1);assert.equal(st.enemies.length,29);
assert(st.enemies.every(e=>e.arrival && !NV.isEnemyTargetable(e)));
st.enemies[0].dead=true;assert(NV.spawnEnemy(st)); assert.equal(NV.getHostileBudget(st).hostiles,30);
st.enemies=[];
let near=0;
for(let i=0;i<200;i++) {
  st.enemies=[];NV.spawnEnemy(st);const e=st.enemies[0];
  if(Math.hypot(e.x-st.player.x,e.y-st.player.y)<=350)near++;
  const p=NV.enemyArenaPosition(e,st.W,st.H);assert.equal(e.x,p.x);assert.equal(e.y,p.y);
}
assert(near>150,'distribución no concentra encuentros visibles');

// Láser + boss: misma secuencia, 2 lanes, cast fijado no superpuesto y cooldown.
const hazards=[],sector=NV.createSectorEncounterState();
const boss={hp:1000,maxHp:1000,dead:false,primaryAttack:'spread',radius:45,x:675,y:390,color:'#00bfff',encounter:{stage:'windup',t:1}};
const ctx={wave:10,W:1350,H:780,boss,player:{x:100,y:100},playerRadius:9};
NV.updateSectorEncounter(7,hazards,sector,ctx);assert.equal(hazards.length,0,'no tapar un cast con láser');
boss.encounter.stage='recovery'; NV.updateSectorEncounter(.01,hazards,sector,ctx);
assert.equal(hazards.length,2);assert(hazards.every(h=>h.W===1350&&h.H===780&&h.state==='telegraph'));
boss.encounter={stage:'recovery',t:0,cast:0,phase:false,rays:[],idleAnchorX:100,idleAnchorY:100,idleTime:0};
const encounterState={...ctx,bullets:[],MAX_BULLETS:100,MAX_ENEMY_BULLETS:40,enemyBulletCount:()=>0,sectorPressureActive:true};
NV.updateBossEncounter(boss,.1,encounterState);assert.equal(boss.encounter.stage,'recovery');
for(let i=0;i<300;i++) NV.updateSectorEncounter(1/60,hazards,sector,ctx);
assert.equal(hazards.length,0);assert(sector.timer>6,'boss cooldown no es refill ambiental normal');
for(const attack of ['beam','summon','rage']) {
  ctx.boss={...boss,primaryAttack:attack};NV.updateSectorEncounter(20,hazards,sector,ctx);assert.equal(hazards.length,0);
}

// Boss oculto vuelve a engagement: no comenzar cast sin .6s de gracia visible.
boss.x=1250;boss.y=650;boss.encounter={stage:'recovery',t:0,cast:0,phase:false,rays:[],idleAnchorX:100,idleAnchorY:100,idleTime:0};
encounterState.sectorPressureActive=false; NV.updateBossEncounter(boss,.1,encounterState);assert.equal(boss.encounter.stage,'recovery');
metrics.viewX=450;metrics.viewY=260;
NV.updateBossEncounter(boss,.1,encounterState);assert.equal(boss.encounter.stage,'recovery');
NV.updateBossEncounter(boss,.61,encounterState);assert.equal(boss.encounter.stage,'windup');
// El puff y el aviso permanecen en mundo al panear; ninguna mutación en draw.
const arrivalEnemy={x:1100,y:650,radius:18,dead:false};NV.beginEnemyArrival(arrivalEnemy,{announceSpawn:true});
const calls=[]; const drawing=new Proxy({}, {get:(_,key)=>(...args)=>calls.push([key,...args]),set:()=>true});
const arrivalBefore=JSON.stringify(arrivalEnemy);
NV.drawEnemyArrival(drawing,arrivalEnemy);metrics.viewX=0;metrics.viewY=0;NV.drawEnemyArrival(drawing,arrivalEnemy);
assert.equal(JSON.stringify(arrivalEnemy),arrivalBefore);
assert.deepEqual(calls.filter(c=>c[0]==='translate'),[['translate',1100,650],['translate',1100,650]],'aviso anclado al spawn, independiente de cámara');

// Círculo de fusión descubierto tarde no aplica daño mientras reavisa.
let hits=0;
const fused={x:1100,y:650,hp:100,maxHp:100,fusionLevel:2,fusionPulse:{stage:'windup',t:.1,x:1100,y:650,startHp:100}};
const fusionSt={enemies:[fused],player:{x:1100,y:650},applyPlayerDamage(){hits++;return{applied:true};}};
NV.updateFusionThreats(.05,fusionSt);assert.equal(hits,0);
metrics.viewX=450;metrics.viewY=260;NV.updateFusionThreats(.06,fusionSt);assert.equal(hits,0,'ataque oculto no detona al descubrirlo');
assert.equal(fused.fusionPulse.stage,'cooldown');

// Pipeline real de hazards: el owner de minas NO borra láseres/core zones
// durante boss. Antes la integración reiniciaba el aviso cada frame.
const integratedHazards=[],integratedSector=NV.createSectorEncounterState(),mines=NV.createMinefieldState();
const integratedContext={wave:8,W:1350,H:780,boss:{dead:false,primaryAttack:'spread',encounter:{stage:'recovery'}},player:{x:100,y:100},playerRadius:9};
let sawActive=false,sawRecovery=false;
for(let i=0;i<650;i++) {
  NV.updateSpeakerMines(1/60,integratedHazards,mines,integratedContext);
  NV.updateSectorEncounter(1/60,integratedHazards,integratedSector,integratedContext);
  sawActive ||= integratedHazards.some(h=>h.state==='active');
  sawRecovery ||= integratedHazards.some(h=>h.state==='recovery');
}
assert(sawActive&&sawRecovery,'láser integrado tiene que completar las fases, no recrear warning infinito');
const core={type:'coreZone',state:'arming',stateTime:0,simTime:0,armTime:.4,activeTime:2,x:200,y:200,radius:35,tickInterval:.5,damage:4};
integratedHazards.push(core,{type:'speakerMine',state:'armed'});
NV.updateSpeakerMines(.05,integratedHazards,mines,integratedContext);
assert(integratedHazards.includes(core),'zona de enemigo eliminada por owner de minas');
assert(!integratedHazards.some(h=>h.type==='speakerMine'));
NV.updateSpeakerMines(.05,integratedHazards,mines,{...integratedContext,transitioning:true});assert.equal(integratedHazards.length,0);

// Coordinator excluye spawns en Lab; sólo soportes productivos autorizados.
const game=fs.readFileSync('js/game.js','utf8');
assert(game.includes('allowBossSupport: !!boss && !combatLabMode'));
assert(game.includes('spawnElite(Math.max(0, softTarget - filled.hostiles))'));
console.log('RESULT arena_adaptation: movement, identities, density, distribution, boss support, laser alternation and camera fairness OK');
