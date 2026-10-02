// ===== Test del renderer espectral Canvas2D =====
const fs = require('fs'), vm = require('vm');
let pass = 0, fail = 0;
function t(desc, fn) { try { fn(); pass++; console.log('  ok  ' + desc); } catch (e) { fail++; console.log('  FAIL ' + desc + ' -> ' + e.message); } }

function mkCtx() {
  const calls = [];
  const shadowBlurs = [];
  const arcs = [];
  const styles = [];
  const ctx = {
    calls, shadowBlurs, arcs, styles,
    save() { calls.push('save'); },
    restore() { calls.push('restore'); },
    translate(x, y) { calls.push('translate:' + Math.round(x) + ',' + Math.round(y)); },
    rotate() { calls.push('rotate'); },
    scale(x, y) { calls.push('scale'); },
    beginPath() { calls.push('beginPath'); },
    closePath() { calls.push('closePath'); },
    moveTo() {}, lineTo() {}, bezierCurveTo() {}, quadraticCurveTo() {},
    arc(x, y, radius, start, end) { calls.push('arc'); arcs.push({ x, y, radius, start, end }); },
    ellipse() { calls.push('ellipse'); },
    fill() { calls.push('fill'); },
    stroke() { calls.push('stroke'); },
    fillRect() { calls.push('fillRect'); },
    strokeRect() { calls.push('strokeRect'); },
    createRadialGradient() { return { addColorStop() {} }; },
    createLinearGradient() { return { addColorStop() {} }; },
    fillText() { calls.push('fillText'); },
    setLineDash() {},
  };
  Object.defineProperty(ctx, 'shadowBlur', { set(value) { shadowBlurs.push(Number(value)); } });
  Object.defineProperty(ctx, 'strokeStyle', { set(value) { styles.push(String(value)); } });
  Object.defineProperty(ctx, 'fillStyle', { set(value) { styles.push(String(value)); } });
  return ctx;
}

const sbx = {
  window: { NV: { enemyRhythmBand: function(e) { return 'medios'; }, state: { player: { x: 100, y: 100 } } } },
  console, Math,
};
vm.runInNewContext(fs.readFileSync('js/render/spectralEnemies2D.js', 'utf8'), sbx, { filename: 'spectralEnemies2D.js' });
const NV = sbx.window.NV;
const player = { x: 200, y: 200 };

t('NV.drawSpectralEnemy2D es función', () => { if (typeof NV.drawSpectralEnemy2D !== 'function') throw new Error('ausente'); });
t('NV.drawSpectralBoss2D es función', () => { if (typeof NV.drawSpectralBoss2D !== 'function') throw new Error('ausente'); });
t('NV.SPECTRAL_ENEMY_PROFILES expone 12 perfiles', () => { if (Object.keys(NV.SPECTRAL_ENEMY_PROFILES).length !== 12) throw new Error('esperaba 12'); });
t('NV.SPECTRAL_ENEMY_PROFILES expone 12 perfiles base', () => { if (Object.keys(NV.SPECTRAL_ENEMY_PROFILES).length !== 12) throw new Error('esperaba 12'); });

const types = ['drone', 'runner', 'tank', 'shielder', 'swarmlet', 'spitter', 'wisp', 'kamikaze', 'boss_minion', 'specter_grunt', 'specter_archer', 'specter_guard', 'specter_lite', 'specter_core'];
for (const type of types) {
  t('render ' + type + ' sin crash', () => {
    const ctx = mkCtx();
    const enemy = { x: 100, y: 100, radius: 12, color: '#fff', shape: 'circle', enemyTypeId: type, dead: false };
    if (NV.drawSpectralEnemy2D(ctx, enemy, 30, player, null) !== true) throw new Error('esperaba true');
    if (ctx.calls.length < 5) throw new Error('pocos trazos');
  });
}

t('drawSpectralEnemy2D NO muta datos del enemigo', () => {
  const ctx = mkCtx();
  const enemy = { x: 100, y: 100, radius: 12, color: '#fff', shape: 'circle', enemyTypeId: 'drone', dead: false };
  const snapshot = JSON.stringify(enemy);
  NV.drawSpectralEnemy2D(ctx, enemy, 30, player, { enabled: true, state: 'listening', onset: 1, kick: 0.8, bass: 0.9, energy: 0.5 });
  if (JSON.stringify(enemy) !== snapshot) throw new Error('mutó datos de gameplay');
});

