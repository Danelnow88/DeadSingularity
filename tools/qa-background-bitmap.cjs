'use strict';
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'ds-bg-bitmap-')));
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,webPreferences:{sandbox:true,contextIsolation:true}});await win.loadURL('about:blank');
 const old=fs.readFileSync(path.join(root,'local/backups/performance-health-20261010/sectors.pre-bitmap.js'),'utf8');
 const candidate=fs.readFileSync(path.join(root,'local/backups/performance-health-20261010/sectors.candidate.js'),'utf8');
 const report=await win.webContents.executeJavaScript(`(()=>{
  const old={NV:{}},candidate={NV:{}};(function(window){${old}})(old);(function(window){${candidate}})(candidate);
  const rows=[];
  for(const wave of [1,6,11,16])for(const tier of ['full','reduced','minimal'])for(const variant of [0,987654])for(const scale of [.65,1.5,2.5]){
   const contexts=[0,1].map(()=>{const c=document.createElement('canvas');c.width=400;c.height=260;return c.getContext('2d',{willReadFrequently:true});});
   for(const c of contexts){c.fillStyle='#142239';c.fillRect(0,0,400,260);c.translate(-37.3,-28.7);c.scale(scale,scale);c.globalAlpha=.83;}
   old.NV.drawSectorBackdrop(contexts[0],1350,780,120,wave,{tier,variant});candidate.NV.drawSectorBackdrop(contexts[1],1350,780,120,wave,{tier,variant});
   const p=contexts[0].getImageData(0,0,400,260).data,q=contexts[1].getImageData(0,0,400,260).data;let max=0;for(let i=0;i<p.length;i++)max=Math.max(max,Math.abs(p[i]-q[i]));
   rows.push({wave,tier,variant,scale,max});
  }
  return {rows,stats:candidate.NV.getSectorBackdropStats()};
 })()`);
 assert(report.rows.every(r=>r.max===0),'Pixel mismatch: '+JSON.stringify(report.rows.filter(r=>r.max)));
 assert.equal(report.stats.immutableImages,3);
 const out=path.join(root,'local/validation/performance-health');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'background-bitmap.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({pass:true,pixelCases:report.rows.length,maxChannelError:0,stats:report.stats}));app.exit(0);
}).catch(e=>{console.error(e);app.exit(1);});
