// QA de los tres enemigos reales, perfil aislado, sin modificar datos de entrega.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'local/validation/threat-redesign');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
app.on('window-all-closed',()=>{});
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'ds-threat-redesign-')));
app.whenReady().then(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const server=require('node:http').createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+decodeURIComponent(pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.mp3':'audio/mpeg'};
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 const reports=[];
 for(const mobile of (process.argv.includes('--mobile')?[true]:[false,true])){
  const win=new BrowserWindow({width:mobile?844:1200,height:mobile?390:800,useContentSize:true,show:false,webPreferences:{offscreen:true,backgroundThrottling:false,sandbox:true,contextIsolation:true}});
  const errors=[];win.webContents.on('console-message',d=>{if(d.level==='error')errors.push(d.message);});
  await win.loadURL(origin+'/index.html?fresh=1&combatLab=1'+(mobile?'&mobile=1':''));await delay(900);
  const evaluate=code=>win.webContents.executeJavaScript(code,true);
  await evaluate(`NV.setFirePolicy('manual'); window.qaOwners=[];window.qaHits=[];
   // Emular un teléfono, no el monitor: bloquear sólo fullscreen automático de QA.
   NV.viewport.requestFullscreen=()=>Promise.resolve(false);
   window.qaFirePolicy=NV.input.getEffectiveFirePolicy;
   // Sólo entrada de QA: observar una salva completa sin autodisparo móvil.
   NV.input.getEffectiveFirePolicy=()=> 'manual';
   const update=NV.updateEnemies;
   NV.updateEnemies=(dt,st)=>{const apply=st.applyPlayerDamage;st.applyPlayerDamage=(amount,opts)=>{const r=apply(amount,opts);qaHits.push({amount,cause:opts.cause,applied:r.applied});return r;};const result=update(dt,st);qaOwners=st.enemies.filter(e=>NV.isDimensionalThreat(e));return result;};
   window.qaSample=()=>({runtime:NV.getRuntimeSnapshot(),hits:qaHits,enemy:qaOwners.filter(e=>!e.dead).map(e=>({id:e.enemyTypeId,x:e.x,y:e.y,hp:e.hp,threat:e.dimensionalThreat}))});true;`);
  for(const id of ['rift_weaver','void_devourer','dimension_sniper']){
   await evaluate(`NV.combatLabRuntime.reset();qaHits=[];NV.setFirePolicy('manual');NV.input.setFire(false);
    NV.input.getEffectiveFirePolicy=()=> 'manual';NV.input.setMoveVector(0,0);NV.combatLabRuntime.start({characterId:'rook',wave:4,difficultyId:'normal',durationMode:'infinite',composition:[{enemyId:'${id}',quantity:1}]});`);
   const seen=new Set(),deadline=Date.now()+22000;let paused=false,hit=false;
   while(Date.now()<deadline && (!seen.has('active')||!hit)){
    const sample=await evaluate('qaSample()'),e=sample.enemy[0],s=e&&e.threat;
    assert.equal(sample.runtime.state,'playing',JSON.stringify(sample));
    if(s){
     const ready=s.phase==='windup'&&(id!=='rift_weaver'||s.weaveProgress>.22);
     if(ready&&!seen.has('windup')){
      fs.writeFileSync(path.join(out,id+'-windup'+(mobile?'-mobile':'')+'.png'),(await win.webContents.capturePage()).toPNG());seen.add('windup');
      await evaluate('NV.combatLabRuntime.pause()');const frozen=await evaluate('JSON.stringify(qaSample().enemy)');await delay(180);
      assert.equal(await evaluate('JSON.stringify(qaSample().enemy)'),frozen);await evaluate('NV.combatLabRuntime.resume()');paused=true;
     }
     if(s.phase==='active'&&s.elapsed>(id==='void_devourer'?.9:.12)&&!seen.has('active')){
      fs.writeFileSync(path.join(out,id+'-active'+(mobile?'-mobile':'')+'.png'),(await win.webContents.capturePage()).toPNG());seen.add('active');
     }
     if(id==='rift_weaver'&&s.phase==='active'){
      const g=s.geometry,tx=(g.ax+g.bx)/2,ty=(g.ay+g.by)/2,p=sample.runtime.player,dx=tx-p.x,dy=ty-p.y,d=Math.hypot(dx,dy);
      await evaluate(`NV.input.setMoveVector(${d>6?dx/d:0},${d>6?dy/d:0})`);
     }
     hit=sample.hits.some(h=>h.applied&&h.cause==='dimensional-'+s.kind);
    }
    await delay(35);
   }
   const attack=await evaluate('qaSample()');assert(seen.has('windup')&&seen.has('active'),id+' fases');assert(hit,id+' daño real');assert(paused);
   const viewport=await evaluate('({width:innerWidth,height:innerHeight})');
   if(mobile){assert(viewport.width<=844);assert(viewport.height<=390);}
   await evaluate(`NV.input.setMoveVector(0,0);NV.input.getEffectiveFirePolicy=qaFirePolicy;NV.setFirePolicy('legacy-auto');NV.input.setFire(true);`);
   const killDeadline=Date.now()+30000;
   const arena=attack.runtime.arena,route=[[arena.width/2-190,arena.height/2-150],[arena.width/2+190,arena.height/2-150],[arena.width/2+190,arena.height/2+150],[arena.width/2-190,arena.height/2+150]];let waypoint=0;
   while(Date.now()<killDeadline){const st=await evaluate('qaSample()');if(st.runtime.enemies===0)break;
    assert.equal(st.runtime.state,'playing',JSON.stringify(st));
    const p=st.runtime.player,[tx,ty]=route[waypoint],dx=tx-p.x,dy=ty-p.y,d=Math.max(1,Math.hypot(dx,dy));
    if(d<24)waypoint=(waypoint+1)%4;
    const e=st.enemy[0];await evaluate(`NV.input.setMoveVector(${dx/d},${dy/d});${e?`NV.input.setAimWorld(${e.x},${e.y});`:''}`);await delay(60);}
   const clear=await evaluate('qaSample()');
   if(clear.runtime.enemies)fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({clear,intent:await evaluate('NV.input.getCombatIntent()'),policy:await evaluate('NV.input.getEffectiveFirePolicy()')},null,2));
   assert.equal(clear.runtime.enemies,0,id+' baja con arma real');
   await evaluate('NV.combatLabRuntime.reset()');assert.equal((await evaluate('NV.getRuntimeSnapshot()')).enemies,0);
   reports.push({id,mobile,viewport,observationInput:'manual (QA only)',phases:[...seen],paused,hits:attack.hits,cleared:true});console.log('PASS',id,mobile?'mobile':'desktop');
  }
  assert.deepEqual(errors,[]);win.destroy();
 }
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({pass:true,reports},null,2));console.log('PASS three threats: phases, damage, pause, real kills, reset');app.exit(0);
}).catch(e=>{console.error(e);app.exit(1);});
