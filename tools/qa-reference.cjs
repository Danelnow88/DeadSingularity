// Private verifier only; this protocol is never registered by the game.
'use strict';
const {app,BrowserWindow,protocol,net}=require('electron'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),frozen=path.join(root,'reference/prototype'),{gameFile}=require('../desktop/runtime-policy.cjs');
app.setPath('userData',path.join(root,'local/validation/profile-frozen'));
protocol.registerSchemesAsPrivileged([{scheme:'ds-frozen-qa',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
app.whenReady().then(async()=>{
 protocol.handle('ds-frozen-qa',request=>{
  const url=new URL(request.url),file=gameFile(frozen,decodeURIComponent(url.pathname));
  return url.hostname==='frozen'&&file?net.fetch(pathToFileURL(file).toString()):new Response('Forbidden',{status:403});
 });
 const window=new BrowserWindow({width:1280,height:720,show:false,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,offscreen:true,backgroundThrottling:false}});
 await require('../desktop/soak-qa.cjs')(window,{root,outRoot:path.join(root,'local/validation'),baseline:true,url:'ds-frozen-qa://frozen/'});
 app.exit(0);
}).catch(error=>{console.error(error);app.exit(1);});

