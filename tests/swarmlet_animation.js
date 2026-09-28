// ===== TEST: contrato definitivo de animación base del Swarmlet =====
const fs = require('fs');
const vm = require('vm');

let pass = 0;
let fail = 0;
function t(name, fn) {
  try {
    fn();
    pass++;
    console.log('  ok  ' + name);
  } catch (error) {
    fail++;
    console.log('  FAIL ' + name + ' -> ' + error.message);
  }
}

const NV = {};
const SRC = fs.readFileSync('js/render/enemies.js', 'utf8');
const GAME_SRC = fs.readFileSync('js/game.js', 'utf8');
vm.runInNewContext(SRC, { window: { NV }, console, Math, Set, WeakMap }, { filename: 'enemies.js' });

const TAU = Math.PI * 2;
const DRAWER_SRC = SRC.slice(SRC.indexOf('function drawSwarmlet'), SRC.indexOf('function drawSpitter'));
const COMMON_BODY_SRC = SRC.slice(SRC.indexOf('function drawCommonEnemyBody'), SRC.indexOf('// Ojos que miran al jugador'));

function near(a, b, eps) {
  return Math.abs(a - b) <= (eps == null ? 1e-9 : eps);
}

function enemy(overrides) {
  return Object.assign({
    x: 100, y: 80, radius: 7, color: '#22d3ee', shape: 'atom',
    enemyTypeId: 'swarmlet', behavior: 'swarm', speed: 115,
    angle: 0.25, vx: 0, vy: 0,
  }, overrides || {});
}

function mkCtx() {
  const calls = { scales: [], rotations: [], translations: [], quads: [], ellipses: [], paths: 0, transforms: 0 };
  const stack = [];
  let matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  function mul(n) {
    matrix = {
      a: matrix.a * n.a + matrix.c * n.b, b: matrix.b * n.a + matrix.d * n.b,
      c: matrix.a * n.c + matrix.c * n.d, d: matrix.b * n.c + matrix.d * n.d,
      e: matrix.a * n.e + matrix.c * n.f + matrix.e, f: matrix.b * n.e + matrix.d * n.f + matrix.f,
    };
  }
  return {
    calls,
    save() { stack.push({ ...matrix }); },
    restore() { if (stack.length) matrix = stack.pop(); },
    getTransform() { calls.transforms++; return { ...matrix }; },
    translate(x, y) { calls.translations.push({ x, y }); mul({ a: 1, b: 0, c: 0, d: 1, e: x, f: y }); },
    scale(x, y) { calls.scales.push([x, y]); mul({ a: x, b: 0, c: 0, d: y, e: 0, f: 0 }); },
    rotate(angle) { calls.rotations.push(angle); const c = Math.cos(angle), s = Math.sin(angle); mul({ a: c, b: s, c: -s, d: c, e: 0, f: 0 }); },
    beginPath() { calls.paths++; }, closePath() {}, moveTo() {}, lineTo() {},
    quadraticCurveTo(x, y) { calls.quads.push({ x, y }); },
    fill() {}, stroke() {}, arc() {},
    ellipse(x, y, rx, ry) { calls.ellipses.push({ x, y, rx, ry }); },
    fillText() {}, setLineDash() {},
    set fillStyle(value) {}, get fillStyle() { return ''; },
    set strokeStyle(value) {}, get strokeStyle() { return ''; },
    set lineWidth(value) {}, set lineCap(value) {}, set lineJoin(value) {},
    set font(value) {}, set textAlign(value) {}, set textBaseline(value) {},
    set shadowColor(value) {}, get shadowColor() { return ''; },
    set shadowBlur(value) {}, get shadowBlur() { return 0; },
    set globalAlpha(value) {}, get globalAlpha() { return 1; },
  };
}

function render(e, visualTimeSeconds, player, frame) {
  const ctx = mkCtx();
  NV.drawEnemy(ctx, e, frame == null ? 0 : frame, player || { x: 220, y: 80 }, null, visualTimeSeconds);
  return ctx.calls;
}

function localState(calls) {
  return {
    center: calls.translations[0],
    positions: calls.translations.slice(1, 4),
    rotations: calls.rotations.slice(0, 3),
    tails: calls.quads.filter((q) => q.x === -13).map((q) => q.y),
  };
}

