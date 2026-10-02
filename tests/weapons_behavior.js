// Tests focalizados: comportamiento + balance de flamethrower, shotgun, plasma, bow, magnet.
const fs = require('fs'), vm = require('vm');
let pass = 0, fail = 0;
function t(desc, fn) { try { fn(); pass++; console.log('  ok  ' + desc); } catch (e) { fail++; console.log('  FAIL ' + desc + ' -> ' + e.message); } }
function near(actual, expected, label) {
  if (Math.abs(actual - expected) > 1e-9) throw new Error((label || 'value') + '=' + actual + ' esperado=' + expected);
}

function loadAll() {
  const sbx = { window: { NV: {} }, console, Math, performance: { now: () => Date.now() } };
  for (const f of [
    'js/data/balance.js', 'js/data/gameData.js', 'js/data/consumables.js',
    'js/engine/weapons.js', 'js/engine/boss.js', 'js/engine/bullets.js',
    'js/engine/flame.js', 'js/engine/pickups.js', 'js/engine/consumables.js',
  ]) { vm.runInNewContext(fs.readFileSync(f, 'utf8'), sbx, { filename: f }); }
  return sbx.window.NV;
}

const NV = loadAll();

function shootWeapon(weaponId, level, options) {
  const opts = options || {};
  const bullets = [];
  let flame = null;
  NV.shoot({
    player: { x: 0, y: 20, luck: opts.crit ? 1000 : -1000, permCrit: 0, overdrive: 0 },
    enemies: [{ x: 100, y: 20, radius: 10, hp: 1000, dead: false }], boss: null, bullets,
    aimVector: { x: 1, y: 0 }, currentWeapon: NV.weaponById(weaponId),
    currentWeaponLevel: () => level, weaponVisualTier: () => 0, BULLET_TIER_COLORS: ['#fff'], MAX_BULLETS: 100,
    permDamageBonus: opts.permDamageBonus || 0, playWeaponSound() {},
    fusionStep: 0.2, currentWeaponFusion: opts.fusion || 0, onTarget() {}, onFlame(z) { flame = z; },
  });
  return { bullets, flame };
}

console.log('\n--- weapon level damage scaling ---');

t('curva proporcional respeta todos los checkpoints', () => {
  for (const [level, expected] of [[1, 1], [10, 1.18], [16, 1.3], [25, 1.48], [26, 1.49], [50, 1.73], [51, 1.735], [100, 1.98]]) {
    near(NV.weaponLevelDamageMultiplier(level), expected, 'L' + level);
  }
});

t('nivel 16 aplica el mismo multiplicador relativo a bases representativas', () => {
  for (const [id, expected] of [['shotgun', 6.5], ['smg', 9.1], ['pistol', 18.2], ['bow', 24.7], ['plasma', 27.3], ['railgun', 91]]) {
    const weapon = NV.weaponById(id);
    near(weapon.damage * NV.weaponLevelDamageMultiplier(16), expected, id);
  }
});

t('nivel 1 no concede +1 oculto', () => {
  const shot = shootWeapon('pistol', 1);
  if (shot.bullets[0].damage !== 14) throw new Error('pistol L1=' + shot.bullets[0].damage);
});

t('Plasma L11 y L16 escalan proporcionalmente sin cambiar count ni splash', () => {
  const at11 = shootWeapon('plasma', 11);
  if (at11.bullets.length !== 2) throw new Error('count L11=' + at11.bullets.length);
  if (at11.bullets[0].damage !== 25) throw new Error('damage L11=' + at11.bullets[0].damage);
  const at16 = shootWeapon('plasma', 16);
  if (at16.bullets.length !== 2) throw new Error('count=' + at16.bullets.length);
  for (const bullet of at16.bullets) {
    if (bullet.damage !== 27) throw new Error('damage L16=' + bullet.damage);
    if (bullet.splashRadius !== 58 || bullet.impactType !== 'splash') throw new Error('perfil Plasma alterado');
    if (bullet.pierce !== 1 || bullet.maxTravelDistance !== 520) throw new Error('perfil de impacto alterado');
  }
});

t('Plasma conserva el permanente plano fuera del multiplicador de nivel', () => {
  const shot = shootWeapon('plasma', 16, { permDamageBonus: 2 });
  if (shot.bullets[0].damage !== Math.round(21 * 1.3 + 4)) throw new Error('damage=' + shot.bullets[0].damage);
  if (shot.bullets[0].damage === Math.round((21 + 4) * 1.3)) throw new Error('el nivel multiplicó el permanente');
});

t('Shotgun L16 escala cada pellet sin cambiar el conteo', () => {
  const shot = shootWeapon('shotgun', 16);
  if (shot.bullets.length !== NV.BALANCE.SHOTGUN_PELLET_COUNT) throw new Error('pellets=' + shot.bullets.length);
  if (shot.bullets.some((bullet) => bullet.damage !== 7)) throw new Error('daño de pellet no redondea 6.5 a 7');
});

t('Bow L16 conserva daño proporcional en impacto inicial y cadena', () => {
  const shot = shootWeapon('bow', 16), bullet = shot.bullets[0];
  if (bullet.damage !== 25) throw new Error('damage=' + bullet.damage);
  if (bullet.impactType !== 'bounce' || bullet.bounceLeft !== 3) throw new Error('perfil Bow alterado');
  const enemies = [
    { x: 100, y: 100, radius: 10, hp: 100, dead: false },
    { x: 140, y: 100, radius: 10, hp: 100, dead: false },
  ];
  bullet.x = 100; bullet.y = 100; bullet.vx = 0; bullet.vy = 0;
  const state = mkState({ bullets: [bullet], enemies, boss: null,
    player: { x: -1000, y: -1000, character: 'boti', bulwark: 0, invuln: 0, stun: 0 } });
  let result = NV.updateBullets(0, state);
  state.bullets = result.bullets;
  result = NV.updateBullets(0, state);
  // El impacto primario usa el daño completo escalado; el primer rebote aplica
  // la caída por ordinal 0.85 sobre ese MISMO daño horneado (no acumulativo).
  if (enemies[0].hp !== 75) throw new Error('HP primario=' + enemies[0].hp);
  near(100 - enemies[1].hp, 25 * 0.85, 'HP primer rebote');
  near(bullet.damage, 25, 'b.damage original preservado tras la cadena');
});

t('Flamethrower y Railgun L16 usan la misma escala proporcional', () => {
  const flame = shootWeapon('flamethrower', 16).flame;
  const rail = shootWeapon('railgun', 16).bullets[0];
  if (!flame || flame.damage !== 8) throw new Error('flame=' + (flame && flame.damage));
  if (rail.damage !== 91) throw new Error('rail=' + rail.damage);
});

t('permanente plano queda fuera del multiplicador de nivel', () => {
  const shot = shootWeapon('pistol', 16, { permDamageBonus: 2 });
  if (shot.bullets[0].damage !== Math.round(14 * 1.3 + 4)) throw new Error('damage=' + shot.bullets[0].damage);
  if (shot.bullets[0].damage === Math.round((14 + 4) * 1.3)) throw new Error('el nivel multiplicó el permanente');
});

t('crítico conserva x2 después del daño final redondeado', () => {
  const normal = shootWeapon('pistol', 16).bullets[0];
  const critical = shootWeapon('pistol', 16, { crit: true }).bullets[0];
  if (!critical.crit || critical.damage !== normal.damage * 2) throw new Error('normal=' + normal.damage + ' crit=' + critical.damage);
});

