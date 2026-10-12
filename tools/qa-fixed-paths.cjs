'use strict';
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'local/validation/performance-health');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'ds-fixed-paths-')));
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,webPreferences:{sandbox:true,contextIsolation:true}});
 await win.loadURL('about:blank');
 const before=fs.readFileSync(path.join(root,'local/backups/performance-health-20261010/enemies.before.js'),'utf8');
 const after=fs.readFileSync(path.join(root,'js/render/enemies.js'),'utf8');
 const result=await win.webContents.executeJavaScript(`(()=>{
  const old={NV:{}},cached={NV:{}},fallback={NV:{}};
  // Isolate the fixed-geometry identity cache. Grouped drone paint operations
  // have their own native visual-delta test in qa-drone-layers.cjs.
  (function(window){${before}})(old);(function(window,DOMMatrix){${after}})(cached,undefined);
  (function(window,Path2D){${after}})(fallback,undefined);
  const rows=[],ids=['drone','runner','tank','shielder','swarmlet','spitter','wisp','kamikaze'];
  for(const id of ids)for(const scale of [.65,1,1.5,2.5])for(const frame of [0,37,120])for(const state of ['windup','attack']){
   const canvases=[0,1,2].map(()=>{const c=document.createElement('canvas');c.width=c.height=256;return c;});
   const contexts=canvases.map(c=>c.getContext('2d',{willReadFrequently:true}));
   for(const c of contexts){c.fillStyle='#142239';c.fillRect(0,0,256,256);c.translate(128.25,127.7);c.scale(scale,scale);c.rotate(.37);c.globalAlpha=.83;}
   const e={enemyTypeId:id,x:0,y:0,radius:12,color:'#778899',shape:'circle',shield:state==='windup',armed:state==='attack',fuse:.4,intent:{state,stateTimer:.3}},p={x:180,y:80};
   [old,cached,fallback].forEach((ns,i)=>ns.NV.drawEnemy(contexts[i],{...e},frame,p,null,frame/60));
   const pixels=contexts.map(c=>c.getImageData(0,0,256,256).data);
   let max=0,fallbackMax=0;for(let i=0;i<pixels[0].length;i++){max=Math.max(max,Math.abs(pixels[0][i]-pixels[1][i]));fallbackMax=Math.max(fallbackMax,Math.abs(pixels[0][i]-pixels[2][i]));}
   rows.push({id,scale,frame,state,max,fallbackMax});
  }
  // Matched, warmed rendering workload; no simulation or RNG changes.
  const benchIds=['tank','shielder','swarmlet','spitter','kamikaze'];
  function bench(ns){const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');
   const entities=benchIds.map(enemyTypeId=>({enemyTypeId,x:0,y:0,radius:12,color:'#778899',shape:'circle'}));
   const p={x:180,y:80};ctx.translate(256,256);
   for(let i=0;i<80;i++)for(const e of entities)ns.NV.drawEnemy(ctx,e,i,p,null,i/60);
   const start=performance.now();for(let i=0;i<400;i++)for(const e of entities)ns.NV.drawEnemy(ctx,e,i,p,null,i/60);
   const submittedMs=performance.now()-start;ctx.getImageData(0,0,1,1);return {submittedMs,flushedMs:performance.now()-start};}
  const timings=[];for(let i=0;i<5;i++){if(i%2)timings.push({after:bench(cached),before:bench(old)});else timings.push({before:bench(old),after:bench(cached)});}
  return {rows,timings};
 })()`);
 assert(result.rows.every(r=>r.max===0&&r.fallbackMax===0),'Pixel mismatch: '+JSON.stringify(result.rows.filter(r=>r.max||r.fallbackMax)));
 fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'fixed-paths.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify({pass:true,pixelCases:result.rows.length,maxChannelError:0,timings:result.timings}));app.exit(0);
}).catch(e=>{console.error(e);app.exit(1);});
