// ===== TEST: C2 director, Dron y evolución de fusiones =====
const fs = require('fs'), vm = require('vm');
let pass = 0, fail = 0;
function ok(value, message) { if (!value) throw new Error(message); }
function t(name, fn) { try { fn(); pass++; console.log('  ok  ' + name); } catch (err) { fail++; console.log('  FAIL ' + name + ' -> ' + err.message); } }

function setup() {
  const math = Object.create(Math); math.random = () => 0.99;
  const sandbox = { window: { NV: {} }, console, Math: math, Number, Object, Array, Set, Map, WeakMap, JSON };
  for (const file of ['js/data/balance.js', 'js/data/gameData.js', 'js/engine/hostileBudget.js', 'js/engine/enemies.js', 'js/engine/enemyArrival.js', 'js/engine/bossEncounters.js']) {
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
  }
  return sandbox.window.NV;
}
function drone(x, y) {
  return { x, y, hp: 25, maxHp: 25, speed: 75, radius: 11, color: '#f07bad', shape: 'circle', score: 10, xp: 10,
    enemyTypeId: 'drone', hostileClass: 'light', dead: false, behavior: 'chase', angle: 1, damage: 12,
    knockVelX: 0, knockVelY: 0, knockbackRes: 0, contactCd: 0, hitFlash: 0, hitSlowUntil: 0, hitSlowImmunity: 0, stun: 0 };
}
function enemyState(NV, enemies, player, hit) {
  return { enemies, player, bullets: [], W: 900, H: 520, wave: 8, waveEvent: null,
    MAX_BULLETS: 200, MAX_ENEMY_BULLETS: 40, MAX_HOSTILES: 30, MAX_HEAVY_HOSTILES: 7,
    enemyBulletCount: () => 0, applyPlayerDamage: hit, addFloatText() {}, spawnExplosion() {}, onKill(e) { e.dead = true; }, boss: null };
}

console.log('enemy_director_c2:');

t('director conserva dos refills libres e intercala una escuadra legal', () => {
  const NV = setup();
  ok(NV.planWaveSpawnBatch(6, 5, 0, NV.ENEMY_TYPES).length === 0, 'ciclo 0 dejó de ser libre');
  ok(NV.planWaveSpawnBatch(6, 5, 1, NV.ENEMY_TYPES).length === 0, 'ciclo 1 dejó de ser libre');
  const plan = NV.planWaveSpawnBatch(6, 5, 2, NV.ENEMY_TYPES);
  ok(plan.length === 5 && plan[0] === 'tank', 'escuadra mid=' + plan.join(','));
  ok(plan.includes('specter_guard') && plan.includes('specter_archer'),'la escuadra combina artillería, protección y presión de ruta');
  const available = new Set(NV.ENEMY_TYPES.filter((entry) => (entry.minWave || 1) <= 6).map((entry) => entry.id));
  ok(plan.every((id) => available.has(id)), 'incluyó enemigo bloqueado');
  ok(NV.planWaveSpawnBatch(20, 3, 2, NV.ENEMY_TYPES).length <= 3, 'excedió tamaño solicitado');
  const firstZone = NV.planWaveSpawnBatch(3,5,5,NV.ENEMY_TYPES);
  ok(firstZone.includes('specter_archer') && firstZone.includes('specter_grunt'),'oleada 3 introduce roles desbloqueados');
  const firstWave = NV.planWaveSpawnBatch(1,5,5,NV.ENEMY_TYPES);
  ok(!firstWave.some(id=>id.indexOf('specter_')===0),'primera oleada conserva desbloqueos y aprendizaje');
});

t('Dron forma, avisa sin contacto y sólo golpea durante la presión', () => {
  const NV = setup(), e = drone(100, 100), player = { x: 230, y: 100, hp: 100, maxHp: 100, invuln: 0, stun: 0 };
  let hits = 0;
  const st = enemyState(NV, [e], player, () => { hits++; return { applied: true, dodged: false, killed: false, crit: false }; });
  NV.updateEnemies(0, st); e.droneCooldown = 0; NV.updateEnemies(0, st);
  ok(e.droneState === 'signal', 'no inició señal');
  player.x = e.x + 5; player.y = e.y; NV.updateEnemies(0.1, st);
  ok(hits === 0 && !e.dead, 'señal produjo contacto invisible');
  NV.updateEnemies(NV.ENEMY_ROLE_REWORK.drone.signal, st);
  ok(e.droneState === 'press', 'no entró en presión');
  NV.updateEnemies(0.01, st);
  ok(hits === 1 && e.dead, 'presión no resolvió el contacto básico');
});

