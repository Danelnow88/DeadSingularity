'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const out=path.join(root,'local/logs');
fs.mkdirSync(out,{recursive:true});
const log=fs.createWriteStream(path.join(out,'lobby-cosmos-qa.log'));
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const electron=path.join(root,'node_modules/electron/dist/electron.exe');
const child=spawn(electron,[path.join(root,'tools/qa-lobby.cjs'),...process.argv.slice(2)],{
  cwd:root,env,windowsHide:true,stdio:['ignore','pipe','pipe']
});
child.stdout.on('data',data=>{process.stdout.write(data);log.write(data);});
child.stderr.on('data',data=>{process.stderr.write(data);log.write(data);});
const timer=setTimeout(()=>{
  const message='Lobby QA exceeded 90 seconds.\n';
  process.stderr.write(message);log.write(message);child.kill();
},90000);
child.once('error',error=>{
  clearTimeout(timer);console.error(error);log.end(String(error)+'\n');process.exitCode=1;
});
child.once('close',code=>{
  clearTimeout(timer);log.end();process.exitCode=code===0?0:1;
});
