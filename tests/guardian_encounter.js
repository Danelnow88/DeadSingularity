const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const s = { window: { NV: {} }, Math };
vm.runInNewContext(fs.readFileSync('js/engine/bossEncounters.js', 'utf8'), s);
const NV = s.window.NV, TAU = Math.PI * 2;
const angleDistance = (a, b) => Math.abs(Math.atan2(Math.sin(a-b), Math.cos(a-b)));
for (const phase2 of [false, true]) for (const cast of [0, 2, 3]) {
  const player = { x: 450, y: 430, radius: 9 };
  const pattern = NV.guardianRingPattern(450, 156, player, 900, 520, phase2, cast);
  assert.equal(pattern.rays.length, phase2 ? 11 : 9);
  assert(pattern.rays.some(a => angleDistance(a, Math.PI/2) < 1e-8), 'quedarse en el punto anunciado enfrenta un proyectil');
  // Distancia perpendicular del carril vacío a cada trayectoria radial.
  // Sólo rayos hacia delante pueden alcanzar el cuerpo; nunca usar el brillo.
  for (const distance of [65, 100, 200, 350]) for (const a of pattern.rays) {
    const delta = angleDistance(a, pattern.gap);
    if (delta < Math.PI/2) assert(distance * Math.sin(delta) > 14, 'hueco mayor que núcleo 9 + proyectil 5');
  }
}
for (const player of [{x:25,y:300},{x:875,y:300},{x:450,y:495}]) {
  const p = NV.guardianRingPattern(450,156,player,900,520,false,0);
  const {x,y} = p.safePoint;
  assert(x>=24-1e-6 && x<=876+1e-6 && y>=24-1e-6 && y<=496+1e-6,'escape alcanzable dentro de los bordes');
}
function setup(phase2, cast) {
  const b = { x:450,y:120,hp:1000,maxHp:1000,phase2,primaryAttack:'spread',
    encounter:{stage:'recovery',t:0,cast,phase:phase2,rays:[],idleAnchorX:450,idleAnchorY:430} };
  const st = { player:{x:450,y:430},W:900,H:520,difficulty:'normal',bullets:[],MAX_BULLETS:200,MAX_ENEMY_BULLETS:40 };
  st.enemyBulletCount = () => st.bullets.length;
  return {b,st};
}
for (const phase2 of [false,true]) for (const cast of [0,1]) {
  const {b,st} = setup(phase2,cast);
  NV.updateBossEncounter(b,1/60,st);
  assert.equal(b.encounter.stage,'windup'); assert.equal(st.bullets.length,0);
  const e = b.encounter, locked = e.rays.slice(), gap = e.gap;
  assert.equal(locked.length,phase2 && cast===1 ? 3 : phase2 ? 11 : 9);
  assert.equal(Number.isFinite(gap),!(phase2 && cast===1));
  st.player.x=100;
  for(let i=0;i<100 && e.stage!=='recovery';i++) NV.updateBossEncounter(b,1/60,st);
  assert.equal(st.bullets.length,locked.length);
  for(let i=0;i<locked.length;i++) assert(angleDistance(Math.atan2(st.bullets[i].vy,st.bullets[i].vx),locked[i])<1e-8,'aviso coincide con ejecución');
  assert(e.t>=1.2,'ventana para atacar tras la descarga, también en fase dos');
}
console.log('RESULT guardian_encounter: hueco real, puntería fija, bordes, dos lecturas y recuperación OK');
