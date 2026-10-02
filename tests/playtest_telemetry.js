const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log('  ok  ' + name); }
  catch (err) { fail++; console.log('  FAIL ' + name + ' -> ' + err.stack); }
}
const sandbox = { window: { NV: {} }, console };
vm.runInNewContext(fs.readFileSync('js/engine/playtestTelemetry.js', 'utf8'), sandbox, { filename: 'playtestTelemetry.js' });
const p = sandbox.window.NV.playtest;
const snapshot = () => JSON.parse(JSON.stringify(p.snapshot()));

t('OFF por defecto; disable y reset conservan estado limpio', () => {
  assert.strictEqual(p.enabled, false);
  p.startRun('ignored', 'ignored', 'pistol'); p.shot('pistol'); p.frame(3, 'pistol');
  assert.strictEqual(snapshot().combat.shots, 0);
  assert.strictEqual(snapshot().run.simTime, 0);
  p.enable(); assert.strictEqual(p.enabled, true);
  p.disable(); p.shot('pistol'); assert.strictEqual(snapshot().combat.shots, 0);
  p.enable(); p.reset(); assert.strictEqual(snapshot().run.character, null);
});
t('run, dt, equipamiento, disparos reales y transición efectiva', () => {
  p.startRun('boti', 'normal', 'pistol');
  p.frame(0.25, 'pistol'); p.shot('pistol');
  p.weaponSwitch('pistol', 'pistol');
  p.weaponSwitch('pistol', 'shotgun'); p.weaponSwitch('pistol', 'shotgun');
  p.frame(0.5, 'shotgun'); p.shot('shotgun'); p.shot('shotgun');
  const s = snapshot();
  assert.strictEqual(s.run.character, 'boti'); assert.strictEqual(s.run.difficulty, 'normal');
  assert.strictEqual(s.run.simTime, 0.75);
  assert.strictEqual(s.weapons.byId.pistol.equippedTime, 0.25);
  assert.strictEqual(s.weapons.byId.shotgun.equippedTime, 0.5);
  assert.strictEqual(s.weapons.byId.pistol.shots, 1);
  assert.strictEqual(s.weapons.byId.shotgun.shots, 2);
  assert.strictEqual(s.combat.shots, 3);
  assert.strictEqual(s.weapons.totalSwitches, 2);
  assert.strictEqual(s.weapons.transitions['pistol>shotgun'], 2);
});
t('métricas legacy: dash, fireMode, pierce, intent y frames', () => {
  p.dashEvent('succeeded'); p.dashEvent('failed'); p.setExhaustedFrame();
  p.setFireMode('manual'); p.bulletHit(2);
  const e = { behavior: 'flank', intent: { state: 'attack' } };
  p.observeEnemy(e, 0.1); e.intent.state = 'recovery'; p.observeEnemy(e, 0.1);
  const s = snapshot();
  assert.strictEqual(s.frames, 2); assert.strictEqual(s.dash.attempted, 2);
  assert.strictEqual(s.dash.exhaustedFrames, 1);
  assert.strictEqual(s.combat.fireMode, 'manual'); assert.strictEqual(s.combat.hits, 1);
  assert.strictEqual(s.combat.pierce2Plus, 1); assert.strictEqual(s.runner.commits, 1);
});
t('boss: eventos independientes direct + splash + burn, fuentes y armas', () => {
  p.bossStart(5, 'Boss', 'burst', 100);
  p.frame(0.3, 'pistol'); p.bossHit('plasma', 40, 'direct');
  p.bossHit('plasma', 40, 'splash');
  const boss = {};
  p.bossBurnSource(boss, 'flamethrower'); p.bossBurnHit(boss, 2);
  p.frame(0.2, 'plasma');
  const active = snapshot().bosses.active;
  assert.strictEqual(active.wave, 5); assert.strictEqual(active.name, 'Boss');
  assert.strictEqual(active.pattern, 'burst'); assert.strictEqual(active.maxHp, 100);
  assert.strictEqual(active.elapsed, 0.5); assert.strictEqual(active.hits, 3);
  assert.strictEqual(active.damage, 82);
  assert.strictEqual(active.byWeapon.plasma.hits, 2);
  assert.strictEqual(active.byWeapon.plasma.damage, 80);
  assert.strictEqual(active.byWeapon.flamethrower.damage, 2);
  assert.strictEqual(active.bySource.direct.damage, 40);
  assert.strictEqual(active.bySource.splash.hits, 1);
  assert.strictEqual(active.bySource.splash.damage, 40);
  assert.strictEqual(active.bySource.burn.damage, 2);
  p.bossEnd(); p.bossEnd();
  assert.strictEqual(snapshot().bosses.completed.length, 1);
  assert.strictEqual(snapshot().bosses.active, null);
  assert.doesNotThrow(() => JSON.stringify(p.snapshot()));
});
t('reset limpia todos los agregados, conserva enabled y no añade switch inicial', () => {
  p.reset(); p.startRun('nova', 'hard', 'pistol');
  const s = snapshot();
  assert.strictEqual(p.enabled, true); assert.strictEqual(s.combat.shots, 0);
  assert.strictEqual(s.run.simTime, 0); assert.strictEqual(s.run.character, 'nova');
  assert.strictEqual(s.weapons.totalSwitches, 0);
  assert.strictEqual(s.bosses.completed.length, 0);
  assert.strictEqual(s.bosses.active, null);
});
t('integración estática: carga previa, disparo real, rutas de daño y finalización', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const game = fs.readFileSync('js/game.js', 'utf8');
  const bullets = fs.readFileSync('js/engine/bullets.js', 'utf8');
  const flame = fs.readFileSync('js/engine/flame.js', 'utf8');
  const telemetry = html.indexOf('js/engine/playtestTelemetry.js');
  assert(telemetry > 0 && telemetry < html.indexOf('js/engine/bullets.js') && telemetry < html.indexOf('js/game.js'));
  assert(game.includes("NV.playtest.shot(currentWeapon.id)"));
  assert(game.includes('NV.playtest.frame(dt, currentWeapon.id)'));
  assert(game.includes('NV.playtest.weaponProgression(currentWeapon.id, currentWeaponLevel(), currentWeaponFusion())'));
  assert(game.includes('NV.playtest.bossStart(wave, boss.name, boss.pattern, boss.maxHp, playtestWeaponStates())'));
  assert(game.includes('NV.playtest.bossEnd(playtestWeaponStates())'));
  assert.strictEqual((game.match(/NV\.playtest\.bossEnd\(/g) || []).length, 2);
  assert(game.includes('function playtestWeaponStates()'));
  assert(bullets.includes("NV.playtest.bossHit(b.specialId ? ('special:' + b.specialId) : b.wid, bossDamage, b.specialId ? 'special' : 'direct')"));
  assert(bullets.includes("NV.playtest.bossHit(b.wid, b.damage, 'splash')"));
  assert(flame.includes('NV.playtest.bossBurnHit(e, dealt)'));
});
function bulletSandbox() {
  const sbx = { window: { NV: {} }, console, Math };
  for (const file of ['js/engine/playtestTelemetry.js', 'js/engine/bullets.js']) {
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), sbx, { filename: file });
  }
  const nv = sbx.window.NV;
  nv.playtest.enable(); nv.playtest.bossStart(5, 'Boss', 'burst', 100);
  nv.hitSlowFor = () => ({ activeDuration: 0.1, immunity: 0.2 });
  nv.bossHitReaction = () => {};
  return nv;
}
function plasmaBullet(x, y) {
  return { x, y, vx: 0, vy: 0, damage: 10, dead: false, isEnemy: false,
    pierce: 1, impactType: 'splash', splashRadius: 40, wid: 'plasma', hitTargets: [] };
}
function impact(nv, bullet, boss, enemies, explosion) {
  return nv.updateBullets(0, { bullets: [bullet], boss, enemies, player: { x: -100, y: -100 },
    W: 900, H: 520, spawnExplosion: explosion || (() => {}), addFloatText() {},
    killEnemy(e) { e.dead = true; }, applyKnockback() {} });
}
function snapshotBoss(nv) { return JSON.parse(JSON.stringify(nv.playtest.snapshot().bosses.active)); }
t('plasma directo al jefe: un daño directo, explosión presente, sin self-splash en HP ni telemetría', () => {
  const nv = bulletSandbox();
  const boss = { x: 100, y: 100, radius: 20, hp: 100, maxHp: 100, hitFlash: 0 };
  let explosions = 0;
  const result = impact(nv, plasmaBullet(100, 100), boss, [], () => { explosions++; });
  const b = snapshotBoss(nv);
  assert.strictEqual(boss.hp, 90);
  assert.strictEqual(result.bullets.length, 0);
  assert.strictEqual(explosions, 1);
  assert.strictEqual(b.hits, 1); assert.strictEqual(b.damage, 10);
  assert.strictEqual(b.byWeapon.plasma.hits, 1);
  assert.strictEqual(b.bySource.direct.hits, 1);
  assert.strictEqual(b.bySource.direct.damage, 10);
  assert.strictEqual(b.bySource.splash.hits, 0);
  assert.strictEqual(b.bySource.splash.damage, 0);
});
t('plasma directo al jefe conserva splash contra enemigo cercano', () => {
  const nv = bulletSandbox();
  const boss = { x: 100, y: 100, radius: 20, hp: 100, maxHp: 100, hitFlash: 0 };
  const nearby = { x: 130, y: 100, radius: 10, hp: 100, dead: false };
  let explosions = 0;
  impact(nv, plasmaBullet(100, 100), boss, [nearby], () => { explosions++; });
  assert.strictEqual(boss.hp, 90);
  assert.strictEqual(nearby.hp, 90);
  assert.strictEqual(explosions, 1);
  assert.strictEqual(snapshotBoss(nv).bySource.splash.hits, 0);
});
t('plasma desde enemigo cercano conserva splash legítimo sobre jefe y evita doble daño al enemigo', () => {
  const nv = bulletSandbox();
  const boss = { x: 135, y: 100, radius: 20, hp: 100, maxHp: 100, hitFlash: 0 };
  const target = { x: 100, y: 100, radius: 10, hp: 100, dead: false };
  let explosions = 0;
  impact(nv, plasmaBullet(100, 100), boss, [target], () => { explosions++; });
  const b = snapshotBoss(nv);
  assert.strictEqual(target.hp, 90);
  assert.strictEqual(boss.hp, 90);
  assert.strictEqual(explosions, 1);
  assert.strictEqual(b.hits, 1); assert.strictEqual(b.damage, 10);
  assert.strictEqual(b.bySource.direct.hits, 0);
  assert.strictEqual(b.bySource.splash.hits, 1);
  assert.strictEqual(b.bySource.splash.damage, 10);
});
t('múltiples pellets reales se contabilizan individualmente sin agrupar la descarga', () => {
  const sbx = { window: { NV: {} }, console, Math };
  for (const file of ['js/engine/playtestTelemetry.js', 'js/engine/bullets.js']) {
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), sbx, { filename: file });
  }
  const nv = sbx.window.NV;
  nv.playtest.enable(); nv.playtest.bossStart(5, 'Boss', 'burst', 100);
  nv.hitSlowFor = () => ({ activeDuration: 0.1, immunity: 0.2 });
  nv.bossHitReaction = () => {};
  const boss = { x: 100, y: 100, radius: 20, hp: 100, maxHp: 100, hitFlash: 0 };
  const group = { targets: [], cap: 3 };
  const bullets = [0, 1].map(() => ({ x: 100, y: 100, vx: 0, vy: 0, damage: 5,
    dead: false, isEnemy: false, impactType: 'pellet', wid: 'shotgun', shotGroup: group, hitTargets: [] }));
  nv.updateBullets(0, { bullets, boss, enemies: [], player: { x: -100, y: -100 },
    W: 900, H: 520, spawnExplosion() {}, addFloatText() {} });
  assert.strictEqual(boss.hp, 90);
  assert.strictEqual(nv.playtest.snapshot().bosses.active.byWeapon.shotgun.hits, 2);
});
t('normal: OFF, tiempo simulado, disparos por gatillo, boss separado y reset serializable', () => {
  const nv = bulletSandbox(), pt = nv.playtest;
  pt.reset(); pt.disable(); pt.frame(2, 'plasma'); pt.shot('plasma');
  pt.weaponEnemyHit('plasma', 'direct', 50, 10, -40);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(pt.snapshot().weapons.byId)), {});
  pt.enable(); pt.frame(0.25, 'plasma'); pt.shot('plasma');
  pt.bossStart(5, 'Boss', 'burst', 100); pt.frame(0.5, 'plasma'); pt.shot('plasma');
  pt.weaponEnemyHit('plasma', 'direct', 50, 10, -40); // minion durante boss
  pt.bossEnd(); pt.frame(0, 'plasma'); pt.frame(0.75, 'shotgun'); pt.shot('shotgun');
  const s = JSON.parse(JSON.stringify(pt.snapshot()));
  assert.strictEqual(s.weapons.byId.plasma.equippedTime, 0.75);
  assert.strictEqual(s.weapons.byId.plasma.normal.equippedTime, 0.25);
  assert.strictEqual(s.weapons.byId.plasma.shots, 2);
  assert.strictEqual(s.weapons.byId.plasma.normal.shots, 1);
  assert.strictEqual(s.weapons.byId.shotgun.normal.equippedTime, 0.75);
  assert.strictEqual(s.weapons.byId.shotgun.normal.shots, 1);
  assert.strictEqual(s.weapons.byId.plasma.normal.effectiveDamage, 10);
  assert.strictEqual(s.bosses.completed[0].elapsed, 0.5);
  pt.reset();
  assert.strictEqual(pt.snapshot().weapons.byId.plasma, undefined);
  assert.strictEqual(pt.snapshot().bosses.completed.length, 0);
});
function normalBulletSandbox() {
  const nv = bulletSandbox();
  nv.playtest.bossEnd();
  return nv;
}
function normalEnemy(x, hp) {
  return { x, y: 100, radius: 10, hp, dead: false, resist: 0 };
}
t('proyectil real: resistencia/protección, overkill, kill única y muerto no recibe otro golpe', () => {
  const nv = normalBulletSandbox(), enemy = normalEnemy(100, 10);
  nv.guardProtectedDamage = (_e, damage) => damage * 0.5;
  const b = { x: 100, y: 100, vx: 0, vy: 0, damage: 105, wid: 'rifle',
    impactType: 'pierce', pierce: 1, isEnemy: false, dead: false, hitTargets: [] };
  enemy.resist = 5;
  impact(nv, b, null, [enemy]);
  impact(nv, { ...b, dead: false, hitTargets: [] }, null, [enemy]);
  const n = nv.playtest.snapshot().weapons.byId.rifle.normal;
  assert.strictEqual(n.hits, 1); assert.strictEqual(n.rawDamage, 50);
  assert.strictEqual(n.effectiveDamage, 10); assert.strictEqual(n.overkillDamage, 40);
  assert.strictEqual(n.kills, 1); assert.strictEqual(n.bySource.direct.kills, 1);
});
t('plasma real: impacto inicial y splash separado; boss simultáneo no contamina normal', () => {
  const nv = normalBulletSandbox(), target = normalEnemy(100, 100), nearby = normalEnemy(130, 100);
  nv.playtest.bossStart(5, 'Boss', 'burst', 100);
  const boss = { x: 135, y: 100, radius: 10, hp: 100, hitFlash: 0 };
  impact(nv, plasmaBullet(100, 100), boss, [target, nearby]);
  const n = nv.playtest.snapshot().weapons.byId.plasma.normal;
  assert.strictEqual(n.hits, 2); assert.strictEqual(n.bySource.direct.hits, 1);
  assert.strictEqual(n.bySource.splash.hits, 1);
  assert.strictEqual(n.effectiveDamage, 20);
  assert.strictEqual(nv.playtest.snapshot().bosses.active.bySource.splash.hits, 1);
});
t('bow real: impacto inicial y cadena (dt=0) cuentan fuentes distintas', () => {
  const nv = normalBulletSandbox(), enemies = [normalEnemy(100, 40), normalEnemy(135, 40)];
  const b = { x: 100, y: 100, vx: 0, vy: 0, damage: 10, wid: 'bow',
    impactType: 'bounce', bounceLeft: 1, splashRadius: 180,
    isEnemy: false, dead: false, hitTargets: [] };
  impact(nv, b, null, enemies);
  impact(nv, b, null, enemies);
  const n = nv.playtest.snapshot().weapons.byId.bow.normal;
  assert.strictEqual(n.bySource.direct.hits, 1);
  assert.strictEqual(n.bySource.bounce.hits, 1);
  assert.strictEqual(n.hits, 2);
});
t('bow: telemetría por ordinal sin duplicar totales ni perder el agregado', () => {
  const nv = normalBulletSandbox();
  const enemies = [normalEnemy(100, 40), normalEnemy(135, 40), normalEnemy(170, 40)];
  // b.damage horneado 100: rebote1 85, rebote2 70, rebote3 55.
  const b = { x: 100, y: 100, vx: 0, vy: 0, damage: 100, wid: 'bow',
    impactType: 'bounce', bounceLeft: 2, splashRadius: 180,
    isEnemy: false, dead: false, hitTargets: [] };
  impact(nv, b, null, enemies);
  impact(nv, b, null, enemies);
  impact(nv, b, null, enemies);
  const n = nv.playtest.snapshot().weapons.byId.bow.normal;
  // El agregado histórico sigue existiendo y NO se sustituye.
  assert.ok(n.bySource.bounce, 'bySource.bounce debe seguir existiendo');
  assert.strictEqual(n.bySource.direct.hits, 1);
  assert.strictEqual(n.bySource.bounce.hits, 2);
  // Totales normales: 1 primario + 2 rebotes, sin doble conteo.
  assert.strictEqual(n.hits, 3);
  assert.strictEqual(n.rawDamage, 100 + 85 + 70);
  // Detalle por ordinal: cada bucket registra su propia actividad.
  assert.ok(n.bounceOrdinal, 'bounceOrdinal debe existir');
  assert.strictEqual(n.bounceOrdinal['1'].hits, 1);
  assert.strictEqual(n.bounceOrdinal['1'].rawDamage, 85);
  assert.strictEqual(n.bounceOrdinal['2'].hits, 1);
  assert.strictEqual(n.bounceOrdinal['2'].rawDamage, 70);
  // La suma de ordinales es exactamente el agregado de rebotes (sin contar dos veces).
  const ordSum = Object.keys(n.bounceOrdinal).reduce((a, k) => a + n.bounceOrdinal[k].hits, 0);
  assert.strictEqual(ordSum, n.bySource.bounce.hits);
  const ordDamage = Object.keys(n.bounceOrdinal).reduce((a, k) => a + n.bounceOrdinal[k].rawDamage, 0);
  assert.strictEqual(ordDamage, n.bySource.bounce.rawDamage);
});
t('shotgun: un gatillo, dos pellets reales, dos aplicaciones', () => {
  const nv = normalBulletSandbox(), enemy = normalEnemy(100, 100);
  const group = { targets: [], cap: 3 };
  nv.playtest.shot('shotgun');
  for (let i = 0; i < 2; i++) impact(nv, { x: 100, y: 100, vx: 0, vy: 0,
    damage: 5, wid: 'shotgun', impactType: 'pellet', shotGroup: group,
    isEnemy: false, dead: false, hitTargets: [] }, null, [enemy]);
  const n = nv.playtest.snapshot().weapons.byId.shotgun.normal;
  assert.strictEqual(n.shots, 1); assert.strictEqual(n.hits, 2);
  assert.strictEqual(n.bySource.pellet.hits, 2); assert.strictEqual(n.effectiveDamage, 10);
});
t('flame real y burn atribuido al emisor; burn ajeno y especial no son arma', () => {
  const nv = normalBulletSandbox();
  vm.runInNewContext(fs.readFileSync('js/engine/flame.js', 'utf8'), { window: { NV: nv } });
  const e = normalEnemy(150, 20);
  const z = nv.createFlameZone({ x: 100, y: 100, angle: 0, damage: 10, burnDamage: 5, burnDuration: 3 });
  nv.flameZoneDamage(z, { enemies: [e], boss: null, killEnemy(en) { en.dead = true; } });
  nv.updateBurns(1, { enemies: [e], boss: null, killEnemy(en) { en.dead = true; } });
  nv.applyBurn(e, 3, 1); // burn ajeno no reemplaza la fuente de DPS más alto
  nv.updateBurns(1, { enemies: [e], boss: null, killEnemy(en) { en.dead = true; } });
  const n = nv.playtest.snapshot().weapons.byId.flamethrower.normal;
  assert.strictEqual(n.bySource.flame.rawDamage, 10);
  assert.strictEqual(n.bySource.burn.rawDamage, 10);
  assert.strictEqual(n.bySource.burn.effectiveDamage, 10);
  assert.strictEqual(n.bySource.burn.kills, 1);
  assert.strictEqual(n.hits, 3);
  assert.strictEqual(nv.playtest.snapshot().weapons.byId['special:nova'], undefined);
});
t('burn más fuerte de origen ajeno reemplaza atribución y reflejo no cuenta como arma', () => {
  const nv = normalBulletSandbox(), e = normalEnemy(100, 100);
  nv.applyBurn = undefined;
  vm.runInNewContext(fs.readFileSync('js/engine/flame.js', 'utf8'), { window: { NV: nv } });
  nv.applyBurn(e, 5, 3, 'flamethrower');
  nv.applyBurn(e, 10, 3); // la fuente real ahora es ajena al arma
  nv.updateBurns(0.5, { enemies: [e], boss: null, killEnemy(en) { en.dead = true; } });
  assert.strictEqual(nv.playtest.snapshot().weapons.byId.flamethrower, undefined);
  const b = { x: 100, y: 100, vx: 0, vy: 0, damage: 10, wid: 'plasma',
    reflected: true, isEnemy: false, dead: false, pierce: 1, hitTargets: [] };
  impact(nv, b, null, [e]);
  assert.strictEqual(nv.playtest.snapshot().weapons.byId.plasma, undefined);
  assert.strictEqual(e.hp, 85);
});
t('progresión: inerte con telemetría OFF; refleja estado real; máximos solo suben', () => {
  p.reset(); p.disable();
  p.weaponProgression('plasma', 12, 2);
  p.bossStart(5, 'Boss', 'burst', 100, { plasma: { level: 12, fusion: 2 } });
  p.bossEnd({ plasma: { level: 12, fusion: 2 } });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(p.snapshot().weapons.byId)), {});
  p.enable();
  p.weaponProgression('plasma', 12, 1);
  p.weaponProgression('plasma', 5, 3);   // nivel baja: current sigue el hecho, el máximo no
  p.weaponProgression('plasma', 9, 0);
  const prog = p.snapshot().weapons.byId.plasma.progression;
  assert.strictEqual(prog.currentLevel, 9);
  assert.strictEqual(prog.currentFusion, 0);
  assert.strictEqual(prog.maxLevelSeen, 12);
  assert.strictEqual(prog.maxFusionSeen, 3);
  assert.strictEqual(prog.firstLevelSeen, 12);
  assert.strictEqual(prog.firstFusionSeen, 1);
  assert.doesNotThrow(() => JSON.stringify(p.snapshot()));
});
t('progresión: estados de arma al inicio y al final de cada encuentro de jefe', () => {
  p.reset(); p.startRun('boti', 'normal', 'plasma');
  p.weaponProgression('plasma', 7, 0);
  p.bossStart(5, 'Boss', 'burst', 100, { plasma: { level: 7, fusion: 0 }, pistol: { level: 2, fusion: 1 } });
  p.bossHit('plasma', 100, 'direct');
  p.weaponProgression('plasma', 11, 3);
  p.bossEnd({ plasma: { level: 11, fusion: 3 } });
  const done = JSON.parse(JSON.stringify(p.snapshot().bosses.completed[0]));
  assert.deepStrictEqual(JSON.parse(JSON.stringify(done.weaponStateStart)),
    { plasma: { level: 7, fusion: 0 }, pistol: { level: 2, fusion: 1 } });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(done.weaponStateEnd)),
    { plasma: { level: 11, fusion: 3 } });
  assert.strictEqual(done.damage, 100);
  assert.strictEqual(p.snapshot().weapons.byId.plasma.progression.maxLevelSeen, 11);
  assert.strictEqual(p.snapshot().bosses.active, null);
  p.bossEnd({ plasma: { level: 11, fusion: 3 } }); // sin encuentro activo: no crea nada
  assert.strictEqual(p.snapshot().bosses.completed.length, 1);
  p.reset();
  const s = p.snapshot();
  assert.strictEqual(s.weapons.byId.plasma, undefined);
  assert.strictEqual(s.bosses.completed.length, 0);
});