function mkEnemies(count, x0, y, gap) {
  const arr = [];
  for (let i = 0; i < count; i++) arr.push({ x: x0 + i * gap, y: y || 300, radius: 10, hp: 100, dead: false });
  return arr;
}
function mkState(over) {
  return Object.assign({
    W: 900, H: 520, CHARACTERS: NV.CHARACTERS, SHIELD_COOLDOWN: 0.9,
    applyPlayerDamage: () => ({ applied: false, dodged: false, damage: 1, crit: false, killed: false }),
    addFloatText() {}, killEnemy(e) { e.dead = true; }, applyKnockback() {}, spawnExplosion() {},
  }, over);
}

// ==================== FLAMETHROWER ====================
console.log('\n--- flamethrower ---');

t('flamethrower NO crea balas viajeras al disparar', () => {
  const bullets = [];
  NV.shoot({
    player: { x: 400, y: 450, luck: 0, permCrit: 0, overdrive: 0 },
    enemies: mkEnemies(3, 100, 400), boss: null, bullets, currentWeapon: NV.weaponById('flamethrower'),
    currentWeaponLevel: () => 1, weaponVisualTier: () => 0, BULLET_TIER_COLORS: ['#fff'], MAX_BULLETS: 100,
    permDamageBonus: 0, playWeaponSound() {}, wave: 1, fusionStep: 0.2, currentWeaponFusion: 0,
    onTarget() {}, onFlame(config) { if (!config || typeof config.range !== 'number') throw new Error('onFlame sin config'); },
  });
  if (bullets.length !== 0) throw new Error('flamethrower NO debe crear balas viajeras, creó ' + bullets.length);
});

t('flamethrower no dispara fuera de rango', () => {
  const res = NV.shoot({
    player: { x: 400, y: 450, luck: 0, permCrit: 0, overdrive: 0 },
    enemies: [{ x: 400, y: 100, radius: 10, hp: 100, dead: false }], boss: null, bullets: [],
    currentWeapon: NV.weaponById('flamethrower'),
    currentWeaponLevel: () => 1, weaponVisualTier: () => 0, BULLET_TIER_COLORS: ['#fff'], MAX_BULLETS: 100,
    permDamageBonus: 0, playWeaponSound() {}, wave: 1, fusionStep: 0.2, currentWeaponFusion: 0, onTarget() {},
  });
  if (res !== false) throw new Error('fuera de rango debe devolver false');
});

t('flamethrower: creaFlameZone produce zona con geometría acotada', () => {
  const z = NV.createFlameZone({ x: 100, y: 100, angle: 0, range: 170, damage: 6 });
  if (z.range !== 170) throw new Error('range=' + z.range);
  if (z.halfAngle <= 0 || z.halfAngle > 0.5) throw new Error('halfAngle=' + z.halfAngle);
  if (z.type !== 'flame') throw new Error('type=' + z.type);
});

t('flamethrower: solo daña enemigos DENTRO del cono', () => {
  const enemies = [
    { x: 200, y: 300, radius: 10, hp: 100, dead: false },
    { x: 0, y: 300, radius: 10, hp: 100, dead: false },
  ];
  const z = NV.createFlameZone({ x: 100, y: 300, angle: 0, range: 170, halfAngle: 0.22, damage: 10, tickRate: 7, life: 0.35, maxLife: 0.35, burnDamage: 3, burnDuration: 0.6 });
  NV.flameZoneDamage(z, { enemies, boss: null, killEnemy(e) { e.dead = true; } });
  if (enemies[0].hp !== 90) throw new Error('enemigo dentro del cone no dañado: hp=' + enemies[0].hp);
  if (enemies[1].hp !== 100) throw new Error('enemigo fuera del cone dañado: hp=' + enemies[1].hp);
});

t('flamethrower: daño por tick controlado (no cada frame)', () => {
  const enemies = [{ x: 150, y: 300, radius: 10, hp: 100, dead: false }];
  const player = { x: 100, y: 320 }; // zona sigue a (100,300), enemigo a la derecha (angle 0)
  const z = NV.createFlameZone({ x: 100, y: 300, angle: 0, range: 170, halfAngle: 0.30, damage: 10, tickRate: 5, life: 0.5, maxLife: 0.5, burnDamage: 3, burnDuration: 0.6 });
  let zones = [z];
  zones = NV.updateFlameZones(0.10, zones, { player, enemies, boss: null, currentAutoTarget: null });
  if (enemies[0].hp !== 100) throw new Error('daño prematuro: hp=' + enemies[0].hp);
  zones = NV.updateFlameZones(0.15, zones, { player, enemies, boss: null, currentAutoTarget: null });
  if (enemies[0].hp !== 90) throw new Error('daño no aplicado en tick: hp=' + enemies[0].hp);
});

t('flamethrower: burn no hace stacking', () => {
  const e = { x: 100, y: 100, hp: 100, dead: false };
  NV.applyBurn(e, 5, 0.6);
  NV.applyBurn(e, 5, 0.6);
  if (!e.burn || e.burn.dps !== 5) throw new Error('DPS duplicado: ' + (e.burn && e.burn.dps));
  NV.applyBurn(e, 10, 0.3);
  if (e.burn.dps !== 10) throw new Error('no tomó mayor DPS: ' + e.burn.dps);
});

t('flamethrower: burn expira y limpia estado', () => {
  const enemies = [{ x: 100, y: 100, hp: 50, dead: false }];
  NV.applyBurn(enemies[0], 5, 0.2);
  NV.updateBurns(0.5, { enemies, boss: null, killEnemy() {} });
  if (enemies[0].burn !== null) throw new Error('burn no expiró');
});

t('flamethrower: overdrive no crea múltiples zonas dañinas', () => {
  let flameCount = 0;
  const bullets = [];
  NV.shoot({
    player: { x: 400, y: 450, luck: 0, permCrit: 0, overdrive: 5 },
    enemies: [{ x: 450, y: 450, radius: 10, hp: 100, dead: false }], boss: null, bullets, currentWeapon: NV.weaponById('flamethrower'),
    currentWeaponLevel: () => 1, weaponVisualTier: () => 0, BULLET_TIER_COLORS: ['#fff'], MAX_BULLETS: 100,
    permDamageBonus: 0, playWeaponSound() {}, wave: 1, fusionStep: 0.2, currentWeaponFusion: 0,
    onTarget() {}, onFlame() { flameCount++; },
  });
  if (flameCount !== 1) throw new Error('overdrive creó ' + flameCount + ' zonas');
});

t('flamethrower: aim manual y auto producen la misma geometría', () => {
  let manual = null, auto = null;
  const common = {
    player: { x: 100, y: 120, luck: 0, permCrit: 0, overdrive: 0 },
    boss: null, bullets: [], currentWeapon: NV.weaponById('flamethrower'),
    currentWeaponLevel: () => 1, weaponVisualTier: () => 0, BULLET_TIER_COLORS: ['#fff'], MAX_BULLETS: 100,
    permDamageBonus: 0, playWeaponSound() {}, wave: 1, fusionStep: 0.2, currentWeaponFusion: 0, onTarget() {},
  };
  NV.shoot(Object.assign({}, common, { enemies: [], aimVector: { x: 1, y: 0 }, onFlame(z) { manual = z; } }));
  NV.shoot(Object.assign({}, common, { enemies: [{ x: 200, y: 120, radius: 10, hp: 100, dead: false }], onFlame(z) { auto = z; } }));
  if (!manual || !auto) throw new Error('faltó zona en uno de los modos');
  if (manual.range !== auto.range || Math.abs(manual.angle - auto.angle) > 0.000001) throw new Error('geometría diferente');
});

