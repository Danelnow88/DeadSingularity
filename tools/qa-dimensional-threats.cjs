'use strict';
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const mobile = process.argv.includes('--mobile');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'local/validation/dimensional-threats' + (mobile ? '-mobile' : ''));
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'ds-threats-')));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  fs.mkdirSync(out, { recursive: true });
  const win = new BrowserWindow({ width: mobile ? 844 : 1200, height: mobile ? 390 : 800, show: false,
    webPreferences: { offscreen: true, backgroundThrottling: false, sandbox: true, contextIsolation: true } });
  const errors = [];
  win.webContents.on('console-message', details => { if (details.level === 'error') errors.push(details.message); });
  const evaluate = code => win.webContents.executeJavaScript(code, true);
  await win.loadFile(path.join(root, 'index.html'), { query: { fresh: '1', combatLab: '1', ...(mobile ? { mobile: '1' } : {}) } });
  await delay(700);
  await evaluate(`
    NV.setFirePolicy('manual');
    window.qaHits = []; window.qaOwners = [];
    Object.defineProperty(window, 'qaThreats', {get() {
      return window.qaOwners.filter(e => !e.dead && !e.killResolved && !e.waveCleanup)
        .map(e => ({id:e.enemyTypeId,x:e.x,y:e.y,threat:e.dimensionalThreat}));
    }});
    const original = NV.updateEnemies;
    NV.updateEnemies = function(dt, st) {
      const apply = st.applyPlayerDamage;
      st.applyPlayerDamage = function(amount, opts) {
        const result = apply(amount, opts); window.qaHits.push({cause: opts.cause, applied: result.applied}); return result;
      };
      const result = original(dt, st);
      window.qaOwners = st.enemies.filter(e => NV.isDimensionalThreat(e));
      return result;
    };
    true;
  `);
  const start = await evaluate(`NV.combatLabRuntime.start({characterId:'rook',wave:4,difficultyId:'normal',durationMode:'infinite',durationSeconds:null,
    composition:[{enemyId:'rift_weaver',quantity:1},{enemyId:'void_devourer',quantity:1},{enemyId:'dimension_sniper',quantity:1}]})`);
  assert(start.ok, JSON.stringify(start));
  const seen = new Set(); let pauseChecked = false;
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline && seen.size < 6) {
    const sample = await evaluate('({runtime:NV.getRuntimeSnapshot(),enemies:window.qaThreats,hits:window.qaHits})');
    assert.equal(sample.runtime.state, 'playing', 'encuentro terminó antes de observar los tres ataques');
    const attacks = sample.enemies.filter(e => e.threat && ['windup','active'].includes(e.threat.phase) && e.threat.kind !== 'devour');
    assert(attacks.length <= 1, 'avisos de corte y francotirador simultáneos');
    for (const e of sample.enemies) {
      const s = e.threat; if (!s || !['windup','active'].includes(s.phase)) continue;
      const key = e.id + '-' + s.phase;
      if (!seen.has(key)) {
        seen.add(key);
        fs.writeFileSync(path.join(out, key + '.png'), (await win.webContents.capturePage()).toPNG());
        console.log('CAPTURE', key);
      }
      if (!pauseChecked && s.phase === 'windup') {
        await evaluate('NV.combatLabRuntime.pause()');
        const before = await evaluate('JSON.stringify(window.qaThreats)'); await delay(250);
        assert.equal(await evaluate('JSON.stringify(window.qaThreats)'), before, 'animación avanza en pausa');
        await evaluate('NV.combatLabRuntime.resume()'); pauseChecked = true;
      }
    }
    await delay(20);
  }
  assert.equal(seen.size, 6, 'faltan preparaciones/ataques');
  // Capturar el comienzo del ataque no implica que el proyectil ya haya llegado.
  await delay(1400);
  const final = await evaluate('({runtime:NV.getRuntimeSnapshot(),enemies:window.qaThreats,hits:window.qaHits})');
  // En el encuentro mixto la invulnerabilidad tras la mordida puede bloquear el corte.
  // El contrato es conexión física; el daño aislado se comprueba en dimensional_threats.
  assert(final.hits.some(hit => hit.cause === 'dimensional-cut'));
  assert(final.hits.some(hit => hit.cause === 'dimensional-snipe'));
  assert(final.hits.some(hit => hit.applied), 'el encuentro no inflige daño real');
  assert(pauseChecked); assert.deepEqual(errors, []);
  // Resolver el encuentro con arma real: nada de marcar enemigos dead desde QA.
  await evaluate("NV.setFirePolicy('legacy-auto'); NV.input.setFire(true);");
  const killStart = Date.now(), killDeadline = killStart + 40000;
  const arena = final.runtime.arena;
  const route = [[arena.width/2-190,arena.height/2-170],[arena.width/2+190,arena.height/2-170],
    [arena.width/2+190,arena.height/2+170],[arena.width/2-190,arena.height/2+170]];
  let waypoint = 0, compressionCaptured = false;
  while (Date.now() < killDeadline && (await evaluate('NV.getRuntimeSnapshot()')).enemies > 0) {
    const s = await evaluate('NV.getRuntimeSnapshot()'), [x,y] = route[waypoint];
    if(Math.hypot(s.player.x-x,s.player.y-y)<24) waypoint=(waypoint+1)%4;
    await evaluate(`NV.input.setMoveLeft(${s.player.x>x+8});NV.input.setMoveRight(${s.player.x<x-8});NV.input.setMoveUp(${s.player.y>y+8});NV.input.setMoveDown(${s.player.y<y-8});`);
    if(!compressionCaptured && await evaluate("window.qaThreats.some(e=>e.threat&&e.threat.kind==='devour'&&e.threat.phase==='active'&&e.threat.elapsed>2.5)")) {
      fs.writeFileSync(path.join(out,'compression.png'),(await win.webContents.capturePage()).toPNG()); compressionCaptured=true;
    }
    await delay(80);
  }
  const cleared = await evaluate('({runtime:NV.getRuntimeSnapshot(),enemies:window.qaThreats})');
  if(cleared.runtime.enemies) fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify(cleared,null,2));
  assert.equal(cleared.runtime.enemies, 0, 'arma real no pudo limpiar el encuentro');
  assert.equal(cleared.enemies.length, 0, 'geometría retenida después de las bajas');
  fs.writeFileSync(path.join(out, 'cleared.png'), (await win.webContents.capturePage()).toPNG());
  await evaluate('NV.combatLabRuntime.reset()'); await delay(200);
  assert.equal((await evaluate('NV.getRuntimeSnapshot()')).enemies, 0, 'reset retuvo amenazas');
  fs.writeFileSync(path.join(out, 'runtime.json'), JSON.stringify({pass:true,mobile,seen:[...seen],pauseChecked,final,cleared,errors}, null, 2));
  console.log('PASS amenazas reales: tres identidades, seis fases, daño, pausa, bajas reales y reset'); app.exit(0);
}).catch(error => { console.error(error); app.exit(1); });
