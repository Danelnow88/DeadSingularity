const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
  const {VerticalCycle,waveRules,SAVE_KEY}=await import('../src/game/cycle.mjs');
  const NV={},context={window:{NV},console};vm.createContext(context);
  for(const file of ['gameData','balance'])vm.runInContext(fs.readFileSync(path.join(root,`reference/prototype/js/data/${file}.js`),'utf8'),context);
  let comparisons=0;const near=(a,b)=>{assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);comparisons++;};
  for(const wave of [1,2,5,10,15,30]){const actual=waveRules(wave);near(actual.duration,NV.waveDuration(wave,null));near(actual.objective,NV.waveClearObjective(wave,'normal').total);near(actual.batch,NV.spawnBatchForWave(wave));near(actual.refill,NV.spawnRefillInterval(wave,null,false,'normal',{arenaW:1350,arenaH:780,refW:900,refH:520}));near(actual.hp,Math.round(25*NV.enemyHpScale(wave)*.85));}
  const results=[];
  for(const hz of [30,60,144]){
    // RNG fixture zéro: críticos y drops garantizados, no es un buff del juego.
    const game=new VerticalCycle({random:()=>0});let frames=0;const counts={};
    while(['playing','wave_end','shop_enter'].includes(game.state.state)&&frames<hz*120){game.update(1/hz,{x:Math.cos(frames/hz),y:Math.sin(frames/hz),firePolicy:'legacy-auto'});for(const event of game.drain())counts[event.type]=(counts[event.type]||0)+1;frames++;}
    assert.equal(game.state.state,'shop');assert.equal(game.killed,22);assert.equal(counts.enemyDeath,22);assert.equal(counts.drop,22);assert(counts.pickup>0);assert(counts.shot>0);assert(game.coins>=15);
    const before={hp:game.hp,maxHp:game.maxHp,coins:game.coins};assert(game.buyHp());assert.equal(game.maxHp,before.maxHp+25);assert.equal(game.hp,before.hp+25);assert.equal(game.coins,before.coins-15);
    const checkpoint=JSON.parse(JSON.stringify(game.checkpoint())),loaded=new VerticalCycle();assert(loaded.load(checkpoint));assert.deepEqual(loaded.checkpoint(),checkpoint);assert(loaded.deploy());assert.equal(loaded.wave,2);assert.equal(loaded.maxHp,before.maxHp+25);assert(game.playerLevel>1);
    const pauseBefore=JSON.stringify({x:loaded.body.position.x,timer:loaded.remaining,energy:loaded.body.energy});loaded.state.togglePause();for(let f=0;f<100;f++)loaded.update(1/hz,{x:1,dash:true});assert.equal(JSON.stringify({x:loaded.body.position.x,timer:loaded.remaining,energy:loaded.body.energy}),pauseBefore);
    assert.throws(()=>loaded.load({...checkpoint,version:99}));assert.throws(()=>loaded.load({...checkpoint,hp:NaN}));assert.throws(()=>loaded.load({...checkpoint,purchases:6,maxHp:145}));
    results.push({hz,frames,counts,beforePurchase:before,checkpoint});
  }
  const {createDrone}=await import('../src/game/drone.mjs');
  const damage=new VerticalCycle({random:()=>.5});damage.spawned=damage.rules.objective;damage.remaining=15;damage.spawnTimer=100;
  const attacker=()=>Object.assign(createDrone(damage.body.position.x,damage.body.position.y,999),{arrival:0,phase:'press',timer:.72});
  damage.enemies=[attacker()];damage.update(1/60,{});assert.equal(damage.hp,109);assert.equal(damage.killed,1);assert.equal(damage.weaponProgress,0);assert(damage.drain().some(e=>e.type==='playerDamage'));
  damage.hp=1;damage.xp=99;damage.invulnerable=0;damage.enemies=[attacker()];damage.update(1/60,{});assert.equal(damage.state.state,'gameover');assert.equal(damage.hp,0);assert.equal(damage.playerLevel,2);assert(damage.drain().some(e=>e.type==='playerDeath'));
  assert.equal(SAVE_KEY,'deadSingularity.v1.verticalCheckpoint');assert.throws(()=>new VerticalCycle().checkpoint());
  const out=path.join(root,'local/validation');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'loop.json'),JSON.stringify({pass:true,comparisons,results,contracts:['shot/damage/death/drop/pickup','wave/shop/purchase/next wave','versioned checkpoint/reject invalid','pause freeze','player damage/death']},null,2));
  console.log(`PASS ciclo: 30/60/144 Hz, ${comparisons} comparaciones de reglas; combate, tienda, compra y guardado.`);
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
