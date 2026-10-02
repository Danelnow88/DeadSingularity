// ===== TEST: C1 roles tácticos — Tanque, Comandante, Bulwark y Swift =====
const fs = require('fs'), vm = require('vm');
let pass = 0, fail = 0;
function ok(value, message) { if (!value) throw new Error(message); }
function near(actual, expected, label, eps = 1e-6) { if (Math.abs(actual - expected) > eps) throw new Error(label + '=' + actual + ' expected=' + expected); }
function t(name, fn) { try { fn(); pass++; console.log('  ok  ' + name); } catch (err) { fail++; console.log('  FAIL ' + name + ' -> ' + err.message); } }

function setup(withRender) {
  const math = Object.create(Math); math.random = () => 0.5;
  const sandbox = { window: { NV: {} }, console, Math: math, Number, Object, Array, Set, Map, WeakMap, JSON };
  const files = ['js/data/balance.js', 'js/data/gameData.js', 'js/engine/hostileBudget.js', 'js/engine/enemies.js'];
  if (withRender) files.push('js/render/spectralEnemies2D.js', 'js/render/enemies.js');
  files.forEach((file) => vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file }));
  return sandbox.window.NV;
}
function common(id, x, y) {
  const defs = {
    tank: { hp: 60, speed: 40, radius: 20, color: '#ef9d49', shape: 'hex', damage: 18, behavior: 'chase' },
    drone: { hp: 25, speed: 75, radius: 11, color: '#f07bad', shape: 'circle', damage: 12, behavior: 'chase' },
  };
  return Object.assign({ x, y, maxHp: defs[id].hp, score: 10, xp: 10, enemyTypeId: id, dead: false, knockVelX: 0, knockVelY: 0, knockbackRes: 0.3, contactCd: 0, hitFlash: 0, hitSlowUntil: 0, hitSlowImmunity: 0, stun: 0 }, defs[id]);
}
function elite(visualId, x, y) {
  const map = {
    elite_base: { speed: 90, radius: 20, color: '#ff0', damage: 20 },
    elite_bulwark: { speed: 35, radius: 30, color: '#f80', damage: 25 },
    elite_swift: { speed: 220, radius: 10, color: '#00ff88', damage: 18 },
  };
  const d = map[visualId];
  return { x, y, hp: 160, maxHp: 160, speed: d.speed, radius: d.radius, color: d.color, shape: 'hex', score: 50, xp: 50, behavior: 'chase', damage: d.damage, eliteDamage: d.damage, visualId, isElite: true, hostileClass: 'heavy', dead: false, knockVelX: 0, knockVelY: 0, knockbackRes: 0.3, contactCd: 0, hitFlash: 0, hitSlowUntil: 0, hitSlowImmunity: 0, stun: 0 };
}
function player(x, y) { return { x, y, radius: 20, hp: 300, maxHp: 300, invuln: 0, stun: 0, dashActive: false }; }
function state(enemies, target, hitFn) {
  return { enemies, player: target, bullets: [], W: 900, H: 520, wave: 15, waveEvent: null, MAX_BULLETS: 200, MAX_ENEMY_BULLETS: 40, MAX_HOSTILES: 30, MAX_HEAVY_HOSTILES: 7, enemyBulletCount: () => 0, applyPlayerDamage: hitFn || (() => ({ applied: false, dodged: false, killed: false })), addFloatText: () => {}, spawnExplosion: () => {}, onKill: () => {}, boss: null };
}
function renderCtx() {
  const calls = { strokes: 0, fills: 0, lines: 0, arcs: 0 };
  const base = { calls, createRadialGradient() { return { addColorStop() {} }; }, createLinearGradient() { return { addColorStop() {} }; }, measureText() { return { width: 10 }; } };
  return new Proxy(base, { get(obj, key) { if (key in obj) return obj[key]; return () => { if (key === 'stroke') calls.strokes++; if (key === 'fill') calls.fills++; if (key === 'lineTo') calls.lines++; if (key === 'arc') calls.arcs++; }; }, set(obj, key, value) { obj[key] = value; return true; } });
}

console.log('enemy_role_rework:');

t('configuración y roster conservan stats de producción', () => {
  const NV = setup(), cfg = NV.ENEMY_ROLE_REWORK;
  ok(cfg && cfg.tank.windup === 0.9 && cfg.tank.bulletSpeed === 250 && cfg.commander.speedMult === 1.18 && cfg.bulwark.bashRange === 92 && cfg.swift.dashSpeed === 430, 'config incompleta');
  const tank = NV.ENEMY_TYPES.find((e) => e.id === 'tank');
  ok(tank.hp === 60 && tank.speed === 40 && tank.damage === 18 && tank.behavior === 'chase', 'stats de Tank alterados');
  const ids = ['elite_base', 'elite_bulwark', 'elite_swift'];
  for (const id of ids) ok(NV.ELITE_TYPES.some((e) => e.visualId === id), 'falta ' + id);
});

