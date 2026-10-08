// Sirve SOLAMENTE una build limpia bajo subruta, para QA de GitHub Pages.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const releases=path.resolve(__dirname,'..','releases');
const root=path.resolve(releases,process.argv[2]||'');
if(path.dirname(root)!==releases||!path.basename(root).startsWith('DeadSingularity-V1-web-'))throw new Error('Indicá el nombre de una build web de releases/');
const prefix='/DeadSingularity/';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'};
http.createServer((req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
  let url;try{url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
  if(!url.startsWith(prefix)){res.writeHead(404).end();return;}
  const relative=url.slice(prefix.length)||'index.html',file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.stat(file,(err,stat)=>{
    if(err||!stat.isFile()){res.writeHead(404).end();return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
    if(req.method==='HEAD'){res.end();return;}
    const stream=fs.createReadStream(file);stream.on('error',()=>res.destroy());stream.pipe(res);
  });
}).on('error',error=>{console.error(error.message);process.exitCode=1;}).listen(8093,'127.0.0.1',()=>console.log('QA Pages: http://127.0.0.1:8093'+prefix+' -> '+root));

