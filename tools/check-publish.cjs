'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const result=cp.spawnSync('git',['-c','safe.directory='+root,'ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8'});
if(result.status!==0)throw Error(result.stderr||'Cannot inspect publication candidates');
const files=[...new Set(result.stdout.split('\0').filter(Boolean))],findings=[],ignored=[];
const patterns=[['private-key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],['github-token',/\b(?:ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,})\b/],['api-key',/\bsk-(?:proj-)?[A-Za-z0-9_-]{36,}\b/]];
assert(!files.includes('PRUEBA DE CONCEPTO DE JEFES.html'),'Private boss mockup must never be published');
for(const file of files){
 const full=path.join(root,file);if(!fs.existsSync(full)||!fs.statSync(full).isFile()||fs.statSync(full).size>8e6||!/[.](?:js|cjs|json|md|html|yml|yaml|txt|cmd|ps1)$/.test(file))continue;
 const text=fs.readFileSync(full,'utf8');
 // Never print a matching value, only its location and category.
 for(const [rule,regex]of patterns)if(regex.test(text))findings.push({file,rule});
 if(file.startsWith('tests/'))for(const match of text.matchAll(/(?:readFileSync|existsSync)\(\s*['"]([^'"]+)['"]/g)){
  const dependency=match[1];if(!dependency.includes('/')||dependency.includes('://')||dependency.startsWith('local/')||!fs.existsSync(path.join(root,dependency)))continue;
  if(cp.spawnSync('git',['check-ignore','-q','--',dependency],{cwd:root}).status===0)ignored.push({test:file,dependency});
 }
}
if(findings.length||ignored.length){console.error(JSON.stringify({secretCandidates:findings,ignoredTestDependencies:ignored},null,2));process.exit(1);}
console.log('PASS publication candidates: '+files.length+' paths, private mockup absent, no detected key patterns or ignored test fixtures. Not a complete security audit.');
