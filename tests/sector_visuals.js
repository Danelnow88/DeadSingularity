const assert = require('assert'), fs = require('fs'), vm = require('vm');
const NV = {};
const source = fs.readFileSync('js/render/sectors.js', 'utf8');
const surfaces = [];
class Surface {
  constructor(width, height) { this.width = width; this.height = height; this.context = ctx(); surfaces.push(this); }
  getContext() { return this.context; }
}
let randomCalls = 0;
const math = Object.create(Math); math.random = () => { randomCalls++; throw new Error('RNG de gameplay consumido'); };
vm.runInNewContext(source, { window: { NV }, OffscreenCanvas: Surface, Math: math, console });

function ctx() {
  let ops = 0;
  let arcs = 0;
  const points = [];
  const images = [], stack = [];
  const gradient = () => ({ addColorStop() { ops++; } });
  return {
    globalAlpha: 1,
    get ops() { return ops; },
    get arcs() { return arcs; }, get points() { return points; },
    get images() { return images; },
    save() { ops++; stack.push(this.globalAlpha); }, restore() { ops++; this.globalAlpha = stack.pop(); },
    translate() { ops++; }, rotate() { ops++; }, scale() { ops++; }, clip() { ops++; },
    fill() { ops++; }, bezierCurveTo(...args) { ops++; points.push(args); },
    drawImage(surface, ...args) { ops++; images.push({ surface, args, alpha: this.globalAlpha }); },
    beginPath() { ops++; }, closePath() { ops++; }, stroke() { ops++; },
    arc() { ops++; arcs++; }, ellipse() { ops++; },
    moveTo(x, y) { ops++; points.push([x, y]); }, lineTo(x, y) { ops++; points.push([x, y]); },
    fillRect() { ops++; }, strokeRect() { ops++; }, createLinearGradient: gradient,
    createRadialGradient: gradient,
  };
}

assert.equal(NV.SECTOR_VISUALS.length, 4);
assert.deepStrictEqual([1, 6, 11, 16].map(w => NV.sectorVisualForWave(w).name),
  ['UMBRAL', 'FUNDICIÓN', 'FRACTURA', 'CORAZÓN DEL VACÍO']);
assert.equal(NV.sectorVisualForWave(999).name, 'CORAZÓN DEL VACÍO');
assert.equal(NV.sectorVisualForWave(NaN).name, 'UMBRAL');

const shapes = [];
for (const wave of [1, 6, 11, 16]) {
  const c = ctx();
  const profile = NV.drawSectorBackdrop(c, 900, 520, 120, wave, { detail: 'high' });
  assert(profile && c.images.length === 2, 'sector ' + wave + ' sin capas cacheadas');
  assert(c.ops <= 4, 'sector ' + wave + ' regenera arte por frame');
  shapes.push(JSON.stringify(surfaces[surfaces.length - 2].context.points));
}
assert.equal(new Set(shapes).size, 4, 'escenarios son simples recolores de la misma composición');
const high = ctx(), low = ctx();
NV.drawSectorBackdrop(high, 900, 520, 120, 6, { detail: 'high' });
NV.drawSectorBackdrop(low, 900, 520, 120, 6, { detail: 'performance' });
assert.equal(low.images[1].alpha, .35, 'reduced atenúa sólo polvo secundario');
assert.equal(high.images[0].surface, low.images[0].surface, 'tier no cambia hitos ni reconstruye textura');
const minimal = ctx();
NV.drawSectorBackdrop(minimal, 900, 520, 120, 6, { tier: 'minimal' });
assert.equal(minimal.images.length, 1); assert.equal(minimal.images[0].surface, high.images[0].surface);
assert.equal(NV.drawSectorBackdrop(ctx(), 0, 520, 0, 1), null);
assert.equal(NV.drawSectorBackdrop(ctx(), Infinity, 520, 0, 1), null);

// La petición actual reemplaza el antiguo Umbral vacío por hitos cósmicos;
// no reintroducir la antigua baliza ni impedir toda geometría ambiental.
const thresholdWide = ctx();
NV.drawSectorBackdrop(thresholdWide, 1914, 935, 180, 3, { detail: 'high' });
assert(surfaces[surfaces.length - 2].context.arcs > 0, 'Umbral necesita luna/hitos locales');
assert.deepStrictEqual(thresholdWide.images[0].args, [0, 0, 1914, 935], 'textura debe estar fija en mundo');
const built = NV.getSectorBackdropStats().builds;
const metrics = NV.worldMetrics = Object.freeze({ viewX: 430, viewY: 170, arenaW: 1914, arenaH: 935 });
for (let frame = 0; frame < 240; frame++) NV.drawSectorBackdrop(ctx(), 1914, 935, frame, 5, { tier: 'full' });
assert.equal(NV.getSectorBackdropStats().builds, built, 'tiempo o movimiento reconstruye cache');
assert.equal(NV.worldMetrics, metrics); assert.equal(randomCalls, 0);
assert.equal(NV.getSectorBackdropStats().surfaces, 2);
assert(NV.getSectorBackdropStats().textureWidth <= 1536);
assert(NV.getSectorBackdropStats().estimatedBytes <= 1536 * 1024 * 8, 'cache sin tope');
NV.drawSectorBackdrop(ctx(), 1914, 935, 0, 6, { tier: 'full' });
assert.equal(NV.getSectorBackdropStats().builds, built + 1, 'transición no invalida arte');
NV.drawSectorBackdrop(ctx(), 1350, 780, 0, 6, { tier: 'full' });
assert.equal(NV.getSectorBackdropStats().builds, built + 2, 'resize no invalida arte');
assert.equal(NV.getSectorBackdropStats().surfaces, 2, 'acumula sectores históricos');
assert.equal(NV.getSectorBackdropStats().textureWidth, 1350);
assert.equal(ctx().globalAlpha, 1);
const inherited = ctx(); inherited.globalAlpha = .6;
NV.drawSectorBackdrop(inherited, 1350, 780, 0, 6, { tier: 'reduced' });
assert.equal(inherited.globalAlpha, .6, 'fondo contamina alpha de gameplay');
assert(!source.includes('gridRgb') && !source.includes('strokeRect'), 'grilla o paneles regulares reaparecieron');
const fallback = {};
vm.runInNewContext(source, { window: { NV: fallback }, Math: math, console });
assert(fallback.drawSectorBackdrop(ctx(), 900, 520, 0, 1), 'fallback sin OffscreenCanvas/document roto');

const html = fs.readFileSync('index.html', 'utf8');
assert(html.indexOf('js/render/sectors.js') > html.indexOf('js/render/canvas.js'));
assert(html.indexOf('js/render/sectors.js') < html.indexOf('js/game.js'));
console.log('RESULT sector_visuals: cuatro composiciones, cache, tiers, mundo, RNG y wiring OK');
