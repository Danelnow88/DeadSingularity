// Sólo runtime del juego. Nunca publica perfiles, backups, Electron ni laboratorios.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
require('./check-delivery.cjs');
const root=path.resolve(__dirname,'..'),base=path.join(root,'releases');
fs.mkdirSync(base,{recursive:true});
const out=fs.mkdtempSync(path.join(base,'DeadSingularity-V1-web-'));
for(const name of ['index.html','css','js','assets','AVISOS.md'])fs.cpSync(path.join(root,name),path.join(out,name),{recursive:true});
fs.writeFileSync(path.join(out,'.nojekyll'),'');
const files=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const file=path.join(dir,entry.name);
  if(entry.isDirectory())walk(file);
  else {const data=fs.readFileSync(file);files.push({path:path.relative(out,file).replaceAll('\\','/'),size:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')});}
}}
walk(out);
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({version:require('../package.json').version,basis:'DeadSingularity alpha; revision growth-1',files},null,2));
console.log(out);