t('visual raid boss de los 7 elites base NO muta datos', () => {
  const vids = ['elite_base', 'elite_velocity', 'elite_bulwark', 'elite_predator', 'elite_phantom', 'elite_titan', 'elite_swift'];
  for (const vid of vids) {
    const ctx = mkCtx();
    const enemy = { x: 100, y: 100, radius: 20, color: '#ff0', shape: 'hex', enemyTypeId: 'tank', visualId: vid, isElite: true, dead: false };
    const snapshot = JSON.stringify(enemy);
    if (NV.drawSpectralEnemy2D(ctx, enemy, 30, player, { enabled: true, state: 'listening', onset: 1, kick: 0.8, bass: 0.9, energy: 0.5 }) !== true) throw new Error('no renderizo ' + vid);
    if (JSON.stringify(enemy) !== snapshot) throw new Error('muto datos de gameplay en ' + vid);
  }
});
t('Predator execution VFX comparte el pase espectral y Phantom no recibe arma', () => {
  const source = fs.readFileSync('js/render/spectralEnemies2D.js', 'utf8');
  if (!source.includes('const cfg = NV.ELITE_PREDATOR_HUNTER')) throw new Error('VFX duplica autoridad de geometría');
  if (!source.includes('drawElitePredatorExecutionVfx(ctx, e, rx, ry)')) throw new Error('VFX fuera del pase espectral');
  const phantom = { x: 100, y: 100, radius: 16, color: '#e0ffff', shape: 'circle', enemyTypeId: 'tank', visualId: 'elite_phantom', isElite: true, dead: false };
  const snapshot = JSON.stringify(phantom);
  if (NV.drawSpectralEnemy2D(mkCtx(), phantom, 30, player, null) !== true) throw new Error('Phantom no renderizó');
  if (JSON.stringify(phantom) !== snapshot) throw new Error('Phantom mutado por VFX Predator');
  if (Object.keys(phantom).some((key) => key.indexOf('predator') === 0)) throw new Error('Phantom recibió estado Predator');
});
t('Goliath comunica windup, impacto, aftershock y recovery sin mutar gameplay', () => {
  const cfg = {
    triggerRange: 130, slamRadius: 145, windup: 0.35, aftershockDelay: 1,
    aftershockRadius: 60, aftershockDamageMult: 0.35, recovery: 0.75,
    attackCooldown: 1.5, initialAttackDelay: 0.75, holdMin: 118, holdMax: 138,
    retreatRange: 108, retreatSpeedMult: 0.35, impactVfxTime: 0.14, aftershockVfxTime: 0.18,
  };
  NV.ELITE_GOLIATH_SEISMIC = Object.freeze(cfg);
  const base = { x: 100, y: 100, radius: 36, color: '#ff1493', shape: 'rock', visualId: 'elite_titan', isElite: true, dead: false, goliathImpactX: 100, goliathImpactY: 100 };
  const draw = (over) => {
    const enemy = Object.assign({}, base, over);
    const snapshot = JSON.stringify(enemy);
    const ctx = mkCtx();
    if (NV.drawSpectralEnemy2D(ctx, enemy, 30, player, null) !== true) throw new Error('no renderizó Goliath');
    if (JSON.stringify(enemy) !== snapshot) throw new Error('renderer mutó gameplay en ' + enemy.goliathState);
    return ctx;
  };
  const windup = draw({ goliathState: 'slam_windup', goliathStateTimer: 0.35 });
  if (!windup.styles.includes('#ff6474')) throw new Error('windup sin warning red');
  if (!windup.arcs.some((arc) => Math.abs(arc.radius - 145) < 1e-9)) throw new Error('windup no muestra radio máximo 145 desde el primer frame');
  const primary = draw({ goliathState: 'aftershock_window', goliathStateTimer: 1, goliathImpactVfxTimer: 0.1 });
  if (!primary.styles.includes('#ff3b4f') || !primary.styles.includes('#ffffff')) throw new Error('impacto primario sin pulso/hotspot');
  if (!primary.arcs.some((arc) => Math.abs(arc.radius - 145) < 1e-9)) throw new Error('impacto primario sin confirmación 145');
  const warning = draw({ goliathState: 'aftershock_window', goliathStateTimer: 0.5 });
  if (!warning.styles.includes('#ff6474')) throw new Error('aftershock sin warning');
  if (!warning.arcs.some((arc) => Math.abs(arc.radius - 60) < 1e-9)) throw new Error('aftershock warning sin radio 60');
  if (warning.arcs.some((arc) => Math.abs(arc.radius - 145) < 1e-9)) throw new Error('aftershock warning conserva zona exterior 145');
  const aftershock = draw({ goliathState: 'recovery', goliathStateTimer: 0.75, goliathAftershockVfxTimer: 0.12 });
  if (!aftershock.styles.includes('#ff3b4f') || !aftershock.styles.includes('#ffffff')) throw new Error('aftershock impact sin pulso/hairline');
  if (!aftershock.arcs.some((arc) => Math.abs(arc.radius - 60) < 1e-9)) throw new Error('aftershock impact sin radio 60');
  if (aftershock.arcs.some((arc) => Math.abs(arc.radius - 145) < 1e-9)) throw new Error('aftershock impact redibuja zona 145');
  const recovery = draw({ goliathState: 'recovery', goliathStateTimer: 0.4 });
  if (recovery.styles.includes('#ff6474') || recovery.styles.includes('#ff3b4f')) throw new Error('recovery conserva peligro rojo activo');
});
t('visual Lab de los 4 espectrales de producción NO muta datos', () => {
  const ids = ['specter_grunt', 'specter_archer', 'specter_guard', 'specter_elite_void'];
  for (const id of ids) {
    const ctx = mkCtx();
    const enemy = { x: 100, y: 100, radius: 12, color: '#fff', shape: 'circle', enemyTypeId: id, visualId: id.replace('specter_elite_', 'elite_specter_'), isElite: id.indexOf('specter_elite_') === 0, dead: false };
    const snapshot = JSON.stringify(enemy);
    if (NV.drawSpectralEnemy2D(ctx, enemy, 30, player, { enabled: true, state: 'listening', onset: 1, kick: 0.8, bass: 0.9, energy: 0.5 }) !== true) throw new Error('no renderizó ' + id);
    if (JSON.stringify(enemy) !== snapshot) throw new Error('mutó datos de gameplay en ' + id);
  }
});

