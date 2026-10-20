'use strict';
const path = require('node:path'), fs = require('node:fs'), os = require('node:os');
const root = path.resolve(__dirname, '..');
if (!process.versions.electron) {
  const { spawn } = require('node:child_process');
  const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
  const p = spawn(require(path.join(root, 'node_modules/electron')), [__filename, ...process.argv.slice(2)], {
    env, cwd: __dirname, windowsHide: true, stdio: 'inherit'
  });
  p.on('error', e => { console.error(e); process.exitCode = 1; });
  p.on('exit', c => { process.exitCode = c ?? 1; });
} else {
  const { app, BrowserWindow, protocol, net } = require('electron');
  const { pathToFileURL } = require('node:url');
  const assert = require('node:assert/strict');
  const out = path.join(root, 'local/validation/singularity-family-v1'); fs.mkdirSync(out, { recursive: true });
  app.disableHardwareAcceleration();
  app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'ds-family-qa-')));
  protocol.registerSchemesAsPrivileged([{ scheme: 'dsfamily', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
  const delay = ms => new Promise(r => setTimeout(r, ms));
  app.whenReady().then(async () => {
    protocol.handle('dsfamily', req => {
      const u = new URL(req.url), file = path.resolve(root, '.' + decodeURIComponent(u.pathname));
      return u.host === 'project' && file.startsWith(path.resolve(root) + path.sep)
        ? net.fetch(pathToFileURL(file).href) : new Response('', { status: 403 });
    });
    const win = new BrowserWindow({ width: 1400, height: 1000, show: false,
      webPreferences: { offscreen: true, backgroundThrottling: false, sandbox: true, contextIsolation: true } });
    const errors = [];
    win.webContents.on('console-message', details => { if (details.level === 'error') errors.push(details.message); });
    const run = async s => {
      if(!win.webContents.getURL().includes('enemy-roster-canonical'))return win.webContents.executeJavaScript(s);
      const result=await win.webContents.executeJavaScript('(()=>{try{return eval('+JSON.stringify(s)+')}catch(e){return{__qaError:e.stack}}})()');
      if(result?.__qaError)throw Error(result.__qaError);return result;
    };
    const baseline = process.argv.includes('--baseline');
    await win.loadURL('dsfamily://project/previews/enemy-roster-canonical.html');
    for (let n = 0; n < 200; n++) {
      const ready = await run(baseline
        ? 'NV.cosmicRunnerStats().ready && NV.cosmicCreatureStats().species.length===2 && NV.cosmicCreatureStats().species.every(s=>s.ready) && NV.cosmicSpectersStats().species.length===3 && NV.cosmicSpectersStats().species.every(s=>s.ready)'
        : 'NV.singularityFamilyStats?.().species.length===9 && NV.singularityFamilyStats().species.every(s=>s.ready)');
      if (ready) break;
      if (n === 199) throw Error('Artwork load timeout: ' + JSON.stringify(await run('NV.singularityFamilyStats?.()')));
      await delay(50);
    }
    const materialCheck = await run(`(() => {
      const colors=['#f0dbbd','#36d6fa','#ff9b32','#ed71a4','#b0e52a','#edf5ff','#ff646e','#f4cd40','#36c797','#965cff'];
      const src=document.createElement('canvas');src.width=colors.length*16;src.height=32;const a=src.getContext('2d');
      colors.forEach((color,i)=>{a.fillStyle=color;a.fillRect(i*16,0,16,16);a.save();a.globalAlpha=.5;a.fillRect(i*16,16,16,16);a.restore();});
      const out=document.createElement('canvas');out.width=src.width;out.height=src.height;const b=out.getContext('2d');b.filter='url(#nv-family-basalt-v1)';b.drawImage(src,0,0);b.filter='none';
      const checks=colors.map((color,i)=>{const before=Array.from(a.getImageData(i*16+8,8,1,1).data),after=Array.from(b.getImageData(i*16+8,8,1,1).data),edgeBefore=a.getImageData(i*16+8,24,1,1).data[3],edgeAfter=b.getImageData(i*16+8,24,1,1).data[3];return{color,before,after,alphaStable:Math.abs(edgeBefore-edgeAfter)<=1};});
      if(!checks.every(x=>x.alphaStable))throw Error('Material alpha changed');
      if(checks[0].after[0]>=checks[0].before[0]*.7)throw Error('Ivory did not become basalt');
      if(!checks.slice(1).every(x=>x.before.every((v,i)=>Math.abs(v-x.after[i])<=1)))throw Error('Energy palette changed');
      return checks;
    })()`);
    assert((await run('NV.singularityFamilyStats().species')).every(s=>s.materialReady),'Basalt cache prepared for all nine');
    // Measure the real previous draw routes in world units, using visible alpha.
    // No simulation or spawn settings are modified by this isolated measurement.
    const report = await run(`(() => {
      const ids=['runner','tank','swarmlet','spitter','wisp','kamikaze','specter_archer','specter_guard','specter_core'];
      NV.__cosmicRunnerStatic=true; NV.__cosmicStatic=true;
      const records=[];
      for(const id of ids){
        const type=NV.ENEMY_TYPES.find(t=>t.id===id);
        if(!type)throw Error('Missing type '+id);
        const e={...type,x:128,y:128,enemyTypeId:id,hp:type.hp,maxHp:type.hp,dead:false,isElite:false,paintedSwarmlet:true,previewMotionPolish:true};
        const before=JSON.stringify(e), cv=document.createElement('canvas');cv.width=cv.height=1024;
        const ctx=cv.getContext('2d');ctx.scale(4,4);
        if(NV.hasCommonEnemyVisual(id))NV.drawEnemy(ctx,e,0,{x:228,y:128},null,0);
        else NV.drawSpectralEnemy2D(ctx,e,0,{x:228,y:128},null);
        if(JSON.stringify(e)!==before)throw Error('Gameplay data changed while drawing '+id);
        const p=ctx.getImageData(0,0,1024,1024).data;
        let l=1024,t=1024,r=-1,b=-1,count=0;
        for(let y=0;y<1024;y++)for(let x=0;x<1024;x++)if(p[(y*1024+x)*4+3]>64){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);count++;}
        if(r<l)throw Error('Empty draw '+id);
        records.push({id,radius:e.radius,width:(r-l+1)/4,height:(b-t+1)/4,size:Math.max(r-l+1,b-t+1)/4,pixels:count});
      }
      return {records,stats:NV.singularityFamilyStats?.(),cards:document.querySelectorAll('canvas[data-id]').length};
    })()`);
    fs.writeFileSync(path.join(out, baseline ? 'baseline.json' : 'roster.json'), JSON.stringify(report, null, 2));
    if (baseline) {
      assert.equal(report.records.length, 9);
      console.log('PASS baseline body measurement: ' + report.records.map(r => r.id + '=' + r.size).join(', '));
      app.exit(0); return;
    }
    assert.equal(report.stats.species.length, 9);
    assert(report.stats.species.every(s => s.ready && !s.error && s.draws > 0));
    const old = JSON.parse(fs.readFileSync(path.join(out, 'baseline.json')));
    // Compare intrinsic sprite envelope, independent of orientation and pose.
    for (const s of report.stats.species) {
      const previous = old.records.find(r => r.id === s.id);
      const approvedScale=s.id==='kamikaze'?1.10:s.id==='specter_archer'?1.15:1;
      assert.equal(s.targetSize, previous.size*approvedScale, 'Preserved visible size: ' + s.id);
      assert(s.transparent > .02 && s.transparent < .9, 'Valid alpha: ' + s.id);
      assert(s.sourceWidth >= 1024 && s.sourceHeight >= 1024, 'High resolution source: ' + s.id);
      assert(Math.abs(Math.max(s.width, s.height) - previous.size*approvedScale) < .001);
    }
    const invariants = await run(`(() => {
      const ids=NV.singularityFamilyStats().species.map(s=>s.id),cv=document.createElement('canvas');cv.width=cv.height=400;const ctx=cv.getContext('2d');
      for(const id of ids)for(const state of ['positioning','windup','attack','recovery']){
        const e=Object.freeze({enemyTypeId:id,x:100,y:100,radius:13,hp:29,damage:11,speed:60,dead:false,isElite:false,
          intent:Object.freeze({state,stateTimer:.2}),flankState:state,commitDirX:1,commitDirY:0,tankCannonState:state,tankCannonTargetX:200,tankCannonTargetY:100});
        const before=JSON.stringify(e);ctx.clearRect(0,0,400,400);
        const ok=id.startsWith('specter_')?NV.drawSingularitySpecter(ctx,e,{x:200,y:100}):NV.drawSingularityCommon(ctx,e,1,0);
        if(!ok||JSON.stringify(e)!==before)throw Error('Immutable render '+id+'/'+state);
      }
      for(const enemyTypeId of ['drone','shielder','specter_grunt','specter_lite','boss_minion']){
        const e={enemyTypeId,x:100,y:100};if(NV.drawSingularityCommon(ctx,e,1,0)||NV.drawSingularitySpecter(ctx,e,null))throw Error('Unexpected replacement '+enemyTypeId);
      }
      const elite={enemyTypeId:'tank',isElite:true};if(NV.drawSingularityCommon(ctx,elite,1,0))throw Error('Elite replaced');
      NV.__singularityFamily=false;if(NV.drawSingularityCommon(ctx,{enemyTypeId:'tank'},1,0))throw Error('Legacy override ignored');NV.__singularityFamily=true;
      // The real wisp disappearing/target-mark phase still bypasses the sprite body.
      const before=NV.singularityFamilyStats().species.find(s=>s.id==='wisp').draws;
      NV.drawEnemy(ctx,{enemyTypeId:'wisp',x:100,y:100,radius:6,wispPhaseState:'mark',wispPhaseTimer:.2,wispTargetX:140,wispTargetY:160,color:'#fff'},30,{x:200,y:100},null,.5);
      if(NV.singularityFamilyStats().species.find(s=>s.id==='wisp').draws!==before)throw Error('Wisp mark unexpectedly visible');
      return {frozenStates:ids.length*4,scoped:true,wispMark:true};
    })()`);
    // A visual QA artifact, using the actual public production draw routes and sizes.
    const sheet = await run(`(() => {
      const cv=document.createElement('canvas');cv.width=1200;cv.height=960;const c=cv.getContext('2d');
      c.fillStyle='#081020';c.fillRect(0,0,cv.width,cv.height);
      const ids=NV.singularityFamilyStats().species.map(s=>s.id);
      ids.forEach((id,i)=>{const x=i%3*400,y=Math.floor(i/3)*320,s=NV.singularityFamilyStats().species.find(a=>a.id===id),t=NV.ENEMY_TYPES.find(a=>a.id===id);
        c.fillStyle='#e7eafa';c.font='16px sans-serif';c.fillText(t.name,x+18,y+28);
        const draw=(px,py,z)=>{c.save();c.translate(px,py);c.scale(z,z);const e={...t,enemyTypeId:id,x:0,y:0,paintedSwarmlet:true,previewMotionPolish:true};
          if(NV.hasCommonEnemyVisual(id))NV.drawEnemy(c,e,0,null,null,0);else NV.drawSpectralEnemy2D(c,e,0,null,null);c.restore();};
        draw(x+200,y+128,2.5);draw(x+120,y+248,1);draw(x+265,y+248,1);
        c.strokeStyle='#263c55';c.beginPath();c.moveTo(x,y+319);c.lineTo(x+400,y+319);c.stroke();
        c.fillStyle='#9fadc2';c.font='12px sans-serif';c.fillText('Tamaño actual · '+s.targetSize.toFixed(1)+' unidades',x+18,y+305);
      });return cv.toDataURL('image/png').split(',')[1];
    })()`);
    fs.writeFileSync(path.join(out, 'production-size-review.png'), Buffer.from(sheet, 'base64'));
    // Verify the actual game boot loads all nine sprites as well as the roster.
    await win.loadURL('dsfamily://project/index.html?combatLab=1');
    for (let n = 0; n < 160; n++) {
      if (await run('NV.singularityFamilyStats?.().species.length===9 && NV.singularityFamilyStats().species.every(s=>s.ready)')) break;
      if (n === 159) throw Error('Game sprite load timeout');
      await delay(50);
    }
    const game = await run('({ready:NV.singularityFamilyStats().species.every(s=>s.ready),hasCommon:typeof NV.drawEnemy,hasSpectral:typeof NV.drawSpectralEnemy2D})');
    assert(game.ready); assert.equal(game.hasCommon, 'function'); assert.equal(game.hasSpectral, 'function');
    const composition = report.stats.species.map(s => ({ enemyId: s.id, quantity: 1 }));
    const start = await run(`NV.combatLabRuntime.start(${JSON.stringify({ characterId: 'rook', wave: 20, difficultyId: 'normal', durationMode: 'infinite', composition })})`);
    assert(start.ok, JSON.stringify(start));
    await delay(1600);
    const combat = await run('({snapshot:NV.combatLabRuntime.snapshot(),sprites:NV.singularityFamilyStats().species.map(s=>({id:s.id,draws:s.draws})),saveDisabled:NV.runLifecycle?.snapshot?.().saveDisabled})');
    assert.equal(combat.snapshot.status, 'RUNNING');
    assert(combat.sprites.every(s => s.draws > 0), 'All nine replacement bodies drawn by the real game loop');
    fs.writeFileSync(path.join(out, 'combat.png'), (await win.webContents.capturePage()).toPNG());
    await run('NV.combatLabRuntime.pause()');
    assert.deepEqual(errors, [], 'No browser console errors');
    await win.loadFile(path.join(root,'previews/enemy-roster-canonical.html'));
    for(let n=0;n<160;n++){if(await run('NV.singularityFamilyStats().species.length===9&&NV.singularityFamilyStats().species.every(s=>s.ready&&s.materialReady)'))break;if(n===159)throw Error('Basalt file:// load failed');await delay(50);}
    const localFile=await run('NV.singularityFamilyStats().species.map(s=>({id:s.id,ready:s.ready,materialReady:s.materialReady,tankAnimationReady:s.tankAnimationReady}))');
    assert(localFile.every(s=>s.ready&&s.materialReady));assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(out, 'qa.json'), JSON.stringify({ materialCheck, localFile, invariants, game, combat, errors, report }, null, 2));
    console.log('PASS nine transparent sprites; previous visible sizes; immutable gameplay; scoped replacements; wisp telegraph; roster and actual nine-enemy combat; no console errors.');
    app.exit(0);
  }).catch(e => { console.error(e); app.exit(1); });
}
