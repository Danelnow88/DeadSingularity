// El contenedor comparte el mismo runtime de juego que la entrega web.
if (!process.versions.electron || process.type !== 'browser') {
  throw new Error('Abrí ABRIR_V1.cmd. ELECTRON_RUN_AS_NODE se usa únicamente para el servidor web.');
}
const {app,BrowserWindow,Menu,protocol,net,session}=require('electron');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {gameFile,CSP}=require('./runtime-policy.cjs');
const {prepareProfile}=require('./profile.cjs');
const projectRoot=path.resolve(__dirname,'..');
const root=app.isPackaged?process.resourcesPath:projectRoot;
const webChecking=process.argv.includes('--delivery-web-check')||process.argv.includes('--v1-web-check');
const soakChecking=process.argv.includes('--soak-check');
const checking=soakChecking||webChecking||process.argv.includes('--delivery-check')||process.argv.includes('--v1-check');
const validationRoot=app.isPackaged?path.join(app.getPath('temp'),'DeadSingularityV1-validation','packaged'):path.join(projectRoot,'local','validation');
const webOrigin='http://127.0.0.1:8093/';
const profileRoot=checking?path.join(validationRoot,webChecking?'profile-web':'profile'):path.join(app.getPath('appData'),'DeadSingularityV1');
app.setName('DeadSingularityV1');
if(!checking&&!app.isPackaged)prepareProfile(path.join(projectRoot,'local','profile'),profileRoot);
app.setPath('userData',profileRoot);
app.setAppUserModelId('com.deadsingularity.v1');
protocol.registerSchemesAsPrivileged([{scheme:'dsv1',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
let window;
if(!checking&&!app.requestSingleInstanceLock())app.quit();
else {
  app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.focus();}});
  app.whenReady().then(async()=>{
    protocol.handle('dsv1',request=>{
      const url=new URL(request.url);
      if(url.host!=='project')return new Response('Forbidden',{status:403});
      let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{return new Response('Bad request',{status:400});}
      const file=gameFile(root,pathname);
      if(!file)return new Response('Forbidden',{status:403});
      return net.fetch(pathToFileURL(file).toString());
    });
    session.defaultSession.setPermissionRequestHandler((_web,_permission,reply)=>reply(false));
    session.defaultSession.setPermissionCheckHandler(()=>false);
    session.defaultSession.webRequest.onBeforeRequest((details,reply)=>reply({cancel:!/^(dsv1:|file:|data:|blob:)/.test(details.url)&&!(webChecking&&details.url.startsWith(webOrigin))}));
    session.defaultSession.webRequest.onHeadersReceived((details,reply)=>reply({responseHeaders:{...details.responseHeaders,'Content-Security-Policy':[CSP]}}));
    Menu.setApplicationMenu(null);
    window=new BrowserWindow({title:'DeadSingularity · V1',icon:path.join(root,'assets','brand','icon.ico'),width:1280,height:800,minWidth:800,minHeight:520,show:!checking,backgroundColor:'#070b15',webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,offscreen:checking,backgroundThrottling:!checking}});
    window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    window.webContents.on('page-title-updated',event=>{event.preventDefault();window.setTitle('DeadSingularity · V1');});
    window.webContents.on('did-finish-load',()=>window.setTitle('DeadSingularity · V1'));
    window.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('dsv1://project/')&&!(webChecking&&url.startsWith(webOrigin)))event.preventDefault();});
    window.webContents.on('before-input-event',(event,input)=>{
      if(input.type!=='keyDown')return;
      if(input.key==='F11'){event.preventDefault();window.setFullScreen(!window.isFullScreen());}
      if(input.key==='Escape'&&window.isFullScreen())window.setFullScreen(false);
    });
    await window.loadURL('dsv1://project/index.html');
    if(checking){
      await require('./delivery-qa.cjs')(window,{root,webChecking,outRoot:validationRoot,profileRoot,packaged:app.isPackaged});
      if(soakChecking)await require('./soak-qa.cjs')(window,{root,webChecking,outRoot:validationRoot,profileRoot});
      app.exit(0);
    }
  }).catch(error=>{console.error(error);app.exit(1);});
  app.on('window-all-closed',()=>app.quit());
}
