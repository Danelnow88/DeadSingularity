'use strict';
if(!process.versions.electron){const {spawn}=require('node:child_process'),path=require('node:path');const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;const p=spawn(require('electron'),[__filename,...process.argv.slice(2)],{cwd:path.resolve(__dirname,'..'),env,windowsHide:true,stdio:'inherit'});p.on('exit',code=>process.exitCode=code==null?1:code);}
else{
const {app,BrowserWindow,protocol,net}=require('electron'),{pathToFileURL}=require('node:url');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'local/validation/gpu-layer-audit');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'ds-gpu-pixels-')));app.on('window-all-closed',()=>{});
protocol.registerSchemesAsPrivileged([{scheme:'dsv1',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
app.whenReady().then(async()=>{
 protocol.handle('dsv1',r=>{const f=path.resolve(root,'.'+new URL(r.url).pathname);return f.startsWith(root+path.sep)?net.fetch(pathToFileURL(f).toString()):new Response('',{status:403});});
 const win=new BrowserWindow({width:1280,height:800,show:false,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true}}),run=s=>win.webContents.executeJavaScript(s,true);
 await win.loadURL('dsv1://project/index.html?fresh=1');
 await run('window.baselineStars=NV.spaceEnvironment;window.baselineResponse=NV.spaceResponse;true;');
 const mode=process.argv.includes('--batcharms')?'batcharms':process.argv.includes('--actorclip')?'actorclip':process.argv.includes('--localtiles')?'localtiles':process.argv.includes('--localclip')?'localclip':process.argv.includes('--union')?'union':process.argv.includes('--buckets')?'buckets':process.argv.includes('--control')?'control':process.argv.includes('--cull')?'cull':process.argv.includes('--tiles')?'tiles':process.argv.includes('--double')?'double':'rects';
 if(mode==='batcharms')await run(require('./performance/actor_batch_candidate.cjs')(fs.readFileSync(path.join(root,'js/render/enemies.js'),'utf8')));
 await run(fs.readFileSync(path.join(root,'tools/performance/actor_clip_candidate.js'),'utf8'));
 const proxyMode=['tiles','buckets','union','localclip','localtiles'].includes(mode);
 if(proxyMode)await run(fs.readFileSync(path.join(root,'tools/performance/sparse_path_candidate.js'),'utf8'));
 const operation=args=>['tiles','control'].includes(mode)?'ctx.rect('+args+');':mode==='cull'?'{const aa=['+args+'],mm=ctx.getTransform(),xx=mm.a*aa[0]+mm.e,yy=mm.d*aa[1]+mm.f;if(xx+mm.a*aa[2]>=-32&&yy+mm.d*aa[3]>=-32&&xx<=ctx.canvas.width+32&&yy<=ctx.canvas.height+32)ctx.rect(...aa);}':mode==='double'?'{ctx.beginPath();ctx.rect('+args+');ctx.rect('+args+');ctx.fill();ctx.beginPath();}':'ctx.fillRect('+args+');';
 const env=fs.readFileSync(path.join(root,'js/render/spaceEnvironment.js'),'utf8').replace('ctx.rect(x,y,size,size);',operation('x,y,size,size'));
 const response=fs.readFileSync(path.join(root,'js/render/spaceResponse.js'),'utf8').replace('ctx.rect(grainDraw[n],grainDraw[n+1],grainDraw[n+2],grainDraw[n+2]);',operation('grainDraw[n],grainDraw[n+1],grainDraw[n+2],grainDraw[n+2]'));
 await run(env);await run(response);
 if(proxyMode)await run(`NV.__sparseMode=${JSON.stringify(mode)};NV.spaceEnvironment={...NV.spaceEnvironment,drawTravelStars:(ctx,...args)=>baselineStars.drawTravelStars(NV.__sparseContext(ctx),...args)};NV.spaceResponse={...NV.spaceResponse,drawBehind:ctx=>baselineResponse.drawBehind(NV.__sparseContext(ctx))};true;`);
 const report=await run(`(()=>{
 const results=[];
 function compare(name,a,b,scale){const cs=[document.createElement('canvas'),document.createElement('canvas')];const data=[];
  for(let j=0;j<2;j++){const c=cs[j];c.width=1920;c.height=1080;const ctx=c.getContext('2d',{willReadFrequently:false});ctx.fillStyle='#123247';ctx.fillRect(0,0,c.width,c.height);ctx.setTransform(scale,0,0,scale,.37,.23);(j?b:a)(ctx);data.push(ctx.getImageData(0,0,c.width,c.height).data);}
  let max=0,n=0,sum=0;for(let i=0;i<data[0].length;i++){const d=Math.abs(data[0][i]-data[1][i]);if(d)n++;max=Math.max(max,d);sum+=d;}
  results.push({name,max,differingChannels:n,mean:sum/data[0].length});
 }
 if(['actorclip','batcharms'].includes(${JSON.stringify(mode)})){
  for(const id of ['drone','runner'])for(const scale of [1,1.37,2.1])for(const time of [0,1.5,13.73])for(const flash of [0,.2]){
   const make=()=>({enemyTypeId:id,x:250.3,y:240.7,radius:24,color:'#a6bbcc',shape:'circle',atkFlash:flash});
   const render=(ctx,clipped)=>{NV.presentationClock.beginFrame(time,0);const args=[ctx,make(),time*60,{x:180,y:80},null,time];if(${JSON.stringify(mode)}==='batcharms'){NV.__auditOmit=clipped?'batcharms':'full';NV.drawEnemy(...args);}else if(clipped)NV.__drawActorClipped(NV.drawEnemy,...args);else NV.drawEnemy(...args);};
   compare(id+':'+scale+':'+time+':'+flash,c=>render(c,false),c=>render(c,true),scale);
  }
  return {pass:results.every(x=>x.max===0),results};
 }
 for(const scale of [1,1.37,2.1])for(const time of [0,1.5,13.73]){
  compare('stars:'+scale+':'+time,c=>baselineStars.drawTravelStars(c,900,520,time,71.3,102.7),c=>NV.spaceEnvironment.drawTravelStars(c,900,520,time,71.3,102.7),scale);
  for(const r of [baselineResponse,NV.spaceResponse]){r.update({enabled:true,id:'threshold',time:time,W:1500,H:1100,player:{x:600,y:600},enemies:[],bullets:[],meteors:[]});r.setGpuSurface(true);}
  compare('grains:'+scale+':'+time,c=>baselineResponse.drawBehind(c),c=>NV.spaceResponse.drawBehind(c),scale);
 }
 return {pass:results.every(x=>x.max===0),results};})()`);
 fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'primitives-'+mode+'-pixels.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));app.exit(report.pass?0:1);
}).catch(e=>{console.error(e);app.exit(1);});
}