t('flamethrower: zona expirada no daña spawns futuros', () => {
  const player = { x: 100, y: 320 };
  let zones = [NV.createFlameZone({ x: 100, y: 300, angle: 0, range: 170, damage: 10, tickRate: 6, life: 0.05 })];
  zones = NV.updateFlameZones(0.1, zones, { player, enemies: [], boss: null, currentAutoTarget: null });
  const future = { x: 150, y: 300, radius: 10, hp: 100, dead: false };
  zones = NV.updateFlameZones(1, zones, { player, enemies: [future], boss: null, currentAutoTarget: null });
  if (zones.length !== 0 || future.hp !== 100) throw new Error('zona expirada dañó un spawn futuro');
});
// ==================== SHOTGUN ====================
console.log('\n--- shotgun ---');

function shootShotgun(target, overdrive) {
  const bullets = [];
  NV.shoot({
    player: { x: 0, y: 20, luck: -1000, permCrit: 0, overdrive: overdrive || 0 },
    enemies: [target], boss: null, bullets,
    aimVector: { x: 1, y: 0 },
    currentWeapon: NV.weaponById('shotgun'),
    currentWeaponLevel: () => 1, weaponVisualTier: () => 0, BULLET_TIER_COLORS: ['#fff'], MAX_BULLETS: 100,
    permDamageBonus: 0, playWeaponSound() {}, wave: 1, fusionStep: 0.2, currentWeaponFusion: 0, onTarget() {},
  });
  return bullets;
}

function advanceBullets(bullets, enemies, seconds) {
  const st = mkState({ bullets, enemies, boss: null, player: { x: -1000, y: -1000, character: 'boti', bulwark: 0, invuln: 0, stun: 0 } });
  const steps = Math.ceil(seconds / 0.02);
  for (let i = 0; i < steps && bullets.length; i++) {
    st.bullets = bullets;
    bullets = NV.updateBullets(0.02, st).bullets;
  }
  return bullets;
}

const SG_WEAPON = NV.weaponById('shotgun');
const SG_RANGE = SG_WEAPON.range;
const SG_BLOOM_START = NV.BALANCE.SHOTGUN_BLOOM_START;

t('shotgun crea un patrón acotado de pellets reales', () => {
  const bullets = shootShotgun({ x: 100, y: 0, radius: 10, hp: 100, dead: false });
  if (bullets.length !== NV.BALANCE.SHOTGUN_PELLET_COUNT) throw new Error('pellets=' + bullets.length);
  if (bullets.length < 11 || bullets.length > 13) throw new Error('conteo fuera de presupuesto=' + bullets.length);
  if (bullets.some(b => b.impactType !== 'pellet' || b.maxTravelDistance !== SG_RANGE)) throw new Error('perfil de pellet/rango inválido');
  if (new Set(bullets.map(b => b.shotGroup)).size !== 1) throw new Error('no comparten cap por descarga');
  const weapon = NV.weaponById('shotgun');
  if (weapon.count !== 12 || weapon.damage !== 5) throw new Error('datos shotgun=' + weapon.count + 'x' + weapon.damage);
  if (weapon.count * weapon.damage !== 60) throw new Error('daño teórico=' + (weapon.count * weapon.damage));
  if (!bullets.some(b => b.shotgunSpreadFactor === 0)) throw new Error('falta centro de rosa');
  if (new Set(bullets.map(b => b.shotgunSpreadFactor)).size < 9) throw new Error('patrón poco distribuido');
});

t('shotgun: paquete geométrico MODERATE 0.90/65/5 preserva el resto del contrato', () => {
  // Geometría aprobada: max spread amplio, apertura 10 unidades antes, cap 5.
  if (SG_RANGE !== 250) throw new Error('range=' + SG_RANGE + ' esperado=250');
  if (SG_BLOOM_START !== 65) throw new Error('bloomStart=' + SG_BLOOM_START + ' esperado=65');
  // Dimensiones explícitamente invariantes en este bloque.
  if (SG_WEAPON.damage !== 5) throw new Error('damage=' + SG_WEAPON.damage);
  if (SG_WEAPON.count !== 12) throw new Error('count=' + SG_WEAPON.count);
  if (SG_WEAPON.fireRate !== 45) throw new Error('fireRate=' + SG_WEAPON.fireRate);
  if (SG_WEAPON.speed !== 400) throw new Error('speed=' + SG_WEAPON.speed);
  near(NV.BALANCE.SHOTGUN_SPREAD, 0.90, 'SHOTGUN_SPREAD');
  near(NV.BALANCE.SHOTGUN_COMPACT_SPREAD, 0.018, 'SHOTGUN_COMPACT_SPREAD');
  if (NV.BALANCE.SHOTGUN_PELLET_COUNT !== 12) throw new Error('SHOTGUN_PELLET_COUNT=' + NV.BALANCE.SHOTGUN_PELLET_COUNT);
  if (NV.BALANCE.SHOTGUN_UNIQUE_TARGET_CAP !== 5) throw new Error('cap=' + NV.BALANCE.SHOTGUN_UNIQUE_TARGET_CAP);
  // El spread máximo configurado sigue siendo el que alcanza el pellet en su rango.
  const bullets = shootShotgun({ x: 100, y: 0, radius: 10, hp: 100, dead: false });
  if (bullets.some(b => b.shotgunMaxSpread !== NV.BALANCE.SHOTGUN_SPREAD)) throw new Error('spread máximo divergente');
  if (bullets.some(b => b.shotgunCompactSpread !== NV.BALANCE.SHOTGUN_COMPACT_SPREAD)) throw new Error('spread compacto divergente');
  if (bullets.some(b => b.shotgunBloomStart !== SG_BLOOM_START)) throw new Error('bloomStart del pellet divergente');
  if (bullets.length !== 12) throw new Error('proyectiles=' + bullets.length);
  if (bullets.some(b => b.damage !== bullets[0].damage)) throw new Error('daño por pellet desigual');
  // Sin lógica de jefe introducida: mismo perfil de impacto que cualquier cuerpo.
  if (bullets.some(b => b.impactType !== 'pellet')) throw new Error('perfil de impacto alterado');
});

t('shotgun: daño por pellet y conteo no dependen de la geometría', () => {
  const a = shootShotgun({ x: 100, y: 0, radius: 10, hp: 100, dead: false });
  const b = shootShotgun({ x: 100, y: 0, radius: 10, hp: 100, dead: false });
  if (a.length !== b.length) throw new Error('conteo no determinista');
  if (a[0].damage !== b[0].damage) throw new Error('daño no determinista');
  // Escalado proporcional por nivel intacto: el nivel 16 aplica x1.30 sobre la base.
  // (niveles bajos redondean al mismo entero; se usa un nivel con escala efectiva)
  const scaled = [];
  NV.shoot({
    player: { x: 0, y: 20, luck: -1000, permCrit: 0, overdrive: 0 },
    enemies: [{ x: 100, y: 0, radius: 10, hp: 100, dead: false }], boss: null, bullets: scaled,
    aimVector: { x: 1, y: 0 }, currentWeapon: SG_WEAPON,
    currentWeaponLevel: () => 16, weaponVisualTier: () => 0, BULLET_TIER_COLORS: ['#fff'], MAX_BULLETS: 100,
    permDamageBonus: 0, playWeaponSound() {}, wave: 1, fusionStep: 0.2, currentWeaponFusion: 0, onTarget() {},
  });
  if (scaled.length !== a.length) throw new Error('conteo escalado=' + scaled.length);
  // El redondeo entero final se conserva: el daño escalado es el redondeo de base*mult.
  const mult = NV.weaponLevelDamageMultiplier(16);
  if (scaled[0].damage !== Math.round(SG_WEAPON.damage * mult)) throw new Error('escalado=' + scaled[0].damage + ' esperado=' + Math.round(SG_WEAPON.damage * mult));
  if (!(scaled[0].damage > a[0].damage)) throw new Error('nivel no escala daño');
  if (scaled[0].maxTravelDistance !== SG_RANGE) throw new Error('rango alterado por nivel');
});

