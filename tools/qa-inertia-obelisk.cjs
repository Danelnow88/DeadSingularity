'use strict';
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'ds-obelisk-')));
app.whenReady().then(async()=>{
  const win=new BrowserWindow({width:900,height:560,useContentSize:true,show:false,
    webPreferences:{offscreen:true,sandbox:true,contextIsolation:true}});
  await win.loadFile(path.join(root,'index.html'),{query:{dimensionEvents:'preview',fresh:'1'}});
  for(let i=0;i<60;i++) {
    if(await win.webContents.executeJavaScript('NV.inertiaSpriteStatus().every(s=>s.ready)'))break;
    await new Promise(resolve=>setTimeout(resolve,50));
  }
  assert(await win.webContents.executeJavaScript('NV.inertiaSpriteStatus().every(s=>s.ready&&!s.error)'),'sprites failed to load');
  const drift=await win.webContents.executeJavaScript(`(()=>{
    const objective=NV.InertiaChamber.create();
    const placement={W:1200,H:800,player:{x:600,y:400},enemies:[],bullets:[],view:{x:0,y:0,width:1200,height:800}};
    const canvas=document.createElement('canvas');canvas.width=300;canvas.height=240;const c=canvas.getContext('2d');
    const result=[];
    for(let pattern=0;pattern<3;pattern++) {
      objective.update(pattern?3:.001,pattern?3:.001,placement);
      const start=objective.view().target;
      let maxStep=0;
      for(let frame=0;frame<480;frame++) {
        const old=objective.view().target;objective.update(1/60,1/60,placement);
        const view=objective.view();maxStep=Math.max(maxStep,Math.hypot(view.target.x-old.x,view.target.y-old.y));
        c.clearRect(0,0,300,240);c.save();c.translate(150-start.x,100-start.y);NV.drawInertiaChamber(c,view);c.restore();
      }
      const end=objective.view().target;
      result.push({pattern,travel:Math.hypot(end.x-start.x,end.y-start.y),maxStep,vx:end.vx,vy:end.vy});
      const frozen=JSON.stringify(objective.view());objective.update(0,0,placement);
      if(JSON.stringify(objective.view())!==frozen)throw new Error('drift moved during pause');
      objective.combatTarget().hp=0;objective.update(.016,.016,placement);
    }
    return result;
  })()`);
  for(const entry of drift){assert(entry.travel>1&&entry.maxStep<2.5,'unreadable evasive motion '+JSON.stringify(entry));}
  console.log('DRIFT integrated engine/render:',JSON.stringify(drift));
  const transparency=await win.webContents.executeJavaScript(`Promise.all(NV.inertiaSpriteStatus().map(s=>new Promise((resolve,reject)=>{
    const image=new Image();image.onerror=reject;image.onload=()=>{
      const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
      const c=canvas.getContext('2d');c.drawImage(image,0,0,128,128);const pixels=c.getImageData(0,0,128,128).data;
      let transparent=0,opaque=0;for(let i=3;i<pixels.length;i+=4){if(pixels[i]===0)transparent++;if(pixels[i]>220)opaque++;}
      resolve({file:s.file,corner:pixels[3],transparent,opaque});
    };image.src='assets/dimension-cores/'+s.file;
  })))`);
  for(const asset of transparency){assert.equal(asset.corner,0,asset.file+' opaque corner');assert(asset.transparent>1000&&asset.opaque>1000,asset.file+' alpha silhouette');}
  const unchanged=await win.webContents.executeJavaScript(`(()=>{
    const canvas=document.createElement('canvas');canvas.width=900;canvas.height=560;
    canvas.style='position:fixed;inset:0;z-index:99999;width:900px;height:560px';document.body.append(canvas);
    const c=canvas.getContext('2d'),bg=c.createLinearGradient(0,0,900,560);
    bg.addColorStop(0,'#080c1a');bg.addColorStop(.5,'#122c42');bg.addColorStop(1,'#0c0820');
    c.fillStyle=bg;c.fillRect(0,0,900,560);
    for(let i=0;i<100;i++){c.globalAlpha=.15+(i%5)*.1;c.fillStyle=i%2?'#8ad8ff':'#ca9bef';c.fillRect((i*137)%900,(i*73)%560,1.5,1.5);}c.globalAlpha=1;
    const views=[0,1,2].map(pattern=>({age:2,collected:pattern,target:{x:0,y:0,hp:pattern===2?180:360,maxHp:360,
      hitFlash:0,pattern,windup:pattern===1?.15:0,aimAngle:-.6}}));
    const before=JSON.stringify(views);
    for(let i=0;i<3;i++){
      const x=150+i*300;c.fillStyle='#b7c7d9';c.font='13px system-ui';c.textAlign='center';
      c.fillText(['NÚCLEO I · REPOSO','NÚCLEO II · CARGANDO','NÚCLEO III · DAÑADO'][i],x,40);
      c.save();c.translate(x,180);c.scale(2,2);NV.drawInertiaChamber(c,views[i]);c.restore();
      c.fillStyle='#b7c7d9';c.fillText('TAMAÑO EN PARTIDA',x,375);
      c.save();c.translate(x,435);NV.drawInertiaChamber(c,views[i]);c.restore();
      // Compare native scale with production enemy silhouettes, not placeholders.
      for(const [id,offset,color,shape] of [['drone',-95,'#f07bad','triangle'],['tank',95,'#8ad8ff','hex']]) {
        NV.drawEnemy(c,{enemyTypeId:id,x:x+offset,y:435,radius:id==='tank'?18:11,
          color,shape,hp:100,maxHp:100,angle:0,dead:false},120,{x,y:500},null,2);
      }
    }
    return before===JSON.stringify(views)&&c.getTransform().isIdentity;
  })()`);
  assert(unchanged,'renderer changed objective state or transform');
  const propulsion=await win.webContents.executeJavaScript(`(()=>{
    const canvas=document.createElement('canvas');canvas.width=300;canvas.height=240;
    const c=canvas.getContext('2d'),stats=[];
    for(let pattern=0;pattern<3;pattern++) {
      const view={age:0,target:{x:150,y:110,hp:360,maxHp:360,pattern,windup:0,hitFlash:0,aimAngle:0}};
      c.clearRect(0,0,300,240);NV.drawInertiaChamber(c,view);
      const first=c.getImageData(0,0,300,240).data;
      view.age=.17;c.clearRect(0,0,300,240);NV.drawInertiaChamber(c,view);
      const second=c.getImageData(0,0,300,240).data;
      let changed=0;for(let i=0;i<first.length;i+=4){if(first[i]!==second[i]||first[i+1]!==second[i+1]||first[i+2]!==second[i+2]||first[i+3]!==second[i+3])changed++;}
      const samples=[];
      for(let batch=0;batch<20;batch++) {
        const start=performance.now();
        for(let frame=0;frame<100;frame++){view.age=frame/144;c.clearRect(0,0,300,240);NV.drawInertiaChamber(c,view);}
        samples.push((performance.now()-start)/100);
      }
      samples.sort((a,b)=>a-b);
      stats.push({pattern,changed,meanMs:samples.reduce((a,b)=>a+b,0)/samples.length,p95BatchMs:samples[18]});
    }
    return stats;
  })()`);
  for(const result of propulsion)assert(result.changed>15,'static exhaust: '+JSON.stringify(result));
  console.log('THRUST local draw submission timings (not full-game FPS):',JSON.stringify(propulsion));
  await new Promise(resolve=>setTimeout(resolve,300));
  const out=path.join(root,'local/validation/inertia-obelisk');fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'obelisk.png'),(await win.webContents.capturePage()).toPNG());
  const rigMatrix=await win.webContents.executeJavaScript(`(()=>{
    const canvas=document.createElement('canvas');canvas.width=1120;canvas.height=780;
    const c=canvas.getContext('2d');c.fillStyle='#0b1727';c.fillRect(0,0,1120,780);
    const scratch=document.createElement('canvas');scratch.width=260;scratch.height=250;
    const s=scratch.getContext('2d');
    const modes=[['FLOTANDO',{}],['AVANCE →',{vx:100,vy:0}],
      ['GIRO ↓',{vx:100,vy:0,ax:0,ay:30}],['FRENADO',{vx:100,vy:0,braking:true}]];
    for(let col=0;col<4;col++) {
      c.font='16px system-ui';c.textAlign='center';c.fillStyle='#cbdbe9';c.fillText(modes[col][0],140+col*280,32);
      for(let pattern=0;pattern<3;pattern++) {
        const view={age:0,target:{x:0,y:0,hp:360,maxHp:360,pattern,windup:0,propulsion:{}}};
        NV.drawInertiaChamber(s,view);view.target.propulsion=modes[col][1];
        for(let frame=1;frame<=60;frame++){view.age=frame/60;s.clearRect(0,0,260,250);NV.drawInertiaChamber(s,view);}
        c.save();c.translate(140+col*280,135+pattern*250);c.scale(1.7,1.7);NV.drawInertiaChamber(c,view);c.restore();
      }
    }
    return canvas.toDataURL('image/png').split(',')[1];
  })()`);
  fs.writeFileSync(path.join(out,'rig-directions.png'),Buffer.from(rigMatrix,'base64'));
  await win.loadFile(path.join(root,'index.html'),{query:{fresh:'1'}});
  assert(await win.webContents.executeJavaScript('NV.inertiaSpriteStatus().every(s=>!s.ready&&!s.error)'),'normal lobby loaded experimental sprites');
  console.log('PASS inertia obelisk: animated exhaust pixels, owner sprites, real transparency, native/detail scales, immutable state, Canvas transform and normal-mode isolation');win.destroy();app.exit(0);
}).catch(error=>{console.error(error);app.exit(1);});
