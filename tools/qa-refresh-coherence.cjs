'use strict';
const {app,BrowserWindow,protocol,net,screen}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'local/validation/refresh-coherence');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'ds-refresh-')));app.on('window-all-closed',()=>{});
protocol.registerSchemesAsPrivileged([{scheme:'dsv1',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
app.whenReady().then(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const game=fs.readFileSync(path.join(root,'js/game.js'),'utf8').replace(/NV\.getState\s*=\s*\(\)\s*=>\s*state;/,'NV.__qaSetShake=value=>{shake=value;};NV.getState=()=>state;');
 assert(game.includes('NV.__qaSetShake'));
 protocol.handle('dsv1',request=>{const p=path.resolve(root,'.'+new URL(request.url).pathname);if(!p.startsWith(root+path.sep))return new Response('',{status:403});if(p===path.join(root,'js/game.js'))return new Response(game,{headers:{'Content-Type':'text/javascript'}});return net.fetch(pathToFileURL(p).toString());});
 const win=new BrowserWindow({width:1280,height:800,useContentSize:true,show:false,webPreferences:{sandbox:true,contextIsolation:true,offscreen:true,backgroundThrottling:false}});
 const errors=[];win.webContents.on('console-message',d=>{if(d.level==='error')errors.push(d.message);});
 const evaluate=s=>win.webContents.executeJavaScript(s,true);
 await win.loadURL('dsv1://project/index.html?fresh=1');await wait(700);
 await evaluate(fs.readFileSync(path.join(root,'tools/performance/projectile_paths_candidate.cjs'),'utf8'));
 const pixels=await evaluate(`(()=>{
   const results=[];
   function compare(name,drawA,drawB){
     const a=document.createElement('canvas'),b=document.createElement('canvas');a.width=b.width=a.height=b.height=256;
     const ca=a.getContext('2d',{willReadFrequently:true}),cb=b.getContext('2d',{willReadFrequently:true});
     for(const ctx of [ca,cb]){ctx.fillStyle='#102036';ctx.fillRect(0,0,256,256);ctx.translate(128,128);}
     drawA(ca);drawB(cb);
     const x=ca.getImageData(0,0,256,256).data,y=cb.getImageData(0,0,256,256).data;let max=0,sum=0;
     for(let i=0;i<x.length;i++){const d=Math.abs(x[i]-y[i]);max=Math.max(max,d);sum+=d;}
     results.push({name,max,mean:sum/x.length});
   }
   for(const [id,def] of Object.entries(NV.BULLET_DEFS))for(const scale of [.7,1,2.1])for(const g of [0,.45])for(const angle of [0,.37,1.2]){
     const b={x:0,y:0,vx:Math.cos(angle),vy:Math.sin(angle),color:'#7cf8ff'};
     const draw=(ctx,enabled)=>{NV.setProjectilePathCacheEnabled(enabled);ctx.scale(scale,scale);ctx.shadowBlur=g?11:4;ctx.shadowColor='#b5a2ff';NV.drawBulletShape(ctx,b,def,g);};
     compare(id+':'+scale+':'+g+':'+angle,c=>draw(c,false),c=>draw(c,true));
   }
   NV.setProjectilePathCacheEnabled(true);
   const previous=NV.presentationClock.snapshot();
   for(const id of NV.CHARACTER_ORDER){
     const p={x:0,y:0,character:id,hp:100,maxHp:100,invuln:0,stun:0,phase:0,bulwark:0};
     compare('pilot-'+id,c=>{NV.presentationClock.beginFrame(2,1/60);NV.drawPlayer(c,p,NV.CHARACTERS,120);},c=>{NV.presentationClock.beginFrame(2,1/165);NV.drawPlayer(c,p,NV.CHARACTERS,330);});
   }
   for(const id of ['drone','runner','tank','shielder','spitter','wisp']){
     const make=()=>({enemyTypeId:id,x:0,y:0,radius:12,color:'#a6bbcc',shape:'circle'}),p={x:180,y:80};
     compare('enemy-'+id,c=>{NV.presentationClock.beginFrame(2,1/60);NV.drawEnemy(c,make(),120,p,null,2);},c=>{NV.presentationClock.beginFrame(2,1/165);NV.drawEnemy(c,make(),330,p,null,2);});
   }
   for(const id of ['specter_lite','specter_grunt','specter_archer','specter_guard']){
     const e={enemyTypeId:id,shape:'specter',x:0,y:0,radius:16,color:'#a6bbcc',hp:100,maxHp:100},p={x:180,y:80};
     compare(id,c=>{NV.presentationClock.beginFrame(2,1/60);NV.drawSpectralEnemy2D(c,e,120,p,null);},c=>{NV.presentationClock.beginFrame(2,1/165);NV.drawSpectralEnemy2D(c,e,330,p,null);});
   }
   NV.presentationClock.beginFrame(previous.seconds,previous.delta);
   return results;
 })()`);
 assert(pixels.every(p=>p.max===0),'render/pixel regression '+JSON.stringify(pixels.filter(p=>p.max)));
 await evaluate(`NV.setGraphicsOption('showFPS',true);true;`);await wait(800);
 const counter=await evaluate('NV.getFpsCounterSnapshot()');assert.equal(counter.metric,'raf-callbacks');assert.equal(counter.presentedFPS,null);assert(counter.fps>0);
 assert(await evaluate(`document.getElementById('fpsCounter').title.includes('No mide presentación física')`));
 const rhythm=await evaluate(`(()=>{
   Object.assign(NV.rhythm,{enabled:true,state:'listening',energy:.3,beat:.25,bass:.2,mids:.1,highs:.15,intensityCap:.55});
   const a=document.createElement('canvas');a.width=480;a.height=280;const c=a.getContext('2d',{willReadFrequently:true});
   NV.presentationClock.beginFrame(3,1/165);NV.drawRhythmLayer(c,480,280,495,4);
   const first=c.getImageData(0,0,480,280).data.slice();c.clearRect(0,0,480,280);
   NV.presentationClock.beginFrame(3+1/165,1/165);NV.drawRhythmLayer(c,480,280,496,4);
   const held=c.getImageData(0,0,480,280).data;let same=true,ink=0;
   for(let i=0;i<held.length;i++){if(first[i]!==held[i])same=false;if(i%4===3)ink+=held[i];}
   NV.rhythm.enabled=false;NV.rhythm.state='inactive';return {same,ink};
 })()`);
 assert(rhythm.same&&rhythm.ink>0,'throttled rhythm disappears between refreshes');
 await evaluate(`NV.viewport.requestFullscreen=()=>Promise.resolve(false);NV.setGraphicsOption('spaceTravel',true);document.getElementById('lobbyPlayBtn').click();true;`);await wait(850);
 await evaluate(`window.qaLayerFrames=0;window.qaLayerErrors=0;const renderer=NV.spaceEnvironment;NV.spaceEnvironment={...renderer,render(o){const ok=renderer.render(o);if(ok){qaLayerFrames++;if(document.querySelector('.space-environment').style.transform!==NV.canvas.style.transform)qaLayerErrors++;}return ok;}};NV.__qaSetShake(1);true;`);
 await wait(350);
 const layers=await evaluate(`({frames:qaLayerFrames,mismatches:qaLayerErrors,main:NV.canvas.style.transform,background:document.querySelector('.space-environment').style.transform})`);
 assert(layers.frames>5&&layers.mismatches===0&&layers.main===layers.background,'CSS layer shake out of phase');
 await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyP',key:'p',bubbles:true}));true;`);await wait(100);
 assert(await evaluate(`NV.getRuntimeSnapshot().paused&&NV.canvas.style.transform===''&&document.querySelector('.space-environment').style.transform===''`),'pause kept shaking layers');
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,'pixels-and-clock.json'),JSON.stringify({pass:true,pixels,counter,rhythm,layers,display:screen.getDisplayMatching(win.getBounds()),errors,notes:'Offscreen pixel/clock correctness only; not a displayed-FPS benchmark.'},null,2));
 console.log('PASS refresh coherence: '+pixels.length+' native pixel comparisons, shared 60/165-Hz pose, honest counter and held rhythm layer');app.exit(0);
}).catch(error=>{console.error(error);app.exit(1);});
