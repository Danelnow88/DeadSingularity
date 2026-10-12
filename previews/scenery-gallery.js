(() => {
  'use strict';
  const NV=window.NV;
  NV.sceneryPreviewGallery=true;NV.dimensionIllustratedScenery=true;NV.inertiaSpriteBaseUrl='../assets/dimension-cores/';
  NV.settings={graphics:{quality:'high',particles:true,heavyVfx:true},controls:{firePolicy:'manual'},gameplay:{difficulty:'normal'}};
  const candidates=new Set(['threshold','void-heart','drowned-vault','ash-moon','jade-basin','glass-desert']);
  const descriptions=['Raíces oscuras dispersas y agua fría sobre suelo azul carbón.','Forja estelar, gigante eclipsado y restos de roca.','Fisura violeta y masas fragmentadas.','Impresiones de arcos orgánicos sobre sombra negra y ciruela apagada.','Ruinas fósiles y ceniza negra con acentos rojizos.','Formas de obsidiana y depósitos de jade con iluminación verde apagada.','Agua azul nocturna, raíces sumergidas y reflejos discretos.','Reliquias de vidrio ahumado sobre arena negra, con bordes azul-violeta.'];
  const selected=new URLSearchParams(location.search).get('map');let showCombat=true;const cards=[];
  if(selected)document.getElementById('places').className='selected';
  const trial=NV.dimensionTrialRoster(),actors=new Map();
  function actor(type,index,elite,boss){
    const id=type.id||type.visualId||'boss-'+index;
    if(!actors.has(id)){
      const e={x:0,y:0,radius:type.radius,color:type.color,shape:type.shape,hp:type.hp,maxHp:type.hp,damage:type.damage,behavior:type.behavior,enemyTypeId:type.id,visualId:type.visualId||type.id,isElite:!!elite,isBoss:!!boss,dead:false,angle:0,hitFlash:0};
      if(type.rosterVisualId)e.rosterVisualId=type.rosterVisualId;
      if(type.previewMotionPolish)e.previewMotionPolish=true;
      if(type.visualId==='elite_phantom')e.phantomState='roam_stalk';
      if(boss)NV.attachBossDesign(e,index);
      if(NV.isDimensionalThreat(e))e.dimensionalThreat={kind:NV.DIMENSIONAL_THREATS[e.enemyTypeId].kind,phase:'position',age:1,elapsed:0,geometry:null};
      actors.set(id,e);
    }
    return actors.get(id);
  }
  function combat(ctx){
    const group=document.getElementById('group').value,player={character:'boti',x:675,y:390,hp:120,maxHp:120,invuln:0,stun:0,angle:0};
    if(group==='core'){for(let i=0;i<3;i++)NV.drawInertiaChamber(ctx,{age:2,collected:0,required:1,target:{x:300+i*370,y:400,pattern:i,hp:360,maxHp:360,radius:24,windup:0,vx:0,vy:0}});return;}
    let list;
    if(group==='common')list=trial.enemies.filter(t=>!NV.DIMENSIONAL_THREATS[t.id]);
    else if(group==='elite')list=trial.elites.concat(trial.enemies.filter(t=>!!NV.DIMENSIONAL_THREATS[t.id]));
    else list=NV.BOSS_TYPES;
    list.forEach((t,i)=>{
      const e=actor(t,i,trial.elites.includes(t),group==='boss');e.x=150+(i%5)*260;e.y=190+Math.floor(i/5)*320;
      if(e.isBoss)NV.drawSpectralBoss2D(ctx,e,120,player,null);
      else if(NV.drawDimensionalThreatBody(ctx,e)){}
      else if(NV.hasCommonEnemyVisual(e.enemyTypeId))NV.drawEnemy(ctx,e,120,player,null,2);
      else NV.drawSpectralEnemy2D(ctx,e,120,player,null);
    });
    if(group==='common')for(const [i,id] of ['boti','nova','rook','swarm'].entries()){const p=Object.assign({},player,{character:id,x:400+i*185,y:650});NV.drawPlayer(ctx,p,NV.CHARACTERS,120);}
    else NV.drawPlayer(ctx,player,NV.CHARACTERS,120);
    for(let i=0;i<5;i++)NV.drawHostileProjectile(ctx,{x:530+i*65,y:320,radius:5,vx:200,vy:0,sourceType:'ranged',projectileStyle:'genericBolt'});
    for(let i=0;i<3;i++)NV.drawBulletShape(ctx,{x:600+i*45,y:450,vx:500,vy:0,color:'#fff',radius:3},NV.BULLET_DEFS.pistol,0);
  }
  function drawCard(card){const {c,i}=card,ctx=c.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,c.width,c.height);ctx.scale(c.width/1350,c.height/780);NV.drawSectorBackdrop(ctx,1350,780,120,1+i*5,{preview:true,tier:'full'});if(showCombat)combat(ctx);}
  function redraw(){cards.forEach(drawCard);const status=NV.dimensionSceneryStatus();document.getElementById('status').textContent=status.some(s=>s.error)?'No se pudo cargar una propuesta.':status.length===3&&status.every(s=>s.ready)?'Tres propuestas listas · solo galería.':'Cargando tres propuestas…';}
  NV.DIMENSION_VISUALS.forEach((p,i)=>{
    if(selected&&selected!==p.id)return;
    const card=document.createElement('article');card.id=p.id;if(candidates.has(p.id))card.className='candidate';
    const title=document.createElement('h2');title.textContent=p.name;card.append(title);
    const badge=document.createElement('div');badge.className='badge';badge.textContent=candidates.has(p.id)?'PROPUESTA · TERRENO SÓLIDO':'DISEÑO ANTERIOR';card.append(badge);
    const c=document.createElement('canvas');c.width=1080;c.height=624;card.append(c);
    const desc=document.createElement('p');desc.textContent=descriptions[i];card.append(desc);
    const link=document.createElement('a');link.href='?map='+p.id;link.textContent='Ver este mapa ampliado';card.append(link);
    document.getElementById('places').append(card);cards.push({c,p,i});
  });
  document.getElementById('contrast').onclick=e=>{showCombat=!showCombat;e.currentTarget.setAttribute('aria-pressed',String(showCombat));e.currentTarget.textContent=showCombat?'Ocultar combate':'Ver contraste con combate';redraw();};
  document.getElementById('group').onchange=redraw;
  window.addEventListener('dimension-scenery-loaded',redraw);window.addEventListener('inertia-sprites-updated',redraw);
  NV.preloadDimensionScenery([0,3,4,5,6,7]);NV.preloadInertiaSprites();redraw();
})();
