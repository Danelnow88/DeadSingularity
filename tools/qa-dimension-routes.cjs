'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
if(!process.versions.electron){
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const child=require('node:child_process').spawn(require(path.join(root,'node_modules/electron')),[__filename,...process.argv.slice(2)],{cwd:root,env,windowsHide:true,stdio:'inherit'});
  child.on('error',e=>{console.error(e);process.exitCode=1;});child.on('exit',code=>process.exitCode=code??1);
}else{
  const {app,BrowserWindow,protocol,net}=require('electron'),{pathToFileURL}=require('node:url'),assert=require('node:assert/strict');
  const mobile=process.argv.includes('--mobile'),bossCheck=process.argv.includes('--boss'),endless=process.argv.includes('--endless'),web=process.argv.includes('--web'),out=path.join(root,'local/validation/dimension-routes',(web?'web-':'')+(mobile?'mobile':'desktop')+(bossCheck?'-boss':'')+(endless?'-endless':''));
  const builds=web?fs.readdirSync(path.join(root,'releases')).filter(s=>s.startsWith('DeadSingularity-V1-web-')).sort((a,b)=>fs.statSync(path.join(root,'releases',b)).mtimeMs-fs.statSync(path.join(root,'releases',a)).mtimeMs):[];
  const contentRoot=web?path.join(root,'releases',builds[0]):root;
  fs.mkdirSync(out,{recursive:true});app.setPath('userData',fs.mkdtempSync(path.join(out,'profile-')));
  protocol.registerSchemesAsPrivileged([{scheme:'dsroute',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  app.whenReady().then(async()=>{
    const serve=request=>{
      const u=new URL(request.url),file=path.resolve(contentRoot,'.'+decodeURIComponent(u.pathname));
      if(u.host!=='project'||!file.startsWith(contentRoot+path.sep))return new Response('',{status:403});
      if(mobile&&u.pathname==='/index.html')return new Response(fs.readFileSync(file,'utf8').replace('<head>','<head><script>Element.prototype.requestFullscreen=()=>Promise.resolve();</script>'),{headers:{'Content-Type':'text/html'}});
      if(u.pathname==='/js/game.js'){
        let source=fs.readFileSync(file,'utf8'),end=source.lastIndexOf('})();');assert(end>0);
        // Instrumentación sólo en la respuesta de QA, nunca en el runtime guardado.
        const hook=`
NV.__routeQA={
 pause(){paused=true;syncGameState();},
 paint(){const before=paused;paused=false;draw();paused=before;},
 tick(dt){paused=false;update(dt);paused=true;syncGameState();},
 clear(){enemies=[];boss=null;bullets=[];waveTimer=0;waveSpawned=waveGoal?waveGoal.total:100;transition=0;},
 beginWave(number){wave=number;nextWave();},
 defeatBoss(){boss.hp=0;updateBoss(.02);},
 bossReward(){return NV.bossRewardShards(wave,expeditionRun);},
 waveReward(){return expeditionRun.lastReward;},
 pressure(kind){
   wave=1;state='playing';nextWave();dimensionRun.depth=1;dimensionRun.activeRoute=kind;enterDimensionField();
   player.invuln=100;NV.setFirePolicy('manual');let peak=0;
   for(let i=0;i<600;i++){paused=false;update(1/60);paused=true;peak=Math.max(peak,enemies.filter(e=>!e.dead).length);}
   return {peak,limit:dimensionHostileLimit(),reinforced:enemies.some(e=>e.dimensionRouteApplied)};
 },
 move(x,y){player.x=x;player.y=y;followPlayerCamera();},
 nearStable(){const p=dimensionRun.stablePortal;player.x=p.x+(p.x<arenaW()/2?130:-130);player.y=p.y+(p.y<arenaH()/2?130:-130);followPlayerCamera();},
 setHp(hp){player.hp=hp;},
 target(){return fieldEventSession&&fieldEventSession.combatTarget();},
 state(){return {state,shards,wave,player:JSON.parse(JSON.stringify(player)),inventory:inventory.slice(),consumables:JSON.parse(JSON.stringify(consumableItems)),weaponLevels:{...weaponLevels},weaponKills:{...weaponKills},dimension:JSON.parse(JSON.stringify(dimensionRun)),enemies:enemies.map(e=>({hp:e.hp,maxHp:e.maxHp,speed:e.speed,route:e.dimensionRouteApplied})),boss:boss?{hp:boss.hp,maxHp:boss.maxHp,route:boss.dimensionRouteApplied}:null};}
};
`;
        return new Response(source.slice(0,end)+hook+source.slice(end),{headers:{'Content-Type':'text/javascript'}});
      }
      return net.fetch(pathToFileURL(file).href);
    };
    protocol.handle('dsroute',serve);
    let origin='dsroute://project',server=null;
    if(web){
      server=require('node:http').createServer(async(req,res)=>{try{const response=await serve({url:'http://project'+req.url});res.writeHead(response.status,{'Content-Type':response.headers.get('content-type')||'application/octet-stream'});res.end(Buffer.from(await response.arrayBuffer()));}catch(e){res.writeHead(500);res.end(String(e));}});
      await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;
    }
    const win=new BrowserWindow({width:mobile?844:1280,height:mobile?390:800,show:false,webPreferences:{offscreen:true,backgroundThrottling:false,sandbox:true,contextIsolation:true}});
    const errors=[];win.webContents.on('console-message',d=>{if(d.level==='error')errors.push(d.message);});
    const run=async code=>{const result=await win.webContents.executeJavaScript('(()=>{try{return eval('+JSON.stringify(code)+')}catch(e){return{__qaError:e.stack}}})()',true);if(result?.__qaError)throw Error(result.__qaError);return result;};
    const query=mobile?'?fresh=1&mobile=1':'?fresh=1';await win.loadURL(origin+'/index.html'+query);
    for(let n=0;n<200;n++){if(await run('!!NV.__routeQA&&!!NV.alpha&&(!NV.singularityFamilyStats||NV.singularityFamilyStats().species.every(s=>s.ready))'))break;await wait(40);if(n===199)throw Error('Carga incompleta');}
    if(mobile){const viewport=await run('({width:innerWidth,height:innerHeight})');assert(viewport.width<=900&&viewport.height<=450,JSON.stringify(viewport));}
    await run('document.getElementById("lobbySettingsBtn").click();document.getElementById("tabControls").click();const guideBox=document.getElementById("settingsShowGuides");guideBox.checked=false;guideBox.dispatchEvent(new Event("change",{bubbles:true}));true');
    assert.equal(await run('NV.settings.gameplay.showGuides'),false);
    assert.equal(await run('JSON.parse(localStorage.getItem("deadSingularitySettings")).gameplay.showGuides'),false);
    await run('NV.settingsUI.open();document.getElementById("tabControls").click();document.getElementById("settingsShowGuides").scrollIntoView({block:"center"});true');
    await wait(350);
    assert.equal(await run('document.getElementById("settingsPanel").getAttribute("aria-hidden")'), 'false');
    assert.equal(await run('document.getElementById("tabControls").getAttribute("aria-selected")'), 'true');
    fs.writeFileSync(path.join(out,'settings-guides.png'),(await win.webContents.capturePage()).toPNG());
    await win.reload();await wait(500);assert.equal(await run('NV.settings.gameplay.showGuides'),false);
    await run('NV.alpha.setMode('+JSON.stringify(endless?'endless':'expedition')+');NV.selectPilot("boti");document.getElementById("lobbyPlayBtn").click();NV.__routeQA.pause();window.requestAnimationFrame=()=>0;true');
    await wait(80);
    if(bossCheck)await run('NV.__routeQA.beginWave('+(endless?5:2)+')');
    const base=await run('NV.__routeQA.state()');assert.equal(base.state,'playing');assert.equal(base.dimension.routeChoices,true);
    assert.equal(await run('document.querySelector(".nv-tutorial").hidden'),true);
    await run('NV.__routeQA.clear();NV.__routeQA.tick(.02);NV.__routeQA.tick(1.21)');
    let s=await run('NV.__routeQA.state()');assert(s.dimension.portal&&s.dimension.stablePortal);assert.equal(s.dimension.phase,'portal');
    await run('(()=>{const d=NV.__routeQA.state().dimension;NV.__routeQA.move((d.portal.x+d.stablePortal.x)/2,d.portal.y-90)})()');
    await run('NV.__routeQA.paint()');await wait(80);fs.writeFileSync(path.join(out,'guides-off.png'),(await win.webContents.capturePage()).toPNG());
    await run('const guideBox=document.getElementById("settingsShowGuides");guideBox.checked=true;guideBox.dispatchEvent(new Event("change",{bubbles:true}));document.querySelector(".nv-tutorial-skip")?.click();NV.__routeQA.paint();true');
    await wait(80);fs.writeFileSync(path.join(out,'choice.png'),(await win.webContents.capturePage()).toPNG());
    await run('NV.__routeQA.nearStable();NV.__routeQA.paint()');await wait(80);fs.writeFileSync(path.join(out,'portal-solid.png'),(await win.webContents.capturePage()).toPNG());
    const preserved=s=>({hp:s.player.hp,maxHp:s.player.maxHp,armor:s.player.armor,agility:s.player.agility,baseMoveSpeed:s.player.baseMoveSpeed,inventory:s.inventory,consumables:s.consumables,weaponLevels:s.weaponLevels,weaponKills:s.weaponKills});
    const outcomes=[];
    for(const kind of bossCheck?['stable','stable','chaos']:['stable','chaos','stable']){
      const before=await run('NV.__routeQA.state()');
      await run(`(()=>{const d=NV.__routeQA.state().dimension,p=${JSON.stringify(kind)}==='stable'?d.stablePortal:d.portal;NV.__routeQA.move(p.x,p.y);NV.__routeQA.tick(1/60);if(NV.__routeQA.state().dimension.phase!=='transit')throw Error('Ingreso no inmediato');for(let i=0;i<72;i++)NV.__routeQA.tick(1/60)})()`);
      const after=await run('NV.__routeQA.state()');assert.equal(after.dimension.depth,before.dimension.depth+1);assert.equal(after.dimension.activeRoute,kind);assert.deepEqual(preserved(after),preserved(before));
      if(kind==='chaos')assert(after.enemies.some(e=>e.route)||after.boss?.route,'Campo caótico sin enemigos reforzados');
      if(after.dimension.depth<3){
        await run('NV.__routeQA.clear();NV.__routeQA.tick(.02)');const cleared=await run('NV.__routeQA.state()');
        const bonus=kind==='chaos'?12+cleared.wave*2+cleared.dimension.depth*4:0;assert.equal(cleared.shards-after.shards,bonus);
        await run('NV.__routeQA.tick(.02)');assert.equal((await run('NV.__routeQA.state()')).shards,cleared.shards);await run('NV.__routeQA.tick(1.21)');
      }
      outcomes.push({kind,depth:after.dimension.depth,shards:after.shards,enemyCount:after.enemies.length});
    }
    if(bossCheck){
      const before=await run('NV.__routeQA.state()'),reward=await run('NV.__routeQA.bossReward()');assert(before.boss&&before.boss.route);
      await run('NV.__routeQA.defeatBoss()');const end=await run('NV.__routeQA.state()'),waveReward=await run('NV.__routeQA.waveReward()');
      assert.equal(end.shards-before.shards,reward+waveReward+12+end.wave*2+12,'El wrapper perdió la recompensa de ruta al volver del motor de jefe');
    }else await run('NV.__routeQA.clear();NV.__routeQA.tick(.02)');
    assert.equal((await run('NV.__routeQA.state()')).state,'wave_end');
    await run('for(let i=0;i<900;i++)NV.__routeQA.tick(1/60)');assert.equal((await run('NV.__routeQA.state()')).state,'shop');
    let pressure=null;
    if(!mobile){pressure={stable:await run('NV.__routeQA.pressure("stable")'),chaos:await run('NV.__routeQA.pressure("chaos")')};assert(pressure.chaos.peak>pressure.stable.peak,JSON.stringify(pressure));assert(pressure.chaos.peak<=pressure.chaos.limit);assert(pressure.chaos.reinforced);}
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({pass:true,mobile,bossCheck,endless,web,contentRoot,outcomes,pressure,errors},null,2));
    if(server)server.close();
    console.log('PASS rutas en producción: '+outcomes.map(x=>x.kind).join(' → ')+', equipo conservado, enemigos reforzados, bonus único y tienda final.');app.exit(0);
  }).catch(e=>{console.error(e);app.exit(1);});
}
