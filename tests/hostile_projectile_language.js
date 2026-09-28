// ===== Lenguaje de proyectil hostil: ROJO = dano, AMARILLO = stun, SHAPE = familia =====
// Contrato de presentacion (sin gameplay): todo proyectil hostil conserva un
// cuerpo rojo dominante y stunChance habilita solo un acento amarillo.
const fs = require('fs'), vm = require('vm');
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('  ok  ' + name); } catch (e) { fail++; console.log('  FAIL ' + name + ' -> ' + e.message); } }

const DAMAGE = '#ff3b4f';
const STUN = '#ffd84a';

const RENDER = 'js/render/projectiles.js';
const FILES = [
  'js/data/balance.js', 'js/data/gameData.js', 'js/engine/hostileBudget.js',
  'js/engine/enemies.js', 'js/engine/boss.js', RENDER,
];

function sandbox() {
  const m = Object.create(Math);
  m.random = function () { return 0.5; };
  const sbx = { window: { NV: {} }, console, Math: m, Object, Array, Set, Map };
  for (const f of FILES) {
    try { vm.runInNewContext(fs.readFileSync(f, 'utf8'), sbx, { filename: f }); }
    catch (e) { throw new Error('LOAD FAIL ' + f + ' -> ' + e.message); }
  }
  return sbx.window.NV;
}

// ---- Contexto Canvas espia: registra la "firma" de la geometria dibujada ----
function recorder() {
  const sig = [];
  const store = {};
  const paints = [];
  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  const point = (x, y) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    bounds.minX = Math.min(bounds.minX, x); bounds.maxX = Math.max(bounds.maxX, x);
    bounds.minY = Math.min(bounds.minY, y); bounds.maxY = Math.max(bounds.maxY, y);
  };
  const record = (name) => (...args) => { sig.push(name + '(' + args.map(v => typeof v === 'number' ? v.toFixed(2) : v).join(',') + ')'); };
  const base = {
    save: record('save'), restore: record('restore'),
    translate: record('translate'), rotate: record('rotate'),
    beginPath: record('beginPath'), closePath: record('closePath'),
    moveTo(x, y) { record('moveTo')(x, y); point(x, y); },
    lineTo(x, y) { record('lineTo')(x, y); point(x, y); },
    quadraticCurveTo(cpx, cpy, x, y) { record('quadraticCurveTo')(cpx, cpy, x, y); point(cpx, cpy); point(x, y); },
    arc(x, y, r, a0, a1) { record('arc')(x, y, r, a0, a1); point(x - r, y - r); point(x + r, y + r); },
    ellipse(x, y, rx, ry, rot, a0, a1) { record('ellipse')(x, y, rx, ry, rot, a0, a1); point(x - rx, y - ry); point(x + rx, y + ry); },
    fill() { record('fill')(); paints.push({ op: 'fill', color: store.fillStyle }); },
    stroke() { record('stroke')(); paints.push({ op: 'stroke', color: store.strokeStyle, width: store.lineWidth }); },
  };
  const ctx = new Proxy(base, {
    get(t, k) { if (k in t) return t[k]; return undefined; },
    set(t, k, v) { store[k] = v; return true; },
  });
  return { ctx, sig, store, paints, bounds };
}

function draw(NV, b) {
  const env = recorder();
  NV.drawHostileProjectile(env.ctx, b);
  return env;
}


function bulletSt(NV, bullets) {
  return {
    enemies: [], bullets, MAX_BULLETS: 200, MAX_ENEMY_BULLETS: 120,
    enemyBulletCount: function () { let n = 0; for (const b of this.bullets) if (b.isEnemy) n++; return n; },
    player: { x: 650, y: 300, moveVx: 0, moveVy: 0 },
    W: 900, H: 520, wave: 20, boss: null,
  };
}

