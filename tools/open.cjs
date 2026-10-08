const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const root = path.resolve(__dirname,'..');
function health(){return new Promise(resolve=>{
  const request=http.get('http://127.0.0.1:8091/__ds_v1_health__',{timeout:700},response=>{
    let body='';response.setEncoding('utf8');response.on('data',chunk=>body+=chunk);response.on('end',()=>{
      try {const data=JSON.parse(body);resolve(data.project==='dead-singularity-v1'&&data.root===root?'ready':'occupied');} catch {resolve('occupied');}
    });
  });request.on('timeout',()=>request.destroy());request.on('error',()=>resolve('absent'));
});}
(async()=>{
  let status=await health();
  if(status==='occupied')throw new Error('El puerto 8091 está ocupado por otro proyecto. Cerrá ese servidor antes de abrir V1.');
  if(status!=='ready'){
    const dir=path.join(root,'local','logs');fs.mkdirSync(dir,{recursive:true});
    const log=fs.openSync(path.join(dir,'server.log'),'a');
    const child=spawn(process.execPath,[path.join(root,'tools','serve.cjs')],{cwd:root,windowsHide:true,detached:true,stdio:['ignore',log,log]});child.unref();fs.closeSync(log);
    for(let i=0;i<30;i++){await new Promise(resolve=>setTimeout(resolve,200));status=await health();if(status!=='absent')break;}
    if(status!=='ready')throw new Error('El servidor no arrancó. Revisá local/logs/server.log.');
  }
  const url='http://127.0.0.1:8091/index.html';
  const child=spawn('cmd.exe',['/d','/c','start','',url],{windowsHide:true,stdio:'ignore'});child.on('error',error=>console.error(error.message));
  console.log(url);
})().catch(error=>{console.error(error.message);process.exitCode=1;});
