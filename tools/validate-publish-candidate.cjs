'use strict';
// Validate exactly the index, not the working tree with its private fixtures.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),base=path.join(root,'local/validation');
fs.mkdirSync(base,{recursive:true});
const out=fs.mkdtempSync(path.join(base,'publish-candidate-'));
cp.execFileSync('git',['checkout-index','--all','--prefix='+out.replaceAll('\\','/')+'/'],{cwd:root});
if(fs.existsSync(path.join(out,'PRUEBA DE CONCEPTO DE JEFES.html')))throw Error('Private mockup entered the index');
cp.execFileSync('git',['init'],{cwd:out,stdio:'ignore'});
cp.execFileSync('git',['-c','core.autocrlf=false','add','-A'],{cwd:out,stdio:'ignore'});
fs.writeFileSync(path.join(base,'publish-candidate-path.txt'),out);
console.log('CLEAN_CANDIDATE '+out);
const q=cp.spawnSync(process.platform==='win32'?'npm.cmd':'npm',['run','quality'],{cwd:out,shell:process.platform==='win32',encoding:'utf8',maxBuffer:16000000});
fs.writeFileSync(path.join(out,'quality-report.log'),(q.stdout||'')+(q.stderr||''));
console.log((q.stdout||'').split('\n').filter(line=>/PASS sintaxis|PASS catalogo|PASS entrega|PASS higiene|RESULT run_all|FAILED/.test(line)).join('\n'));
if(q.status){console.error((q.stderr||'').slice(-8000));process.exit(q.status||1);}
const web=cp.spawnSync(process.execPath,['tools/build-web.cjs'],{cwd:out,encoding:'utf8'});
console.log(web.stdout);if(web.status){console.error(web.stderr);process.exit(web.status||1);}
const build=fs.readdirSync(path.join(out,'releases')).find(f=>f.startsWith('DeadSingularity-V1-web-'));
const payload=fs.readdirSync(path.join(out,'releases',build));
if(payload.some(f=>!['index.html','css','js','assets','AVISOS.md','.nojekyll','manifest.json'].includes(f)))throw Error('Unexpected web payload');
console.log('PASS clean candidate quality and web build; private mockup and local archives absent');
