'use strict';
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'local/validation/graphics-settings');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'ds-graphics-')));
app.on('window-all-closed', () => {});
app.whenReady().then(async () => {
  fs.mkdirSync(out, { recursive: true });
  const server = require('node:http').createServer((req, res) => {
    const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' })[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const reports = [];
  for (const [width, height, mobile] of [[1280, 800, false], [844, 390, true], [390, 844, true]]) {
    const win = new BrowserWindow({ width, height, useContentSize: true, show: false, webPreferences: { offscreen: true, sandbox: true, contextIsolation: true, backgroundThrottling: false } });
    const errors = []; win.webContents.on('console-message', message => { if (message.level === 'error') errors.push(message.message); });
    const evaluate = code => win.webContents.executeJavaScript(code, true);
    await win.loadURL('http://127.0.0.1:' + server.address().port + '/index.html?fresh=1' + (mobile ? '&mobile=1' : ''));
    await wait(600);
    await evaluate('NV.settingsUI.open(); document.getElementById("tabGraphics").click();');
    assert.equal(await evaluate('document.getElementById("settingsResolution").disabled'), mobile);
    assert.equal(await evaluate('document.querySelectorAll("#panelGraphics .settings-toggle").length'), 0, 'Experimento GPU oculto');
    const before = await evaluate('JSON.stringify(NV.screenToGame(400,200))');
    const sizes = [];
    for (const resolution of ['1080p', '1440p']) {
      await evaluate(`NV.setGraphicsResolution('${resolution}');`); await wait(120);
      const size = await evaluate('({w:NV.canvas.width,h:NV.canvas.height,css:NV.canvas.getBoundingClientRect().width,scale:NV.viewport.getEffectiveDpr()})');
      if (!mobile) { const max = resolution === '1080p' ? [1920, 1080] : [2560, 1440]; assert(size.w <= max[0] + 1 && size.h <= max[1] + 1); assert(size.w >= max[0] - 1 || size.h >= max[1] - 1); }
      assert.equal(await evaluate('JSON.stringify(NV.screenToGame(400,200))'), before);
      sizes.push(size);
    }
    await win.reload(); await wait(500);
    assert.equal(await evaluate('NV.settings.graphics.resolution'), '1440p');
    await evaluate('NV.settingsUI.open(); document.getElementById("tabGraphics").click(); document.querySelector(".graphics-help").dispatchEvent(new MouseEvent("mouseenter"));');
    assert((await evaluate('document.getElementById("settingsGraphicsHelp").textContent')).includes('Resolución interna'));
    await evaluate('document.querySelector(".graphics-help[data-help^=VSync]").dispatchEvent(new FocusEvent("focus"));');
    assert((await evaluate('document.getElementById("settingsGraphicsHelp").textContent')).includes('VSync'));
    await evaluate('document.querySelectorAll(".graphics-help")[2].click();');
    assert((await evaluate('document.getElementById("settingsGraphicsHelp").textContent')).includes('Completa'));
    await evaluate('NV.setWeaponsVolume(.37); document.getElementById("settingsGraphicsReset").click();');
    assert.equal(await evaluate('NV.settings.graphics.resolution'), 'native');
    assert.equal(await evaluate('NV.settings.audio.weaponsVolume'), .37);
    assert.equal(await evaluate('document.getElementById("tabGraphics").getAttribute("aria-selected")'), 'true');
    await wait(150);
    const bounds = await evaluate(`(()=>{const p=document.getElementById('panelGraphics'),s=p.closest('.settings-tab-panels');return {overflow:p.scrollWidth>p.clientWidth+1,scroll:s.scrollHeight>s.clientHeight};})()`);
    assert.equal(bounds.overflow, false, 'Sin recorte horizontal');
    fs.writeFileSync(path.join(out, mobile ? (height > width ? 'portrait.png' : 'mobile.png') : 'desktop.png'), (await win.webContents.capturePage()).toPNG());
    assert.deepEqual(errors, []);
    reports.push({ width, height, mobile, sizes, bounds }); win.destroy();
  }
  server.close(); fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({ pass: true, reports }, null, 2));
  console.log('PASS gráficos: resolución efectiva/persistencia, ayudas hover/foco/tap, reset y layout PC/móvil'); app.exit(0);
}).catch(error => { console.error(error); app.exit(1); });
