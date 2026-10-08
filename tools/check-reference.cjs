const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..','reference','prototype');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
for(const entry of manifest.files){
  const file=path.resolve(root,entry.path);
  if(!file.startsWith(root+path.sep))throw new Error('Ruta inválida en el manifiesto');
  const content=fs.readFileSync(file);
  if(content.length!==entry.size||crypto.createHash('sha256').update(content).digest('hex')!==entry.sha256)throw new Error('Referencia modificada: '+entry.path);
}
console.log('PASS: '+manifest.files.length+' archivos de referencia idénticos a la build congelada.');