function bossTelemetrySandbox() {
  const sbx = { window: { NV: {} }, console, Math };
  for (const file of ['js/engine/playtestTelemetry.js', 'js/engine/boss.js']) {
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), sbx, { filename: file });
  }
  const nv = sbx.window.NV;
  nv.playtest.enable();
  nv.playtest.startRun('boti', 'normal', 'pistol');
  return nv;
}
function bossState(nv, over) {
  const boss = Object.assign({ x: 400, y: 100, hp: 1000, maxHp: 1000, timer: 0, atkTimer: 0,
    hitFlash: 0, hitSlowUntil: 0, hitSlowImmunity: 0, attack: 'repeater', primaryAttack: 'repeater',
    color: '#f00', name: 'B', radius: 50 }, over || {});
  const st = Object.assign({ player: { x: 400, y: 500, hp: 100, maxHp: 100, moveVx: 0, moveVy: 0 },
    enemies: [], boss, bullets: [], MAX_BULLETS: 200, MAX_ENEMY_BULLETS: 120,
    enemyBulletCount: () => 0, wave: 10, W: 900, H: 520,
    sfx: { bossAttack: new Proxy({}, { get: () => () => {} }) }, showBanner() {}, triggerFlash() {},
    spawnExplosion() {}, addFloatText() {}, triggerWaveVictory() {}, spawnBossProj: nv.spawnBossProj,
    spawnMinion() { return true; }, score: 0, shards: 0, shake: 0 }, over || {});
  st.boss = boss;
  return { boss, st };
}
t('boss lifecycle: solo asignaciones runtime cuentan; llamadas directas de selección no cuentan', () => {
  const nv = bossTelemetrySandbox();
  const { boss, st } = bossState(nv, { aiTimer: 0 });
  st.player.y = 480;
  nv.playtest.bossStart(5, 'Boss', 'burst', 100);
  nv.selectBossAttack(boss, st);
  let selected = nv.playtest.snapshot().bosses.active.attackSelected;
  assert.strictEqual(Object.keys(selected.phase1).length, 0);
  assert.strictEqual(Object.keys(selected.phase2).length, 0);
  nv.updateBoss(0.001, st);
  selected = nv.playtest.snapshot().bosses.active.attackSelected;
  assert.strictEqual(selected.phase1.repeater, 1);
  assert.strictEqual(Object.keys(selected.phase1).length, 1);
});
t('boss lifecycle: selección inicial se cuenta una vez y ejecución solo en commit real', () => {
  const nv = bossTelemetrySandbox();
  const { boss, st } = bossState(nv, { attack: 'repeater', primaryAttack: 'repeater' });
  nv.playtest.bossStart(5, 'Boss', 'burst', 100);
  nv.updateBoss(0.1, st);
  nv.updateBoss(0.1, st);
  let active = nv.playtest.snapshot().bosses.active;
  assert.strictEqual(active.attackSelected.phase1.repeater, 1);
  assert.strictEqual(active.attackExecuted.phase1.repeater || 0, 0);
  nv.updateBoss(0.02, st);
  active = nv.playtest.snapshot().bosses.active;
  assert.strictEqual(active.attackExecuted.phase1.repeater, 1);
  nv.updateBoss(0.1, st);
  assert.strictEqual(nv.playtest.snapshot().bosses.active.attackSelected.phase1.repeater, 1);
});
t('boss lifecycle: beam warning no ejecuta; beam cargado sí ejecuta', () => {
  const nv = bossTelemetrySandbox();
  const { boss, st } = bossState(nv, { attack: 'beam', primaryAttack: 'beam' });
  nv.playtest.bossStart(5, 'Boss', 'burst', 100);
  nv.updateBoss(0.001, st);
  boss.atkTimer = 3.1;
  nv.runBossAttack(boss, 0, st);
  let active = nv.playtest.snapshot().bosses.active;
  assert.strictEqual(active.attackExecuted.phase1.beam || 0, 0);
  assert.strictEqual(st.bullets.length, 0);
  boss.atkTimer = 3.6;
  nv.runBossAttack(boss, 0, st);
  active = nv.playtest.snapshot().bosses.active;
  assert.strictEqual(active.attackExecuted.phase1.beam, 1);
  assert.strictEqual(st.bullets.length, 1);
});
t('boss lifecycle: summon bloqueado no ejecuta hasta autorización de spawn', () => {
  const nv = bossTelemetrySandbox();
  let allowed = false;
  const { boss, st } = bossState(nv, { attack: 'summon', primaryAttack: 'summon' });
  nv.canSpawnHostileBatch = () => false;
  st.spawnMinion = () => { if (!allowed) throw new Error('blocked summon mutated'); return true; };
  nv.playtest.bossStart(5, 'Boss', 'burst', 100);
  nv.updateBoss(0.001, st);
  boss.atkTimer = 2.6;
  nv.runBossAttack(boss, 0, st);
  let active = nv.playtest.snapshot().bosses.active;
  assert.strictEqual(active.attackExecuted.phase1.summon || 0, 0);
  nv.canSpawnHostileBatch = () => true;
  allowed = true;
  boss.atkTimer = 2.6;
  nv.runBossAttack(boss, 0, st);
  active = nv.playtest.snapshot().bosses.active;
  assert.strictEqual(active.attackExecuted.phase1.summon, 1);
});
t('boss lifecycle: fase 2 se registra una sola vez con HP exacto y buckets separados', () => {
  const nv = bossTelemetrySandbox();
  const { boss, st } = bossState(nv, { hp: 800, maxHp: 1000, aiTimer: 8 });
  nv.playtest.bossStart(5, 'Boss', 'burst', 100);
  nv.playtest.frame(0.5, 'pistol');
  nv.updateBoss(0.5, st);
  boss.hp = 500;
  st.boss = boss;
  nv.playtest.frame(0.25, 'pistol');
  nv.updateBoss(0.25, st);
  const active = nv.playtest.snapshot().bosses.active;
  assert.strictEqual(active.timeToPhase2, 0.75);
  assert.strictEqual(active.hpAtPhase2, 500);
  boss.hp = 400;
  nv.updateBoss(0.25, st);
  assert.strictEqual(nv.playtest.snapshot().bosses.active.timeToPhase2, 0.75);
  assert.ok(Object.prototype.hasOwnProperty.call(active.attackSelected, 'phase1'));
  assert.ok(Object.prototype.hasOwnProperty.call(active.attackSelected, 'phase2'));
});
t('boss lifecycle: intervalos solo permanecen dentro del epoch de selección', () => {
  const nv = bossTelemetrySandbox();
  const { boss } = bossState(nv);
  nv.playtest.bossStart(5, 'Boss', 'burst', 100);
  nv.playtest.bossAttackInitial(boss, 'repeater');
  nv.playtest.frame(1, 'pistol'); nv.playtest.bossAttackExecuted(boss, 'repeater');
  nv.playtest.frame(0.25, 'pistol'); nv.playtest.bossAttackExecuted(boss, 'repeater');
  nv.playtest.bossAttackSelected(boss, 'spread');
  nv.playtest.frame(8, 'pistol'); nv.playtest.bossAttackSelected(boss, 'repeater');
  nv.playtest.frame(0.5, 'pistol'); nv.playtest.bossAttackExecuted(boss, 'repeater');
  nv.playtest.frame(0.25, 'pistol'); nv.playtest.bossAttackExecuted(boss, 'repeater');
  const stats = nv.playtest.snapshot().bosses.active.executionIntervals.phase1.repeater;
  assert.strictEqual(stats.count, 2);
  assert.strictEqual(stats.sum, 0.5);
  assert.strictEqual(stats.min, 0.25);
  assert.strictEqual(stats.max, 0.25);
});
t('boss lifecycle: telemetría OFF no altera estado ni añade eventos', () => {
  const nv = bossTelemetrySandbox();
  const { boss, st } = bossState(nv, { attack: 'beam', primaryAttack: 'beam', atkTimer: 3.1 });
  nv.playtest.disable();
  nv.playtest.bossStart(5, 'Boss', 'burst', 100);
  const before = { atkTimer: boss.atkTimer, attack: boss.attack, phase2: boss.phase2, bullets: st.bullets.length };
  nv.runBossAttack(boss, 0, st);
  assert.deepStrictEqual({ atkTimer: boss.atkTimer, attack: boss.attack, phase2: boss.phase2, bullets: st.bullets.length }, before);
  assert.strictEqual(nv.playtest.snapshot().bosses.active, null);
});
console.log('RESULT playtest_telemetry: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);
