'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const events = require('../js/engine/dimensionEvents.js');
const rules = require('../js/experiments/dimensionRules.js');
const chamber = require('../js/engine/inertiaChamber.js');

// Ejecutar el adaptador real de game.js, además del objetivo y los portales:
// el núcleo ya se completaba bien; faltaba conectar el último campo a victoria.
const game = fs.readFileSync('js/game.js', 'utf8');
const start = game.indexOf("    if (inertiaField && dimensionRun && state==='playing') {");
const end = game.indexOf("    if (dimensionExperiment && dimensionExperiment.preset==='museum-time'", start);
assert(start >= 0 && end > start, 'adaptador de núcleo no encontrado');
const adapter = game.slice(start, end);
const dimensions = fs.readFileSync('js/engine/dimensions.js', 'utf8');

for (const mode of ['expedition', 'endless']) {
  for (const depth of [0, 1, 2, 3]) {
    for (const rushed of [true, false]) {
      const fieldClock = events.createSession({
        wave: 9, mode, preview: true,
        coreEncounter: { depth, pattern: 0, guardCount: 3 },
      }, rules, chamber);
      fieldClock.enter(depth);
      const player = { x: 600, y: 400, hp: 390 };
      const enemies = rushed ? [{ x: 40, y: 40, hp: 25, dead: false }] : [];
      const sandbox = {
        window: { NV: { getProductionEnemyDefinition: () => null } },
        fieldClock, inertiaField: true, state: 'playing', player, enemies,
        wave: 9, waveTimer: rushed ? 40 : 0, shards: 100,
        victories: 0, banners: [], bullets: [], flameZones: [], pendingBombImpacts: [],
        currentAutoTarget: null, MAX_HOSTILES: 30, MAX_HEAVY_HOSTILES: 7,
        MAX_BULLETS: 500, MAX_ENEMY_BULLETS: 100,
        WAVE_EVENTS: { 'museum-time': { color: '#a8dfff' } }, sfx: {},
        arenaW: () => 1200, arenaH: () => 800,
        experimentPlacementContext: () => ({ W: 1200, H: 800, player, enemies, bullets: [] }),
        enemyBulletCount: () => 0, stopCurrentWeaponAudio() {},
        showBanner(text) { sandbox.banners.push(text); },
        triggerWaveVictory(isBoss) {
          assert.equal(isBoss, false);
          sandbox.victories++;
          sandbox.state = 'wave_end';
        },
      };
      vm.createContext(sandbox);
      vm.runInContext(dimensions, sandbox);
      sandbox.NV = sandbox.window.NV;
      vm.runInContext(game.slice(game.indexOf('  function awardDimensionRouteReward()'),game.indexOf('  function pickWaveEvent()')),sandbox);
      sandbox.dimensionRun = sandbox.NV.createDimensionRun(9, false, {}, 40);
      sandbox.dimensionRun.depth = depth;
      vm.runInContext('function step(dt, admittedDt) {\n' + adapter + '\n}', sandbox);

      sandbox.step(.02, .02);
      assert.equal(sandbox.victories, 0, 'no terminar antes de destruir el núcleo');
      assert.equal(sandbox.dimensionRun.phase, 'combat');
      assert(fieldClock.combatTarget());
      fieldClock.combatTarget().hp = 0;
      fieldClock.combatTarget().dead = true;
      sandbox.step(.02, .02);
      assert(fieldClock.objectiveReady());
      assert.equal(fieldClock.objectiveView().collected, 1);
      assert.equal(sandbox.waveTimer, 0);

      if (depth < 3) {
        assert.equal(sandbox.victories, 0, 'un campo intermedio no termina la oleada');
        assert.equal(sandbox.dimensionRun.phase, 'opening');
        assert(sandbox.dimensionRun.portal, 'debe abrirse el agujero negro');
        sandbox.step(1.3, 1.3);
        assert.equal(sandbox.dimensionRun.phase, 'portal');
        assert.equal(sandbox.shards, 100, 'sin duplicar recompensa por campo');
      } else {
        assert.equal(sandbox.victories, 1, 'U4/4 con núcleo 1/1 no debe bloquearse');
        assert.equal(sandbox.state, 'wave_end');
        assert.equal(sandbox.shards, 126, 'recompensa normal de la oleada 9');
        assert.equal(sandbox.dimensionRun.portal, null, 'no inventar un quinto universo');
        sandbox.step(.02, .02);
        assert.equal(sandbox.victories, 1, 'victoria una sola vez');
        assert.equal(sandbox.shards, 126, 'recompensa una sola vez');
      }
    }
  }
}
console.log('PASS core_field_completion: four depths, rush/cleanup, expedition/endless, final victory and single reward');
