'use strict';
// Cache keys follow actual resource bytes, including under /DeadSingularity/.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),file=path.join(root,'index.html'),before=fs.readFileSync(file,'utf8');let count=0;
const after=before.replace(/\b(src|href)="((?:js|css|assets)\/[^"?#]+)(?:\?[^"#]*)?"/g,(all,attribute,relative)=>{
 const data=fs.readFileSync(path.join(root,relative)),version=crypto.createHash('sha256').update(data).digest('hex').slice(0,12);count++;
 return attribute+'="'+relative+'?nv='+version+'"';
});
if(!count)throw Error('No production resources found');
if(process.argv.includes('--check')){if(before!==after)throw Error('Stale web cache keys: run node tools/version-web-entry.cjs');}
else if(before!==after)fs.writeFileSync(file,after);
console.log('PASS content-versioned web entry: '+count+' resources');
