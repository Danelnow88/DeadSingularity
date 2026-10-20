'use strict';
// Use real combat producers: laser/railgun are traveling shots, flame is a zone.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const math=Object.create(Math);math.random=()=>.5;
const context=vm.createContext({window:{NV:{}},Math:math,Float32Array,Float64Array,WeakMap,console});
for(const file of ['js/data/balance.js','js/data/gameData.js','js/engine/weapons.js','js/engine/bullets.js',
  'js/engine/flame.js','js/engine/drones.js','js/engine/special.js','js/engine/meteors.js',
  'js/engine/hostileBudget.js','js/engine/enemies.js','js/engine/wavePressure.js','js/engine/bossEncounters.js','js/engine/dimensionalThreats.js','js/render/spaceTrails.js']){
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
}
const NV=context.window.NV;
NV.settings={graphics:{spaceTravel:false,spaceResponse:false},gameplay:{reducedEffects:false}};
const player={x:300,y:320,hp:120,maxHp:120,character:'boti',luck:0,permCrit:0,invuln:1,bulwark:0};
let time=0;
const frame={enabled:true,id:'threshold',W:1350,H:780,time:0,paused:false,bullets:[],meteors:[],enemies:[]};
function readonly(entity){return new Proxy(entity,{set(){throw Error('trail mutated combat entity');},
  defineProperty(){throw Error('trail defined combat metadata');},deleteProperty(){throw Error('trail deleted combat metadata');}});}
function physics(bullets,dt,extra={}){return NV.updateBullets(dt,{bullets,W:frame.W,H:frame.H,player,enemies:[],boss:null,
  CHARACTERS:NV.CHARACTERS,SHIELD_COOLDOWN:1,applyPlayerDamage:()=>({applied:false}),
  addFloatText(){},killEnemy(){},applyKnockback(){},spawnExplosion(){},...extra}).bullets;}
function observe(bullets=[],meteors=[],enemies=[],paused=false){
  frame.time=time;frame.bullets=bullets;frame.meteors=meteors;frame.enemies=enemies;frame.paused=paused;
  const before=JSON.stringify([bullets,meteors,enemies]);NV.spaceTrails.update(frame);
  assert.equal(JSON.stringify([bullets,meteors,enemies]),before,'presentation changed gameplay');
}
function observeShots(bullets){
  const refs=bullets.map(readonly),before=NV.spaceTrails.diagnostics().bulletSources;
  observe(refs);
  for(let i=0;i<4;i++){physics(bullets,1/60);time+=1/60;observe(refs);}
  assert(NV.spaceTrails.diagnostics().bulletSources>before,'real traveling shots failed to produce cuts');
}
const traveling=[];
for(const weapon of NV.WEAPONS){
  for(let fusion=0;fusion<=3;fusion++){
    const bullets=[],zones=[];
    assert.equal(NV.shoot({player,enemies:[],boss:null,bullets,currentWeapon:weapon,
      aimVector:{x:1,y:.15},currentWeaponLevel:()=>1,weaponVisualTier:()=>0,BULLET_TIER_COLORS:['#fff'],
      currentWeaponFusion:fusion,fusionStep:.2,MAX_BULLETS:500,permDamageBonus:0,wave:1,playWeaponSound(){},
      onFlame(config){zones.push(NV.createFlameZone(config));}}),true);
    if(weapon.id==='flamethrower'){
      assert.equal(bullets.length,0,'flamethrower became a fake traveling projectile');
      assert.equal(zones.length,1);assert.equal(zones[0].type,'flame');assert.equal(zones[0].vx,undefined);
      const emitted=NV.spaceTrails.diagnostics().emissions;time+=.05;observe();
      assert.equal(NV.spaceTrails.diagnostics().emissions,emitted,'flame produced an invented flight trail');
    }else{
      assert(bullets.length>0);for(const bullet of bullets){
        assert.equal(bullet.wid,weapon.id);assert(Number.isFinite(bullet.vx)&&Number.isFinite(bullet.vy));
        assert(Math.hypot(bullet.vx,bullet.vy)>0);
      }
      observeShots(bullets);if(fusion===0)traveling.push(weapon.id);
    }
  }
}
assert.deepEqual(traveling,['pistol','rifle','smg','shotgun','sniper','laser','plasma','bow','railgun']);

// Enjambre bullets have no weapon id: appearance cannot whitelist the nine guns.
const hiveShots=[],drones=[{angle:0,orbitRadius:55,speed:2.5,fireTimer:0,color:'#8dfaff',dead:false}];
NV.updateDrones(.1,drones,player,hiveShots,500,[],null,300);
assert.equal(hiveShots.length,1);assert.equal(hiveShots[0].specialId,'hivemind');assert.equal(hiveShots[0].wid,undefined);
observeShots(hiveShots);

// BOTI's existing meteor array is a separate real projectile source.
const meteors=[];
NV.useSpecial({player,CHARACTERS:NV.CHARACTERS,meteors,particles:[],drones:[],W:frame.W,H:frame.H,enemies:[],shockwaves:[],
  cbs:{showBanner(){},triggerFlash(){},spawnExplosion(){},sfx:{special(){}}}});