function rangedState(e, p) {
  return {
    enemies: [e], player: p, bullets: [], MAX_BULLETS: 200, MAX_ENEMY_BULLETS: 120,
    enemyBulletCount: function () { let n = 0; for (const b of this.bullets) if (b.isEnemy) n++; return n; },
    applyPlayerDamage: function () { return { applied: false }; },
    addFloatText: function () {}, spawnExplosion: function () {},
    MAX_HOSTILES: 30, MAX_HEAVY_HOSTILES: 7, boss: null, wave: 25, waveEvent: null, hookSystem: null,
  };
}

// Dispara un ranged comun/espectral y devuelve la bala creada.
function fireRanged(NV, typeId) {
  const spawned = [];
  NV.spawnEnemy({
    enemies: spawned, boss: null, wave: 25, ENEMY_TYPES: NV.ENEMY_TYPES,
    W: 900, H: 520, MAX_ENEMIES: 30, MAX_HOSTILES: 30, MAX_HEAVY_HOSTILES: 7,
    waveEvent: null, forceTypeId: typeId,
  });
  const e = spawned[0];
  if (!e) return null;
  return fireEntity(NV, e);
}

function fireEliteVoid(NV) {
  const spawned = [];
  NV.spawnElite({
    enemies: spawned, boss: null, wave: 17, W: 900, H: 520,
    ELITE_TYPES: NV.ELITE_TYPES.filter(function (x) { return x.id === 'specter_elite_void'; }),
    MAX_ENEMIES: 30, MAX_HOSTILES: 30, MAX_HEAVY_HOSTILES: 7, waveEvent: null,
  });
  const e = spawned[0];
  if (!e) return null;
  return fireEntity(NV, e);
}

// Recorre windup -> attack con el ciclo completo de la banda ranged.
function fireEntity(NV, e) {
  const p = { x: 650, y: 300, moveVx: 0, moveVy: 0, invuln: 0, stun: 0 };
  const st = rangedState(e, p);
  e.x = 400; e.y = 300;
  e.shootTimer = 1.6;
  NV.updateEnemies(0.05, st);
  NV.updateEnemies(0.05, st);
  for (let i = 0; i < 13; i++) NV.updateEnemies(0.05, st);
  return st.bullets[0] || null;
}


function bossFixture(attack, stunChance) {
  return {
    x: 400, y: 100, hp: 6000, maxHp: 6000, radius: 50, color: '#ff5f9b', name: 'B',
    attack, primaryAttack: attack, pattern: 'chase', shape: 'hex', atkTimer: 0, timer: 0,
    stunChance, isBoss: true, dead: false, hitFlash: 0,
  };
}

function bossSt(NV, boss, bullets) {
  return {
    boss, player: { x: 400, y: 500, moveVx: 0, moveVy: 0 },
    enemies: [], bullets: bullets || [],
    MAX_BULLETS: 200, MAX_ENEMY_BULLETS: 120,
    enemyBulletCount: function () { let n = 0; for (const b of this.bullets) if (b.isEnemy) n++; return n; },
    wave: 20, W: 900, H: 520,
    sfx: { bossAttack: new Proxy({}, { get: function () { return function () {}; } }) },
    showBanner: function () {}, triggerFlash: function () {}, spawnExplosion: function () {},
    addFloatText: function () {}, triggerWaveVictory: function () {},
    spawnBossProj: function (b, sp, d, c, sr, col, r, st, stun, sd, style) {
      return NV.spawnBossProj(b, sp, d, c, sr, col, r, st, stun, sd, style);
    },
    spawnMinion: function () { return false; }, spawnBossChest: function () {},
  };
}

// atkTimer necesario para que cada familia dispare en el primer update.
const BOSS_TRIGGER = {
  repeater: 0.23, heavy: 1.36, spread: 1.26, beam: 3.61, volley: 0.96,
  bomb: 1.61, orbs: 1.11, split: 1.16, rage: 1.76, mystery: 1.11,
};
const BOSS_STYLE = {
  repeater: 'bossRepeater', heavy: 'bossHeavyShell', spread: 'bossSpreadDisc',
  beam: 'bossChargedLance', volley: 'bossVolleyDart', bomb: 'bossBomb',
  orbs: 'bossOrb', split: 'bossSplitShard', rage: 'bossRageCore',
};

