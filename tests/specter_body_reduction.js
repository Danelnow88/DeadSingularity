// ===== Reducción ×0.65 (visual + físico) de los cinco espectros líquidos =====
// Contrato: specter_grunt · specter_archer · specter_guard · specter_lite · specter_core
// dibujan y colisionan exactamente al 65% de su tamaño anterior (body scale
// compartido SPECTRAL_BODY_SCALE, scoped por enemyTypeId). Sin cambios de HP,
// daño, velocidad, cooldowns, pesos, minWave, comportamientos ni rangos
// semánticos. Hydra/RB6, Swarmlet, comunes, bosses y tablas por modelo intactos.
const fs = require('fs'), vm = require('vm');
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('  ok  ' + name); } catch (e) { fail++; console.log('  FAIL ' + name + ' -> ' + e.message); } }
function load(file, sbx) { vm.runInNewContext(fs.readFileSync(file, 'utf8'), sbx, { filename: file }); }

function setup() {
  const math = Object.create(Math); math.random = () => 0.25;
  const sbx = {
    window: { NV: {
      enemyRhythmBand: function () { return null; },
      state: { player: { x: 100, y: 100 } },
    } },
    console, Math: math, Object, Array, Set, Map, WeakSet,
  };
  for (const file of ['js/data/balance.js', 'js/data/gameData.js', 'js/render/spectralEnemies2D.js', 'js/engine/enemies.js', 'js/engine/bullets.js']) load(file, sbx);
  const NV = sbx.window.NV;
  NV.hitSlowFor = () => ({ activeDuration: 0, immunity: 0, multiplier: 1 });
  NV.bossHitReaction = () => {};
  return NV;
}

// Contrato auditado: modelo, escala visual previa, factor de hitbox previo,
// radio de datos y radio físico esperado (= datos × factor × 0.65).
const FIVE = {
  specter_grunt: { model: 1, scale: 0.75, factor: 0.9375, dataRadius: 10, hitbox: 6.09375 },
  specter_archer: { model: 3, scale: 0.80, factor: 1, dataRadius: 12, hitbox: 7.8 },
  specter_guard: { model: 4, scale: 0.82, factor: 1.025, dataRadius: 18, hitbox: 11.9925 },
  specter_lite: { model: 1, scale: 0.75, factor: 0.9375, dataRadius: 12, hitbox: 7.3125 },
  specter_core: { model: 2, scale: 0.80, factor: 1, dataRadius: 16, hitbox: 10.4 },
};

function spawnOf(NV, typeId) {
  const out = [];
  NV.spawnEnemy({
    enemies: out, MAX_ENEMIES: 20, boss: null, wave: 25,
    ENEMY_TYPES: NV.ENEMY_TYPES, W: 800, H: 600, waveEvent: null, forceTypeId: typeId,
  });
  return out[0];
}

// ctx proxy que registra scale/shadowBlur/arc (mismo enfoque que hydra_render_budget).
function ctx() {
  const calls = { paths: 0, fills: 0, strokes: 0, arcs: 0, arcData: [], colors: [], scales: [], events: [], shadowBlurs: [] };
  return new Proxy({ calls }, {
    get(o, k) {
      if (k === 'calls') return calls;
      if (k === 'beginPath') return () => calls.paths++;
      if (k === 'fill') return () => calls.fills++;
      if (k === 'stroke') return () => calls.strokes++;
      if (k === 'arc') return (x, y, r) => { calls.arcs++; calls.arcData.push([x, y, r]); calls.events.push(['arc', r]); };
      if (k === 'scale') return (x, y) => { calls.scales.push([x, y]); calls.events.push(['scale', x, y]); };
      if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => ({ addStop() {} });
      return () => {};
    },
    set(o, k, v) {
      if (k === 'fillStyle' || k === 'strokeStyle' || k === 'shadowColor') calls.colors.push(String(v));
      if (k === 'shadowBlur') calls.shadowBlurs.push(Number(v));
      return true;
    },
  });
}
function renderScale(NV, enemy) {
  const c = ctx();
  NV.drawSpectralEnemy2D(c, enemy, 30, { x: 450, y: 300 }, null);
  if (!c.calls.scales.length) throw new Error('sin escala corporal');
  return c.calls.scales[0];
}
function labEnemy(id) {
  return { x: 100, y: 100, radius: 18, hp: 100, maxHp: 100, color: '#a1b2c3', enemyTypeId: id, dead: false, hitFlash: 0, atkFlash: 0 };
}