function assertSameLocal(a, b, label) {
  for (let i = 0; i < 3; i++) {
    if (!near(a.positions[i].x, b.positions[i].x) || !near(a.positions[i].y, b.positions[i].y)) throw new Error(label + ' posición local distinta en ' + i);
    if (!near(a.rotations[i], b.rotations[i])) throw new Error(label + ' rotación distinta en ' + i);
    if (!near(a.tails[i], b.tails[i])) throw new Error(label + ' cola distinta en ' + i);
  }
}

function phaseFromRotation(rotation, i) {
  return (rotation - i * 0.7) / 0.25;
}

console.log('swarmlet_animation:');

t('1. usa exactamente 3 micro-criaturas', () => {
  const state = localState(render(enemy(), 1.5));
  if (state.positions.length !== 3 || state.rotations.length !== 3 || state.tails.length !== 3) throw new Error(JSON.stringify(state));
});

t('2-7. preserva fase, separación, órbita, rotación, cola y rate aprobados', () => {
  const e = enemy();
  const visualTime = 1.75;
  const state = localState(render(e, visualTime));
  const phase0 = phaseFromRotation(state.rotations[0], 0);
  for (let i = 0; i < 3; i++) {
    const phase = phase0 + i * TAU / 3;
    if (!near(phaseFromRotation(state.rotations[i], i), phase)) throw new Error('fase/spacing[' + i + ']');
    if (!near(state.positions[i].x, Math.cos(phase) * 14)) throw new Error('X[' + i + ']');
    if (!near(state.positions[i].y, Math.sin(phase * 1.1) * 9)) throw new Error('Y[' + i + ']');
    if (!near(state.rotations[i], phase * 0.25 + i * 0.7)) throw new Error('rotación[' + i + ']');
    if (!near(state.tails[i], 5 * Math.sin(visualTime * 4 + i))) throw new Error('cola[' + i + ']');
  }
  const later = localState(render(e, visualTime + 1));
  for (let i = 0; i < 3; i++) {
    const delta = phaseFromRotation(later.rotations[i], i) - phaseFromRotation(state.rotations[i], i);
    if (!near(delta, 1.35)) throw new Error('rate[' + i + ']=' + delta);
  }
});

t('8-9. cuerpo no usa target atan2 ni velocidad/facing', () => {
  for (const banned of ['atan2', 'velocity', '.vx', '.vy', 'facing', 'smoothFacing', 'smoothScalar']) {
    if (DRAWER_SRC.includes(banned)) throw new Error('entrada prohibida: ' + banned);
  }
  const e = enemy();
  assertSameLocal(localState(render(e, 2, { x: 400, y: 80 })), localState(render(e, 2, { x: 100, y: 400 })), 'target');
});

t('10-11. posición/movimiento no cambian fase ni semilla estable', () => {
  const e = enemy({ x: -500, y: 40, speed: 20, angle: -2.4, vx: -900, vy: 13 });
  const before = localState(render(e, 3.25, { x: 50, y: 50 }, 7));
  e.x = 4200; e.y = -3100; e.speed = 999; e.angle = 2.8; e.vx = 450; e.vy = -760;
  const after = localState(render(e, 3.25, { x: -900, y: 1200 }, 90000));
  assertSameLocal(before, after, 'movimiento');
  if (near(before.center.x, after.center.x) || near(before.center.y, after.center.y)) throw new Error('el centro mundial no cambió');
  if (!COMMON_BODY_SRC.includes('stableSwarmletSeed(e)')) throw new Error('semilla estable no usada');
  if (/isSwarmlet\s*\?\s*hash01/.test(COMMON_BODY_SRC)) throw new Error('Swarmlet todavía usa hash01');
});