function fireBoss(NV, attack, stunChance) {
  const b = bossFixture(attack, stunChance);
  const st = bossSt(NV, b);
  b.atkTimer = BOSS_TRIGGER[attack];
  NV.runBossAttack(b, 0.001, st);
  return { boss: b, bullets: st.bullets };
}

console.log('hostile_projectile_language:');

function bullet(over) {
  return Object.assign({
    x: 400, y: 300, vx: 250, vy: 0, damage: 15, color: '#6dc4c0',
    radius: 5, isEnemy: true, dead: false, stunChance: 0, stunDuration: 0,
    sourceType: 'test', projectileStyle: 'genericBolt',
  }, over || {});
}

function painted(env, color) {
  return env.paints.some(function (p) { return p.color === color; });
}

function size(env) {
  return { width: env.bounds.maxX - env.bounds.minX, height: env.bounds.maxY - env.bounds.minY };
}

// ================= SEMANTIC COLOR =================
t('color semantico: el primario hostil siempre es rojo DAMAGE', () => {
  const NV = sandbox();
  for (const sc of [0, 0.01, 0.15, 0.35, 0.5, 1]) {
    const env = draw(NV, bullet({ stunChance: sc }));
    if (!painted(env, DAMAGE)) throw new Error('chance=' + sc + ' sin cuerpo rojo');
    if (NV.hostileProjectileSemanticColor(bullet({ stunChance: sc })) !== DAMAGE) throw new Error('helper chance=' + sc);
  }
});

t('color semantico: sin stun no aparece acento amarillo', () => {
  const NV = sandbox();
  for (const style of NV.HOSTILE_PROJECTILE_STYLES) {
    const env = draw(NV, bullet({ projectileStyle: style, stunChance: 0 }));
    if (painted(env, STUN)) throw new Error(style + ' emitio amarillo sin stun');
  }
});

t('color semantico: stun agrega amarillo pero conserva rojo', () => {
  const NV = sandbox();
  for (const style of NV.HOSTILE_PROJECTILE_STYLES) {
    const env = draw(NV, bullet({ projectileStyle: style, stunChance: 0.35 }));
    if (!painted(env, DAMAGE)) throw new Error(style + ' perdio rojo');
    if (!painted(env, STUN)) throw new Error(style + ' sin acento amarillo');
  }
});

t('color semantico: b.color de la fuente NO puede sobreescribir', () => {
  const NV = sandbox();
  for (const c of ['#6dc4c0', '#ffb24a', '#9b4dff', '#00ffff', '#32cd32', '#ff8c00', '#e0ffff']) {
    const env = draw(NV, bullet({ color: c, stunChance: 0 }));
    if (!painted(env, DAMAGE)) throw new Error('color=' + c + ' sin rojo');
    if (env.store.shadowColor !== DAMAGE) throw new Error('shadowColor heredado de ' + c);
  }
});

t('color semantico: dano alto sin stun sigue rojo (no escala de magnitud)', () => {
  const NV = sandbox();
  const low = draw(NV, bullet({ damage: 5, stunChance: 0 }));
  const high = draw(NV, bullet({ damage: 999, stunChance: 0 }));
  if (low.store.fillStyle !== DAMAGE || high.store.fillStyle !== DAMAGE) throw new Error('magnitud creo color');
});

t('color semantico: stun + dano sigue rojo con amarillo secundario', () => {
  const NV = sandbox();
  const env = draw(NV, bullet({ damage: 44, stunChance: 0.4, stunDuration: 0.65 }));
  if (!painted(env, DAMAGE) || !painted(env, STUN)) throw new Error('jerarquia incompleta');
});