t('escuadra aparece agrupada, interior y anunciada, sin exceder caps ni alterar Lab', () => {
  const NV=setup(),plan=NV.planWaveSpawnBatch(6,5,2,NV.ENEMY_TYPES);
  for(const [W,H] of [[900,520],[1155,520],[360,240]]) for(const cycle of [0,1,2,3]) {
    const st={enemies:[],boss:null,wave:6,W,H,player:{x:W/2,y:H/2,radius:20},
      ENEMY_TYPES:NV.ENEMY_TYPES,cycle,announceSpawn:true,MAX_HOSTILES:30,MAX_HEAVY_HOSTILES:7};
    const positions=NV.waveSquadPositions(plan,st);
    ok(positions.length===plan.length,'no conserva integrantes');
    for(let i=0;i<plan.length;i++) {
      ok(NV.spawnEnemy({...st,forceTypeId:plan[i],spawnPosition:positions[i]}),'falló spawn legal');
      const e=st.enemies.at(-1),bound=NV.enemyArenaPosition(e,W,H);
      ok(e.x===bound.x&&e.y===bound.y,'fuera del margen visual');
      ok(e.arrival&&e.arrival.stage==='warning'&&!NV.isEnemyTargetable(e),'sin aviso');
      if(W>=900)ok(Math.hypot(e.x-st.player.x,e.y-st.player.y)>100,'demasiado cerca del piloto');
    }
    const guard=st.enemies.find(e=>e.enemyTypeId==='specter_guard');
    const archer=st.enemies.find(e=>e.enemyTypeId==='specter_archer');
    ok(Math.hypot(guard.x-archer.x,guard.y-archer.y)<=90,'no pueden cooperar dentro del alcance de protección');
    if(W===900&&cycle===0) {
      const live=enemyState(NV,st.enemies,st.player,()=>({applied:false,killed:false}));
      let protectedFrames=0;
      for(let frame=0;frame<180;frame++) {
        NV.updateEnemies(1/60,live);
        if(NV.getGuardProtectionSource(archer)===guard)protectedFrames++;
      }
      ok(protectedFrames>20,'la proximidad no activó protección real después del aviso');
    }
    st.MAX_HOSTILES=5;ok(!NV.spawnEnemy(st),'los avisos no reservan presupuesto');
  }
  const game=fs.readFileSync('js/game.js','utf8');
  ok(game.includes('composition.length > 1 && NV.waveSquadPositions'),'formación desconectada del refill real');
});

t('Tanque puede anunciar artillería frente a armas de media/larga distancia', () => {
  const NV=setup(),e={...drone(100,100),enemyTypeId:'tank',speed:35,radius:20};
  const player={x:520,y:100,hp:100,maxHp:100,invuln:0,stun:0};
  const st=enemyState(NV,[e],player,()=>({applied:true}));
  NV.updateEnemies(.66,st);
  ok(e.tankCannonState==='windup','el tanque seguía acercándose a 420 px sin usar el cañón');
  ok(st.bullets.length===0,'el alcance no elimina el aviso');
  const aimX=e.tankCannonTargetX;player.y=300;
  NV.updateEnemies(NV.ENEMY_ROLE_REWORK.tank.windup+.01,st);
  ok(st.bullets.length===1 && e.tankCannonState==='recovery','descarga única y recuperación');
  ok(e.tankCannonTargetX===aimX,'puntería fijada');
});

t('derribar una fusión siempre paga bonus acotado y nombre de hito', () => {
  const NV = setup(), pickups = [], texts = [];
  const e = { x: 10, y: 20, hp: 0, maxHp: 100, score: 100, xp: 5, color: '#fff', isElite: false, fusionLevel: 3, dead: false, behavior: 'chase' };
  const score = NV.killEnemy({ e, score: 0, player: { xp: 0, xpToNext: 100, level: 1, maxHp: 100, hp: 100, luck: 0, permGreed: 0, bounty: 0 },
    weaponLevels: {}, weaponKills: {}, currentWeapon: { id: 'pistol' }, damageSource: null, WEAPON_KILLS_PER_LEVEL: 6,
    weaponKillProgress: () => 1, pickups, waveEvent: null, W: 900,
    addFloatText(_x, _y, text) { texts.push(text); }, spawnExplosion() {}, triggerFlash() {}, applyPlayerDamage() { return {}; },
    sfx: { playerLevelUp() {}, levelup() {}, fuse() {}, enemyDeath() {} } });
  ok(NV.fusionMilestoneLabel(3) === 'SINGULARIDAD', 'hito incorrecto');
  ok(pickups.some((item) => item.type === 'shard' && item.value === 3), 'sin recompensa garantizada');
  ok(score === 130 && texts.some((text) => text.includes('SINGULARIDAD')), 'score/feedback incorrecto');
});

t('pulso fusionado se interrumpe con daño concentrado, no con tiempo', () => {
  const NV = setup(), texts = []; let hits = 0;
  const e = { hp: 100, maxHp: 100, radius: 20, x: 200, y: 200, fusionLevel: 2 };
  const st = { enemies: [e], player: { x: 200, y: 200 }, addFloatText(_x, _y, text) { texts.push(text); }, spawnExplosion() {},
    applyPlayerDamage() { hits++; return { applied: true, killed: false }; } };
  NV.updateFusionThreats(3.6, st);
  ok(e.fusionPulse.stage === 'windup' && e.fusionPulse.startHp === 100, 'sin ventana interrumpible');
  e.hp = 91; NV.updateFusionThreats(0.01, st);
  ok(e.fusionPulse.stage === 'cooldown' && hits === 0 && e.fusionInterruptFlash > 0, 'no interrumpió');
  ok(texts.includes('PULSO INTERRUMPIDO'), 'sin feedback de interrupción');
});

console.log('\nRESULT enemy_director_c2: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);