function bulletState(bullet, enemy) {
  return {
    bullets: [bullet], W: 900, H: 520, player: { x: -500, y: -500, character: 'boti', invuln: 0 }, enemies: [enemy], boss: null,
    CHARACTERS: { boti: { size: 20 } }, SHIELD_COOLDOWN: 1,
    applyPlayerDamage() { return { applied: false }; }, addFloatText() {}, killEnemy(e) { e.dead = true; }, applyKnockback() {}, spawnExplosion() {},
  };
}
function enemyState(enemy, player, applyPlayerDamage) {
  return {
    enemies: [enemy], player, bullets: [], MAX_BULLETS: 10, MAX_ENEMY_BULLETS: 10, enemyBulletCount() { return 0; },
    applyPlayerDamage, addFloatText() {}, spawnExplosion() {}, onKill() {}, wave: 3, waveEvent: null, boss: null,
    MAX_HOSTILES: 30, MAX_HEAVY_HOSTILES: 7,
  };
}

t('las cinco escalas visuales son exactamente ×0.65 (ctx.scale del render)', () => {
  const NV = setup();
  if (NV.SPECTRAL_BODY_SCALE !== 0.65) throw new Error('SPECTRAL_BODY_SCALE=' + NV.SPECTRAL_BODY_SCALE);
  for (const [id, c] of Object.entries(FIVE)) {
    const [sx, sy] = renderScale(NV, labEnemy(id));
    const expected = c.scale * 0.65;
    if (Math.abs(sx - expected) > 1e-4 || Math.abs(sy - expected) > 1e-4) {
      throw new Error(id + ' scale=' + sx + ',' + sy + ' esperado=' + expected);
    }
    if (Math.abs(sx / c.scale - 0.65) > 1e-6) throw new Error(id + ' no es ×0.65 de su escala previa');
  }
});

t('los cinco factores de hitbox son exactamente ×0.65 y el spawn da los radios objetivo', () => {
  const NV = setup();
  for (const [id, c] of Object.entries(FIVE)) {
    const effective = NV.labModelHitboxFactor(c.model, id);
    if (Math.abs(effective - c.factor * 0.65) > 1e-9) throw new Error(id + ' factor=' + effective + ' esperado=' + c.factor * 0.65);
    if (Math.abs(NV.labModelHitboxFactor(c.model) - c.factor) > 1e-9) throw new Error(id + ' tabla por modelo alterada');
    const e = spawnOf(NV, id);
    if (!e) throw new Error(id + ' no spawneó');
    if (Math.abs(e.radius - c.hitbox) > 0.001) throw new Error(id + ' radius=' + e.radius + ' esperado=' + c.hitbox);
    // Los consumidores que ya dependen de e.radius (separación, contacto,
    // proyectiles) siguen la nueva huella automáticamente.
    if (!(e.radius < c.dataRadius)) throw new Error(id + ' no encogió frente al radio de datos');
  }
});

t('coherencia visual/física: la razón escala/factor (0.8) se preserva tras ×0.65', () => {
  for (const [id, c] of Object.entries(FIVE)) {
    const preRatio = c.scale / c.factor;
    const postRatio = (c.scale * 0.65) / (c.factor * 0.65);
    if (Math.abs(preRatio - 0.8) > 1e-9) throw new Error(id + ' ratio previo=' + preRatio);
    if (Math.abs(postRatio - preRatio) > 1e-9) throw new Error(id + ' ratio visual/físico alterado');
  }
});