t('color semantico: valores ausentes/no finitos caen en rojo sin lanzar', () => {
  const NV = sandbox();
  const cases = [{}, { stunChance: undefined }, { stunChance: null }, { stunChance: NaN }, { stunChance: -1 }];
  for (const over of cases) {
    const env = draw(NV, bullet(over));
    if (!painted(env, DAMAGE) || painted(env, STUN)) throw new Error(JSON.stringify(over) + ' semantica invalida');
  }
});

t('estilo desconocido/null cae en genericBolt y sigue siendo rojo seguro', () => {
  const NV = sandbox();
  const cases = [{}, { projectileStyle: undefined }, { projectileStyle: null },
    { projectileStyle: 'estiloFuturo' }, { projectileStyle: 'bossChargedLance2' }];
  for (const over of cases) {
    const b = bullet(over);
    if (NV.hostileProjectileStyle(b) !== 'genericBolt') throw new Error('style=' + b.projectileStyle);
    if (!painted(draw(NV, b), DAMAGE)) throw new Error('fallback no rojo');
  }
});

t('helpers semanticos exponen rojo primario y booleano de stun', () => {
  const NV = sandbox();
  if (NV.HOSTILE_DAMAGE_COLOR !== DAMAGE) throw new Error('rojo');
  if (NV.HOSTILE_STUN_COLOR !== STUN) throw new Error('amarillo');
  if (NV.hasHostileStunAccent(bullet({ stunChance: 0 }))) throw new Error('falso positivo');
  if (!NV.hasHostileStunAccent(bullet({ stunChance: 0.5 }))) throw new Error('falso negativo');
});

t('radio por defecto seguro y radio 9 respetado (dibuja siempre)', () => {
  const NV = sandbox();
  for (const r of [undefined, 0, -3, NaN, 5, 9]) {
    if (draw(NV, bullet({ radius: r })).sig.length === 0) throw new Error('no dibuja r=' + r);
  }
});

// ================= COMMON / SPECTRAL FAMILIES =================
t('spitter estampa stunDroplet rojo con acento amarillo (stun 0.5)', () => {
  const NV = sandbox();
  const b = fireRanged(NV, 'spitter');
  if (!b) throw new Error('sin bala');
  if (b.projectileStyle !== 'stunDroplet') throw new Error('style=' + b.projectileStyle);
  if (b.stunChance !== 0.5) throw new Error('stunChance=' + b.stunChance);
  const env = draw(NV, b);
  if (!painted(env, DAMAGE) || !painted(env, STUN)) throw new Error('color');
});

t('specter_archer estampa spectralArrowhead y se ve rojo (sin stun)', () => {
  const NV = sandbox();
  const b = fireRanged(NV, 'specter_archer');
  if (!b) throw new Error('sin bala');
  if (b.projectileStyle !== 'spectralArrowhead') throw new Error('style=' + b.projectileStyle);
  if ((b.stunChance || 0) !== 0) throw new Error('no deberia stunear: ' + b.stunChance);
  if (!painted(draw(NV, b), DAMAGE)) throw new Error('color');
});

t('specter_core: mapea a coreSpike y se veria rojo (sin stun)', () => {
  const NV = sandbox();
  // specter_core tiene rama propia de Core Zone y NO entra en la rama ranged,
  // asi que hoy no emite balas. El mapeo sigue vigente para su ranged ammo y
  // debe quedar rojo (stunChance 0) cuando exista.
  const e = { enemyTypeId: 'specter_core', color: '#ff2244', stunChance: 0, stunDuration: 0, damage: 12 };
  const src = fs.readFileSync('js/engine/enemies.js', 'utf8');
  if (!/specter_core:\s*'coreSpike'/.test(src)) throw new Error('mapeo coreSpike ausente');
  const b = bullet({ projectileStyle: 'coreSpike', color: e.color, stunChance: e.stunChance, damage: e.damage });
  if (!painted(draw(NV, b), DAMAGE)) throw new Error('color');
  if (!painted(draw(NV, bullet({ projectileStyle: 'coreSpike', stunChance: e.stunChance })), DAMAGE)) throw new Error('color 2');
});

