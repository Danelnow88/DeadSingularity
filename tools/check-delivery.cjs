'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
require('./check-reference.cjs'); // Historical authenticity remains independently checked.
const manifest=JSON.parse(fs.readFileSync(path.join(root,'docs/releases/growth-1.manifest.json'),'utf8'));
const expected=new Set();
let bytes=0;
for(const entry of manifest.files){
 const file=path.resolve(root,entry.path);
 assert(file.startsWith(root+path.sep)&&/^(?:index\.html|AVISOS\.md|(?:js|css|assets)\/)/.test(entry.path),'Manifest path');
 assert(!expected.has(entry.path),'Duplicate manifest entry');expected.add(entry.path);
 const content=fs.readFileSync(file);assert.equal(content.length,entry.size,entry.path+' size');
 assert.equal(crypto.createHash('sha256').update(content).digest('hex'),entry.sha256,entry.path+' hash');bytes+=content.length;
}
function walk(relative){for(const item of fs.readdirSync(path.join(root,relative),{withFileTypes:true})){
 const file=relative+'/'+item.name;if(item.isDirectory())walk(file);else assert(expected.has(file),'Recurso fuera del manifiesto: '+file);
}}
for(const name of ['js','css','assets'])walk(name);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const match of html.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)="([^"]+)"/g)){
 const url=match[1].split('?')[0];
 assert(!/^(?:https?:|\/\/|\/)/.test(url),'Dependencia externa/absoluta: '+url);
 assert(fs.existsSync(path.join(root,url)),'Recurso faltante: '+url);
}
assert(!html.includes('reference/'),'La entrada principal no carga la referencia');
assert(!/neon[ _-]?void/i.test(html),'Marca anterior en producto');
console.log('PASS entrega '+manifest.id+': '+expected.size+' recursos verificados, '+(bytes/1048576).toFixed(2)+' MiB.');