t('shotgun: definición visual usa micro-pellets sin bolas grandes', () => {
  const def = NV.BULLET_DEFS.shotgun;
  if (!def || def.shape !== 'pellet') throw new Error('shape inválida');
  if (!(def.r > 0 && def.r <= 0.8)) throw new Error('radio visual=' + def.r);
});

function pelletSnapshot(distance) {
  let bullets = shootShotgun({ x: 800, y: 0, radius: 10, hp: 100, dead: false });
  const st = mkState({ bullets, enemies: [], boss: null, player: { x: -1000, y: -1000, character: 'boti', bulwark: 0, invuln: 0, stun: 0 } });
  const seconds = distance / NV.weaponById('shotgun').speed;
  const steps = Math.ceil(seconds / 0.005);
  for (let i = 0; i < steps && bullets.length; i++) {
    st.bullets = bullets;
    bullets = NV.updateBullets(0.005, st).bullets;
  }
  const xs = bullets.map(b => b.x), ys = bullets.map(b => b.y);
  return {
    bullets,
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
    bloom: Math.max(...bullets.map(b => b.shotgunBloom || 0)),
  };
}

t('shotgun: rosa permanece muy compacta antes de bloomStart', () => {
  const before = pelletSnapshot(NV.BALANCE.SHOTGUN_BLOOM_START - 8);
  if (before.bloom !== 0) throw new Error('bloom prematuro=' + before.bloom);
  if (before.height > 6) throw new Error('rosa pre-bloom demasiado abierta=' + before.height);
  if (before.width > 12) throw new Error('rosa pre-bloom demasiado larga=' + before.width);
});

t('shotgun: apertura comienza después de bloomStart y progresa suavemente', () => {
  const before = pelletSnapshot(SG_BLOOM_START - 7);
  const early = pelletSnapshot(SG_BLOOM_START + 45), middle = pelletSnapshot(SG_BLOOM_START + 90), far = pelletSnapshot(SG_BLOOM_START + 145);
  if (before.bloom !== 0) throw new Error('before bloom=' + before.bloom);
  if (!(early.bloom > 0 && early.bloom < middle.bloom && middle.bloom < far.bloom && far.bloom <= 1)) {
    throw new Error('bloom=' + [before.bloom, early.bloom, middle.bloom, far.bloom].join(','));
  }
  if (!(before.height < early.height && early.height < middle.height && middle.height < far.height)) {
    throw new Error('alturas=' + [before.height, early.height, middle.height, far.height].join(','));
  }
  if (far.height < before.height * 3) throw new Error('apertura final insuficiente=' + far.height);
  // La rosa final sigue siendo una figura reconocible (no degenerada a linea ni a disco):
  // con ease-out el alto domina porque el factor forward alcanza antes su tope.
  if (far.width < far.height * 0.35 || far.width > far.height * 1.45) throw new Error('rosa final degenerada=' + far.width + 'x' + far.height);
});

t('shotgun: curva ease-out abre más rápido que el antiguo smoothstep', () => {
  // Contrato de la curva 1-(1-raw)²: en progreso temprano/médio el bloom supera
  // al smoothstep raw²(3-2raw) para el MISMO raw normalizado.
  const denom = SG_RANGE - SG_BLOOM_START;
  const engineBloomAt = (dist) => pelletSnapshot(dist).bloom;
  for (const raw of [0.2, 0.4, 0.6]) {
    const dist = Math.round(SG_BLOOM_START + raw * denom);
    const measured = engineBloomAt(dist);
    const easeOut = 1 - (1 - raw) * (1 - raw);
    const smoothstep = raw * raw * (3 - 2 * raw);
    // Tolerancia amplia: el muestreo discreto y el lookahead desplazan el raw real.
    if (!(measured > smoothstep - 0.06)) {
      throw new Error('raw~' + raw + ' no supera smoothstep: medido=' + measured.toFixed(3) + ' smoothstep=' + smoothstep.toFixed(3));
    }
    if (Math.abs(measured - easeOut) > 0.20) {
      throw new Error('raw~' + raw + ' fuera de ease-out: medido=' + measured.toFixed(3) + ' easeOut=' + easeOut.toFixed(3));
    }
  }
});

t('shotgun: bloom es cero hasta bloomStart y estrictamente creciente después', () => {
  // Punto de corte: el bloom permanece exactamente en cero hasta el umbral.
  // Margen de 4 unidades porque updateShotgunPelletVelocity mira hasta
  // speed*dt*0.2 por delante al integrar, así que bloomStart-1 puede overshoot.
  for (const d of [1, 20, 40, 60, SG_BLOOM_START - 4]) {
    if (pelletSnapshot(d).bloom !== 0) throw new Error('bloom antes de bloomStart a ' + d);
  }
  // Inmediatamente después del umbral el bloom ya es positivo.
  if (!(pelletSnapshot(SG_BLOOM_START + 5).bloom > 0)) throw new Error('bloom no arrancó tras bloomStart');
  // Después del umbral debe crecer de forma monótona estricta.
  let prev = 0;
  for (let d = SG_BLOOM_START + 5; d < SG_RANGE; d += 10) {
    const b = pelletSnapshot(d).bloom;
    if (!(b > prev)) throw new Error('bloom no monótono en ' + d + ': ' + prev + '->' + b);
    prev = b;
  }
  // Concentración point-blank conservada: la rosa sigue siendo minúscula al inicio.
  const pointBlank = pelletSnapshot(50);
  if (pointBlank.height > 6) throw new Error('rosa point-blank demasiado abierta=' + pointBlank.height);
});

t('shotgun: un blanco cercano recibe más impactos que uno lejano equivalente', () => {
  const close = { x: 70, y: 0, radius: 10, hp: 500, dead: false };
  const closeShot = shootShotgun(close), pelletDamage = closeShot[0].damage;
  advanceBullets(closeShot, [close], 0.7);
  const closeHits = (500 - close.hp) / pelletDamage;
  const far = { x: 225, y: 0, radius: 7, hp: 500, dead: false };
  advanceBullets(shootShotgun(far), [far], 0.7);
  const farHits = (500 - far.hp) / pelletDamage;
  if (!(closeHits >= 10 && closeHits >= farHits + 3)) throw new Error('close=' + closeHits + ' far=' + farHits);
});

t('shotgun: múltiples pellets pueden golpear al mismo enemigo', () => {
  const enemy = { x: 70, y: 0, radius: 10, hp: 500, dead: false };
  const bullets = shootShotgun(enemy), pelletDamage = bullets[0].damage;
  advanceBullets(bullets, [enemy], 0.7);
  if (enemy.hp > 500 - pelletDamage * 10) throw new Error('solo recibió ' + ((500 - enemy.hp) / pelletDamage) + ' impactos');
});