t('specter_elite_void estampa voidStunNucleus rojo con contencion amarilla', () => {
  const NV = sandbox();
  const b = fireEliteVoid(NV);
  if (!b) throw new Error('sin bala');
  if (b.projectileStyle !== 'voidStunNucleus') throw new Error('style=' + b.projectileStyle);
  if (b.stunChance !== 0.35) throw new Error('stunChance=' + b.stunChance);
  const env = draw(NV, b);
  if (!painted(env, DAMAGE) || !painted(env, STUN)) throw new Error('color');
});

t('ranged desconocido estampa genericBolt', () => {
  const NV = sandbox();
  const base = NV.ENEMY_TYPES.find(function (x) { return x.id === 'spitter'; });
  const spawned = [];
  NV.spawnEnemy({
    enemies: spawned, boss: null, wave: 25, W: 900, H: 520,
    MAX_ENEMIES: 30, MAX_HOSTILES: 30, MAX_HEAVY_HOSTILES: 7, waveEvent: null,
    forceTypeId: null, ENEMY_TYPES: [Object.assign({}, base, { id: 'rangedDesconocido' })],
  });
  const e = spawned[0];
  if (!e) throw new Error('no spawnea');
  const b = fireEntity(NV, e);
  if (!b) throw new Error('sin bala');
  if (b.projectileStyle !== 'genericBolt') throw new Error('style=' + b.projectileStyle);
});

// ================= BOSS FAMILIES =================
t('cada familia de jefe estampa su estilo', () => {
  const NV = sandbox();
  for (const attack of Object.keys(BOSS_STYLE)) {
    const r = fireBoss(NV, attack, 0.15);
    if (!r.bullets.length) throw new Error(attack + ' sin proyectiles');
    for (const b of r.bullets) {
      if (b.projectileStyle !== BOSS_STYLE[attack]) throw new Error(attack + ' style=' + b.projectileStyle);
      if (!b.isEnemy) throw new Error(attack + ' no isEnemy');
    }
  }
});

t('familia de jefe desconocida cae en genericBolt', () => {
  const NV = sandbox();
  const r = fireBoss(NV, 'mystery', 0.15);
  if (!r.bullets.length) throw new Error('sin proyectiles');
  if (r.bullets[0].projectileStyle !== 'genericBolt') throw new Error('style=' + r.bullets[0].projectileStyle);
});

t('spawnBossProj sin estilo explicito (llamador legacy) es seguro', () => {
  const NV = sandbox();
  const b = bossFixture('repeater', 0.15);
  const st = bulletSt(NV, []);
  NV.spawnBossProj(b, 400, 10, 1, 0, undefined, undefined, st);
  if (!st.bullets.length) throw new Error('sin proyectil');
  if (st.bullets[0].projectileStyle !== 'genericBolt') throw new Error('style=' + st.bullets[0].projectileStyle);
});

t('regla semantica de jefe: mismo estilo rojo, amarillo solo si hay stun', () => {
  const NV = sandbox();
  const red = fireBoss(NV, 'repeater', 0);
  const yellow = fireBoss(NV, 'repeater', 0.2);
  for (const b of red.bullets) {
    if (b.projectileStyle !== 'bossRepeater') throw new Error('estilo inestable');
    const env = draw(NV, b);
    if (!painted(env, DAMAGE) || painted(env, STUN)) throw new Error('chance 0 invalida');
  }
  for (const b of yellow.bullets) {
    if (b.projectileStyle !== 'bossRepeater') throw new Error('estilo inestable');
    const env = draw(NV, b);
    if (!painted(env, DAMAGE) || !painted(env, STUN)) throw new Error('chance >0 sin jerarquia');
  }
});

