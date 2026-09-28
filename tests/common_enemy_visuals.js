// ===== TEST: rediseño visual de los ocho enemigos comunes =====
const fs = require('fs'), vm = require('vm');
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('  ok  ' + name); } catch (e) { fail++; console.log('  FAIL ' + name + ' -> ' + e.message); } }

const NV = {};
vm.runInNewContext(fs.readFileSync('js/render/enemies.js', 'utf8'), { window: { NV }, console, Math, Set }, { filename: 'enemies.js' });

function mkCtx() {
  const calls = { arcs: [], ellipses: [], scales: [], strokes: [], shadows: [] }, stack = [];
  let m = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  function mul(n) { m = { a:m.a*n.a+m.c*n.b,b:m.b*n.a+m.d*n.b,c:m.a*n.c+m.c*n.d,d:m.b*n.c+m.d*n.d,e:m.a*n.e+m.c*n.f+m.e,f:m.b*n.e+m.d*n.f+m.f }; }
  const ctx = {
    calls, save(){ stack.push({...m}); }, restore(){ m=stack.pop(); }, getTransform(){ return {...m}; },
    translate(x,y){ mul({a:1,b:0,c:0,d:1,e:x,f:y}); }, scale(x,y){ calls.scales.push([x,y]); mul({a:x,b:0,c:0,d:y,e:0,f:0}); },
    rotate(a){ const c=Math.cos(a),s=Math.sin(a); mul({a:c,b:s,c:-s,d:c,e:0,f:0}); },
    beginPath(){}, closePath(){}, moveTo(){}, lineTo(){}, quadraticCurveTo(){}, fill(){}, stroke(){ calls.strokes.push(this.strokeStyle); },
    arc(x,y,r){ calls.arcs.push({x,y,r}); }, ellipse(x,y,rx,ry){ calls.ellipses.push({x,y,rx,ry}); }, fillText(){}, setLineDash(){},
    set fillStyle(v){ this._fillStyle=v; }, get fillStyle(){ return this._fillStyle; }, set strokeStyle(v){ this._strokeStyle=v; }, get strokeStyle(){ return this._strokeStyle; },
    set lineWidth(v){}, set lineCap(v){}, set lineJoin(v){}, set font(v){}, set textAlign(v){}, set textBaseline(v){},
    set shadowColor(v){ this._shadowColor=v; }, get shadowColor(){ return this._shadowColor; }, set shadowBlur(v){ calls.shadows.push(v); },
    set globalAlpha(v){ this._globalAlpha=v; }, get globalAlpha(){ return this._globalAlpha == null ? 1 : this._globalAlpha; },
  };
  return ctx;
}

const ids = ['drone', 'runner', 'tank', 'shielder', 'swarmlet', 'spitter', 'wisp', 'kamikaze'];
function enemy(id) {
  return { x: 100, y: 80, radius: 12, color: '#abcdef', shape: 'circle', enemyTypeId: id, shield: true, armed: id === 'kamikaze', fuse: 0.4, intent: id === 'spitter' ? { state: 'windup', stateTimer: 0.3 } : null, spitAimX: 200, spitAimY: 80 };
}

console.log('common_enemy_visuals:');
t('helper especializado acepta exactamente los ocho IDs aprobados', () => {
  for (const id of ids) if (!NV.hasCommonEnemyVisual(id)) throw new Error('falta ' + id);
  for (const id of ['specter_grunt', 'elite_brute', '', null]) if (NV.hasCommonEnemyVisual(id)) throw new Error('ID extra ' + id);
});

t('los ocho drawers renderizan sin mutar datos de gameplay', () => {
  for (const id of ids) {
    const e = enemy(id), before = JSON.stringify(e), ctx = mkCtx();
    NV.drawEnemy(ctx, e, 90, { x: 220, y: 80 }, null);
    if (JSON.stringify(e) !== before) throw new Error(id + ' mutó datos');
    if (!ctx.calls.scales.length) throw new Error(id + ' no usó escala visual local');
    if (!ctx.calls.arcs.length && !ctx.calls.ellipses.length) throw new Error(id + ' no dibujó geometría');
  }
});

t('los cuerpos especializados suprimen el par de ojos genérico', () => {
  const original = NV.drawEnemyEyes; let genericCalls = 0;
  NV.drawEnemyEyes = function () { genericCalls++; };
  for (const id of ids) NV.drawEnemy(mkCtx(), enemy(id), 30, { x: 220, y: 80 }, null);
  NV.drawEnemyEyes = original;
  if (genericCalls !== 0) throw new Error('ojos genéricos=' + genericCalls);
});

