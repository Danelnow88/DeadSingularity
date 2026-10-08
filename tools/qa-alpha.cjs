'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'local/logs');fs.mkdirSync(out,{recursive:true});
const electron=path.join(root,'node_modules/electron/dist/electron.exe');
const featureFlag=process.argv.includes('--features-only')?['--features-only']:[];
const seconds=process.argv.find(x=>x.startsWith('--soak-seconds='))||'--soak-seconds=20';
function run(command,args,label){
 return new Promise((resolve,reject)=>{
  const log=fs.createWriteStream(path.join(out,label+'.log'));
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const child=spawn(command,args,{cwd:root,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
  child.stdout.pipe(log);child.stderr.pipe(log);
  child.once('error',reject);child.once('close',code=>{log.end();code===0?resolve():reject(new Error(label+' exit '+code));});
 });
}
(async()=>{
 if(process.argv.includes('--reference')){await run(electron,['tools/qa-reference.cjs',seconds],'growth-reference');return;}
 const builds=fs.readdirSync(path.join(root,'releases')).filter(x=>x.startsWith('DeadSingularity-V1-web-')).sort((a,b)=>fs.statSync(path.join(root,'releases',b)).mtimeMs-fs.statSync(path.join(root,'releases',a)).mtimeMs);
 if(!builds[0])throw new Error('Falta build web');
 const server=spawn(process.execPath,['tools/serve-pages-fixture.cjs',builds[0]],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});
 const log=fs.createWriteStream(path.join(out,'growth-fixture.log'));server.stdout.pipe(log);server.stderr.pipe(log);
 let serverFailure=null;server.on('error',error=>serverFailure=error);server.on('exit',code=>{if(code!==null)serverFailure=new Error('Fixture exit '+code);});
 try{
  for(let n=0;n<40;n++){if(serverFailure)throw serverFailure;try{const r=await fetch('http://127.0.0.1:8093/DeadSingularity/');if(r.ok)break;}catch(_){}
   await new Promise(resolve=>setTimeout(resolve,250));if(n===39)throw new Error('Fixture no inicia');
  }
  await run(electron,['.','--delivery-check','--soak-check',seconds,...featureFlag],'growth-desktop');
  await run(electron,['.','--delivery-web-check','--soak-check',seconds,...featureFlag],'growth-web');
  console.log('PASS QA real desktop/web; evidencia en local/validation y local/logs');
 }finally{server.kill();log.end();}
})().catch(error=>{console.error(error);process.exitCode=1;});