t('el estilo de jefe es independiente del color del cuerpo y del attack vivo', () => {
  const NV = sandbox();
  const a = bossFixture('repeater', 0.2); a.color = '#00ffff';
  const b = bossFixture('repeater', 0.2); b.color = '#32cd32';
  const sa = bossSt(NV, a); a.atkTimer = BOSS_TRIGGER.repeater;
  const sb = bossSt(NV, b); b.atkTimer = BOSS_TRIGGER.repeater;
  NV.runBossAttack(a, 0.001, sa);
  NV.runBossAttack(b, 0.001, sb);
  const ba = sa.bullets[0], bb = sb.bullets[0];
  if (ba.projectileStyle !== 'bossRepeater' || bb.projectileStyle !== 'bossRepeater') throw new Error('estilo por color');
  a.attack = 'rage'; // el jefe cambia de ataque con la bala en vuelo
  if (!painted(draw(NV, ba), DAMAGE) || !painted(draw(NV, ba), STUN)) throw new Error('color inestable tras cambio de attack');
  if (!painted(draw(NV, bb), DAMAGE) || !painted(draw(NV, bb), STUN)) throw new Error('color inestable');
});

// ================= SHAPE DISPATCH =================
t('dispatch: cada estilo ejecuta geometria procedural distinta', () => {
  const NV = sandbox();
  const sigs = {};
  for (const style of NV.HOSTILE_PROJECTILE_STYLES) {
    const sig = draw(NV, bullet({ projectileStyle: style })).sig.join('|');
    if (sig.length === 0) throw new Error(style + ' no dibuja');
    sigs[style] = sig;
  }
  const keys = Object.keys(sigs);
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      if (sigs[keys[i]] === sigs[keys[j]]) throw new Error(keys[i] + ' y ' + keys[j] + ' dibujan identico');
    }
  }
});

t('dispatch: genericBolt y estilo desconocido coinciden (fallback honesto)', () => {
  const NV = sandbox();
  const known = draw(NV, bullet({ projectileStyle: 'genericBolt' })).sig.join('|');
  const unknown = draw(NV, bullet({ projectileStyle: 'noExiste' })).sig.join('|');
  if (known !== unknown) throw new Error('fallback no usa genericBolt');
});

t('dispatch: bossRepeater distingue su collar doble de genericBolt', () => {
  const NV = sandbox();
  const count = (style) => draw(NV, bullet({ projectileStyle: style }))
    .sig.filter(function (s) { return s.indexOf('moveTo(') === 0; }).length;
  const rep = count('bossRepeater');
  const gen = count('genericBolt');
  if (!(rep > gen)) throw new Error('repeater sin collar doble: ' + rep + '/' + gen);
});

t('dispatch: siluetas de control usan curvas/arcos, no solo rectas', () => {
  const NV = sandbox();
  const sig = (style, stunChance) => draw(NV, bullet({ projectileStyle: style, stunChance: stunChance || 0 })).sig.join('|');
  if (sig('stunDroplet', 0.5).indexOf('quadraticCurveTo(') < 0) throw new Error('gota sin curvas');
  if (sig('voidStunNucleus', 0.5).indexOf('arc(') < 0) throw new Error('nucleo stun sin anillo');
  if (sig('bossOrb', 0.5).indexOf('ellipse(') < 0) throw new Error('orb sin elipse');
});

t('dispatch: coreSpike y bossHeavyShell conservan masas espinadas distintas', () => {
  const NV = sandbox();
  const lineTos = (style) => draw(NV, bullet({ projectileStyle: style }))
    .sig.filter(function (s) { return s.indexOf('lineTo(') === 0; }).length;
  const core = lineTos('coreSpike');
  const heavy = lineTos('bossHeavyShell');
  if (heavy === core || heavy < 10 || core < 8) throw new Error('geometria insuficiente: ' + heavy + '/' + core);
});

