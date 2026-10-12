'use strict';
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'local/validation/crochet-pause');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'ds-crochet-')));app.on('window-all-closed',()=>{});
app.whenReady().then(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const original=fs.readFileSync(path.join(root,'js/game.js'),'utf8');
 const source=original.replace(/NV\.getState\s*=\s*\(\)\s*=>\s*state;/,`NV.__qaChallenge=(enabled,boss=false)=>{if(state==='menu')startGame('rook');expeditionRun.contract=enabled;wave=boss?2:1;expeditionRun.waveHits=1;expeditionRun.waveKills={pistol:3,rifle:1};return NV.alpha.snapshot();};NV.getState=()=>state;`);
 assert(source!==original,'hook aislado de QA');
 const server=require('node:http').createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+decodeURIComponent(name));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.mp3':'audio/mpeg'})[path.extname(file)]||'application/octet-stream');
  res.end(name==='/js/game.js'?source:fs.readFileSync(file));
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port,reports=[];
 for(const mobile of [false,true]){
  const win=new BrowserWindow({width:mobile?844:1200,height:mobile?390:800,useContentSize:true,show:false,webPreferences:{offscreen:true,backgroundThrottling:false,sandbox:true,contextIsolation:true}});
  const errors=[];win.webContents.on('console-message',d=>{if(d.level==='error')errors.push(d.message);});
  const evaluate=code=>win.webContents.executeJavaScript(code,true),suffix=mobile?'-mobile':'';
  await win.loadURL(origin+'/index.html?fresh=1'+(mobile?'&mobile=1':''));await delay(700);
  await evaluate(`NV.viewport.requestFullscreen=()=>Promise.resolve(false);NV.setFirePolicy('manual');NV.__qaChallenge(true);window.qaCard=null;const draw=NV.drawPauseChallenge;NV.drawPauseChallenge=(...args)=>{qaCard=args[5];return draw(...args);};true;`);
  await delay(700);assert.equal(await evaluate("document.querySelectorAll('.alpha-run-strip').length"),0);
  assert.equal(await evaluate('qaCard'),null,'desafío visible en combate');
  fs.writeFileSync(path.join(out,'combat-clean'+suffix+'.png'),(await win.webContents.capturePage()).toPNG());
  await evaluate('NV.input.togglePause()');await delay(300);
  const normal=await evaluate('qaCard');assert.equal(normal.count,1);assert.equal(normal.reward,32);
  const before=await evaluate('JSON.stringify(NV.alpha.snapshot().run)');await delay(200);
  assert.equal(await evaluate('JSON.stringify(NV.alpha.snapshot().run)'),before,'la pausa altera contrato');
  fs.writeFileSync(path.join(out,'pause-challenge'+suffix+'.png'),(await win.webContents.capturePage()).toPNG());
  await evaluate('NV.__qaChallenge(true,true)');await delay(150);assert.equal((await evaluate('qaCard')).boss,true);
  fs.writeFileSync(path.join(out,'pause-boss'+suffix+'.png'),(await win.webContents.capturePage()).toPNG());
  await evaluate('NV.__qaChallenge(false);qaCard=null');await delay(150);assert.equal(await evaluate('qaCard'),null);
  await win.loadURL(origin+'/index.html?fresh=1&combatLab=1'+(mobile?'&mobile=1':''));await delay(600);
  await evaluate(`NV.viewport.requestFullscreen=()=>Promise.resolve(false);NV.input.getEffectiveFirePolicy=()=> 'manual';window.qaOwners=[];const update=NV.updateEnemies;NV.updateEnemies=(dt,st)=>{const r=update(dt,st);qaOwners=st.enemies.filter(e=>NV.isDimensionalThreat(e));return r;};true;`);
  for(const id of ['rift_weaver','dimension_sniper']){
   await evaluate(`NV.combatLabRuntime.reset();qaOwners=[];NV.input.setFire(false);NV.combatLabRuntime.start({characterId:'rook',wave:4,difficultyId:'normal',durationMode:'infinite',composition:[{enemyId:'${id}',quantity:1}]});`);
   const deadline=Date.now()+12000;let captured=false;
   while(Date.now()<deadline){
    if(await evaluate(`qaOwners.some(e=>!e.dead&&e.enemyTypeId==='${id}'&&e.dimensionalThreat&&e.dimensionalThreat.phase==='active'&&e.dimensionalThreat.elapsed>.15)`)){
     fs.writeFileSync(path.join(out,id+suffix+'.png'),(await win.webContents.capturePage()).toPNG());captured=true;break;
    }await delay(30);
   }assert(captured,id+' efecto real');
  }
  assert.deepEqual(errors,[]);reports.push({mobile,viewport:await evaluate('({width:innerWidth,height:innerHeight})'),challenge:normal,pass:true});win.destroy();
 }
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({pass:true,reports},null,2));console.log('PASS real polish: clean combat, optional challenge only in pause, boss/no-contract, frozen state and crochet/sniper desktop/mobile');app.exit(0);
}).catch(e=>{console.error(e);app.exit(1);});
