const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
let pass=0, fail=0;
function t(name, fn) { try { fn(); pass++;console.log('  ok  '+name); } catch(e){fail++;console.log('  FAIL '+name+' -> '+e.stack); } }
function setup(mobile=false, width=900, height=520, search='') {
  const box={left:13,top:19,width,height};
  const root={classList:{add(){},remove(){}}};
  const s={NV:{capabilities:{isMobile:mobile,orientation:'landscape'}},console,Math,Number,Promise,
    location:{search},addEventListener(){},devicePixelRatio:2,
    document:{documentElement:root,addEventListener(){},getElementById(){return {getBoundingClientRect:()=>box};}}};
  s.window=s;vm.createContext(s);
  for(const file of ['js/core/viewport.js','js/engine/cameraSafety.js'])vm.runInContext(fs.readFileSync(file,'utf8'),s);
  return {nv:s.NV,box,s};
}
function near(a,b){assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);}
t('arena rectangular 1.5 veces la vista; única identidad worldMetrics',()=>{
  const {nv}=setup(); const m=nv.worldMetrics;
  assert.strictEqual(m,nv.viewport.worldMetrics);near(m.arenaW,1350);near(m.arenaH,780);
  nv.viewport.followPlayer(675,390);near(m.viewX,225);near(m.viewY,130);
  const center=nv.gameToScreen(675,390);near(center.x,463);near(center.y,279);
});
for(const [name,x,y,cx,cy] of [['izquierdo',20,390,-28,130],['derecho',1330,390,478,130],
  ['superior',675,30,225,-28],['inferior',675,760,225,288]])t('clamp visual '+name+' sin ampliar arena',()=>{
  const {nv}=setup();nv.viewport.followPlayer(x,y);near(nv.worldMetrics.viewX,cx);near(nv.worldMetrics.viewY,cy);
});
for(const [mobile,w,h,query] of [[false,900,520,''],[false,1280,800,''],[true,915,412,''],[true,844,390,''],[true,915,412,'?dynamicView=0']])t(`roundtrip cámara desplazada ${mobile?'mobile':'desktop'} ${w}x${h} ${query}`,()=>{
  const {nv}=setup(mobile,w,h,query),m=nv.worldMetrics;
  nv.viewport.followPlayer(m.arenaW/2,m.arenaH/2);
  assert(m.viewX>0&&m.viewY>0);
  for(const [x,y] of [[40,50],[w/2,h/2],[w-20,h-20]]){
    const p=nv.screenToGame(x+13,y+19),b=nv.gameToScreen(p.x,p.y);near(b.x,x+13);near(b.y,y+19);
  }
});
t('resize preserva foco y no reemplaza métricas ni mueve al jugador',()=>{
  const {nv,box}=setup(true,915,412),m=nv.worldMetrics,p={x:1100,y:440};
  nv.viewport.followPlayer(p.x,p.y);box.width=844;box.height=390;nv.viewport.refresh();
  assert.strictEqual(m,nv.worldMetrics);assert.deepEqual(p,{x:1100,y:440});
  near(m.arenaW,m.viewW*1.5);near(m.viewX,Math.min(m.arenaW-m.viewW,p.x-m.viewW/2));
  assert(m.viewX>=0&&m.viewX+m.viewW<=m.arenaW+1e-6&&m.viewY+m.viewH<=m.arenaH);
});
t('posición física puede exceder vista y se limita por arena, no por cámara',()=>{
  const {nv}=setup();const player={x:1100,y:650};nv.viewport.followPlayer(player.x,player.y);
  assert(player.x>nv.worldMetrics.viewW&&player.y>nv.worldMetrics.viewH);
  const game=fs.readFileSync('js/game.js','utf8');
  assert(game.includes('Math.min(arenaW() - 20, player.x)'));
  assert(game.includes('Math.min(arenaH() - 20, player.y)'));
  assert(game.includes('followPlayerCamera();'));
});
t('proyectil fuera de cámara sigue existiendo en arena y da 0.30s de lectura al entrar',()=>{
  const {nv}=setup();const b={x:1100,y:400};const rect=()=>({x:b.x-5,y:b.y-5,w:10,h:10});
  assert.equal(nv.cameraThreatReady(b,.03,rect(),.3),false);
  nv.viewport.followPlayer(1100,400);
  assert.equal(nv.cameraThreatReady(b,.01,rect(),.3),false);
  assert.equal(nv.cameraThreatReady(b,.30,rect(),.3),true);
  const visible={x:400,y:400};assert.equal(nv.cameraThreatReady(visible,0,{x:1000,y:400,w:10,h:10},.3),true);
});
t('hazard persistente recién descubierto reavisa 0.55s, sin teletransportarse',()=>{
  const {nv}=setup();const h={kind:'vent',x:1150,y:0,width:6,W:1350,H:780,state:'active'};
  assert.equal(nv.cameraHazardReady(h,.03),false);nv.viewport.followPlayer(1150,400);
  assert.equal(nv.cameraHazardReady(h,.03),false);assert(h.cameraWarningRemaining>0);
  assert.equal(nv.cameraHazardReady(h,.55),true);assert.equal(h.x,1150);assert.equal(h.state,'active');
});
t('culling de balas sigue usando arena, no viewport',()=>{
  const {nv,s}=setup();vm.runInContext(fs.readFileSync('js/engine/bullets.js','utf8'),s);
  const b={x:1100,y:400,vx:0,vy:0,dead:false};
  const st={bullets:[b],W:nv.worldMetrics.arenaW,H:nv.worldMetrics.arenaH,player:{x:100,y:100,character:'boti'},
    enemies:[],boss:null,CHARACTERS:{boti:{size:20}}};
  assert.equal(nv.updateBullets(0,st).bullets.length,1);
});
t('protección off-screen entra al pipeline real de colisión de bala',()=>{
  const {nv,s}=setup();vm.runInContext(fs.readFileSync('js/engine/bullets.js','utf8'),s);
  let hits=0;const b={x:1100,y:400,vx:0,vy:0,isEnemy:true,radius:5,damage:15,dead:false};
  const st={bullets:[b],W:1350,H:780,player:{x:1100,y:400,hp:100,invuln:0,character:'boti'},
    enemies:[],boss:null,CHARACTERS:{boti:{size:20}},applyPlayerDamage(){hits++;return {applied:true,killed:false};},addFloatText(){}};
  nv.updateBullets(.01,st);assert.equal(hits,0);nv.viewport.followPlayer(1100,400);
  nv.updateBullets(.01,st);assert.equal(hits,0);assert(b.cameraWarningRemaining>0);
  nv.updateBullets(.31,st);assert.equal(hits,1);
});
t('resize no pierde pickups y reanuncia enemigos y minas desplazados',()=>{
  const {nv}=setup();
  nv.keepEnemyInArena=(e,W,H)=>{e.x=Math.min(W-30,e.x);e.y=Math.min(H-30,e.y);};
  nv.beginEnemyArrival=(e)=>{e.arrival={stage:'warning'};};
  const p={x:2000,y:900},enemy={x:2000,y:900},pickup={x:2000,y:900},mine={type:'speakerMine',x:2000,y:900,state:'armed'};
  nv.reconcileArenaAfterResize({W:1350,H:780,player:p,enemies:[enemy],boss:null,pickups:[pickup],hazards:[mine]});
  near(p.x,1330);near(p.y,760);near(pickup.x,1310);assert(enemy.arrival);
  assert.equal(mine.state,'spawning');assert.equal(mine.stateTime,0);
});
t('anillo fuera de cámara no cuenta su bbox vacío como aviso visible',()=>{
  const {nv}=setup();nv.worldMetrics.arenaW=nv.worldMetrics.arenaH=4000;
  nv.viewport.followPlayer(2000,2000);
  const h={kind:'pulse',x:2000,y:2000,radius:600,width:20,state:'active'};
  assert.equal(nv.cameraHazardReady(h,.01),false);
  nv.viewport.followPlayer(2450,2000);
  assert.equal(nv.cameraHazardReady(h,.01),false);assert.equal(nv.cameraHazardReady(h,.6),true);
});
t('resize fullscreen preserva seguimiento y cambio de caja física',()=>{
  const {nv,box,s}=setup();nv.viewport.followPlayer(800,450);s.document.fullscreenElement={};
  box.width=1920;box.height=1080;nv.viewport.refresh();assert(nv.viewport.isFullscreen);
  const a=nv.gameToScreen(800,450),b=nv.screenToGame(a.x,a.y);near(b.x,800);near(b.y,450);
  near(nv.worldMetrics.viewX,350);near(nv.worldMetrics.viewY,190);
});
console.log(`RESULT camera_foundation: pass=${pass} fail=${fail}`);process.exit(fail?1:0);