t('specter shape ahora renderiza con la estética del Visual Lab', () => {
  const ctx = mkCtx();
  const enemy = { x: 100, y: 100, radius: 12, color: '#ff6a24', shape: 'specter', enemyTypeId: 'specter_lite', dead: false };
  if (NV.drawSpectralEnemy2D(ctx, enemy, 30, player, null) !== true) throw new Error('esperaba true');
  if (ctx.calls.length < 5) throw new Error('pocos trazos para specter');
});

t('specter_lite y specter_core mapean a los modelos del lab sin mutar datos', () => {
  for (const id of ['specter_lite', 'specter_core']) {
    const ctx = mkCtx();
    const isCore = id === 'specter_core';
    const enemy = { x: 100, y: 100, radius: isCore ? 16 : 12, color: isCore ? '#ff2244' : '#ff6a24', shape: 'specter', enemyTypeId: id, dead: false };
    const snapshot = JSON.stringify(enemy);
    if (NV.drawSpectralEnemy2D(ctx, enemy, 30, player, null) !== true) throw new Error('esperaba true para ' + id);
    if (JSON.stringify(enemy) !== snapshot) throw new Error('mutó datos en ' + id);
    if (ctx.calls.length < 5) throw new Error('pocos trazos para ' + id);
  }
});

t('boss_minion: identidad de render moderna, fuera del fallback legacy', () => {
  // (1) Sigue siendo un PROFILES conocido (perfil cromatico propio).
  const profile = NV.SPECTRAL_ENEMY_PROFILES.boss_minion;
  if (!profile) throw new Error('PROFILES.boss_minion ausente');
  const fallback = NV.SPECTRAL_ENEMY_PROFILES.drone;
  if (profile === fallback) throw new Error('boss_minion cae al perfil drone');
  if (profile.radiusMul === fallback.radiusMul && profile.body === fallback.body) {
    throw new Error('boss_minion no se distingue del fallback drone');
  }
  // (2) Tiene entrada en LAB_SPECTER_IDS.
  const model = NV.LAB_SPECTER_IDS.boss_minion;
  if (model === undefined) throw new Error('boss_minion sin entrada en LAB_SPECTER_IDS');
  // (3) NO es el modelo legacy 0.
  if (model === 0) throw new Error('boss_minion mapea al modelo legacy 0');
  // (4) Entidad real con enemyTypeId enruta al camino moderno sin crash.
  const ctx = mkCtx();
  const enemy = { x: 100, y: 100, radius: 9, color: '#9bb5ff', shape: 'circle', enemyTypeId: 'boss_minion', dead: false };
  if (NV.drawSpectralEnemy2D(ctx, enemy, 30, player, null) !== true) throw new Error('esperaba true');
  if (ctx.calls.length < 5) throw new Error('pocos trazos');
  // Un sin enemyTypeId debe SEGUIR cayendo al fallback (comportamiento intacto).
  const legacyCtx = mkCtx();
  const legacy = { x: 100, y: 100, radius: 9, color: '#fff', shape: 'circle', dead: false };
  if (NV.drawSpectralEnemy2D(legacyCtx, legacy, 30, player, null) !== true) throw new Error('fallback legacy roto');
  // NO muta datos de gameplay.
  const snapshot = JSON.stringify(enemy);
  NV.drawSpectralEnemy2D(mkCtx(), enemy, 31, player, null);
  if (JSON.stringify(enemy) !== snapshot) throw new Error('mutó datos del enemigo');
  // La variante del MUTANTE reutiliza la misma entidad canónica, pero toma un
  // perfil interno verde y más agresivo sin ampliar el roster público.
  const mutantClone = { ...enemy, summonVariant: 'mutant' };
  const mutantSnapshot = JSON.stringify(mutantClone);
  const mutantCtx = mkCtx();
  if (NV.drawSpectralEnemy2D(mutantCtx, mutantClone, 31, player, null) !== true) throw new Error('clon mutante no renderiza');
  if (mutantCtx.calls.length < 5 || JSON.stringify(mutantClone) !== mutantSnapshot) throw new Error('clon mutante inválido o mutado');
});

