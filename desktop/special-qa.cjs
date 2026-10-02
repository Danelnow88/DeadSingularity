// QA aislado compartido por Edge y el EXE. Nunca se ejecuta en una partida normal.
// Los atlas son composiciones diagnósticas; el resto usa input y loop reales.
const assert=require('node:assert/strict');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
module.exports=async function verifySpecials(evaluate,capture,{mobile=false}={}) {
  const cases=[],atlases=[];
  assert(await evaluate('typeof NV.drawSpecialMeteor==="function" && document.getElementById("lobbyPlayBtn")!==null'));
  for(const tier of ['full','minimal']) {
    const image=await evaluate(`(() => {
      const c=document.createElement('canvas');c.width=1400;c.height=920;const ctx=c.getContext('2d');
      const original=NV.getVisualBudget;NV.getVisualBudget=()=>({tier:'${tier}',secondaryGlow:${tier==='full'}});
      try {
        ctx.fillStyle='#040815';ctx.fillRect(0,0,c.width,c.height);ctx.font='15px sans-serif';
        ['CUERPO','ACTIVACIÓN','ACTIVO','FINAL'].forEach((text,i)=>{ctx.fillStyle='#b5c4d9';ctx.fillText(text,28+i*345,26);});
        NV.CHARACTER_ORDER.forEach((id,row)=>{
          const char=NV.CHARACTERS[id],y=155+row*210;
          for(let col=0;col<4;col++) {
            const p={character:id,x:0,y:0,hp:100,maxHp:100,invuln:0,phase:0,bulwark:0,shield:0,overdrive:0};
            if(col){NV.beginSpecialVisual(p,char.special);p.specialVisual.age=col===1?.12:col===2?1.5:5.25;
              p.specialVisual.end=col===3?.28:-1;p.phase=id==='nova'&&col!==3?3:0;p.bulwark=id==='rook'&&col!==3?3:0;
              if(id==='boti')NV.specialVisualEvent(p,'impact',50,42);
              if(id==='rook')NV.specialVisualEvent(p,'reflect',14,-6,-.5);
              if(id==='nova')NV.specialVisualEvent(p,'contact',52,-18,1,{id:0});
            }
            ctx.save();ctx.translate(165+col*345,y);ctx.scale(1.25,1.25);
            if(col===1)NV.drawSpecialVFX(ctx,{type:char.special,x:0,y:0,life:.88});
            if(col===3&&id==='nova')NV.drawSpecialShockwave(ctx,{style:'novaCollapse',x:0,y:0,maxRadius:110,life:.65});
            NV.drawSpecialWorldEffects(ctx,p);NV.drawPlayer(ctx,p,NV.CHARACTERS,120);
            if(col&&id==='boti'&&col!==3)for(let i=0;i<3;i++)NV.drawSpecialMeteor(ctx,{x:-65+i*67,y:-43+i*15,vx:10,vy:460,radius:10});
            if(col&&id==='swarm'&&col!==3)for(let i=0;i<6;i++)NV.drawSpecialOrbitant(ctx,{angle:i*Math.PI/3+.3,orbitRadius:55,life:4,visualShot:i===2?.13:0,visualAim:-.5},p);
            ctx.restore();ctx.fillStyle=char.color;ctx.fillText(char.name+' · '+char.skillName,22+col*345,y+96);
            NV.drawMetaSkillIcon(ctx,char.special,324+col*345,y+90,26);
          }
        });return c.toDataURL();
      } finally {NV.getVisualBudget=original;}
    })()`);
    await capture('special-gallery-'+tier,image);atlases.push(tier);
  }
  // Coste Canvas aislado, todos los efectos simultáneos, sin cambiar el gameplay.
  const benchmark=await evaluate(`(() => {
    const c=document.createElement('canvas');c.width=900;c.height=520;const ctx=c.getContext('2d'),original=NV.getVisualBudget,out={};
    try {for(const tier of ['full','reduced','minimal']) {
      NV.getVisualBudget=()=>({tier,secondaryGlow:tier==='full'});const times=[];
      const chars=NV.CHARACTER_ORDER.map((id,i)=>{const p={character:id,x:150+i*190,y:260,phase:3,bulwark:3};NV.beginSpecialVisual(p,NV.CHARACTERS[id].special);p.specialVisual.age=1;return p;});
      for(let frame=0;frame<220;frame++) {
        const start=performance.now();ctx.clearRect(0,0,900,520);
        for(const p of chars){ctx.save();ctx.translate(p.x,p.y);for(const layer of ['behind','front'])NV.drawSpecialPlayerLayer(ctx,p,NV.CHARACTERS[p.character],frame,layer);ctx.restore();}
        for(let i=0;i<12;i++)NV.drawSpecialMeteor(ctx,{x:i*72+20,y:130,vx:10,vy:460,radius:12});
        for(let i=0;i<6;i++)NV.drawSpecialOrbitant(ctx,{angle:i*Math.PI/3,orbitRadius:55,life:3},chars[3]);
        if(frame>=20)times.push(performance.now()-start);
      }times.sort((a,b)=>a-b);out[tier]={medianMs:times[100],p95Ms:times[189],maxMs:times[199],samples:200};
    }return {cost:out,diagnostics:NV.specialVisualDiagnostics()};}finally{NV.getVisualBudget=original;}
  })()`);
  assert(benchmark.diagnostics.glowCache<=8);
  // Cada piloto en Easy/Normal/Hard. Dos stages, dificultad NO alterada por arte.
  for(const character of ['boti','nova','rook','swarm'])for(const difficulty of ['easy','normal','hard']){
    const quality=difficulty==='easy'?'performance':difficulty==='normal'?'high':'auto';
    // Cada caso vuelve al menú por recarga usando el protocolo/URL del entorno.
    await evaluate('location.reload();true');
    for(let i=0;i<100;i++){await wait(80);try{if(await evaluate('window.NV && NV.alpha && NV.getState()==="menu"'))break;}catch(_){}}
    await evaluate(`(() => {
      const run=NV.expedition.create('expedition',0);run.cleared=${difficulty==='hard'?7:1};run.bossProgression='full-roster';
      if(!NV.expedition.save({version:1,character:'${character}',wave:run.cleared,run,
        player:{hp:5000,maxHp:5000,xpToNext:100},inventory:['pistol'],currentWeapon:'pistol',levels:{pistol:1},
        kills:{},fus:{},consumables:[],shopBought:{},upgradeSlots:[],score:0,shards:0,difficulty:'${difficulty}'}))throw Error('fixture especial');
      NV.alpha.resume();NV.settings.graphics.quality='${quality}';NV.resetVisualBudget();
      ${difficulty==='hard'?'for(let i=0;i<12;i++)NV.updateVisualBudget(32);':''}
    })()`);
    for(let i=0;i<100;i++){if(await evaluate('NV.getState()==="playing"'))break;await wait(80);}
    assert.equal(await evaluate('NV.getState()'),'playing');
    // El spawn normal del piloto está abajo. Llevarlo al centro para que la
    // barra de boss preexistente no tape la inspección del cuerpo especial.
    await evaluate('NV.input.setMoveUp(true)');
    for(let i=0;i<40;i++){await wait(80);if(await evaluate('NV.getRuntimeSnapshot().player.y<=NV.worldMetrics.arenaH/2+8'))break;}
    await evaluate('NV.input.setMoveUp(false)');
    await evaluate('NV.input.setSpecial(true)');await wait(120);await evaluate('NV.input.setSpecial(false)');
    const start=await evaluate('NV.getRuntimeSnapshot()');assert(start.special.visual,character+' no activó');
    assert(await evaluate('NV.input.getSpecialInfo().name===NV.CHARACTERS[NV.getRuntimeSnapshot().player.character].skillName'),'nombre móvil/HUD desactualizado');
    if(character==='boti')assert(start.special.meteors>0&&start.special.meteors<=12);
    if(character==='swarm')assert.equal(start.special.orbitants,6);
    if(character==='nova')assert(start.special.phase>2.5&&start.special.invuln>2.5);
    if(character==='rook')assert(start.special.bulwark>2.5&&start.special.invuln>2.5);
    const name=character+'-'+difficulty+(mobile?'-mobile':'');
    await capture('activation-'+name,await evaluate('document.getElementById("game").toDataURL()'));
    await evaluate('NV.input.setMoveRight(true);NV.input.setMoveDown(true)');await wait(650);
    await evaluate('NV.input.setMoveRight(false);NV.input.setMoveDown(false);NV.input.togglePause()');
    const active=await evaluate('({s:NV.getRuntimeSnapshot(),budget:NV.getVisualBudget(),metrics:{...NV.worldMetrics}})');
    if(difficulty==='hard')assert.equal(active.budget.tier,'minimal','Auto degradado no probado');
    await capture('active-'+name,await evaluate('document.getElementById("game").toDataURL()'));
    await wait(130);assert.equal(await evaluate('NV.getRuntimeSnapshot().special.visual.age'),active.s.special.visual.age,'pausa no congela');
    assert(active.s.player.x>start.player.x&&active.s.player.y>start.player.y,'cámara/movimiento');
    await evaluate('NV.input.togglePause()');
    // Loop real hasta terminar; no escrituras de timers ni posiciones privadas.
    let ending=null;
    for(let i=0;i<90;i++) {
      await wait(65);const sample=await evaluate('NV.getRuntimeSnapshot()');
      if(sample.special.visual&&sample.special.visual.end>=0){ending=sample;break;}
    }
    assert(ending,'fin no observado '+name);
    await capture('end-'+name,await evaluate('document.getElementById("game").toDataURL()'));
    await wait(800);assert.equal(await evaluate('NV.getRuntimeSnapshot().special.visual'),null,'estado huérfano');
    const final=await evaluate('({s:NV.getRuntimeSnapshot(),performance:NV.performanceMonitor.getSnapshot()})');
    assert.equal(final.s.special.orbitants,0);assert.equal(final.s.special.meteors,0);
    assert.equal(final.s.special.phase,0);assert.equal(final.s.special.bulwark,0);
    cases.push({character,difficulty,quality,mobile,start,active,ending,final});
    console.log('PASS special real '+name);
  }
  const edges=[];
  for(const [character,right,bottom] of [['boti',false,false],['nova',true,false],['rook',false,true],['swarm',true,true]]) {
    await evaluate('location.reload();true');
    for(let i=0;i<100;i++){await wait(80);try{if(await evaluate('window.NV && NV.alpha && NV.getState()==="menu"'))break;}catch(_){}}
    await evaluate(`(() => {
      const run=NV.expedition.create('expedition',0);run.cleared=7;run.bossProgression='full-roster';
      NV.expedition.save({version:1,character:'${character}',wave:7,run,player:{hp:5000,maxHp:5000,xpToNext:100},
        inventory:['pistol'],currentWeapon:'pistol',levels:{pistol:1},kills:{},fus:{},consumables:[],
        shopBought:{},upgradeSlots:[],score:0,shards:0,difficulty:'normal'});NV.alpha.resume();
      NV.setFirePolicy('manual');
    })()`);
    for(let i=0;i<100;i++){if(await evaluate('NV.getState()==="playing"'))break;await wait(80);}
    await evaluate(`NV.input.setMove${right?'Right':'Left'}(true);NV.input.setMove${bottom?'Down':'Up'}(true)`);
    let atEdge=false;
    for(let i=0;i<130;i++) {
      await wait(100);atEdge=await evaluate(`(() => {const p=NV.getRuntimeSnapshot().player,m=NV.worldMetrics;
        return Math.abs(p.x-(${right?'m.arenaW-20':'20'}))<.01&&Math.abs(p.y-(${bottom?'m.arenaH-20':'30'}))<.01;})()`);
      if(atEdge)break;
    }
    assert(atEdge,'no alcanzó esquina '+character+' '+JSON.stringify(await evaluate('({s:NV.getRuntimeSnapshot(),m:{...NV.worldMetrics}})')));
    await evaluate(`NV.input.setMove${right?'Right':'Left'}(false);NV.input.setMove${bottom?'Down':'Up'}(false);NV.input.setSpecial(true)`);
    await wait(180);await evaluate('NV.input.setSpecial(false);NV.input.togglePause()');
    const sample=await evaluate('({s:NV.getRuntimeSnapshot(),metrics:{...NV.worldMetrics}})');assert(sample.s.special.visual);
    await capture('corner-'+character+(mobile?'-mobile':''),await evaluate('document.getElementById("game").toDataURL()'));
    edges.push({character,right,bottom,...sample});console.log('PASS special corner '+character);
  }
  return {pass:true,atlases,benchmark,cases,edges};
};
