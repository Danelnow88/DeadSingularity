// Fixture mecánico determinista ANTES/DESPUÉS; omite sólo campos de presentación.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function snapshot() {
  const result={};
  for(const id of ['boti','nova','rook','swarm']) {
    let seed=42;const math=Object.create(Math);
    math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
    const NV={},ctx={window:{NV},Math:math,console};
    for(const file of ['data/gameData','data/balance','engine/fx','engine/special','engine/meteors','engine/drones','render/specialEffects'])
      vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/'+file+'.js'),'utf8'),ctx);
    const player={character:id,x:675,y:390,phase:0,bulwark:0,invuln:0};
    const enemies=[{x:680,y:390,radius:15,hp:10000,dead:false}],boss={x:700,y:400,radius:40,hp:10000,dead:false};
    const meteors=[],particles=[],shockwaves=[],bullets=[],knockbacks=[];
    const cbs={showBanner(){},triggerFlash(){},spawnExplosion(){},sfx:{special(){}},
      applyKnockback(e,x,y,strength){knockbacks.push(strength);},addFloatText(){},killEnemy(e){e.dead=true;}};
    const active=NV.useSpecial({player,CHARACTERS:NV.CHARACTERS,meteors,particles,drones:[],W:1350,H:780,enemies,shockwaves,shake:0,cbs});
    const fields=(o,keys)=>Object.fromEntries(keys.map(k=>[k,o[k]]));
    const initial={player:fields(player,['phase','bulwark','invuln','specialCd']),
      meteors:meteors.map(m=>fields(m,['x','y','vx','vy','radius','dead'])),
      drones:active.drones.map(d=>fields(d,['angle','orbitRadius','speed','fireTimer','dead'])),
      enemyStun:enemies[0].stun,knockbacks:[...knockbacks]};
    let aliveMeteors=meteors,aliveDrones=active.drones;
    for(let i=0;i<360;i++) {
      aliveMeteors=NV.updateMeteors(1/60,aliveMeteors,{H:780,enemies,boss,player},cbs).meteors;
      aliveDrones=NV.updateDrones(1/60,aliveDrones,player,bullets,300,enemies,boss,300);
    }
    enemies[0].phaseAcc=120;boss.phaseAcc=120;
    const before=[enemies[0].hp,boss.hp];NV.detonatePhase(player,enemies,boss,shockwaves,cbs);
    result[id]={initial,finalHP:[enemies[0].hp,boss.hp],remaining:[aliveMeteors.length,aliveDrones.length],
      shots:bullets.map(b=>fields(b,['x','y','vx','vy','damage','isEnemy','specialId','bossDamageMult'])),
      detonation:[before[0]-enemies[0].hp,before[1]-boss.hp],
      constants:fields(NV.BALANCE,['METEOR_BOSS_DMG_MULT','DRONE_BOSS_DMG_MULT','PHASE_AURA_DPS','PHASE_AURA_RADIUS','PHASE_AURA_BOSS_MULT','PHASE_DETONATION_MULT'])};
  }return result;
}
module.exports={snapshot};
if(require.main===module) {
  const out=path.resolve(process.argv[2]||'previews/special-remaster-2026-10-02/contracts-before.json');
  fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(snapshot(),null,2));console.log(out);
}
