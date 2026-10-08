// Legacy keys are read only here for lossless migration of existing players.
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();
 else {
  const api=factory();root.NV.migration=api;
  try{root.NV.migrationStatus=api.migrate(root.localStorage);}catch(error){root.NV.contentWarning='No se pudo migrar el progreso: '+error.message;}
 }
})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const pairs=['Meta','Settings','ExpeditionV1','CareerV1','TutorialV1','Rhythm'].map(s=>['neonVoid'+s,'deadSingularity'+s]);
 function migrate(storage){
  const copied=[], failures=[];
  for(const [oldKey,newKey] of pairs){
   try{
    const previous=storage.getItem(oldKey);
    if(storage.getItem(newKey)===null&&previous!==null){storage.setItem(newKey,previous);if(storage.getItem(newKey)!==previous)throw new Error('Escritura no verificada');copied.push(newKey);}
   }catch(error){failures.push({key:newKey,error:error.message});}
  }
  return {version:1,copied,failures,legacyRetained:true};
 }
 function normalizeProgress(raw){
  if(raw&&raw.kind==='neon-void-progress')return Object.assign({},raw,{kind:'dead-singularity-progress'});
  return raw;
 }
 return Object.freeze({migrate,normalizeProgress});
});

