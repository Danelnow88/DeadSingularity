// Lectura de manifiestos + QA: comprueba fuentes, paquetes y audio Web/Electron.
// No altera builds ni guardados. Uso: node tools/verify_audio_build.cjs WEB WINDOWS WEB_QA ELECTRON_QA
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const [web,desktop,webQA,desktopQA]=process.argv.slice(2).map(p=>path.resolve(p));
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const w=read(path.join(web,'manifest.json')),d=read(path.join(desktop,'manifest.json'));
const runtime=p=>p==='index.html'||/^(js|css|assets)\//.test(p);
const wf=w.files.filter(f=>runtime(f.path)),df=d.files.filter(f=>f.path.startsWith('resources/app/')).map(f=>({...f,path:f.path.slice(14)})).filter(f=>runtime(f.path));
assert.deepEqual(wf.map(f=>f.path).sort(),df.map(f=>f.path).sort(),'mismo conjunto de archivos runtime');
for(const f of wf){
  const other=df.find(x=>x.path===f.path);
  assert.equal(other.sha256,f.sha256,'manifiestos distintos: '+f.path);
  assert.equal(hash(path.join(web,f.path)),f.sha256,'web no coincide con su manifiesto: '+f.path);
  assert.equal(hash(path.join(desktop,'resources/app',f.path)),f.sha256,'Electron stale: '+f.path);
  // HTML empaquetado quita el experimento 3D: compararlo entre paquetes, no con fuente.
  if(f.path!=='index.html')assert.equal(hash(path.join(root,f.path)),f.sha256,'fuente cambió desde la build: '+f.path);
}
const wq=read(webQA),dq=read(desktopQA);
assert(wq.pass&&dq.pass);assert.equal(wq.errors.length,0);assert.equal(dq.errors.length,0);
const wa=wq.data.results,da=dq.audio.results;
assert.equal(wa.length,11);assert.equal(da.length,11);
let maximumDelta=0;
for(const a of wa){
  const b=da.find(x=>x.kind===a.kind);assert(b,'falta escenario '+a.kind);
  for(const metric of ['peak','rms']){const delta=Math.abs(a[metric]-b[metric]);maximumDelta=Math.max(maximumDelta,delta);assert(delta<.00001,a.kind+' '+metric+' difiere entre entornos');}
}
console.log(JSON.stringify({pass:true,runtimeFiles:wf.length,scenarios:wa.length,maximumDelta,web,desktop},null,2));