assert.equal(meteors.length,12);const meteorRefs=meteors.map(readonly),beforeMeteors=NV.spaceTrails.diagnostics().meteorSources;
observe([],meteorRefs);
for(let i=0;i<15;i++){
  NV.updateMeteors(1/60,meteors,{H:frame.H,enemies:[],boss:null,player},{killEnemy(){},applyKnockback(){},spawnExplosion(){}});
  time+=1/60;observe([],meteorRefs);
}
assert(NV.spaceTrails.diagnostics().meteorSources>beforeMeteors,'BOTI meteor flight is unobserved');

// Production hostile tank shots, plus boss 'beam' which is actually a charged lance.
const hostile=[],tank={x:700,y:100,enemyTypeId:'tank',isElite:false,dead:false,hp:60,maxHp:60,speed:40,radius:20,damage:18,behavior:'chase',knockVelX:0,knockVelY:0,knockbackRes:.3,contactCd:0,stun:0};
NV.updateWavePressure(.1,{state:{timer:0,serial:0},active:true,wave:1,difficulty:'normal',player,enemies:[tank],
  bullets:hostile,MAX_BULLETS:500,MAX_ENEMY_BULLETS:500,enemyBulletCount:()=>0,W:frame.W,sfx:{}});
assert.equal(hostile.length,0);assert.equal(tank.tankCannonState,'windup');
NV.updateEnemies(.9,{player,enemies:[tank],bullets:hostile,W:frame.W,H:frame.H,wave:1,MAX_BULLETS:500,MAX_ENEMY_BULLETS:500,MAX_HOSTILES:30,MAX_HEAVY_HOSTILES:7,enemyBulletCount:()=>hostile.length,applyPlayerDamage:()=>({applied:false}),addFloatText(){},spawnExplosion(){}});
assert.equal(hostile.length,1);assert.equal(hostile[0].projectileStyle,'tankShell');observeShots(hostile);
for(const attack of ['repeater','beam','bomb','orbs']){
  const bullets=[],boss={x:700,y:100,hp:300,maxHp:300,dead:false,phase2:false,primaryAttack:attack,color:'#ff5f9b',radius:50};
  for(let i=0;i<180&&!bullets.length;i++)NV.updateBossEncounter(boss,1/60,{player,enemies:[],bullets,W:frame.W,H:frame.H,
    MAX_BULLETS:500,MAX_ENEMY_BULLETS:500,enemyBulletCount:()=>0,sectorPressureActive:true,sfx:{}});
  // Sector pressure would prevent casts; release it and let the real engine announce/fire.
  for(let i=0;i<180&&!bullets.length;i++)NV.updateBossEncounter(boss,1/60,{player,enemies:[],bullets,W:frame.W,H:frame.H,
    MAX_BULLETS:500,MAX_ENEMY_BULLETS:500,enemyBulletCount:()=>0,sectorPressureActive:false,sfx:{}});
  assert(bullets.length>0,'boss attack did not create its real projectiles: '+attack);
  if(attack==='beam')assert(bullets.every(b=>b.projectileStyle==='bossChargedLance'&&Math.hypot(b.vx,b.vy)>0));
  observeShots(bullets);
}

// Dimensional sniper uses three real ray heads, never its full warning line.
const sniper={x:550,y:260,radius:15,speed:110,damage:19,enemyTypeId:'dimension_sniper',dead:false,angle:0,stun:0};
const st={player,enemies:[sniper],W:frame.W,H:frame.H,applyPlayerDamage:()=>({applied:false,killed:false})};
const beforeNeedles=NV.spaceTrails.diagnostics().needleSources;
let sawWarning=false,sawActive=false;
for(let i=0;i<150;i++){
  NV.prepareDimensionalThreats(st);NV.updateDimensionalThreat(sniper,1/60,st,110);time+=1/60;
  const s=sniper.dimensionalThreat,prior=NV.spaceTrails.diagnostics().needleSources;
  observe([],[],[readonly(sniper)]);
  if(s.phase==='windup'){sawWarning=true;assert.equal(NV.spaceTrails.diagnostics().needleSources,prior,'warning generated a fake projectile trail');}
  if(s.phase==='active')sawActive=true;
}
assert(sawWarning&&sawActive);assert(NV.spaceTrails.diagnostics().needleSources>beforeNeedles,'traveling dimensional needles are not covered');

// A reflected shot reverses velocity AFTER movement. Its arrival mark must still
// follow the actual incoming segment, not a fabricated backwards velocity trace.
function recordedCut(){
  const paths=[],ctx={save(){},restore(){},beginPath(){this.points=[];},moveTo(x,y){this.points.push([x,y]);},
    lineTo(x,y){this.points.push([x,y]);},stroke(){paths.push(this.points);}};
  NV.spaceTrails.draw(ctx);return paths.find(path=>path.length)||[];
}
const reflected=hostile[0];reflected.dead=false;reflected.isEnemy=true;reflected.x=player.x-20;reflected.y=player.y;
reflected.vx=500;reflected.vy=0;player.bulwark=3;
NV.spaceTrails.hide();time+=.05;const reflectedRef=readonly(reflected);observe([reflectedRef]);
physics([reflected],.02);time+=.02;observe([reflectedRef]);
assert(reflected.reflected&&reflected.vx<0);const arrival=recordedCut();
assert.equal(arrival.length,4);assert(arrival[0][0]<arrival[1][0],'reflection trail points opposite actual incoming displacement');
player.bulwark=0;