t('escala: estilos radius-5 recuperan presencia y no exceden 16 px', () => {
  const NV = sandbox();
  const directional = new Set(['genericBolt', 'spectralArrowhead', 'stunDroplet', 'bossRepeater', 'bossVolleyDart', 'bossSplitShard']);
  for (const style of NV.HOSTILE_PROJECTILE_STYLES) {
    if (style === 'bossChargedLance') continue;
    const s = size(draw(NV, bullet({ projectileStyle: style, radius: 5, stunChance: 0.35 })));
    const major = Math.max(s.width, s.height), minor = Math.min(s.width, s.height);
    if (major < 10 || minor < 9.5) throw new Error(style + ' demasiado pequeno ' + s.width + 'x' + s.height);
    if (major > 16.01) throw new Error(style + ' excede 16 px: ' + major);
    if (directional.has(style) && s.width < 14) throw new Error(style + ' longitud=' + s.width);
  }
});

t('escala: charged lance radius-9 queda dentro de 27x18', () => {
  const NV = sandbox();
  const s = size(draw(NV, bullet({ projectileStyle: 'bossChargedLance', radius: 9, stunChance: 0.35 })));
  if (s.width < 23 || s.width > 27.01) throw new Error('longitud=' + s.width);
  if (s.height < 15 || s.height > 18.01) throw new Error('ancho=' + s.height);
});

t('dispatch: rage core y split shard son siluetas distintas', () => {
  const NV = sandbox();
  const sig = (style) => draw(NV, bullet({ projectileStyle: style })).sig.join('|');
  const rage = sig('bossRageCore');
  const shard = sig('bossSplitShard');
  if (rage === shard) throw new Error('rage y shard identicos');
  if (rage.indexOf('lineTo(') < 0) throw new Error('rage sin geometria');
});

t('renderer hostil: save/restore balanceados, sin lookup ni efectos caros', () => {
  const NV = sandbox();
  const env = draw(NV, bullet({ projectileStyle: 'stunDroplet' }));
  const count = (name) => env.sig.filter(function (s) { return s === name + '()'; }).length;
  if (count('save') !== 1 || count('restore') !== 1) throw new Error('save/restore=' + count('save') + '/' + count('restore'));
  const src = fs.readFileSync(RENDER, 'utf8');
  const fn = src.slice(src.indexOf('NV.drawHostileProjectile'));
  for (const bad of ['enemies', 'sourceEnemy.attack', 'createRadialGradient', 'createLinearGradient', 'Path2D', 'shadowBlur = 8']) {
    if (fn.indexOf(bad) >= 0) throw new Error('renderer usa ' + bad);
  }
});

t('el renderer de proyectil del jugador sigue intacto', () => {
  const src = fs.readFileSync(RENDER, 'utf8');
  if (!/NV\.drawBulletShape = function \(ctx, b, def, g\)/.test(src)) throw new Error('drawBulletShape alterado');
  const player = src.slice(src.indexOf('NV.drawBulletShape'), src.indexOf('NV.drawFlameZone'));
  if (player.indexOf('isEnemy') >= 0) throw new Error('renderer del jugador contaminado con logica hostil');
});

t('game.js delega al renderer hostil con fallback rojo y sin tocar al jugador', () => {
  const g = fs.readFileSync('js/game.js', 'utf8');
  if (!g.includes('NV.drawHostileProjectile(ctx, b)')) throw new Error('sin delegacion');
  const start = g.indexOf('if (b.isEnemy) {');
  const branch = g.slice(start, start + 700);
  if (!branch.includes('#ff3b4f')) throw new Error('fallback no es rojo hostil');
  if (branch.indexOf('drawBulletShape') >= 0) throw new Error('se rompio la rama de jugador');
});

console.log('');
console.log('RESULT hostile_projectile_language: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);
