// Loaded on first request, with no network access or script execution.
(() => {
  'use strict';
  const NV = window.NV;
  let dialog;
  NV.openContentPanel = function () {
    if(NV.getState()!=='menu')throw new Error('Volver al lobby para abrir contenido');
    if (!dialog) {
      dialog = document.createElement('dialog'); dialog.setAttribute('aria-label','Contenido adicional');
      dialog.addEventListener('keydown',event=>event.stopPropagation());
      dialog.style.cssText='background:#101522;color:#fff;border:1px solid #7cf8ff;border-radius:12px;max-width:520px;padding:24px';
      const title=document.createElement('h2'); title.textContent='CONTENIDO ADICIONAL';dialog.appendChild(title);
      const info=document.createElement('p');info.textContent='Instalá paquetes de enemigos y armas desde archivos JSON. Los cambios se aplican en el lobby.';dialog.appendChild(info);
      const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.setAttribute('aria-label','Elegir paquete');dialog.appendChild(input);
      const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');dialog.appendChild(status);
      const list=document.createElement('div');dialog.appendChild(list);
      const render=() => {
        list.replaceChildren();
        for(const pack of NV.extensions.list()){
          const row=document.createElement('p'),label=document.createElement('span'),button=document.createElement('button');
          label.textContent=pack.name+' · v'+pack.version+' ';button.textContent='Desactivar';
          button.onclick=()=>{try{NV.extensions.disable(pack.id);status.textContent='Paquete desactivado';render();}catch(error){status.textContent=error.message;}};
          row.append(label,button);list.appendChild(row);
        }
        if(!list.childNodes.length)list.textContent='Usando el catálogo original.';
      };
      input.onchange=async()=>{
        const file=input.files[0];if(!file)return;
        try{
          if(file.size>NV.Content.LIMITS.packageBytes)throw new Error('Archivo demasiado grande');
          NV.extensions.install(JSON.parse(await file.text()));status.textContent='Paquete instalado';render();
        }catch(error){status.textContent=error.message;}finally{input.value='';}
      };
      const close=document.createElement('button');close.textContent='Cerrar';close.onclick=()=>dialog.close();dialog.appendChild(close);
      dialog.addEventListener('close',()=>input.value='');document.body.appendChild(dialog);NV.refreshContentPanel=render;
    }
    NV.refreshContentPanel();dialog.showModal();
  };
})();

