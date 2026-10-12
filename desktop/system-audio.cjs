'use strict';
function installSystemAudio({session,desktopCapturer,dialog,getWindow,ipcMain,shell,platform=process.platform}){
  let pending=false;
  function trusted(frame){
    const win=getWindow();if(!win||win.isDestroyed()||!frame||frame.detached||frame!==win.webContents.mainFrame)return false;
    try{const url=new URL(frame.url);return url.protocol==='dsv1:'&&url.hostname==='project'&&url.pathname==='/index.html'&&!['combatLab','dimensionLab','dimensionExperiment'].some(key=>url.searchParams.has(key));}
    catch{return false;}
  }
  const displayAllowed=(web,permission)=>platform==='win32'&&permission==='display-capture'&&
    web===getWindow()?.webContents&&trusted(web.mainFrame);
  session.setPermissionRequestHandler((web,permission,reply,details={})=>{
    // Electron reports display capture as "media" with NO physical device types.
    // Never grant audio/video device requests: those are microphone/camera.
    const displayPrelude=platform==='win32'&&permission==='media'&&web===getWindow()?.webContents&&
      trusted(web.mainFrame)&&details.isMainFrame===true&&Array.isArray(details.mediaTypes)&&
      details.mediaTypes.length===0&&details.requestingUrl===web.mainFrame.url;
    reply(displayAllowed(web,permission)||displayPrelude);
  });
  session.setPermissionCheckHandler((web,permission)=>displayAllowed(web,permission));
  if(ipcMain&&shell){
    const services=Object.freeze({youtube:'https://music.youtube.com/',spotify:'https://open.spotify.com/'});
    ipcMain.handle('dead-singularity-open-music',async(event,service)=>{
      if(platform!=='win32'||event.sender!==getWindow()?.webContents||!trusted(event.senderFrame)||
        typeof service!=='string'||!Object.prototype.hasOwnProperty.call(services,service))return {ok:false,error:'source-not-allowed'};
      try{await shell.openExternal(services[service]);return {ok:true};}
      catch{return {ok:false,error:'browser-open-failed'};}
    });
  }
  session.setDisplayMediaRequestHandler(async(request,reply)=>{
    if(pending||platform!=='win32'||!request.userGesture||!request.audioRequested||!trusted(request.frame)){reply(null);return;}
    pending=true;
    try{
      const win=getWindow();
      const consent=await dialog.showMessageBox(win,{type:'question',title:'Música propia · experimental',
        message:'¿Permitir que el juego analice el audio de Windows?',
        detail:'Incluye YouTube, Spotify y posiblemente otros sonidos del sistema. No se graba ni se envía audio. La API necesita una pista de vídeo temporal, que el juego descarta inmediatamente. Podés detener el análisis desde Sistema → Música experimental.',
        buttons:['Cancelar','Permitir análisis de audio'],defaultId:0,cancelId:0,noLink:true});
      if(consent.response!==1||!trusted(request.frame)){reply(null);return;}
      const sources=await desktopCapturer.getSources({types:['screen'],thumbnailSize:{width:0,height:0},fetchWindowIcons:false});
      if(!sources.length||!trusted(request.frame)){reply(null);return;}
      reply({video:sources[0],audio:'loopback'});
    }catch{try{reply(null);}catch{/* Request frame may have closed. */}}
    finally{pending=false;}
  });
}
module.exports={installSystemAudio};
