// Presentación del perímetro: ninguna dimensión/colisión de gameplay se amplía.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
let pass = 0;
function test(name, fn) { fn(); pass++; console.log('  ok  ' + name); }
function setup(mobile = false, paths = true) {
  const box = { left: 10, top: 20, width: mobile ? 915 : 900, height: mobile ? 412 : 520 };
  class Path {
    constructor() { this.points = []; }
    moveTo(x, y) { this.points.push([x, y]); } lineTo(x, y) { this.points.push([x, y]); } closePath() {}
  }
  const s = { NV: { capabilities: { isMobile: mobile, orientation: 'landscape' } }, console, Math, Number, Promise, Path2D: Path,
    location: { search: '' }, addEventListener() {},
    document: { documentElement: { classList: { add() {}, remove() {} } }, addEventListener() {},
      getElementById() { return { getBoundingClientRect: () => box }; } } };
  s.window = s; vm.createContext(s);
  if (!paths) delete s.Path2D;
  for (const file of ['js/core/viewport.js', 'js/render/sectors.js']) vm.runInContext(fs.readFileSync(file, 'utf8'), s);
  return { nv: s.NV, box, s };
}
function context() {
  const rects = [], paths = [], stack = [];
  return { globalAlpha: 1, rects, paths,
    save() { stack.push(this.globalAlpha); }, restore() { this.globalAlpha = stack.pop(); },
    fillRect(...p) { rects.push(p); }, fill(path, rule) { paths.push({ path, rule }); },
    stroke(path) { paths.push({ path, stroke: true }); },
    beginPath() { this.current = []; }, moveTo(x,y) { this.current.push([x,y]); },
    lineTo(x,y) { this.current.push([x,y]); }, closePath() {} };
}
function near(a, b) { assert(Math.abs(a - b) < 1e-6, `${a} != ${b}`); }
for (const mobile of [false, true]) test('centro, cuatro lados y cuatro esquinas / ' + (mobile ? 'móvil' : 'desktop'), () => {
  const { nv } = setup(mobile), m = nv.worldMetrics, v = nv.viewport, W = m.arenaW, H = m.arenaH, P = v.cameraExteriorPadding;
  assert.equal(P, 28); assert.strictEqual(m, v.worldMetrics);
  for (const x of [20, W / 2, W - 20]) for (const y of [30, H / 2, H - 20]) {
    nv.viewport.followPlayer(x, y);
    near(m.viewX, Math.max(-P, Math.min(W - m.viewW + P, x - m.viewW / 2)));
    near(m.viewY, Math.max(-P, Math.min(H - m.viewH + P, y - m.viewH / 2)));
    near(m.arenaW, W); near(m.arenaH, H);
    const screen = nv.gameToScreen(x, y), world = nv.screenToGame(screen.x, screen.y);
    near(world.x, x); near(world.y, y);
    if (x === 20) near(nv.screenToGame(10, 20).x, -P);
    if (y === 30) near(nv.screenToGame(10, 20).y, -P);
  }
  nv.viewport.followPlayer(W / 2, H / 2);
  assert(m.viewX > 0 && m.viewY > 0 && m.viewX + m.viewW < W && m.viewY + m.viewH < H);
});
test('clamp de zoom comparte el padding y no modifica arena', () => {
  const { nv } = setup(), v = nv.viewport;
  for (const visible of [900, 900 / 1.3, 900 / 1.08]) {
    near(v.clampCameraOrigin(-1000, 1350, visible), -28);
    near(v.clampCameraOrigin(10000, 1350, visible), 1350 - visible + 28);
  }
  const source = fs.readFileSync('js/game.js', 'utf8');
  const cinematic = source.slice(source.indexOf('function cinematicView'), source.indexOf('function playerPresentationStyle'));
  assert(cinematic.includes('NV.viewport.clampCameraOrigin'));
  assert(source.includes('Math.min(arenaW() - 20, player.x)'));
  assert(source.includes('Math.min(arenaH() - 20, player.y)'));
});
test('resize/fullscreen conserva cámara negativa, único mundo y límites físicos', () => {
  const { nv, box, s } = setup(true), m = nv.worldMetrics;
  nv.viewport.followPlayer(20, 30); box.width = 844; box.height = 390;
  s.document.fullscreenElement = {}; nv.viewport.refresh();
  near(m.viewX, -28); near(m.viewY, -28); assert(nv.viewport.isFullscreen);
  near(m.arenaW, m.viewW * 1.5); near(m.arenaH, 780);
  assert.strictEqual(m, nv.viewport.worldMetrics);
});
test('perímetro en mundo: hueco exacto y ningún rectángulo de exterior dentro de arena', () => {
  const { nv } = setup(), c = context(), before = JSON.stringify(nv.worldMetrics);
  nv.drawSectorPerimeter(c, 1350, 780, 1, { tier: 'minimal' });
  assert.equal(JSON.stringify(nv.worldMetrics), before);
  assert.equal(c.rects.length, 4);
  for (const [x, y, w, h] of c.rects) assert(x + w <= 0 || y + h <= 0 || x >= 1350 || y >= 780);
  assert.equal(c.paths[0].rule, 'evenodd');
  const seam = c.paths[1].path.points;
  assert.deepEqual(seam, [[0, 0], [1350, 0], [1350, 780], [0, 780]]);
  for (const [x, y] of c.paths[0].path.points) assert(x <= 0 || x >= 1350 || y <= 0 || y >= 780);
  assert.equal(c.globalAlpha, 1);
});
test('cache de geometría estable por cámara/tiempo/calidad y compartido entre stages', () => {
  const { nv } = setup(), c = context();
  nv.drawSectorPerimeter(c, 1350, 780, 1, { tier: 'full' });
  const builds = nv.getSectorBackdropStats().perimeterBuilds, shape = JSON.stringify(c.paths[0].path.points);
  const colors = [];
  for (const wave of [1, 6, 11, 16]) {
    const scene = context(); nv.drawSectorPerimeter(scene, 1350, 780, wave, { tier: 'minimal' });
    assert.equal(JSON.stringify(scene.paths[0].path.points), shape); colors.push(scene.fillStyle);
    const current = nv.getSectorBackdropStats().perimeterBuilds;
    for (let frame = 0; frame < 80; frame++) {
      nv.viewport.followPlayer(frame * 5, frame * 3);
      nv.drawSectorPerimeter(context(), 1350, 780, wave, { tier: frame % 2 ? 'minimal' : 'reduced' });
    }
    assert.equal(nv.getSectorBackdropStats().perimeterBuilds, current);
  }
  assert.equal(new Set(colors).size, 4);
  assert.equal(nv.getSectorBackdropStats().perimeterBuilds, builds + 3);
  assert(nv.getSectorBackdropStats().perimeterVertices < 200);
});
test('modos bajos preservan geometría esencial, eliminan filamentos y polvo exterior', () => {
  const { nv } = setup(), high = context(), low = context();
  nv.drawSectorPerimeter(high, 1350, 780, 6, { tier: 'full' });
  nv.drawSectorPerimeter(low, 1350, 780, 6, { tier: 'minimal' });
  assert.equal(high.paths[0].path, low.paths[0].path);
  assert.equal(high.paths[1].path, low.paths[1].path);
  assert(high.rects.length > low.rects.length);
});
test('filamentos abiertos fuera del terreno, dentro del margen y estables entre frames', () => {
  const {nv}=setup(), c=context();nv.drawSectorPerimeter(c,1350,780,1,{tier:'full'});
  assert(c.paths.length>2,'debe haber filamentos además de junta y labio');
  for(const filament of c.paths.slice(2)) {
    assert.equal(filament.path.points.length,11);
    for(const [x,y] of filament.path.points) {
      assert(x<0||x>1350||y<0||y>780,'filamento invade arena');
      assert(x>=-28&&x<=1378&&y>=-28&&y<=808,'filamento excede exterior');
    }
  }
  const next=context();nv.drawSectorPerimeter(next,1350,780,1,{tier:'reduced'});
  assert.deepEqual(c.paths,next.paths);
});
test('fallback Canvas2D sin Path2D sigue cerrando el exterior y restaura alpha', () => {
  const {nv}=setup(false,false), c=context();
  const before=JSON.stringify(nv.worldMetrics);
  nv.drawSectorPerimeter(c,1350,780,6,{tier:'full'});
  assert.equal(c.paths[0].path,'evenodd');assert.equal(c.globalAlpha,1);
  assert.equal(JSON.stringify(nv.worldMetrics),before);assert(c.current.length>0);
});
console.log('RESULT camera_perimeter: pass=' + pass + ' fail=0');
