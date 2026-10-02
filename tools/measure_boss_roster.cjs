// Matriz reproducible de los diez bosses con tres potencias de arsenal.
// Mide una ventana corta real: daño al boss, impactos, disparos y daño recibido.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const BASE = process.argv[2] || 'http://localhost:8123';
const OUT = path.resolve(process.argv[3] || 'previews/boss-e2');
const EDGE = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9441, DURATION = 4.5;
const fullStory = process.argv.includes('--full-story');
const bossArgument = process.argv.find(a => a.startsWith('--boss-index='));
const selectedBoss = bossArgument ? Number(bossArgument.split('=')[1]) : null;
assert(selectedBoss==null || (Number.isInteger(selectedBoss)&&selectedBoss>=0&&selectedBoss<10),'boss-index válido');
const difficultyArgument = process.argv.find(a=>a.startsWith('--difficulty='));
const storyDifficulty = difficultyArgument ? difficultyArgument.split('=')[1] : 'normal';
assert(['easy','normal','hard'].includes(storyDifficulty),'difficulty válida');
const BUILDS = [
  { id: 'poor', weaponId: 'pistol', weaponLevel: 1, weaponFusion: 0 },
  { id: 'mid', weaponId: 'rifle', weaponLevel: 25, weaponFusion: 0 },
  { id: 'strong', weaponId: 'laser', weaponLevel: 25, weaponFusion: 2 },
];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'neon-void-boss-roster-'));
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
async function until(expression, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) { if (await evaluate(expression)) return; await sleep(100); }
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
  await evaluate('Math.random = () => 0.99');
  const bosses = await evaluate('NV.combatLabRuntime.getBosses()');
  const rows = [];
  if (fullStory) {
    // Checkpoints descartables en la ruta real de Historia, no HP canónico del Lab.
    // El controlador "small-step" sólo oscila 90 px: no es un bot experto ni
    // demuestra que todo contrajuego sea justo. Compara con el paseo informado.
    const builds = process.argv.includes('--matched-builds') ? [
      {id:'smg-matched',weaponId:'smg',weaponLevel:25,weaponFusion:2},
      {id:'rifle-matched',weaponId:'rifle',weaponLevel:25,weaponFusion:2},
      {id:'laser-matched',weaponId:'laser',weaponLevel:25,weaponFusion:2},
    ] : [
      {id:'base',weaponId:'rifle',weaponLevel:1,weaponFusion:0},
      {id:'habitual',weaponId:'rifle',weaponLevel:10,weaponFusion:0},
      {id:'advanced',weaponId:'laser',weaponLevel:25,weaponFusion:2},
    ];
    for(const boss of bosses.filter(b=>selectedBoss==null || b.index===selectedBoss)) {
      for(const build of builds) for(const movement of (process.argv.includes('--small-step-only')?['small-step']:['idle','small-step'])) {
        await send('Page.navigate',{url:BASE+'/index.html'});
        await until('window.NV && NV.alpha && NV.getState()==="menu"');
        const started = await evaluate(`(() => {
          let seed=97531; Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
          const run=NV.expedition.create('expedition',0);run.bossProgression='full-roster';run.cleared=${boss.index*2+1};
          const id=${JSON.stringify(build.weaponId)};
          if(!NV.expedition.save({version:1,character:'boti',wave:${boss.index*2+1},run,
            player:{hp:120,maxHp:120,armor:0,xpToNext:100},inventory:[id],currentWeapon:id,
            levels:{[id]:${build.weaponLevel}},kills:{},fus:{[id]:${build.weaponFusion}},
            consumables:[],shopBought:{},upgradeSlots:[],score:0,shards:0,difficulty:${JSON.stringify(storyDifficulty)}}))return false;
          NV.setFirePolicy('legacy-auto');if(!NV.alpha.resume())return false;
          const b=NV.getBoss(),p=NV.getRuntimeSnapshot().player;
          window.__fullFight={seconds:0,casts:0,phase2:false,startHp:b.maxHp,lastBossHp:b.hp,
            minHp:p.hp,status:'playing',movement:${JSON.stringify(movement)},anchorX:p.x,anchorY:p.y};
          let previous=performance.now();
          const sample=now=>{
            const m=window.__fullFight,s=NV.getRuntimeSnapshot(),b=NV.getBoss();
            m.seconds+=(now-previous)/1000;previous=now;m.status=s.state;m.minHp=Math.min(m.minHp,s.player.hp);
            if(b){m.lastBossHp=Math.max(0,b.hp);m.casts=Math.max(m.casts,b.encounter?b.encounter.cast:0);m.phase2=m.phase2||!!b.phase2;}
            else if(s.state==='shop'||s.state==='shop_enter')m.lastBossHp=0;
            if(m.movement==='small-step'&&s.state==='playing'){
              const target=m.anchorX+(Math.floor(m.seconds/1.5)%2?45:-45);
              NV.input.setMoveLeft(s.player.x>target+4);NV.input.setMoveRight(s.player.x<target-4);
            }
            if(s.state==='playing'&&m.seconds<60)requestAnimationFrame(sample);
            else {NV.input.setMoveLeft(false);NV.input.setMoveRight(false);m.done=true;}
          };requestAnimationFrame(sample);return true;
        })()`);
        assert(started,'checkpoint real inició');
        await until('window.__fullFight && window.__fullFight.done',70000);
        const result=await evaluate('window.__fullFight');
        const outcome=result.lastBossHp<=0?'victory':result.status==='player_dying'||result.status==='gameover'?'defeat':'timeout';
        const row={bossIndex:boss.index,bossName:boss.name,storyWave:boss.index*2+2,...build,movement,...result,outcome};
        rows.push(row);
        fs.writeFileSync(path.join(OUT,'full-story-fights.json'),JSON.stringify({source:BASE,difficulty:storyDifficulty,autoattack:true,
          maxSeconds:60,player:'boti 120 HP, sin mejoras/consumibles/especial',rows,errors},null,2));
        console.log('FIGHT '+boss.name+' / '+build.id+' / '+movement+': '+result.status+' '+result.seconds.toFixed(1)+'s · '+result.casts+' ataques · '+result.minHp+' HP');
      }
    }
    assert.equal(errors.length,0,errors.join('\n'));return;
  }
  for (const boss of bosses) {
    for (const build of BUILDS) {
      const config = { encounterMode: 'boss', bossIndex: boss.index, characterId: 'rook', difficultyId: 'normal', weaponId: build.weaponId, weaponLevel: build.weaponLevel, weaponFusion: build.weaponFusion, firePolicy: 'legacy-auto', durationMode: 'timed', durationSeconds: DURATION };
      const started = await evaluate('NV.combatLabRuntime.start(' + JSON.stringify(config) + ')');
      assert(started && started.ok, JSON.stringify(started));
      await until("NV.combatLabRuntime.snapshot().status !== 'RUNNING'", 12000);
      const data = await evaluate(`(() => {
        const s=NV.combatLabRuntime.snapshot(), b=s.telemetry && s.telemetry.bosses;
        const r=b && (b.active || b.completed[b.completed.length-1]);
        const w=s.telemetry && s.telemetry.weapons.byId[${JSON.stringify(build.weaponId)}];
        return {status:s.status,bossHp:s.boss.hp,bossMaxHp:s.boss.maxHp,playerHp:s.player.hp,playerMaxHp:s.player.maxHp,damage:r?r.damage:0,hits:r?r.hits:0,shots:w?w.shots:0};
      })()`);
      const row = { bossIndex: boss.index, bossName: boss.name, attack: boss.attack, canonicalWave: boss.canonicalWave, build: build.id, ...build, durationSeconds: DURATION, ...data };
      row.bossDamagePercent = row.bossMaxHp ? row.damage / row.bossMaxHp * 100 : 0;
      row.playerDamage = row.playerMaxHp - row.playerHp;
      rows.push(row);
      console.log('MEASURE ' + String(boss.index + 1).padStart(2, '0') + ' ' + boss.name + ' / ' + build.id + ': ' + row.bossDamagePercent.toFixed(1) + '% boss · ' + row.playerDamage + ' HP jugador');
    }
  }
  assert.equal(errors.length, 0, errors.join('\n'));
  const summary = bosses.map((boss) => ({ bossIndex: boss.index, bossName: boss.name, rows: rows.filter((row) => row.bossIndex === boss.index).map((row) => ({ build: row.build, bossDamagePercent: row.bossDamagePercent, playerDamage: row.playerDamage, hits: row.hits, shots: row.shots, status: row.status })) }));
  fs.writeFileSync(path.join(OUT, 'boss-roster-measurements.json'), JSON.stringify({ date: new Date().toISOString(), source: BASE, durationSeconds: DURATION, builds: BUILDS, rows, summary, errors }, null, 2));
  console.log('PASS matriz E2: ' + bosses.length + ' bosses / ' + rows.length + ' escenarios');
})().catch((error) => { console.error(error.stack); process.exitCode = 1; }).finally(async () => {
  if (ws && ws.readyState === 1) { try { await send('Browser.close'); } catch (_) {} ws.close(); }
  browser.kill();
});