t('12. solo los ojos siguen al target y el tracking es transform-safe', () => {
  const e = enemy();
  const right = render(e, 1.2, { x: 300, y: 80 });
  const down = render(e, 1.2, { x: 100, y: 300 });
  const sclera = (calls) => calls.ellipses.filter((el) => near(el.rx, 2.5));
  const pupils = (calls) => calls.ellipses.filter((el) => near(el.rx, 1.05));
  const sRight = sclera(right), sDown = sclera(down), pRight = pupils(right), pDown = pupils(down);
  if (sRight.length !== 3 || sDown.length !== 3 || pRight.length !== 3 || pDown.length !== 3) throw new Error('ojos incompletos');
  let movedPupils = 0;
  for (let i = 0; i < 3; i++) {
    if (!near(sRight[i].x, sDown[i].x) || !near(sRight[i].y, sDown[i].y)) throw new Error('esclerótica movida');
    if (!near(pRight[i].x, pDown[i].x) || !near(pRight[i].y, pDown[i].y)) movedPupils++;
  }
  if (movedPupils !== 3) throw new Error('pupilas que trackean=' + movedPupils);
  if (right.transforms < 1 || down.transforms < 1) throw new Error('tracking sin transformación local');
});

t('13. renderer no muta estado de gameplay/entidad', () => {
  const e = enemy({ knockVelX: 4, knockVelY: -2 });
  const snapshot = JSON.stringify(e);
  render(e, 0.5);
  render(e, 1.5, { x: -10, y: 900 }, 123456);
  if (JSON.stringify(e) !== snapshot) throw new Error('entidad mutada');
  if (DRAWER_SRC.includes('Math.random')) throw new Error('RNG en drawer');
});

t('14. usa tiempo visual en segundos, no frame ni /60', () => {
  const e = enemy();
  assertSameLocal(localState(render(e, 2.4, null, 1)), localState(render(e, 2.4, null, 999999)), 'frame');
  if (!COMMON_BODY_SRC.includes('const animationTime = isSwarmlet ? visualTimeSeconds')) throw new Error('tiempo visual no seleccionado');
  if (DRAWER_SRC.includes('frame')) throw new Error('drawer usa frame');
  if (!GAME_SRC.includes('visualTimeSeconds += dt')) throw new Error('reloj no acumula dt');
  if (!GAME_SRC.includes('NV.drawEnemy(ctx, e, frame, player, frameVisualRhythm, visualTimeSeconds)')) throw new Error('tiempo no llega al renderer');
});

t('15. igual elapsed time produce igual fase a 60/120/165 Hz', () => {
  function elapsed(callbacks) {
    let seconds = 0;
    const dt = 1 / callbacks;
    for (let i = 0; i < callbacks; i++) seconds += dt;
    return seconds;
  }
  const e = enemy();
  const states = [60, 120, 165].map((hz) => localState(render(e, elapsed(hz), null, hz)));
  assertSameLocal(states[0], states[1], '60/120 Hz');
  assertSameLocal(states[0], states[2], '60/165 Hz');
});

t('16. conserva implementación allocation-free y sin rotación padre', () => {
  for (const banned of ['const ps', 'const parts', '.push(', '.forEach(']) {
    if (DRAWER_SRC.includes(banned)) throw new Error('asignación prohibida: ' + banned);
  }
  if (!DRAWER_SRC.includes('for (let i = 0; i < 3; i++)')) throw new Error('loop de tres ausente');
  if (render(enemy(), 1).rotations.length !== 3) throw new Error('rotación padre/extra detectada');
});

t('17. los demás enemigos comunes conservan sus fórmulas/routing', () => {
  const body = SRC.slice(SRC.indexOf('function drawDrone'), SRC.indexOf('const COMMON_DRAWERS'));
  const markers = {
    drone: 'DRONE_ROTORS.forEach',
    runner: "smoothFacing(e, 'runner', runnerFacing(e, facingX, facingY), 0.34)",
    tank: 'Math.sin(t * 0.8 + seed)',
    shielder: "smoothFacing(e, 'shielder'",
    spitter: 'windup * 0.7',
    wisp: 'Math.sin(t * 2.4 + seed)',
    kamikaze: 'ctx.rotate(a * 0.1)',
  };
  for (const id of Object.keys(markers)) if (!body.includes(markers[id])) throw new Error(id + ' alterado');
  if (!SRC.includes('swarmlet: drawSwarmlet')) throw new Error('routing Swarmlet alterado');
});

console.log('RESULT swarmlet_animation: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);