'use strict';
// Capability and two fixed music destinations; no arbitrary IPC/URLs/files/Node.
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('deadSingularityDesktopAudio',Object.freeze({
  systemAudio:process.platform==='win32',experimental:true,
  openMusic:service=>ipcRenderer.invoke('dead-singularity-open-music',service)
}));
