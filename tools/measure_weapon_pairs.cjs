// Mide daño real contra el primer jefe usando el runtime productivo del Combat Lab.
// Node 20 requiere --experimental-websocket. Usa un perfil temporal de Edge.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');

const BASE = process.argv[2] || 'http://localhost:8123';
const OUT = path.resolve(process.argv[3] || 'previews/arsenal-d2');
const EDGE = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9437;
const DURATION = 6;
const WEAPONS = ['pistol', 'smg', 'sniper', 'railgun', 'rifle', 'laser'];
const FUSIONS = [0, 2];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'neon-void-balance-'));

fs.mkdirSync(OUT, { recursive: true });
const browser = spawn(EDGE, [
  '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  '--disable-background-networking', '--disable-gpu', '--autoplay-policy=no-user-gesture-required',
  '--user-data-dir=' + profile, '--remote-debugging-address=127.0.0.1',
  '--remote-debugging-port=' + PORT, 'about:blank',
], { windowsHide: true, stdio: 'ignore' });

let ws;
let nextId = 0;
const pending = new Map();
const runtimeErrors = [];

function send(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 20000);
    pending.set(id, { resolve, reject, timer });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
}

async function until(expression, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await evaluate(expression)) return;
    await sleep(100);
  }
  throw new Error('No se cumplió: ' + expression);
}

(async () => {
  let targets;
  for (let i = 0; i < 100; i++) {
    try { targets = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json(); break; }
    catch (_) { await sleep(150); }
  }
  if (!targets) throw new Error('Edge no inició');
  ws = new WebSocket(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  ws.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const request = pending.get(message.id);
      pending.delete(message.id);
      clearTimeout(request.timer);
      message.error ? request.reject(new Error(JSON.stringify(message.error))) : request.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  });
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: BASE + '/index.html?combatLab=1&fresh=1' });
  await until('window.NV && NV.combatLabRuntime && NV.combatLabRuntime.ready');
  // Sin críticos aleatorios: la comparación mide cadencia, alcance y daño base.
  await evaluate('Math.random = () => 0.99');

  const measurements = [];
  for (const weaponId of WEAPONS) {
    for (const weaponFusion of FUSIONS) {
      const config = { encounterMode: 'boss', bossIndex: 0, characterId: 'boti', difficultyId: 'normal', weaponId, weaponLevel: 25, weaponFusion, firePolicy: 'legacy-auto', durationMode: 'timed', durationSeconds: DURATION };
      const result = await evaluate('NV.combatLabRuntime.start(' + JSON.stringify(config) + ')');
      assert(result && result.ok, JSON.stringify(result));
      await until("NV.combatLabRuntime.snapshot().status === 'COMPLETE'", 15000);
      const data = await evaluate(`(() => {
        const snapshot = NV.combatLabRuntime.snapshot();
        const bosses = snapshot.telemetry && snapshot.telemetry.bosses;
        const report = bosses && (bosses.active || bosses.completed[bosses.completed.length - 1]);
        return { status:snapshot.status, bossHp:snapshot.boss.hp, bossMaxHp:snapshot.boss.maxHp,
          playerHp:snapshot.player.hp, damage:report ? report.damage : 0, hits:report ? report.hits : 0,
          shots:snapshot.telemetry && snapshot.telemetry.weapons.byId[${JSON.stringify(weaponId)}]
            ? snapshot.telemetry.weapons.byId[${JSON.stringify(weaponId)}].shots : 0 };
      })()`);
      const row = { weaponId, weaponLevel: 25, weaponFusion, durationSeconds: DURATION, ...data };
      measurements.push(row);
      console.log('MEASURE ' + weaponId + ' FUS.' + weaponFusion + ': ' + Math.round(row.damage) + ' daño / ' + row.hits + ' impactos');
    }
  }

  assert.equal(runtimeErrors.length, 0, runtimeErrors.join('\n'));
  const byWeapon = Object.fromEntries(WEAPONS.map((weaponId) => {
    const base = measurements.find((row) => row.weaponId === weaponId && row.weaponFusion === 0);
    const fusion = measurements.find((row) => row.weaponId === weaponId && row.weaponFusion === 2);
    return [weaponId, { fusion0Damage: base.damage, fusion2Damage: fusion.damage, gain: base.damage ? fusion.damage / base.damage : null }];
  }));
  fs.writeFileSync(path.join(OUT, 'weapon-pair-measurements.json'), JSON.stringify({
    date: new Date().toISOString(), source: BASE, bossIndex: 0, difficulty: 'normal', durationSeconds: DURATION,
    measurements, byWeapon, runtimeErrors,
  }, null, 2));
  console.log('PASS medición D2 guardada en ' + path.join(OUT, 'weapon-pair-measurements.json'));
})().catch((error) => {
  console.error(error.stack);
  process.exitCode = 1;
}).finally(async () => {
  if (ws && ws.readyState === 1) { try { await send('Browser.close'); } catch (_) {} ws.close(); }
  browser.kill();
});
