'use strict';
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'local/validation/dimension-lab');
const mobile=process.argv.includes('--mobile'),query=mobile?{mobile:'1'}:{};
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'ds-dimension-lab-')));
const delay=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
  const win=new BrowserWindow({width:mobile?844:1200,height:mobile?390:800,show:false,webPreferences:{offscreen:true,backgroundThrottling:false,sandbox:true,contextIsolation:true}});
  const errors=[];win.webContents.on('render-process-gone',(_,d)=>errors.push(d.reason));
  const run=s=>win.webContents.executeJavaScript(s,true);
  await win.loadFile(path.join(root,'index.html'),{query:{...query,combatLab:'1',dimensionExperiment:'museum-time',fresh:'1'}});
  await delay(1800);
  assert(await run('!!NV.dimensionLabRuntime'));
  const progressKeys=['deadSingularityMeta','deadSingularityExpeditionV1','deadSingularityCareerV1','deadSingularityTutorialV1'];
  await run(`${JSON.stringify(progressKeys)}.forEach(k=>localStorage.setItem(k,'qa-preserved:'+k))`);
  const progressScript=`JSON.stringify(${JSON.stringify(progressKeys)}.map(k=>[k,localStorage.getItem(k)]))`;
  const progressBefore=await run(progressScript);
  let s=await run('NV.dimensionLabRuntime.snapshot()');
  assert.equal(s.experiment.preset,'museum-time');assert.equal(s.experiment.status,'RUNNING');assert(s.experiment.scale<.2,JSON.stringify(s));assert(s.saveDisabled);
  await run('NV.dimensionLabRuntime.pause()');s=await run('JSON.stringify(NV.dimensionLabRuntime.snapshot())');
  await delay(180);assert.equal(await run('JSON.stringify(NV.dimensionLabRuntime.snapshot())'),s);
  await run('NV.dimensionLabRuntime.resume(); NV.input.setMoveVector(1,0)');await delay(400);
  assert((await run('NV.dimensionLabRuntime.snapshot()')).experiment.scale>.9);
  await run('NV.dimensionLabRuntime.restart()');assert((await run('NV.dimensionLabRuntime.snapshot()')).experiment.scale>.9);
  fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'museum.png'),(await win.webContents.capturePage()).toPNG());
  assert.equal((await run('NV.dimensionLabRuntime.snapshot()')).score,0);
  await run('NV.dimensionLabRuntime.reset()');assert.equal((await run('NV.dimensionLabRuntime.snapshot()')).experiment,null);
  async function cross() {
    const from=(await run('NV.dimensionLabRuntime.snapshot()')).dimension.depth;
    let captured=false;
    await run('NV.dimensionLabRuntime.completeObjective()');
    const deadline=Date.now()+18000;
    while(Date.now()<deadline) {
      const sample=await run('NV.dimensionLabRuntime.snapshot()');
      assert.equal(sample.state,'playing',JSON.stringify(sample));
      if(sample.dimension.depth>from){await run('NV.input.setMoveVector(0,0)');return sample;}
      if(sample.dimension.portal) {
        if(sample.dimension.phase==='portal'&&!captured) {
          fs.writeFileSync(path.join(out,'portal-'+sample.experiment.preset+'-'+from+'.png'),(await win.webContents.capturePage()).toPNG());
          captured=true;
        }
        const {x,y}=sample.dimension.portal;
        await run(`{const s=NV.dimensionLabRuntime.snapshot();const dx=${x}-s.player.x,dy=${y}-s.player.y,d=Math.hypot(dx,dy)||1;NV.input.setMoveVector(dx/d,dy/d);}`);
      }
      await delay(30);
    }
    throw new Error('Portal transit timed out');
  }
  for(const preset of ['traversal','pursuit']) {
    await win.loadFile(path.join(root,'index.html'),{query:{...query,dimensionLab:preset,fresh:'1'}});await delay(400);
    // Observation-only QA: mobile's native auto-fire would kill the subject
    // before its two transfers. No runtime setting or production input is changed.
    await run("NV.input.getEffectiveFirePolicy=()=> 'manual';NV.input.setFire(false);NV.dimensionLabRuntime.restart()");
    if(preset==='pursuit')assert(await run('NV.dimensionLabRuntime.provoke()'));
    const first=await run('NV.dimensionLabRuntime.snapshot()');
    const uid=first.pursuit&&first.pursuit.record.uid;
    for(let depth=1;depth<=3;depth++) {
      const entered=await cross();assert.equal(entered.dimension.depth,depth);
      if(preset==='pursuit'&&depth<=2) {
        assert.equal(entered.pursuit.record.uid,uid);
        assert.equal(entered.pursuit.record.hp,first.pursuit.record.hp);
        assert.equal(entered.reservations.hostiles,1);
        await run('NV.input.setMoveVector(1,0)');
        const deadline=Date.now()+11000;
        let arrived;
        do{await delay(30);arrived=await run('NV.dimensionLabRuntime.snapshot()');}while(arrived.pursuit.phase!=='active'&&Date.now()<deadline);
        assert.equal(arrived.pursuit.phase,'active',JSON.stringify(arrived));
        assert.equal(arrived.enemies.filter(e=>e.uid===uid).length,1);
        assert.equal(arrived.reservations.hostiles,0);
        await run('NV.input.setMoveVector(0,0)');
      }
    }
    await run('NV.dimensionLabRuntime.completeObjective()');await delay(80);
    const completed=await run('NV.dimensionLabRuntime.snapshot()');
    assert.equal(completed.experiment.status,'COMPLETE');assert.equal(completed.score,0);assert.equal(completed.shards,0);
    assert.equal(await run(progressScript),progressBefore,'Progress keys mutated by experiment');
    fs.writeFileSync(path.join(out,preset+'.png'),(await win.webContents.capturePage()).toPNG());
    console.log('PASS dimension lab:',preset,'three actual portals, four fields, no progression');
  }
  assert.deepEqual(errors,[]);
  console.log('PASS dimension lab: museum, clocks, movement, pause, restart, reset, no rewards');
  win.destroy();app.quit();
}).catch(e=>{console.error(e);app.exit(1);});