t('shotgun: primer cuerpo consume sólo pellets intersectados y los demás continúan', () => {
  const first = { x: 205, y: 0, radius: 5, hp: 500, dead: false };
  let bullets = shootShotgun(first), pelletDamage = bullets[0].damage;
  bullets = advanceBullets(bullets, [first], 0.54);
  const firstHits = (500 - first.hp) / pelletDamage;
  if (!(firstHits > 0 && firstHits < NV.BALANCE.SHOTGUN_PELLET_COUNT)) throw new Error('impactos primer cuerpo=' + firstHits);
  if (!bullets.length || !bullets.some(b => b.x > first.x)) throw new Error('no sobrevivieron pellets más allá del primer cuerpo');
  const second = { x: 228, y: 10, radius: 5, hp: 500, dead: false };
  bullets = advanceBullets(bullets, [first, second], 0.2);
  if (second.hp >= 500) throw new Error('pellets supervivientes no alcanzaron segundo cuerpo');
});

t('shotgun: cap duro de enemigos únicos por descarga', () => {
  const group = { targets: [], cap: NV.BALANCE.SHOTGUN_UNIQUE_TARGET_CAP };
  const enemies = Array.from({ length: 5 }, (_, i) => ({ x: 100 + i * 40, y: 100, radius: 10, hp: 100, dead: false }));
  const bullets = enemies.map(e => ({ x: e.x, y: e.y, vx: 0, vy: 0, damage: 5, dead: false, isEnemy: false, pierce: 1, impactType: 'pellet', traveledDistance: 0, maxTravelDistance: SG_RANGE, hitTargets: [], wid: 'shotgun', shotGroup: group }));
  const st = mkState({ bullets, enemies, boss: null, player: { x: -1000, y: -1000, character: 'boti', bulwark: 0, invuln: 0, stun: 0 } });
  NV.updateBullets(0, st);
  const damaged = enemies.filter(e => e.hp < 100).length;
  if (damaged !== 5 || group.targets.length !== 5) throw new Error('dañó ' + damaged + ' registrados=' + group.targets.length);
});

t('shotgun: cap 5 admite 4º y 5º objetivo válidos y rechaza el 6º', () => {
  // Geometría determinista: seis enemigos en carriles separados, todos alcanzables.
  const cap = NV.BALANCE.SHOTGUN_UNIQUE_TARGET_CAP;
  if (cap !== 5) throw new Error('cap=' + cap);
  const group = { targets: [], cap: cap };
  const enemies = Array.from({ length: 6 }, (_, i) => ({ x: 100, y: i * 30, radius: 10, hp: 100, dead: false }));
  // Dos pellets por carril: el primero registra, el segundo debe seguir conectando.
  const bullets = [];
  for (const e of enemies) {
    for (let k = 0; k < 2; k++) {
      bullets.push({ x: e.x, y: e.y, vx: 0, vy: 0, damage: 5, dead: false, isEnemy: false, pierce: 1, impactType: 'pellet', traveledDistance: 0, maxTravelDistance: SG_RANGE, hitTargets: [], wid: 'shotgun', shotGroup: group });
    }
  }
  const st = mkState({ bullets, enemies, boss: null, player: { x: -1000, y: -1000, character: 'boti', bulwark: 0, invuln: 0, stun: 0 } });
  NV.updateBullets(0, st);
  const damaged = enemies.filter(e => e.hp < 100).length;
  // 4º y 5º objetivos válidos reciben pellet.
  if (damaged < 5) throw new Error('dañó ' + damaged + ' de 6, esperaba 5');
  if (group.targets.length !== 5) throw new Error('registrados=' + group.targets.length);
  // El 6º objetivo NUEVO queda intacto: rechazado solo por el cap.
  if (enemies[5].hp !== 100) throw new Error('6º objetivo no debe dañarse hp=' + enemies[5].hp);
  // Los cinco primeros siguen recibiendo multiples pellets (ya registrados).
  const perTarget = enemies.slice(0, 5).map(e => (100 - e.hp) / 5);
  if (!perTarget.every(n => n >= 2)) throw new Error('pellets por objetivo registrado=' + perTarget.join(','));
});

t('shotgun: footprint físico se abre con la distancia en media/larga', () => {
  // Bands amplias: protegen la identidad (fan medio MUCHO más ancho que point-blank)
  // sin congelar snapshots exactos que dependan del muestreo numérico.
  const pointBlank = pelletSnapshot(60).height;
  const mid = pelletSnapshot(150).height;
  const far = pelletSnapshot(200).height;
  if (!(pointBlank > 0 && pointBlank <= 8)) throw new Error('point-blank=' + pointBlank);
  if (!(mid > pointBlank * 2)) throw new Error('medio no abre=' + mid + ' vs ' + pointBlank);
  if (!(far > mid * 1.2)) throw new Error('lejano no sigue abriendo=' + far + ' vs ' + mid);
  if (!(far >= 30)) throw new Error('fan medio/largo materialmente ancho=' + far);
});

t('shotgun: jefe grande cercano recibe burst fuerte pero acotado', () => {
  // La geometría sigue conectando, pero el presupuesto por descarga evita que
  // el gran radio del jefe convierta automáticamente los 12 pellets en daño.
  const boss = { x: 120, y: 0, radius: 50, hp: 1e7, dead: false, isBoss: true };
  let bullets = shootShotgun(boss);
  const pelletDamage = bullets[0].damage;
  const st = mkState({ bullets, enemies: [], boss, player: { x: -1000, y: -1000, character: 'boti', bulwark: 0, invuln: 0, stun: 0 } });
  for (let i = 0; i < 600 && bullets.length; i++) {
    st.bullets = bullets;
    bullets = NV.updateBullets(0.002, st).bullets;
  }
  const hits = (1e7 - boss.hp) / pelletDamage;
  if (hits !== NV.BALANCE.SHOTGUN_BOSS_PELLET_CAP) throw new Error('jefe cercano recibió ' + hits + ' pellets');
  if (bullets.length !== 0) throw new Error('quedaron pellets atravesando al jefe');
});

t('shotgun: expira por distancia sin daño', () => {
  const enemies = [{ x: 1000, y: 0, radius: 10, hp: 100, dead: false }];
  const bullets = [{ x: 100, y: 0, vx: 600, vy: 0, damage: 5, dead: false, isEnemy: false, pierce: 1, impactType: 'pellet', traveledDistance: SG_RANGE - 1, maxTravelDistance: SG_RANGE, hitTargets: [], wid: 'shotgun', shotGroup: { targets: [], cap: 3 } }];
  const st = mkState({ bullets, enemies, boss: null, player: { x: -1000, y: -1000, character: 'boti', bulwark: 0, invuln: 0, stun: 0 } });
  const res = NV.updateBullets(0.1, st);
  if (res.bullets.length !== 0) throw new Error('no expiró');
  if (enemies[0].hp !== 100) throw new Error('daño tras expiración');
});

t('shotgun: pellets expirados no dañan spawns futuros', () => {
  let bullets = shootShotgun({ x: 100, y: 0, radius: 10, hp: 100, dead: false });
  bullets = advanceBullets(bullets, [], 1);
  const future = { x: 120, y: 0, radius: 30, hp: 100, dead: false };
  advanceBullets(bullets, [future], 1);
  if (bullets.length !== 0 || future.hp !== 100) throw new Error('pellet futuro persistente');
});

// ==================== PLASMA ====================
console.log('\n--- plasma ---');

t('plasma: calibración final de daño base 21 preserva identidad', () => {
  const plasma = NV.weaponById('plasma');
  if (plasma.damage !== 21) throw new Error('damage=' + plasma.damage);
  if (plasma.count !== 2 || plasma.range !== 520 || plasma.speed !== 600 || plasma.spread !== 0.1) throw new Error('se alteró otra dimensión del plasma');
  if (plasma.fireRate !== 35 || plasma.rarity !== 'legendary') throw new Error('se alteró cadencia/rareza del plasma');
  const impact = NV.weaponImpactProfile(plasma);
  if (impact.type !== 'splash' || impact.pierce !== 1 || impact.radius !== 58) throw new Error('se alteró perfil de impacto del plasma');
});