t('boss_minion no altera los mapeos de espectros, elites ni factors globales', () => {
  // Mapeos previos intactos.
  const expected = {
    specter_lite: 1, specter_grunt: 1, specter_core: 2, specter_archer: 3,
    specter_guard: 4, specter_elite_void: 5,
    elite_base: 5, elite_velocity: 5, elite_bulwark: 5, elite_predator: 5,
    elite_phantom: 5, elite_titan: 5, elite_swift: 5,
  };
  for (const [id, model] of Object.entries(expected)) {
    if (NV.LAB_SPECTER_IDS[id] !== model) throw new Error(id + ' modelo=' + NV.LAB_SPECTER_IDS[id]);
  }
  // La tabla global de escalas y los 6 factores de hitbox siguen siendo los mismos.
  const scales = [0.70, 0.75, 0.80, 0.80, 0.82, 0.85];
  for (let i = 0; i < 6; i++) {
    if (Math.abs(NV.LAB_MODEL_SCALE_FACTORS[i] - scales[i]) > 1e-9) throw new Error('escala global alterada ' + i);
  }
  const factors = [0.875, 0.9375, 1, 1, 1.025, 1.0625 * 0.65];
  for (let i = 0; i < 6; i++) {
    if (Math.abs(NV.labModelHitboxFactor(i) - factors[i]) > 1e-9) throw new Error('factor global alterado ' + i);
  }
  // El minion NO es un espectro de produccion: no recibe el body scale 0.65.
  if (NV.spectralBodyScale('boss_minion') !== 1) throw new Error('boss_minion recibió SPECTRAL_BODY_SCALE');
  // Perfil base: sigue habiendo exactamente los mismos perfiles.
  if (Object.keys(NV.SPECTRAL_ENEMY_PROFILES).length !== 12) throw new Error('nº de perfiles alterado');
});

t('cinco espectros auditados: RB2-RB3-RB4-RB5 intactos por modelo y ×0.65 por enemyTypeId', () => {
  const expected = {
    specter_grunt: { model: 1, scale: 0.75, factor: 0.9375 },
    specter_archer: { model: 3, scale: 0.80, factor: 1 },
    specter_guard: { model: 4, scale: 0.82, factor: 1.025 },
    specter_lite: { model: 1, scale: 0.75, factor: 0.9375 },
    specter_core: { model: 2, scale: 0.80, factor: 1 },
  };
  if (NV.SPECTRAL_BODY_SCALE !== 0.65) throw new Error('SPECTRAL_BODY_SCALE ausente');
  for (const [id, contract] of Object.entries(expected)) {
    // Modelo asignado y tabla por modelo SIN alterar (consumidores no relacionados).
    if (NV.LAB_SPECTER_IDS[id] !== contract.model) throw new Error(id + ' modelo=' + NV.LAB_SPECTER_IDS[id]);
    if (Math.abs(NV.LAB_MODEL_SCALE_FACTORS[contract.model] - contract.scale) > 1e-9) throw new Error(id + ' escala de modelo alterada');
    if (Math.abs(NV.labModelHitboxFactor(contract.model) - contract.factor) > 1e-9) throw new Error(id + ' factor de modelo alterado');
    // Efectivo por enemyTypeId: escala visual y hitbox físico = base ×0.65.
    if (NV.spectralBodyScale(id) !== 0.65) throw new Error(id + ' spectralBodyScale=' + NV.spectralBodyScale(id));
    if (Math.abs(NV.labModelHitboxFactor(contract.model, id) - contract.factor * 0.65) > 1e-9) throw new Error(id + ' factor efectivo');
    if (Math.abs(contract.scale * 0.65 - contract.scale * NV.spectralBodyScale(id)) > 1e-12) throw new Error(id + ' escala efectiva');
  }
  // Scoped: nadie fuera de los cinco recibe el 0.65 (Hydra, élites, comunes...).
  for (const id of ['specter_elite_void', 'elite_base', 'elite_velocity', 'swarmlet', 'drone', 'runner', null, undefined, '']) {
    if (NV.spectralBodyScale(id) !== 1) throw new Error(id + ' recibió el body scale de espectros');
  }
});

