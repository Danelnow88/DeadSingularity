'use strict';
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'ds-plasma-')));
app.whenReady().then(async()=>{
  const win=new BrowserWindow({width:780,height:280,useContentSize:true,show:false,
    webPreferences:{offscreen:true,sandbox:true,contextIsolation:true}});
  await win.loadFile(path.join(root,'index.html'),{query:{dimensionEvents:'preview',fresh:'1'}});
  const result=await win.webContents.executeJavaScript(`(()=>{
    const canvas=document.createElement('canvas');canvas.width=780;canvas.height=280;
    canvas.style='position:fixed;inset:0;z-index:99999;width:780px;height:280px';document.body.append(canvas);
    const c=canvas.getContext('2d');c.fillStyle='#080e1e';c.fillRect(0,0,780,280);
    for(let i=0;i<3;i++){
      const x=130+i*260;c.fillStyle='#aabbcc';c.font='13px system-ui';
      c.fillText(['Impacto','Expansión · radio 72','Disipación'][i],x-65,40);
      NV.drawPlasmaBlasts(c,[{x,y:145,life:[.9,.7,.35][i],maxRadius:72,color:'#c084fc',innerColor:'#8be9ff',style:'plasmaTrial'}]);
    }
    let saves=0,arcs=[];
    const proxy=new Proxy({save(){saves++;},restore(){saves--;}},{get(t,k){return t[k]||((...args)=>{if(k==='arc')arcs.push(args[2]);});},set(t,k,v){t[k]=v;return true;}});
    NV.drawPlasmaBlasts(proxy,[{x:0,y:0,life:.5,maxRadius:72,color:'#c084fc',style:'plasmaTrial'}]);
    return {saves,radius:Math.max(...arcs)};
  })()`);
  assert.equal(result.saves,0);assert.equal(result.radius,72);
  await new Promise(resolve=>setTimeout(resolve,300));
  const out=path.join(root,'local/validation/plasma-blast');fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'explosion.png'),(await win.webContents.capturePage()).toPNG());
  console.log('PASS plasma blast: effective radius, balanced Canvas state and three animation phases');win.destroy();app.exit(0);
}).catch(error=>{console.error(error);app.exit(1);});
