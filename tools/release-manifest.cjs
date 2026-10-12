'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),files=[];
function walk(relative){
 const absolute=path.join(root,relative),stat=fs.statSync(absolute);
 if(stat.isDirectory())for(const name of fs.readdirSync(absolute).sort())walk(path.join(relative,name));
 else{const bytes=fs.readFileSync(absolute);files.push({path:relative.replaceAll('\\','/'),size:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}
}
for(const name of ['index.html','AVISOS.md','js','css','assets'])walk(name);
fs.mkdirSync(path.join(root,'docs/releases'),{recursive:true});
fs.writeFileSync(path.join(root,'docs/releases/growth-1.manifest.json'),JSON.stringify({
 id:'deadsingularity-dimensional-baseline-20261012',version:require('../package.json').version,basis:'Approved dimensional baseline promoted to normal and trial; reference/prototype frozen; trial persistence and lobby skin remain isolated',files
},null,2)+'\n');
console.log('Manifiesto de nueva revision: '+files.length+' archivos');