t('plasma: proyectil con maxTravelDistance', () => {
  const bullets = [];
  NV.shoot({
    player: { x: 0, y: 0, luck: 0, permCrit: 0, overdrive: 0 },
    enemies: [{ x: 100, y: 0, radius: 10, hp: 100, dead: false }], boss: null, bullets,
    currentWeapon: NV.weaponById('plasma'),
    currentWeaponLevel: () => 1, weaponVisualTier: () => 0, BULLET_TIER_COLORS: ['#fff'], MAX_BULLETS: 100,
    permDamageBonus: 0, playWeaponSound() {}, wave: 1, fusionStep: 0.2, currentWeaponFusion: 0, onTarget() {},
  });
  if (!bullets.length) throw new Error('no disparó');
  if (typeof bullets[0].maxTravelDistance !== 'number' || bullets[0].maxTravelDistance <= 0) throw new Error('sin maxTravelDistance');
});

t('plasma: expira al alcanzar distancia máxima sin daño', () => {
  const enemies = [{ x: 1000, y: 0, radius: 10, hp: 100, dead: false }];
  const bullets = [{ x: 100, y: 0, vx: 600, vy: 0, damage: 21, dead: false, isEnemy: false, pierce: 1, impactType: 'splash', splashRadius: 58, traveledDistance: 519, maxTravelDistance: 520, hitTargets: [], wid: 'plasma', color: '#a855f7' }];
  const st = mkState({ bullets, enemies, boss: null, player: { x: -1000, y: -1000, character: 'boti', bulwark: 0, invuln: 0, stun: 0 } });
  const res = NV.updateBullets(0.1, st);
  if (res.bullets.length !== 0) throw new Error('no expiró');
  if (enemies[0].hp !== 100) throw new Error('daño tras expiración');
});

t('plasma: splash al impacto intacto', () => {
  const enemies = [
    { x: 100, y: 0, radius: 10, hp: 100, dead: false },
    { x: 145, y: 0, radius: 10, hp: 100, dead: false },
  ];
  const bullets = [{ x: 100, y: 0, vx: 0, vy: 0, damage: 21, dead: false, isEnemy: false, pierce: 1, impactType: 'splash', splashRadius: 58, traveledDistance: 0, maxTravelDistance: 520, hitTargets: [], wid: 'plasma', color: '#a855f7' }];
  const st = mkState({ bullets, enemies, boss: null, player: { x: -1000, y: -1000, character: 'boti', bulwark: 0, invuln: 0, stun: 0 } });
  NV.updateBullets(0, st);
  if (enemies[0].hp !== 79) throw new Error('impacto inicial hp=' + enemies[0].hp);
  if (enemies[1].hp !== 79) throw new Error('splash cercano hp=' + enemies[1].hp);
});

t('plasma: impacto directo al boss no vuelve a dañarlo con su propio splash', () => {
  const boss = { x: 100, y: 0, radius: 40, hp: 1000, maxHp: 1000, hitFlash: 0, dead: false };
  const bullets = [{ x: 100, y: 0, vx: 0, vy: 0, damage: 21, dead: false, isEnemy: false, pierce: 1, impactType: 'splash', splashRadius: 58, traveledDistance: 0, maxTravelDistance: 520, hitTargets: [], wid: 'plasma', color: '#a855f7' }];
  const st = mkState({ bullets, enemies: [], boss, player: { x: -1000, y: -1000, character: 'boti', bulwark: 0, invuln: 0, stun: 0 } });
  NV.updateBullets(0, st);
  if (boss.hp !== 979) throw new Error('daño directo duplicado=' + (1000 - boss.hp));
});

t('plasma: explosión nacida en un enemigo puede alcanzar al boss una sola vez', () => {
  const enemy = { x: 100, y: 0, radius: 10, hp: 100, dead: false };
  const boss = { x: 145, y: 0, radius: 40, hp: 1000, maxHp: 1000, hitFlash: 0, dead: false };
  const bullets = [{ x: 100, y: 0, vx: 0, vy: 0, damage: 21, dead: false, isEnemy: false, pierce: 1, impactType: 'splash', splashRadius: 58, traveledDistance: 0, maxTravelDistance: 520, hitTargets: [], wid: 'plasma', color: '#a855f7' }];
  const st = mkState({ bullets, enemies: [enemy], boss, player: { x: -1000, y: -1000, character: 'boti', bulwark: 0, invuln: 0, stun: 0 } });
  NV.updateBullets(0, st);
  if (enemy.hp !== 79) throw new Error('impacto directo enemigo=' + enemy.hp);
  if (boss.hp !== 979) throw new Error('splash al boss=' + (1000 - boss.hp));
});

// ==================== ARSENAL ROLES ====================
console.log('\n--- arsenal roles ---');

t('francotirador: bonus de elite no altera normales', () => {
  const normal = { x: 100, y: 0, radius: 10, hp: 1000, dead: false };
  const elite = { x: 100, y: 40, radius: 10, hp: 1000, dead: false, isElite: true };
  const normalBullet = [{ x: normal.x, y: normal.y, vx: 0, vy: 0, damage: 50, dead: false, isEnemy: false, pierce: 1, impactType: 'direct', hitTargets: [], wid: 'sniper' }];
  const eliteBullet = [{ x: elite.x, y: elite.y, vx: 0, vy: 0, damage: 50, dead: false, isEnemy: false, pierce: 1, impactType: 'direct', hitTargets: [], wid: 'sniper' }];
  NV.updateBullets(0, mkState({ bullets: normalBullet, enemies: [normal], boss: null }));
  NV.updateBullets(0, mkState({ bullets: eliteBullet, enemies: [elite], boss: null }));
  if (1000 - normal.hp !== 50) throw new Error('normal=' + (1000 - normal.hp));
  if (1000 - elite.hp !== 50 * NV.BALANCE.SNIPER_ELITE_DAMAGE_MULT) throw new Error('elite=' + (1000 - elite.hp));
});

t('láser atraviesa escudo frontal sin consumir su recarga', () => {
  const shielded = { x: 100, y: 0, radius: 12, hp: 100, dead: false, shield: true, shieldCd: 0, color: '#fff' };
  const bullets = [{ x: 90, y: 0, vx: 0, vy: 0, damage: 25, dead: false, isEnemy: false, pierce: 2, impactType: 'direct', hitTargets: [], wid: 'laser' }];
  const st = mkState({ bullets, enemies: [shielded], boss: null, player: { x: 0, y: 0, character: 'boti', bulwark: 0, invuln: 0, stun: 0 } });
  NV.updateBullets(0, st);
  if (shielded.hp !== 75) throw new Error('escudo bloqueó el láser hp=' + shielded.hp);
  if (shielded.shieldCd !== 0) throw new Error('el láser consumió recarga=' + shielded.shieldCd);
});

t('proyectil convencional sigue siendo bloqueado por escudo frontal', () => {
  const shielded = { x: 100, y: 0, radius: 12, hp: 100, dead: false, shield: true, shieldCd: 0, color: '#fff' };
  const bullets = [{ x: 90, y: 0, vx: 0, vy: 0, damage: 20, dead: false, isEnemy: false, pierce: 2, impactType: 'direct', hitTargets: [], wid: 'rifle' }];
  const st = mkState({ bullets, enemies: [shielded], boss: null, player: { x: 0, y: 0, character: 'boti', bulwark: 0, invuln: 0, stun: 0 } });
  NV.updateBullets(0, st);
  if (shielded.hp !== 100) throw new Error('rifle atravesó escudo hp=' + shielded.hp);
  if (!(shielded.shieldCd > 0)) throw new Error('escudo no entró en recarga');
});

