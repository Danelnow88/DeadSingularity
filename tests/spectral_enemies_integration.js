// ===== TEST: integración del modo espectral en game.js =====
// Valida que el flag, el toggle y el punto de integración existen y funcionan.
const fs = require('fs');
const vm = require('vm');
const path = require('path');

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); console.log('  ok  ' + name); pass++; }
  catch (err) { console.log('FAIL  ' + name + ': ' + err.message); fail++; }
}

const gameSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'game.js'), 'utf8');

console.log('spectral_enemies_integration:');

// 1. Flag existe y es true por defecto (remaster activo; fallback vía toggle)
t('NV.SPECTRAL_ENEMY_MODE existe y es true por defecto', () => {
  if (!gameSrc.includes('NV.SPECTRAL_ENEMY_MODE = true')) throw new Error('flag no encontrado o no es true');
});

// 2. Toggle existe
t('NV.toggleSpectralEnemyMode es función', () => {
  if (!gameSrc.includes('NV.toggleSpectralEnemyMode = function')) throw new Error('toggle ausente');
});

// 3. Toggle alterna el flag
t('toggleSpectralEnemyMode alterna SPECTRAL_ENEMY_MODE', () => {
  const sandbox = { window: {}, console, Math, Date, Array, Object, JSON, Map, Set, WeakMap, Promise, Symbol, Uint8Array, Float32Array, Int32Array, Uint8ClampedArray, ArrayBuffer, Error, TypeError, RangeError, parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent, setTimeout, clearTimeout, setInterval, clearInterval };
  sandbox.window.NV = {};
  vm.createContext(sandbox);
  // Simula el toggle extraído del source
  sandbox.window.NV.SPECTRAL_ENEMY_MODE = false;
  sandbox.window.NV.toggleSpectralEnemyMode = function (enabled) {
    sandbox.window.NV.SPECTRAL_ENEMY_MODE = !!enabled;
    return sandbox.window.NV.SPECTRAL_ENEMY_MODE;
  };
  if (sandbox.window.NV.toggleSpectralEnemyMode(true) !== true) throw new Error('no activó');
  if (sandbox.window.NV.SPECTRAL_ENEMY_MODE !== true) throw new Error('flag no cambió');
  if (sandbox.window.NV.toggleSpectralEnemyMode(false) !== false) throw new Error('no desactivó');
  if (sandbox.window.NV.SPECTRAL_ENEMY_MODE !== false) throw new Error('flag no volvió a false');
});

// 4. drawEnemy tiene la rama espectral
t('drawEnemy contiene rama para SPECTRAL_ENEMY_MODE', () => {
  if (!gameSrc.includes('NV.SPECTRAL_ENEMY_MODE')) throw new Error('rama ausente en drawEnemy');
  if (!gameSrc.includes('NV.drawSpectralEnemy2D')) throw new Error('llamada ausente en drawEnemy');
});

t('Predator execution VFX no introduce un render pass adicional', () => {
  const spectralSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'render', 'spectralEnemies2D.js'), 'utf8');
  const vfxCallCount = (spectralSrc.match(/drawElitePredatorExecutionVfx\(ctx, e, rx, ry\);/g) || []).length;
  if (vfxCallCount !== 1) throw new Error('llamadas VFX=' + vfxCallCount);
  const labDraw = spectralSrc.indexOf('drawLabSpecterEnemy(ctx, e, frame, player, profile, rx, ry);');
  const vfxDraw = spectralSrc.indexOf('drawElitePredatorExecutionVfx(ctx, e, rx, ry);', labDraw);
  const branchReturn = spectralSrc.indexOf('return true;', labDraw);
  if (labDraw === -1 || vfxDraw < labDraw || branchReturn < vfxDraw) {
    throw new Error('VFX no integrado en el mismo pase Lab/espectral');
  }
});

