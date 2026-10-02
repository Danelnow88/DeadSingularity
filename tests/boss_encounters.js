const assert = require('assert'), fs = require('fs'), vm = require('vm');
const s = { window: { NV: {} }, console, Math };
for (const file of ['data/gameData', 'data/balance', 'engine/boss', 'engine/bossEncounters']) vm.runInNewContext(fs.readFileSync('js/' + file + '.js', 'utf8'), s);
const NV = s.window.NV;
assert(NV.bossEncounterTiming('easy').windup > NV.bossEncounterTiming('normal').windup);
assert(NV.bossEncounterTiming('hard').recovery < NV.bossEncounterTiming('normal').recovery);
function setup(type, hp) {
  const b = { ...type, x: 450, y: 120, hp: hp || 1000, maxHp: 1000, timer: 0, atkTimer: 0, phase2: false, primaryAttack: type.attack };
  const st = { boss: b, player: { x: 450, y: 430 }, enemies: [], bullets: [], W: 900, H: 520, wave: 5, score: 0, shards: 0,
    MAX_BULLETS: 200, MAX_ENEMY_BULLETS: 40, enemyBulletCount: () => st.bullets.length,
    sfx: { bossAttack: new Proxy({}, { get: () => () => {} }) }, showBanner() {}, triggerFlash() {}, spawnExplosion() {}, triggerWaveVictory() {},
    spawnMinion(x,y,variant) { if (st.enemies.length >= 29) return false; st.enemies.push({ x,y,summonVariant: variant }); return true; } };
  return { b, st };
}
// Los treinta pares jefe/dificultad conservan aviso completo y salida real.
for (const [index,count] of [[0,3],[1,5],[3,11],[5,10],[8,7],[9,15]]) {
  const {b,st}=setup(NV.BOSS_TYPES[index]);st.difficulty='hard';
  for(let i=0;i<100&&(!b.encounter||b.encounter.stage!=='windup');i++)NV.updateBossEncounter(b,1/60,st);
  assert.equal(b.encounter.rays.length,count,b.name+': Difícil usa patrón avanzado desde fase uno');
}
for (const type of NV.BOSS_TYPES) {
  const {b,st}=setup(type);st.difficulty='hard';b.phase2=true;
  for(let i=0;i<100&&(!b.encounter||b.encounter.stage!=='windup');i++)NV.updateBossEncounter(b,1/60,st);
  const e=b.encounter,locked=e.rays.slice(),pulses=e.pulses;
  assert(pulses>=2,type.name+': fase dos añade capas desde las miras fijadas');
  assert.equal(st.bullets.length,0);st.player.x=250;
  for(let i=0;i<140&&e.cast===0;i++)NV.updateBossEncounter(b,1/60,st);
  assert.equal(st.bullets.length,locked.length*pulses,type.name+': ejecuta todas las capas dentro del cap');
  for(let i=0;i<st.bullets.length;i++){
    const a=locked[i%locked.length],bullet=st.bullets[i];
    assert(Math.abs(Math.atan2(bullet.vy,bullet.vx)-Math.atan2(Math.sin(a),Math.cos(a)))<1e-6,'segunda capa no cambia de mira');
  }
  if(type.attack==='summon')assert.equal(st.enemies.length,3,'no invoca tres esbirros adicionales por capa');
}
for (const type of NV.BOSS_TYPES) for (const difficulty of ['easy', 'normal', 'hard']) {
  const { b, st } = setup(type);
  st.difficulty = difficulty;
  let damage = 0;
  st.applyPlayerDamage = () => { damage++; return { applied: true }; };
  for (let i = 0; i < 300; i++) NV.updateBossEncounter(b, 1 / 60, st);
  assert(damage > 0, type.name + ' no puede ignorar al jugador quieto en ' + difficulty);
  const dodge = setup(type); dodge.st.difficulty = difficulty;
  dodge.st.applyPlayerDamage = () => { throw new Error('la zona fija debe esquivarse: ' + type.name); };
  for (let i = 0; i < 300; i++) {
    NV.updateBossEncounter(dodge.b, 1 / 60, dodge.st);
    const mark = dodge.b.encounter.idlePressure;
    if (mark) dodge.st.player.x = mark.x + mark.radius + 30;
  }
}
// TITÁN alterna abanico concentrado/abierto; en fase dos agrega carriles avisados.
{
  const { b, st } = setup(NV.BOSS_TYPES[1]);
  const widths = [];
  for (let i = 0; i < 550; i++) {
    NV.updateBossEncounter(b, 1 / 60, st);
    if (b.encounter.stage === 'windup' && widths[b.encounter.cast] == null) {
      const r = b.encounter.rays; widths[b.encounter.cast] = r.at(-1) - r[0];
    }
  }
  assert(widths[1] > widths[0], 'la segunda lectura es más abierta');
  b.phase2 = true;
  for (let i = 0; i < 200 && b.encounter.rays.length !== 5; i++) NV.updateBossEncounter(b, 1 / 60, st);
  assert.equal(b.encounter.rays.length, 5, 'fase dos anuncia los cinco carriles');
}
for (const type of NV.BOSS_TYPES) {
  const { b, st } = setup(type);
  for (let i = 0; i < 40; i++) NV.updateBossEncounter(b, 1/60, st);
  assert.equal(b.encounter.stage, 'windup', type.name + ': tiene aviso');
  assert.equal(st.bullets.length, 0, type.name + ': cero daño antes del aviso');
  const locked = b.encounter.rays.slice(); st.player.x = 0;
  for (let i = 0; i < 100; i++) NV.updateBossEncounter(b, 1/60, st);
  assert(st.bullets.length > 0, type.name + ': ejecuta');
  assert(Math.abs(Math.atan2(st.bullets[0].vy, st.bullets[0].vx) - Math.atan2(Math.sin(locked[0]), Math.cos(locked[0]))) < 1e-6, 'puntería fijada durante aviso');
  assert(st.bullets.every(p => p.stunChance === 0), 'no stun aleatorio en ráfagas');
  b.phase2 = true;
  for (let i = 0; i < 1500; i++) NV.updateBossEncounter(b, 1/60, st);
  assert(st.bullets.length <= 40, 'respeta presupuesto de balas');
  const before = st.bullets.length; b.hp = 0; NV.updateBossEncounter(b, 5, st); assert.equal(st.bullets.length, before, 'muerto no dispara');
}
// JEFE: el primer turno conserva la línea didáctica; el segundo obliga a leer
// un abanico de tres carriles. Las tres líneas quedan fijadas en el aviso.
{
  const { b, st } = setup(NV.BOSS_TYPES[0]);
  let first = null, second = null;
  for (let i = 0; i < 500; i++) {
    NV.updateBossEncounter(b, 1 / 60, st);
    if (b.encounter.stage !== 'windup') continue;
    if (b.encounter.cast === 0 && !first) first = b.encounter.rays.slice();
    if (b.encounter.cast === 1 && !second) { second = b.encounter.rays.slice(); break; }
  }
  assert(first && first.length === 1, 'primer aviso: línea única');
  assert(second && second.length === 3, 'segundo aviso: tres carriles');
  assert(second[0] < second[1] && second[1] < second[2], 'abanico ordenado y esquivable');
  assert.equal(b.encounter.label, 'ABANICO · BUSCÁ UN LADO');
  const locked = second.slice(); st.player.x = 100;
  for (let i = 0; i < 120 && b.encounter.cast < 2; i++) NV.updateBossEncounter(b, 1 / 60, st);
  assert.equal(b.encounter.cast, 2, 'terminó el segundo patrón');
  assert.equal(st.bullets.length, 9, 'tres proyectiles de línea y seis de abanico');
  const angles = st.bullets.slice(3, 6).map(p => Math.atan2(p.vy, p.vx));
  for (let i = 0; i < 3; i++) assert(Math.abs(angles[i] - locked[i]) < 1e-6, 'trayectoria fijada durante aviso');
}
{
  const { b, st } = setup(NV.BOSS_TYPES[2]);
  for (let i = 0; i < 90 && (!b.encounter || b.encounter.stage !== 'windup'); i++) NV.updateBossEncounter(b, 1/60, st);
  assert.equal(b.encounter.origins.length,3);
  const origins = b.encounter.origins.map(o=>({...o})), locked = b.encounter.rays.slice();
  st.player.x=100;
  for (let i=0;i<90 && b.encounter.cast<1;i++) NV.updateBossEncounter(b,1/60,st);
  assert.equal(st.enemies.length,3);
  for(let i=0;i<3;i++) {
    assert.equal(st.bullets[i].x,origins[i].x); assert.equal(st.bullets[i].y,origins[i].y);
    assert(Math.abs(Math.atan2(st.bullets[i].vy,st.bullets[i].vx)-locked[i])<1e-6);
  }
  b.phase2=true;
  for(let i=0;i<120 && b.encounter.stage!=='windup';i++) NV.updateBossEncounter(b,1/60,st);
  assert.equal(b.encounter.origins,null); assert.equal(b.encounter.pulses,2,'fase dos duplica el abanico avisado');
}
const split = setup(NV.BOSS_TYPES[8]); NV.updateBossEncounter(split.b, .1, split.st); split.b.phase2 = true; NV.updateBossEncounter(split.b, .1, split.st);
// NÉMESIS: dos baterías alternan con doble abanico.
for(const phase2 of [false,true]) {
  const {b,st}=setup(NV.BOSS_TYPES[5]);b.phase2=phase2;
  for(let i=0;i<120&&(!b.encounter||b.encounter.stage!=='windup');i++)NV.updateBossEncounter(b,1/60,st);
  const e=b.encounter,origins=e.origins.map(o=>({...o})),locked=e.rays.slice();
  assert.equal(locked.length,phase2?10:6);assert.equal(e.pulses,1);
  assert.equal(new Set(origins.map(o=>o.x)).size,2,'dos baterías reales');
  st.player.x=100;
  for(let i=0;i<120&&e.cast<1;i++)NV.updateBossEncounter(b,1/60,st);
  for(let i=0;i<locked.length;i++){
    assert.equal(st.bullets[i].x,origins[i].x);assert.equal(st.bullets[i].y,origins[i].y);
    assert(Math.abs(Math.atan2(st.bullets[i].vy,st.bullets[i].vx)-locked[i])<1e-6);
  }
  for(let i=0;i<120&&e.stage!=='windup';i++)NV.updateBossEncounter(b,1/60,st);
  assert.equal(e.origins,null);assert.equal(e.rays.length,5);assert.equal(e.pulses,2);
}
for (const phase2 of [false,true]) {
  const {b,st}=setup(NV.BOSS_TYPES[4]);b.phase2=phase2;
  let first=null,second=null;
  for(let i=0;i<500;i++) {
    NV.updateBossEncounter(b,1/60,st);
    if(b.encounter.stage!=='windup')continue;
    if(b.encounter.cast===0&&!first)first={origins:b.encounter.origins.map(o=>({...o})),rays:b.encounter.rays.slice()};
    if(b.encounter.cast===1&&!second){second=b.encounter.rays.slice();break;}
  }
  assert(first && second); assert.equal(first.origins.length,3);
  assert(first.rays.every(a=>a===first.rays[0]),'lanzas paralelas');
  assert.equal(second.length,phase2?5:3);
  for(let i=0;i<3;i++) {
    assert.equal(st.bullets[i].x,first.origins[i].x);
    assert.equal(st.bullets[i].y,first.origins[i].y);
  }
}
assert.equal(split.st.enemies.length, 3); assert(split.st.enemies.every(e => e.radius === 17 && e.hp > 0 && e.summonVariant === 'mutant'));
// Los cuatro encuentros tardíos alternan dos lecturas en ambas fases.
// Cada bala nace exactamente en su origen anunciado y nunca reajusta la mira.
for (const index of [6, 7, 8, 9]) for (const phase2 of [false, true]) {
  const { b, st } = setup(NV.BOSS_TYPES[index]); b.phase2 = phase2;
  for (let cast = 0; cast < 2; cast++) {
    for (let i = 0; i < 180 && (!b.encounter || b.encounter.stage !== 'windup'); i++) NV.updateBossEncounter(b, 1/60, st);
    const e = b.encounter, locked = e.rays.slice();
    assert.equal(e.cast, cast); assert.equal(st.bullets.length, 0, 'cero balas durante aviso');
    const origins = e.origins ? e.origins.map(o => ({ ...o })) : locked.map(() => ({ x:e.x, y:e.y+36 }));
    const expected = index === 6 ? (cast === 0 ? 3 : phase2 ? 5 : 3)
      : index === 7 ? (cast === 0 ? 6 : phase2 ? 11 : 9)
      : index === 8 ? (cast === 0 ? phase2 ? 7 : 5 : phase2 ? 13 : 9)
      : cast === 0 ? phase2 ? 15 : 9 : phase2 ? 15 : 13;
    assert.equal(locked.length, expected, b.name + ': identidad/fase');
    if (cast === 1 && index !== 6) {
      assert(Number.isFinite(e.gap));
      assert(!locked.some(a => Math.abs(Math.atan2(Math.sin(a-e.gap), Math.cos(a-e.gap))) < .001), 'hueco real');
      const aim = Math.atan2(st.player.y-(e.y+36),st.player.x-e.x);
      assert(Math.abs(Math.atan2(Math.sin(e.gap-aim),Math.cos(e.gap-aim))) > .2, 'hueco no regalado al jugador quieto');
    }
    st.player.x = cast === 0 ? 350 : 450;
    for (let i=0;i<180 && e.cast===cast;i++) NV.updateBossEncounter(b,1/60,st);
    assert.equal(st.bullets.length, expected);
    for (let i=0;i<expected;i++) {
      assert.equal(st.bullets[i].x,origins[i].x); assert.equal(st.bullets[i].y,origins[i].y);
      assert(Math.abs(Math.atan2(st.bullets[i].vy,st.bullets[i].vx)-Math.atan2(Math.sin(locked[i]),Math.cos(locked[i])))<1e-6);
    }
    st.bullets.length = 0;
  }
}
const saturated = setup(NV.BOSS_TYPES[8]); saturated.st.enemies = Array.from({ length: 29 }, () => ({})); saturated.b.phase2 = true;
NV.updateBossEncounter(saturated.b, .1, saturated.st); assert.equal(saturated.st.enemies.length, 29);
assert.equal(NV.bossEncounterHp(NV.BOSS_TYPES[0], 5, 1), 1440);
assert(NV.bossEncounterHp(NV.BOSS_TYPES[9], 20, 1) < 6000);
// Quedarse quieto no puede resolver un boss: aparece una zona anunciada y el
// daño sólo ocurre si el jugador no sale del círculo.
{
  const idle = setup(NV.BOSS_TYPES[0]);
  let pressureHits = 0;
  idle.st.applyPlayerDamage = (damage, meta) => { pressureHits++; assert(damage >= 16 && damage <= 32); assert.equal(meta.cause, 'boss-idle-pressure'); return { applied: true }; };
  for (let i = 0; i < 170; i++) NV.updateBossEncounter(idle.b, 1 / 60, idle.st);
  assert(idle.b.encounter.idlePressure, 'debe avisar al jugador inmóvil');
  assert.equal(pressureHits, 0, 'el aviso no daña');
  for (let i = 0; i < 65; i++) NV.updateBossEncounter(idle.b, 1 / 60, idle.st);
  assert.equal(pressureHits, 1, 'quedarse dentro recibe un solo impacto');
  const dodge = setup(NV.BOSS_TYPES[1]);
  dodge.st.applyPlayerDamage = () => { throw new Error('moverse fuera del círculo debe esquivar'); };
  for (let i = 0; i < 170; i++) NV.updateBossEncounter(dodge.b, 1 / 60, dodge.st);
  dodge.st.player.x += 100;
  for (let i = 0; i < 65; i++) NV.updateBossEncounter(dodge.b, 1 / 60, dodge.st);
}
let hits = 0; const enemy = { hp: 100, x: 200, y: 200, fusionLevel: 3 };
const f = { enemies: [enemy], player: { x: 200, y: 200 }, applyPlayerDamage(d) { hits++; assert(d <= 22); return {}; } };
NV.updateFusionThreats(3.6, f); assert.equal(hits, 0); assert.equal(enemy.fusionPulse.stage, 'windup');
f.player.x = 300; NV.updateFusionThreats(.86, f); assert.equal(hits, 0, 'salir del aviso evita todo el daño');
NV.updateFusionThreats(4.6, f); f.player.x = 200; NV.updateFusionThreats(.86, f); assert.equal(hits, 1);
console.log('RESULT boss_encounters: diez identidades, aviso, puntería, recuperación, caps, fase 2 y fusión OK');