// ==================== BOW ====================
console.log('\n--- bow ---');

t('bow: cadena visual acotada a 4 objetivos', () => {
  const enemies = mkEnemies(6, 100, 100, 30);
  let bullets = [{ x: 100, y: 100, vx: 0, vy: 0, damage: 10, dead: false, isEnemy: false, pierce: 1, impactType: 'bounce', bounceLeft: 3, splashRadius: 180, hitTargets: [], wid: 'bow' }];
  const st = mkState({ bullets, enemies, boss: null, player: { x: -1000, y: -1000, character: 'boti', bulwark: 0, invuln: 0, stun: 0 } });
  for (let i = 0; i < 10 && bullets.length; i++) { const res = NV.updateBullets(0, st); bullets = res.bullets; }
  const damaged = enemies.filter(e => e.hp < 100).length;
  if (damaged !== 4) throw new Error('dañó ' + damaged + ' (debe ser 4)');
});

t('bow: ningún enemigo golpeado dos veces', () => {
  const enemies = mkEnemies(6, 100, 100, 30);
  let bullets = [{ x: 100, y: 100, vx: 0, vy: 0, damage: 10, dead: false, isEnemy: false, pierce: 1, impactType: 'bounce', bounceLeft: 3, splashRadius: 180, hitTargets: [], wid: 'bow' }];
  const st = mkState({ bullets, enemies, boss: null, player: { x: -1000, y: -1000, character: 'boti', bulwark: 0, invuln: 0, stun: 0 } });
  for (let i = 0; i < 10 && bullets.length; i++) { const res = NV.updateBullets(0, st); bullets = res.bullets; }
  const low = enemies.filter(e => e.hp <= 70).length;
  if (low > 0) throw new Error(low + ' enemigos golpeados 2+ veces');
});

t('bow: no rebota fuera del radio', () => {
  const enemies = [{ x: 100, y: 100, radius: 10, hp: 100, dead: false }, { x: 500, y: 100, radius: 10, hp: 100, dead: false }];
  let bullets = [{ x: 100, y: 100, vx: 0, vy: 0, damage: 10, dead: false, isEnemy: false, pierce: 1, impactType: 'bounce', bounceLeft: 3, splashRadius: 180, hitTargets: [], wid: 'bow' }];
  const st = mkState({ bullets, enemies, boss: null, player: { x: -1000, y: -1000, character: 'boti', bulwark: 0, invuln: 0, stun: 0 } });
  for (let i = 0; i < 10 && bullets.length; i++) { const res = NV.updateBullets(0, st); bullets = res.bullets; }
  if (enemies[1].hp !== 100) throw new Error('rebotó fuera de radio');
});

t('bow: con dt>0 la flecha viaja visiblemente', () => {
  const enemies = [
    { x: 100, y: 100, radius: 10, hp: 100, dead: false },
    { x: 250, y: 100, radius: 10, hp: 100, dead: false },
  ];
  let bullets = [{ x: 100, y: 100, vx: 0, vy: 0, damage: 10, dead: false, isEnemy: false, pierce: 1, impactType: 'bounce', bounceLeft: 3, splashRadius: 180, hitTargets: [], wid: 'bow' }];
  const st = mkState({ bullets, enemies, boss: null, player: { x: -1000, y: -1000, character: 'boti', bulwark: 0, invuln: 0, stun: 0 } });
  let res = NV.updateBullets(0, st); bullets = res.bullets;
  if (enemies[0].hp !== 90) throw new Error('primer impacto no aplicado');
  const startX = bullets[0].x;
  res = NV.updateBullets(0.05, st); bullets = res.bullets;
  if (bullets[0].x === startX) throw new Error('flecha no viaja');
  for (let i = 0; i < 100 && bullets.length; i++) { res = NV.updateBullets(0.05, st); bullets = res.bullets; }
  // El segundo impacto llega por la cadena: daño de rebote1 = 10 * 0.85 = 8.5.
  near(100 - enemies[1].hp, 8.5, 'segundo impacto');
});

function bowChainShot(damage, hpEach) {
  const enemies = [];
  for (let i = 0; i < 4; i++) enemies.push({ x: 100 + i * 60, y: 100, radius: 10, hp: hpEach, dead: false });
  let bullets = [{ x: 100, y: 100, vx: 1, vy: 0, damage, dead: false, isEnemy: false, impactType: 'bounce', bounceLeft: 3, splashRadius: 180, hitTargets: [], wid: 'bow' }];
  const st = mkState({ bullets, enemies, boss: null, player: { x: -1000, y: -1000, character: 'boti', bulwark: 0, invuln: 0, stun: 0 } });
  let res = NV.updateBullets(0, st); bullets = res.bullets;
  for (let i = 0; i < 400 && bullets.length; i++) { st.bullets = bullets; res = NV.updateBullets(0.01, st); bullets = res.bullets; }
  return { enemies, bullets };
}

t('bow: caída de daño por ordinal es absoluta y no acumulativa', () => {
  const { enemies } = bowChainShot(100, 1e7);
  const dealt = enemies.map(e => 1e7 - e.hp);
  near(dealt[0], 100, 'primario');
  near(dealt[1], 85, 'rebote1');
  near(dealt[2], 70, 'rebote2');
  near(dealt[3], 55, 'rebote3');
});

t('bow: crítico horneado también recibe la caída por ordinal', () => {
  const enemies = [];
  for (let i = 0; i < 4; i++) enemies.push({ x: 100 + i * 60, y: 100, radius: 10, hp: 1e7, dead: false });
  let bullets = [{ x: 100, y: 100, vx: 1, vy: 0, damage: 200, crit: true, dead: false, isEnemy: false, impactType: 'bounce', bounceLeft: 3, splashRadius: 180, hitTargets: [], wid: 'bow' }];
  const st = mkState({ bullets, enemies, boss: null, player: { x: -1000, y: -1000, character: 'boti', bulwark: 0, invuln: 0, stun: 0 } });
  let res = NV.updateBullets(0, st); bullets = res.bullets;
  for (let i = 0; i < 400 && bullets.length; i++) { st.bullets = bullets; res = NV.updateBullets(0.01, st); bullets = res.bullets; }
  const dealt = enemies.map(e => 1e7 - e.hp);
  near(dealt[0], 200, 'crit primario');
  near(dealt[1], 170, 'crit rebote1');
  near(dealt[2], 140, 'crit rebote2');
  near(dealt[3], 110, 'crit rebote3');
});

function bowChainFrom(origin, velocity, list) {
  // El proyectil nace SOBRE un enemigo en `origin`: ese es el impacto PRIMARIO.
  // `list` son los candidatos a rebote que se evalúan desde ahí.
  const enemies = [{ x: origin[0], y: origin[1], radius: 10, hp: 100, dead: false }]
    .concat(list.map(p => ({ x: p[0], y: p[1], radius: 10, hp: 100, dead: false })));
  let bullets = [{ x: origin[0], y: origin[1], vx: velocity[0], vy: velocity[1], damage: 10, dead: false, isEnemy: false, impactType: 'bounce', bounceLeft: 3, splashRadius: 180, hitTargets: [], wid: 'bow' }];
  const st = mkState({ bullets, enemies, boss: null, player: { x: -1000, y: -1000, character: 'boti', bulwark: 0, invuln: 0, stun: 0 } });
  const res = NV.updateBullets(0, st);
  const b = res.bullets[0];
  return { targets: b && b.chainTargets ? b.chainTargets : [], enemies };
}

