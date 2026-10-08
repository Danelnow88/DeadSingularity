const path=require('node:path');
const CSP="default-src 'self' data: blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' data: blob:; object-src 'none'; base-uri 'none'; frame-src 'none'";
function gameFile(root,pathname){
  if(!pathname.startsWith('/')||pathname.includes('\\')||pathname.includes('\0'))return null;
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  const relative=path.relative(root,file).replaceAll('\\','/');
  if(relative.startsWith('..')||path.isAbsolute(relative))return null;
  if(!['index.html','AVISOS.md'].includes(relative)&&!/^(?:assets|css|js)\//.test(relative))return null;
  return file;
}
module.exports={gameFile,CSP};