t('shielder, spitter y kamikaze leen su estado real sólo para feedback visual', () => {
  const shieldOn = mkCountCtx(), shieldOff = mkCountCtx();
  const on = enemy('shielder'), off = enemy('shielder'); on.shieldCd = 0; off.shieldCd = 0.9;
  NV.drawEnemy(shieldOn, on, 60, { x: 220, y: 80 }); NV.drawEnemy(shieldOff, off, 60, { x: 220, y: 80 });
  if (!(Math.max(...shieldOn.calls.strokeWidths) > Math.max(...shieldOff.calls.strokeWidths))) throw new Error('escudo activo no refuerza hojas');
  const sp = enemy('spitter'), spBefore = JSON.stringify(sp); NV.drawEnemy(mkCtx(), sp, 60, { x: 220, y: 80 });
  if (JSON.stringify(sp) !== spBefore) throw new Error('spitter mutado');
  const kami = enemy('kamikaze'), kamiBefore = JSON.stringify(kami); NV.drawEnemy(mkCtx(), kami, 60, { x: 220, y: 80 });
  if (JSON.stringify(kami) !== kamiBefore) throw new Error('kamikaze mutado');
});

// ===== FASE 1: diagnóstico A/B temporal (solo render) =====
function mkCountCtx() {
  const calls = { paths: 0, strokes: 0, fills: 0, arcs: 0, ellipses: 0, scales: 0, saves: 0, restores: 0, transforms: 0, shadows: [], drawBlurs: [], strokeWidths: [], rotations: [], translations: [], moves: [], lines: [], maxDepth: 0 }, stack = [];
  let m = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, shadowBlur = 37, lineWidth = 1;
  function mul(n) { m = { a: m.a*n.a + m.c*n.b, b: m.b*n.a + m.d*n.b, c: m.a*n.c + m.c*n.d, d: m.b*n.c + m.d*n.d, e: m.a*n.e + m.c*n.f + m.e, f: m.b*n.e + m.d*n.f + m.f }; }
  function point(x, y) { return { x, y, tx: m.a*x + m.c*y + m.e, ty: m.b*x + m.d*y + m.f, depth: stack.length }; }
  return {
    calls,
    save() { calls.saves++; stack.push({ m: { ...m }, shadowBlur, lineWidth }); calls.maxDepth = Math.max(calls.maxDepth, stack.length); },
    restore() { calls.restores++; if (stack.length) { const saved = stack.pop(); m = saved.m; shadowBlur = saved.shadowBlur; lineWidth = saved.lineWidth; } },
    getTransform() { calls.transforms++; return { ...m }; },
    translate(x, y) { calls.translations.push(point(x, y)); mul({ a: 1, b: 0, c: 0, d: 1, e: x, f: y }); },
    scale(x, y) { calls.scales++; mul({ a: x, b: 0, c: 0, d: y, e: 0, f: 0 }); },
    rotate(a) { calls.rotations.push({ angle: a, depth: stack.length, m: { ...m } }); const c = Math.cos(a), s = Math.sin(a); mul({ a: c, b: s, c: -s, d: c, e: 0, f: 0 }); },
    beginPath() { calls.paths++; },
    closePath() {}, moveTo(x, y) { calls.moves.push(point(x, y)); }, lineTo(x, y) { calls.lines.push(point(x, y)); }, quadraticCurveTo() {},
    fill() { calls.fills++; calls.drawBlurs.push(shadowBlur); },
    stroke() { calls.strokes++; calls.drawBlurs.push(shadowBlur); calls.strokeWidths.push(lineWidth); },
    arc() { calls.arcs++; },
    ellipse() { calls.ellipses++; },
    fillText() {}, setLineDash() {},
    set fillStyle(v) {}, get fillStyle() { return ''; },
    set strokeStyle(v) {}, get strokeStyle() { return ''; },
    set lineWidth(v) { lineWidth = v; }, get lineWidth() { return lineWidth; }, set lineCap(v) {}, set lineJoin(v) {}, set font(v) {}, set textAlign(v) {}, set textBaseline(v) {},
    set shadowColor(v) {}, get shadowColor() { return ''; },
    set shadowBlur(v) { shadowBlur = v; calls.shadows.push(v); }, get shadowBlur() { return shadowBlur; },
    set globalAlpha(v) {}, get globalAlpha() { return 1; },
  };
}
function diagEnemy(id, extra) {
  const e = enemy(id);
  if (extra) Object.assign(e, extra);
  return e;
}
function renderStats(id, extra) {
  const ctx = mkCountCtx();
  NV.drawEnemy(ctx, diagEnemy(id, extra), 90, { x: 220, y: 80 }, null);
  return ctx.calls;
}
function nonZeroShadows(calls) { return calls.shadows.filter((v) => v > 0).length; }
function near(a, b, eps) { return Math.abs(a - b) <= (eps == null ? 1e-6 : eps); }
function renderFacing(id, extra, player) {
  const ctx = mkCountCtx();
  NV.drawEnemy(ctx, diagEnemy(id, extra), 90, player || { x: 220, y: 80 }, null);
  return ctx.calls;
}