t('proyectil atraviesa el antiguo shell exterior pero impacta el cuerpo nuevo (los cinco)', () => {
  const NV = setup();
  for (const id of Object.keys(FIVE)) {
    // Umbral de bala real: d < e.radius + 4 (bullets.js).
    const outer = spawnOf(NV, id), oldRadius = outer.radius / 0.65;
    outer.x = 100; outer.y = 100; outer.hp = 100; outer.maxHp = 100;
    const shellDistance = outer.radius + 5;
    if (!(shellDistance >= outer.radius + 4)) throw new Error(id + ' shell fuera del umbral nuevo');
    if (!(shellDistance < oldRadius + 4)) throw new Error(id + ' shell fuera de la zona que ANTES impactaba');
    if (!(outer.radius < oldRadius)) throw new Error(id + ' cuerpo no encogió');
    let r = NV.updateBullets(0, bulletState({ x: 100 + shellDistance, y: 100, vx: 0, vy: 0, damage: 10, dead: false, isEnemy: false, pierce: 1 }, outer));
    if (outer.hp !== 100 || r.bullets.length !== 1) throw new Error(id + ' el shell antiguo todavía colisiona');
    const body = spawnOf(NV, id); body.x = 100; body.y = 100; body.hp = 100; body.maxHp = 100;
    r = NV.updateBullets(0, bulletState({ x: 100 + body.radius, y: 100, vx: 0, vy: 0, damage: 10, dead: false, isEnemy: false, pierce: 1 }, body));
    // Daño real = max(1, damage - resist): specter_guard (resist 2) recibe 8.
    const type = NV.ENEMY_TYPES.find((entry) => entry.id === id);
    const expectedDealt = Math.max(1, 10 - ((type && type.resist) || 0));
    if (body.hp !== 100 - expectedDealt || r.bullets.length !== 0) {
      throw new Error(id + ' el borde del cuerpo nuevo no colisiona (hp=' + body.hp + ' bullets=' + r.bullets.length + ')');
    }
  }
});

t('contacto del jugador usa el nuevo radio: fuera del shell viejo, dentro del cuerpo nuevo', () => {
  const NV = setup();
  for (const id of Object.keys(FIVE)) {
    const miss = spawnOf(NV, id), oldRadius = miss.radius / 0.65;
    miss.x = 100; miss.y = 100; miss.speed = 0; miss.behavior = 'chase'; miss.contactCd = 0;
    if (id === 'specter_grunt') {
      miss.specterChargeState = 'charge'; miss.specterChargeTimer = 1;
      miss.specterChargeDirX = 0; miss.specterChargeDirY = 0; miss.specterChargeDistance = 0;
    }
    let hits = 0;
    const missDistance = miss.radius + 22; // umbral de contacto: d < e.radius + 20
    if (!(missDistance >= miss.radius + 20)) throw new Error(id + ' punto fuera del contacto nuevo');
    if (!(missDistance < oldRadius + 20)) throw new Error(id + ' punto no está dentro del contacto anterior');
    NV.updateEnemies(0, enemyState(miss, { x: 100 + missDistance, y: 100, invuln: 0, stun: 0 }, () => { hits++; return { applied: false }; }));
    if (hits !== 0 || miss.dead) throw new Error(id + ' shell de contacto anterior persiste');
    const hit = spawnOf(NV, id); hit.x = 100; hit.y = 100; hit.speed = 0; hit.behavior = 'chase'; hit.contactCd = 0;
    if (id === 'specter_grunt') {
      hit.specterChargeState = 'charge'; hit.specterChargeTimer = 1;
      hit.specterChargeDirX = 0; hit.specterChargeDirY = 0; hit.specterChargeDistance = 0;
    }
    NV.updateEnemies(0, enemyState(hit, { x: 100 + hit.radius + 19, y: 100, invuln: 0, stun: 0 }, () => { hits++; return { applied: true, killed: false }; }));
    if (hits !== 1) throw new Error(id + ' hueco dentro del contacto nuevo');
    if (id === 'specter_grunt') {
      if (hit.dead || hit.specterChargeState !== 'recovery') throw new Error(id + ' no sobrevivió en recovery');
    } else if (!hit.dead) {
      throw new Error(id + ' perdió la semántica global de contacto');
    }
  }
});

