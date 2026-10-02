// Contratos enfocados: resize sin layout por frame, DOM HUD/widget y diagnóstico render-only.
const fs = require('fs'), vm = require('vm');
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('  ok  ' + name); } catch (e) { fail++; console.log('  FAIL ' + name + ' -> ' + e.message); } }

function loadCanvasModule() {
  const ctx = {};
  const main = { width: 900, height: 520, offsetLeft: 4, offsetTop: 6, style: {}, getContext() { return ctx; } };
  const sbx = {
    window: { NV: {} }, console, Math,
    document: { getElementById(id) { return id === 'game' ? main : null; } },
  };
  vm.runInNewContext(fs.readFileSync('js/render/canvas.js', 'utf8'), sbx, { filename: 'js/render/canvas.js' });
  return { NV: sbx.window.NV, main };
}

t('resize controller no lee layout ni escribe dimensiones mientras no está dirty', () => {
  const { NV, main } = loadCanvasModule();
  let reads = 0, widthWrites = 0, heightWrites = 0;
  let width = main.width, height = main.height;
  Object.defineProperty(main, 'width', { get() { return width; }, set(v) { widthWrites++; width = v; }, configurable: true });
  Object.defineProperty(main, 'height', { get() { return height; }, set(v) { heightWrites++; height = v; }, configurable: true });
  main.getBoundingClientRect = () => { reads++; return { width: 900, height: 520 }; };
  const ctl = NV.createCanvasResizeController({ canvas: main, getDpr: () => 1, getView: () => ({ width: 900, height: 520 }) });
  ctl.flush();
  ctl.flush();
  if (reads !== 1) throw new Error('layout reads=' + reads);
  if (widthWrites !== 0 || heightWrites !== 0) throw new Error('reescribió backing store sin cambio');
});

t('resize controller actualiza backing store y escala cuando cambian dimensiones/DPR', () => {
  const { NV, main } = loadCanvasModule();
  let rect = { width: 600, height: 300 }, resized = 0;
  main.getBoundingClientRect = () => rect;
  const ctl = NV.createCanvasResizeController({
    canvas: main,
    getDpr: () => 2,
    getView: () => ({ width: 900, height: 520 }),
    onBackingStoreResize() { resized++; },
  });
  const first = ctl.flush();
  if (main.width !== 1200 || main.height !== 600 || resized !== 1) throw new Error(JSON.stringify(first.metrics));
  if (Math.abs(first.metrics.scaleX - 1200 / 900) > 1e-9 || Math.abs(first.metrics.scaleY - 600 / 520) > 1e-9) throw new Error('escala incorrecta');
  rect = { width: 640, height: 360 };
  ctl.markDirty();
  ctl.flush();
  if (main.width !== 1280 || main.height !== 720 || resized !== 2) throw new Error('resize real no aplicado');
});

const game = fs.readFileSync('js/game.js', 'utf8');
const mobileControls = fs.readFileSync('js/ui/mobileControls.js', 'utf8');
t('game marca resize por eventos/observer y draw usa flush barato', () => {
  if (!game.includes('function markCanvasResizeDirty()')) throw new Error('sin dirty flag');
  if (!game.includes('new ResizeObserver(requestCanvasResize)')) throw new Error('sin ResizeObserver');
  if (!game.includes('NV.viewport.onChange(requestCanvasResize)')) throw new Error('sin señal viewport');
  const draw = game.slice(game.indexOf('function draw()'), game.indexOf('function drawSpecialVFX'));
  if (!draw.includes('resizeCanvas();')) throw new Error('draw no sincroniza resize');
  const resizeFn = game.slice(game.indexOf('function resizeCanvas('), game.indexOf('const W = ARENA_W'));
  if (resizeFn.includes('getBoundingClientRect')) throw new Error('wrapper vuelve a leer layout directamente');
});

t('HUD y widget evitan escrituras DOM idénticas', () => {
  const hud = game.slice(game.indexOf('function updateHUD()'), game.indexOf('// Dibuja el proyectil'));
  for (const token of ["dom.wave.textContent !== waveText", "dom.score.textContent !== scoreText", "dom.hpFill.style.width !== hpWidth", "classList.contains('critical') !== criticalHealth"]) {
    if (!hud.includes(token)) throw new Error('falta guard ' + token);
  }
  if (!game.includes("function setWidgetStyle(node, key, value)")) throw new Error('widget sin guard de estilo');
  if (!game.includes("const rhythmWidgetGlyph = dom.rwIcon ?")) throw new Error('widget repite querySelector');
  if (!game.includes('lastMobileSpecialSignature')) throw new Error('notificación móvil sin dedupe');
  if (!mobileControls.includes("specialStatus.textContent !== status")) throw new Error('HUD especial móvil reescribe texto idéntico');
  if (!mobileControls.includes("specialBtn.getAttribute('aria-label') !== ariaLabel")) throw new Error('HUD especial móvil reescribe aria idéntico');
});

t('diagnóstico de grupos default full y solo controla llamadas de render', () => {
  for (const mode of ['full', 'no-background-effects', 'no-starfield', 'no-meta-overlays', 'core-gameplay-only']) {
    if (!game.includes("'" + mode + "'") && !game.includes(mode + ':')) throw new Error('falta modo ' + mode);
  }
  if (!game.includes("let renderDiagnosticMode = 'full'")) throw new Error('default no full');
  if (!game.includes('NV.setRenderDiagnosticMode') || !game.includes('NV.getRenderDiagnostics')) throw new Error('API ausente');
  const block = game.slice(game.indexOf('const RENDER_DIAGNOSTIC_MODES'), game.indexOf('function drawSpecialVFX'));
  for (const forbidden of ['enemies =', 'bullets =', 'player.hp =', 'waveTimer =', 'rhythmTick']) {
    if (block.includes(forbidden)) throw new Error('diagnóstico muta gameplay: ' + forbidden);
  }
  for (const gate of ['drawBackgroundEffects', 'drawStarfield', 'drawMetaOverlays', 'drawDecorativeVfx']) if (!block.includes(gate)) throw new Error('gate ausente ' + gate);
});

t('aislamiento fino mantiene starfield y elimina diagnóstico engañoso de grilla', () => {
  if (!game.includes("'no-starfield': { backgroundEffects: true, starfield: false")) throw new Error('no-starfield no aísla solo estrellas');
  if (!game.includes('if (drawStarfield) NV.drawStarfield(')) throw new Error('starfield sin gate propio');
  for (const token of ['no-grid', 'drawGrid', 'gridAlpha', 'gridStartX', 'gridRgb']) {
    if (game.includes(token)) throw new Error('grilla/código muerto: ' + token);
  }
  if (!game.includes("tier: vbp ? vbp.tier : 'full'")) throw new Error('fondo no consume tier real');
});

console.log('RESULT render_pipeline_diagnostics: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);
