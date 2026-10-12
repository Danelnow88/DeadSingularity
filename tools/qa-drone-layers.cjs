'use strict';
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'local/validation/performance-health');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'ds-drone-layers-')));
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,webPreferences:{sandbox:true,contextIsolation:true}});
 await win.loadURL('about:blank');
 const before=fs.readFileSync(path.join(root,'local/backups/performance-health-20261010/enemies.pre-drone-layers.js'),'utf8');
 const after=fs.readFileSync(path.join(root,'local/backups/performance-health-20261010/enemies.drone-candidate.js'),'utf8');
 const result=await win.webContents.executeJavaScript(`(()=>{
  const old={NV:{}},candidate={NV:{}},fallback={NV:{}},noMatrix={NV:{}};
  (function(window){${before}})(old);(function(window){${after}})(candidate);
  (function(window,Path2D){${after}})(fallback,undefined);
  (function(window,DOMMatrix){${after}})(noMatrix,undefined);
  const rows=[];
  for(const readMode of ['frequent-read','default'])for(const scale of [.35,.65,1,1.5,2.5,3])for(const frame of [0,37,120])for(const angle of [0,.37,1.8])for(const mode of ['full','no-blur','filtered','additive']){
   const canvases=[0,1,2,3].map(()=>{const c=document.createElement('canvas');c.width=c.height=256;return c;});
   const contexts=canvases.map(c=>c.getContext('2d',{willReadFrequently:readMode==='frequent-read'}));
   for(const c of contexts){c.fillStyle='#142239';c.fillRect(0,0,256,256);c.translate(128.25,127.7);c.scale(scale,scale);c.rotate(angle);c.globalAlpha=.83;if(mode==='filtered')c.filter='blur(2px)';if(mode==='additive')c.globalCompositeOperation='lighter';}
   const e={enemyTypeId:'drone',x:0,y:0,radius:12,color:'#778899',shape:'circle',droneState:'press',intent:{state:'attack',stateTimer:.3}},p={x:180,y:80};
   [old,candidate,fallback,noMatrix].forEach((ns,i)=>{ns.NV.setCommonEnemyDiagnosticMode(mode==='no-blur'?'no-blur':'full');ns.NV.drawEnemy(contexts[i],{...e},frame,p,null,frame/60);});
   const pixels=contexts.map(c=>c.getImageData(0,0,256,256).data);
   const max=[0,0,0],changed=[0,0,0];for(let i=0;i<pixels[0].length;i++)for(let j=1;j<4;j++){const delta=Math.abs(pixels[0][i]-pixels[j][i]);max[j-1]=Math.max(max[j-1],delta);if(delta)changed[j-1]++;}
   rows.push({readMode,scale,frame,angle,mode,max,changed});
  }
  // Native-resolution side-by-side: original | candidate | amplified delta.
  const pair=[old,candidate].map(ns=>{
   const c=document.createElement('canvas');c.width=480;c.height=320;const ctx=c.getContext('2d');ctx.fillStyle='#142239';ctx.fillRect(0,0,480,320);
   ns.NV.setCommonEnemyDiagnosticMode('full');
   for(let i=0;i<12;i++){ctx.save();ctx.translate(55+(i%4)*120,50+Math.floor(i/4)*100);ctx.scale(1+(i%3)*.3,1+(i%3)*.3);ctx.rotate(i*.31);ns.NV.drawEnemy(ctx,{enemyTypeId:'drone',x:0,y:0,radius:12,shape:'circle',color:'#778899',intent:{state:'attack'}},37,{x:180,y:80},null,37/60);ctx.restore();}return c;
  });
  const montage=document.createElement('canvas');montage.width=1440;montage.height=320;const mc=montage.getContext('2d');mc.drawImage(pair[0],0,0);mc.drawImage(pair[1],480,0);
  const a=pair[0].getContext('2d').getImageData(0,0,480,320),b=pair[1].getContext('2d').getImageData(0,0,480,320),delta=mc.createImageData(480,320);
  for(let i=0;i<a.data.length;i++)delta.data[i]=i%4===3?255:Math.min(255,Math.abs(a.data[i]-b.data[i])*8);mc.putImageData(delta,960,0);
  return {rows,png:montage.toDataURL('image/png').split(',')[1]};
 })()`);
 fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'drone-layers.png'),Buffer.from(result.png,'base64'));delete result.png;fs.writeFileSync(path.join(out,'drone-layers.json'),JSON.stringify(result,null,2));
 assert(result.rows.every(r=>r.max.slice(1).every(n=>n===0)),'Fallback pixel mismatch');
 assert(result.rows.filter(r=>['filtered','additive'].includes(r.mode)).every(r=>r.max[0]===0),'Caller filter/blend must preserve separated original paints exactly');
 assert(result.rows.every(r=>r.max[0]<=24&&r.changed[0]<=1024),'Grouped vector output exceeded measured antialias edge-delta budget');
 console.log(JSON.stringify({pixelIdentical:result.rows.every(r=>r.max[0]===0),pixelCases:result.rows.length,maxChannelError:Math.max(...result.rows.map(r=>r.max[0])),maxChangedChannels:Math.max(...result.rows.map(r=>r.changed[0])),fallbackIdentical:true}));app.exit(0);
}).catch(e=>{console.error(e);app.exit(1);});
