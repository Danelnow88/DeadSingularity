'use strict';
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const mobile=process.argv.includes('--mobile'),mode=process.argv.includes('--endless')?'endless':'expedition';
const pilot=mobile?'boti':'rook';
const out=path.join(root,'local/validation/dimension-events',mode+(mobile?'-mobile':''));
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'ds-dimension-events-')));
app.whenReady().then(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const win=new BrowserWindow({width:mobile?844:1200,height:mobile?390:800,show:false,
    webPreferences:{offscreen:true,backgroundThrottling:false,sandbox:true,contextIsolation:true}});
  const errors=[];
  win.webContents.on('render-process-gone',(_,details)=>errors.push(details.reason));
  win.webContents.on('console-message',details=>{if(details.level==='error')errors.push(details.message);});
  const run=code=>win.webContents.executeJavaScript(code,true);
  const snapshot=()=>run('NV.getRuntimeSnapshot()');
  const capture=async name=>{
    for(let attempt=0;attempt<5;attempt++) {
      try {fs.writeFileSync(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG());return;}
      catch(error) {
        if(!String(error.message).includes('UnknownVizError')||attempt===4)throw error;
        console.log('CAPTURE retry',name,attempt+1);await wait(250);
      }
    }
  };
  await win.loadFile(path.join(root,'index.html'),{query:{fresh:'1',...(mobile?{mobile:'1'}:{})}});await wait(600);
  assert(await run('!!document.getElementById("dimensionEventPreviewBtn")'));
  assert.equal(await run('NV.alpha.snapshot().eventPreview'),false);
  const keys=['deadSingularityMeta','deadSingularityExpeditionV1','deadSingularityCareerV1','deadSingularityTutorialV1'];
  await run(`${JSON.stringify(keys)}.forEach(k=>localStorage.setItem(k,'qa-preserved:'+k));NV.alpha.setMode(${JSON.stringify(mode)});NV.selectPilot(${JSON.stringify(pilot)})`);
  const savedScript=`JSON.stringify(${JSON.stringify(keys)}.map(k=>localStorage.getItem(k)))`;
  const saved=await run(savedScript);
  const loaded=new Promise(resolve=>win.webContents.once('did-finish-load',resolve));
  await run('document.getElementById("dimensionEventPreviewBtn").click()');await loaded;await wait(600);
  assert.equal(await run('NV.alpha.snapshot().eventPreview'),true);
  assert.equal(await run('NV.alpha.snapshot().mode'),mode);
  assert.equal(await run('NV.alpha.snapshot().character'),pilot);
  assert.equal(await run('NV.alpha.snapshot().saveDisabled'),true);
  assert.equal(await run('NV.resetMeta()'),false);
  assert.equal(await run(savedScript),saved);
  await capture('lobby');
  await run('NV.setDifficulty("normal");NV.setFirePolicy("legacy-auto");document.getElementById("lobbyPlayBtn").click()');
  const initial=await snapshot(),cx=initial.arena.width/2,cy=initial.arena.height/2;
  const route=[[cx*.5,cy*.5],[cx*1.5,cy*.5],[cx*1.5,cy*1.5],[cx*.5,cy*1.5]];
  let waypoint=0,temporalChecked=false,fragmentsChecked=false,coreShotsSeen=0;const entered=new Set(),crossed=new Set(),peak={};
  const deadline=Date.now()+240000;
  while(Date.now()<deadline) {
    const s=await snapshot();
    assert(!['player_dying','gameover'].includes(s.state),'autoplay died: '+JSON.stringify(s));
    if(s.state==='shop')break;
    if(s.state==='wave_end'||s.state==='shop_enter'){await wait(80);continue;}
    assert.equal(s.state,'playing');
    assert.equal(s.outsideEnemies,0);
    assert(s.hostileBudget.hostiles<=(s.dimension.depth===1?s.hostileBudget.maxHostiles:10));
    const depth=s.dimension.depth;peak[depth]=Math.max(peak[depth]||0,s.enemies);
    coreShotsSeen=Math.max(coreShotsSeen,s.dimensionCoreShots||0);
    if(depth===1) {
      assert.equal(s.objective.mode,'cores');assert.equal(s.objective.required,3);
      const objective=s.dimensionEvent.objective;
      assert(objective&&objective.collected<=3);
      if(s.dimension.phase==='combat')assert(!objective.complete);
      if(s.dimension.phase==='opening'||s.dimension.phase==='portal') {
        assert.equal(objective.collected,3);fragmentsChecked=true;
      }
    }
    if(s.dimension.phase==='combat'&&!s.dimension.arrival&&!entered.has(depth)) {
      entered.add(depth);
      assert.equal(s.dimensionEvent.id,depth===1?'museum-time':null);
      assert.equal(s.dimensionEvent.ruleId,depth===1?'museum-time':'standard');
      await capture('field-'+depth);console.log('FIELD',mode,depth,s.dimensionEvent.ruleId);
    }
    if(depth===1&&!s.dimension.arrival&&!temporalChecked) {
      await run('NV.input.setMoveVector(0,0);NV.input.setSpecial(true)');await wait(80);
      await run('NV.input.setSpecial(false)');await wait(100);
      const slow=await snapshot();assert(slow.dimensionEvent.scale<.8,JSON.stringify(slow.dimensionEvent));
      assert(slow.special.cooldown>0,'special was disabled in full event trial');
      await wait(1100);
      const slowedCooldown=await snapshot();
      assert(slowedCooldown.dimensionEvent.scale>.95,'standing still remained a safe indefinite slowdown');
      assert(!slowedCooldown.dimensionEvent.suspension.held,'shots did not release after charge expired');
      await run('NV.input.togglePause()');const paused=JSON.stringify(await snapshot());
      await wait(220);assert.equal(JSON.stringify(await snapshot()),paused);
      await run('NV.input.togglePause();NV.input.setMoveVector(1,0)');await wait(450);
      assert((await snapshot()).dimensionEvent.scale>.9);
      await capture('museum-time');temporalChecked=true;
    }
    if(s.dimension.phase==='portal') {
      crossed.add(depth);const p=s.dimension.portal;
      const dx=p.x-s.player.x,dy=p.y-s.player.y,d=Math.hypot(dx,dy)||1;
      await run(`NV.input.setSpecial(false);NV.input.setMoveVector(${dx/d},${dy/d})`);
    } else if(s.dimension.phase==='combat') {
      let [x,y]=route[waypoint];
      if(Math.hypot(s.player.x-x,s.player.y-y)<55){waypoint=(waypoint+1)%route.length;[x,y]=route[waypoint];}
      if(depth===1&&s.dimensionEvent.objective.target) {
        x=s.dimensionEvent.objective.target.x;y=s.dimensionEvent.objective.target.y;
      }
      const dx=x-s.player.x,dy=y-s.player.y,d=Math.hypot(dx,dy)||1;
      const nearCore=depth===1&&s.dimensionEvent.objective.target&&d<100;
      const mx=nearCore?-dy/d:dx/d,my=nearCore?dx/d:dy/d;
      await run(`NV.input.setMoveVector(${mx},${my});NV.input.setSpecial(true)`);
    } else await run('NV.input.setSpecial(false);NV.input.setMoveVector(0,0)');
    await wait(60);
  }
  const final=await snapshot();assert.equal(final.state,'shop','did not finish real wave');
  assert.deepEqual([...entered],[0,1,2,3]);assert.deepEqual([...crossed],[0,1,2]);assert(temporalChecked&&fragmentsChecked);
  assert(peak[1]>=4,'museum was not tested with real wave density');
  assert(coreShotsSeen>0,'no real physical core attacks were observed');
  assert.equal(final.dimensionEvent.ruleId,'standard');
  assert.equal(await run(savedScript),saved,'preview wrote existing progression');
  assert.equal(await run('NV.alpha.save()'),false);
  assert.equal(await run('NV.alpha.route("museum-time")'),false,'boss/invalid next wave accepted event');
  await capture('shop');
  await run('NV.alpha.dockAndQuit()');assert.equal((await snapshot()).dimensionEvent,null);
  assert.equal(await run(savedScript),saved);assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({pass:true,mode,mobile,peak,fields:[...entered],crossings:[...crossed],temporalChecked,coresChecked:fragmentsChecked,coreShotsSeen,progressionUnchanged:true,errors},null,2));
  console.log('PASS dimension events:',mode,mobile?'mobile':'desktop','real density, time, special, pause, three portals, shop, no progress writes');
  win.destroy();app.quit();
}).catch(error=>{console.error(error);app.exit(1);});