t('bow: elegibilidad direccional — adelante y 90° sí, 180° y >120° no', () => {
  // Recto adelante: elegible.
  let r = bowChainFrom([100, 100], [1, 0], [[220, 100]]);
  if (r.targets.length !== 1) throw new Error('objetivo recto rechazado');
  // Giro de 90°: elegible.
  r = bowChainFrom([100, 100], [1, 0], [[200, 200]]);
  if (r.targets.length !== 1) throw new Error('objetivo a 90° rechazado');
  // U-turn puro a 180°: rechazado.
  r = bowChainFrom([100, 100], [1, 0], [[0, 100]]);
  if (r.targets.length !== 0) throw new Error('U-turn 180° aceptado');
  // Giro mayor a 120°: rechazado.
  r = bowChainFrom([100, 100], [1, 0], [[10, 160]]);
  if (r.targets.length !== 0) throw new Error('giro >120° aceptado');
  // Justo en el límite de 120°: aceptado con tolerancia de punto flotante.
  const lim = 2 * Math.PI / 3;
  r = bowChainFrom([100, 100], [1, 0], [[100 + 150 * Math.cos(lim), 100 + 150 * Math.sin(lim)]]);
  if (r.targets.length !== 1) throw new Error('giro exacto 120° rechazado');
});

t('bow: elige la continuación angularmente mejor, no la más cercana', () => {
  const r = bowChainFrom([100, 100], [1, 0], [[190, 190], [260, 100]]);
  if (r.targets.length !== 1) throw new Error('esperaba 1 objetivo, hubo ' + r.targets.length);
  if (r.targets[0].x !== 260) throw new Error('eligió el más cercano en vez del alineado: x=' + r.targets[0].x);
});

t('bow: todos los segmentos de la cadena respetan el giro máximo', () => {
  const r = bowChainFrom([100, 100], [1, 0], [[240, 100], [240, 40], [100, 40], [100, 100]]);
  let px = 100, py = 100, prev = 0;
  for (const t of r.targets) {
    const ang = Math.atan2(t.y - py, t.x - px);
    let delta = ang - prev;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    if (Math.abs(delta) > 2 * Math.PI / 3 + 1e-6) {
      throw new Error('segmento con giro ' + (Math.abs(delta) * 180 / Math.PI).toFixed(1) + ' grados');
    }
    prev = ang; px = t.x; py = t.y;
  }
});

t('bow: el jefe recibe daño directo completo y nunca entra en la cadena', () => {
  // Jefe en la trayectoria directa, sin normales que corten la cadena.
  const boss = { x: 300, y: 100, radius: 50, hp: 1e7, dead: false, isBoss: true };
  let bullets = [{ x: 0, y: 100, vx: 800, vy: 0, damage: 100, dead: false, isEnemy: false, impactType: 'bounce', bounceLeft: 3, splashRadius: 180, hitTargets: [], wid: 'bow' }];
  const st = mkState({ bullets, enemies: [], boss, player: { x: -1000, y: -1000, character: 'boti', bulwark: 0, invuln: 0, stun: 0 } });
  let res = NV.updateBullets(0.05, st); bullets = res.bullets;
  for (let i = 0; i < 50 && bullets.length; i++) { st.bullets = bullets; res = NV.updateBullets(0.05, st); bullets = res.bullets; }
  near(1e7 - boss.hp, 100, 'daño directo al jefe');

  // Una cadena de normales NO puede rebotar hacia el jefe: queda intacto.
  const boss2 = { x: 260, y: 100, radius: 50, hp: 1e7, dead: false, isBoss: true };
  const a = { x: 100, y: 100, radius: 10, hp: 1e7, dead: false };
  const bfar = { x: 200, y: 100, radius: 10, hp: 1e7, dead: false };
  let bl2 = [{ x: 100, y: 100, vx: 1, vy: 0, damage: 100, dead: false, isEnemy: false, impactType: 'bounce', bounceLeft: 3, splashRadius: 180, hitTargets: [], wid: 'bow' }];
  const st2 = mkState({ bullets: bl2, enemies: [a, bfar], boss: boss2, player: { x: -1000, y: -1000, character: 'boti', bulwark: 0, invuln: 0, stun: 0 } });
  let r2 = NV.updateBullets(0, st2); bl2 = r2.bullets;
  for (let i = 0; i < 400 && bl2.length; i++) { st2.bullets = bl2; r2 = NV.updateBullets(0.01, st2); bl2 = r2.bullets; }
  near(1e7 - a.hp, 100, 'normal primario');
  near(1e7 - bfar.hp, 85, 'normal rebote1');
  if (boss2.hp !== 1e7) throw new Error('el jefe recibió un rebote: ' + (1e7 - boss2.hp));
});

// ==================== MAGNET ====================
console.log('\n--- magnet ---');

t('magnet: recolección no supera MAGNET_CAP', () => {
  const player = { x: 400, y: 260 };
  const pickups = [];
  for (let i = 0; i < 80; i++) pickups.push({ x: 10 + i * 2, y: 10, dead: false });
  const weaponPickups = [{ x: 50, y: 50, dead: false, weapon: NV.WEAPONS[0] }];
  const n = NV.magnetCollect(pickups, weaponPickups, player);
  if (n > NV.BALANCE.MAGNET_CAP) throw new Error('recolectó ' + n + ' > cap');
});

t('magnet: prioriza los pickups más cercanos', () => {
  const player = { x: 400, y: 260 };
  // Crear muchos pickups; los más cercanos deben ser magnetizados primero
  const pickups = [];
  // 60 pickups lejanos
  for (let i = 0; i < 60; i++) pickups.push({ x: 10 + i, y: 10, dead: false });
  // 3 pickups cercanos al final (más cercanos al player)
  pickups.push({ x: 401, y: 260, dead: false }); // muy cerca
  pickups.push({ x: 402, y: 260, dead: false }); // muy cerca
  pickups.push({ x: 10, y: 10, dead: false });   // lejano (duplicado posición)
  const origCap = NV.BALANCE.MAGNET_CAP;
  // Usar MAGNET_CAP por defecto (50); verificar que los 2 más cercanos están incluidos
  const n = NV.magnetCollect(pickups, [], player);
  if (n > origCap) throw new Error('recolectó ' + n + ' > cap');
  // Los dos más cercanos (401,260) y (402,260) deben estar magnetizados
  const closest1 = pickups.find(p => p.x === 401 && p.y === 260);
  const closest2 = pickups.find(p => p.x === 402 && p.y === 260);
  if (!closest1 || !closest1.magnetPull) throw new Error('pickup más cercano no magnetizado');
  if (!closest2 || !closest2.magnetPull) throw new Error('pickup 2do más cercano no magnetizado');
});

t('magnet: excedentes permanecen vivos y sin magnetizar', () => {
  const player = { x: 400, y: 260 };
  const pickups = [];
  for (let i = 0; i < 80; i++) pickups.push({ x: 10 + i, y: 10, dead: false });
  const n = NV.magnetCollect(pickups, [], player);
  if (n > NV.BALANCE.MAGNET_CAP) throw new Error('recolectó ' + n + ' > cap');
  const notMag = pickups.filter(p => !p.magnetPull && !p.dead).length;
  if (notMag !== 80 - NV.BALANCE.MAGNET_CAP) throw new Error('esperaba ' + (80 - NV.BALANCE.MAGNET_CAP) + ' no magnetizados, hay ' + notMag);
});

console.log('\nRESULT weapons_behavior: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);
