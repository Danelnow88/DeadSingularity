// Contratos enfocados: órbita cartoon de estrellas durante el stun del jugador.
const fs = require('fs'), vm = require('vm');
let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log('  ok  ' + name); }
  catch (e) { fail++; console.log('  FAIL ' + name + ' -> ' + e.message); }
}

function loadPlayerRenderer(reducedMotion) {
  const motion = { matches: !!reducedMotion };
  const sbx = { window: { NV: {}, matchMedia: () => motion }, console, Math, Number };
  vm.runInNewContext(fs.readFileSync('js/data/gameData.js', 'utf8'), sbx, { filename: 'js/data/gameData.js' });
  vm.runInNewContext(fs.readFileSync('js/render/player.js', 'utf8'), sbx, { filename: 'js/render/player.js' });
  return sbx.window.NV;
}

function makeCtx() {
  const rec = { saves: 0, restores: 0, fills: 0, strokes: 0, translates: [], rotations: [], ellipses: [], fillStyles: [], strokeStyles: [], fillCalls: [], strokeCalls: [], lineWidths: [] };
  const base = {
    save() { rec.saves++; },
    restore() { rec.restores++; },
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {},
    quadraticCurveTo() {}, bezierCurveTo() {}, arc() {},
    ellipse(x, y, rx, ry, rotation, start, end) { rec.ellipses.push({ x, y, rx, ry, rotation, start, end }); },
    fill() { rec.fills++; rec.fillCalls.push(this.fillStyle); },
    stroke() { rec.strokes++; rec.strokeCalls.push(this.strokeStyle); },
    fillRect() { rec.fills++; rec.fillCalls.push(this.fillStyle); },
    translate(x, y) { rec.translates.push({ x, y }); },
    rotate(angle) { rec.rotations.push(angle); }, scale() {}, setLineDash() {},
    createRadialGradient() { return { addColorStop() {} }; },
    createLinearGradient() { return { addColorStop() {} }; },
  };
  const ctx = new Proxy(base, {
    get(target, key) {
      if (key === 'rec') return rec;
      if (key in target) return target[key];
      return target[key];
    },
    set(target, key, value) {
      if (key === 'fillStyle') rec.fillStyles.push(value);
      if (key === 'strokeStyle') rec.strokeStyles.push(value);
      if (key === 'lineWidth') rec.lineWidths.push(value);
      target[key] = value;
      return true;
    },
  });
  return { ctx, rec };
}

function player(id, stun) {
  return {
    x: 180, y: 140, character: id, hp: 100, maxHp: 100,
    invuln: 0, stun, phase: 0, bulwark: 0, shield: 0, overdrive: 0,
    moveVx: 0, moveVy: 0,
  };
}

const NV = loadPlayerRenderer(false);

t('sin stun no dibuja; con stun compone 5 estrellas exteriores, 5 highlights y 1 órbita', () => {
  const char = NV.CHARACTERS.boti;
  const inactive = makeCtx();
  if (NV.drawPlayerStunStars(inactive.ctx, player('boti', 0), char, 20) !== false) throw new Error('stun=0 no retornó false');
  if (inactive.rec.fills !== 0 || inactive.rec.strokes !== 0) throw new Error('dibujó sin stun');

  const active = makeCtx();
  if (NV.drawPlayerStunStars(active.ctx, player('boti', 0.4), char, 20) !== true) throw new Error('stun activo no retornó true');
  if (active.rec.fills !== 10) throw new Error('fills=' + active.rec.fills);
  if (active.rec.strokeCalls.filter((value) => value === '#8a6130').length !== 5) throw new Error('outlines=' + JSON.stringify(active.rec.strokeCalls));
  if (active.rec.ellipses.length !== 1) throw new Error('ellipses=' + active.rec.ellipses.length);
  if (active.rec.strokeCalls.filter((value) => value === 'rgba(255, 225, 120, 0.14)').length !== 1) throw new Error('orbit line ausente');
  if (active.rec.fillCalls.filter((value) => value === 'rgba(255, 241, 190, 0.85)').length !== 5) throw new Error('highlights=' + JSON.stringify(active.rec.fillCalls));
  if (!active.rec.fillCalls.includes('#f7c55b') || !active.rec.fillCalls.includes('#e9ae40')) throw new Error('dorados aprobados ausentes');
});

t('escala y órbita aprobadas quedan por encima de los cuatro pilotos', () => {
  for (const id of NV.CHARACTER_ORDER) {
    const char = NV.CHARACTERS[id];
    const effectScale = Math.max(20, Number(char.size) || 20);
    const { ctx, rec } = makeCtx();
    NV.drawPlayerStunStars(ctx, player(id, 0.5), char, 0);
    if (rec.translates.length !== 5) throw new Error(id + ' posiciones=' + rec.translates.length);
    const orbit = rec.ellipses[0];
    if (Math.abs(orbit.y + effectScale * 2.05) > 1e-9) throw new Error(id + ' centerY=' + orbit.y);
    if (Math.abs(orbit.rx - effectScale * 0.74) > 1e-9 || Math.abs(orbit.ry - effectScale * 0.26) > 1e-9) throw new Error(id + ' orbit=' + orbit.rx + '/' + orbit.ry);
    if (rec.translates.some((p) => p.y >= -char.size - 10)) throw new Error(id + ' invade cuerpo: ' + JSON.stringify(rec.translates));
    const expectedOutline = Math.max(1.35, effectScale * 0.075);
    if (!rec.lineWidths.some((value) => Math.abs(value - expectedOutline) < 1e-9)) throw new Error(id + ' outline scale');
  }
});

