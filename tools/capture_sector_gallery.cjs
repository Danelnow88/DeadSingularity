// Galería de amenazas ambientales usando una expedición real y perfil descartable.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const BASE = process.argv[2] || 'http://localhost:8123';
const OUT = path.resolve(process.argv[3] || 'previews/sector-f');
const EDGE = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9441;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'neon-void-sector-gallery-'));
fs.mkdirSync(OUT, { recursive: true });
const browser = spawn(EDGE, ['--headless=new', '--no-first-run', '--disable-extensions', '--disable-background-networking', '--disable-gpu',
  '--autoplay-policy=no-user-gesture-required', '--user-data-dir=' + profile, '--remote-debugging-address=127.0.0.1',
  '--remote-debugging-port=' + PORT, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let ws, nextId = 0, loaded = 0;
const pending = new Map(), errors = [];
function send(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 20000);
    pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}
async function until(expression, timeout = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeout) { if (await evaluate(expression)) return; await sleep(100); }
  throw new Error('No se cumplió: ' + expression);
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(r.data, 'base64'));
}
async function navigate() {
  const before = loaded;
  await send('Page.navigate', { url: BASE + '/index.html?fresh=1' });
  for (let i = 0; i < 100 && loaded === before; i++) await sleep(100);
  await until('window.NV && NV.alpha && document.getElementById("lobbyPlayBtn")');
}
async function startAt(cleared) {
  const saved = await evaluate(`(() => {
    const run=NV.expedition.create('expedition',0); run.cleared=${cleared};
    return NV.expedition.save({version:1,character:'boti',wave:${cleared},run,player:{hp:5000,maxHp:5000,armor:0,xpToNext:100},
      inventory:['railgun'],currentWeapon:'railgun',levels:{railgun:50},kills:{},fus:{railgun:3},consumables:[],shopBought:{},upgradeSlots:[],score:0,shards:0,difficulty:'normal'});
  })()`);
  assert(saved); assert(await evaluate('NV.alpha.resume()'));
  await until('NV.getState()==="playing"');
}
(async () => {
  let targets;
  for (let i = 0; i < 100; i++) { try { targets = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json(); break; } catch (_) { await sleep(150); } }
  if (!targets) throw new Error('Edge no inició');
  ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  ws.addEventListener('message', ({ data }) => {
    const m = JSON.parse(data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); clearTimeout(p.timer); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === 'Page.loadEventFired') loaded++;
  });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  const cases = [{ cleared: 6, slug: 'foundry', wave: 7 }, { cleared: 12, slug: 'fracture', wave: 13 }, { cleared: 16, slug: 'void-heart', wave: 17 }];
  for (const entry of cases) {
    await navigate(); await startAt(entry.cleared);
    assert.equal(await evaluate('NV.alpha.snapshot().wave'), entry.wave);
    await sleep(3200); await shot(entry.slug + '-aviso');
    await sleep(900); await shot(entry.slug + '-activo');
    console.log('CAPTURE ' + entry.slug + ' wave ' + entry.wave);
  }
  assert.equal(errors.length, 0, errors.join('\n'));
  fs.writeFileSync(path.join(OUT, 'sector-report.json'), JSON.stringify({ date: new Date().toISOString(), source: BASE, cases, errors }, null, 2));
  console.log('PASS galería F: 3 sectores / 6 capturas');
})().catch(error => { console.error(error.stack); process.exitCode = 1; }).finally(async () => {
  if (ws && ws.readyState === 1) { try { await send('Browser.close'); } catch (_) {} ws.close(); }
  browser.kill();
});
