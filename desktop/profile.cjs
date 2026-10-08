const fs=require('node:fs'),path=require('node:path');
function prepareProfile(previous,destination){
  // Primera migración: conservar el perfil local y nunca pisar uno ya existente.
  if(fs.existsSync(destination)||!fs.existsSync(path.join(previous,'Local Storage')))return false;
  fs.cpSync(previous,destination,{recursive:true,force:false,errorOnExist:true,filter:file=>!['Cache','Code Cache','GPUCache','DawnGraphiteCache','DawnWebGPUCache','LOCK','SingletonLock','SingletonCookie','SingletonSocket'].includes(path.basename(file))});
  fs.writeFileSync(path.join(destination,'migration-origin.json'),JSON.stringify({from:previous,createdAt:new Date().toISOString(),previousRetained:true},null,2));
  return true;
}
module.exports={prepareProfile};