t('cinco espectros usan renderer líquido optimizado sin blur/random ni mutación', () => {
  const ids = ['specter_grunt', 'specter_archer', 'specter_guard', 'specter_lite', 'specter_core'];
  const oldRandom = sbx.Math.random;
  sbx.Math.random = function () { throw new Error('Math.random en render'); };
  try {
    for (const id of ids) {
      const ctx = mkCtx();
      const enemy = { x: 100, y: 100, radius: 12, color: '#67f8c8', shape: 'specter', enemyTypeId: id, dead: false };
      const snapshot = JSON.stringify(enemy);
      if (NV.drawSpectralEnemy2D(ctx, enemy, 30, player, null) !== true) throw new Error(id + ' no renderizó');
      if (ctx.shadowBlurs.some((value) => value > 0)) throw new Error(id + ' conserva blur=' + ctx.shadowBlurs.join(','));
      if (JSON.stringify(enemy) !== snapshot) throw new Error(id + ' mutó gameplay');
    }
  } finally {
    sbx.Math.random = oldRandom;
  }
});

t('modelos no-RB6 no entran en clasificación Hydra/ojos Hydra', () => {
  for (const id of ['specter_grunt', 'specter_archer', 'specter_guard', 'specter_lite', 'specter_core']) {
    if (NV.isHydraEnemyFamily({ enemyTypeId: id, visualId: id })) throw new Error(id + ' clasificado Hydra');
  }
});

t('down-scale por modelo: factores aprobados y radio visual del roster', () => {
  if (!Array.isArray(NV.LAB_MODEL_SCALE_FACTORS) || NV.LAB_MODEL_SCALE_FACTORS.length !== 6) throw new Error('factores ausentes');
  const expected = [24.5, 30, 30.4, 30.4, 34.44, 38.25 * 0.65];
  for (let i = 0; i < 6; i++) {
    const r = NV.labModelVisualRadius(i);
    if (Math.abs(r - expected[i]) > 0.01) throw new Error('modelo ' + i + ' radio=' + r);
  }
  // Jerarquía del roster no-Hydra preservada. RB6 recibe el ajuste corporal
  // específico 0.65 y por diseño deja de ser el cuerpo más grande.
  for (let i = 1; i < 5; i++) {
    if (NV.labModelVisualRadius(i) < NV.labModelVisualRadius(i - 1) - 1e-9) throw new Error('jerarquía invertida en ' + i);
  }
});

t('factor de hitbox por modelo = factor visual / 0.8 previo', () => {
  const expected = [0.875, 0.9375, 1, 1, 1.025, 1.0625 * 0.65];
  for (let i = 0; i < 6; i++) {
    const f = NV.labModelHitboxFactor(i);
    if (Math.abs(f - expected[i]) > 1e-9) throw new Error('modelo ' + i + ' factor=' + f);
  }
});

t('customScale escala el radio visual del modelo', () => {
  if (Math.abs(NV.labModelVisualRadius(0, 2) - 49) > 0.01) throw new Error('x2=' + NV.labModelVisualRadius(0, 2));
  if (Math.abs(NV.labModelVisualRadius(5, 0.5) - 19.125 * 0.65) > 0.01) throw new Error('x0.5=' + NV.labModelVisualRadius(5, 0.5));
});

t('render con slowUntil activo', () => {
  const ctx = mkCtx();
  const enemy = { x: 100, y: 100, radius: 12, color: '#fff', shape: 'circle', enemyTypeId: 'drone', dead: false, slowUntil: 1.5 };
  if (NV.drawSpectralEnemy2D(ctx, enemy, 30, player, null) !== true) throw new Error('esperaba true');
});

t('render con mine activo', () => {
  const ctx = mkCtx();
  const enemy = { x: 100, y: 100, radius: 12, color: '#fff', shape: 'circle', enemyTypeId: 'drone', dead: false, mine: true };
  if (NV.drawSpectralEnemy2D(ctx, enemy, 30, player, null) !== true) throw new Error('esperaba true');
});

