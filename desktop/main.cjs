// Contenedor Windows: la misma versión web, aislada y sin acceso Node desde el juego.
const { app, BrowserWindow, Menu, protocol, net, session } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const QA = process.argv.includes('--nv-qa');
const PERIMETER_QA = QA && process.argv.includes('--nv-perimeter-qa');
const ARENA_QA = QA && process.argv.includes('--nv-arena-qa');
const DASH_QA = QA && process.argv.includes('--nv-dash-qa');
const SPECIAL_QA = QA && process.argv.includes('--nv-special-qa');
const PILOT_QA = QA && process.argv.includes('--nv-pilot-qa');
const QA_REPORT = (process.argv.find(arg => arg.startsWith('--nv-qa-report=')) || '').slice('--nv-qa-report='.length);
const ROOT = path.resolve(__dirname, '..');
if (QA) app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'neon-void-desktop-qa-')));
protocol.registerSchemesAsPrivileged([{ scheme: 'nvgame', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
app.setName('NEON VOID');
app.setAppUserModelId('com.neonvoid.game');
if (!QA && !app.requestSingleInstanceLock()) app.quit();
let win;
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(async () => {
  protocol.handle('nvgame', request => {
    const url = new URL(request.url);
    if (url.host !== 'game') return new Response('Forbidden', { status: 403 });
    let requested;
    try { requested = decodeURIComponent(url.pathname); } catch (_) { return new Response('Bad request', { status: 400 }); }
    const file = path.resolve(ROOT, '.' + (requested === '/' ? '/index.html' : requested));
    const relative = path.relative(ROOT, file);
    // Lista permitida; ni el navegador ni un enlace pueden leer archivos del sistema.
    if (relative.startsWith('..') || path.isAbsolute(relative) || !(relative === 'index.html' || /^(js|css|assets)[\\/]/.test(relative))) return new Response('Forbidden', { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    // No publicidad, telemetría, navegación externa ni CDN en la entrega offline.
    callback({ cancel: !/^(nvgame:|file:|data:|blob:)/.test(details.url) });
  });
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => callback({ responseHeaders: {
    ...details.responseHeaders,
    'Content-Security-Policy': ["default-src 'self' data: blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-src 'none'"],
  } }));
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({ title: 'NEON VOID — Alpha', width: 1280, height: 800, minWidth: 800, minHeight: 520,
    backgroundColor: '#040916', show: !QA, autoHideMenuBar: true,
    icon: path.join(ROOT, 'assets', 'brand', 'neon-void-mark.svg'),
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, backgroundThrottling: !QA, offscreen: QA, devTools: QA } });
  const errors = [];
  if (QA) {
    // QA usa área CLIENTE conocida para comparar las mismas cajas que en web.
    // No cambia el tamaño ni el comportamiento de la ventana del jugador.
    if (PERIMETER_QA || ARENA_QA || DASH_QA || SPECIAL_QA) win.setContentSize(1280, 800);
    win.webContents.on('console-message', event => { if (event.level === 'error') errors.push(event.message); });
    win.webContents.setFrameRate(60);
  }
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => { if (!url.startsWith('nvgame://game/')) event.preventDefault(); });
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') { event.preventDefault(); win.setFullScreen(!win.isFullScreen()); }
    if (input.key === 'Escape' && win.isFullScreen()) win.setFullScreen(false);
  });
  await win.loadURL('nvgame://game/index.html');
  if (QA) {
    const first = await win.webContents.executeJavaScript('({state:NV.getState(),version:NV.alpha.version,node:typeof require})');
    if (first.state !== 'menu' || first.node !== 'undefined') throw new Error('Inicio o aislamiento inválido: ' + JSON.stringify(first));
    // Comprueba el almacenamiento del protocolo empaquetado: antes solo se
    // probaba el inicio, por eso un fallo de Guardar podía escapar al QA.
    const saved = await win.webContents.executeJavaScript(`(() => {
      const run = NV.expedition.create('expedition', 0);
      const data = { version:1, character:'boti', wave:1, run,
        player:{ hp:120, maxHp:120, xpToNext:100 }, inventory:['pistol'], currentWeapon:'pistol',
        levels:{ pistol:1 }, kills:{}, fus:{}, consumables:[], shopBought:{}, upgradeSlots:[],
        score:0, shards:0, difficulty:'normal' };
      return NV.expedition.save(data) && NV.expedition.load()?.wave === 1;
    })()`);
    if (!saved) throw new Error('Checkpoint no persiste dentro de la app Windows');
    await win.webContents.executeJavaScript('NV.expedition.clear()');
    await win.webContents.executeJavaScript('document.getElementById("lobbyPlayBtn").click()', true);
    await new Promise(r => setTimeout(r, 1600));
    const playing = await win.webContents.executeJavaScript('NV.getRuntimeSnapshot()');
    if (playing.state !== 'playing' || playing.frame < 5 || !Number.isFinite(playing.player.hp)) throw new Error('Partida no avanza: ' + JSON.stringify(playing));
    const diagnostics = await win.webContents.executeJavaScript(`({
      performance: NV.performanceMonitor && NV.performanceMonitor.getSnapshot ? NV.performanceMonitor.getSnapshot() : null,
      memory: performance.memory ? { usedJSHeapSize: performance.memory.usedJSHeapSize, totalJSHeapSize: performance.memory.totalJSHeapSize, jsHeapSizeLimit: performance.memory.jsHeapSizeLimit } : null,
      visualBudget: NV.getVisualBudget ? NV.getVisualBudget() : null
    })`);
    const perimeter = PERIMETER_QA ? await verifyPerimeter(win, QA_REPORT) : null;
    const arena = ARENA_QA ? await verifyArenaAdaptation(win, QA_REPORT) : null;
    const dash = DASH_QA ? await verifyDashTrail(win, QA_REPORT) : null;
    const specials = SPECIAL_QA ? await require('./special-qa.cjs')(
      code => win.webContents.executeJavaScript(code,true),
      async(name,url)=>{if(QA_REPORT)fs.writeFileSync(path.join(path.dirname(QA_REPORT),'electron-'+name+'.png'),Buffer.from(url.split(',')[1],'base64'));}) : null;
    const pilots = PILOT_QA ? await require('./pilot-qa.cjs')(
      code => win.webContents.executeJavaScript(code,true),
      async(name,url)=>{if(QA_REPORT)fs.writeFileSync(path.join(path.dirname(QA_REPORT),'electron-'+name+'.png'),Buffer.from(url.split(',')[1],'base64'));}) : null;
    const report = { pass: errors.length === 0, first, saved, playing, diagnostics, perimeter, arena, dash, specials, pilots, errors };
    if (QA_REPORT) fs.writeFileSync(QA_REPORT, JSON.stringify(report, null, 2));
    console.log('DESKTOP_QA ' + JSON.stringify(report));
    app.exit(errors.length ? 1 : 0);
  }
}).catch(error => { console.error(error.stack); app.exit(1); });
app.on('window-all-closed', () => app.quit());