// Inertia advances hostile shots at .15 normal dt. A trail must use that measured
// displacement, not speed times the unscaled visual frame interval.
reflected.isEnemy=true;reflected.dead=false;reflected.x=500;reflected.y=100;reflected.vx=500;reflected.vy=0;
NV.spaceTrails.hide();time+=.05;observe([reflectedRef]);
const oldX=reflected.x;physics([reflected],.04,{inertia:{held:true}});time+=.04;observe([reflectedRef]);
assert(Math.abs(reflected.x-oldX-3)<1e-6);const slow=recordedCut();
assert.equal(slow.length,4);assert(Math.abs(Math.abs(slow[1][0]-slow[0][0])-16)<1e-4,'inertia trail invents fast travel');

// Independent scene/settings controls never erase projectile history.
const probe=hiveShots[0];probe.dead=false;probe.x=300;probe.y=300;probe.vx=500;probe.vy=0;
NV.spaceTrails.hide();time+=.05;observe([readonly(probe)]);
const probeRef=readonly(probe);time+=.05;observe([probeRef]);probe.x+=10;time+=.03;observe([probeRef]);
const d=NV.spaceTrails.diagnostics();assert(d.liveCuts>0);
NV.settings.graphics.spaceTravel=true;NV.settings.graphics.spaceResponse=true;
observe([probeRef]);assert.equal(NV.spaceTrails.diagnostics().resets,d.resets);
NV.settings.graphics.spaceTravel=false;NV.settings.graphics.spaceResponse=false;
observe([probeRef]);assert.equal(NV.spaceTrails.diagnostics().liveCuts,d.liveCuts);assert.equal(NV.spaceTrails.diagnostics().resets,d.resets);
const frozen=JSON.stringify(NV.spaceTrails.diagnostics());time+=.5;observe([probeRef],[],[],true);
assert.equal(JSON.stringify(NV.spaceTrails.diagnostics()),frozen,'pause ages/emits projectile cuts');
time-=.5;frame.paused=false;

// Preserve the established two material edges, alpha curve, width and no glow.
const paths=[],styles=[],stack=[];
const ctx={globalAlpha:.7,shadowBlur:9,strokeStyle:'old',lineWidth:4,lineCap:'butt',lineJoin:'miter',
  save(){stack.push([this.globalAlpha,this.shadowBlur,this.strokeStyle,this.lineWidth,this.lineCap,this.lineJoin]);},
  restore(){[this.globalAlpha,this.shadowBlur,this.strokeStyle,this.lineWidth,this.lineCap,this.lineJoin]=stack.pop();},
  beginPath(){this.current=[];},moveTo(x,y){this.current.push(['M',x,y]);},lineTo(x,y){this.current.push(['L',x,y]);},
  stroke(){paths.push(this.current);styles.push({alpha:this.globalAlpha,width:this.lineWidth,blur:this.shadowBlur,color:this.strokeStyle});}};
NV.spaceTrails.draw(ctx);assert.equal(styles.length,4);assert.equal(paths.flat().length,4,'one cut must be exactly two material edges');
assert.equal(styles[0].alpha,.28);assert(styles.every(s=>s.width===1.5&&s.blur===0));
assert.equal(styles[0].color,'rgb(92,129,139)');assert.equal(ctx.globalAlpha,.7);assert.equal(ctx.shadowBlur,9);
const visibleAlpha=styles[0].alpha;paths.length=styles.length=0;NV.settings.gameplay.reducedEffects=true;
NV.spaceTrails.draw(ctx);assert(styles[0].alpha>0&&styles[0].alpha<visibleAlpha);assert.equal(paths.flat().length,4);
NV.settings.gameplay.reducedEffects=false;
time+=.4;observe();assert.equal(NV.spaceTrails.diagnostics().liveCuts,0,'cuts do not expire after .28s');
assert.equal(NV.spaceTrails.diagnostics().capacity,64);assert.equal(NV.spaceTrails.diagnostics().bytes,64*8*4);
assert(NV.spaceTrails.diagnostics().emitInterval>=.025&&NV.spaceTrails.diagnostics().emitInterval<=.035);
frame.id='foundry';time+=.01;observe();assert.equal(NV.spaceTrails.diagnostics().liveCuts,0);
frame.enabled=false;observe();assert.equal(NV.spaceTrails.diagnostics().active,false);
const source=fs.readFileSync('js/render/spaceTrails.js','utf8');
assert(!/Math\.random|readPixels|getImageData|\.wid\b|weaponById/.test(source),'trails introduced RNG/readback/weapon whitelist');
console.log('PASS environment projectile coverage: nine traveling guns/F0–III, flame zone, hive/meteors/hostiles/lances/needles, independent toggles, pause and original cut artwork');
