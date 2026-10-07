// Prueba real de navegador, sin dependencias npm. Node 20: --experimental-websocket.
// Usa un perfil descartable: nunca abre ni modifica el perfil del usuario.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const BASE = process.argv[2] || 'http://localhost:8123';
const OUT = path.resolve(process.argv[3] || 'previews/alpha-verification');
const EDGE = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
// Permite pruebas simultáneas de otras tareas sin compartir navegador/perfil CDP.
const port = Number((process.argv.find(arg=>arg.startsWith('--port='))||'--port=9435').slice(7));
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Puerto CDP inválido');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'neon-void-qa-'));
fs.mkdirSync(OUT, { recursive: true });
const browser = spawn(EDGE, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-background-networking', '--disable-gpu', '--autoplay-policy=no-user-gesture-required', '--user-data-dir=' + profile, '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=' + port, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const errors = [], network = [], report = [];
let ws, nextId = 0, loadSequence = 0;
const pending = new Map();
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
  while (Date.now() - start < timeout) { if (await evaluate(expression)) return; await sleep(150); }
  throw new Error('No se cumplió: ' + expression + '\n' + JSON.stringify(await evaluate('NV.alpha && NV.alpha.snapshot()')));
}
async function shot(name) { const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(r.data, 'base64')); }
async function navigate(suffix = '') {
  const before = loadSequence;
  await send('Page.navigate', { url: BASE + '/index.html' + suffix });
  for (let i = 0; i < 100 && loadSequence === before; i++) await sleep(100);
  assert(loadSequence > before, 'navegación terminó');
  await until(suffix.includes('combatLab=1')
    ? 'window.NV && NV.combatLabRuntime && NV.combatLabRuntime.ready'
    : (process.argv.includes('--pilot-concept') || process.argv.includes('--pilot-stability') || process.argv.includes('--pilot-canonical-capture') || process.argv.includes('--pilot-canonical') || process.argv.includes('--pilot-approved-capture'))
      ? 'window.pilotConcept && document.getElementById("comparison")'
      : 'window.NV && NV.alpha && document.querySelector(".alpha-launch")');
}
function ok(name, data) { report.push({ name, pass: true, data }); console.log('PASS ' + name); }
// Medir el DOM real: distingue padding/border del contenedor de margen de cámara.
async function layoutSnapshot() {
  return evaluate(`(() => {
    const result={width:innerWidth,height:innerHeight,state:NV.getState(),mobile:NV.viewport.isMobile};
    for(const selector of ['.shell','.hud','.game-box','#game']) {
      const element=document.querySelector(selector),r=element.getBoundingClientRect(),s=getComputedStyle(element);
      result[selector]={x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,
        padding:[s.paddingTop,s.paddingRight,s.paddingBottom,s.paddingLeft],border:s.borderWidth,radius:s.borderRadius};
    }
    result.metrics={...NV.worldMetrics};result.padding=NV.viewport.cameraExteriorPadding;
    return result;
  })()`);
}
function assertPresentationLayout(layout) {
  const c=layout['#game'],box=layout['.game-box'];
  assert.equal(layout.padding,28);
  // El HUD histórico ya no ocupa una franja. Canvas y caja usan todo el viewport;
  // worldMetrics/bounds siguen siendo independientes de esta presentación.
  assert.equal(c.x,0);assert.equal(c.y,0);assert.equal(c.right,layout.width);assert.equal(c.bottom,layout.height);
  assert.equal(c.width,box.width);assert.equal(c.height,box.height);
  assert.equal(box.border,'0px');assert.equal(box.radius,'0px');
  assert.equal(layout.metrics.arenaW,1350);assert.equal(layout.metrics.arenaH,780);
}
async function fixture(wave, hp = 5000, progression = 'legacy', traversal = false, options = {}) {
  return evaluate(`(() => {
    const run = NV.expedition.create('expedition', 0); run.bossProgression = '${progression}'; run.cleared = ${wave};
    const data = { version: 1, character: 'boti', wave: ${wave}, run, player: { hp: ${hp}, maxHp: 5000, armor: 0, xpToNext: 100 },
      inventory: ${traversal ? "['pistol']" : "['pistol', 'rifle', 'railgun']"}, currentWeapon: '${traversal ? 'pistol' : 'railgun'}',
      levels: ${traversal ? '{pistol:1}' : '{pistol:3,rifle:30,railgun:50}'}, kills: {}, fus: ${traversal ? '{}' : '{railgun:3}'},
      consumables: [{ type: 'potion' }], shopBought: {}, upgradeSlots: [], score: 1234, shards: 250, difficulty: 'normal' };
    return NV.expedition.save(Object.assign(data, ${JSON.stringify(options)}));
  })()`);
}
(async () => {
  let targets;
  for (let n = 0; n < 100; n++) { try { targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json(); break; } catch (_) { await sleep(150); } }
  if (!targets) throw new Error('Edge no inició');
  ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  ws.addEventListener('message', ({ data }) => {
    const m = JSON.parse(data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); clearTimeout(p.timer); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === 'Page.loadEventFired') loadSequence++;
    if (m.method === 'Network.requestWillBeSent') network.push(m.params.request.url);
  });
  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await navigate();
  if(process.argv.includes('--mobile-polish')) {
    const results=[];
    for(const [width,height] of [[640,360],[844,390],[915,412],[1024,600],[360,800],[412,915]]){
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:true});
      await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
      await navigate('?mobile=1');
      await until('document.querySelectorAll(".mobile-lobby-tabs button").length===3');
      for(const tab of [0,1,2]){
        await evaluate(`document.querySelectorAll('.mobile-lobby-tabs button')[${tab}].click()`);
        const layout=await evaluate(`({w:innerWidth,h:innerHeight,scroll:document.documentElement.scrollWidth,tab:document.getElementById('startScreen').dataset.mobileTab})`);
        assert(layout.scroll<=width+1,'overflow lobby '+JSON.stringify(layout));
        await shot('lobby-'+width+'-'+height+'-'+tab);results.push(layout);
      }
      await evaluate('NV.settingsUI.open()');await sleep(100);
      const settings=await evaluate(`(()=>{const r=document.getElementById('settingsPanelBody').getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom}})()`);
      assert(settings.x>=-1&&settings.y>=-1&&settings.right<=width+1&&settings.bottom<=height+1,'settings bounds '+JSON.stringify(settings));
      await shot('settings-'+width+'-'+height);await evaluate('NV.settingsUI.close()');
      await evaluate('document.querySelectorAll(".mobile-lobby-tabs button")[2].click();document.getElementById("permBtn").click()');
      await until('!document.getElementById("permShop").classList.contains("hidden")');
      await sleep(500);
      const back=await evaluate(`(()=>{const r=document.getElementById('permBack').getBoundingClientRect();return {right:r.right,bottom:r.bottom,top:r.top}})()`);
      assert(back.right<=width+1&&back.bottom<=height+1&&back.top>=0,'permanent shop return '+JSON.stringify(back));
      await shot('permanent-'+width+'-'+height);await evaluate('document.getElementById("permBack").click()');
      assert(await fixture(1,5000,'full-roster'));await evaluate('NV.alpha.resume()');await until('!!NV.getBoss()');
      await evaluate('NV.getBoss().hp=0');await until('NV.getState()==="shop"');
      for(const tab of ['upgrades','weapons','consumables']){
        await evaluate(`document.querySelector('#shopTabs [data-tab=${tab}]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:2,pointerType:'touch'}))`);
        const layout=await evaluate(`(()=>{const r=document.querySelector('#shop .shop-deploy').getBoundingClientRect();return {tab:document.getElementById('shop').dataset.activeTab,right:r.right,bottom:r.bottom,top:r.top,scroll:document.documentElement.scrollWidth}})()`);
        assert.equal(layout.tab,tab);assert(layout.right<=width+1&&layout.bottom<=height+1&&layout.top>=0,'shop deploy visible '+JSON.stringify(layout));
        await shot('shop-'+width+'-'+height+'-'+tab);results.push(layout);
      }
      if(width>height){
        await evaluate('document.getElementById("skipWave").click()');await until('NV.getState()==="playing"');
        for(const id of ['touchSlideBtn','touchSpecialBtn','touchWeaponPrev','touchWeaponNext','touchConsumPrev','touchConsumNext','systemMenuToggle']){
          const rect=await evaluate(`(()=>{const e=document.getElementById('${id}'),r=e.getBoundingClientRect();return {w:r.width,h:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom}})()`);
          assert(rect.w>0&&rect.h>=44&&rect.left>=0&&rect.right<=width+1&&rect.top>=0&&rect.bottom<=height+1,id+' bounds '+JSON.stringify(rect));
        }
        const oldWeapon=await evaluate('NV.alpha.snapshot().weapon');
        await evaluate(`document.getElementById('touchWeaponPrev').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:3,pointerType:'touch'}))`);
        assert.notEqual(await evaluate('NV.alpha.snapshot().weapon'),oldWeapon,'weapon switch actually works');
        await evaluate('NV.input.togglePause()');await shot('playing-'+width+'-'+height);
      }
    }
    assert.equal(errors.length,0,JSON.stringify(errors));fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({pass:true,results,errors},null,2));ok('mobile: lobby tabs/settings/shop/controls on six viewports');return;
  }
  if(process.argv.includes('--system-menu')) {
    const results=[];
    for(const [width,height,mobile] of [[1280,800,false],[915,412,true],[360,800,true]]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:mobile?2:1,mobile});
      await send('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:mobile?5:1});
      await navigate((mobile?'?mobile=1&fresh=1':'?fresh=1'));
      assert(await fixture(1,5000,'full-roster'));
      await evaluate('NV.alpha.resume()');await until('NV.getState()==="playing"');
      const before=await evaluate(`(()=>{const q=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height,display:getComputedStyle(document.querySelector(s)).display}};return {game:q('#game'),box:q('.game-box'),legacy:q('.hud'),vitals:q('#systemVitals'),toggle:q('#systemMenuToggle')}})()`);
      assert.equal(before.game.x,0);assert.equal(before.game.y,0);assert.equal(before.game.right,width);assert.equal(before.game.bottom,height);
      assert.equal(before.legacy.display,'none');
      assert(before.vitals.w>0&&before.vitals.x>=0&&before.vitals.right<=width,'vitals '+JSON.stringify(before));
      assert(before.toggle.w>=42&&before.toggle.x>=0&&before.toggle.right<=width,'toggle '+JSON.stringify(before));
      await evaluate('document.getElementById("systemMenuToggle").click()');
      const panel=await evaluate(`(()=>{const r=document.getElementById('systemMenu').getBoundingClientRect();return {hidden:document.getElementById('systemMenu').hidden,x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height,wave:document.getElementById('systemWave').textContent,sourceWave:document.getElementById('wave').textContent,hp:document.getElementById('systemHpText').textContent,sourceHp:document.getElementById('hpText').textContent}})()`);
      assert.equal(panel.hidden,false);assert(panel.x>=0&&panel.y>=0&&panel.right<=width+1&&panel.bottom<=height+1,'panel '+JSON.stringify(panel));
      assert.equal(panel.wave,panel.sourceWave);assert.equal(panel.hp,panel.sourceHp);
      await evaluate('document.getElementById("systemMenuClose").click()');
      assert.equal(await evaluate('document.getElementById("systemMenu").hidden'),true);
      await shot('system-'+width+'-'+height);results.push({width,height,mobile,before,panel});
    }
    assert.equal(errors.length,0,JSON.stringify(errors));fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({pass:true,results,errors},null,2));ok('sistema: canvas completo, datos preservados y menú responsivo',results);return;
  }
  if(process.argv.includes('--soundtrack-fix')) {
    await evaluate(`(() => {window.musicProbe=[];const original=NV.soundVoice;NV.soundVoice=s=>{if(s.channel==='music')musicProbe.push({buffer:!!s.buffer,role:s.role});return original(s)};NV.initAudio();})()`);
    await until('NV.soundtrack.getDiagnostics().status==="ready"',20000);
    await until('NV.soundtrack.getDiagnostics().voices===1');
    const initial=await evaluate('({music:musicProbe,diagnostics:NV.soundtrack.getDiagnostics()})');
    assert(initial.music.length>0&&initial.music.every(v=>v.buffer),'no música legacy');
    const ramps=await evaluate(`(() => {const p=NV.mixer.music.gain,original=p.linearRampToValueAtTime.bind(p),list=[];p.linearRampToValueAtTime=(v,t)=>{list.push({v,delta:t-NV.audioCtx.currentTime});return original(v,t)};NV.sfx.damage();p.linearRampToValueAtTime=original;return list})()`);
    assert(ramps[0].delta>=.099&&ramps.at(-1).delta>=.62,'duck suave');
    await evaluate('NV.setSoundEnabled(false)');await sleep(100);
    assert.equal(await evaluate('NV.soundtrack.getDiagnostics().voices'),0);
    await evaluate('NV.setSoundEnabled(true);NV.initAudio()');
    await until('NV.soundtrack.getDiagnostics().voices===1');
    await shot('lobby-soundtrack');assert.equal(errors.length,0,JSON.stringify(errors));
    fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({pass:true,source:BASE,initial,ramps,errors},null,2));
    ok('soundtrack: exclusividad, lobby, duck suave y mute');return;
  }
  if(process.argv.includes('--hud-auto-reveal')) {
    await fixture(1); await evaluate('NV.alpha.resume()');
    await until('NV.alpha.snapshot().hudReveal===1');
    await shot('hud-visible');
    await evaluate(`window.__hudDraws={boss:0,dash:0,wave:0};
      for(const [key,name] of [['boss','drawBossHUD'],['dash','drawDashStamina']]) {
        const original=NV[name];NV[name]=function(...args){__hudDraws[key]++;return original.apply(this,args);};
      }
      const ctx=document.getElementById('game').getContext('2d'),text=ctx.fillText;
      ctx.fillText=function(value,...args){if(String(value).includes('FALTAN'))__hudDraws.wave++;return text.call(this,value,...args);};`);
    await until('NV.alpha.snapshot().hudReveal===0');
    assert.equal(await evaluate('NV.consumSlotRects.length'),0);
    await shot('hud-hidden');
    const drawn=await evaluate('__hudDraws');assert(drawn.boss>0&&drawn.dash>0&&drawn.wave>0,JSON.stringify(drawn));
    const weaponBefore=await evaluate('NV.alpha.snapshot().weapon');
    await evaluate(`window.dispatchEvent(new WheelEvent('wheel',{deltaY:100,cancelable:true}));`);
    await until('NV.alpha.snapshot().hudReveal===1');
    assert.notEqual(await evaluate('NV.alpha.snapshot().weapon'),weaponBefore);
    await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'p',code:'KeyP',bubbles:true}));`);
    await until('NV.alpha.snapshot().paused');
    const before=await evaluate('NV.alpha.snapshot().hudHold');await sleep(3400);
    assert.equal(await evaluate('NV.alpha.snapshot().hudHold'),before);
    await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'p',code:'KeyP',bubbles:true}));`);
    await until('!NV.alpha.snapshot().paused');
    await until('NV.alpha.snapshot().hudReveal===0');
    await evaluate('NV.input.notifyConsumableChange()');await until('NV.alpha.snapshot().hudReveal===1');
    await until('NV.alpha.snapshot().hudReveal===0');
    await evaluate('NV.input.setSpecial(true)');await until('NV.alpha.snapshot().hudHold>2.5');
    await evaluate('NV.input.setSpecial(false)');await until('NV.alpha.snapshot().hudReveal===1');
    await evaluate('document.getElementById("hudToggle").click()');
    assert.equal(await evaluate('NV.alpha.snapshot().showHUD'),false);
    assert.equal(await evaluate('NV.consumSlotRects.length'),0);
    await evaluate('document.getElementById("hudToggle").click()');
    assert.equal(await evaluate('NV.alpha.snapshot().showHUD'),true);
    ok('HUD: reveal, auto-hide, essentials, pause, consumables, toggle',drawn);
    for(const [width,height] of [[915,412],[844,390]]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
      await navigate('?mobile=1');await fixture(1);await evaluate('NV.alpha.resume()');
      await until('NV.alpha.snapshot().hudReveal===0');
      assert.equal(await evaluate('NV.consumSlotRects.length'),0);
      await shot('hud-mobile-'+width);ok('HUD mobile '+width+'x'+height);
    }
    assert.equal(errors.length,0,errors.join('\n'));
    fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({source:BASE,results:report,errors},null,2));return;
  }
  if(process.argv.includes('--lobby-integrated')) {
    const data=await require('../desktop/lobby-qa.cjs')(evaluate,shot,async(width,height,mobile)=>{
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
      await send('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:1});
      await navigate(mobile?'?mobile=1':'');
    });
    ok('lobby integrado: pilotos, modos, mejoras, ajustes y checkpoint',data);
    await navigate('?fresh=1');
    await evaluate('document.getElementById("lobbyModeEndless").click();document.getElementById("lobbyPlayBtn").click()');
    await until('NV.getState()==="playing"');
    assert.equal(await evaluate('NV.alpha.snapshot().run.mode'),'endless');
    await shot('endless-game');ok('JUGAR inicia el modo Infinito seleccionado');
    assert.equal(errors.length,0,errors.join('\n'));
    fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({source:BASE,results:report,errors},null,2));return;
  }
  if(process.argv.includes('--lobby-layout-only')) {
    const source=BASE+'/dev/lobby-layout/index.html';
    await send('Page.navigate',{url:source});
    await until('document.querySelector(".lobby-container") && document.querySelector(".panel-piloto")');
    for(const [width,height,mobile] of [[1440,900,false],[1280,800,false],[915,412,true],[844,390,true],[390,844,true]]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
      await send('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:1});await sleep(120);
      const layout=await evaluate(`(() => {
        const panel=document.querySelector('.panel-piloto').getBoundingClientRect(),button=document.querySelector('.btn-mejoras').getBoundingClientRect();
        return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,panelWidth:panel.width,buttonWidth:button.width,
          panelLeft:panel.left,buttonLeft:button.left,dots:document.querySelectorAll('.progress-bar .dot').length,
          activeIndex:Array.from(document.querySelectorAll('.progress-bar .dot')).findIndex(e=>e.classList.contains('active')),
          scripts:document.scripts.length,columns:getComputedStyle(document.querySelector('.lobby-container')).gridTemplateColumns,
          buttons:Array.from(document.querySelectorAll('button')).map(e=>e.textContent.trim())};
      })()`);
      assert.equal(layout.panelWidth,layout.buttonWidth);assert.equal(layout.panelLeft,layout.buttonLeft);
      assert.equal(layout.dots,10);assert.equal(layout.activeIndex,3);assert.equal(layout.scripts,0);
      assert(!layout.buttons.includes('PILOTOS'));assert(layout.scrollWidth<=width,'overflow horizontal');
      assert.equal(layout.columns.split(' ').length,width<=980?1:3);
      await shot('lobby-layout-'+width);ok('HTML/CSS responsive '+width,layout);
    }
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
    await evaluate('document.querySelector(".dot.active").focus()');await sleep(240);
    const tooltip=await evaluate(`(() => {const e=document.querySelector('.tooltip-historia'),r=e.getBoundingClientRect(),s=getComputedStyle(e);return {visibility:s.visibility,opacity:s.opacity,left:r.left,right:r.right,top:r.top};})()`);
    assert.equal(tooltip.visibility,'visible');assert.equal(Number(tooltip.opacity),1);assert(tooltip.left>=0&&tooltip.right<=1440);
    await shot('lobby-tooltip');ok('tooltip par clavier',tooltip);
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    await evaluate('document.querySelector(".dot.active").focus();document.querySelector(".card-historia").scrollIntoView({block:"center"})');await sleep(240);
    const mobileTip=await evaluate('({visible:getComputedStyle(document.querySelector(".tooltip-historia")).visibility,left:document.querySelector(".tooltip-historia").getBoundingClientRect().left,right:document.querySelector(".tooltip-historia").getBoundingClientRect().right})');
    assert.equal(mobileTip.visible,'visible');assert(mobileTip.left>=0&&mobileTip.right<=390);await shot('mobile-tooltip');
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".avatar-shape")).animationName'),'none');
    assert.equal(errors.length,0,errors.join('\n'));fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({source,results:report,errors},null,2));return;
  }
  if(process.argv.includes('--soundtrack-analyze')) {
    const data=await evaluate(`(async()=>{
      const ac=new AudioContext();
      const b=await ac.decodeAudioData(await (await fetch('/previews/soundtrack-2026-10-03/source.mp3')).arrayBuffer());
      const channels=Array.from({length:b.numberOfChannels},(_,i)=>b.getChannelData(i));
      const hop=Math.round(b.sampleRate*.01),env=[],low=[],blocks=[];
      let smooth=0,peak=0,total=0;
      const k=1-Math.exp(-2*Math.PI*140/b.sampleRate);
      for(let i=0;i<b.length;i+=hop){let sum=0,lo=0;for(let j=i;j<Math.min(b.length,i+hop);j++){
        let x=0;for(const c of channels){x+=c[j]/channels.length;peak=Math.max(peak,Math.abs(c[j]));}
        sum+=x*x;smooth+=k*(x-smooth);lo+=smooth*smooth;
      }env.push(Math.sqrt(sum/hop));low.push(Math.sqrt(lo/hop));total+=sum;}
      for(let i=0;i<env.length;i+=200){const a=env.slice(i,i+200);blocks.push({at:i*.01,rms:Math.sqrt(a.reduce((s,v)=>s+v*v,0)/a.length),low:low.slice(i,i+200).reduce((s,v)=>s+v,0)/a.length});}
      const flux=low.map((v,i)=>Math.max(0,v-(low[i-1]||v))),tempo=[];
      for(let bpm=70;bpm<=180;bpm+=.1){const lag=6000/bpm;let correlation=0;for(let i=1000;i<Math.min(flux.length,14000)-Math.ceil(lag);i++){
        const p=i+lag,j=Math.floor(p);correlation+=flux[i]*(flux[j]*(1-(p-j))+flux[j+1]*(p-j));}
        tempo.push({bpm:Math.round(bpm*10)/10,score:correlation});}
      tempo.sort((a,b)=>b.score-a.score);
      await ac.close();return {duration:b.duration,sampleRate:b.sampleRate,channels:b.numberOfChannels,peak,rms:Math.sqrt(total/b.length),blocks,tempo:tempo.slice(0,30),flux};
    })()`);
    fs.writeFileSync(path.join(OUT,'analysis.json'),JSON.stringify(data,null,2));
    console.log(JSON.stringify({...data,flux:undefined}));return;
  }
  if(process.argv.includes('--audio-experiments')) {
    assert.equal(await evaluate('typeof NV.audioExperiments'),'undefined','experimentos cargados en juego');
    await send('Page.navigate',{url:BASE+'/dev/audio-experiments/index.html'});
    await until('window.audioExperimentLab && document.querySelectorAll(".card").length===8');
    const qa=require('../dev/audio-experiments/qa.cjs'),wav=require('../desktop/audio-qa.cjs').saveWav;
    const data=await qa(evaluate,shot,async(name,result)=>wav(path.join(OUT,name+'.wav'),result),
      (width,height)=>send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false}),
      {levelProbe:process.argv.includes('--audio-level-probe')});
    assert.equal(errors.length,0,JSON.stringify(errors));
    fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({pass:true,data,errors,source:BASE},null,2));
    ok('laboratorio: cuatro músicas, cuatro bajas, mezcla densa, responsive, mute y selección',data.results);return;
  }
  if(process.argv.includes('--spawn-icon-only')) {
    assert(await evaluate('document.getElementById("lobbyPlayBtn") && document.body.innerText.trim().length>0'));
    await shot('lobby');
    const gallery=await evaluate(`(() => {
      const c=document.createElement('canvas');c.width=800;c.height=320;const ctx=c.getContext('2d');
      for(let y=0;y<c.height;y+=16)for(let x=0;x<c.width;x+=16){ctx.fillStyle=(x/16+y/16)%2?'#172438':'#0a1322';ctx.fillRect(x,y,16,16);}
      for(let i=0;i<4;i++) {
        ctx.save();ctx.translate(100+i*200,100);ctx.scale(3,3);
        NV.drawEnemyArrival(ctx,{x:0,y:0,radius:22,arrival:{stage:'warning',duration:.9,remaining:.9*(1-i/4)}});ctx.restore();
        NV.drawEnemyArrival(ctx,{x:100+i*200,y:240,radius:12+i*4,arrival:{stage:'warning',duration:.9,remaining:.9*(1-i/4)}});
      }
      const t=document.createElement('canvas');t.width=t.height=100;const tc=t.getContext('2d');
      NV.drawEnemyArrival(tc,{x:50,y:50,radius:22,arrival:{stage:'warning',duration:.9,remaining:.9}});
      const pixel=(x,y)=>Array.from(tc.getImageData(x,y,1,1).data);
      const frames=[];
      for(const remaining of [.9,.675,.45,.225]){tc.clearRect(0,0,100,100);NV.drawEnemyArrival(tc,{x:50,y:50,radius:22,arrival:{stage:'warning',duration:.9,remaining}});frames.push(t.toDataURL());}
      tc.clearRect(0,0,100,100);NV.drawEnemyArrival(tc,{x:50,y:50,radius:22,arrival:{stage:'warning',duration:.9,remaining:.9}});
      return {atlas:c.toDataURL(),transparent:[pixel(0,0),pixel(43,50),pixel(50,38)],violet:pixel(50,50),animated:new Set(frames).size};
    })()`);
    for(const pixel of gallery.transparent)assert.equal(pixel[3],0,'fondo/interior deben ser transparentes');
    assert(gallery.violet[0]>0&&gallery.violet[2]>0&&gallery.violet[1]===0&&gallery.violet[3]>0,'exclamación violeta');
    assert(gallery.animated>1,'pulso visible en distintos tiempos');
    fs.writeFileSync(path.join(OUT,'spawn-icon-atlas.png'),Buffer.from(gallery.atlas.split(',')[1],'base64'));
    delete gallery.atlas;ok('triángulo transparente violeta animado',gallery);
    for(const [width,height,mobile] of [[1280,800,false],[915,412,true],[844,390,true]]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
      await send('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:1});
      await navigate(mobile?'?mobile=1&fresh=1':'?fresh=1');
      await evaluate('document.getElementById("lobbyPlayBtn").click()');
      await until('NV.getState()==="playing" && NV.getRuntimeSnapshot().arrivals>0');
      await evaluate('NV.input.togglePause()');await shot('spawn-'+width);
      const frozen=await evaluate('NV.getRuntimeSnapshot()');await sleep(180);
      assert.equal(await evaluate('NV.getRuntimeSnapshot().frame'),frozen.frame,'pausa no avanza animación');
      await evaluate('NV.input.togglePause()');
      await until('NV.getRuntimeSnapshot().arrivalPuffs>0',10000);
      ok('spawn y puff reales '+width,{snapshot:frozen,layout:await layoutSnapshot()});
    }
    assert.equal(errors.length,0,errors.join('\n'));
    fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({source:BASE,results:report,errors},null,2));return;
  }
  if(process.argv.includes('--idle-pressure-probe')){
    await navigate('?combatLab=1&fresh=1');
    await evaluate(`(() => {
      window.__nvPressureHits=[];const apply=NV.applyPlayerDamage;
      NV.applyPlayerDamage=(damage,options)=>{const r=apply(damage,options);window.__nvPressureHits.push({cause:options&&options.cause,applied:r.applied});return r;};
      const result=NV.combatLabRuntime.start({encounterMode:'boss',bossIndex:0,characterId:'boti',difficultyId:'normal',weaponId:'pistol',weaponLevel:1,weaponFusion:0,firePolicy:'manual',durationMode:'infinite'});
      if(!result.ok)throw Error('fixture presión');
    })()`);
    const samples=[];
    for(let i=0;i<48;i++){await sleep(250);samples.push(await evaluate('({state:NV.getState(),player:NV.getRuntimeSnapshot().player,idleTime:NV.getBoss()?.encounter?.idleTime,warning:!!NV.getBoss()?.encounter?.idlePressure})'));}
    const hits=await evaluate('window.__nvPressureHits');
    const idlePressureApplied=hits.some(h=>h.cause==='boss-idle-pressure'&&h.applied);
    assert.equal(errors.length,0,JSON.stringify(errors));
    fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({diagnostic:true,source:BASE,idlePressureApplied,hits,samples,errors},null,2));
    console.log('DIAGNOSTIC idle-pressure applied='+idlePressureApplied);return;
  }
  if(process.argv.includes('--audio-remaster')) {
    await shot('lobby');
    const qa=require('../desktop/audio-qa.cjs');
    const data=await qa(evaluate,async(name,result)=>qa.saveWav(path.join(OUT,name+'.wav'),result));
    const ui=await evaluate(`(() => {
      const events=[],original=NV.sfx.ui;
      NV.sfx.ui=kind=>{events.push(kind);return original(kind);};
      const button=document.createElement('button');button.id='audio-qa-probe';
      const child=document.createElement('span');button.append(child);document.body.append(button);
      try{
        button.dispatchEvent(new PointerEvent('pointerover',{bubbles:true}));
        child.dispatchEvent(new PointerEvent('pointerover',{bubbles:true,relatedTarget:button}));
        button.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
        button.dispatchEvent(new FocusEvent('focusin',{bubbles:true}));button.click();
        return events;
      }finally{button.remove();NV.sfx.ui=original;}
    })()`);
    assert.deepEqual(ui,['hover','select'],'hover/foco/clic duplican eventos');
    if(process.argv.includes('--audio-lab')){
      await send('Page.navigate',{url:BASE+'/dev/audio-remaster/index.html'});
      await until('window.NV && NV.getAudioVoiceStats && document.querySelector("#weapons button")');
      await evaluate('document.querySelector("#weapons button").click()');await sleep(80);
      assert(await evaluate('NV.getAudioVoiceStats().created>0'),'lab no reproduce');
      await evaluate('for(const button of document.querySelectorAll("#weapons button,#events button"))button.click()');
      assert(await evaluate('NV.getAudioVoiceStats().active<=48'),'lab supera presupuesto');
      await evaluate('document.getElementById("music").click()');await sleep(1200);
      assert(await evaluate('NV.musicState.scheduledSteps>8'),'lab no secuencia música con reloj real');
      await shot('audio-lab');await evaluate('document.getElementById("stop").click()');await sleep(100);
      assert.equal(await evaluate('NV.getAudioVoiceStats().active'),0,'lab no detiene voces');
    }
    assert.equal(errors.length,0,JSON.stringify(errors));
    fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({pass:true,data,ui,errors,source:BASE},null,2));
    ok('audio real: mezcla, once escenarios, mute y voces',data.results);return;
  }
  if(process.argv.includes('--pilot-live-view')) {
    const cases=[];
    for(const character of ['boti','nova','rook','swarm']) {
      await navigate();
      await evaluate(`(() => {
        const original=NV.pilotAppearance,counts={};window.__pilotLiveCounts=counts;
        NV.pilotAppearance={...original,trace(...args){const c=args[1],key=c.id+':'+c.shape;counts[key]=(counts[key]||0)+1;return original.trace(...args);}};
        document.getElementById('pilotsBtn').click();
        document.querySelector('[data-char="${character}"]').click();
      })()`);
      await sleep(150);await shot('selector-'+character);
      await evaluate('document.getElementById("startBtn").click()');await sleep(700);
      const lobby=await evaluate('({state:NV.getState(),character:NV.getRuntimeSnapshot().player.character,counts:{...__pilotLiveCounts},url:location.href,rendererURL:[...document.scripts].find(s=>s.src.includes("js/render/player.js")).src})');
      assert.equal(lobby.state,'menu');assert.equal(lobby.character,character);
      assert(Object.keys(lobby.counts).some(k=>k.startsWith(character+':')),'renderer nuevo no usado en lobby');
      await shot('lobby-'+character);
      await evaluate('for(const key of Object.keys(__pilotLiveCounts))delete __pilotLiveCounts[key];document.getElementById("lobbyPlayBtn").click()');await sleep(1000);
      const playing=await evaluate('({snapshot:NV.getRuntimeSnapshot(),counts:{...__pilotLiveCounts}})');
      assert.equal(playing.snapshot.state,'playing');assert.equal(playing.snapshot.player.character,character);
      const expected={boti:'woven',nova:'radial',rook:'peaks',swarm:'asymmetric'}[character];
      assert(playing.counts[character+':'+expected]>0,'forma aprobada no usada en partida real');
      await shot('playing-'+character);cases.push({character,lobby,playing});
      ok('vista real '+character);
    }
    assert.equal(errors.length,0,JSON.stringify(errors));
    fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({pass:true,cases,errors,network},null,2));return;
  }
  if(process.argv.includes('--pilot-production')) {
    const data=await require('../desktop/pilot-qa.cjs')(evaluate,async(name,url)=>fs.writeFileSync(path.join(OUT,name+'.png'),Buffer.from(url.split(',')[1],'base64')));
    assert.equal(errors.length,0,JSON.stringify(errors));
    fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({pass:true,data,errors},null,2));
    ok('pilotos producción Web',data);return;
  }
  if(process.argv.includes('--pilot-approved-capture')) {
    const target=path.join(OUT,'approved-commands.json');assert(!fs.existsSync(target),'No sobrescribir el fixture aprobado');
    const samples=await evaluate(`(() => {const shapes={boti:'woven',nova:'radial',rook:'peaks',swarm:'asymmetric'},out={};for(const id of NV.CHARACTER_ORDER){pilotConcept.setShape(id,shapes[id]);out[id]={};for(const frame of [0,95,5211.637999999551,19488,19489,19494,19548,19788])out[id][frame]=pilotConcept.commandSample(id,frame,'experimental');}pilotConcept.renderAt(19488);return {shapes,settings:pilotConcept.settings,samples:out};})()`);
    fs.writeFileSync(target,JSON.stringify(samples));const url=await evaluate('document.getElementById("comparison").toDataURL()');fs.writeFileSync(path.join(OUT,'approved-lab.png'),Buffer.from(url.split(',')[1],'base64'));
    assert.equal(errors.length,0,errors.join('\n'));ok('fixture de 32 muestras aprobado ANTES de integrar');return;
  }
  if(process.argv.includes('--pilot-canonical-capture')) {
    assert.equal(await evaluate('!!pilotConcept.presets'),false,'El oracle sólo se captura ANTES del refactor');
    assert(!fs.existsSync(path.join(OUT,'commands-before.json')),'No sobrescribir el oracle existente');
    const captured=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../dev/pilot-concepts/captured-runtime.json'),'utf8'));
    await evaluate(`(() => {const captured=${JSON.stringify(captured)};for(const id of NV.CHARACTER_ORDER)Object.assign(pilotConcept.settings[id],captured.settings[id]);pilotConcept.renderAt(captured.frame);})()`);
    const samples=await evaluate(`(() => {const out={};for(const id of NV.CHARACTER_ORDER){out[id]={};for(const delta of [0,1,6,60,300])out[id][delta]=pilotConcept.commandSample(id,${captured.frame}+delta,'experimental');}return out;})()`);
    fs.writeFileSync(path.join(OUT,'commands-before.json'),JSON.stringify(samples));
    const url=await evaluate('document.getElementById("comparison").toDataURL()');fs.writeFileSync(path.join(OUT,'baseline-before.png'),Buffer.from(url.split(',')[1],'base64'));
    assert.equal(errors.length,0,errors.join('\n'));ok('configuración exacta antes de separar geometría');return;
  }
  if(process.argv.includes('--pilot-canonical') || (process.argv.includes('--pilot-stability') && await evaluate('!!pilotConcept.presets'))) {
    const captured=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../dev/pilot-concepts/captured-runtime.json'),'utf8'));
    const before=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../previews/pilot-canonical-2026-10-02/commands-before.json'),'utf8'));
    await evaluate(`pilotConcept.renderAt(${captured.frame})`);
    assert.equal(await evaluate('document.getElementById("shape").value'),'woven');
    assert.equal(await evaluate('!!document.querySelector("#shape option[value=original]")'),false);
    assert.deepEqual(await evaluate('pilotConcept.settings'),captured.settings);
    const actual=await evaluate(`(() => {const out={};for(const id of NV.CHARACTER_ORDER){out[id]={};for(const delta of [0,1,6,60,300])out[id][delta]=pilotConcept.nativeAnimationSample(id,${captured.frame}+delta);}return out;})()`);
    assert.deepEqual(actual,before,'El preset cambió comandos de la animación original');
    ok('20 muestras completas idénticas al renderer del laboratorio ANTES del refactor');
    const findings=await evaluate(`(() => {
      const pc=pilotConcept,P=pc.presets,frame=${captured.frame},result=[];
      const json=x=>JSON.stringify(x),near=(a,b)=>Math.abs(a-b)<1e-10;
      const nonContour=commands=>{const indices=new Set(pc.polygons(commands).flat().map(v=>v.index));return commands.filter((c,i)=>!indices.has(i));};
      const savedCharacters=json(NV.CHARACTERS),random=Math.random,profile=json(P.profile());
      for(const id of NV.CHARACTER_ORDER){
        const reference=pc.baseShape(id),native=pc.nativeAnimationSample(id,frame),nativeLater=pc.nativeAnimationSample(id,frame+60);
        const animated=pc.polygons(native),later=pc.polygons(nativeLater);
        for(const shape of Object.keys(pc.geometry.names)){
          if(!pc.setShape(id,shape))throw Error('Forma rechazada');
          if(pc.state().frame!==frame||json(P.profile())!==profile)throw Error('Forma escribió animación o reloj');
          const current=pc.commandSample(id,frame,'experimental'),future=pc.commandSample(id,frame+60,'experimental');
          if(json(nonContour(current))!==json(nonContour(native))||json(nonContour(future))!==json(nonContour(nativeLater)))throw Error(id+' cambió gotas, ojos, anillos o estilos');
          if(shape==='original'&&json(current)!==json(native))throw Error('Volver a original cambió animación');
          const currentPaths=pc.polygons(current),futurePaths=pc.polygons(future);let maxError=0;
          for(let layer=0;layer<reference.length;layer++){
            const field=animated[layer].map((v,i)=>({x:v.x-reference[layer][i].x,y:v.y-reference[layer][i].y}));
            const nextField=later[layer].map((v,i)=>({x:v.x-reference[layer][i].x,y:v.y-reference[layer][i].y}));
            for(let i=0;i<currentPaths[layer].length;i++){
              const u=i/(currentPaths[layer].length-1),d=pc.geometry.sample(field,u),next=pc.geometry.sample(nextField,u);
              const now=currentPaths[layer][i],end=futurePaths[layer][i];
              const error=Math.hypot((end.x-now.x)-(next.x-d.x),(end.y-now.y)-(next.y-d.y));maxError=Math.max(maxError,error);
              if(!near(error,0))throw Error(id+' movimiento distinto en '+shape);
            }
          }
          if(json(current)===json(future))throw Error(id+' forma estática');
          result.push({id,shape,profileUnchanged:true,otherEffectsUnchanged:true,maxMotionError:maxError});
        }pc.setShape(id,'woven');
      }
      if(Math.random!==random||json(NV.CHARACTERS)!==savedCharacters)throw Error('Estado compartido alterado');
      const snapshot=json(P.canonical);P.edit('boti','speed',.01);P.save();
      P.canonical.settings.boti.speed=.01;
      if(!Object.isFrozen(P.canonical)||!Object.isFrozen(P.canonical.settings.boti)||json(P.canonical)!==snapshot)throw Error('Base sin protección');
      return result;
    })()`);
    ok('5 formas y baseline × 4 pilotos: mismo campo de movimiento, perfil y efectos',findings);
    for(const shape of ['original','woven','radial','star','asymmetric','peaks']) {
      await evaluate(`for(const id of NV.CHARACTER_ORDER)pilotConcept.setShape(id,'${shape}');pilotConcept.renderAt(${captured.frame})`);
      const url=await evaluate('document.getElementById("comparison").toDataURL()');
      fs.writeFileSync(path.join(OUT,'shape-'+shape+'.png'),Buffer.from(url.split(',')[1],'base64'));
    }
    await evaluate(`for(const id of NV.CHARACTER_ORDER)pilotConcept.setShape(id,'woven');pilotConcept.renderAt(${captured.frame})`);
    assert.equal(await evaluate('Array.from(document.querySelectorAll("[data-param]")).every(e=>e.disabled)'),true);
    // Cambio real del selector, no sólo API. No reinicia el reloj ni altera sliders.
    await evaluate('document.getElementById("shape").value="radial";document.getElementById("shape").dispatchEvent(new Event("change"))');
    assert.equal(await evaluate('pilotConcept.state().shapes.boti'),'radial');
    assert.equal(await evaluate('pilotConcept.state().frame'),captured.frame);
    await evaluate('(() => {document.getElementById("pilot").value="nova";document.getElementById("pilot").dispatchEvent(new Event("change"));const input=document.querySelector("[data-param=speed]");input.value="0.38";input.dispatchEvent(new Event("input"));})()');
    assert.deepEqual(await evaluate('pilotConcept.settings'),captured.settings,'slider enviado artificialmente modifica canónico');
    await evaluate('document.getElementById("presetName").value="QA copia exacta";document.getElementById("duplicatePreset").click()');
    const copyId=await evaluate('pilotConcept.presets.profile().id');
    assert.equal(await evaluate('Array.from(document.querySelectorAll("[data-param]")).every(e=>!e.disabled)'),true);
    await evaluate('(() => {const input=document.querySelector("[data-param=speed]");input.value="0.38";input.dispatchEvent(new Event("input"));document.getElementById("savePreset").click();})()');
    assert.equal(await evaluate('pilotConcept.settings.nova.speed'),.38);
    await evaluate('document.getElementById("reset").click();document.getElementById("pause").click()');
    assert.equal(await evaluate('pilotConcept.state().frame'),captured.frame);
    assert.deepEqual(await evaluate('pilotConcept.settings'),captured.settings);
    await navigate();await evaluate(`pilotConcept.renderAt(${captured.frame});document.getElementById('preset').value='${copyId}';document.getElementById('preset').dispatchEvent(new Event('change'));`);
    assert.equal(await evaluate('pilotConcept.settings.nova.speed'),.38,'copia no persistió al recargar');
    await evaluate('document.getElementById("reset").click();document.getElementById("pause").click()');
    assert.deepEqual(await evaluate('pilotConcept.settings'),captured.settings);
    assert.deepEqual(await evaluate('pilotConcept.presets.export().canonical.settings'),captured.settings);
    assert.equal(await evaluate('pilotConcept.state().frame'),captured.frame);
    // Paso exacto conserva la fracción de frame capturada.
    await evaluate('document.querySelector("[data-step=\'6\']").click()');
    assert.equal(await evaluate('pilotConcept.state().frame'),captured.frame+6);
    await evaluate('document.querySelector("[data-capture=a]").click();document.querySelector("[data-step=\'60\']").click();document.querySelector("[data-capture=b]").click();document.getElementById("measure").click()');
    assert.equal(await evaluate('Array.from(document.querySelectorAll("figure")).filter(f=>!f.hidden&&f.querySelector("img").src.startsWith("data:image/png")).length'),2);
    assert(await evaluate('document.getElementById("metrics").textContent.includes("BOTI")'));
    await evaluate('pilotConcept.renderAt(95);document.getElementById("pause").click()');await sleep(250);
    assert(await evaluate('pilotConcept.state().frame>95'));await evaluate('document.getElementById("pause").click()');
    const stopped=await evaluate('pilotConcept.state().frame');await sleep(100);assert.equal(await evaluate('pilotConcept.state().frame'),stopped);
    ok('UI real: protección, copias persistentes, recuperación exacta, reloj y capturas');
    for(const [width,height] of [[1280,1050],[915,412],[844,390],[390,844]]){
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
      await evaluate(`window.scrollTo(0,0);pilotConcept.renderAt(${captured.frame})`);
      assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'desborde horizontal');await shot('lab-'+width);
    }
    assert.equal(errors.length,0,errors.join('\n'));
    fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({results:report,errors,source:BASE},null,2));return;
  }
  if(process.argv.includes('--pilot-stability')) {
    const findings=await evaluate(`(() => {
      const expected={boti:2,nova:2,rook:1,swarm:1},results=[];
      for(const id of NV.CHARACTER_ORDER){
        const saved=JSON.stringify(NV.CHARACTERS[id]),random=Math.random;
        const original=pilotConcept.commandSample(id,95,'original'),experimental=pilotConcept.commandSample(id,95,'experimental');
        const polygons=pilotConcept.polygons(experimental);
        if(polygons.length!==expected[id])throw Error(id+' número de cuerpos incorrecto');
        const styles=x=>x.filter(c=>c.set&&typeof c.value==='string');
        if(JSON.stringify(styles(original))!==JSON.stringify(styles(experimental)))throw Error(id+' cambió colores/estilos');
        const eyes=x=>x.filter(c=>c.op==='arc'&&(c.args[0]===-5||c.args[0]===5)&&c.args[1]===-1);
        if(eyes(original).length!==4||JSON.stringify(eyes(original))!==JSON.stringify(eyes(experimental)))throw Error(id+' ojos cambiados');
        const frozen=JSON.stringify(experimental);
        if(frozen!==JSON.stringify(pilotConcept.commandSample(id,95,'experimental')))throw Error(id+' freeze no reproducible');
        if(frozen===JSON.stringify(pilotConcept.commandSample(id,395,'experimental')))throw Error(id+' quedó estático');
        if(JSON.stringify(NV.CHARACTERS[id])!==saved||Math.random!==random)throw Error('Estado o RNG sin restaurar');
        results.push({id,paths:polygons.length,eyes:4,stylesPreserved:true,deterministic:true,animated:true});
      }return results;
    })()`);
    const metrics=await evaluate('pilotConcept.measure()');
    for(const r of metrics)assert(r.intervals[1].reduction>.5 && r.intervals[6].reduction>.5,r.id+' no estabilizó los contornos');
    for(const frame of [95,96,101,155,395]){
      await evaluate('pilotConcept.renderAt('+frame+')');
      const url=await evaluate('document.getElementById("comparison").toDataURL()');
      fs.writeFileSync(path.join(OUT,'frame-'+frame+'.png'),Buffer.from(url.split(',')[1],'base64'));
    }
    await evaluate('pilotConcept.renderAt(95);document.querySelector("[data-step=\'6\']").click()');
    assert.equal(await evaluate('pilotConcept.state().frame'),101);
    await evaluate('document.querySelector("[data-capture=a]").click();document.querySelector("[data-step=\'60\']").click();document.querySelector("[data-capture=b]").click()');
    assert.equal(await evaluate('Array.from(document.querySelectorAll("figure")).filter(f=>!f.hidden && f.querySelector("img").src.startsWith("data:image/png")).length'),2);
    await evaluate('document.getElementById("pilot").value="nova";document.getElementById("pilot").dispatchEvent(new Event("change"));const input=document.querySelector("[data-param=speed]");input.value="0.38";input.dispatchEvent(new Event("input"))');
    assert.equal(await evaluate('pilotConcept.settings.nova.speed'),.38);assert.equal(await evaluate('pilotConcept.settings.boti.speed'),.18);
    await evaluate('document.getElementById("reset").click()');assert.equal(await evaluate('JSON.stringify(pilotConcept.settings)===JSON.stringify(pilotConcept.defaults)'),true);
    await evaluate('document.getElementById("measure").click()');assert(await evaluate('document.getElementById("metrics").textContent.includes("BOTI")'));
    await evaluate('pilotConcept.renderAt(95);document.getElementById("pause").click()');await sleep(350);
    assert(await evaluate('pilotConcept.state().frame>95'));await evaluate('document.getElementById("pause").click()');
    const stopped=await evaluate('pilotConcept.state().frame');await sleep(100);assert.equal(await evaluate('pilotConcept.state().frame'),stopped);
    for(const [width,height] of [[1280,1050],[915,412],[844,390]]){
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
      await evaluate('window.scrollTo(0,0);pilotConcept.renderAt(95)');
      assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'desborde horizontal');
      await shot('lab-'+width);
    }
    assert.equal(errors.length,0,errors.join('\n'));
    ok('laboratorio: identidad, animación, freeze, controles y capturas',findings);
    fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({results:report,metrics,errors,source:BASE},null,2));return;
  }
  if(process.argv.includes('--pilot-concept')) {
    for(const [width,height] of [[1280,1050],[915,412],[844,390]]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
      await evaluate('pilotConcept.renderAt(95)');
      assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'desborde horizontal de comparación');
      await shot('concept-'+width);
    }
    const url=await evaluate('document.getElementById("comparison").toDataURL()');
    fs.writeFileSync(path.join(OUT,'comparison.png'),Buffer.from(url.split(',')[1],'base64'));
    await evaluate('document.getElementById("pause").click()');assert.equal(await evaluate('document.getElementById("pause").getAttribute("aria-pressed")'),'false');
    assert.equal(errors.length,0,errors.join('\n'));
    ok('comparación aislada desktop y landscape');
    fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({results:report,errors,source:BASE},null,2));return;
  }
  if(process.argv.includes('--special-remaster')) {
    const capture=async(name,url)=>fs.writeFileSync(path.join(OUT,name+'.png'),Buffer.from(url.split(',')[1],'base64'));
    const verify=require('../desktop/special-qa.cjs');
    ok('especiales desktop',await verify(evaluate,capture));
    if(process.argv.includes('--special-mobile')) {
      await send('Emulation.setDeviceMetricsOverride',{width:915,height:412,deviceScaleFactor:1,mobile:true});
      await navigate('?mobile=1&fresh=1');ok('especiales landscape',await verify(evaluate,capture,{mobile:true}));
    }
    assert.equal(errors.length,0,errors.join('\n'));
    fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({results:report,errors,source:BASE},null,2));return;
  }
  if(process.argv.includes('--dash-trail')) {
    assert(await evaluate('document.body.innerText.trim().length>0 && document.getElementById("lobbyPlayBtn")'));
    // Galería usa el renderer de producción; la curva no altera la física del dash.
    const atlas=await evaluate(`(() => {
      const c=document.createElement('canvas');c.width=1100;c.height=620;const ctx=c.getContext('2d');
      ctx.fillStyle='#040815';ctx.fillRect(0,0,c.width,c.height);
      NV.CHARACTER_ORDER.forEach((id,index)=>{
        const color=NV.CHARACTERS[id].color,y=70+index*138,trails=[];
        for(let i=0;i<36;i++) {
          const x=55+i*8,yy=y+Math.sin(i/7)*20;
          NV.emitDashTrail(trails,true,x,yy,x+8,y+Math.sin((i+1)/7)*20,color);
          NV.updateTrails(.008,trails);
        }
        NV.drawTrails(ctx,trails,{trailDensity:1,decorativeParticleScale:1,secondaryGlow:true});
        ctx.fillStyle=color;ctx.font='15px monospace';ctx.fillText(id.toUpperCase()+' / ALTA',55,y+60);
        for(const [col,density] of [[450,.5],[780,.25]]) {
          const reduced=[];for(let i=0;i<36;i++) {
            NV.emitDashTrail(reduced,true,col+i*6,y,col+(i+1)*6,y,color);NV.updateTrails(.008,reduced);
          }
          NV.drawTrails(ctx,reduced,{trailDensity:density,decorativeParticleScale:density,secondaryGlow:false});
          ctx.fillStyle='#9da9be';ctx.fillText(density===.5?'RENDIMIENTO':'AUTO MÍNIMO',col,y+60);
        }
      });return c.toDataURL();
    })()`);
    fs.writeFileSync(path.join(OUT,'dash-gallery.png'),Buffer.from(atlas.split(',')[1],'base64'));
    const cases=[['boti','high',false],['nova','high',false],['rook','high',false],['swarm','high',false],
      ['boti','auto',false],['boti','performance',false],['nova','high',true],['rook','high',true]];
    for(const [character,quality,mobile] of cases) {
      await send('Emulation.setDeviceMetricsOverride',{width:mobile?915:1280,height:mobile?412:800,deviceScaleFactor:1,mobile});
      await navigate(mobile?'?mobile=1&fresh=1':'?fresh=1');
      await fixture(1,5000,'legacy',true,{character});await evaluate('NV.alpha.resume()');
      await until('NV.getState()==="playing"');
      await evaluate(`NV.settings.graphics.quality='${quality}';NV.resetVisualBudget();NV.input.setMoveRight(true)`);
      await sleep(300);assert.equal(await evaluate('NV.getRuntimeSnapshot().dashTrail.count'),0,'estrellas caminando');
      const before=await evaluate('NV.getRuntimeSnapshot().player');
      await evaluate('NV.input.setMoveDown(true);NV.input.setSlide(true)');
      await until('NV.getRuntimeSnapshot().dashTrail.count>8',1000);
      const frame=await evaluate('NV.input.togglePause();document.getElementById("game").toDataURL()');
      fs.writeFileSync(path.join(OUT,'frame-'+character+'-'+quality+(mobile?'-mobile':'')+'.png'),Buffer.from(frame.split(',')[1],'base64'));
      const sample=await evaluate('({s:NV.getRuntimeSnapshot(),metrics:{...NV.worldMetrics},budget:NV.getVisualBudget(),performance:NV.performanceMonitor.getSnapshot()})');
      assert(sample.s.dashTrail.count<=96);assert(sample.s.player.x>before.x&&sample.s.player.y>before.y);
      await shot('dash-'+character+'-'+quality+(mobile?'-mobile':''));
      await sleep(100);assert.equal(await evaluate('NV.getRuntimeSnapshot().dashTrail.count'),sample.s.dashTrail.count,'pausa');
      await evaluate('NV.input.setSlide(false);NV.input.setMoveRight(false);NV.input.setMoveDown(false);NV.input.togglePause()');
      await sleep(650);assert.equal(await evaluate('NV.getRuntimeSnapshot().dashTrail.count'),0,'expiración');
      // Segundo uso de stamina: horizontal/vertical, mismo input y física.
      const direction=character==='boti'||character==='swarm'?'Right':'Up';
      await evaluate('NV.input.setMove'+direction+'(true);NV.input.setSlide(true)');
      await until('NV.getRuntimeSnapshot().dashTrail.count>8',1000);
      const repeat=await evaluate('NV.input.togglePause();document.getElementById("game").toDataURL()');
      fs.writeFileSync(path.join(OUT,'repeat-'+character+'-'+quality+(mobile?'-mobile':'')+'.png'),Buffer.from(repeat.split(',')[1],'base64'));
      await evaluate('NV.input.setSlide(false);NV.input.setMove'+direction+'(false);NV.input.togglePause()');
      await sleep(650);assert.equal(await evaluate('NV.getRuntimeSnapshot().dashTrail.count'),0);
      ok('dash real '+character+' / '+quality+' / '+(mobile?'mobile':'desktop'),{...sample,repeatDirection:direction});
    }
    // Combate real maduro: boss + refuerzos + láser existente, no solo intro.
    await send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
    await navigate('?fresh=1');await fixture(7,5000,'full-roster',true,{character:'rook'});
    await evaluate('NV.alpha.resume()');await until('NV.getState()==="playing" && NV.getBoss()');
    await until('NV.getRuntimeSnapshot().sectorHazards.some(h=>h.state==="active")',20000);
    assert(await evaluate('NV.getRuntimeSnapshot().enemies>0'),'soporte ausente en combate QA');
    await evaluate('NV.input.setMoveLeft(true);NV.input.setSlide(true)');
    await until('NV.getRuntimeSnapshot().dashTrail.count>8',1000);
    const fightFrame=await evaluate('NV.input.togglePause();document.getElementById("game").toDataURL()');
    fs.writeFileSync(path.join(OUT,'boss-laser-dash.png'),Buffer.from(fightFrame.split(',')[1],'base64'));
    ok('dash + boss + soporte + láser activo',await evaluate('({snapshot:NV.getRuntimeSnapshot(),performance:NV.performanceMonitor.getSnapshot()})'));
    // Microbenchmark aislado: costo Canvas real del FX vs círculo legacy, NO FPS.
    const cost=await evaluate(`(() => {
      const c=document.createElement('canvas');c.width=900;c.height=520;const ctx=c.getContext('2d'),t=[];
      for(let i=0;i<18;i++)NV.emitDashTrail(t,true,300+i*9,250,309+i*9,250,'#caa7ff');
      const b={trailDensity:1,decorativeParticleScale:1,secondaryGlow:true};
      NV.drawTrails(ctx,t,b);const results=[];
      for(const mode of ['legacy','high','performance']) {
        const start=performance.now();for(let i=0;i<240;i++) {
          ctx.clearRect(0,0,900,520);
          if(mode==='legacy')for(let j=0;j<18;j++){ctx.globalAlpha=.5;ctx.fillStyle='#caa7ff';ctx.beginPath();ctx.arc(300+j*9,250,8,0,Math.PI*2);ctx.fill();}
          else NV.drawTrails(ctx,t,mode==='high'?b:{trailDensity:.5,decorativeParticleScale:.5,secondaryGlow:false});
        }results.push({mode,msPerDraw:(performance.now()-start)/240,segments:t.length});
      }return results;
    })()`);ok('coste aislado Canvas (no FPS)',cost);
    assert.equal(errors.length,0,errors.join('\n'));
    fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({source:BASE,results:report,errors},null,2));return;
  }
  if(process.argv.includes('--arena-adaptation')) {
    assert(await evaluate('document.getElementById("lobbyPlayBtn") && document.body.innerText.trim().length>0'));
    await shot('lobby');
    // Galería procedural del lifecycle: mismo renderer y tiempos de producción.
    const atlas=await evaluate(`(() => {
      const c=document.createElement('canvas');c.width=1000;c.height=220;const ctx=c.getContext('2d');
      ctx.fillStyle='#030712';ctx.fillRect(0,0,c.width,c.height);
      for(let i=0;i<6;i++) {
        const e={x:80+i*165,y:105,radius:20,color:'#61e5ff',dead:false};
        e.arrival=i<3?{stage:'warning',remaining:[.9,.5,.08][i],duration:.9}:{stage:'puff',remaining:[.22,.13,.02][i-3],duration:.22};
        const hide=NV.drawEnemyArrival(ctx,e);
        if(!hide) {ctx.strokeStyle='#61e5ff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,14,0,Math.PI*2);ctx.stroke();}
        ctx.fillStyle='#abbad0';ctx.font='14px monospace';ctx.fillText(i<3?'AVISO / '+e.arrival.remaining+'s':'POOF / '+e.arrival.remaining+'s',e.x-58,185);
      }
      return c.toDataURL();
    })()`);
    fs.writeFileSync(path.join(OUT,'spawn-lifecycle.png'),Buffer.from(atlas.split(',')[1],'base64'));
    for(const [width,height,mobile] of [[1280,800,false],[915,412,true]]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
      await send('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:1});
      await navigate(mobile?'?mobile=1&fresh=1':'?fresh=1');
      assert(await fixture(1,5000,'legacy',true));await evaluate('NV.alpha.resume()');
      await until('NV.getState()==="playing"');await sleep(4500);
      const layout=await layoutSnapshot();assertPresentationLayout(layout);
      const s=await evaluate('NV.getRuntimeSnapshot()');assert.equal(s.outsideEnemies,0);
      assert.equal(s.softHostileTarget,23);assert(s.hostileBudget.hostiles<=30&&s.hostileBudget.heavy<=7);
      await shot('normal-spawn-'+width);ok('densidad y bounds compartidos '+width,{layout,snapshot:s});
    }
    await send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
    await send('Emulation.setTouchEmulationEnabled',{enabled:false,maxTouchPoints:1});
    const cases=[['normal',1],['normal',3],['normal',5],['normal',7],['normal',9],['normal',11],['normal',13],['normal',15],['normal',17],['normal',19],['easy',7],['hard',7]];
    for(const [difficulty,cleared] of cases) {
      await navigate('?fresh=1');
      assert(await fixture(cleared,5000,'full-roster',true,{difficulty,character:'rook'}));
      await evaluate('NV.alpha.resume()');await until('NV.getState()==="playing" && NV.getBoss()');
      const samples=[];let sawLaser=false,sawActiveLaser=false;
      for(let frame=0;frame<52;frame++) {
        if(frame===4)await evaluate('NV.input.setMoveRight(true)');
        if(frame===12)await evaluate('NV.input.setMoveRight(false);NV.input.setMoveDown(true)');
        if(frame===20)await evaluate('NV.input.setMoveDown(false);NV.input.setMoveLeft(true)');
        if(frame===28)await evaluate('NV.input.setMoveLeft(false);NV.input.setMoveUp(true)');
        if(frame===36)await evaluate('NV.input.setMoveUp(false)');
        await sleep(250);
        const s=await evaluate(`({s:NV.getRuntimeSnapshot(),m:{...NV.worldMetrics},b:NV.getBoss()&&{name:NV.getBoss().name,x:NV.getBoss().x,y:NV.getBoss().y,radius:NV.getBoss().radius,
          stage:NV.getBoss().encounter?.stage,cast:NV.getBoss().encounter?.cast,phase2:!!NV.getBoss().phase2}})`);
        assert.equal(s.s.state,'playing');assert(s.b,'boss no puede morir con pistola1 en esta muestra corta');
        assert.equal(s.s.outsideEnemies,0);assert(s.s.hostileBudget.hostiles<=30&&s.s.hostileBudget.heavy<=7);
        assert(s.b.x>=s.b.radius&&s.b.x<=s.m.arenaW-s.b.radius&&s.b.y>=s.b.radius&&s.b.y<=s.m.arenaH-s.b.radius);
        for(const h of s.s.sectorHazards) {
          sawLaser=true;assert.equal(h.W,s.m.arenaW);assert.equal(h.H,s.m.arenaH);
          if(h.state==='active')sawActiveLaser=true;
          if(h.state==='telegraph'||h.state==='active')assert.equal(s.b.stage,'recovery','láser y cast deben alternarse');
        }
        if(frame===0 || frame===24 || (s.s.sectorHazards.some(h=>h.state==='active') && !samples.some(p=>p.s.sectorHazards.some(h=>h.state==='active'))))
          await shot('boss-'+s.s.wave+'-'+difficulty+'-'+frame);
        samples.push(s);
      }
      assert(samples.some(s=>s.s.enemies>0),'no hubo soporte real');
      assert(samples.some(s=>(s.b.cast||0)>0),'boss no atacó');
      if(cleared===7)assert(sawActiveLaser,'Guardián no completó la activación del láser compatible');
      const performance=await evaluate('({monitor:NV.performanceMonitor.getSnapshot(),budget:NV.getVisualBudget()})');
      ok('boss '+(cleared+1)+' '+difficulty+': soporte, movimiento, autoataque y alternancia',{samples,sawLaser,sawActiveLaser,performance});
    }
    assert.equal(errors.length,0,errors.join('\n'));
    fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({date:new Date().toISOString(),source:BASE,results:report,errors},null,2));return;
  }
  if(process.argv.includes('--layout-only')) {
    for(const [width,height,mobile] of [[1280,800,false],[915,412,true],[844,390,true]]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
      await send('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:1});
      await navigate(mobile?'?mobile=1&fresh=1':'?fresh=1');
      ok('layout menú '+width+'x'+height,await layoutSnapshot());
      assert(await fixture(1));await evaluate('NV.alpha.resume()');await until('NV.getState()==="playing"');
      ok('layout partida '+width+'x'+height,await layoutSnapshot());await shot('layout-'+width+'x'+height);
    }
    assert.equal(errors.length,0,errors.join('\n'));
    fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({results:report,errors},null,2));return;
  }
  if (process.argv.includes('--perimeter-only')) {
    assert(await evaluate('document.body.innerText.trim().length>0 && document.getElementById("lobbyPlayBtn")'));
    await shot('lobby');
    async function go(x,y) {
      for(const [axis,target,negative,positive] of [['x',x,'Left','Right'],['y',y,'Up','Down']]) {
        const current=await evaluate('NV.getRuntimeSnapshot().player.'+axis);
        if(Math.abs(current-target)<3)continue;
        const increasing=target>current,dir=increasing?positive:negative;
        await evaluate('NV.input.setMove'+dir+'(true)');
        try {await until('NV.getRuntimeSnapshot().player.'+axis+(increasing?'>=':'<=')+target,14000);}
        finally {await evaluate('NV.input.setMove'+dir+'(false)');}
        await sleep(120);
      }
    }
    // Arte completo de los cuatro mapas y exterior, sin reubicar jugador/cámara.
    const atlas=await evaluate(`(() => {
      const W=NV.worldMetrics.arenaW,H=NV.worldMetrics.arenaH,P=NV.viewport.cameraExteriorPadding;
      const sheet=document.createElement('canvas');sheet.width=1440;sheet.height=900;const s=sheet.getContext('2d');
      s.fillStyle='#010209';s.fillRect(0,0,1440,900);
      const samples=[];
      for(const [i,wave] of [1,6,11,16].entries()) {
        const c=document.createElement('canvas');c.width=W+P*2;c.height=H+P*2;const ctx=c.getContext('2d');
        ctx.translate(P,P);NV.drawSectorBackdrop(ctx,W,H,0,wave,{tier:'full'});NV.drawSectorPerimeter(ctx,W,H,wave,{tier:'full'});
        for(const [x,y] of [[1,1],[W+P*2-2,1],[1,H+P*2-2],[W+P*2-2,H+P*2-2]]) {
          if(ctx.getImageData(x,y,1,1).data[3]!==255)throw new Error('exterior transparente en esquina');
        }
        s.drawImage(c,i%2*720,Math.floor(i/2)*450+25,720,425);
        s.fillStyle='#b5bfd5';s.font='14px monospace';s.fillText(NV.sectorVisualForWave(wave).name,i%2*720+14,Math.floor(i/2)*450+19);
        samples.push(NV.getSectorBackdropStats());
      }
      return {png:sheet.toDataURL(),samples};
    })()`);
    fs.writeFileSync(path.join(OUT,'cuatro-perimetros.png'),Buffer.from(atlas.png.split(',')[1],'base64'));
    ok('cuatro escenarios: exterior opaco, esquina cerrada y geometría cacheada',atlas.samples);
    for(const [width,height,mobile] of [[1280,800,false],[915,412,true],[844,390,true]]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
      await send('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:1});
      await navigate(mobile?'?mobile=1&fresh=1':'?fresh=1');
      // Móvil fuerza autoataque por contrato: railgun50 acababa la oleada antes
      // de llegar a la última esquina. Jefe legacy + pistola1 conservan combate
      // real durante el recorrido, sin congelar timers/HP/entidades ni el motor.
      // Desktop mantiene oleada común; el fire policy se aplica DESPUÉS de resume.
      assert(await fixture(mobile?4:1,5000,'legacy',true));await evaluate('NV.alpha.resume();NV.setFirePolicy("manual")');
      await until('NV.getState()==="playing"');
      const layout=await layoutSnapshot();assertPresentationLayout(layout);ok('layout/bounds preservados y HUD intacto '+width+'x'+height,layout);
      const m=await evaluate('({...NV.worldMetrics})'),P=await evaluate('NV.viewport.cameraExteriorPadding');
      const name=(mobile?'mobile':'desktop')+'-'+width+'x'+height;
      const points=[['centro',m.arenaW/2,m.arenaH/2],['izquierda',20,m.arenaH/2],
        ['superior-izquierda',20,30],['arriba',m.arenaW/2,30],['superior-derecha',m.arenaW-20,30],
        ['derecha',m.arenaW-20,m.arenaH/2],['inferior-derecha',m.arenaW-20,m.arenaH-20],
        ['abajo',m.arenaW/2,m.arenaH-20],['inferior-izquierda',20,m.arenaH-20]];
      const samples=[];
      for(const [slug,x,y] of points) {
        await go(x,y);
        const sample=await evaluate('({m:{...NV.worldMetrics},p:NV.getRuntimeSnapshot().player,stats:NV.getSectorBackdropStats()})');
        assert.equal(sample.m.arenaW,m.arenaW);assert.equal(sample.m.arenaH,m.arenaH);
        assert(sample.p.x>=20&&sample.p.x<=m.arenaW-20 && sample.p.y>=30&&sample.p.y<=m.arenaH-20);
        assert(Math.abs(sample.m.viewX-Math.max(-P,Math.min(m.arenaW-m.viewW+P,sample.p.x-m.viewW/2)))<1e-6);
        assert(Math.abs(sample.m.viewY-Math.max(-P,Math.min(m.arenaH-m.viewH+P,sample.p.y-m.viewH/2)))<1e-6);
        if(x===20)assert.equal(sample.m.viewX,-P);if(x===m.arenaW-20)assert.equal(sample.m.viewX,m.arenaW-m.viewW+P);
        if(y===30)assert.equal(sample.m.viewY,-P);if(y===m.arenaH-20)assert.equal(sample.m.viewY,m.arenaH-m.viewH+P);
        if(slug==='centro')assert(sample.m.viewX>0&&sample.m.viewY>0&&sample.m.viewX+sample.m.viewW<m.arenaW&&sample.m.viewY+sample.m.viewH<m.arenaH);
        assert.equal(await evaluate('NV.getState()'),'playing');assert.equal(await evaluate('NV.getRuntimeSnapshot().outsideEnemies'),0);
        await shot(name+'-'+slug);samples.push({slug,...sample});console.log('PASS '+name+' '+slug);
      }
      assert(samples.every(s=>s.stats.perimeterBuilds===samples[0].stats.perimeterBuilds),'cámara regenera geometría');
      await evaluate('NV.setGraphicsQuality("performance");document.getElementById("hudToggle").click()');await sleep(450);
      await shot(name+'-rendimiento-sin-hud');
      ok(name+': nueve posiciones físicas, sin expansión de gameplay',samples);
    }
    // Otros materiales con boss cerca del límite / control real, no setter de posición.
    await send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
    await send('Emulation.setTouchEmulationEnabled',{enabled:false,maxTouchPoints:1});
    for(const wave of [6,11,16]) {
      await navigate('?fresh=1');assert(await fixture(wave-1,5000,'full-roster'));
      await evaluate('NV.setFirePolicy("manual");NV.alpha.resume()');await until('NV.getState()==="playing"');
      const m=await evaluate('({...NV.worldMetrics})');await go(m.arenaW-20,30);await shot('region-'+wave+'-esquina-superior-derecha');
      const s=await evaluate('({m:{...NV.worldMetrics},p:NV.getRuntimeSnapshot().player,sector:NV.getSectorBackdropStats().sector})');
      assert.equal(s.m.viewY,-await evaluate('NV.viewport.cameraExteriorPadding'));assert.equal(s.m.arenaW,m.arenaW);ok('material/boss/amenazas en borde real, oleada '+wave,s);
    }
    // Emisores siguen en W/H reales, NO en +padding ni en la pantalla.
    await navigate('?fresh=1');assert(await fixture(6,5000,'full-roster'));
    await evaluate('NV.setFirePolicy("manual");NV.alpha.resume()');
    await go(20,30);await until('NV.getRuntimeSnapshot().sectorHazards.some(h=>h.state==="active")',12000);
    await shot('laser-borde-jugable-real');
    const laser=await evaluate('({m:{...NV.worldMetrics},hazards:NV.getRuntimeSnapshot().sectorHazards})');
    for(const h of laser.hazards){assert.equal(h.W,laser.m.arenaW);assert.equal(h.H,laser.m.arenaH);}
    ok('láseres conservan dimensiones autoritativas de arena',laser);
    assert.equal(errors.length,0,errors.join('\n'));
    assert(!network.some(url=>/^https?:/.test(url)&&!url.startsWith(BASE)));
    fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({date:new Date().toISOString(),results:report,errors,source:BASE},null,2));
    return;
  }
  if (process.argv.includes('--backgrounds-only')) {
    // Arte puro + integración real. Perfiles/guardados descartables; no setters
    // de cámara/jugador, ni cambios de progresión para fabricar una captura.
    const gallery = await evaluate(`(() => {
      const m=NV.worldMetrics, W=m.arenaW, H=m.arenaH;
      const atlas=document.createElement('canvas');atlas.width=1440;atlas.height=880;
      const a=atlas.getContext('2d'), images=[], samples=[];
      a.fillStyle='#02040b';a.fillRect(0,0,1440,880);
      for (const [i,wave] of [1,6,11,16].entries()) {
        const c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d');
        const cold=performance.now();NV.drawSectorBackdrop(ctx,W,H,0,wave,{tier:'full'});
        const coldMs=performance.now()-cold, builds=NV.getSectorBackdropStats().builds;
        const timings=[];
        for(let n=0;n<120;n++){const start=performance.now();NV.drawSectorBackdrop(ctx,W,H,n,wave,{tier:'full'});timings.push(performance.now()-start);}
        timings.sort((a,b)=>a-b);
        if(NV.getSectorBackdropStats().builds!==builds)throw new Error('cache regenera por frame');
        const before=c.toDataURL(), state=JSON.stringify(NV.getRuntimeSnapshot());
        NV.drawSectorBackdrop(ctx,W,H,99999,wave,{tier:'full'});
        if(before!==c.toDataURL())throw new Error('hitos viajan por el mundo sin mover cámara');
        if(state!==JSON.stringify(NV.getRuntimeSnapshot()))throw new Error('arte modifica gameplay');
        a.drawImage(c,i%2*720,Math.floor(i/2)*440+28,720,412);
        a.fillStyle='#b5bfd5';a.font='14px monospace';a.fillText(NV.sectorVisualForWave(wave).name,i%2*720+16,Math.floor(i/2)*440+20);
        images.push({wave,full:before});
        ctx.clearRect(0,0,W,H);NV.drawSectorBackdrop(ctx,W,H,0,wave,{tier:'minimal'});
        images[i].minimal=c.toDataURL();
        samples.push({wave,coldMs,warmP50:timings[60],warmP95:timings[114],stats:NV.getSectorBackdropStats()});
      }
      return {atlas:atlas.toDataURL(),images,samples};
    })()`);
    function png(data,name) {fs.writeFileSync(path.join(OUT,name+'.png'),Buffer.from(data.split(',')[1],'base64'));}
    png(gallery.atlas,'cuatro-regiones');
    for(const sample of gallery.images) {png(sample.full,'region-'+sample.wave+'-full');png(sample.minimal,'region-'+sample.wave+'-minimal');}
    ok('cuatro composiciones, hitos inmutables y cache caliente',gallery.samples);
    for (const [width,height,mobile] of [[1280,800,false],[915,412,true],[844,390,true]]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
      await send('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:1});
      for(const wave of [1,6,11,16]) {
        await navigate(mobile?'?mobile=1&fresh=1':'?fresh=1');
        await evaluate('NV.setFirePolicy("manual")');
        if(wave===1) await evaluate('document.getElementById("lobbyPlayBtn").click()');
        else {assert(await fixture(wave-1,5000,'full-roster'));assert(await evaluate('NV.alpha.resume()'));}
        await until('NV.getState()==="playing"');await sleep(350);
        const name=(mobile?'mobile':'desktop')+'-'+width+'x'+height+'-region-'+wave;
        const before=await evaluate('({stats:NV.getSectorBackdropStats(),m:{...NV.worldMetrics},p:NV.getRuntimeSnapshot().player})');
        assert.equal(before.stats.sector,await evaluate('NV.sectorVisualForWave('+wave+').id'));
        assert.equal(before.m.arenaW,before.m.viewW*1.5);
        assert.equal(before.m.arenaH,before.m.viewH*1.5);
        await shot(name+'-inicio');
        await evaluate('NV.input.setMoveUp(true);NV.input.setMoveRight(true)');
        // El inicio está cerca de la pared inferior; hay que salir del clamp
        // físico antes de exigir desplazamiento vertical de la cámara.
        await until('NV.worldMetrics.viewX>'+before.m.viewX+' && NV.worldMetrics.viewY<'+before.m.viewY,6000);
        await evaluate('NV.input.setMoveUp(false);NV.input.setMoveRight(false)');await sleep(180);
        const after=await evaluate('({stats:NV.getSectorBackdropStats(),m:{...NV.worldMetrics},p:NV.getRuntimeSnapshot().player})');
        assert(after.p.x>before.p.x+20 && after.p.y<before.p.y-20,'entrada física horizontal/vertical');
        assert(after.m.viewX>before.m.viewX && after.m.viewY<before.m.viewY,'cámara realmente se desplazó');
        assert.equal(after.stats.builds,before.stats.builds,'movimiento no regenera arte');
        await shot(name+'-movimiento');
        assert.equal(await evaluate('NV.getState()'),'playing');
        assert.equal(await evaluate('NV.getRuntimeSnapshot().outsideEnemies'),0);
        assert(!(await evaluate('NV.getRenderDiagnostics()')).hasOwnProperty('grid'));
        await evaluate('NV.setGraphicsQuality("performance")');await sleep(600);
        const quality=await evaluate('({stats:NV.getSectorBackdropStats(),tier:NV.getVisualBudget().tier})');
        assert.equal(quality.tier,'reduced');assert.equal(quality.stats.builds,after.stats.builds);
        await shot(name+'-rendimiento');
        ok(name+': cámara, fondo y presupuesto sin alterar arena',{before,after,quality});
      }
    }
    // Capturar daño/telegraph reales contra el arte, no versiones estáticas de hazards.
    await send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
    await send('Emulation.setTouchEmulationEnabled',{enabled:false,maxTouchPoints:1});
    for(const wave of [7,13,17]) {
      await navigate('?fresh=1');assert(await fixture(wave-1,5000,'full-roster'));
      await evaluate('NV.setFirePolicy("manual");NV.alpha.resume()');
      await until('NV.getRuntimeSnapshot().sectorHazards.length>0',9000);
      await shot('region-'+wave+'-hazard-aviso');
      await until('NV.getRuntimeSnapshot().sectorHazards.some(h=>h.state==="active")',6000);
      await shot('region-'+wave+'-hazard-activo');
      ok('legibilidad de enemigos, proyectiles y hazard real / oleada '+wave,await evaluate('NV.getRuntimeSnapshot().sectorHazards'));
    }
    // Cambio REAL tras el jefe de oleada 10: tienda/desplegar conserva 10->11.
    await navigate('?fresh=1');assert(await fixture(9,5000,'full-roster'));
    await evaluate('NV.alpha.resume()');await until('NV.getBoss() && NV.getBoss().encounter');
    await shot('transicion-10-jefe');
    await evaluate('NV.getBoss().hp=0');await until('NV.getState()==="shop"',7000);
    await evaluate('document.getElementById("skipWave").click()');await until('NV.getState()==="playing"');await sleep(250);
    assert.equal(await evaluate('NV.alpha.snapshot().wave'),11);
    assert.equal(await evaluate('NV.getSectorBackdropStats().sector'),'fracture');await shot('transicion-11-fractura');
    ok('progresión existente: jefe 10 -> tienda -> escenario de oleada 11');
    assert.equal(errors.length,0,errors.join('\n'));
    assert(!network.some(url=>/^https?:/.test(url)&&!url.startsWith(BASE)));
    fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({date:new Date().toISOString(),results:report,errors,source:BASE},null,2));
    return;
  }
  if (process.argv.includes('--camera-only')) {
    // Recorridos físicos: no setters de jugador, no cámara/estado paralelos.
    for (const [width,height,mobile] of [[900,520,false],[915,412,false],[844,390,false],[915,412,true],[844,390,true]]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
      await send('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:1});
      await navigate(mobile?'?mobile=1':'');
      assert(await fixture(2,5000,'full-roster'));await evaluate("NV.setFirePolicy('manual');NV.alpha.resume()");
      await sleep(150);
      const name=(mobile?'mobile':'desktop')+'-'+width+'x'+height;
      const metrics=await evaluate('({...NV.worldMetrics})');
      assert.equal(metrics.arenaW,metrics.viewW*1.5);assert.equal(metrics.arenaH,metrics.viewH*1.5);
      assert.equal(await evaluate('NV.capabilities.isMobile'),mobile);
      if(mobile)assert(await evaluate("matchMedia('(pointer:coarse)').matches && NV.viewport.dynamicViewActive"),'emulación móvil con puntero grueso real');
      const initial=await evaluate('NV.getRuntimeSnapshot().player.x');
      await evaluate('NV.input.setMoveRight(true)');
      await until('NV.getRuntimeSnapshot().player.x > '+(initial+130));
      await evaluate('NV.input.setMoveRight(false)');await sleep(200);
      const sample=await evaluate(`(() => {const p=NV.getRuntimeSnapshot().player,m=NV.worldMetrics;
        const screen=NV.gameToScreen(p.x,p.y),world=NV.screenToGame(screen.x,screen.y);
        return {p,m:{...m},world,screen};})()`);
      assert(sample.m.viewX>0);assert(Math.abs(sample.p.x-sample.world.x)<1e-6);
      assert(Math.abs(sample.p.y-sample.world.y)<1e-6);
      const P=await evaluate('NV.viewport.cameraExteriorPadding');
      assert(Math.abs(sample.m.viewX-Math.max(-P,Math.min(sample.m.arenaW-sample.m.viewW+P,sample.p.x-sample.m.viewW/2)))<1e-6);
      await shot('camera-'+name+'-desplazada');
      if (!mobile && width===900) {
        // Un cursor físico inmóvil debe conservar su posición en pantalla al mover cámara.
        const cursor=await evaluate(`(() => {const r=NV.canvas.getBoundingClientRect();return {x:Math.round(r.left+r.width*.72),y:Math.round(r.top+r.height*.40)};})()`);
        await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:cursor.x,y:cursor.y});
        await evaluate('NV.input.setMoveUp(true)');await sleep(600);
        await evaluate('NV.input.setMoveUp(false)');await sleep(200);
        const aim=await evaluate(`({p:NV.getRuntimeSnapshot().player,intent:NV.input.getCombatIntent(),target:NV.screenToGame(${cursor.x},${cursor.y})})`);
        assert(Math.abs(aim.intent.aimWorldX-aim.target.x)<1e-6,JSON.stringify(aim));
        assert(Math.abs(aim.intent.aimWorldY-aim.target.y)<1e-6,JSON.stringify(aim));
        // Los rects del dock son locales al HUD, no posiciones del mundo.
        const slot=await evaluate(`(() => {const r=NV.consumSlotRects[0],m=NV.worldMetrics;
          return NV.gameToScreen(m.viewX+r.x+r.w/2,m.viewY+r.y+r.h/2);})()`);
        await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,x:slot.x,y:slot.y});
        assert.equal(await evaluate('NV.input.getCombatIntent().fireIntent'),false,'click HUD no dispara');
        await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,x:slot.x,y:slot.y});
        // Recorrer los cuatro límites físicos usando la entrada real.
        for(const [direction,expression] of [
          ['Right','p.x>=m.arenaW-20 && m.viewX===m.arenaW-m.viewW+NV.viewport.cameraExteriorPadding'],
          ['Up','p.y<=30 && m.viewY===-NV.viewport.cameraExteriorPadding'],['Left','p.x<=20 && m.viewX===-NV.viewport.cameraExteriorPadding'],
          ['Down','p.y>=m.arenaH-20 && m.viewY===m.arenaH-m.viewH+NV.viewport.cameraExteriorPadding']]) {
          await evaluate('NV.input.setMove'+direction+'(true)');
          await until(`(() => {const p=NV.getRuntimeSnapshot().player,m=NV.worldMetrics;return ${expression};})()`,12000);
          await evaluate('NV.input.setMove'+direction+'(false)');await sleep(100);
          await shot('camera-borde-'+direction);
        }
        await evaluate('NV.input.setMoveRight(true);NV.input.setSlide(true)');await sleep(100);
        await evaluate('NV.input.setSlide(false);NV.input.setMoveRight(false)');
      }
      await evaluate('NV.input.togglePause()');
      const paused=await evaluate('NV.getRuntimeSnapshot().player');await sleep(200);
      assert.deepEqual(await evaluate('NV.getRuntimeSnapshot().player'),paused);
      await shot('camera-'+name+'-pausa');await evaluate('NV.input.togglePause()');
      await evaluate('document.getElementById("hudToggle").click()');
      assert.equal(await evaluate('NV.alpha.snapshot().showHUD'),false);await shot('camera-'+name+'-sin-hud');
      if(mobile) {
        await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});await sleep(200);
        assert(await evaluate('NV.worldMetrics.viewX+NV.worldMetrics.viewW<=NV.worldMetrics.arenaW+NV.viewport.cameraExteriorPadding+1e-6'));
        assert(await evaluate('NV.getRuntimeSnapshot().player.x<=NV.worldMetrics.arenaW-20'));
      }
      assert.equal(await evaluate('NV.alpha.snapshot().state'),'playing');
      assert.equal(await evaluate('NV.getRuntimeSnapshot().outsideEnemies'),0);
      ok('cámara: recorrido, conversión, pausa y HUD '+name,sample);
    }
    assert.equal(errors.length,0,errors.join('\n'));
    assert(!network.some(url=>/^https?:/.test(url)&&!url.startsWith(BASE)));
    fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({date:new Date().toISOString(),results:report,errors,profile,source:BASE},null,2));
    return;
  }
  if (process.argv.includes('--difficulty-only')) {
    for (const difficulty of ['easy','hard']) for (const bossIndex of [0,1,2,3,4,5,6,7,8,9]) {
      await navigate('?combatLab=1&fresh=1');
      assert(await evaluate(`NV.combatLabRuntime.start({encounterMode:'boss',bossIndex:${bossIndex},
        characterId:'rook',difficultyId:'${difficulty}',weaponId:'pistol',weaponLevel:1,weaponFusion:0,
        firePolicy:'manual',durationMode:'infinite'}).ok`));
      await until("NV.getBoss().encounter && NV.getBoss().encounter.stage==='windup'",5000);
      const first=await evaluate('({name:NV.getBoss().name,rays:NV.getBoss().encounter.rays.length})');
      if(difficulty==='hard' && bossIndex===0)assert.equal(first.rays,3);
      if(difficulty==='hard' && bossIndex===5)assert.equal(first.rays,10);
      await evaluate('NV.getBoss().hp=NV.getBoss().maxHp*.45');
      await until("NV.getBoss().phase2 && NV.getBoss().encounter.stage==='windup'",5000);
      if(difficulty==='hard')assert((await evaluate('NV.getBoss().encounter.pulses'))>=2);
      await shot('boss-'+bossIndex+'-'+difficulty+'-fase2');
      await until('NV.getBoss().encounter.cast>=1',5000);
      assert.equal(await evaluate('NV.getState()'),'playing');
      ok(first.name+' / '+difficulty+': aviso, fase y ejecución',first);
    }
    assert.equal(errors.length,0,errors.join('\n'));
    assert(!network.some(url=>/^https?:/.test(url)&&!url.startsWith(BASE)));
    fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({results:report,errors,source:BASE},null,2));
    return;
  }
  if (process.argv.includes('--consumables-only')) {
    assert(await fixture(1,5000));await evaluate('NV.alpha.resume()');
    assert.equal(await evaluate('NV.input.getConsumableInfo().count'),1);
    await evaluate('NV.input.useSelected()');
    assert.equal(await evaluate('NV.input.getConsumableInfo().count'),1,'vida completa conserva poción');
    await navigate();assert(await fixture(1,4950));await evaluate('NV.alpha.resume()');
    await evaluate('NV.input.useSelected()');
    assert.equal(await evaluate('NV.input.getConsumableInfo()'),null,'curación válida gasta una sola carga');
    assert.equal(await evaluate('NV.getRuntimeSnapshot().player.hp'),4990);
    await shot('consumible-curacion-real');
    assert.equal(errors.length,0,errors.join('\n'));
    ok('poción productiva: sin desperdicio, curación real y consumo único');
    fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({results:report,errors,source:BASE},null,2));
    return;
  }
  if (!process.argv.includes('--wave3-only') && !process.argv.includes('--boss-portals-only') && !process.argv.includes('--guardian-only')) {
  assert.equal(await evaluate('NV.getState()'), 'menu');
  await shot('01-lobby');
  for (const pilot of ['boti','nova','rook','swarm']) { assert(await evaluate(`NV.selectPilot('${pilot}')`)); assert.equal(await evaluate('NV.alpha.snapshot().character'), pilot); }
  await evaluate("NV.selectPilot('boti'); document.querySelector('.alpha-links button').click()");
  assert(await evaluate('document.querySelector(".alpha-dialog").open')); await shot('02-manual'); await evaluate('document.querySelector(".alpha-dialog").close()');
  ok('lobby, cuatro pilotos y manual');
  await evaluate('document.getElementById("lobbyPlayBtn").click()'); await until('NV.getState() === "playing"');
  const x = await evaluate('NV.getRuntimeSnapshot().player.x'); await evaluate('NV.input.setMoveLeft(true)'); await sleep(200); await evaluate('NV.input.setMoveLeft(false)'); await sleep(300);
  assert((await evaluate('NV.getRuntimeSnapshot().player.x')) < x - 5); await shot('03-combate');
  await evaluate('NV.input.togglePause()'); assert(await evaluate('NV.alpha.snapshot().paused')); await evaluate('NV.input.togglePause()');
  ok('inicio real, movimiento y pausa');
  await until('NV.getRuntimeSnapshot().wavePressure !== null', 10000);
  await shot('03-aviso-enemigo');
  ok('primera zona: ataque enemigo anunciado antes de impactar');
  await until('NV.getState() === "gameover" || NV.getRuntimeSnapshot().waveTimer <= 0', 30000);
  assert.notEqual(await evaluate('NV.getState()'), 'shop', 'la oleada 1 no debe terminar sólo por reloj');
  if (await evaluate('NV.getState() === "playing"')) {
    const objective = await evaluate('NV.getRuntimeSnapshot().objective');
    assert(objective.cleared < objective.required, JSON.stringify(objective));
  }
  await shot('03-objetivo-pendiente');
  await until('NV.getState() === "gameover" || NV.getState() === "shop"', 60000);
  assert.equal(await evaluate('NV.getState()'), 'gameover', 'Normal no debe ganarse quieto hasta el final');
  ok('oleada 1 Normal: quedarse quieto termina en derrota, no en tienda');
  await navigate();
  await evaluate("NV.settings.gameplay.difficulty='easy'; document.getElementById('lobbyPlayBtn').click()");
  await until('NV.getState() === "gameover" || NV.getRuntimeSnapshot().waveTimer <= 0', 30000);
  assert.notEqual(await evaluate('NV.getState()'), 'shop', 'Fácil no debe cerrarse solo al agotar el reloj');
  await until('NV.getState() === "gameover" || NV.getState() === "shop"', 60000);
  assert.equal(await evaluate('NV.getState()'), 'gameover', 'Fácil no debe ganarse quieto hasta el final');
  ok('oleada 1 Fácil: quedarse quieto termina en derrota, no en tienda');
  const idleRuns = await evaluate('NV.expedition.profile().runs');
  // Fixture de guardado: limpiar todos los grupos, comprar y restaurar.
  await navigate(); assert(await fixture(1)); await evaluate('NV.alpha.resume()');
  assert.equal(await evaluate('NV.alpha.snapshot().wave'), 2);
  await until('NV.getState() === "shop"', 60000);
  await sleep(650); await shot('04-tienda');
  const shopLayout = await evaluate(`(() => {
    const deploy = document.getElementById('skipWave').getBoundingClientRect();
    const grid = document.querySelector('#shop .shop-grid');
    return { deployWidth: deploy.width, deployRight: innerWidth - deploy.right,
      gridOverflow: getComputedStyle(grid).overflowY, deployParent: document.getElementById('skipWave').parentElement.id };
  })()`);
  assert(shopLayout.deployWidth >= 220 && shopLayout.deployWidth < 350, JSON.stringify(shopLayout));
  assert(shopLayout.deployRight < 35 && shopLayout.gridOverflow === 'visible' && shopLayout.deployParent === 'shop', JSON.stringify(shopLayout));
  await evaluate('document.querySelector(".alpha-prep-trigger").click()');
  assert(await evaluate('document.querySelector(".alpha-dialog").open'));
  await shot('04-preparacion');
  const before = await evaluate('NV.alpha.snapshot().shards');
  assert(await evaluate('!document.querySelectorAll(".alpha-prep")[2].disabled'));
  await evaluate('document.querySelectorAll(".alpha-prep")[2].click()');
  assert(await evaluate('NV.alpha.snapshot().run.contract')); assert.equal(await evaluate('NV.alpha.prepare("repair")'), false);
  assert.equal(await evaluate('NV.alpha.snapshot().shards'), before);
  assert(await evaluate('NV.alpha.route("mines")'));
  await evaluate('document.querySelector(".alpha-dialog").close()');
  await evaluate('document.querySelector(".alpha-save-quit").click()');
  assert.equal(await evaluate('NV.getState()'), 'menu');
  assert(await evaluate('NV.expedition.load() !== null'));
  await navigate(); await until('!document.getElementById("alphaResume").hidden');
  await evaluate('document.getElementById("alphaResume").click()');
  assert.equal(await evaluate('NV.alpha.snapshot().wave'), 3); assert.equal(await evaluate('NV.alpha.snapshot().event'), 'mines');
  assert.equal(await evaluate('NV.alpha.snapshot().run.contract'), true);
  assert.equal(await evaluate('NV.alpha.snapshot().inventory.find(w=>w.id==="railgun").level'), 50);
  ok('fin de oleada, tienda, contrato, ruta, guardar/salir y continuar');
  await navigate(); assert(await fixture(9)); await evaluate('NV.alpha.resume(); NV.getBoss().hp=NV.getBoss().maxHp*.49');
  await until('NV.getBoss() && NV.getBoss().split === true');
  await sleep(1400); await shot('05-mutante-fase2');
  assert.equal(await evaluate('NV.getBoss().name'), 'MUTANTE');
  assert((await evaluate('NV.getRuntimeSnapshot().enemies')) >= 3);
  ok('mutante: núcleo, brotes propios y fase 2 real');
  // Cada entrada nueva usa el checkpoint real y nextWave de producción, no el Lab.
  const historyBosses = [];
  for (let index = 0; index < 10; index++) {
    await navigate(); assert(await fixture(index * 2 + 1, 5000, 'full-roster'));
    await evaluate('NV.alpha.resume()');
    const actual = await evaluate('({name:NV.getBoss() && NV.getBoss().name, expected:NV.BOSS_TYPES[' + index + '].name, wave:NV.alpha.snapshot().wave, progression:NV.alpha.snapshot().run.bossProgression})');
    assert.equal(actual.name, actual.expected); assert.equal(actual.wave, (index + 1) * 2);
    assert.equal(actual.progression, 'full-roster'); historyBosses.push(actual);
    if (index === 0) { await sleep(600); await shot('05-historia-diez-jefes'); }
  }
  assert.equal(new Set(historyBosses.map(b => b.name)).size, 10);
  ok('Historia: diez entradas distintas en producción, guardado compatible', historyBosses);
  await navigate(); assert(await fixture(4, 1)); await evaluate('NV.alpha.resume()');
  await until('NV.getState() === "gameover"', 22000);
  assert.equal(await evaluate('NV.expedition.load()'), null);
  assert.equal(await evaluate('NV.expedition.profile().runs'), idleRuns + 1);
  await evaluate('document.getElementById("restartBtn").click()');
  assert.equal(await evaluate('NV.getState()'), 'menu');
  ok('muerte auténtica, checkpoint eliminado, recompensa única y reinicio');
  // Final de expedición: se reduce el HP del jefe sólo para verificar la transición,
  // luego se lo mata con un disparo auténtico (no se invoca la victoria desde el test).
  await navigate(); assert(await fixture(19)); await evaluate('NV.alpha.resume(); NV.getBoss().hp=1');
  await evaluate('NV.input.setAimWorld(NV.getBoss().x,NV.getBoss().y); NV.input.setFire(true)');
  await until('NV.getState() === "gameover"', 18000);
  assert.equal(await evaluate('document.getElementById("goTitle").textContent'), 'VACÍO SELLADO');
  assert.equal(await evaluate('NV.expedition.load()'), null);
  assert.equal(await evaluate('NV.expedition.profile().wins'), 1);
  assert.equal(await evaluate('NV.expedition.profile().runs'), idleRuns + 2); await shot('05-victoria');
  await evaluate('document.getElementById("restartBtn").click()'); assert.equal(await evaluate('NV.getState()'), 'menu');
  ok('jefe final, victoria única, récord persistente y regreso al lobby');
  // El lanzador fresh no puede prometer un guardado: ofrece salir sin guardar
  // y conserva intacto el checkpoint normal del mismo origen.
  await navigate(); assert(await fixture(1));
  await navigate('?fresh=1');
  assert(await evaluate('NV.alpha.snapshot().saveDisabled'));
  await until('document.getElementById("alphaResume").hidden');
  assert(await evaluate('NV.alpha.resume()')); // Preparación de fixture sin botón visible.
  await until('NV.getState() === "shop"', 60000);
  await until('document.querySelector(".alpha-save-quit").textContent === "SALIR SIN GUARDAR"', 3000);
  assert.equal(await evaluate('document.querySelector(".alpha-save-quit").textContent'), 'SALIR SIN GUARDAR');
  await evaluate('document.querySelector(".alpha-save-quit").click()');
  assert.equal(await evaluate('NV.getState()'), 'menu');
  assert.equal(await evaluate('NV.expedition.load().wave'), 1);
  ok('modo fresh: salida honesta sin alterar el checkpoint normal');
  await evaluate('NV.expedition.clear()'); // Solo el perfil descartable de este test.
  // Móvil usa el MISMO motor. Comprobar overflow e interacción en ambos viewports.
  for (const [width,height] of [[900,520],[915,412],[844,390]]) {
    await send('Emulation.setDeviceMetricsOverride', { width,height,deviceScaleFactor:1,mobile:false });
    await navigate(width === 900 ? '' : '?mobile=1'); await sleep(400);
    await shot('06-viewport-' + width + 'x' + height);
    assert(await evaluate('document.documentElement.scrollWidth <= innerWidth+2'));
    const bounds = await evaluate('({ bottom: document.querySelector(".alpha-launch").getBoundingClientRect().bottom, height: innerHeight })');
    assert(bounds.bottom <= bounds.height + 2, JSON.stringify(bounds));
    await evaluate('document.getElementById("lobbyPlayBtn").click()'); assert.equal(await evaluate('NV.getState()'), 'playing');
    ok('viewport ' + width + 'x' + height);
  }
  // Corte C1: los roles reconstruidos deben poder convivir en el runtime real
  // de producción. Combat Lab sólo arma la escena; comportamiento y render son
  // los mismos que usa una expedición normal.
  await send('Emulation.setDeviceMetricsOverride', { width:1280,height:800,deviceScaleFactor:1,mobile:false });
  {
    const before = loadSequence;
    await send('Page.navigate', { url: BASE + '/index.html?combatLab=1&fresh=1' });
    for (let i = 0; i < 100 && loadSequence === before; i++) await sleep(100);
    assert(loadSequence > before, 'Combat Lab terminó de cargar');
  }
  await until('window.NV && NV.combatLabRuntime && NV.combatLabRuntime.ready');
  const roleResult = await evaluate(`NV.combatLabRuntime.start({
    encounterMode:'enemies', characterId:'boti', wave:12, difficultyId:'normal',
    durationMode:'infinite', durationSeconds:30,
    composition:[
      {enemyId:'drone',quantity:1},
      {enemyId:'tank',quantity:1},
      {enemyId:'elite_base',quantity:1},
      {enemyId:'elite_bulwark',quantity:1},
      {enemyId:'elite_swift',quantity:1}
    ]
  })`);
  assert(roleResult && roleResult.ok, JSON.stringify(roleResult));
  await until('NV.combatLabRuntime.snapshot().activeEnemies === 5');
  await sleep(1200); await shot('07-roles-entrada');
  await sleep(1300); await shot('07-roles-combate');
  const roleSnapshot = await evaluate('NV.combatLabRuntime.snapshot()');
  assert.deepEqual(roleSnapshot.activeById, { drone:1, tank:1, elite_base:1, elite_bulwark:1, elite_swift:1 });
  assert.equal(roleSnapshot.status, 'RUNNING');
  ok('roles C1/C2: dron, tanque, comandante, bastión y centella en runtime real');
  // Integración real: el aviso anti-espera debe llegar al pipeline de daño del
  // jugador. El test unitario del encuentro no detecta un callback omitido aquí.
  await evaluate(`(() => {
    window.__nvIdleHits = [];
    const apply = NV.applyPlayerDamage;
    NV.applyPlayerDamage = function (damage, options) {
      const result = apply(damage, options);
      if (options && options.cause === 'boss-idle-pressure') window.__nvIdleHits.push({ damage, applied: !!result.applied });
      return result;
    };
  })()`);
  const idleBoss = await evaluate(`NV.combatLabRuntime.start({
    encounterMode:'boss', bossIndex:0, characterId:'boti', difficultyId:'normal',
    weaponId:'pistol', weaponLevel:1, weaponFusion:0, firePolicy:'manual',
    durationMode:'infinite'
  })`);
  assert(idleBoss && idleBoss.ok, JSON.stringify(idleBoss));
  await until('window.__nvIdleHits.some(hit => hit.applied)', 10000);
  assert((await evaluate('NV.getRuntimeSnapshot().player.hp')) < 120, 'la presión anti-espera debe quitar HP real');
  ok('JEFE: aviso anti-espera aplica daño real si el jugador permanece quieto');
  await until("NV.getBoss() && NV.getBoss().encounter && NV.getBoss().encounter.stage === 'windup' && NV.getBoss().encounter.rays.length === 3", 10000);
  await shot('08-jefe-abanico');
  ok('JEFE: el segundo patrón anuncia tres carriles en runtime real');
  }
  // Reproducción del bloqueo informado en oleada 3: medir todo el asalto real.
  if (!process.argv.includes('--boss-portals-only') && !process.argv.includes('--guardian-only')) {
  await navigate(); assert(await fixture(2, 5000, 'full-roster')); await evaluate("NV.setFirePolicy('legacy-auto'); NV.alpha.resume()");
  await until('NV.getRuntimeSnapshot().arrivals > 0', 5000);
  await shot('09a-aparicion-aviso');
  await until('NV.getRuntimeSnapshot().arrivalPuffs > 0', 10000);
  await shot('09b-aparicion-nube');
  ok('aparición real: aviso y nube antes del enemigo');
  await evaluate(`(() => { window.__arenaCheck = { samples:0, outside:0 };
    const sample = () => { const s=NV.getRuntimeSnapshot(); if (s.state !== 'playing') return;
      window.__arenaCheck.samples++; window.__arenaCheck.outside=Math.max(window.__arenaCheck.outside,s.outsideEnemies);
      const direction = Math.floor(s.frame / 120) % 4;
      NV.input.setMoveUp(direction === 0); NV.input.setMoveRight(direction === 1);
      NV.input.setMoveDown(direction === 2); NV.input.setMoveLeft(direction === 3);
      requestAnimationFrame(sample); }; sample(); })()`);
  assert(await evaluate('document.querySelector(".alpha-run-strip").hidden'), 'sin franja de sectores no explicados');
  await evaluate('document.getElementById("hudToggle").click()');
  await until('document.querySelector(".alpha-run-strip").hidden', 3000);
  assert.equal(await evaluate('NV.alpha.snapshot().showHUD'), false);
  await evaluate('document.getElementById("hudToggle").click()');
  assert.equal(await evaluate('NV.alpha.snapshot().showHUD'), true);
  await shot('09-oleada3-spawn-interior');
  await until('NV.getState() === "shop"', 90000);
  const arenaCheck = await evaluate('window.__arenaCheck');
  assert(arenaCheck.samples > 100 && arenaCheck.outside === 0, JSON.stringify(arenaCheck));
  ok('oleada 3: cero enemigos exteriores durante el asalto, cierre y NO HUD', arenaCheck);
  }
  await navigate('?combatLab=1&fresh=1');
  assert(await evaluate(`NV.combatLabRuntime.start({encounterMode:'boss',bossIndex:2,
    characterId:'boti',difficultyId:'normal',weaponId:'pistol',weaponLevel:1,weaponFusion:0,
    firePolicy:'manual',durationMode:'infinite'}).ok`));
  await until("NV.getBoss().encounter && NV.getBoss().encounter.stage === 'windup' && NV.getBoss().encounter.origins && NV.getBoss().encounter.origins.length === 3",5000);
  await shot('10-invocador-portales');
  await until('NV.getBoss().encounter.cast >= 1',5000);
  assert((await evaluate('NV.getRuntimeSnapshot().enemies'))>=3);
  ok('Señor del Vacío: tres orígenes anunciados, ejecución e invocación reales');
  await navigate('?combatLab=1&fresh=1');
  assert(await evaluate(`NV.combatLabRuntime.start({encounterMode:'boss',bossIndex:3,
    characterId:'boti',difficultyId:'normal',weaponId:'pistol',weaponLevel:1,weaponFusion:0,
    firePolicy:'manual',durationMode:'infinite'}).ok`));
  await until("NV.getBoss().encounter && NV.getBoss().encounter.stage === 'windup' && Number.isFinite(NV.getBoss().encounter.gap)",5000);
  await shot('11-guardian-hueco');
  assert.equal(await evaluate('NV.getBoss().encounter.rays.length'),9);
  await until('NV.getBoss().encounter.cast >= 1',5000);
  // Fixture de transición: prueba la segunda fase sin esperar una pelea manual.
  await evaluate('NV.getBoss().hp = NV.getBoss().maxHp * .45');
  await until("NV.getBoss().phase2 && NV.getBoss().encounter.stage === 'windup' && NV.getBoss().encounter.rays.length === 3",5000);
  await shot('12-guardian-fase-dos');
  ok('Guardián: hueco avisado y segunda lectura de tres carriles en runtime real');
  await navigate('?combatLab=1&fresh=1');
  assert(await evaluate(`NV.combatLabRuntime.start({encounterMode:'boss',bossIndex:4,
    characterId:'rook',difficultyId:'normal',weaponId:'pistol',weaponLevel:1,weaponFusion:0,
    firePolicy:'manual',durationMode:'infinite'}).ok`));
  await until("NV.getBoss().encounter && NV.getBoss().encounter.stage === 'windup' && NV.getBoss().encounter.origins && NV.getBoss().encounter.origins.length === 3",5000);
  await shot('12b-destructor-tres-lanzas');
  await until('NV.getBoss().encounter.cast >= 1',5000);
  await evaluate('NV.getBoss().hp=NV.getBoss().maxHp*.45');
  await until("NV.getBoss().phase2 && NV.getBoss().encounter.stage === 'windup' && NV.getBoss().encounter.rays.length === 5",5000);
  await shot('12c-destructor-fase-dos');
  ok('Destructor: tres orígenes reales, abanico y cinco carriles de segunda fase');
  await navigate('?combatLab=1&fresh=1');
  assert(await evaluate(`NV.combatLabRuntime.start({encounterMode:'boss',bossIndex:5,
    characterId:'rook',difficultyId:'normal',weaponId:'pistol',weaponLevel:1,weaponFusion:0,
    firePolicy:'manual',durationMode:'infinite'}).ok`));
  await until("NV.getBoss().encounter && NV.getBoss().encounter.stage==='windup' && NV.getBoss().encounter.rays.length===6",5000);
  await shot('12d-nemesis-pinza');
  await until('NV.getBoss().encounter.cast>=1',5000);
  await evaluate('NV.getBoss().hp=NV.getBoss().maxHp*.45');
  await until("NV.getBoss().encounter.stage==='windup' && NV.getBoss().encounter.cast%2===1",5000);
  await shot('12e-nemesis-abanico');
  ok('Némesis: pinza anunciada desde dos baterías y alternancia con doble abanico');
  for (const bossIndex of [6,7,8,9]) {
    await navigate('?combatLab=1&fresh=1');
    assert(await evaluate(`NV.combatLabRuntime.start({encounterMode:'boss',bossIndex:${bossIndex},
      characterId:'rook',difficultyId:'normal',weaponId:'pistol',weaponLevel:1,weaponFusion:0,
      firePolicy:'manual',durationMode:'infinite'}).ok`));
    for (const phase2 of [false,true]) {
      if (phase2) await evaluate('NV.getBoss().hp=NV.getBoss().maxHp*.45; NV.getBoss().encounter.cast=0');
      await until("NV.getBoss().encounter && NV.getBoss().encounter.stage==='windup' && NV.getBoss().encounter.cast===0 && !!NV.getBoss().phase2==="+phase2,5000);
      await shot('12f-boss-'+bossIndex+'-fase-'+(phase2?2:1)+'-primario');
      const first = await evaluate('({name:NV.getBoss().name,label:NV.getBoss().encounter.label,rays:NV.getBoss().encounter.rays.length})');
      await until("NV.getBoss().encounter.stage==='windup' && NV.getBoss().encounter.cast===1",5000);
      await shot('12g-boss-'+bossIndex+'-fase-'+(phase2?2:1)+'-alternativo');
      assert.notEqual(await evaluate('NV.getBoss().encounter.label'),first.label,'dos lecturas distintas');
      if (bossIndex!==6) assert(await evaluate('Number.isFinite(NV.getBoss().encounter.gap)'),'anillo con hueco anunciado');
      ok(first.name+': dos patrones en fase '+(phase2?2:1),first);
    }
  }
  for (const [wave,kind,width,height] of [[7,'vent',1280,800],[11,'rift',915,412],[11,'mobile',844,390]]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    await navigate(); assert(await fixture(wave-1,5000,'full-roster'));
    await evaluate("NV.setFirePolicy('legacy-auto'); NV.alpha.resume()");
    await sleep(500); await shot('13-emisores-'+kind+'-reposo');
    await until("NV.getRuntimeSnapshot().sectorHazards.some(h=>h.laserHead && h.state==='telegraph' && h.stateTime>.8)",7000);
    assert.equal(await evaluate('NV.sectorLaserSoundPhase()'),'charge');
    await shot('14-emisores-'+kind+'-carga');
    await evaluate('document.getElementById("hudToggle").click()');
    assert.equal(await evaluate('NV.alpha.snapshot().showHUD'),false);
    assert(await evaluate('!document.querySelector(".nv-tutorial") || document.querySelector(".nv-tutorial").hidden'),'tutorial también respeta NO HUD');
    await until("NV.getRuntimeSnapshot().sectorHazards.some(h=>h.laserHead && h.state==='active')",5000);
    await until("NV.sectorLaserSoundPhase()==='active'",1000);
    await shot('15-emisores-'+kind+'-disparo-sin-hud');
    const geometry = await evaluate('NV.getRuntimeSnapshot().sectorHazards[0]');
    assert.equal(geometry.width,6);
    await evaluate('NV.input.togglePause()');await sleep(100);
    assert.equal(await evaluate('NV.sectorLaserSoundPhase()'),null,'pausa libera voz ambiental');
    await evaluate('NV.input.togglePause()');await until("NV.sectorLaserSoundPhase()==='active'",1000);
    await evaluate('NV.setSoundEnabled(false)');assert.equal(await evaluate('NV.sectorLaserSoundPhase()'),null);
    await evaluate('NV.setSoundEnabled(true)');
    if(wave===7){
      await evaluate("NV.setFirePolicy('manual')");
      for(const count of [4,6]){
        await until('NV.getRuntimeSnapshot().sectorHazards.length === '+count+' && NV.getRuntimeSnapshot().sectorHazards.every(h=>h.state===\'active\')',15000);
        await shot('16-laser-grupo-'+count);
      }
    }
    ok('emisores '+kind+': reposo, carga, rayo y peligro visible sin HUD',geometry);
  }
  assert.equal(errors.length, 0, errors.join('\n'));
  assert(!network.some(url => /^https?:/.test(url) && !url.startsWith(BASE)), 'sin dependencia de red externa');
  ok('sin excepciones runtime ni peticiones externas');
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ date: new Date().toISOString(), results: report, errors, profile, source: BASE }, null, 2));
})().catch(e => { console.error(e.stack); fs.writeFileSync(path.join(OUT, 'failure.json'), JSON.stringify({ error: String(e.stack), errors, report }, null, 2)); process.exitCode = 1; }).finally(async () => {
  if (ws && ws.readyState === 1) { try { await send('Browser.close'); } catch (_) {} ws.close(); }
  browser.kill();
});
