'use strict';
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'ds-promoted-')));
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1280,height:800,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true}});
 const errors=[],reports=[];win.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message);});
 for(const mobile of [false,true])for(const preview of [false,true]){
  win.setMinimumSize(1,1);win.setContentSize(mobile?844:1280,mobile?390:800);
  const query={};if(mobile)query.mobile='1';if(preview)query.dimensionEvents='preview';
  await win.loadFile(path.join(root,'index.html'),{query});
  const lobby=await win.webContents.executeJavaScript(`({snapshot:NV.alpha.snapshot(),skin:document.getElementById('startScreen').classList.contains('dimension-test-lobby'),audio:NV.AudioPerimeter.enabled})`);
  assert.equal(lobby.snapshot.eventPreview,preview);assert.equal(lobby.snapshot.saveDisabled,preview);assert.equal(lobby.skin,preview);
  assert.equal(lobby.audio,false,'web/mobile must not acquire native audio');
  assert.equal(lobby.snapshot.content.sceneryCount,8);assert(lobby.snapshot.promotedContent);
  await win.webContents.executeJavaScript('Math.random=()=>.41;document.getElementById("lobbyPlayBtn").click()');
  await new Promise(resolve=>setTimeout(resolve,350));
  const playing=await win.webContents.executeJavaScript('NV.alpha.snapshot()');
  assert.equal(playing.state,'playing');assert.equal(playing.content.enemies.length,12);assert.equal(playing.content.elites.length,6);assert(playing.content.coreSchedule);
  if(preview)assert.deepEqual(playing.content,reports.at(-1).content,'normal and trial content diverged');
  reports.push({mobile,preview,content:playing.content});
 }
 assert.deepEqual(errors,[]);fs.mkdirSync(path.join(root,'local/validation/promotion'),{recursive:true});
 fs.writeFileSync(path.join(root,'local/validation/promotion/runtime.json'),JSON.stringify({reports,errors},null,2));
 console.log('PASS normal/trial baseline parity, desktop/mobile startup, unchanged lobby skins and save isolation');win.destroy();app.quit();
}).catch(e=>{console.error(e);app.exit(1);});
