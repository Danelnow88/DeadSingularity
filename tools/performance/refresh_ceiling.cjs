'use strict';
// Independent refresh control: no game, no simulation, no renderer experiments.
if (!process.versions.electron) {
  const {spawn}=require('node:child_process');
  const env={...process.env}; delete env.ELECTRON_RUN_AS_NODE;
  const child=spawn(require('electron'),[__filename,...process.argv.slice(2)],{env,windowsHide:true,stdio:'inherit'});
  child.on('error',error=>{console.error(error);process.exitCode=1;});
  child.on('exit',code=>{process.exitCode=code==null?1:code;});
} else {
  const {app,BrowserWindow,screen,powerSaveBlocker}=require('electron');
  const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
  const root=path.resolve(__dirname,'../..');
  const compositorClock=process.argv.includes('--compositor-clock');
  const keepAwake=process.argv.includes('--keep-awake');
  if(compositorClock)app.commandLine.appendSwitch('enable-features','UseCompositorClockVSyncInterval');
  app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'ds-refresh-ceiling-')));
  app.on('window-all-closed',()=>{});
  app.whenReady().then(async()=>{
    const blocker=keepAwake?powerSaveBlocker.start('prevent-display-sleep'):null;
    const win=new BrowserWindow({title:'Control de refresco — cierre automático',width:1920,height:1080,fullscreen:true,show:true,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false}});
    await win.loadURL('data:text/html,'+encodeURIComponent('<style>html,body{margin:0;background:#07101a;overflow:hidden}canvas{display:block}</style><canvas></canvas>'));
    win.focus();
    await new Promise(resolve=>setTimeout(resolve,1200));
    const samples=[];
    for(const mode of ['empty','tiny-canvas']){
      samples.push(await win.webContents.executeJavaScript(`new Promise(resolve=>{
        const canvas=document.querySelector('canvas');canvas.width=innerWidth;canvas.height=innerHeight;
        const ctx=canvas.getContext('2d'),gaps=[];let first=null,last=null,n=0;
        requestAnimationFrame(function tick(t){
          if(first===null)first=t;if(last!==null)gaps.push(t-last);last=t;
          if(${JSON.stringify(mode)}==='tiny-canvas'){ctx.clearRect(0,0,80,40);ctx.fillStyle='#c1d5db';ctx.fillRect(n++%40,10,20,20);}
          if(t-first<5000){requestAnimationFrame(tick);return;}
          gaps.sort((a,b)=>a-b);const q=p=>gaps[Math.floor((gaps.length-1)*p)];
          resolve({mode:${JSON.stringify(mode)},fps:gaps.length*1000/(t-first),samples:gaps.length,frameMs:{p50:q(.5),p95:q(.95),p99:q(.99),max:gaps.at(-1)}});
        });
      })`,true));
    }
    const renderer=await win.webContents.executeJavaScript(`(()=>{const c=document.createElement('canvas'),gl=c.getContext('webgl');if(!gl)return null;const ext=gl.getExtension('WEBGL_debug_renderer_info');return {version:gl.getParameter(gl.VERSION),renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};})()`);
    const report={display:screen.getDisplayMatching(win.getBounds()),samples,renderer,versions:process.versions,compositorClock,keepAwake,gpu:await app.getGPUInfo('complete'),features:app.getGPUFeatureStatus(),note:'Visible rAF cadence, not physical scanout. No game loaded. Optional compositor-clock switch and display-sleep blocker apply to this isolated process only; no persistent settings.'};
    const out=path.join(root,'local/validation/gpu-layer-audit');fs.mkdirSync(out,{recursive:true});
    fs.writeFileSync(path.join(out,'refresh-ceiling'+(compositorClock?'-compositor':'')+(keepAwake?'-awake':'')+'.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify({samples,renderer,displayHz:report.display.displayFrequency}));
    if(blocker!==null)powerSaveBlocker.stop(blocker);
    win.close();app.exit(0);
  }).catch(error=>{console.error(error);app.exit(1);});
}
