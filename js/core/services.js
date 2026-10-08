// Offline first, bounded versioned service contract. No network is enabled by default.
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();
 else {
  const api=factory();root.NV.ServiceTools=api;
  root.NV.services=api.create({
   adapter:api.localAdapter(()=>root.NV.Content.clone(root.NV.activeCatalog),()=>root.NV.expedition.exportProgress()),
   storage:root.localStorage,validateCatalog:root.NV.Content.validateCatalog,
   importProgress:value=>root.NV.expedition.importProgress(value),
   exportProgress:()=>root.NV.expedition.exportProgress(),
   canActivate:()=>root.NV.getState&&root.NV.getState()==='menu'
  });
 }
})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const MAX=262144,clone=value=>JSON.parse(JSON.stringify(value)),encode=value=>new TextEncoder().encode(value);
 function bounded(value){const text=JSON.stringify(value);if(encode(text).length>MAX)throw new Error('Respuesta demasiado grande');return JSON.parse(text);}
 function localAdapter(catalog,progress){
  return Object.freeze({async request(method){
   if(method==='loadManifest')return {schemaVersion:1,catalogVersion:catalog().id,transport:'offline'};
   if(method==='fetchCatalog')return catalog();
   if(method==='syncProgress')return {schemaVersion:1,progress:progress(),revision:0};
   if(method==='submitTelemetry')return {schemaVersion:1,accepted:false,reason:'offline'};
   throw new Error('Operacion desconocida');
  }});
 }
 function stub(plan={}){
  const calls=[],counts={};
  return {calls,async request(method,payload,signal){
   calls.push({method,payload:clone(payload||{})});const index=counts[method]||0;counts[method]=index+1;
   const options=plan[method]||[];const result=options[Math.min(index,options.length-1)];
   if(result&&result.delay)await new Promise((resolve,reject)=>{
    const timer=setTimeout(resolve,result.delay);
    signal.addEventListener('abort',()=>{clearTimeout(timer);reject(new Error('cancelado'));},{once:true});
   });
   if(result&&result.error){const error=new Error(result.error);error.transient=!!result.transient;throw error;}
   return clone(result&&result.value!==undefined?result.value:null);
  }};
 }
 function conflict(local,remote,choice){
  if(JSON.stringify(local)===JSON.stringify(remote))return {status:'equal',progress:clone(local)};
  if(choice==='local'||choice==='remote')return {status:'resolved',choice,progress:clone(choice==='local'?local:remote)};
  return {status:'conflict',local:clone(local),remote:clone(remote)};
 }
 function create(options){
  const adapter=options.adapter,storage=options.storage;
  let knownCatalog=null;
  async function request(method,payload={}){
   const timeout=Math.max(10,Math.min(30000,options.timeoutMs||5000)),retries=Math.max(0,Math.min(2,options.retries||0));
   for(let attempt=0;;attempt++){
    const controller=new AbortController();let timer;
    try{
     const value=await Promise.race([adapter.request(method,bounded(payload),controller.signal),
      new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();const e=new Error('Timeout de servicio');e.transient=true;reject(e);},timeout);})]);
     const result=bounded(value);return result;
    }catch(error){if(attempt>=retries||!error.transient)throw error;}
    finally{clearTimeout(timer);controller.abort();}
   }
  }
  async function loadManifest(){
   const value=await request('loadManifest');
   if(!value||value.schemaVersion!==1||typeof value.catalogVersion!=='string')throw new Error('Manifest incompatible');
   return value;
  }
  async function fetchCatalog(){
   try{const manifest=await loadManifest(),raw=await request('fetchCatalog');
    const safe=manifest.transport==='offline' ? options.validateCatalog(raw) : await verifySignedCatalog(raw,options.trustedKey,options.subtle || globalThis.crypto?.subtle);
    if(safe.id!==manifest.catalogVersion)throw new Error('Version de catalogo no coincide');
    knownCatalog=clone(safe);return {status:'current',catalog:safe};
   }catch(error){if(knownCatalog)return {status:'rollback',catalog:clone(knownCatalog),reason:error.message};throw error;}
  }
  function consent(value){if(typeof value!=='boolean')throw new Error('Consentimiento invalido');storage.setItem('deadSingularityTelemetryConsent',JSON.stringify(value));return value;}
  async function submitTelemetry(payload){
   if(storage.getItem('deadSingularityTelemetryConsent')!=='true')return {accepted:false,reason:'consent-required'};
   // Explicit fields only; never include saves, identity, paths or arbitrary extras.
   if(!payload||typeof payload.event!=='string'||payload.event.length>64)throw new Error('Telemetria invalida');
   const safe={schemaVersion:1,event:payload.event};
   if(payload.durationMs!==undefined){if(!Number.isFinite(payload.durationMs)||payload.durationMs<0)throw new Error('Duracion invalida');safe.durationMs=Math.min(payload.durationMs,86400000);}
   return request('submitTelemetry',safe);
  }
  async function syncProgress(choice){
   const local=bounded(options.exportProgress()),reply=await request('syncProgress',{schemaVersion:1,progress:local});
   if(!reply||reply.schemaVersion!==1||!Number.isInteger(reply.revision)||reply.revision<0||!reply.progress)throw new Error('Respuesta de progreso incompatible');
   const result=conflict(local,bounded(reply.progress),choice);
   if(result.status==='resolved'&&choice==='remote'){
    if(!options.canActivate())throw new Error('Volver al lobby para sincronizar');
    const previous=JSON.stringify(local);storage.setItem('deadSingularityProgressBeforeSync',previous);
    if(!options.importProgress(result.progress))throw new Error('Progreso remoto invalido; original conservado');
   }
   return result;
  }
  async function verifySignedCatalog(envelope,trustedKey,subtle){
   if(!trustedKey||!subtle)throw new Error('No hay clave confiable configurada');
   if(!envelope||typeof envelope.payload!=='string'||encode(envelope.payload).length>MAX||typeof envelope.signature!=='string'||envelope.signature.length>256)throw new Error('Paquete firmado invalido');
   const signature=Uint8Array.from(atob(envelope.signature),c=>c.charCodeAt(0));
   if(trustedKey.algorithm.name!=='Ed25519'||!await subtle.verify('Ed25519',trustedKey,signature,encode(envelope.payload)))throw new Error('Firma no valida');
   return options.validateCatalog(JSON.parse(envelope.payload));
  }
  return Object.freeze({version:1,loadManifest,fetchCatalog,submitTelemetry,syncProgress,consent,verifySignedCatalog});
 }
 return Object.freeze({create,localAdapter,stub,conflict});
});

