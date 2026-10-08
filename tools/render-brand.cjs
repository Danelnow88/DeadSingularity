'use strict';
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
app.setPath('userData',path.join(root,'local/validation/profile-brand'));
app.whenReady().then(async()=>{
 const win=new BrowserWindow({width:512,height:512,useContentSize:true,show:false,transparent:true,backgroundColor:"#00000000",webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,offscreen:true}});
 const svg=fs.readFileSync(path.join(root,'assets/brand/dead-singularity-mark.svg'),'utf8');
 await win.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent('<style>html,body{margin:0;width:512px;height:512px;overflow:hidden;background:transparent}svg{display:block;width:512px;height:512px}</style>'+svg));
 await new Promise(r=>setTimeout(r,300));
 const image=await win.webContents.capturePage();fs.writeFileSync(path.join(root,'assets/brand/icon.png'),image.toPNG());
 const sizes=[16,32,48,64,128,256],pngs=sizes.map(size=>image.resize({width:size,height:size}).toPNG());
 const header=Buffer.alloc(6+sizes.length*16);header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);
 let offset=header.length;
 sizes.forEach((size,i)=>{const p=6+i*16;header[p]=size===256?0:size;header[p+1]=header[p];header.writeUInt16LE(1,p+4);header.writeUInt16LE(32,p+6);header.writeUInt32LE(pngs[i].length,p+8);header.writeUInt32LE(offset,p+12);offset+=pngs[i].length;});
 fs.writeFileSync(path.join(root,'assets/brand/icon.ico'),Buffer.concat([header,...pngs]));
 console.log('DeadSingularity icon: SVG + PNG + ICO 16/32/48/64/128/256');app.exit(0);
}).catch(error=>{console.error(error);app.exit(1);});