t('separación deriva del nuevo cuerpo; no empuja como si ocupara la huella anterior', () => {
  const NV = setup();
  for (const id of Object.keys(FIVE)) {
    const a = spawnOf(NV, id), b = spawnOf(NV, id);
    a.x = 100; a.y = 100; b.x = 100 + (a.radius + b.radius + 7); b.y = 100;
    for (const e of [a, b]) { e.speed = 0; e.behavior = 'chase'; e.contactCd = 0; }
    const before = [a.x, b.x];
    const st = enemyState(a, { x: 800, y: 500, invuln: 0, stun: 0 }, () => ({ applied: false })); st.enemies = [a, b];
    NV.updateEnemies(0.016, st);
    if (Math.abs(a.x - before[0]) > 0.0001 || Math.abs(b.x - before[1]) > 0.0001) throw new Error(id + ' separación conserva huella antigua');
  }
});

t('fusión conserva su distancia semántica (40px) y crece desde el cuerpo nuevo', () => {
  const NV = setup();
  const enemies = [spawnOf(NV, 'specter_grunt'), spawnOf(NV, 'specter_grunt'), spawnOf(NV, 'specter_grunt')];
  enemies.forEach((e, i) => { e.x = 100 + i * 10; e.y = 100; e.speed = 0; e.behavior = 'chase'; e.contactCd = 0; });
  const baseRadius = enemies[0].radius;
  const st = enemyState(enemies[0], { x: 800, y: 500, invuln: 0, stun: 0 }, () => ({ applied: false })); st.enemies = enemies;
  const result = NV.updateEnemies(0, st);
  if (result.enemies.length !== 1 || result.enemies[0].fusionLevel !== 1) throw new Error('fusión semántica cambió');
  if (Math.abs(result.enemies[0].radius - baseRadius * 1.36) > 0.001) throw new Error('crecimiento no parte del cuerpo nuevo');
});

t('semántica intacta: HP/damage/speed/pesos/minWave/comportamientos y rangos de ataque', () => {
  const NV = setup();
  const golden = {
    specter_grunt: { hp: 20, speed: 85, damage: 10, behavior: 'chase', minWave: 3, weight: 0.15, radius: 10 },
    specter_archer: { hp: 18, speed: 60, damage: 9, behavior: 'ranged', minWave: 3, weight: 0.12, radius: 12 },
    specter_guard: { hp: 55, speed: 45, damage: 12, behavior: 'shield', minWave: 5, weight: 0.10, radius: 18 },
    specter_lite: { hp: 18, speed: 100, damage: 8, behavior: 'erratic', minWave: 16, weight: 0.08, radius: 12 },
    specter_core: { hp: 28, speed: 55, damage: 12, behavior: 'ranged', minWave: 20, weight: 0.06, radius: 16 },
  };
  for (const [id, g] of Object.entries(golden)) {
    const type = NV.ENEMY_TYPES.find((entry) => entry.id === id);
    if (!type) throw new Error(id + ' ausente de ENEMY_TYPES');
    for (const key of ['hp', 'speed', 'damage', 'behavior', 'minWave', 'weight', 'radius']) {
      if (type[key] !== g[key]) throw new Error(id + '.' + key + '=' + type[key] + ' esperado=' + g[key]);
    }
    if (id === 'specter_guard' && (type.shield !== true || type.resist !== 2)) throw new Error('shield del guard alterado');
    // Spawn: stats semánticos intactos, solo el radio físico adaptado ×0.65.
    const e = spawnOf(NV, id);
    if (e.hp <= 0 || e.damage <= 0 || e.enemyTypeId !== id) throw new Error(id + ' spawn semántico alterado');
    if (Math.abs(e.radius - g.radius * NV.labModelHitboxFactor(FIVE[id].model, id)) > 0.001) throw new Error(id + ' spawn hitbox alterado');
  }
  // Rangos/distancias semánticos del motor intactos (world-space, sin tocar).
  const engine = fs.readFileSync('js/engine/enemies.js', 'utf8');
  for (const invariant of ['const FUSION_RADIUS = 40', 'const FUSION_MIN = 3', 'const SPIT_FAR = 320', 'const SPIT_NEAR = 180', 'const SPIT_BAND_MID = 250', 'dist < 130', 'inContact = d < e.radius + 20']) {
    if (!engine.includes(invariant)) throw new Error('rango semántico alterado: ' + invariant);
  }
  const bullets = fs.readFileSync('js/engine/bullets.js', 'utf8');
  if (!bullets.includes('d < e.radius + 4')) throw new Error('umbral de proyectil alterado');
});

