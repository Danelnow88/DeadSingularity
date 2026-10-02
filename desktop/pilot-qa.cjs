// QA compartido Web/Electron: dibujo real, cuatro partidas y especiales.
const assert=require('node:assert/strict');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
module.exports=async function verifyPilots(evaluate,capture){
  const configuration=await evaluate('({shapes:NV.pilotAppearance.shapes,settings:NV.PILOT_ANIMATION_BASELINE.settings})');
  assert.deepEqual(configuration.shapes,{boti:'woven',nova:'radial',rook:'peaks',swarm:'asymmetric'});
  const gallery=await evaluate(`(() => {
    const c=document.createElement('canvas');c.width=1100;c.height=1100;const ctx=c.getContext('2d');
    ctx.fillStyle='#040815';ctx.fillRect(0,0,c.width,c.height);ctx.font='18px sans-serif';
    NV.CHARACTER_ORDER.forEach((id,i)=>{
      const char=NV.CHARACTERS[id],y=130+i*260,p={character:id,x:0,y:0,hp:100,maxHp:100,invuln:0,phase:0,bulwark:0,shield:0,overdrive:0};
      ctx.fillStyle=char.color;ctx.fillText(char.name+' · '+NV.pilotGeometry.names[NV.pilotAppearance.shapes[id]],30,y-82);
      ctx.save();ctx.translate(220,y);ctx.scale(2,2);NV.drawPlayer(ctx,p,NV.CHARACTERS,19488);ctx.restore();
      ctx.save();ctx.translate(485,y);NV.drawPlayer(ctx,p,NV.CHARACTERS,19488);ctx.restore();
      NV.beginSpecialVisual(p,char.special);p.specialVisual.age=.6;if(id==='nova')p.phase=3;if(id==='rook')p.bulwark=3;
      ctx.save();ctx.translate(770,y);ctx.scale(1.4,1.4);NV.drawPlayer(ctx,p,NV.CHARACTERS,19488);ctx.restore();
    });return c.toDataURL();
  })()`);await capture('pilots-approved',gallery);
  const benchmark=await evaluate(`(() => {
    const c=document.createElement('canvas');c.width=600;c.height=300;const ctx=c.getContext('2d'),times=[];
    const pilots=NV.CHARACTER_ORDER.map((id,i)=>({character:id,x:70+i*145,y:150,hp:100,maxHp:100,invuln:0,phase:0,bulwark:0,shield:0,overdrive:0}));
    for(let f=0;f<240;f++){const start=performance.now();ctx.clearRect(0,0,600,300);for(const p of pilots)NV.drawPlayer(ctx,p,NV.CHARACTERS,f);if(f>=40)times.push(performance.now()-start);}
    times.sort((a,b)=>a-b);return {medianMs:times[100],p95Ms:times[189],maxMs:times[199],samples:200};
  })()`);
  const cases=[];
  for(const character of ['boti','nova','rook','swarm']){
    await evaluate('location.reload();true');let ready=false;
    for(let i=0;i<100;i++){await wait(80);try{if(await evaluate('window.NV && NV.alpha && NV.getState()==="menu"')){ready=true;break;}}catch(_){}}
    assert(ready,'recarga '+character);
    await evaluate(`(() => {const run=NV.expedition.create('expedition',0);run.cleared=1;
      const saved=NV.expedition.save({version:1,character:'${character}',wave:1,run,player:{hp:5000,maxHp:5000,xpToNext:100},inventory:['pistol'],currentWeapon:'pistol',levels:{pistol:1},kills:{},fus:{},consumables:[],shopBought:{},upgradeSlots:[],score:0,shards:0,difficulty:'normal'});
      if(!saved)throw Error('checkpoint QA');NV.alpha.resume();})()`);
    await wait(450);const start=await evaluate('NV.getRuntimeSnapshot()');
    assert.equal(start.state,'playing');assert.equal(start.player.character,character);
    await evaluate('NV.input.setMoveUp(true);NV.input.setSpecial(true)');await wait(160);await evaluate('NV.input.setSpecial(false)');
    const active=await evaluate('NV.getRuntimeSnapshot()');assert(active.special.visual,character+' especial');
    await wait(600);await evaluate('NV.input.setMoveUp(false)');
    const end=await evaluate('NV.getRuntimeSnapshot()');assert(end.frame>start.frame);assert(end.player.y<start.player.y);
    await capture('pilot-play-'+character,await evaluate('document.getElementById("game").toDataURL()'));
    cases.push({character,start,active,end});console.log('PASS pilot real '+character);
  }return {pass:true,configuration,benchmark,cases};
};
