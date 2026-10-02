const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const NV = {};
vm.runInNewContext(fs.readFileSync('js/engine/sectorEncounters.js', 'utf8'), { window: { NV }, Math, console });

assert.deepStrictEqual([1, 6, 11, 16].map(w => NV.sectorEncounterForWave(w).hazard),
  [null, 'vent', 'rift', 'pulse']);
assert.equal(NV.sectorEncounterForWave(6).cue, 'LÁSER ROJO · SALÍ A UN COSTADO');
for (const wave of [6, 11, 16]) {
  const cue = NV.sectorEncounterForWave(wave).cue;
  assert(cue.includes('ROJ') && cue.length <= 36, 'mismo peligro rojo e instrucción breve');
}

function advanceToSpawn(wave, extra) {
  const hazards = [];
  const state = NV.createSectorEncounterState();
  const ctx = Object.assign({ wave, W: 900, H: 520, waveEvent: null, boss: null, transitioning: false,
    player: { x: 10, y: 10 }, playerRadius: 10, shake: 0 }, extra || {});
  NV.updateSectorEncounter(2.81, hazards, state, ctx);
  assert.equal(hazards.length, wave>=16?1:2, 'pulso único o grupo inicial de dos láseres');
  return { hazards, state, ctx, hazard: hazards[0] };
}

// Umbral es zona de aprendizaje y nunca agrega una amenaza.
for(const [W,H] of [[900,520],[915,412],[844,390],[1914,935]])for(const wave of [7,11]) {
  const mounts=NV.sectorEmitterLayout(wave,W,H);
  assert.equal(mounts.length,3);
  for(const m of mounts) {
    assert.equal(m.W,W);assert.equal(m.H,H);
    if(m.kind==='vent') assert(m.x-m.width/2>0 && m.x+m.width/2<W);
    else assert(m.y-m.width/2>0 && m.y+m.width/2<H);
    assert(m.width<=52,'costo y grosor acotados en todos los tamaños');
  }
}
{
  const hazards = [], state = NV.createSectorEncounterState();
  NV.updateSectorEncounter(20, hazards, state, { wave: 2, W: 900, H: 520 });
  assert.equal(hazards.length, 0);
}

for (const wave of [6, 11, 16]) {
  let damageCalls = 0, soundCalls = 0;
  const run = advanceToSpawn(wave, {
    applyPlayerDamage(damage) { damageCalls++; return { applied: true, killed: false, damage }; },
    sfx: { sectorHazard() { soundCalls++; } },
  });
  const h = run.hazard;
  if (h.kind !== 'pulse') {
    assert.equal(h.label,'LÁSER');
    const mounts = NV.sectorLaserPattern(0,900,520);
    assert.equal(mounts.length,2,'grupo inicial de dos cabezales');
    assert(mounts.some(m => m.x===h.x && m.y===h.y && m.width===h.width),'soporte y disparo comparten geometría');
  }
  if(!h.laserHead)assert.equal(h.hint, NV.sectorEncounterForWave(wave).cue);
  const spawnGeometry = JSON.stringify({ x: h.x, y: h.y, width: h.width, radius: h.radius });
  // El telegraph nunca daña y su geometría queda bloqueada.
  NV.updateSectorEncounter(1.0, run.hazards, run.state, run.ctx);
  assert.equal(damageCalls, 0);
  assert.equal(JSON.stringify({ x: h.x, y: h.y, width: h.width, radius: h.radius }), spawnGeometry);
  // Poner al jugador dentro antes de activar y aplicar exactamente un impacto.
  if (h.kind === 'vent') run.ctx.player = { x: h.x, y: 100 };
  else if (h.kind === 'rift') run.ctx.player = { x: 100, y: h.y };
  else run.ctx.player = { x: h.x + h.radius, y: h.y };
  NV.updateSectorEncounter(h.telegraphTime-1+.01, run.hazards, run.state, run.ctx);
  NV.updateSectorEncounter(0.10, run.hazards, run.state, run.ctx);
  assert.equal(h.state, 'active');
  assert.equal(damageCalls, 1, 'un solo daño por activación');
  assert.equal(soundCalls, h.laserHead?0:1, 'láser usa voz continua, pulso conserva aviso único');
  NV.updateSectorEncounter(0.10, run.hazards, run.state, run.ctx);
  assert.equal(damageCalls, 1, 'sin daño repetido por frame');
}

// Boss, transición y evento especial cancelan la amenaza sin borrar otros hazards.
for (const blocker of [{ boss: {} }, { transitioning: true }, { waveEvent: 'fog' }]) {
  const run = advanceToSpawn(7);
  run.hazards.push({ type: 'coreZone', state: 'active' });
  Object.assign(run.ctx, blocker);
  NV.updateSectorEncounter(0.1, run.hazards, run.state, run.ctx);
  assert.equal(run.hazards.some(h => h.type === 'sectorHazard'), false);
  assert.equal(run.hazards.some(h => h.type === 'coreZone'), true);
}

const html = fs.readFileSync('index.html', 'utf8');
assert(html.includes('js/engine/sectorEncounters.js'));
assert(html.indexOf('js/engine/sectorEncounters.js') < html.indexOf('js/game.js'));
const game = fs.readFileSync('js/game.js', 'utf8');
assert(game.includes('NV.updateSectorEncounter(dt'));
assert(game.includes("sectorIntro.name + ' · ' + sectorIntro.cue"));

// El renderer acepta las tres geometrías sin depender de DOM ni mutarlas.
vm.runInNewContext(fs.readFileSync('js/render/hazards.js', 'utf8'), { window: { NV }, Math, console });
function fakeCtx() {
  const gradient = () => ({ addColorStop() {} });
  return { save() {}, restore() {}, beginPath() {}, closePath() {}, arc() {}, ellipse() {}, fill() {}, stroke() {},
    fillRect() {}, strokeRect() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {}, translate() {},
    rotate() {}, scale() {}, setLineDash() {}, fillText() {}, createLinearGradient: gradient,
    createRadialGradient: gradient, measureText() { return { width: 40 }; } };
}
for (const wave of [6, 11, 16]) {
  const run = advanceToSpawn(wave);
  const before = JSON.stringify(run.hazard);
  NV.drawHazards(fakeCtx(), run.hazards, null, { tier: 'minimal' }, false);
  NV.drawSectorEmitters(fakeCtx(),900,520,wave,run.hazards,true);
  NV.drawSectorEmitters(fakeCtx(),900,520,wave,[],false);
  assert.equal(JSON.stringify(run.hazard), before, 'el render no puede mutar la amenaza');
}
console.log('RESULT sector_encounters: avisos, colisión única, exclusiones y wiring OK');
