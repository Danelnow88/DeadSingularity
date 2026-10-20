'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');const root=path.resolve(__dirname,'..');
if(!process.versions.electron){const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;const p=require('node:child_process').spawn(require(path.join(root,'node_modules/electron')),[__filename],{cwd:root,env,windowsHide:true,stdio:'inherit'});p.on('exit',c=>process.exitCode=c??1);}else{
 const{app,BrowserWindow,protocol,net}=require('electron'),{pathToFileURL}=require('node:url');app.disableHardwareAcceleration();app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'ds-victory-qa-')));protocol.registerSchemesAsPrivileged([{scheme:'dsvictory',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
 app.whenReady().then(async()=>{
 protocol.handle('dsvictory',req=>{const u=new URL(req.url),file=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(u.host!=='project'||!file.startsWith(root+path.sep))return new Response('',{status:403});
  if(u.pathname==='/js/game.js'){
   let source=fs.readFileSync(file,'utf8');const end=source.lastIndexOf('})();');if(end<0)throw Error('Game closure missing');
   // Test-only served instrumentation; the project source is never changed by this QA hook.
   source=source.slice(0,end)+`\nNV.__qaVictorySnapshot=()=>({state,enemyCount:enemies.length,score,shards,pickups:pickups.length});
NV.__qaVictory=()=>{window.qaLateTarget=enemies[0];enemies.push({enemyTypeId:'tank',x:100,y:100,dead:true,hp:0},{enemyTypeId:'runner',x:100,y:100,dead:false,hp:20,arrival:true});return triggerWaveVictory(false,null,null);};
NV.__qaLateKill=()=>killEnemy(window.qaLateTarget);
NV.__qaLateEntry=()=>enemies.push({enemyTypeId:'tank',x:200,y:200,dead:false,hp:20});
`+source.slice(end);return new Response(source,{headers:{'Content-Type':'text/javascript'}});
  }return net.fetch(pathToFileURL(file).href);
 });
 const out=path.join(root,'local/validation/enemy-cleanup-v1');fs.mkdirSync(out,{recursive:true});const win=new BrowserWindow({width:1350,height:950,show:false,webPreferences:{offscreen:true,backgroundThrottling:false,sandbox:true,contextIsolation:true}}),errors=[];win.webContents.on('console-message',d=>{if(d.level==='error')errors.push(d.message);});const run=s=>win.webContents.executeJavaScript(s),wait=ms=>new Promise(r=>setTimeout(r,ms));
 await win.loadURL('dsvictory://project/index.html?combatLab=1');for(let i=0;i<160;i++){if(await run('!!NV.combatLabRuntime&&!!NV.__qaVictory&&NV.singularityFamilyStats().species.every(s=>s.ready)'))break;if(i===159)throw Error('Game load timeout');await wait(40);}
 const retired=await run(`({loaded:performance.getEntriesByType('resource').map(e=>e.name).filter(n=>/cosmicRunner|cosmicCreatures|cosmicSpecters|paintedSwarmlet|refinedCommon|assets\\/(cosmic-creatures|cosmic-specters|common-creatures)/.test(n)),api:[typeof NV.drawCosmicRunner,typeof NV.drawCosmicCreature,typeof NV.drawCosmicSpecter,typeof NV.drawPaintedSwarmlet,typeof NV.drawRefinedCommon]})`);assert.equal(retired.loaded.length,0);assert(retired.api.every(s=>s==='undefined'));
 await run(`window.qaLateDraws=0;for(const method of ['drawEnemy','drawSpectralEnemy2D']){const old=NV[method];NV[method]=function(...args){const s=NV.__qaVictorySnapshot().state;if(s==='wave_end'||s==='shop_enter'||s==='shop')window.qaLateDraws++;return old(...args);};}NV.combatLabRuntime.start({characterId:'rook',wave:3,difficultyId:'normal',durationMode:'infinite',composition:NV.singularityFamilyStats().species.map(s=>({enemyId:s.id,quantity:1}))});`);
 await wait(700);const before=await run('NV.__qaVictorySnapshot()');assert(before.enemyCount>0);
 assert(await run('NV.__qaVictory()'));const victory=await run('NV.__qaVictorySnapshot()');assert.equal(victory.state,'wave_end');assert.equal(victory.enemyCount,0);
 const late=await run('(()=>{const before=NV.__qaVictorySnapshot();NV.__qaLateKill();return{before,after:NV.__qaVictorySnapshot()};})()');assert.deepEqual(late.after,late.before,'late hit changed score/rewards/entities');
 await run('NV.__qaLateEntry()');await wait(120);const guarded=await run('NV.__qaVictorySnapshot()');assert.equal(guarded.enemyCount,0);assert.equal(await run('qaLateDraws'),0);
 fs.writeFileSync(path.join(out,'victory.png'),(await win.webContents.capturePage()).toPNG());await wait(2200);const shop=await run('NV.__qaVictorySnapshot()');assert.equal(shop.enemyCount,0);assert(['shop_enter','shop'].includes(shop.state),JSON.stringify(shop));assert.equal(await run('qaLateDraws'),0);assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,'qa-victory.json'),JSON.stringify({before,victory,late,guarded,shop,retired,errors},null,2));console.log('PASS actual wave victory and shop: no living/dead/arrival leftovers, no late rewards, no enemy draw during transition, no retired resources/APIs loaded, no console errors.');app.exit();
 }).catch(e=>{console.error(e);app.exit(1);});
}
