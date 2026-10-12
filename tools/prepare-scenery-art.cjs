'use strict';
// Encode approved generated drafts for the isolated visual gallery. No network,
// no live audio, no capture and no manipulation of gameplay state.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(__dirname,'..');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'ds-scenery-encode-')));
app.whenReady().then(async()=>{
  const win=new BrowserWindow({show:false,webPreferences:{sandbox:true,contextIsolation:true}});
  await win.loadURL('about:blank');
  const manifest=JSON.parse(fs.readFileSync(path.resolve(root,process.argv[2]||'local/validation/scenery-rework/source-manifest.json'),'utf8'));
  const destination=path.join(root,'assets/scenery');fs.mkdirSync(destination,{recursive:true});
  const results=[];
  for(const entry of manifest){
    const url='data:image/png;base64,'+fs.readFileSync(entry.result).toString('base64');
    const encoded=await win.webContents.executeJavaScript(`new Promise((resolve,reject)=>{const image=new Image();image.onerror=()=>reject(Error('image decode failed'));image.onload=()=>{const scale=Math.min(1,1536/image.width,1024/image.height);const c=document.createElement('canvas');c.width=Math.round(image.width*scale);c.height=Math.round(image.height*scale);c.getContext('2d').drawImage(image,0,0,c.width,c.height);resolve({width:c.width,height:c.height,url:c.toDataURL('image/webp',.88)});};image.src=${JSON.stringify(url)};})`);
    const bytes=Buffer.from(encoded.url.split(',')[1],'base64');
    const name=entry.id+'-v1.webp';fs.writeFileSync(path.join(destination,name),bytes);
    results.push({id:entry.id,name:entry.name,file:name,width:encoded.width,height:encoded.height,bytes:bytes.length,prompt:entry.prompt});
  }
  fs.writeFileSync(path.join(root,'local/validation/scenery-rework/assets.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results.map(({prompt,...r})=>r)));win.destroy();app.quit();
}).catch(error=>{console.error(error);app.exit(1);});