// QA del EXE empaquetado: usa entrada y loop reales, sólo en perfil aislado QA.
async function verifyDashTrail(window, reportPath) {
  const evaluate=code=>window.webContents.executeJavaScript(code,true);
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),cases=[];
  for(const [character,quality] of [['boti','high'],['nova','high'],['rook','high'],['swarm','high'],['boti','performance']]) {
    await window.loadURL('nvgame://game/index.html');
    await evaluate(`(() => {
      const run=NV.expedition.create('expedition',0);run.cleared=1;
      if(!NV.expedition.save({version:1,character:'${character}',wave:1,run,
        player:{hp:5000,maxHp:5000,xpToNext:100},inventory:['pistol'],currentWeapon:'pistol',levels:{pistol:1},
        kills:{},fus:{},consumables:[],shopBought:{},upgradeSlots:[],score:0,shards:0,difficulty:'normal'}))throw new Error('fixture dash');
      NV.alpha.resume();NV.settings.graphics.quality='${quality}';NV.resetVisualBudget();
    })()`);
    for(let i=0;i<40;i++){if(await evaluate('NV.getState()==="playing"'))break;await wait(80);}
    await evaluate('NV.input.setMoveRight(true)');await wait(300);
    if(await evaluate('NV.getRuntimeSnapshot().dashTrail.count')!==0)throw new Error('estrellas durante caminar');
    await evaluate('NV.input.setMoveDown(true);NV.input.setSlide(true)');await wait(130);
    const image=await evaluate('NV.input.togglePause();document.getElementById("game").toDataURL()');
    const s=await evaluate('({runtime:NV.getRuntimeSnapshot(),budget:NV.getVisualBudget(),performance:NV.performanceMonitor.getSnapshot()})');
    if(s.runtime.dashTrail.count<8||s.runtime.dashTrail.count>96)throw new Error('dash no visible / cap');
    if(reportPath)fs.writeFileSync(path.join(path.dirname(reportPath),'electron-dash-'+character+'-'+quality+'.png'),Buffer.from(image.split(',')[1],'base64'));
    await evaluate('NV.input.setSlide(false);NV.input.setMoveRight(false);NV.input.setMoveDown(false);NV.input.togglePause()');
    await wait(650);if(await evaluate('NV.getRuntimeSnapshot().dashTrail.count')!==0)throw new Error('estela no expira');
    cases.push({character,quality,...s});
  }
  return {pass:true,cases};
}

