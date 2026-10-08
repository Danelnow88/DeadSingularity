const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
  const {MotionBody}=await import('../src/game/motion.mjs');const NV={};const context=vm.createContext({window:{NV},console});
  for(const file of ['data/gameData.js','data/balance.js','data/consumables.js','engine/movement.js'])vm.runInContext(fs.readFileSync(path.join(root,'reference','prototype','js',file),'utf8'),context,{timeout:1000});
  let comparisons=0;const cases=[];
  for(const character of Object.keys(NV.CHARACTERS))for(const level of [0,5,10])for(const dt of [1/30,1/60,1/144]){
    const speed=NV.CHARACTERS[character].stats.speed,legacy={x:0,y:0,moveVx:0,moveVy:0,stun:0,agility:1,overdrive:0};NV.configurePlayerMovement(legacy,speed,level);NV.configurePlayerDash(legacy);
    const modern=new MotionBody({speed,permanentLevel:level});
    for(let frame=0;frame<600;frame++){
      const segment=Math.floor(frame/75)%8,moves=[[1,0],[1,1],[0,-1],[-1,0],[0,0],[.2,.7],[0,0],[1,0]],move=moves[segment];
      const dash=[5,6,120,130,260,480].includes(frame),stun=frame>=200&&frame<215?1:0,boost=frame>=320&&frame<400,agility=frame>=400?2:1;
      legacy.stun=stun;legacy.overdrive=boost?1:0;legacy.agility=agility;
      const moved=NV.updatePlayerDash(legacy,dash,move[0],move[1],1,0,true,dt);if(!moved)NV.updatePlayerMovement(legacy,move[0],move[1],dt);
      modern.step({x:move[0],y:move[1],dash,stun,boost,agility,aimX:1,aimY:0,aimActive:true},dt);
      for(const [label,a,b] of [['x',legacy.x,modern.position.x],['y',legacy.y,modern.position.y],['vx',legacy.moveVx,modern.velocity.x],['vy',legacy.moveVy,modern.velocity.y],['stamina',legacy.dashStamina,modern.energy],['dashTime',legacy.dashTime,modern.dashRemaining],['delay',legacy.dashRechargeDelay,modern.rechargeRemaining]]){assert(Math.abs(a-b)<1e-8,`${character}/${level}/${dt}/${frame}/${label}: ${a} != ${b}`);comparisons++;}
      assert.equal(legacy.dashActive,modern.dashing);
    }
    cases.push({character,level,dt,frames:600});
  }
  const out=path.join(root,'local','validation');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'motion.json'),JSON.stringify({pass:true,cases,comparisons},null,2));
  console.log(`PASS movimiento/dash: ${cases.length} escenarios, ${comparisons} comparaciones numéricas.`);
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