t('render con armed activo (kamikaze)', () => {
  const ctx = mkCtx();
  const enemy = { x: 100, y: 100, radius: 12, color: '#ff5f3d', shape: 'triangle', enemyTypeId: 'kamikaze', dead: false, armed: true, fuse: 0.5 };
  if (NV.drawSpectralEnemy2D(ctx, enemy, 30, player, null) !== true) throw new Error('esperaba true');
});

t('render élite base (isElite sin visualId)', () => {
  const ctx = mkCtx();
  const enemy = { x: 100, y: 100, radius: 15, color: '#ff0', shape: 'hex', enemyTypeId: 'tank', dead: false, isElite: true };
  if (NV.drawSpectralEnemy2D(ctx, enemy, 30, player, null) !== true) throw new Error('esperaba true');
});

t('render élite con visualId específico', () => {
  const ctx = mkCtx();
  const enemy = { x: 100, y: 100, radius: 15, color: '#ff0', shape: 'triangle', enemyTypeId: 'runner', dead: false, isElite: true, visualId: 'elite_velocity' };
  if (NV.drawSpectralEnemy2D(ctx, enemy, 30, player, null) !== true) throw new Error('esperaba true');
});

// Cobertura del API público para los 8 perfiles élite canónicos.
const eliteVisualIds = ['elite_base', 'elite_velocity', 'elite_bulwark', 'elite_predator', 'elite_phantom', 'elite_titan', 'elite_swift', 'elite_specter_void'];
for (const vid of eliteVisualIds) {
  t('render élite visualId=' + vid + ' sin crash', () => {
    const ctx = mkCtx();
    const enemy = { x: 100, y: 100, radius: 15, color: '#ff0', shape: 'hex', enemyTypeId: 'tank', dead: false, isElite: true, visualId: vid };
    if (NV.drawSpectralEnemy2D(ctx, enemy, 30, player, null) !== true) throw new Error('esperaba true para ' + vid);
    if (ctx.calls.length < 5) throw new Error('pocos trazos para ' + vid);
  });
}

// Ruta canónica de producción: los 7 élites base llevan visualId; el espectral
// superviviente lleva enemyTypeId y visualId canónicos. Ningún caso fuerza
// enemyTypeId='tank', porque eso seleccionaría el fallback raid-boss legacy.
const canonicalHydraPaths = [
  { visualId: 'elite_base' },
  { visualId: 'elite_velocity' },
  { visualId: 'elite_bulwark' },
  { visualId: 'elite_predator' },
  { visualId: 'elite_phantom' },
  { visualId: 'elite_titan' },
  { visualId: 'elite_swift' },
  { enemyTypeId: 'specter_elite_void', visualId: 'elite_specter_void' },
];
t('cobertura Hydra/RB6 canónica enumera 8/8 élites sin duplicados', () => {
  const visualIds = canonicalHydraPaths.map((entry) => entry.visualId);
  if (visualIds.length !== 8 || new Set(visualIds).size !== 8) throw new Error('esperaba 8 IDs canónicos únicos');
  for (const vid of eliteVisualIds) if (!visualIds.includes(vid)) throw new Error('falta ' + vid);
});
for (const route of canonicalHydraPaths) {
  t('ruta Hydra/RB6 canónica visualId=' + route.visualId + ' sin crash', () => {
    const ctx = mkCtx();
    const enemy = { x: 100, y: 100, radius: 15, color: '#ff0', shape: 'hex', dead: false, isElite: true, visualId: route.visualId };
    if (route.enemyTypeId) enemy.enemyTypeId = route.enemyTypeId;
    if (!NV.isHydraEnemyFamily(enemy)) throw new Error('no clasificó como Hydra/RB6: ' + route.visualId);
    if (NV.drawSpectralEnemy2D(ctx, enemy, 30, player, null) !== true) throw new Error('esperaba true para ' + route.visualId);
    if (ctx.calls.length < 5) throw new Error('pocos trazos Hydra/RB6 para ' + route.visualId);
  });
}

t('NV.SPECTRAL_ELITE_PROFILES expone 8 perfiles', () => {
  if (!NV.SPECTRAL_ELITE_PROFILES) throw new Error('SPECTRAL_ELITE_PROFILES ausente');
  if (Object.keys(NV.SPECTRAL_ELITE_PROFILES).length !== 8) throw new Error('esperaba 8 perfiles élite, hay ' + Object.keys(NV.SPECTRAL_ELITE_PROFILES).length);
});