// QA adicional sobre el EXE final: protocol/storage/render y presión integrada.
// No existe en la partida del usuario, no modifica preferencias ni su guardado.
async function verifyArenaAdaptation(window, reportPath) {
  const evaluate = code => window.webContents.executeJavaScript(code, true);
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const cases=[];
  for(const difficulty of ['easy','normal','hard']) {
    await window.loadURL('nvgame://game/index.html');
    await evaluate(`(() => {
      const run=NV.expedition.create('expedition',0);run.bossProgression='full-roster';run.cleared=7;
      if(!NV.expedition.save({version:1,character:'rook',wave:7,run,
        player:{hp:5000,maxHp:5000,xpToNext:100},inventory:['pistol'],currentWeapon:'pistol',
        levels:{pistol:1},kills:{},fus:{},consumables:[],shopBought:{},upgradeSlots:[],
        score:0,shards:0,difficulty:'${difficulty}'}))throw new Error('No guarda fixture arena');
      NV.alpha.resume();
    })()`);
    const samples=[];let sawActive=false,sawSupport=false,sawPhase2=false;
    for(let i=0;i<80;i++) {
      if(i===8)await evaluate('NV.input.setMoveRight(true)');
      if(i===22)await evaluate('NV.input.setMoveRight(false);NV.input.setMoveDown(true)');
      if(i===32)await evaluate('NV.input.setMoveDown(false);NV.input.setMoveLeft(true)');
      if(i===45)await evaluate('NV.input.setMoveLeft(false);NV.getBoss().hp=NV.getBoss().maxHp*.49'); // fase 2 diagnóstica, no balance natural
      await wait(200);
      const sample=await evaluate(`({s:NV.getRuntimeSnapshot(),m:{...NV.worldMetrics},boss:NV.getBoss()&&{
        x:NV.getBoss().x,y:NV.getBoss().y,stage:NV.getBoss().encounter?.stage,cast:NV.getBoss().encounter?.cast,phase2:NV.getBoss().phase2}})`);
      const {s,m,boss}=sample;
      if(s.state!=='playing'||!boss||m.arenaW!==1350||m.arenaH!==780||s.outsideEnemies!==0
        ||s.hostileBudget.hostiles>30||s.hostileBudget.heavy>7)throw new Error('Arena Electron inválida '+JSON.stringify(sample));
      sawSupport ||= s.enemies>0;sawPhase2 ||= !!boss.phase2;
      for(const h of s.sectorHazards) {
        if(h.W!==m.arenaW||h.H!==m.arenaH)throw new Error('Láser usa bounds equivocados');
        if((h.state==='telegraph'||h.state==='active')&&boss.stage!=='recovery')throw new Error('Cast y láser se superponen');
      }
      if(s.sectorHazards.some(h=>h.state==='active')&&!sawActive) {
        sawActive=true;
        if(reportPath)fs.writeFileSync(path.join(path.dirname(reportPath),'electron-boss-laser-'+difficulty+'.png'),(await window.webContents.capturePage()).toPNG());
      }
      samples.push(sample);
    }
    if(!sawActive||!sawSupport||!sawPhase2||!samples.some(s=>s.boss.cast>0))throw new Error('QA integrado incompleto '+difficulty);
    cases.push({difficulty,sawActive,sawSupport,sawPhase2,samples,performance:await evaluate('NV.performanceMonitor.getSnapshot()')});
  }
  return {pass:true,cases};
}

