// Contratos de combate independientes del arte + render cosmético determinista.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {snapshot}=require('../tools/audit_special_contracts.cjs');
let pass=0,fail=0;
function t(name,fn){try{fn();pass++;console.log('ok '+name);}catch(e){fail++;console.error('FAIL '+name,e.stack);}}
function environment(tier='full') {
  const math=Object.create(Math);math.random=()=>{throw Error('RNG de combate usado por presentación');};
  const NV={},box={window:{NV},Math:math};
  for(const file of ['data/gameData','data/balance','render/specialEffects'])vm.runInNewContext(fs.readFileSync('js/'+file+'.js','utf8'),box);
  NV.getVisualBudget=()=>({tier,secondaryGlow:false});return NV;
}
function canvas(){
  const commands=[],stack=[];let depth=0;
  const c=new Proxy({globalAlpha:1,save(){stack.push(this.globalAlpha);depth++;},restore(){assert(depth>0);this.globalAlpha=stack.pop();depth--;}},{get(o,k){
    if(k in o)return o[k];return (...args)=>{for(const a of args)if(typeof a==='number')assert(Number.isFinite(a),k+' no finito');if(k==='arc')assert(args[2]>=0);commands.push([k,...args]);};
  }});return {c,commands,depth:()=>depth};
}
t('huella mecánica idéntica al fixture anterior al remaster',()=>{
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(snapshot())).digest('hex'),
    '450321ab21970e266c417b16fd8508baec8feb0177d8fff289ed0856cb51868c');
});
t('render puro, finito, world-space y sin RNG: 4 especiales × 3 tiempos × 3 budgets',()=>{
  for(const tier of ['full','reduced','minimal'])for(const id of ['boti','nova','rook','swarm'])for(const end of [-1,0,.4]){
    const NV=environment(tier),char=NV.CHARACTERS[id],p={character:id,x:320,y:200,phase:3,bulwark:3};
    NV.beginSpecialVisual(p,char.special);p.specialVisual.age=end<0?.2:3;p.specialVisual.end=end;
    NV.specialVisualEvent(p,'impact',300,220);NV.specialVisualEvent(p,'reflect',325,210,.4);
    const before=JSON.stringify(p),{c,commands,depth}=canvas();
    for(const layer of ['behind','front'])NV.drawSpecialPlayerLayer(c,p,char,30,layer);
    NV.applySpecialBodyTransform(c,p);NV.drawSpecialWorldEffects(c,p);
    NV.drawSpecialVFX(c,{x:p.x,y:p.y,type:char.special,life:.8});
    NV.drawSpecialMeteor(c,{x:370,y:100,vx:14,vy:450,radius:12});
    NV.drawSpecialOrbitant(c,{angle:1,orbitRadius:55,life:4,visualShot:.12,visualAim:.5},p);
    NV.drawSpecialProjectile(c,{x:400,y:240,vx:500,vy:0,specialId:'hivemind'});
    NV.drawSpecialShockwave(c,{style:'novaCollapse',x:320,y:200,maxRadius:110,life:.7});
    assert.equal(JSON.stringify(p),before);assert.equal(depth(),0);assert(commands.length>50);
    assert(commands.some(a=>a[0]==='translate'&&a[1]===370&&a[2]===100),'meteor no usa world-space');
    if(id==='nova'&&end<0)assert(commands.some(a=>a[0]==='arc'&&a[3]===70),'aura primaria desapareció');
  }
});
t('radio visual autoritativo y no collider alternativo',()=>{
  const NV=environment('minimal'),p={phase:3};NV.beginSpecialVisual(p,'phase');p.specialVisual.age=1;
  NV.BALANCE={...NV.BALANCE,PHASE_AURA_RADIUS:83};const {c,commands}=canvas();NV.drawSpecialPlayerLayer(c,p,{size:22},1,'behind');
  assert(commands.some(a=>a[0]==='arc'&&a[3]===83));assert(!('radius' in p));
});
t('feedback acotado: contactos4, eventos24, expiración y reinicio',()=>{
  const NV=environment(),p={phase:3};NV.beginSpecialVisual(p,'phase');
  for(let i=0;i<30;i++)NV.specialVisualEvent(p,'contact',i,0,0,{id:i});assert.equal(p.specialVisual.events.length,4);
  const target=p.specialVisual.events[0].target;NV.specialVisualEvent(p,'contact',0,0,0,target);assert.equal(p.specialVisual.events.length,4);
  for(let i=0;i<50;i++)NV.specialVisualEvent(p,'impact',i,0);assert.equal(p.specialVisual.events.length,24);
  NV.updateSpecialVisual(p,.4,[],[]);assert.equal(p.specialVisual.events.length,0);assert.equal(p.specialVisual.end,-1);
  p.phase=0;NV.updateSpecialVisual(p,.7,[],[]);assert.equal(p.specialVisual,null);
  NV.beginSpecialVisual(p,'meteor');NV.clearSpecialVisual(p);assert.equal(p.specialVisual,null);
  NV.specialVisualEvent(p,'impact',0,0);assert.equal(p.specialVisual,null);
});
t('ancla activa depende de entidades reales, no de duración inventada',()=>{
  const NV=environment();for(const [type,meteors,drones] of [['meteor',[{}],[]],['hivemind',[],Array(6).fill({})]]){
    const p={};NV.beginSpecialVisual(p,type);NV.updateSpecialVisual(p,6,meteors,drones);assert.equal(p.specialVisual.end,-1);
    NV.updateSpecialVisual(p,.1,[],[]);assert(p.specialVisual.end>=0);assert.equal(meteors.length,type==='meteor'?1:0);assert.equal(drones.length,type==='hivemind'?6:0);
  }
});
t('mínimo conserva 6 paneles y no agrega balas funcionales',()=>{
  const NV=environment('minimal'),p={bulwark:3};NV.beginSpecialVisual(p,'bulwark');p.specialVisual.age=1;
  const {c,commands}=canvas();NV.drawSpecialPlayerLayer(c,p,{size:26},1,'behind');
  assert.equal(commands.filter(a=>a[0]==='rotate').length,6);
  assert.equal(NV.drawSpecialProjectile(c,{x:0,y:0,vx:1,vy:0,wid:'pistol'}),false);
  assert(NV.specialVisualDiagnostics().glowCap<=8);
});
t('reflejo e impacto notifican sólo tras colisión real, con física idéntica',()=>{
  const NV=environment();const box={window:{NV},Math};
  for(const file of ['engine/bullets','engine/meteors'])vm.runInNewContext(fs.readFileSync('js/'+file+'.js','utf8'),box);
  const p={character:'rook',x:100,y:100,bulwark:3,invuln:3};NV.beginSpecialVisual(p,'bulwark');
  const near={x:100,y:100,vx:100,vy:20,damage:18,isEnemy:true},far={x:200,y:200,vx:100,vy:20,damage:18,isEnemy:true};
  const state={bullets:[near,far],W:1350,H:780,player:p,enemies:[],boss:null,CHARACTERS:NV.CHARACTERS,
    applyPlayerDamage(){throw Error('ROOK recibió daño');},addFloatText(){},killEnemy(){},applyKnockback(){},spawnExplosion(){}};
  NV.updateBullets(0,state);assert.equal(near.isEnemy,false);assert.equal(near.damage,30);assert.equal(near.pierce,1);
  assert(Math.abs(near.vx+110)<1e-9);assert.equal(near.vy,-22);assert.equal(far.isEnemy,true);
  assert.equal(p.specialVisual.events.length,1);assert.equal(p.specialVisual.events[0].kind,'reflect');
  NV.beginSpecialVisual(p,'meteor');const e={x:150,y:150,radius:10,hp:100},m={x:150,y:150,vx:0,vy:450,radius:12};
  const result=NV.updateMeteors(0,[m],{player:p,H:780,enemies:[e],boss:null},{killEnemy(){},applyKnockback(){},spawnExplosion(){}});
  assert.equal(e.hp,60);assert.equal(result.meteors.length,0);assert.equal(p.specialVisual.events[0].kind,'impact');
});
console.log('RESULT special_visual_remaster: pass='+pass+' fail='+fail);process.exitCode=fail?1:0;
