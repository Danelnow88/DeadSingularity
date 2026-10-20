'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
if(!process.versions.electron){
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const p=require('node:child_process').spawn(require('electron'),[__filename],{cwd:root,env,windowsHide:true,stdio:'inherit'});
 p.on('exit',code=>process.exitCode=code??1);
}else{
 const {app,BrowserWindow}=require('electron');
 app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'ds-cosmic-boss-')));
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const out=path.join(root,'local/validation/cosmic-bosses');
 app.whenReady().then(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const errors=[],options={width:1440,height:1000,show:false,webPreferences:{offscreen:true,backgroundThrottling:false,sandbox:true,contextIsolation:true}};
  const w=new BrowserWindow(options),gallery=new BrowserWindow(options);
  for(const win of [w,gallery])win.webContents.on('console-message',d=>{if(d.level==='error')errors.push(d.message);});
  const run=code=>w.webContents.executeJavaScript(code),reference=code=>gallery.webContents.executeJavaScript(code);
  await w.loadFile(path.join(root,'index.html'),{query:{combatLab:'1',fresh:'1'}});
  for(let i=0;i<100;i++){if(await run('!!window.NV?.combatLabRuntime&&!!NV.cosmicBossArt'))break;await wait(50);}
  assert(await run('!!NV.combatLabRuntime&&!!NV.drawCosmicBoss'),'Production modules did not load');
  let source=fs.readFileSync(path.join(root,'PRUEBA DE CONCEPTO DE JEFES.html'),'utf8');
  source=source.replace('window.bossConceptLab={',`window.__artSnapshot=(index,hostile)=>{const cv=document.createElement('canvas');cv.width=cv.height=640;const c=cv.getContext('2d');c.translate(320,320);bosses[index].draw(c,2,{x:.35,y:-.2},hostile?{phase:'fury',charge:.85,fire:.2,rage:1,strike:.1}:{phase:'idle',charge:0,fire:0,rage:0,strike:0});return cv.toDataURL();};window.bossConceptLab={`);
  await gallery.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(source));
  await reference('document.getElementById("pause").click()');
  const fidelity=[];
  for(let index=0;index<10;index++)for(const hostile of [false,true]){
   const expected=await reference(`__artSnapshot(${index},${hostile})`);
   const actual=await run(`(()=>{const cv=document.createElement('canvas');cv.width=cv.height=640;const c=cv.getContext('2d');c.translate(320,320);NV.cosmicBossArt.drawLocal(c,${index},2,{x:.35,y:-.2},${hostile}?{phase:'fury',charge:.85,fire:.2,rage:1,strike:.1}:{phase:'idle',charge:0,fire:0,rage:0,strike:0});return cv.toDataURL();})()`);
   assert.equal(actual,expected,'Concept pixel mismatch: boss '+(index+1)+' hostile '+hostile);
   fidelity.push({bossIndex:index+1,hostile,identical:true});
  }
  gallery.destroy();console.log('PASS twenty exact pixel comparisons: production art = approved standalone art');
  const contactSheet=await run(`(()=>{const cv=document.createElement('canvas');cv.width=1500;cv.height=720;const c=cv.getContext('2d');c.fillStyle='#0b1421';c.fillRect(0,0,1500,720);for(let i=0;i<10;i++){const b={...NV.BOSS_TYPES[i],x:150+i%5*300,y:155+Math.floor(i/5)*360,isBoss:true,hp:100,maxHp:200,phase2:false,encounter:{stage:'windup',t:.1,cast:0}};NV.attachBossDesign(b,i);NV.drawSpectralBoss2D(c,b,120,{x:750,y:360},null);c.font='14px system-ui';c.fillStyle='#ddd5d1';c.textAlign='center';c.fillText((i+1)+' · '+NV.cosmicBossArt.definitions[i].name,b.x,b.y+145);c.fillStyle='#879aaa';c.font='11px system-ui';c.fillText(NV.BOSS_TYPES[i].name+' · radio físico '+b.radius,b.x,b.y+164);}return cv.toDataURL().split(',')[1];})()`);
  fs.writeFileSync(path.join(out,'ten-production-bosses.png'),Buffer.from(contactSheet,'base64'));
  await run(`(()=>{
   window.cosmicChecks={seen:{},mutations:[]};
   const draw=NV.drawCosmicBoss;NV.drawCosmicBoss=function(c,b,f,o){const before=JSON.stringify(b),result=draw(c,b,f,o);if(before!==JSON.stringify(b))cosmicChecks.mutations.push(b.name);if(result){const index=b.visual.bossIndex,key=index+':'+(b.phase2?'phase2':'phase1');const row=cosmicChecks.seen[key]||=(new Set());row.add(b.encounter?.stage||'initial');}return result;};
   const update=NV.updateBoss;NV.updateBoss=function(dt,st){st.player.invuln=1;st.player.hp=st.player.maxHp;return update(dt,st);};
  })()`);
  const fights=[];
  for(let i=0;i<10;i++){
   const started=await run(`NV.combatLabRuntime.start({encounterMode:'boss',bossIndex:${i},characterId:'rook',difficultyId:'normal',weaponId:NV.WEAPONS[0].id,weaponLevel:1,weaponFusion:0,firePolicy:'manual',durationMode:'infinite'})`);
   assert(started.ok,JSON.stringify(started));
   const stats=await run(`(()=>{const b=NV.getBoss(),t=NV.BOSS_TYPES[${i}],expected=NV.bossEncounterHp(t,(${i}+1)*5,NV.difficultySafeMult('hp','normal'));if(b.hp!==expected||b.radius!==t.radius||b.pattern!==t.pattern||b.attack!==t.attack||b.name!==t.name||b.color!==t.color)throw Error('Gameplay properties changed');return {index:${i}+1,gameplayName:b.name,art:NV.cosmicBossArt.definitions[${i}].name,hp:b.hp,radius:b.radius,pattern:b.pattern,attack:b.attack};})()`);
   // Wait for a real warning and completed cast; never drive the visual pose
   // manually in this phase of the QA.
   for(let j=0;j<60;j++){
    if(await run(`(()=>{const b=NV.getBoss();return b?.encounter?.cast>=1&&cosmicChecks.seen['${i+1}:phase1']?.has('windup');})()`))break;
    await wait(100);
   }
   assert(await run(`cosmicChecks.seen['${i+1}:phase1']?.has('windup')&&NV.getBoss().encounter.cast>=1`),'Phase-one real attack missing: '+i);
   await run('NV.getBoss().hp=NV.getBoss().maxHp*.45');
   for(let j=0;j<60;j++){
    if(await run(`cosmicChecks.seen['${i+1}:phase2']?.has('windup')`))break;
    await wait(100);
   }
   assert(await run(`cosmicChecks.seen['${i+1}:phase2']?.has('windup')`),'Phase-two warning missing: '+i);
   if(i===0||i===6||i===8||i===9){await run('NV.combatLabRuntime.pause()');fs.writeFileSync(path.join(out,'fight-'+(i+1)+'.png'),(await w.webContents.capturePage()).toPNG());}
   fights.push(stats);console.log('PASS live boss '+(i+1)+' '+stats.gameplayName+' → '+stats.art+'; real attacks + phase two');
  }
  const result=await run('({mutations:cosmicChecks.mutations,seen:Object.fromEntries(Object.entries(cosmicChecks.seen).map(([k,v])=>[k,[...v]])),cache:NV.cosmicBossArt.stats(),snapshot:NV.combatLabRuntime.snapshot()})');
  assert.equal(result.mutations.length,0);assert.equal(errors.length,0,JSON.stringify(errors));
  await w.loadFile(path.join(root,'index.html'),{query:{fresh:'1'}});
  assert(await run('!!NV.drawCosmicBoss&&NV.cosmicBossArt.definitions.length===10'),'Normal game entry lacks art');
  const normalCheck=await run(`(()=>{const cv=document.createElement('canvas');cv.width=cv.height=300;const c=cv.getContext('2d');for(let i=0;i<10;i++){const b={...NV.BOSS_TYPES[i],x:150,y:150,isBoss:true,hp:100};NV.attachBossDesign(b,i);if(!NV.drawSpectralBoss2D(c,b,120,{x:250,y:250},null))return false;if(!NV.drawBossDesign(c,b,120,{player:{x:250,y:250}}))return false;NV.drawBoss(c,b,120,{x:250,y:250});}return true;})()`);
  assert(normalCheck,'Normal render path failed');
  fs.writeFileSync(path.join(out,'qa.json'),JSON.stringify({fidelity,fights,result,errors,normalEntry:true,notes:'Actual production AI and both phases, untouched base stats and hitboxes, exact source art pixels. Offscreen correctness test, not a 165-FPS or GPU-performance certification.'},null,2));
  console.log('PASS all ten integrated: exact art, production attacks, phase two, frozen gameplay properties, normal and spectral render paths. '+out);app.exit(0);
 }).catch(e=>{console.error(e);app.exit(1);});
}
