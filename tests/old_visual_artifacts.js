// Regresiones Canvas de feedback de daño y transform cinematográfico.
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const NV = {};
vm.runInNewContext(fs.readFileSync('js/render/metaReadability.js', 'utf8'),
  { window: { NV }, Math, Map, WeakMap });
const game = fs.readFileSync('js/game.js', 'utf8');
let pass = 0;
function test(name, fn) { fn(); pass++; console.log('  ok  ' + name); }

function canvas() {
  const calls = [];
  const ctx = { strokeStyle: '', fillStyle: '', xform: [1, 0, 0, 1, 0, 0], stack: [], path: [],
    save() { this.stack.push(this.xform.slice()); },
    restore() { this.xform = this.stack.pop(); },
    setTransform(...args) { this.xform = args; },
    beginPath() { this.path = []; },
    closePath() {},
    moveTo(x, y) { this.path.push(['moveTo', x, y]); },
    lineTo(x, y) { this.path.push(['lineTo', x, y]); },
    arc(x, y, r) { this.path.push(['arc', x, y, r]); },
    stroke() { calls.push({ style: this.strokeStyle, path: this.path.slice(), transform: this.xform.slice() }); },
    fill() { calls.push({ style: this.fillStyle, path: this.path.slice(), transform: this.xform.slice() }); },
  };
  return { ctx, calls };
}

test('impactos de enemigos, proyectiles y jefes nunca trazan el segmento rojo', () => {
  for (const critical of [false, true]) for (const origin of [[-800, 300], [140, 200], [900, -100]]) {
    const { ctx, calls } = canvas();
    assert.strictEqual(NV.drawDamageFeedback(ctx, { x: 220, y: 150 },
      { life: 0.4, critical, flash: 0.05, sourceX: origin[0], sourceY: origin[1] }, { t: 2 }), true);
    assert.ok(calls.length >= 2, 'anillo y flash siguen visibles');
    assert.ok(calls.every((call) => call.path.every((p) => p[0] === 'arc')));
    assert.ok(calls.every((call) => call.path[0][1] === 220 && call.path[0][2] === 150));
    assert.ok(calls.every((call) => call.style !== NV.META_VIS_PALETTE.danger));
  }
  assert.ok(!game.slice(game.indexOf('function recordPlayerDamage(hit)'),
    game.indexOf('function updateMetaDiagnostics()')).includes('sourceX'));
});

test('anillo y disco de daño quedan centrados con zoom y traslación; sin visual meta de invulnerabilidad', () => {
  const { ctx, calls } = canvas();
  ctx.setTransform(1.07, 0, 0, 1.07, -130, -40);
  const world = ctx.xform.slice();
  assert.strictEqual(NV.drawDamageFeedback(ctx, { x: 220, y: 150 },
    { life: 0.4, critical: false, flash: 0.05 }, { t: 2 }), true);
  assert.strictEqual(calls.length, 2, 'anillo y disco conservados');
  assert.ok(calls.every((call) => JSON.stringify(call.transform) === JSON.stringify(world)));
  assert.ok(calls.every((call) => call.path.every((p) => p[0] === 'arc' && p[1] === 220 && p[2] === 150)));
  const render = game.slice(game.indexOf('function draw()'), game.indexOf('function drawPlayerDeathPuff(c2)'));
  const worldTransform = render.indexOf('ctx.setTransform(worldScaleX');
  const playerDraw = render.indexOf('} else drawPlayer();');
  const feedback = render.indexOf('NV.drawDamageFeedback(ctx, player, damageFeedback, metaRenderEnv)');
  const baseTransform = render.indexOf('ctx.setTransform(scaleX', feedback);
  assert.ok(worldTransform >= 0 && playerDraw > worldTransform && feedback > playerDraw && baseTransform > feedback);
  assert.strictEqual((render.match(/NV\.drawDamageFeedback\(ctx, player, damageFeedback, metaRenderEnv\)/g) || []).length, 1);
  assert.strictEqual(typeof NV.drawInvulnerabilityFeedback, 'undefined');
  assert.strictEqual(typeof NV.drawMomentumReadability, 'undefined');
});

test('los telegraphs actuales siguen independientes del feedback eliminado', () => {
  const { ctx, calls } = canvas();
  NV.drawContactReadability(ctx, { x: 220, y: 150, radius: 10, atkFlash: 1 },
    { x: 240, y: 150 }, false, { t: 2 });
  assert.ok(calls.some((call) => call.style === NV.META_VIS_PALETTE.danger));
  const ranged = canvas();
  assert.strictEqual(NV.drawEnemyIntent(ranged.ctx, { x: 220, y: 150, radius: 10, behavior: 'ranged' },
    { x: 240, y: 150 }, { t: 2 }), true);
  assert.ok(ranged.calls.some((call) => call.style === NV.META_VIS_PALETTE.info));
  const enemies = fs.readFileSync('js/render/enemies.js', 'utf8');
  assert.ok(enemies.includes("hookSystem.phase === 'windup'") && enemies.includes("hookSystem.phase === 'tether'"));
});

console.log('RESULT old_visual_artifacts: pass=' + pass + ' fail=0');