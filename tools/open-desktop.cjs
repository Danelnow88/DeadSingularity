const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const exe=[path.join(root,'local','runtime','windows','electron.exe'),path.join(root,'node_modules','electron','dist','electron.exe')].find(file=>fs.existsSync(file));
if(!exe){console.error('Falta el runtime Electron. Ejecutá npm install.');process.exitCode=1;}
else {
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const child=spawn(exe,[root,...process.argv.slice(2)],{cwd:root,env,windowsHide:true,detached:true,stdio:'ignore'});
  child.on('error',error=>{console.error(error.message);process.exitCode=1;});child.unref();
}