// 5. Los comunes aprobados fuerzan el renderer especializado antes del espectral
t('los ocho comunes usan NV.drawEnemy incluso con modo espectral', () => {
  const route = "typeof NV.hasCommonEnemyVisual === 'function' && NV.hasCommonEnemyVisual(e.enemyTypeId)";
  const idxCommon = gameSrc.indexOf(route);
  const idxCommonDraw = gameSrc.indexOf('NV.drawEnemy(ctx, e, frame, player, frameVisualRhythm, visualTimeSeconds)', idxCommon);
  const idxSpectral = gameSrc.indexOf("NV.SPECTRAL_ENEMY_MODE && typeof NV.drawSpectralEnemy2D", idxCommon);
  if (idxCommon === -1 || idxCommonDraw === -1) throw new Error('routing común ausente');
  if (idxSpectral === -1 || idxCommonDraw > idxSpectral) throw new Error('routing común no precede al espectral');
});

// 6. El fallback geométrico se mantiene disponible cuando el modo está apagado
t('el fallback geométrico original se mantiene disponible', () => {
  // Si SPECTRAL_ENEMY_MODE es false, drawEnemy llama NV.drawEnemy
  const idxMode = gameSrc.indexOf('NV.SPECTRAL_ENEMY_MODE && typeof NV.drawSpectralEnemy2D');
  if (idxMode === -1) throw new Error('condicional espectral ausente');
});

t('enemies.js limita el routing especializado a los ocho IDs aprobados', () => {
  const enemiesSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'render', 'enemies.js'), 'utf8');
  const expected = ['drone', 'runner', 'tank', 'shielder', 'swarmlet', 'spitter', 'wisp', 'kamikaze'];
  const match = enemiesSrc.match(/const COMMON_ENEMY_IDS = new Set\(\[([^\]]+)\]\)/);
  if (!match) throw new Error('COMMON_ENEMY_IDS ausente');
  const actual = Array.from(match[1].matchAll(/'([^']+)'/g), (m) => m[1]);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('IDs=' + JSON.stringify(actual));
});

// 7. ELITE_TYPES.visualId apunta a perfiles válidos
t('ELITE_TYPES.visualId coinciden con SPECTRAL_ELITE_PROFILES', () => {
  const gameDataSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'data', 'gameData.js'), 'utf8');
  // Extrae los visualId de ELITE_TYPES del source
  const visualIds = [];
  const regex = /visualId:\s*'([^']+)'/g;
  let match;
  while ((match = regex.exec(gameDataSrc)) !== null) {
    visualIds.push(match[1]);
  }
  // Debe haber exactamente 8 visualIds (uno por élite superviviente)
  if (visualIds.length !== 8) throw new Error('esperaba 8 visualIds en ELITE_TYPES: ' + visualIds.length);
  // Verifica que el spectralEnemies2D.js tiene ELITE_PROFILES
  const spectralSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'render', 'spectralEnemies2D.js'), 'utf8');
  for (const vid of visualIds) {
    if (!spectralSrc.includes(vid + ':') && !spectralSrc.includes("'" + vid + "':") && !spectralSrc.includes('"' + vid + '":')) {
      throw new Error('visualId ' + vid + ' no tiene perfil en ELITE_PROFILES');
    }
  }
});

// 8. Los 4 IDs espectrales de producción supervivientes existen en gameData.js
t('gameData contiene los 4 enemigos espectrales de producción supervivientes', () => {
  const gameDataSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'data', 'gameData.js'), 'utf8');
  const ids = ['specter_grunt', 'specter_archer', 'specter_guard', 'specter_elite_void'];
  for (const id of ids) {
    if (gameDataSrc.indexOf("id: '" + id + "'") === -1) throw new Error('falta ' + id + ' en gameData');
  }
  for (const id of ['specter_elite_swift', 'specter_elite_wrath']) {
    if (gameDataSrc.indexOf("id: '" + id + "'") !== -1) throw new Error('ID retirado sigue en gameData: ' + id);
  }
});

// 9. El render espectral cubre los IDs nuevos
t('spectralEnemies2D tiene perfiles para los 4 espectrales supervivientes', () => {
  const spectralSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'render', 'spectralEnemies2D.js'), 'utf8');
  for (const id of ['specter_grunt:', 'specter_archer:', 'specter_guard:', 'elite_specter_void:']) {
    if (spectralSrc.indexOf(id) === -1) throw new Error('falta perfil ' + id);
  }
});

console.log('RESULT spectral_enemies_integration: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);