t('movimiento normal usa 1.75 rad/s, profundidad sinusoidal y pulse ±6%', () => {
  const char = NV.CHARACTERS.rook;
  const first = makeCtx(), second = makeCtx();
  NV.drawPlayerStunStars(first.ctx, player('rook', 0.5), char, 0);
  NV.drawPlayerStunStars(second.ctx, player('rook', 0.5), char, 60);
  const rotationDelta = second.rec.rotations[0] - first.rec.rotations[0];
  if (Math.abs(rotationDelta - 1.75 * 1.8) > 1e-9) throw new Error('velocidad=' + rotationDelta);
  const helper = fs.readFileSync('js/render/player.js', 'utf8').slice(fs.readFileSync('js/render/player.js', 'utf8').indexOf('NV.drawPlayerStunStars = function'), fs.readFileSync('js/render/player.js', 'utf8').indexOf('NV.drawPlayer = function'));
  if (!helper.includes('0.86 + Math.sin(angle) * 0.14')) throw new Error('depth continuo ausente');
  if (!helper.includes("reducedMotion ? 0.02 : 0.06")) throw new Error('pulse aprobado ausente');
});

t('el render compartido aplica el efecto a todas las selecciones y mantiene Canvas balanceado', () => {
  for (const id of NV.CHARACTER_ORDER) {
    const { ctx, rec } = makeCtx();
    NV.drawPlayer(ctx, player(id, 0.45), NV.CHARACTERS, 32);
    if (rec.fillCalls.filter((value) => value === 'rgba(255, 241, 190, 0.85)').length !== 5) throw new Error(id + ' sin corona');
    if (rec.saves !== rec.restores) throw new Error(id + ' save/restore=' + rec.saves + '/' + rec.restores);
  }
});

t('sin stun el render normal conserva el jugador pero no dibuja estrellas', () => {
  const { ctx, rec } = makeCtx();
  NV.drawPlayer(ctx, player('nova', 0), NV.CHARACTERS, 32);
  if (rec.fills === 0) throw new Error('cuerpo no renderizado');
  if (rec.fillStyles.includes('#f7c55b') || rec.fillStyles.includes('#e9ae40')) throw new Error('estrellas visibles sin stun');
});

t('reduced motion conserva cinco estrellas y reduce la órbita a 0.35 rad/s', () => {
  const reducedNV = loadPlayerRenderer(true);
  const char = reducedNV.CHARACTERS.boti;
  const first = makeCtx(), second = makeCtx();
  reducedNV.drawPlayerStunStars(first.ctx, player('boti', 0.5), char, 0);
  reducedNV.drawPlayerStunStars(second.ctx, player('boti', 0.5), char, 60);
  if (first.rec.fillCalls.filter((value) => value === 'rgba(255, 241, 190, 0.85)').length !== 5) throw new Error('indicador removido');
  const rotationDelta = second.rec.rotations[0] - first.rec.rotations[0];
  if (Math.abs(rotationDelta - 0.35 * 1.8) > 1e-9) throw new Error('velocidad reducida=' + rotationDelta);
});

t('el indicador es render-only y no muta ningún campo del jugador', () => {
  const p = player('swarm', 0.65);
  p.stunReapplyLockout = 1.25;
  p.customState = { value: 7 };
  const before = JSON.stringify(p);
  const { ctx } = makeCtx();
  NV.drawPlayer(ctx, p, NV.CHARACTERS, 47);
  const after = JSON.stringify(p);
  if (after !== before) throw new Error('mutación: ' + before + ' -> ' + after);
});

t('la integración queda después del cuerpo, cachea matchMedia y no crea estado acumulable', () => {
  const source = fs.readFileSync('js/render/player.js', 'utf8');
  const eyes = source.indexOf('// Ojos');
  const call = source.lastIndexOf('NV.drawPlayerStunStars(ctx, player, char, frame);');
  if (!(eyes >= 0 && call > eyes)) throw new Error('la órbita no está después del cuerpo');
  if ((source.match(/matchMedia\('/g) || []).length !== 1) throw new Error('matchMedia no cacheado');
  const helper = source.slice(source.indexOf('NV.drawPlayerStunStars = function'), source.indexOf('NV.drawPlayer = function'));
  for (const forbidden of ['Math.random', '.push(', 'new Array', 'player.stun =', 'player[']) {
    if (helper.includes(forbidden)) throw new Error('operación prohibida: ' + forbidden);
  }
});

console.log('RESULT player_stun_visual: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);