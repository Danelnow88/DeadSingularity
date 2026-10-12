'use strict';
// Metadata-only scan. Never prints a credential or its matching source line.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const result=spawnSync('git',['diff','--cached','--name-only','--diff-filter=ACMR','-z'],{cwd:root,encoding:'utf8'});
if(result.status!==0)throw new Error('Cannot inspect staged files');
const files=result.stdout.split('\0').filter(Boolean),failures=[];
const excluded=/^(?:node_modules|local|releases)\/|\.lnk$|(?:^|\/)\.env(?:\.|$)|\.(?:pfx|p12|key)$/i;
const tokens=[/gh[pousr]_[A-Za-z0-9]{30,}/,/github_pat_[A-Za-z0-9_]{50,}/,/\bAKIA[A-Z0-9]{16}\b/,/\bsk-(?:proj-)?[A-Za-z0-9_-]{40,}/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];
for(const file of files){
 if(excluded.test(file)&&!file.endsWith('.env.example'))failures.push(file+': excluded artifact staged');
 const absolute=path.resolve(root,file);if(!absolute.startsWith(root+path.sep))throw Error('Invalid staged path');
 const bytes=fs.readFileSync(absolute);if(bytes.length>20*1048576)failures.push(file+': over 20 MiB');
 if(/\.(?:js|cjs|json|html|css|md|txt|yml|yaml|xml|gradle|cmd|properties)$/i.test(file)&&tokens.some(r=>r.test(bytes.toString('utf8'))))failures.push(file+': possible credential signature; inspect privately');
}
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log('PASS staged hygiene: '+files.length+' files; no excluded artifacts or known credential signatures. Not a complete secret audit.');