t('orientación Runner: commit cardinal respeta +X/+Y/izquierda/abajo', () => {
  const cases = [[1, 0, 0], [0, 1, Math.PI / 2], [-1, 0, Math.PI], [0, -1, -Math.PI / 2]];
  for (const c of cases) {
    const calls = renderFacing('runner', { intent: { state: 'attack', stateTimer: 0.3 }, commitDirX: c[0], commitDirY: c[1] });
    const angle = calls.rotations[0] && calls.rotations[0].angle;
    if (!near(Math.atan2(Math.sin(angle - c[2]), Math.cos(angle - c[2])), 0, 1e-6)) throw new Error('vector ' + c[0] + ',' + c[1] + ' -> ' + angle);
  }
});

t('orientación Runner: positioning reconstruye flank target y recovery mira en retirada', () => {
  const positioning = renderFacing('runner', { intent: { state: 'positioning', stateTimer: 0.5 }, flankSide: 1 }, { x: 220, y: 80 });
  if (!near(positioning.rotations[0].angle, Math.PI / 4, 1e-6)) throw new Error('flank=' + positioning.rotations[0].angle);
  const recovery = renderFacing('runner', { intent: { state: 'recovery', stateTimer: 0.5 } }, { x: 220, y: 80 });
  if (!near(Math.abs(recovery.rotations[0].angle), Math.PI, 1e-6)) throw new Error('recovery=' + recovery.rotations[0].angle);
});

t('orientación Tank: chassis queda horizontal y torreta/cannon sigue al jugador', () => {
  const right = renderFacing('tank', null, { x: 220, y: 80 });
  const down = renderFacing('tank', null, { x: 100, y: 200 });
  const chassisR = right.moves.find((p) => p.x === -38 && p.y === 6), chassisD = down.moves.find((p) => p.x === -38 && p.y === 6);
  if (!chassisR || !chassisD || !near(chassisR.tx, chassisD.tx) || !near(chassisR.ty, chassisD.ty)) throw new Error('chassis rotó');
  if (!near(right.rotations[0].angle, 0) || !near(down.rotations[0].angle, Math.PI / 2)) throw new Error('torreta=' + JSON.stringify([right.rotations[0].angle, down.rotations[0].angle]));
  const cannonR = right.lines.find((p) => p.x === 40 && p.y === -1.2), cannonD = down.lines.find((p) => p.x === 40 && p.y === -1.2);
  if (!cannonR || !cannonD || (near(cannonR.tx, cannonD.tx) && near(cannonR.ty, cannonD.ty))) throw new Error('cannon no cambió');
  if (right.transforms !== 0 || down.transforms !== 0) throw new Error('Tank reintrodujo getTransform');
});

t('orientación Shielder: el frente defensivo +X sigue al jugador', () => {
  const right = renderFacing('shielder', null, { x: 220, y: 80 });
  const down = renderFacing('shielder', null, { x: 100, y: 200 });
  if (!near(right.rotations[0].angle, 0) || !near(down.rotations[0].angle, Math.PI / 2)) throw new Error('frente=' + JSON.stringify([right.rotations[0].angle, down.rotations[0].angle]));
});

t('Shielder: shieldCd<=0 cierra hojas y shieldCd>0 las abre en espacio orientado', () => {
  const closed = renderFacing('shielder', { shield: true, shieldCd: 0 }, { x: 220, y: 80 });
  const open = renderFacing('shielder', { shield: true, shieldCd: 0.9 }, { x: 220, y: 80 });
  if (closed.rotations.length < 3 || open.rotations.length < 3) throw new Error('faltan rotaciones de hojas');
  if (!near(closed.rotations[1].angle, 0) || !near(closed.rotations[2].angle, 0)) throw new Error('hojas activas no cerradas');
  if (!near(open.rotations[1].angle, -0.32) || !near(open.rotations[2].angle, 0.32)) throw new Error('hojas vulnerables no abiertas');
});

