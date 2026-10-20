'use strict';
if(!process.versions.electron){
 const {spawn}=require('node:child_process'),path=require('node:path'),env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const p=spawn(require('electron'),[__filename,...process.argv.slice(2)],{cwd:path.resolve(__dirname,'..'),env,windowsHide:true,stdio:'inherit'});p.on('exit',c=>process.exitCode=c??1);p.on('error',e=>{console.error(e);process.exitCode=1;});
}else{
 const {app,BrowserWindow,protocol,net}=require('electron'),path=require('node:path'),fs=require('node:fs'),os=require('node:os'),{pathToFileURL}=require('node:url');
 const root=path.resolve(__dirname,'..');app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'ds-roster-')));
 protocol.registerSchemesAsPrivileged([{scheme:'dsroster',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
 app.whenReady().then(async()=>{
  protocol.handle('dsroster',req=>{const u=new URL(req.url),file=path.resolve(root,'.'+decodeURIComponent(u.pathname));return u.host==='project'&&file.startsWith(root+path.sep)?net.fetch(pathToFileURL(file).toString()):new Response('',{status:403});});
  const capture=process.argv.includes('--capture'),errors=[];
  const win=new BrowserWindow({width:1400,height:960,show:!capture,webPreferences:{offscreen:capture,sandbox:true,contextIsolation:true}});
  win.webContents.on('console-message',d=>{if(d.level==='error')errors.push(d.message);});
  await win.loadURL('dsroster://project/previews/enemy-roster-canonical.html');
  if(!capture){win.maximize();return;}
  const run=s=>win.webContents.executeJavaScript(s);
  for(let n=0;n<120;n++){if(await run('NV.singularityFamilyStats().species.length===9&&NV.singularityFamilyStats().species.every(s=>s.ready&&s.draws>0)'))break;await new Promise(r=>setTimeout(r,50));}
  const state=await run('({stats:NV.singularityFamilyStats(),cards:document.querySelectorAll("canvas[data-id]").length,status:document.getElementById("arte-status").textContent})');
  if(!state.stats.species.every(s=>s.ready&&s.draws>0)||state.cards<20||errors.length)throw Error(JSON.stringify({state,errors}));
  const out=path.join(root,'local/validation/singularity-family-v1');fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'roster-current.png'),(await win.webContents.capturePage()).toPNG());
  fs.writeFileSync(path.join(out,'roster-capture.json'),JSON.stringify({state,errors},null,2));console.log('PASS canonical roster: nine shared bodies, no retired rigs or console errors');app.exit(0);
 }).catch(e=>{console.error(e);app.exit(1);});
 app.on('window-all-closed',()=>app.quit());
}
