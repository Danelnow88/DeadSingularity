'use strict';
const {app,BrowserWindow,protocol,net,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {gameFile,CSP}=require('../desktop/runtime-policy.cjs');
const root=path.resolve(__dirname,'..');
const live=process.argv.find(arg=>arg.startsWith('--url='));
const out=path.join(root,'local/validation',live?'mobile-ergonomics-live':'mobile-ergonomics');
const base=live?live.slice(6):'dsv1://project/index.html';
const baseline=process.argv.includes('--baseline');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'dsv1-mobile-qa-')));
// Deterministic screenshots in hidden Windows/RDP sessions; production keeps
// its own GPU policy. Static Canvas icons otherwise lack a captured GPU surface.
app.disableHardwareAcceleration();
protocol.registerSchemesAsPrivileged([{scheme:'dsv1',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
app.whenReady().then(async()=>{
  fs.mkdirSync(out,{recursive:true});
  protocol.handle('dsv1',request=>{const url=new URL(request.url),file=gameFile(root,decodeURIComponent(url.pathname));return url.host==='project'&&file?net.fetch(pathToFileURL(file).toString()):new Response('Forbidden',{status:403});});
  session.defaultSession.webRequest.onHeadersReceived((details,reply)=>reply({responseHeaders:{...details.responseHeaders,'Content-Security-Policy':[CSP]}}));
  const win=new BrowserWindow({width:844,height:390,show:false,webPreferences:{offscreen:true,backgroundThrottling:false,sandbox:true,contextIsolation:true,nodeIntegration:false}});
  const errors=[];win.webContents.on('console-message',details=>{if(details.level==='error')errors.push(details.message);});
  const evaluate=code=>win.webContents.executeJavaScript(code,true);
  const command=(name,args)=>win.webContents.debugger.sendCommand(name,args);
  win.webContents.debugger.attach('1.3');
  const reports=[];
  const capture=async(name,width,height)=>{
    const shot=await command('Page.captureScreenshot',{format:'png',clip:{x:0,y:0,width,height,scale:1},captureBeyondViewport:false,fromSurface:true});
    fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(shot.data,'base64'));
  };
  const overlaps=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
  const touch=(type,points)=>command('Input.dispatchTouchEvent',{type,touchPoints:points.map(p=>({...p,radiusX:7,radiusY:7,force:1}))});
  const center=(r,id)=>({id,x:r.x+r.width/2,y:r.y+r.height/2});
  const portraitOnly=process.argv.includes('--portrait-only');
  const sizes=portraitOnly?[]:process.argv.includes('--quick')?[[915,412]]:[[915,412],[800,360],[844,390],[740,360],[640,320],[568,320],[1280,573]];
  if(!portraitOnly&&!process.argv.includes('--quick')&&!baseline)sizes.push([844,390,true]);
  for(const [width,height,safeArea] of sizes){
    const name=width+'x'+height+(safeArea?'-safe':'');
    win.setMinimumSize(1,1);win.setContentSize(width,height);
    await win.loadURL(base);
    await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:true,screenOrientation:{type:'landscapePrimary',angle:90}});
    await command('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
    // Reload so capabilities sees actual touch/coarse signals, NOT ?mobile=1.
    await win.loadURL(base);await wait(800);
    // Use the viewport's existing CSS safe-area contract. This Electron CDP
    // version does not expose setSafeAreaInsets; overrides affect only this QA.
    if(safeArea)await evaluate(`(()=>{const s=document.documentElement.style;for(const [side,value] of Object.entries({left:36,right:36,bottom:20,top:0}))s.setProperty('--nv-safe-'+side,value+'px');NV.viewport.refresh();window.dispatchEvent(new Event('resize'));})()`);
    const before=await evaluate('NV.lobbyAtmosphere.getSnapshot()');await wait(600);
    let after=await evaluate('NV.lobbyAtmosphere.getSnapshot()');
    for(let n=0;n<40&&after.time-before.time<.55;n++){await wait(100);after=await evaluate('NV.lobbyAtmosphere.getSnapshot()');}
    const environment=await evaluate('({mobile:NV.capabilities.isMobile,coarse:matchMedia("(pointer: coarse)").matches,width:innerWidth,height:innerHeight,canvas:document.getElementById("lobbyCosmos").getBoundingClientRect().toJSON(),particles:NV.settings.graphics.particles,reduced:NV.settings.gameplay.reducedEffects})');
    assert(environment.mobile&&environment.coarse,'Real touch detection must activate mobile');
    assert(after.active&&after.frames>before.frames,'Default mobile background must animate '+JSON.stringify({before,after,environment}));
    assert(after.probe.distance>before.probe.distance*1.08,'Mobile approach must be visibly measurable');
    assert(await evaluate(`parseFloat(getComputedStyle(document.getElementById('heroName')).fontSize)<=26&&parseFloat(getComputedStyle(document.querySelector('#heroStats .stat-chip')).fontSize)<=18`),'Desktop ID/stat typography must not leak into mobile');
    assert(await evaluate(`(()=>{const panel=document.querySelector('#startScreen .main-lobby-panel'),p=panel.getBoundingClientRect(),b=document.querySelector('#startScreen .btn-mejoras').getBoundingClientRect();return p.bottom<=innerHeight+1&&p.left>=0&&p.right<=innerWidth+1&&b.height>=44&&b.top>=0&&b.bottom<=innerHeight+1;})()`),'Lobby panel and MEJORAS must not be clipped');
    await evaluate(`window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}))`);
    assert(!(await evaluate('NV.lobbyAtmosphere.getSnapshot()')).active,'Page hide suspends stars');
    await evaluate(`window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));window.__lobbyResizeStorm=setInterval(()=>{window.dispatchEvent(new Event('resize'));},16)`);
    const resumed=await evaluate('NV.lobbyAtmosphere.getSnapshot()');await wait(600);
    const advancing=await evaluate('clearInterval(window.__lobbyResizeStorm);NV.lobbyAtmosphere.getSnapshot()');
    assert(advancing.active&&advancing.time>resumed.time+.2,'Restored page advances despite repeated resize events');
    await capture(`${name}-lobby${baseline?'-baseline':''}`,width,height);
    if(baseline)await evaluate('document.getElementById("lobbyPlayBtn").click()');
    else {
      // A validated checkpoint in this disposable profile exercises real owned
      // weapons/items and a live boss, not mocked callbacks or edited gameplay.
      assert(await evaluate(`(()=>{const saved={version:1,character:'boti',wave:1,run:NV.expedition.create('expedition',1337),player:{hp:120,maxHp:180,armor:0,luck:0,level:1,xp:0,xpToNext:100,baseMoveSpeed:195},inventory:['pistol','rifle','laser'],currentWeapon:'pistol',levels:{pistol:1,rifle:1,laser:1},kills:{},fus:{},consumables:[{type:'potion'},{type:'potion'},{type:'shield'},{type:'shield'}],shopBought:{},upgradeSlots:[],score:100,shards:20,difficulty:'easy',savedAt:Date.now()};return NV.expedition.save(saved)&&NV.alpha.resume();})()`));
    }
    await wait(600);
    const geometry=await evaluate(`(()=>{const rect=id=>document.getElementById(id).getBoundingClientRect().toJSON();const m=NV.worldMetrics,l=NV.getBottomCombatHudLayout(m.viewX,m.viewY,m.viewW,m.viewH,true),a=NV.gameToScreen(l.bossBarX,l.bossBarY-14),b=NV.gameToScreen(l.bossBarX+l.bossBarW,l.dashY+l.dashSegmentH);return {width:innerWidth,height:innerHeight,stick:rect('joystickZone'),base:rect('joystickBase'),dash:rect('touchSlideBtn'),special:rect('touchSpecialBtn'),use:rect('touchUseBtn'),weapon:rect('weaponIndicator'),item:rect('consumableIndicator'),bars:{x:a.x,y:a.y,width:b.x-a.x,height:b.y-a.y}};})()`);
    await capture(`${name}-playing${baseline?'-baseline':''}`,width,height);
    if(!baseline){
      assert(await evaluate('!!NV.getBoss()'),'Fixture must contain the real boss');
      const targets=['dash','special','use','weapon','item'];
      for(const id of targets){const r=geometry[id];assert(r.width>=44&&r.height>=44&&r.x>=0&&r.y>=0&&r.right<=geometry.width&&r.bottom<=geometry.height,'Target must be reachable '+id);assert(!overlaps(r,geometry.bars),'Controls cover boss/dash bars: '+id);}
      for(let i=0;i<targets.length;i++)for(let j=i+1;j<targets.length;j++)assert(!overlaps(geometry[targets[i]],geometry[targets[j]]),'Targets overlap');
      assert(geometry.dash.width>=80&&geometry.special.width>=80&&geometry.stick.width>=210&&geometry.stick.height>=180,'Ergonomic sizes');
      if(safeArea){assert(geometry.stick.x>=36&&geometry.special.right<=width-36&&geometry.special.bottom<=height-20,'Controls must respect emulated safe insets');}
      assert(!overlaps(geometry.base,geometry.bars),'Visible stick overlaps bars');
      assert(await evaluate(`['weaponIndicatorIcon','consumableIndicatorIcon'].every(id=>{const c=document.getElementById(id),pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return pixels.some((value,index)=>index%4===3&&value>0);})`),'Equipment icons must really render');
      const finger={id:1,x:geometry.stick.right-24,y:geometry.stick.top+24};
      const start=await evaluate('NV.getRuntimeSnapshot().player');
      await touch('touchStart',[finger]);assert.equal((await evaluate('NV.getInputSnapshot()')).moveX,0,'Grabbing away from old base must not jump');
      finger.x-=60;await touch('touchMove',[finger]);await wait(120);
      assert((await evaluate('NV.getInputSnapshot()')).moveX<-.9);
      assert((await evaluate('NV.getRuntimeSnapshot().player')).x<start.x,'Touch stick must move the actual player');
      const dash=center(geometry.dash,2),special=center(geometry.special,3);
      await touch('touchStart',[finger,dash]);assert((await evaluate('NV.getInputSnapshot()')).dashIntent);
      await touch('touchStart',[finger,dash,special]);await wait(100);
      assert((await evaluate('NV.getRuntimeSnapshot().special')).cooldown>0,'Actual special activates');
      await touch('touchEnd',[dash]);const held=await evaluate('NV.getInputSnapshot()');assert(!held.dashIntent&&held.abilityIntent&&held.moveX<0,'Releasing one finger must preserve others '+JSON.stringify(held));
      await touch('touchEnd',[]);const released=await evaluate('NV.getInputSnapshot()');assert(!released.dashIntent&&!released.abilityIntent&&released.moveX===0&&released.moveY===0);
      async function gesture(id,dx=0){const p=center(geometry[id],4);await touch('touchStart',[p]);if(dx){p.x+=dx;await touch('touchMove',[p]);}await touch('touchEnd',[]);await wait(40);}
      await gesture('weapon');assert.equal((await evaluate('NV.input.getWeaponInfo()')).id,'rifle');
      await gesture('weapon',30);assert.equal((await evaluate('NV.input.getWeaponInfo()')).id,'pistol');
      await gesture('weapon',-30);assert.equal((await evaluate('NV.input.getWeaponInfo()')).id,'rifle');
      await gesture('item');assert.equal((await evaluate('NV.input.getConsumableInfo()')).type,'shield');
      await gesture('item',30);assert.equal((await evaluate('NV.input.getConsumableInfo()')).type,'potion');
      const consumable=await evaluate('NV.input.getConsumableInfo()');await gesture('use');
      assert.equal((await evaluate('NV.input.getConsumableInfo()')).count,consumable.count-1,'USAR consumes exactly one selected item');
      await capture(`${name}-equipment`,width,height);
      assert((await evaluate('NV.lobbyAtmosphere.getSnapshot()')).active===false,'No background work during combat');
      await evaluate('NV.input.togglePause()');assert(await evaluate('document.getElementById("mobileHud").classList.contains("nv-paused")'),'Paused controls are disabled');
      await evaluate('NV.input.togglePause()');
      console.log('PASS touch gameplay '+name+': layout, real boss, analog movement, multitouch, tap/swipe, consumption, pause.');
    }else console.log(JSON.stringify({size:[width,height],before,after,environment,geometry}));
    reports.push({width,height,safeArea:!!safeArea,environment,before,after,geometry});
  }
  if(portraitOnly){
    console.log('Checking portrait target');
    // Fresh target avoids reconfiguring the reused landscape compositor to a
    // viewport taller than its native surface in hidden Windows sessions.
    const portrait=new BrowserWindow({width:390,height:844,show:false,webPreferences:{offscreen:true,backgroundThrottling:false,sandbox:true,contextIsolation:true,nodeIntegration:false}});
    win.destroy();
    const pEval=code=>portrait.webContents.executeJavaScript(code,true);
    await portrait.loadURL(base);
    console.log('Portrait initial load complete');
    portrait.webContents.debugger.attach('1.3');
    const pCommand=(name,args)=>portrait.webContents.debugger.sendCommand(name,args);
    await pCommand('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true,screenOrientation:{type:'portraitPrimary',angle:0}});
    await pCommand('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    await pCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
    console.log('Portrait touch emulation configured');
    await portrait.loadURL(base);await wait(800);
    assert(await pEval('NV.capabilities.isMobile&&NV.capabilities.orientation==="portrait"'));
    assert(await pEval('getComputedStyle(document.getElementById("rotateOverlay")).display!=="none"'),'Initial portrait lobby must request rotation');
    assert(!(await pEval('NV.lobbyAtmosphere.getSnapshot()')).active,'No animation behind portrait gate');
    assert(await pEval('document.elementFromPoint(innerWidth/2,innerHeight/2).closest("#rotateOverlay")!==null'),'Portrait gate intercepts touches');
    fs.writeFileSync(path.join(out,'portrait-lobby.png'),(await portrait.webContents.capturePage()).toPNG());
    await pEval('document.getElementById("lobbyPlayBtn").click()');await wait(100);
    assert(await pEval('getComputedStyle(document.getElementById("rotateOverlay")).display!=="none"'),'Portrait gameplay keeps orientation gate');
    assert((await pEval('NV.getInputSnapshot()')).moveX===0,'Rotation releases input');
    portrait.setContentSize(844,390);
    await pCommand('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:2,mobile:true,screenOrientation:{type:'landscapePrimary',angle:90}});
    await wait(200);
    assert(await pEval('NV.capabilities.orientation==="landscape"&&getComputedStyle(document.getElementById("rotateOverlay")).display==="none"'),'Rotation unblocks gameplay without reload');
    portrait.setContentSize(390,844);
    await pCommand('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true,screenOrientation:{type:'portraitPrimary',angle:0}});
    await pEval('window.dispatchEvent(new PageTransitionEvent("pageshow",{persisted:true}))');await wait(100);
    assert(await pEval('NV.capabilities.orientation==="portrait"&&getComputedStyle(document.getElementById("rotateOverlay")).display!=="none"'),'Returning without reload restores portrait gate');
    portrait.destroy();
    console.log('PASS initial portrait gate, rotation and restored-page gate without reload.');
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,portraitOnly?'portrait-report.json':baseline?'baseline.json':'report.json'),JSON.stringify({pass:true,reports,errors,portrait:portraitOnly,limitation:'Chromium touch/device emulation, not physical Android/iOS'},null,2));
  console.log('PASS mobile touch-device '+(baseline?'baseline':'ergonomics'));app.exit(0);
}).catch(error=>{console.error(error);app.exit(1);});
