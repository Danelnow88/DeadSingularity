'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const files=[...html.matchAll(/<script[^>]*src="(js\/[^"?]+)(?:\?[^"]*)?"/g)].map(m=>m[1]);
const modules=files.map((file,index)=>{const body=fs.readFileSync(path.join(root,file),'utf8');
 return {order:index,file,bytes:Buffer.byteLength(body),exports:[...new Set([...body.matchAll(/NV\.([a-zA-Z0-9_]+)\s*=/g)].map(m=>m[1]))],
 reads:[...new Set([...body.matchAll(/NV\.([a-zA-Z0-9_]+)/g)].map(m=>m[1]))]};});
const report={version:1,generatedAt:new Date().toISOString(),entry:'index.html',modules,
 note:'Orden real IIFE. Las lecturas pueden ocurrir mas tarde en callbacks; no implican una dependencia de inicializacion.',
 optional:['js/ui/contentPanel.js','js/render/webgpuPresentation.js']};
fs.mkdirSync(path.join(root,'docs'),{recursive:true});
fs.writeFileSync(path.join(root,'docs/MODULE_INVENTORY.json'),JSON.stringify(report,null,2)+'\n');
console.log('Inventario: '+modules.length+' modulos; '+modules.reduce((n,m)=>n+m.bytes,0)+' bytes');

