'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=path.join(root,'android/app/src/main/assets/game');
require('./check-delivery.cjs');
fs.mkdirSync(out,{recursive:true});
const manifest=JSON.parse(fs.readFileSync(path.join(root,'docs/releases/growth-1.manifest.json'),'utf8'));
const allowed=new Set(manifest.files.map(e=>e.path));
function removeStale(dir){
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const file=path.join(dir,entry.name);
  if(entry.isDirectory())removeStale(file);
  else if(!allowed.has(path.relative(out,file).replaceAll('\\','/')))fs.unlinkSync(file);
 }
}
removeStale(out);
for(const entry of manifest.files){
 const dest=path.resolve(out,entry.path);if(!dest.startsWith(out+path.sep))throw new Error('Ruta de assets invalida');
 fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,entry.path),dest);
 const bytes=fs.readFileSync(dest);if(crypto.createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw new Error('Asset Android distinto');
}
console.log('PASS assets Android identicos: '+manifest.files.length+' archivos; APK no compilado por este comando.');