t('Tanque anuncia snapshot, dispara una bala pesada y no hace dash', () => {
  const NV = setup(), cfg = NV.ENEMY_ROLE_REWORK.tank, e = common('tank', 100, 100), target = player(320, 100);
  const st = state([e], target);
  NV.updateEnemies(0, st); e.tankCannonCooldown = 0; NV.updateEnemies(0, st);
  ok(e.tankCannonState === 'windup' && e.tankCannonTargetX === 320, 'no inició windup');
  const tankX = e.x, tankY = e.y;
  target.x = 100; target.y = 250;
  NV.updateEnemies(cfg.windup, st);
  ok(st.bullets.length === 1, 'no disparó exactamente una bala');
  near(st.bullets[0].vx, cfg.bulletSpeed, 'snapshot vx'); near(st.bullets[0].vy, 0, 'snapshot vy');
  ok(st.bullets[0].projectileStyle === 'tankShell' && st.bullets[0].damage === 23 && st.bullets[0].radius === 9, 'proyectil pesado incorrecto');
  near(e.x, tankX, 'tank x'); near(e.y, tankY, 'tank y');
  ok(!e.dead && e.tankCannonState === 'recovery', 'sin recovery');
  NV.updateEnemies(0.4, st); ok(st.bullets.length === 1, 'disparo duplicado');
});

t('Comandante mantiene distancia y aplica rally temporal solo en su radio', () => {
  const NV = setup(), cfg = NV.ENEMY_ROLE_REWORK.commander;
  const cmd = elite('elite_base', 100, 100), nearAlly = common('drone', 180, 100), farAlly = common('drone', 500, 100), target = player(300, 100);
  const st = state([cmd, nearAlly, farAlly], target);
  NV.updateEnemies(0, st); cmd.commanderCooldown = 0; NV.updateEnemies(0, st);
  ok(cmd.commanderState === 'rally_windup', 'no inició rally');
  NV.updateEnemies(cfg.windup, st);
  ok(nearAlly.rallyTimer >= cfg.duration - cfg.windup && nearAlly.rallyTimer <= cfg.duration, 'rally cercano=' + nearAlly.rallyTimer);
  ok(!(farAlly.rallyTimer > 0), 'rally alcanzó aliado lejano');
  ok(cmd.commanderState === 'recovery' && cmd.commanderPulseTimer > 0, 'sin pulso/recovery');
});

t('Bulwark escolta otra amenaza y su bash reemplaza el contacto suicida', () => {
  const NV = setup(), cfg = NV.ENEMY_ROLE_REWORK.bulwark;
  const wall = elite('elite_bulwark', 100, 100), ally = common('drone', 240, 100), target = player(360, 100);
  let hits = 0;
  const st = state([wall, ally], target, () => { hits++; return { applied: true, dodged: false, killed: false, crit: false }; });
  NV.updateEnemies(0.1, st);
  ok(wall.bulwarkGuardTarget === ally && wall.x > 100, 'no interceptó entre aliado y jugador');
  target.x = wall.x + 40; target.y = wall.y; wall.bulwarkCooldown = 0;
  NV.updateEnemies(0, st); ok(wall.bulwarkState === 'bash_windup', 'no inició bash');
  NV.updateEnemies(cfg.windup, st);
  ok(hits === 1 && !wall.dead && wall.bulwarkState === 'recovery', 'bash/contacto incorrecto');
});

t('Swift fija trayectoria, cruza una sola vez y queda expuesto', () => {
  const NV = setup(), cfg = NV.ENEMY_ROLE_REWORK.swift;
  const e = elite('elite_swift', 100, 100), target = player(230, 100); let hits = 0;
  const st = state([e], target, () => { hits++; return { applied: true, dodged: false, killed: false, crit: false }; });
  NV.updateEnemies(0, st); e.swiftCooldown = 0; NV.updateEnemies(0, st);
  ok(e.swiftState === 'windup' && e.swiftTargetX === 230, 'sin aviso snapshot');
  target.x = 100; target.y = 260; NV.updateEnemies(cfg.windup, st);
  near(e.swiftDirX, 1, 'swift snapshot x'); near(e.swiftDirY, 0, 'swift snapshot y');
  target.x = 155; target.y = 100; NV.updateEnemies(0.2, st);
  ok(hits === 1 && !e.dead && e.swiftState === 'recovery', 'dash no resolvió una vez');
});

t('telegraphs de Tank y élites dibujan sin mutar gameplay', () => {
  const NV = setup(true), target = player(300, 100);
  const entities = [common('tank', 100, 100), elite('elite_base', 100, 100), elite('elite_bulwark', 100, 100), elite('elite_swift', 100, 100)];
  entities[0].tankCannonState = 'windup'; entities[0].tankCannonTimer = 0.3; entities[0].tankCannonTargetX = 250; entities[0].tankCannonTargetY = 100;
  entities[1].commanderState = 'rally_windup'; entities[1].commanderTimer = 0.3;
  entities[2].bulwarkState = 'bash_windup'; entities[2].bulwarkTimer = 0.2; entities[2].bulwarkGuardTarget = entities[0];
  entities[3].swiftState = 'windup'; entities[3].swiftTimer = 0.2; entities[3].swiftTargetX = 300; entities[3].swiftTargetY = 100;
  for (const e of entities) {
    const ctx = renderCtx(), before = JSON.stringify(e);
    if (e.isElite) NV.drawSpectralEnemy2D(ctx, e, 20, target, null); else NV.drawEnemy(ctx, e, 20, target, null, 1);
    ok(JSON.stringify(e) === before, 'render mutó ' + (e.visualId || e.enemyTypeId));
    ok(ctx.calls.strokes > 0 && (ctx.calls.lines > 0 || ctx.calls.arcs > 0), 'telegraph ausente ' + (e.visualId || e.enemyTypeId));
  }
});

console.log('\nRESULT enemy_role_rework: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);
