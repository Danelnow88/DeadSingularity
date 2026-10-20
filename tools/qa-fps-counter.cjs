'use strict';
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'local/validation/fps-counter');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'ds-fps-')));
app.on('window-all-closed',()=>{});
app.whenReady().then(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const server=require('node:http').createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+decodeURIComponent(name));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port+'/index.html?fresh=1',reports=[];
 const legacy=fs.readFileSync(path.join(root,'js/render/sectors.js'),'utf8').replace("if(tier==='full'&&texture&&texture.full){","if(false){");
 const legacyEnemies=fs.readFileSync(path.join(root,'js/render/enemies.js'),'utf8').replace("if (typeof Path2D !== 'function')",'if (true)');
 for(const [width,height,mobile] of [[1280,800,false],[844,390,true]]){
  const win=new BrowserWindow({width,height,useContentSize:true,show:false,webPreferences:{offscreen:true,backgroundThrottling:false,sandbox:true,contextIsolation:true}});
  const errors=[];win.webContents.on('console-message',d=>{if(d.level==='error')errors.push(d.message);});
  const evaluate=code=>win.webContents.executeJavaScript(code,true);
  await win.loadURL(url+(mobile?'&mobile=1':''));await wait(700);
  assert.equal(await evaluate('document.getElementById("fpsCounter").hidden'),true);
  await evaluate(`NV.settingsUI.open();document.getElementById('tabGraphics').click();document.getElementById('settingsShowFPS').click();`);
  await wait(1100);
  assert(await evaluate(`NV.settings.graphics.showFPS&&!document.getElementById('fpsCounter').hidden&&/^[0-9]+ FPS$/.test(document.getElementById('fpsCounter').textContent)`));
  await evaluate('NV.settingsUI.close();NV.viewport.requestFullscreen=()=>Promise.resolve(false);document.getElementById("lobbyPlayBtn").click();');await wait(700);
  fs.writeFileSync(path.join(out,'playing'+(mobile?'-mobile':'')+'.png'),(await win.webContents.capturePage()).toPNG());
  const rect=await evaluate(`(()=>{const r=document.getElementById('fpsCounter').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};})()`);
  assert(rect.x>=0&&rect.y>=0&&rect.x+rect.w<=width&&rect.y+rect.h<=height);
  await win.reload();await wait(900);assert(await evaluate('NV.settings.graphics.showFPS&&document.getElementById("settingsShowFPS").checked&&!document.getElementById("fpsCounter").hidden'));
  await evaluate(`NV.settingsUI.open();document.getElementById('tabGraphics').click();document.getElementById('settingsShowFPS').click();`);
  assert(await evaluate('!NV.settings.graphics.showFPS&&document.getElementById("fpsCounter").hidden'));
  await evaluate(`window.qaLegacy={NV:{presentationClock:NV.presentationClock}};(function(window){${legacy}})(qaLegacy);`);
  const pixels=await evaluate(`(()=>{const results=[];for(const wave of [1,6,11,16]){
    const a=document.createElement('canvas'),b=document.createElement('canvas');a.width=b.width=1280;a.height=b.height=800;
    const ca=a.getContext('2d',{willReadFrequently:true}),cb=b.getContext('2d',{willReadFrequently:true});
    ca.scale(1280/1350,800/780);cb.scale(1280/1350,800/780);
    NV.drawSectorBackdrop(ca,1350,780,120,wave,{tier:'full'});qaLegacy.NV.drawSectorBackdrop(cb,1350,780,120,wave,{tier:'full'});
    const p=ca.getImageData(0,0,1280,800).data,q=cb.getImageData(0,0,1280,800).data;let max=0,sum=0;
    for(let i=0;i<p.length;i++){const d=Math.abs(p[i]-q[i]);max=Math.max(max,d);sum+=d;}results.push({wave,maxChannelError:max,meanChannelError:sum/p.length});
   }return results;})()`);
  assert(pixels.every(p=>p.maxChannelError<=4),'background batching changes material: '+JSON.stringify(pixels));
  await evaluate(`window.qaVector={NV:{presentationClock:NV.presentationClock}};(function(window){${legacyEnemies}})(qaVector);true;`);
  const vectorPixels=await evaluate(`(()=>{const results=[];
    for(const id of ['drone','runner'])for(const scale of [.65,1,1.5,2.5]){
      const a=document.createElement('canvas'),b=document.createElement('canvas');a.width=b.width=a.height=b.height=240;
      const ca=a.getContext('2d',{willReadFrequently:true}),cb=b.getContext('2d',{willReadFrequently:true});
      for(const c of [ca,cb]){c.fillStyle='#142239';c.fillRect(0,0,240,240);c.translate(120,120);c.scale(scale,scale);c.rotate(.37);}
      const e={enemyTypeId:id,x:0,y:0,radius:12,color:'#a6bbcc',shape:'circle'},p={x:180,y:80};
      NV.drawEnemy(ca,e,90,p,null,1.5);qaVector.NV.drawEnemy(cb,{...e},90,p,null,1.5);
      const p1=ca.getImageData(0,0,240,240).data,p2=cb.getImageData(0,0,240,240).data;let max=0,sum=0;
      for(let i=0;i<p1.length;i++){const d=Math.abs(p1[i]-p2[i]);max=Math.max(max,d);sum+=d;}
      results.push({id,scale,maxChannelError:max,meanChannelError:sum/p1.length});
    }return results;})()`);
  assert(vectorPixels.every(p=>p.maxChannelError===0),'native vector cache changed pixels: '+JSON.stringify(vectorPixels));
  assert.deepEqual(errors,[]);reports.push({width,height,mobile,rect,pixels,vectorPixels,pass:true});win.destroy();
 }
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({pass:true,reports},null,2));console.log('PASS FPS toggle/persistence/placement desktop+mobile, background and native path pixel equivalence');app.exit(0);
}).catch(e=>{console.error(e);app.exit(1);});
