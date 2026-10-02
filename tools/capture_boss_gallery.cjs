// Galería de los diez bosses en ambas fases, usando el runtime productivo.
// Node 20 requiere --experimental-websocket. No usa el perfil del usuario.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const BASE = process.argv[2] || 'http://localhost:8123';
const OUT = path.resolve(process.argv[3] || 'previews/boss-e1');
const EDGE = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9439;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'neon-void-boss-gallery-'));
fs.mkdirSync(OUT, { recursive: true });
const browser = spawn(EDGE, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-background-networking', '--disable-gpu', '--autoplay-policy=no-user-gesture-required', '--user-data-dir=' + profile, '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=' + PORT, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let ws, nextId = 0;
const pending = new Map(), errors = [];
function send(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 20000);
    pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
}
async function until(expression, timeout = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeout) { if (await evaluate(expression)) return; await sleep(100); }
  throw new Error('No se cumplió: ' + expression);
}
async function shot(name) {
  const response = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(response.data, 'base64'));
}
(async () => {
  let targets;
  for (let i = 0; i < 100; i++) {
    try { targets = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json(); break; }
    catch (_) { await sleep(150); }
  }
  if (!targets) throw new Error('Edge no inició');
  ws = new WebSocket(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  ws.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const request = pending.get(message.id); pending.delete(message.id); clearTimeout(request.timer);
      message.error ? request.reject(new Error(JSON.stringify(message.error))) : request.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: BASE + '/index.html?combatLab=1&fresh=1' });
  await until('window.NV && NV.combatLabRuntime && NV.combatLabRuntime.ready');
  const bosses = await evaluate('NV.combatLabRuntime.getBosses()');
  const report = [];
  for (const entry of bosses) {
    const config = { encounterMode: 'boss', bossIndex: entry.index, characterId: 'rook', difficultyId: 'normal', weaponId: 'pistol', weaponLevel: 1, weaponFusion: 0, firePolicy: 'manual', durationMode: 'infinite' };
    const start = await evaluate('NV.combatLabRuntime.start(' + JSON.stringify(config) + ')');
    assert(start && start.ok, JSON.stringify(start));
    await sleep(1050);
    const slug = String(entry.index + 1).padStart(2, '0');
    await shot(slug + '-fase-1');
    await evaluate('NV.getBoss().hp = NV.getBoss().maxHp * 0.49');
    await until('NV.getBoss() && NV.getBoss().phase2 === true');
    await sleep(1050);
    await shot(slug + '-fase-2');
    const snapshot = await evaluate('NV.combatLabRuntime.snapshot()');
    report.push({ index: entry.index, name: entry.name, attack: entry.attack, pattern: entry.pattern, canonicalWave: entry.canonicalWave, phase2: snapshot.boss.phase2, hp: snapshot.boss.hp, playerHp: snapshot.player.hp });
    console.log('CAPTURE ' + slug + ' ' + entry.name + ' · ' + entry.attack);
  }
  assert.equal(errors.length, 0, errors.join('\n'));
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ date: new Date().toISOString(), source: BASE, bosses: report, errors }, null, 2));
  console.log('PASS galería E1: ' + bosses.length + ' bosses / 20 capturas');
})().catch((error) => { console.error(error.stack); process.exitCode = 1; }).finally(async () => {
  if (ws && ws.readyState === 1) { try { await send('Browser.close'); } catch (_) {} ws.close(); }
  browser.kill();
});