t('Shielder: transición de hojas es render-only e interpolada', () => {
  const e = diagEnemy('shielder', { shield: true, shieldCd: 0 });
  const before = JSON.stringify(e), closedCtx = mkCountCtx();
  NV.drawEnemy(closedCtx, e, 90, { x: 220, y: 80 }, null);
  if (JSON.stringify(e) !== before) throw new Error('render activo mutó gameplay');
  e.shieldCd = 0.9;
  const vulnerableBefore = JSON.stringify(e), transitionCtx = mkCountCtx();
  NV.drawEnemy(transitionCtx, e, 91, { x: 220, y: 80 }, null);
  const top = transitionCtx.calls.rotations[1].angle, bottom = transitionCtx.calls.rotations[2].angle;
  if (!(top < 0 && top > -0.32 && bottom > 0 && bottom < 0.32)) throw new Error('transición saltó=' + top + '/' + bottom);
  if (!near(top, -0.32 * 0.16) || !near(bottom, 0.32 * 0.16)) throw new Error('blend inesperado=' + top + '/' + bottom);
  if (JSON.stringify(e) !== vulnerableBefore) throw new Error('interpolación mutó gameplay');
});

t('Spitter: anatomía inferior estable ignora spitAim visual sin perder windup', () => {
  const horizontal = renderFacing('spitter', { intent: { state: 'windup', stateTimer: 0.3 }, spitAimX: 220, spitAimY: 80 }, { x: 100, y: 220 });
  const vertical = renderFacing('spitter', { intent: { state: 'windup', stateTimer: 0.3 }, spitAimX: 100, spitAimY: 200 }, { x: 220, y: 80 });
  if (horizontal.rotations.length !== 0 || vertical.rotations.length !== 0) throw new Error('articulación residual=' + horizontal.rotations.length + '/' + vertical.rotations.length);
  const lowerH = horizontal.moves.find((p) => p.x === -8 && p.y === 10), lowerV = vertical.moves.find((p) => p.x === -8 && p.y === 10);
  if (!lowerH || !lowerV || !near(lowerH.tx, lowerV.tx) || !near(lowerH.ty, lowerV.ty)) throw new Error('anatomía inferior depende del aim');
  const src = fs.readFileSync('js/render/enemies.js', 'utf8');
  const drawer = src.slice(src.indexOf('function drawSpitter'), src.indexOf('function drawWisp'));
  if (/spitAimX|spitAimY|ctx\.rotate\(/.test(drawer)) throw new Error('orientación Phase 3 residual en Spitter');
  if (!drawer.includes("state === 'windup'") || !drawer.includes('windup * 0.7')) throw new Error('feedback de windup perdido');
});

t('Swarmlet: el cuerpo NO sigue al jugador; rotación = a*0.25 + i*0.7', () => {
  const e = diagEnemy('swarmlet'), rightCtx = mkCountCtx(), downCtx = mkCountCtx();
  NV.drawEnemy(rightCtx, e, 90, { x: 220, y: 80 }, null, 1.5);
  NV.drawEnemy(downCtx, e, 90, { x: 100, y: 200 }, null, 1.5);
  const right = rightCtx.calls, down = downCtx.calls;
  if (right.rotations.length !== 3 || down.rotations.length !== 3) throw new Error('rotaciones=' + right.rotations.length + '/' + down.rotations.length);
  const centersR = right.translations.slice(1, 4), centersD = down.translations.slice(1, 4);
  for (let i = 0; i < 3; i++) if (!near(centersR[i].tx, centersD[i].tx) || !near(centersR[i].ty, centersD[i].ty)) throw new Error('formación depende del jugador en ' + i);
  for (let i = 0; i < 3; i++) if (!near(right.rotations[i].angle, down.rotations[i].angle)) throw new Error('cuerpo giró hacia el jugador en ' + i);
  const TAU = Math.PI * 2;
  for (let i = 1; i < 3; i++) {
    const expected = i * ((TAU / 3) * 0.25 + 0.7);
    if (!near(right.rotations[i].angle - right.rotations[0].angle, expected)) throw new Error('rotación[' + i + '] no cumple a*0.25 + i*0.7');
  }
});

t('Swarmlet: órbita 1.35 activa y la rotación deriva de la fase a (no congelada)', () => {
  const e = diagEnemy('swarmlet'), before = JSON.stringify(e);
  const a = mkCountCtx(), b = mkCountCtx();
  NV.drawEnemy(a, e, 0, { x: 220, y: 80 }, null, 0);
  NV.drawEnemy(b, e, 9999, { x: 220, y: 80 }, null, 1);
  const centersA = a.calls.translations.slice(1, 4), centersB = b.calls.translations.slice(1, 4);
  if (centersA.every((p, i) => near(p.tx, centersB[i].tx) && near(p.ty, centersB[i].ty))) throw new Error('órbita ausente');
  for (let i = 0; i < 3; i++) if (!near(b.calls.rotations[i].angle - a.calls.rotations[i].angle, 1.35 * 0.25)) throw new Error('Δrot[' + i + '] no equivale a Δa=1.35·0.25');
  const src = fs.readFileSync('js/render/enemies.js', 'utf8');
  const speed = Number((src.match(/const SWARMLET_ORBIT_SPEED = ([0-9.]+);/) || [])[1]);
  if (speed !== 1.35) throw new Error('velocidad orbital=' + speed);
  if (JSON.stringify(e) !== before) throw new Error('órbita mutó gameplay');
});

t('orientación Kamikaze: el cuerpo radial no recibe facing global', () => {
  const right = renderFacing('kamikaze', { armed: false }, { x: 220, y: 80 });
  const down = renderFacing('kamikaze', { armed: false }, { x: 100, y: 200 });
  if (right.rotations.length !== down.rotations.length) throw new Error('rotaciones distintas');
  for (let i = 0; i < right.rotations.length; i++) if (!near(right.rotations[i].angle, down.rotations[i].angle)) throw new Error('facing global detectado');
});

t('blur optimizado: el body neutraliza el shadowBlur heredado antes de dibujar', function () {
  NV.setCommonEnemyDiagnosticMode('full');
  for (const id of ids) {
    const calls = renderStats(id, { armed: id === 'kamikaze', fuse: 0.4 });
    if (calls.drawBlurs.some(function (v) { return v === 37; })) throw new Error(id + ': heredó blur centinela');
  }
});

t('fix #3: FULL usa faux glow explícito sin body shadowBlur', function () {
  NV.setCommonEnemyDiagnosticMode('full');
  for (const id of ids) {
    const calls = renderStats(id, { armed: false });
    if (calls.drawBlurs.some(function (v) { return v !== 0; })) throw new Error(id + ': body conservó shadowBlur=' + JSON.stringify(calls.drawBlurs));
  }
});

t('fix #3: FULL añade capas glow y NO-BLUR conserva la geometría base', function () {
  const expectedExtra = {
    drone: { strokes: 5, fills: 5 }, runner: { strokes: 3, fills: 1 },
    tank: { strokes: 8, fills: 0 }, shielder: { strokes: 3, fills: 3 },
    swarmlet: { strokes: 3, fills: 0 }, spitter: { strokes: 3, fills: 5 },
    wisp: { strokes: 1, fills: 0 }, kamikaze: { strokes: 3, fills: 1 },
  };
  for (const id of ids) {
    NV.setCommonEnemyDiagnosticMode('full');
    const full = renderStats(id, { armed: false });
    NV.setCommonEnemyDiagnosticMode('no-blur');
    const noBlur = renderStats(id, { armed: false });
    const extra = expectedExtra[id];
    if (full.strokes - noBlur.strokes !== extra.strokes) throw new Error(id + ': strokes glow=' + (full.strokes - noBlur.strokes));
    if (full.fills - noBlur.fills !== extra.fills) throw new Error(id + ': fills glow=' + (full.fills - noBlur.fills));
    if (full.scales !== noBlur.scales || full.transforms !== noBlur.transforms) throw new Error(id + ': cambió geometría/transform base');
    if (noBlur.drawBlurs.some(function (v) { return v !== 0; })) throw new Error(id + ': NO-BLUR dibujó con blur');
  }
  NV.setCommonEnemyDiagnosticMode('full');
});

t('fix #2: Tank evita target/getTransform y ojos coplanares reutilizan una sola inversión', function () {
  NV.setCommonEnemyDiagnosticMode('full');
  const expectedTransforms = { drone: 2, runner: 2, tank: 0, shielder: 2, swarmlet: 4, spitter: 2, wisp: 2, kamikaze: 2 };
  for (const id of ids) {
    const calls = renderStats(id, { armed: false });
    if (calls.transforms !== expectedTransforms[id]) throw new Error(id + ': getTransform=' + calls.transforms + ', esperado=' + expectedTransforms[id]);
    if (calls.saves !== calls.restores) throw new Error(id + ': stack desbalanceado (' + calls.saves + '/' + calls.restores + ')');
  }
});

t('fix #2: hot path no reintroduce parseo hex, objeto visual ni parts de Swarmlet', function () {
  const src = fs.readFileSync('js/render/enemies.js', 'utf8');
  for (const forbidden of ['function hexRgb', 'parseInt(String(hex', 'const visual = {', 'const parts = []', 'parts.push({']) {
    if (src.includes(forbidden)) throw new Error('trabajo temporal reintroducido: ' + forbidden);
  }
  if (!src.includes('color.rgba[alpha]')) throw new Error('falta caché RGBA estático');
  if (!src.includes("e.enemyTypeId !== 'tank'")) throw new Error('Tank no evita target especializado');
});

t('fix #3: body especializado no reintroduce shadowBlur positivo ni parseo de color', function () {
  const src = fs.readFileSync('js/render/enemies.js', 'utf8');
  const specialized = src.slice(src.indexOf('function neutralShadow'), src.indexOf('function drawCommonEnemyBody'));
  const blurWrites = specialized.match(/shadowBlur\s*=\s*[^;]+/g) || [];
  if (blurWrites.length !== 1 || !/shadowBlur\s*=\s*0$/.test(blurWrites[0])) throw new Error('shadowBlur especializado=' + JSON.stringify(blurWrites));
  if (/shadowColor\s*=/.test(specialized)) throw new Error('body especializado conserva shadowColor');
  for (const forbidden of ['parseInt(', '.replace(', 'String(']) {
    if (specialized.includes(forbidden)) throw new Error('parseo/color temporal reintroducido: ' + forbidden);
  }
  if (!specialized.includes('function fauxGlowStroke')) throw new Error('falta glow explícito de outlines');
  if (!specialized.includes('radius * 1.75 + 1.5')) throw new Error('falta halo explícito de cores/nodos');
  if (!specialized.includes('coreRadius + 4 + arm * 4')) throw new Error('falta halo reactivo del Kamikaze');
});

t('diagnóstico: default "full" y normalización/validación de modos', () => {
  NV.setCommonEnemyDiagnosticMode('full');
  if (NV.getCommonEnemyDiagnosticMode() !== 'full') throw new Error('el default no es "full"');
  if (NV.setCommonEnemyDiagnosticMode('no-blur') !== 'no-blur') throw new Error('no aceptó "no-blur"');
  if (NV.setCommonEnemyDiagnosticMode(' LEGACY ') !== 'legacy') throw new Error('no normalizó a minúsculas/trim');
  if (NV.setCommonEnemyDiagnosticMode('bogus') !== 'legacy') throw new Error('un modo inválido alteró el estado');
  if (NV.getCommonEnemyDiagnosticMode() !== 'legacy') throw new Error('estado inconsistente tras modo inválido');
  NV.setCommonEnemyDiagnosticMode('full');
});

t('diagnóstico: "no-blur" suprime sólo las capas faux glow del body', () => {
  for (const id of ids) {
    NV.setCommonEnemyDiagnosticMode('full');
    const full = renderStats(id, { armed: false });
    NV.setCommonEnemyDiagnosticMode('no-blur');
    const noBlur = renderStats(id, { armed: false });
    if (full.strokes < noBlur.strokes || full.fills < noBlur.fills || full.arcs < noBlur.arcs || full.paths < noBlur.paths) throw new Error(id + ': FULL perdió geometría base');
    // Solo debe quedar el shadowBlur base compartido (=4) que fija NV.drawEnemy fuera del body.
    if (nonZeroShadows(noBlur) !== 1) throw new Error(id + ': blur fuera del body = ' + nonZeroShadows(noBlur));
    if (nonZeroShadows(full) !== 1) throw new Error(id + ': FULL añadió body shadowBlur=' + nonZeroShadows(full));
  }
  NV.setCommonEnemyDiagnosticMode('full');
});

t('diagnóstico: "no-blur" preserva el blur del feedback compartido (mecha armada)', () => {
  NV.setCommonEnemyDiagnosticMode('full');
  const full = renderStats('kamikaze', { armed: true, fuse: 0.4 });
  NV.setCommonEnemyDiagnosticMode('no-blur');
  const noBlur = renderStats('kamikaze', { armed: true, fuse: 0.4 });
  // Compartido y NO suprimido: base (4) + anillo de mecha (16).
  if (nonZeroShadows(noBlur) !== 2) throw new Error('feedback compartido alterado: ' + nonZeroShadows(noBlur));
  if (nonZeroShadows(full) !== 2) throw new Error('FULL añadió blur dentro del body armado: ' + nonZeroShadows(full));
  if (!(full.strokes > noBlur.strokes || full.fills > noBlur.fills)) throw new Error('no-blur no aisló las capas faux glow armadas');
  NV.setCommonEnemyDiagnosticMode('full');
});

t('diagnóstico: "legacy" usa el body geométrico previo y los ojos genéricos', () => {
  const original = NV.drawEnemyEyes;
  try {
    for (const id of ids) {
      NV.setCommonEnemyDiagnosticMode('full');
      let genericFull = 0;
      NV.drawEnemyEyes = function () { genericFull++; };
      const fullCtx = mkCountCtx();
      NV.drawEnemy(fullCtx, diagEnemy(id), 90, { x: 220, y: 80 }, null);
      NV.setCommonEnemyDiagnosticMode('legacy');
      let genericLegacy = 0;
      NV.drawEnemyEyes = function () { genericLegacy++; };
      const legacyCtx = mkCountCtx();
      NV.drawEnemy(legacyCtx, diagEnemy(id), 90, { x: 220, y: 80 }, null);
      if (genericFull !== 0) throw new Error(id + ': full dibujó ojos genéricos');
      if (genericLegacy !== 1) throw new Error(id + ': legacy no usó ojos genéricos (' + genericLegacy + ')');
      if (fullCtx.calls.scales === 0) throw new Error(id + ': full no aplicó escala especializada');
      if (legacyCtx.calls.scales !== 0) throw new Error(id + ': legacy escaló el body especializado');
    }
  } finally {
    NV.drawEnemyEyes = original;
    NV.setCommonEnemyDiagnosticMode('full');
  }
});

t('diagnóstico: ningún modo muta entidades ni estado de gameplay', () => {
  for (const mode of ['full', 'no-blur', 'legacy']) {
    NV.setCommonEnemyDiagnosticMode(mode);
    for (const id of ids) {
      const e = diagEnemy(id, { armed: id === 'kamikaze', fuse: 0.4 });
      const before = JSON.stringify(e);
      NV.drawEnemy(mkCountCtx(), e, 90, { x: 220, y: 80 }, null);
      if (JSON.stringify(e) !== before) throw new Error(mode + '/' + id + ' mutó la entidad');
    }
  }
  NV.setCommonEnemyDiagnosticMode('full');
});

t('diagnóstico: snapshot expone modo y reutiliza el monitor existente', () => {
  NV.setCommonEnemyDiagnosticMode('full');
  const bare = NV.getCommonEnemyDiagnosticSnapshot();
  if (bare.diagnosticMode !== 'full') throw new Error('modo ausente en snapshot');
  for (const key of ['hydraDiagnosticMode', 'hostiles', 'hydraFamilyHostiles', 'specializedCommonHostiles', 'otherSpectralHostiles', 'byEnemyTypeId', 'quality', 'effectiveVisualTier', 'effectiveDpr', 'mobile', 'frames', 'frame', 'draw', 'update', 'framesAbove6_06', 'framesAbove6_94', 'framesAbove8_33', 'framesAbove11_11', 'framesAbove16_7', 'framesAbove25', 'framesAbove33', 'refresh', 'canvas', 'world']) {
    if (!(key in bare)) throw new Error('falta ' + key + ' en snapshot');
  }
  let resetCalls = 0;
  NV.performanceMonitor = {
    reset() { resetCalls++; },
    getSnapshot() {
      return {
        frames: 240,
        frame: { p50: 12, p95: 22, p99: 30, worst: 41, mean: 14 },
        draw: { p50: 5, p95: 9, p99: 12, worst: 18, mean: 6 },
        update: { p50: 1, p95: 2, p99: 3, worst: 5, mean: 1.2 },
        framesAbove6_06: 220, framesAbove6_94: 210, framesAbove8_33: 180, framesAbove11_11: 130,
        framesAbove16_7: 40, framesAbove25: 6, framesAbove33: 2,
        worstSinceReset: { frame: 41, update: 5, draw: 18 },
        telemetry: {
          hostiles: 13, lightHostiles: 11, mediumHostiles: 2, heavyHostiles: 0,
          hydraFamilyHostiles: 3, specializedCommonHostiles: 8, otherSpectralHostiles: 2,
          byEnemyTypeId: { drone: 4, runner: 4, specter_elite_void: 3, specter_guard: 2 },
          graphicsQuality: 'high', effectiveVisualTier: 'full'
        },
      };
    },
  };
  NV.canvas = { width: 1800, height: 1040, getBoundingClientRect() { return { width: 1800, height: 1040 }; } };
  NV.worldMetrics = { viewW: 900, viewH: 520 };
  NV.viewport = { getEffectiveDpr() { return 1; } };
  NV.capabilities = { isMobile: false };
  NV.getSettings = function () { return { graphics: { quality: 'high' } }; };
  NV.getVisualBudget = function () { return { tier: 'full' }; };
  NV.getHydraDiagnosticMode = function () { return 'cheap'; };
  NV.getRuntimeSnapshot = function () { return { paused: true }; };
  try {
    if (NV.startCommonEnemyDiagnosticSample() !== true) throw new Error('el sample no usó el monitor existente');
    if (resetCalls !== 1) throw new Error('reset no invocado exactamente una vez');
    const snap = NV.getCommonEnemyDiagnosticSnapshot();
    if (snap.hostiles !== 13) throw new Error('hostiles=' + snap.hostiles);
    if (snap.hydraDiagnosticMode !== 'cheap' || snap.hydraFamilyHostiles !== 3 || snap.specializedCommonHostiles !== 8 || snap.otherSpectralHostiles !== 2) throw new Error('familias ausentes');
    if (snap.byEnemyTypeId.specter_elite_void !== 3) throw new Error('conteo por tipo ausente');
    if (snap.frame.p95 !== 22 || snap.draw.p95 !== 9 || snap.update.p95 !== 2) throw new Error('percentiles ausentes');
    if (snap.framesAbove6_06 !== 220 || snap.framesAbove8_33 !== 180 || snap.framesAbove11_11 !== 130) throw new Error('umbrales high-refresh ausentes');
    if (snap.framesAbove25 !== 6 || snap.framesAbove33 !== 2) throw new Error('contadores de umbral ausentes');
    if (snap.refresh.medianRafMs !== 12 || Math.abs(snap.refresh.approximateHz - (1000 / 12)) > 1e-9 || snap.refresh.paused !== true) throw new Error('refresh ausente');
    if (snap.quality !== 'high' || snap.effectiveVisualTier !== 'full') throw new Error('calidad/tier ausentes');
    if (Math.abs(snap.world.scaleX - 2) > 1e-9 || Math.abs(snap.world.scaleY - 2) > 1e-9) throw new Error('escala=' + JSON.stringify(snap.world));
    if (Math.abs(snap.world.ratio - 1) > 1e-9) throw new Error('ratio=' + snap.world.ratio);
    if (snap.canvas.cssWidth !== 1800 || snap.canvas.backingHeight !== 1040) throw new Error('métricas de canvas ausentes');
    if (NV.logCommonEnemyDiagnosticSnapshot().diagnosticMode !== 'full') throw new Error('logger no devuelve snapshot');
  } finally {
    delete NV.performanceMonitor; delete NV.canvas; delete NV.worldMetrics; delete NV.viewport;
    delete NV.capabilities; delete NV.getSettings; delete NV.getVisualBudget;
    delete NV.getHydraDiagnosticMode; delete NV.getRuntimeSnapshot;
  }
});

t('diagnóstico: sin monitor el sample devuelve false y el snapshot no crashea', () => {
  delete NV.performanceMonitor;
  if (NV.startCommonEnemyDiagnosticSample() !== false) throw new Error('debería devolver false sin monitor');
  const snap = NV.getCommonEnemyDiagnosticSnapshot();
  if (snap.diagnosticMode !== 'full') throw new Error('modo ausente sin monitor');
  if (snap.frames !== null || snap.frame !== null || snap.draw !== null) throw new Error('debería reportar null sin monitor');
});

console.log('RESULT common_enemy_visuals: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);