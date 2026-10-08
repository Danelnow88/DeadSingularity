// Explicit optional-module allowlist; no lazy loading while combat is running.
(() => {
  'use strict';
  const NV=window.NV;
  NV.events=NV.RuntimeTools.events();
  NV.runtime=NV.RuntimeTools.facades(NV);
  const optional=new Map([['content','js/ui/contentPanel.js?nv=growth-1'],['webgpu','js/render/webgpuPresentation.js?nv=growth-1']]);
  const loading=new Map();
  NV.loadOptional=function(name){
    if(!optional.has(name))return Promise.reject(new Error('Modulo no registrado'));
    if(NV.getState()!=='menu')return Promise.reject(new Error('Volver al lobby para abrir esta opcion'));
    if(loading.has(name))return loading.get(name);
    const task=new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src=optional.get(name);
      script.onload=()=>{const ready=name==='content'?typeof NV.openContentPanel==='function':!!NV.webgpuPresentation;if(ready)resolve(true);else{script.remove();loading.delete(name);reject(new Error('La opcion no se pudo iniciar; el juego sigue disponible'));}};script.onerror=()=>{script.remove();loading.delete(name);reject(new Error('No se pudo cargar la opcion; el juego sigue disponible'));};
      document.head.appendChild(script);
    });loading.set(name,task);return task;
  };
  function attach(){
    const host=document.getElementById('systemMenu');
    if(!host||host.querySelector('[data-growth-content]'))return;
    const button=document.createElement('button');button.type='button';button.dataset.growthContent='true';button.textContent='Contenido adicional';
    const status=document.createElement('p');status.setAttribute('role','status');status.textContent=NV.contentWarning||(NV.migrationStatus&&NV.migrationStatus.failures.length ? 'No se pudo migrar todo el progreso; la copia anterior se conserva.' : '');
    button.onclick=async()=>{try{await NV.loadOptional('content');NV.openContentPanel();}catch(error){status.textContent=error.message;}};
    host.append(button,status);
    const graphics=document.getElementById('panelGraphics');
    if(graphics){
      const label=document.createElement('label');label.className='settings-toggle';
      const input=document.createElement('input');input.type='checkbox';
      const text=document.createElement('span');text.textContent='Presentación GPU experimental (Canvas2D vuelve automáticamente si falla)';
      input.onchange=async()=>{
        try{if(input.checked){await NV.loadOptional('webgpu');input.checked=await NV.webgpuPresentation.enable(NV.canvas);if(!input.checked)status.textContent='Presentación GPU no disponible; Canvas2D sigue activo';}
          else if(NV.webgpuPresentation)NV.webgpuPresentation.disable();
        }catch(error){input.checked=false;status.textContent=error.message;}
      };label.append(input,text);graphics.appendChild(label);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
  document.addEventListener('nv-game-state-change',()=>{
    if(NV.events)NV.events.emit('game.state',{state:NV.getState(),wave:NV.getWave()});
  });
})();