t('cada perfil élite tiene haloColor y haloWidth', () => {
  for (const [vid, p] of Object.entries(NV.SPECTRAL_ELITE_PROFILES)) {
    if (!p.haloColor) throw new Error(vid + ' sin haloColor');
    if (!p.haloWidth) throw new Error(vid + ' sin haloWidth');
  }
});

t('resolveProfile usa visualId del enemigo', () => {
  const ctx = mkCtx();
  const enemy = { x: 100, y: 100, radius: 15, color: '#ff0', shape: 'hex', enemyTypeId: 'tank', dead: false, isElite: true, visualId: 'elite_titan' };
  // Renderiza y verifica que no crashée con el perfil titan (masivo)
  if (NV.drawSpectralEnemy2D(ctx, enemy, 30, player, null) !== true) throw new Error('esperaba true');
});

t('élite sin visualId cae a elite_base', () => {
  const ctx = mkCtx();
  const enemy = { x: 100, y: 100, radius: 15, color: '#ff0', shape: 'hex', enemyTypeId: 'tank', dead: false, isElite: true };
  if (NV.drawSpectralEnemy2D(ctx, enemy, 30, player, null) !== true) throw new Error('esperaba true');
});

t('élite con visualId inválido cae a elite_base', () => {
  const ctx = mkCtx();
  const enemy = { x: 100, y: 100, radius: 15, color: '#ff0', shape: 'hex', enemyTypeId: 'tank', dead: false, isElite: true, visualId: 'inexistente' };
  if (NV.drawSpectralEnemy2D(ctx, enemy, 30, player, null) !== true) throw new Error('esperaba true');
});

// Tests para el renderer espectral de bosses
const bossTypes = [
  { name: 'JEFE', hp: 300, maxHp: 300, radius: 50, color: '#ff5f9b', shape: 'hex' },
  { name: 'TITÁN', hp: 450, maxHp: 450, radius: 55, color: '#ff8c00', shape: 'hex' },
  { name: 'SEÑOR DEL VACÍO', hp: 600, maxHp: 600, radius: 65, color: '#dc143c', shape: 'circle' },
  { name: 'GUARDIÁN', hp: 350, maxHp: 350, radius: 45, color: '#00bfff', shape: 'hex' },
  { name: 'DESTRUCTOR', hp: 500, maxHp: 500, radius: 60, color: '#ff0000', shape: 'rock' },
  { name: 'NÉMESIS', hp: 400, maxHp: 400, radius: 48, color: '#8b00ff', shape: 'diamond' },
  { name: 'COLOSO', hp: 700, maxHp: 700, radius: 70, color: '#ff4500', shape: 'rock' },
  { name: 'FANTASMA', hp: 280, maxHp: 280, radius: 40, color: '#e0ffff', shape: 'circle' },
  { name: 'MUTANTE', hp: 380, maxHp: 380, radius: 52, color: '#32cd32', shape: 'hex' },
  { name: 'APOCALIPSIS', hp: 800, maxHp: 800, radius: 75, color: '#ff1493', shape: 'rock' },
];
for (const bt of bossTypes) {
  t('render boss ' + bt.name + ' espectral sin crash', () => {
    const ctx = mkCtx();
    const boss = { x: 400, y: 300, hp: bt.hp, maxHp: bt.maxHp, radius: bt.radius, color: bt.color, shape: bt.shape, name: bt.name, dead: false, hitFlash: 0, phase2: false };
    if (NV.drawSpectralBoss2D(ctx, boss, 30, player, null) !== true) throw new Error('esperaba true para boss ' + bt.name);
    if (ctx.calls.length < 8) throw new Error('pocos trazos para boss ' + bt.name);
  });
}

t('render boss con hitFlash activo', () => {
  const ctx = mkCtx();
  const boss = { x: 400, y: 300, hp: 300, maxHp: 300, radius: 50, color: '#ff5f9b', shape: 'hex', name: 'JEFE', dead: false, hitFlash: 0.8, phase2: false };
  if (NV.drawSpectralBoss2D(ctx, boss, 30, player, null) !== true) throw new Error('esperaba true');
});

t('render boss en FASE 2', () => {
  const ctx = mkCtx();
  const boss = { x: 400, y: 300, hp: 300, maxHp: 300, radius: 50, color: '#ff5f9b', shape: 'hex', name: 'JEFE', dead: false, hitFlash: 0, phase2: true };
  if (NV.drawSpectralBoss2D(ctx, boss, 30, player, null) !== true) throw new Error('esperaba true');
});