// Prueba opcional de la entrega real: movimiento por el input público, nunca
// setters de posición/cámara. Sólo se ejecuta con perfil descartable --nv-qa.
async function verifyPerimeter(window, reportPath) {
  const evaluate = code => window.webContents.executeJavaScript(code, true);
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const samples = [], stages = [];
  const layout = await evaluate(`(() => {
    const result={width:innerWidth,height:innerHeight};
    for(const selector of ['.hud','.game-box','#game']) {
      const r=document.querySelector(selector).getBoundingClientRect(),s=getComputedStyle(document.querySelector(selector));
      result[selector]={x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,border:s.borderWidth,radius:s.borderRadius};
    }
    return result;
  })()`);
  if (layout['#game'].x !== 0 || layout['#game'].right !== layout.width || layout['#game'].bottom !== layout.height
    || layout['#game'].y !== 64 || layout['.game-box'].border !== '0px' || layout['.game-box'].radius !== '0px'
    || layout['.hud'].x !== 10 || layout['.hud'].y !== 10 || layout['.hud'].height !== 46) {
    throw new Error('Layout/perímetro desktop inválido: '+JSON.stringify(layout));
  }
  async function fixture(wave, progression) {
    // Recarga a menú por el mismo protocolo; resume rechaza estados de combate.
    await window.loadURL('nvgame://game/index.html');
    await evaluate(`(() => {
      const run=NV.expedition.create('expedition',0);run.bossProgression='${progression}';run.cleared=${wave};
      if(!NV.expedition.save({version:1,character:'boti',wave:${wave},run,
        player:{hp:5000,maxHp:5000,xpToNext:100},inventory:['pistol','railgun'],currentWeapon:'railgun',
        levels:{pistol:3,railgun:50},kills:{},fus:{railgun:3},consumables:[],shopBought:{},upgradeSlots:[],
        score:0,shards:0,difficulty:'normal'}))throw new Error('No guarda fixture perímetro');
      NV.setFirePolicy('manual');NV.alpha.resume();
    })()`);
    await wait(200);
    if(await evaluate('NV.getState()')!=='playing')throw new Error('No reanuda fixture perímetro');
  }
  async function go(x,y) {
    for(const [axis,target,negative,positive] of [['x',x,'Left','Right'],['y',y,'Up','Down']]) {
      const current=await evaluate('NV.getRuntimeSnapshot().player.'+axis);
      if(Math.abs(current-target)<3)continue;
      const increasing=target>current,dir=increasing?positive:negative,start=Date.now();
      await evaluate('NV.input.setMove'+dir+'(true)');
      try {
        while(!await evaluate('NV.getRuntimeSnapshot().player.'+axis+(increasing?'>=':'<=')+target)) {
          if(Date.now()-start>14000)throw new Error('Movimiento desktop no alcanza '+axis+'='+target);
          await wait(80);
        }
      } finally {await evaluate('NV.input.setMove'+dir+'(false)');}
      await wait(120);
    }
  }
  async function capture(name) {
    if(!reportPath)return;
    const screenshot=await window.webContents.capturePage();
    fs.writeFileSync(path.join(path.dirname(reportPath),'electron-'+name+'.png'),screenshot.toPNG());
  }
  async function sample(name) {
    const s=await evaluate(`({state:NV.getState(),p:NV.getRuntimeSnapshot().player,m:{...NV.worldMetrics},
      padding:NV.viewport.cameraExteriorPadding,stats:NV.getSectorBackdropStats()})`);
    const {m,p,padding:P}=s;
    if(s.state!=='playing'||P!==28||m.arenaW!==1350||m.arenaH!==780
      ||p.x<20||p.x>m.arenaW-20||p.y<30||p.y>m.arenaH-20
      ||Math.abs(m.viewX-Math.max(-P,Math.min(m.arenaW-m.viewW+P,p.x-m.viewW/2)))>1e-6
      ||Math.abs(m.viewY-Math.max(-P,Math.min(m.arenaH-m.viewH+P,p.y-m.viewH/2)))>1e-6) {
      throw new Error('Bounds/cámara desktop inválidos: '+JSON.stringify(s));
    }
    await capture(name);return {name,...s};
  }
  await fixture(1,'legacy');
  const m=await evaluate('({...NV.worldMetrics})');
  for(const [name,x,y] of [['centro',m.arenaW/2,m.arenaH/2],['izquierda',20,m.arenaH/2],
    ['superior-izquierda',20,30],['arriba',m.arenaW/2,30],['superior-derecha',m.arenaW-20,30],
    ['derecha',m.arenaW-20,m.arenaH/2],['inferior-derecha',m.arenaW-20,m.arenaH-20],
    ['abajo',m.arenaW/2,m.arenaH-20],['inferior-izquierda',20,m.arenaH-20]]) {
    await go(x,y);samples.push(await sample(name));
  }
  if(!samples.every(s=>s.stats.perimeterBuilds===samples[0].stats.perimeterBuilds))throw new Error('Cache se regenera al mover cámara');
  for(const wave of [6,11,16]) {
    await fixture(wave-1,'full-roster');await go(m.arenaW-20,30);stages.push(await sample('stage-'+wave));
  }
  return {pass:true,layout,samples,stages};
}
