'use strict';
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'local/validation/hud-reveal');
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'ds-hud-reveal-')));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  fs.mkdirSync(out, { recursive: true });
  const win = new BrowserWindow({ width: 1200, height: 800, show: false,
    webPreferences: { offscreen: true, backgroundThrottling: false, sandbox: true, contextIsolation: true } });
  const errors = [], results = [];
  win.webContents.on('console-message', details => { if (details.level === 'error') errors.push(details.message); });
  const evaluate = code => win.webContents.executeJavaScript(code, true);
  await win.loadFile(path.join(root, 'index.html'), { query: { fresh: '1' } }); await delay(700);
  await evaluate('NV.setDifficulty("easy"); NV.setFirePolicy("legacy-auto"); document.getElementById("lobbyPlayBtn").click(); NV.input.setMoveRight(true); NV.input.setSpecial(true)');
  await delay(4000);
  assert.equal((await evaluate('NV.alpha.snapshot()')).hudReveal, 0, 'HUD no se autooculta');
  await evaluate('NV.input.setSpecial(false)');
  for (const code of ['KeyH', 'Digit6', 'Digit1', 'KeyQ', 'KeyE', 'KeyF', 'Space']) {
    const before = await evaluate('NV.input.getWeaponInfo()');
    await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown',{code:${JSON.stringify(code)},bubbles:true}));window.dispatchEvent(new KeyboardEvent('keyup',{code:${JSON.stringify(code)},bubbles:true}));`);
    const s = await evaluate('NV.alpha.snapshot()');
    assert(s.hudHold > 2.8, code + ' no revela HUD');
    assert.deepEqual(await evaluate('NV.input.getWeaponInfo()'), before, code + ' cambió arma de ranura vacía/misma');
    results.push({ code, hold: s.hudHold });
  }
  await delay(400);
  assert((await evaluate('NV.alpha.snapshot()')).hudReveal > 0.95);
  fs.writeFileSync(path.join(out, 'visible.png'), (await win.webContents.capturePage()).toPNG());
  await evaluate('NV.input.togglePause()');
  const paused = await evaluate('NV.alpha.snapshot()'); await delay(300);
  assert.equal((await evaluate('NV.alpha.snapshot()')).hudHold, paused.hudHold);
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(out, 'runtime.json'), JSON.stringify({ pass: true, results, errors }, null, 2));
  console.log('PASS HUD real: autoocultamiento, H, ranuras vacías, Q/E/F, especial y pausa'); app.exit(0);
}).catch(error => { console.error(error); app.exit(1); });
