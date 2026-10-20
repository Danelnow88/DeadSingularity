'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={window:{NV:{}},Math};vm.createContext(c);
for(const f of ['js/engine/dimensions.js','js/render/portals.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
const NV=c.window.NV;
let crossings=0;
for(const hz of [30,60,144])for(const kind of ['stable','chaos'])for(const size of [[1350,780],[900,520],[1689,780]]){
  const run=NV.createDimensionRun(3,false,{mode:'timed'},15,{routes:true});
  const p={x:450,y:260,hp:87,maxHp:140,speed:195,armor:4,xp:70,level:2,consumables:{potion:3},inventory:['pistol','rifle'],dashStamina:61,specialCd:14};
  const preserved=JSON.stringify({...p,x:0,y:0});
  for(let depth=0;depth<3;depth++){
    assert(NV.openDimensionPortal(run,...size));assert(run.portal&&run.stablePortal);
    assert(!NV.openDimensionPortal(run,...size));assert(Math.hypot(run.portal.x-run.stablePortal.x,run.portal.y-run.stablePortal.y)>100);
    for(const point of [run.portal,run.stablePortal])assert([110,size[0]-110].includes(point.x)&&[110,size[1]-110].includes(point.y),'Siempre en una esquina');
    p.x=size[0]/2;p.y=size[1]/2;
    for(let n=0;n<Math.ceil(1.25*hz);n++)NV.stepDimensionPortal(run,p,1/hz);
    assert.equal(run.phase,'portal');
    const chosen=kind==='stable'?run.stablePortal:run.portal;p.x=chosen.x;p.y=chosen.y;
    NV.stepDimensionPortal(run,p,1/hz);
    assert.equal(run.phase,'transit','Mismo ingreso inmediato que el agujero negro original');assert.equal(run.activation,0);
    assert.equal(run.chosenRoute,kind);assert.equal(run.depth,depth);
    while(run.phase==='transit')NV.stepDimensionPortal(run,p,1/hz);
    assert.equal(run.depth,depth+1);assert.equal(run.activeRoute,kind);assert.equal(run.portal,null);assert.equal(run.stablePortal,null);crossings++;
    assert.equal(JSON.stringify({...p,x:0,y:0}),preserved,'No se cambia ninguna mejora del personaje');
    const bonus=NV.dimensionRouteBonus(run);assert.equal(bonus,kind==='chaos'?12+6+run.depth*4:0);
    assert.equal(NV.claimDimensionRouteReward(run),bonus);assert.equal(NV.claimDimensionRouteReward(run),0);
    const e={hp:100,maxHp:100,speed:80,damage:16,eliteDamage:16,radius:12,id:'tank'};
    NV.applyDimensionRoute(e,run);assert.equal(e.hp,kind==='chaos'?180:100);assert.equal(e.maxHp,e.hp);assert(Math.abs(e.speed-(kind==='chaos'?94.4:80))<1e-8);assert.equal(e.radius,12);assert.equal(e.damage,16,'Daño no se multiplica dos veces en proyectil/impacto');
    const once=JSON.stringify(e);NV.applyDimensionRoute(e,run);assert.equal(JSON.stringify(e),once);
    assert.equal(NV.dimensionRouteDamage(16,run),kind==='chaos'?24:16);
    const cap=NV.dimensionRouteHostileLimit(run,10,30),deploy=NV.dimensionRouteDeployment(run,3,10,1,cap);
    assert.equal(cap,kind==='chaos'?15:10);assert.equal(deploy.target,kind==='chaos'?14:10);assert.equal(deploy.batch,kind==='chaos'?4:3);assert.equal(deploy.refill,kind==='chaos'?.65:1);
  }
  assert(!NV.openDimensionPortal(run,...size),'No inventar un quinto campo ni saltar al jefe');
}
const cornersSeen=new Set();for(let seed=0;seed<16;seed++){
  const r=NV.createDimensionRun(1,false,{},15,{routes:true});r.seed=seed;NV.openDimensionPortal(r,1350,780);
  cornersSeen.add(r.portal.x+','+r.portal.y);cornersSeen.add(r.stablePortal.x+','+r.stablePortal.y);
}assert.equal(cornersSeen.size,4);
const dead=NV.createDimensionRun(1,false,{},15,{routes:true});NV.openDimensionPortal(dead,900,520);NV.stepDimensionPortal(dead,{hp:0,x:0,y:0},1.3);assert.equal(dead.age,0);
NV.stepDimensionPortal(dead,{hp:100,x:0,y:0},NaN);assert.equal(dead.age,0);
NV.stepDimensionPortal(dead,{hp:100,x:0,y:0},0);assert.equal(dead.age,0);
// Adaptador de limpieza real: el núcleo puede completarse antes de matar custodios.
const source=fs.readFileSync('js/game.js','utf8'),cleanup={
  NV:{activateNormalShardMagnetPull(){},createWavePressure:()=>({}),clearHazards(h){h.length=0;},resetHookSystem(h){h.active=false;},clearPhantomPossession(p){p.phantomPossession=null;}},
  enemies:[{hp:100}],bullets:[{damage:10}],flameZones:[{}],meteors:[{}],drones:[{}],pendingBombImpacts:[{}],currentAutoTarget:{},
  pickups:[{value:1}],player:{hp:87,maxHp:140,armor:4,stun:1,stunReapplyLockout:1,phantomPossession:{}},wavePressure:{},hazards:[{}],minefieldState:{},sectorEncounterState:{},hookSystem:{active:true},stopCurrentWeaponAudio(){}
};
vm.createContext(cleanup);vm.runInContext(source.slice(source.indexOf('  function prepareDimensionCrossing()'),source.indexOf('  function pickWaveEvent()')),cleanup);cleanup.prepareDimensionCrossing();
for(const key of ['enemies','bullets','flameZones','meteors','drones','pendingBombImpacts','hazards'])assert.equal(cleanup[key].length,0,key);
assert.equal(cleanup.pickups.length,1);assert.equal(cleanup.player.hp,87);assert.equal(cleanup.player.armor,4);assert.equal(cleanup.player.stun,0);assert.equal(cleanup.hookSystem.active,false);
// Pureza de render y pila Canvas en ambas fases, todos los perfiles visuales.
for(const phase of ['opening','portal','transit'])for(const reduced of [true,false]){
  const run=NV.createDimensionRun(1,false,{},15,{routes:true});NV.openDimensionPortal(run,1350,780);Object.assign(run,{phase,age:2,hoverRoute:'stable',chosenRoute:'stable',activation:.3,transit:.5});
  const before=JSON.stringify(run);let stack=0,ops=0;
  const grad={addColorStop(){}};
  const ctx=new Proxy({save(){stack++;},restore(){stack--;assert(stack>=0);},createRadialGradient(){return grad;}},{get(o,k){return k in o?o[k]:(...args)=>{for(const a of args)if(typeof a==='number')assert(Number.isFinite(a));ops++;};}});
  NV.drawStablePortal(ctx,run.stablePortal,run,reduced);
  NV.drawDimensionRouteHints(ctx,run,{vx:0,vy:0,vw:900,vh:520,scaleX:1,scaleY:1,worldScaleX:1,worldScaleY:1,worldOffsetX:0,worldOffsetY:0});
  assert.equal(stack,0);assert(ops>10);assert.equal(JSON.stringify(run),before);
}
// Las guías no pertenecen al HUD y siguen funcionando al ocultar la explicación.
const arrowsRun={routeChoices:true,phase:'portal',portal:{x:-100,y:200},stablePortal:{x:1800,y:200}},calls=[];
const arrowCtx=new Proxy({save(){},restore(){}},{get(o,k){return k in o?o[k]:(...a)=>calls.push([k,...a]);},set(o,k,v){calls.push([k,v]);o[k]=v;return true;}});
NV.dimensionRouteHelpVisible=false;const view={vx:0,vy:0,vw:900,vh:520,scaleX:1,scaleY:1,worldScaleX:1,worldScaleY:1,worldOffsetX:0,worldOffsetY:0};
NV.drawDimensionRouteHints(arrowCtx,arrowsRun,view);assert.equal(calls.length,0);
NV.drawDimensionRouteArrows(arrowCtx,arrowsRun,view);assert(calls.some(a=>a[0]==='fillStyle'&&a[1]==='#ffd34e'));assert(calls.some(a=>a[0]==='fillStyle'&&a[1]==='#62aaff'));
const positions=calls.filter(a=>a[0]==='translate');assert.equal(positions.length,2);for(const [,x,y] of positions){assert(x>=26&&x<=874&&y>=100&&y<=494);assert(x===26||x===874||y===100||y===494,'Flechas ancladas al borde, no a tarjetas');}
delete NV.dimensionRouteHelpVisible;
const portalSource=fs.readFileSync('js/render/portals.js','utf8').split('NV.drawDimensionRouteArrows')[0];assert(!/run\.activation|run\.hoverRoute|charge|hold/.test(portalSource),'Sin medidor de carga integrado en el diseño');
console.log('PASS dimension routes: '+crossings+' cruces, dos rutas, 30/60/144 Hz, ingreso inmediato, conservación de equipo, riesgo/recompensa idempotentes, fin U4 y render puro.');
