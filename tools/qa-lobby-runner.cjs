'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const out=path.join(root,'local/logs');
fs.mkdirSync(out,{recursive:true});
const mobile=process.argv.includes('--mobile-hud');
const args=process.argv.slice(2).filter(arg=>arg!=='--mobile-hud');
const log=fs.createWriteStream(path.join(out,mobile?'mobile-ergonomics-qa.log':'lobby-cosmos-qa.log'));
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const electron=path.join(root,'node_modules/electron/dist/electron.exe');
function run(extra){
  return new Promise((resolve,reject)=>{
    const child=spawn(electron,[path.join(root,mobile?'tools/qa-mobile.cjs':'tools/qa-lobby.cjs'),...args,...extra],{
      cwd:root,env,windowsHide:true,stdio:['ignore','pipe','pipe']
    });
    child.stdout.on('data',data=>{process.stdout.write(data);log.write(data);});
    child.stderr.on('data',data=>{process.stderr.write(data);log.write(data);});
    const timer=setTimeout(()=>{const message='Presentation QA exceeded 90 seconds.\n';process.stderr.write(message);log.write(message);child.kill();},90000);
    child.once('error',error=>{clearTimeout(timer);reject(error);});
    child.once('close',code=>{clearTimeout(timer);code===0?resolve():reject(new Error('Presentation QA exit '+code));});
  });
}
(async()=>{
  await run([]);
  // A fresh profile/process avoids carrying landscape compositor state into
  // the taller portrait viewport in hidden Windows/RDP sessions.
  if(mobile&&!args.some(arg=>['--quick','--baseline','--portrait-only'].includes(arg)))await run(['--portrait-only']);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>log.end());