t('boss muerto devuelve false', () => {
  const ctx = mkCtx();
  const boss = { x: 400, y: 300, hp: 0, maxHp: 300, radius: 50, color: '#ff5f9b', shape: 'hex', name: 'JEFE', dead: true, hitFlash: 0, phase2: false };
  if (NV.drawSpectralBoss2D(ctx, boss, 30, player, null) !== false) throw new Error('esperaba false');
});

t('NV.SPECTRAL_BOSS_PROFILES expone 10 perfiles', () => {
  if (!NV.SPECTRAL_BOSS_PROFILES) throw new Error('SPECTRAL_BOSS_PROFILES ausente');
  if (Object.keys(NV.SPECTRAL_BOSS_PROFILES).length !== 10) throw new Error('esperaba 10 perfiles boss, hay ' + Object.keys(NV.SPECTRAL_BOSS_PROFILES).length);
});

t('los 10 bosses tienen armazones visuales únicos ligados a su ataque', () => {
  const profiles = Object.values(NV.SPECTRAL_BOSS_PROFILES);
  const rigs = profiles.map((profile) => profile.rig);
  if (rigs.some((rig) => !rig)) throw new Error('perfil sin rig');
  if (new Set(rigs).size !== 10) throw new Error('rig repetido: ' + rigs.join(','));
  const source = fs.readFileSync('js/render/spectralEnemies2D.js', 'utf8');
  if (!source.includes('drawBossIdentityRig(ctx, boss, frame, profile)')) throw new Error('rig no conectado al render productivo');
});

t('fase 2 intensifica la silueta sin mutar gameplay', () => {
  for (const bt of bossTypes) {
    const phase1 = { x: 400, y: 300, hp: bt.hp, maxHp: bt.maxHp, radius: bt.radius, color: bt.color, shape: bt.shape, name: bt.name, dead: false, hitFlash: 0, phase2: false };
    const phase2 = { ...phase1, hp: bt.hp * .49, phase2: true };
    const snapshot1 = JSON.stringify(phase1), snapshot2 = JSON.stringify(phase2);
    const ctx1 = mkCtx(), ctx2 = mkCtx();
    NV.drawSpectralBoss2D(ctx1, phase1, 60, player, null);
    NV.drawSpectralBoss2D(ctx2, phase2, 60, player, null);
    if (ctx2.calls.length <= ctx1.calls.length) throw new Error(bt.name + ' no intensifica su fase 2');
    if (JSON.stringify(phase1) !== snapshot1 || JSON.stringify(phase2) !== snapshot2) throw new Error(bt.name + ' mutado por render');
  }
});

t('MUTANTE tiene identidad orgánica propia y conserva gameplay inmutable', () => {
  const profile = NV.SPECTRAL_BOSS_PROFILES.boss_mutante;
  if (!profile || !profile.mutateEffect || profile.eyeStyle !== 'mutant') throw new Error('perfil orgánico incompleto');
  if (profile.body === '#32cd32' || profile.radiusMul >= 1.25) throw new Error('regresó la estrella verde sobredimensionada');
  const ctx = mkCtx();
  const boss = { x: 400, y: 300, hp: 180, maxHp: 380, radius: 52, color: '#32cd32', shape: 'hex', name: 'MUTANTE', dead: false, hitFlash: 0, phase2: true };
  const snapshot = JSON.stringify(boss);
  if (NV.drawSpectralBoss2D(ctx, boss, 45, player, null) !== true) throw new Error('no renderizó');
  if (!ctx.calls.includes('ellipse')) throw new Error('faltan cámaras biológicas');
  if (!ctx.styles.includes(profile.scar)) throw new Error('falta contraste de mutación');
  if (JSON.stringify(boss) !== snapshot) throw new Error('el render mutó gameplay');
});

t('render shielder con escudo en cooldown', () => {
  const ctx = mkCtx();
  const enemy = { x: 100, y: 100, radius: 14, color: '#5fffa0', shape: 'diamond', enemyTypeId: 'shielder', dead: false, shieldCd: 1.0 };
  if (NV.drawSpectralEnemy2D(ctx, enemy, 30, player, null) !== true) throw new Error('esperaba true');
});

t('index.html carga spectralEnemies2D.js antes que enemies.js', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  if (!html.includes('js/render/spectralEnemies2D.js')) throw new Error('no cargado');
  const idxSpectral = html.indexOf('spectralEnemies2D.js');
  const idxEnemies = html.indexOf('enemies.js');
  if (idxSpectral > idxEnemies) throw new Error('orden incorrecto');
});

console.log('\nRESULT spectral_enemies_render: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);