t('Hydra/RB6 permanece intacta: tabla, hitbox, render y spawn de élites', () => {
  const NV = setup();
  if (NV.HYDRA_BODY_SCALE !== 0.65) throw new Error('HYDRA_BODY_SCALE alterado');
  if (NV.labModelHitboxFactor(5) !== (0.85 / 0.8) * 0.65) throw new Error('factor RB6 alterado');
  if (NV.labModelHitboxFactor(5, 'elite_base') !== (0.85 / 0.8) * 0.65) throw new Error('élite recibió body scale de espectros');
  if (Math.abs(NV.labModelVisualRadius(5) - 45 * 0.85 * 0.65) > 0.01) throw new Error('radio visual RB6 alterado');
  for (const id of ['elite_base', 'elite_velocity', 'elite_bulwark', 'elite_predator', 'elite_phantom', 'elite_titan', 'elite_swift', 'specter_elite_void']) {
    if (NV.spectralBodyScale(id) !== 1) throw new Error(id + ' recibió el body scale de espectros');
  }
  const [sx, sy] = renderScale(NV, { x: 100, y: 100, radius: 18, hp: 100, maxHp: 100, color: '#ff8c00', visualId: 'elite_base', isElite: true, dead: false, hitFlash: 0, atkFlash: 0 });
  const hydraScale = 0.85 * 0.65;
  if (Math.abs(sx - hydraScale) > 1e-4 || Math.abs(sy - hydraScale) > 1e-4) throw new Error('render Hydra scale=' + sx + ',' + sy);
  const out = [];
  NV.spawnElite({ enemies: out, MAX_ENEMIES: 40, boss: null, wave: 3, waveEvent: null, ELITE_TYPES: NV.ELITE_TYPES, W: 800, H: 600 });
  if (out.length !== 2) throw new Error('élites=' + out.length);
  if (Math.abs(out[0].radius - 14 * 1.0625 * 0.65) > 0.01) throw new Error('rápido=' + out[0].radius);
  if (Math.abs(out[1].radius - 30 * 1.0625 * 0.65) > 0.01) throw new Error('tanque=' + out[1].radius);
});

t('Swarmlet y enemigos comunes intactos: sin body scale, radio de datos al spawn', () => {
  const NV = setup();
  for (const id of ['swarmlet', 'drone', 'runner', 'tank']) {
    if (NV.spectralBodyScale(id) !== 1) throw new Error(id + ' recibió el body scale de espectros');
    const type = NV.ENEMY_TYPES.find((entry) => entry.id === id);
    if (!type) continue;
    const e = spawnOf(NV, id);
    if (e && e.radius !== type.radius) throw new Error(id + ' radius=' + e.radius + ' esperado=' + type.radius);
  }
});

console.log('\nRESULT specter_body_reduction: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);
