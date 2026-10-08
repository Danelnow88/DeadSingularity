const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
  const {createDrone,stepDrones,hitDrone}=await import('../src/game/drone.mjs');
  const {rewardKill,tickCombo,passiveRegen}=await import('../src/game/progression.mjs');
  const {VerticalCycle}=await import('../src/game/cycle.mjs');
  const NV={},context={window:{NV},console,Math};vm.createContext(context);
  for(const file of ['data/gameData','data/balance','engine/enemies','engine/consumables','engine/weapons'])vm.runInContext(fs.readFileSync(path.join(root,`reference/prototype/js/${file}.js`),'utf8'),context);
  let comparisons=0;const near=(a,b,label)=>{assert(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<1e-7,`${label}: ${a} != ${b}`);comparisons++;};
  for(const hz of [30,60,144])for(const angle of [0,1.2,-2])for(const start of [[700,300],[35,35],[675,390]]){
    const fresh=[createDrone(...start,1000,angle),createDrone(start[0]+5,start[1]+5,1000,-angle)];fresh.forEach(e=>e.arrival=0);
    const legacy=fresh.map(e=>({x:e.x,y:e.y,hp:e.hp,enemyTypeId:'drone',isElite:false,behavior:'chase',radius:11,speed:76.5,damage:11.2,angle:e.angle,knockVelX:0,knockVelY:0,hitSlowUntil:0,hitSlowImmunity:0,contactCd:0,noFuse:true}));
    for(let frame=0;frame<300;frame++){
      const p={x:675+Math.cos(frame/hz)*120,y:390+Math.sin(frame/hz)*120,invuln:100,hp:120};
      if(frame===120){hitDrone(fresh[0],p.x,p.y);NV.applyKnockback(legacy[0],p.x,p.y,60);legacy[0].hitSlowUntil=.15;legacy[0].hitSlowImmunity=.35;}
      NV.updateEnemies(1/hz,{enemies:legacy,player:p,bullets:[],MAX_BULLETS:500,MAX_ENEMY_BULLETS:500,enemyBulletCount:0,wave:1,W:1350,H:780,keepInsideArena:true,applyPlayerDamage:()=>({applied:false}),addFloatText:()=>{}});
      stepDrones(fresh,p,{width:1350,height:780},76.5,1/hz,()=>{});
      for(let i=0;i<2;i++){const a=fresh[i],b=legacy[i];assert.equal(a.phase,b.droneState);for(const [newKey,oldKey] of [['x','x'],['y','y'],['timer','droneTimer'],['cooldown','droneCooldown'],['side','droneOrbitSide'],['kx','knockVelX'],['ky','knockVelY'],['slow','hitSlowUntil'],['immune','hitSlowImmunity']])near(a[newKey],b[oldKey]||0,newKey);}
    }
  }
  const g=new VerticalCycle({random:()=>.5}),player={x:0,y:0,xp:0,xpToNext:100,level:1,hp:120,maxHp:120,luck:0,bounty:0},combo={count:0,timer:0},weaponLevels={pistol:1},weaponKills={pistol:0};let score=0,gems=0;
  for(let n=0;n<90;n++){
    const dt=n%7===0?2.1:.1;tickCombo(g.combo,dt);NV.comboTick(combo,dt);
    const e={x:0,y:0,hp:0,score:11,xp:11,isElite:false};
    const weapon=n%3!==0;
    score=NV.killEnemy({e,score,player,pickups:[],damageSource:weapon?{kind:'weapon',weaponId:'pistol'}:null,weaponLevels,weaponKills,weaponKillProgress:()=>1.06,WEAPON_KILLS_PER_LEVEL:6,addFloatText:()=>{},spawnExplosion:()=>{},sfx:{enemyDeath:()=>{},playerLevelUp:()=>{},fuse:()=>{}},triggerFlash:()=>{}});
    const bonus=NV.comboOnKill(combo);score+=bonus.bonusScore;gems+=bonus.gemBonus;rewardKill(g,weapon);
    for(const [a,b] of [[g.score,score],[g.xp,player.xp],[g.xpNext,player.xpToNext],[g.playerLevel,player.level],[g.hp,player.hp],[g.maxHp,player.maxHp],[g.coins,gems],[g.combo.count,combo.count],[g.weaponLevel,weaponLevels.pistol],[g.weaponProgress,weaponKills.pistol]])near(a,b,'progress');
  }
  g.hp=50;player.hp=50;
  for(let frame=1;frame<=901;frame++){g.simFrame=frame;passiveRegen(g);NV.applyBotiPassiveRegen({passiveId:'boti_regen'},player,frame,()=>{});near(g.hp,player.hp,'regen');}
  const save=g;save.state.set('shop');const raw=save.checkpoint();assert(new VerticalCycle().load(raw));
  assert.throws(()=>new VerticalCycle().load({...raw,xpNext:101}));
  const oldGame=new VerticalCycle();oldGame.state.set('shop');const v1={...oldGame.checkpoint(),version:1};delete v1.playerLevel;delete v1.xp;delete v1.xpNext;delete v1.simFrame;
  const migrated=new VerticalCycle();assert(migrated.load(v1));assert.equal(migrated.playerLevel,1);assert.equal(migrated.checkpoint().version,2);
  for(const hz of [30,60,144]){
    const t=new VerticalCycle();t.enemies=[];t.spawned=t.rules.objective;t.remaining=0;t.spawnTimer=100;t.body.energy=50;t.body.rechargeRemaining=.5;t.update(1/hz,{});assert.equal(t.state.state,'wave_end');
    const start=t.body.position.x,energy=t.body.energy,fireEvents=t.drain().filter(e=>e.type==='shot').length;assert.equal(fireEvents,0);
    const steps=Math.ceil(2.1*hz-1e-8);for(let i=0;i<steps-1;i++)t.update(1/hz,{x:1,dash:true,fire:true,firePolicy:'legacy-auto'});assert.equal(t.state.state,'wave_end');t.update(1/hz,{x:1,dash:true});
    // Acumulación float: la misma condición >= duración puede requerir un frame.
    if(t.state.state==='wave_end')t.update(1/hz,{});assert.equal(t.state.state,'shop_enter');assert(t.body.position.x>start);assert.equal(t.body.energy,energy);assert.equal(t.bullets.length,0);assert.equal(t.buyHp(),false);
    t.state.suspended=true;const timer=t.transition;t.update(1/hz,{});assert.equal(t.transition,timer);t.state.suspended=false;
    for(let i=0;i<Math.ceil(.35*hz)+1;i++)t.update(1/hz,{});assert.equal(t.state.state,'shop');
  }
  const out=path.join(root,'local/validation');fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'slice.json'),JSON.stringify({pass:true,generatedAt:new Date().toISOString(),comparisons,droneScenarios:27,framesPerScenario:300,contracts:['formation/signal/press/recovery','grid separation/arena confinement','knockback/hit-slow','XP/level/weapon source/combo','300-frame regeneration','victory/shop transition/pause','checkpoint v1 migration/v2 validation'],limitations:'Dos drones sin fusión; no certifica todo el director, proyectiles, roster, arte/audio ni Android físico.'},null,2));
  console.log(`PASS equivalencia del corte: ${comparisons} comparaciones de IA, impacto, XP, combo y regeneración.`);
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
