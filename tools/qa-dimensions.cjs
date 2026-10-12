'use strict';
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const mobile = process.argv.includes('--mobile');
const difficulty = process.argv.includes('--normal') ? 'normal' : 'easy';
const root = path.resolve(__dirname, '..'), out = path.join(root, 'local/validation', (mobile ? 'dimensions-mobile' : 'dimensions') + (difficulty === 'normal' ? '-normal' : ''));
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'ds-dimensions-')));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  fs.mkdirSync(out, { recursive: true });
  const win = new BrowserWindow({ width: mobile ? 844 : 1200, height: mobile ? 390 : 800, show: false,
    webPreferences: { offscreen: true, backgroundThrottling: false, sandbox: true, contextIsolation: true } });
  const errors = [];
  win.webContents.on('console-message', details => { if (details.level === 'error') errors.push(details.message); });
  const evaluate = code => win.webContents.executeJavaScript(code, true);
  await win.loadFile(path.join(root, 'previews/black-holes.html')); await delay(800);
  fs.writeFileSync(path.join(out, 'three-models.png'), (await win.webContents.capturePage()).toPNG());
  await win.loadFile(path.join(root, 'index.html'), { query: mobile ? { fresh: '1', mobile: '1' } : { fresh: '1' } }); await delay(800);
  await evaluate(`NV.setDifficulty(${JSON.stringify(difficulty)}); NV.setFirePolicy("legacy-auto"); document.getElementById("lobbyPlayBtn").click()`);
  await delay(150);
  const initial = await evaluate('NV.getRuntimeSnapshot()');
  const cx = initial.arena.width / 2, cy = initial.arena.height / 2;
  const route = [[cx * 0.5, cy * 0.5], [cx * 1.5, cy * 0.5], [cx * 1.5, cy * 1.5], [cx * 0.5, cy * 1.5]];
  let waypoint = 0;
  const deadline = Date.now() + 240000, crossed = [], captured = new Set(), environments = [], fieldFrames = [];
  let pauseChecked = false;
  let last = null;
  const fields = {};
  while (Date.now() < deadline) {
    const s = await evaluate('NV.getRuntimeSnapshot()');
    if (s.dimension && s.objective) {
      const depth = s.dimension.depth;
      const metric = fields[depth] || (fields[depth] = { deployed: 0, peakHostiles: 0, cleanupChecks: 0 });
      metric.deployed = Math.max(metric.deployed, s.objective.spawned);
      metric.peakHostiles = Math.max(metric.peakHostiles, s.hostileBudget.hostiles);
      if (last && last.dimension.depth === depth && last.waveTimer === 0 && s.waveTimer === 0) {
        assert.equal(s.objective.spawned, last.objective.spawned, 'desplegó enemigos tras cerrar el reloj');
        metric.cleanupChecks++;
      }
      last = s;
    }
    if (s.dimension && s.dimension.phase === 'combat' && !s.dimension.arrival && !fieldFrames.includes(s.dimension.depth)) {
      fieldFrames.push(s.dimension.depth); environments.push(s.dimension.environment);
      assert.equal(new Set(environments).size, environments.length, 'ambiente repetido');
      assert.equal(s.dimension.duration, 15, 'duración original de oleada 1');
      assert.equal(s.objective.required, null, 'no existe cuota independiente de bajas');
      assert.equal(s.objective.mode, 'timed');
      fs.writeFileSync(path.join(out, 'universe-' + s.dimension.depth + '.png'), (await win.webContents.capturePage()).toPNG());
      console.log('UNIVERSO', s.dimension.depth, s.dimension.environment, s.objective.mode);
    }
    if (s.state === 'player_dying' || s.state === 'gameover') fs.writeFileSync(path.join(out, 'failed-runtime.json'), JSON.stringify(s, null, 2));
    if (s.state === 'playing' && s.dimension && s.dimension.phase === 'combat') await evaluate('NV.input.setSpecial(true)');
    else await evaluate('NV.input.setSpecial(false)');
    assert.notEqual(s.state, 'gameover', 'autoplay murió');
    assert.notEqual(s.state, 'player_dying', 'autoplay murió');
    if (s.state === 'shop') { assert.deepEqual(crossed, [0, 1, 2]); break; }
    if (s.dimension && s.dimension.phase === 'portal') {
      const p = s.dimension.portal;
      if (!crossed.includes(s.dimension.depth)) {
        crossed.push(s.dimension.depth);
        console.log('PORTAL', s.dimension.depth, s.player.hp);
      }
      if (!captured.has(s.dimension.depth) && Math.hypot(s.player.x - p.x, s.player.y - p.y) < 170) {
        captured.add(s.dimension.depth);
        fs.writeFileSync(path.join(out, 'portal-' + s.dimension.depth + '.png'), (await win.webContents.capturePage()).toPNG());
      }
      if (!pauseChecked) {
        await evaluate('NV.input.togglePause()'); await delay(200);
        assert.equal((await evaluate('NV.getRuntimeSnapshot()')).dimension.depth, s.dimension.depth);
        await evaluate('NV.input.togglePause()'); pauseChecked = true;
      }
      await evaluate(`NV.input.setMoveLeft(${s.player.x > p.x + 8}); NV.input.setMoveRight(${s.player.x < p.x - 8}); NV.input.setMoveUp(${s.player.y > p.y + 8}); NV.input.setMoveDown(${s.player.y < p.y - 8});`);
    } else if (s.dimension && s.dimension.phase === 'combat') {
      let [x, y] = route[waypoint];
      if (Math.hypot(s.player.x - x, s.player.y - y) < 55) { waypoint = (waypoint + 1) % route.length; [x, y] = route[waypoint]; }
      await evaluate(`NV.input.setMoveLeft(${s.player.x > x + 8}); NV.input.setMoveRight(${s.player.x < x - 8}); NV.input.setMoveUp(${s.player.y > y + 8}); NV.input.setMoveDown(${s.player.y < y - 8});`);
    } else await evaluate('NV.input.setMoveLeft(false);NV.input.setMoveRight(false);NV.input.setMoveUp(false);NV.input.setMoveDown(false);');
    await delay(80);
  }
  const final = await evaluate('NV.getRuntimeSnapshot()');
  assert.equal(final.state, 'shop', 'no completó recorrido');
  const stock=await evaluate(`({consumables:document.querySelectorAll('#consumableOffers .offer').length,
    passive:document.querySelectorAll('#upgradesOffers .offer').length, premium:document.querySelectorAll('#weaponOffers .offer').length,
    realWeapons:document.querySelectorAll('#weaponOffers .offer:not(.offer-reserved)').length})`);
  console.log('SHOP',JSON.stringify(stock));
  // The local shop restoration retains four run upgrades + one temporary passive,
  // six honest armory slots and the visible upgrade dock. Do not revert that work.
  assert.equal(stock.consumables,2);assert.equal(stock.passive,5);
  assert.equal(stock.premium,6);assert(stock.realWeapons>=2,'armería sin alternativas reales');
  const before=await evaluate('NV.alpha.snapshot().shards');
  await evaluate("document.querySelector('#consumableOffers .offer:not(.disabled)').click();true;");
  await delay(220);
  assert.equal(await evaluate('NV.alpha.snapshot().shards'),before-10,'poción no cobra exactamente su precio');
  await evaluate("document.querySelector('#consumableOffers .offer.disabled').click();true;");
  assert.equal(await evaluate('NV.alpha.snapshot().shards'),before-10,'compra repetida cobra');
  const geometry=await evaluate(`({dock:getComputedStyle(document.querySelector('.shop-upgrade-dock')).display,
    section:document.querySelector('.shop-section-armory').getBoundingClientRect().height,viewport:innerHeight})`);
  assert.notEqual(geometry.dock,'none','dock restaurado de mejoras oculto');
  if(!mobile)assert(geometry.section>0&&geometry.section<=geometry.viewport,'panel fuera del viewport');
  fs.writeFileSync(path.join(out,'shop.png'),(await win.webContents.capturePage()).toPNG());
  assert.deepEqual(errors, [], 'errores renderer');
  assert.equal(environments.length, 4);
  fs.writeFileSync(path.join(out, 'runtime.json'), JSON.stringify({ pass: true, difficulty, fields, crossed, environments, pauseChecked, final, errors }, null, 2));
  console.log('PASS recorrido real: tres portales, pausa y tienda al final');
  app.exit(0);
}).catch(error => { console.error(error); app.exit(1); });
