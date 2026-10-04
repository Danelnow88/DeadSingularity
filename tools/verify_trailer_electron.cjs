// Electron aislado: prueba el HTML autónomo; no cambia el arranque del juego.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const ROOT=path.resolve(__dirname,'..');
const out=path.resolve(ROOT,'previews/trailer-metal-2026-10-03/'+(process.argv.includes('--polish')?'electron-mirror':process.argv.includes('--gold')?'electron-gold':'electron'));
fs.mkdirSync(out,{recursive:true});
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'nv-trailer-electron-')));
let window;const errors=[];
app.whenReady().then(async()=>{
  window=new BrowserWindow({show:false,width:1280,height:800,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false,offscreen:true}});
  window.webContents.setFrameRate(60);
  window.webContents.on('console-message',(_event,...args)=>{const message=typeof args[0]==='object'?args[0].message:args[1];if(/Uncaught|SyntaxError|ReferenceError/.test(message))errors.push(message);});
  const result=await require('./trailer-qa.cjs').run({out,gold:process.argv.includes('--gold'),polish:process.argv.includes('--polish'),
    evaluate:code=>window.webContents.executeJavaScript(code,true),
    capture:async name=>fs.writeFileSync(path.join(out,name+'.png'),(await window.webContents.capturePage()).toPNG()),
    navigate:async(file,width,height,instrumented)=>{
      window.setContentSize(width,height);
      if(instrumented)await window.loadURL('about:blank');else await window.loadFile(path.join(ROOT,file));
    }});
  if(errors.length)throw new Error(errors.join('\n'));
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({pass:true,cases:result.cases.length,errors},null,2));app.exit(0);
}).catch(error=>{fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({error:String(error.stack),errors},null,2));app.exit(1);});
