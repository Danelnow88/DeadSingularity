'use strict';
const {spawn}=require('node:child_process'),path=require('node:path');
const fs=require('node:fs');
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const started=Date.now(),args=process.argv.slice(2);
const label=(args.find(a=>a.startsWith('--label='))||'--label=sample').slice(8).replace(/[^a-z0-9_-]/gi,'');
const report=path.resolve(__dirname,'../../local/validation/overlap-performance',label+'.json');
const child=spawn(require('electron'),['tools/performance/electron_overlap.cjs',...args],{
  cwd:path.resolve(__dirname,'../..'),env,windowsHide:true,stdio:'inherit'
});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{
  const complete=fs.existsSync(report)&&fs.statSync(report).mtimeMs>=started;
  if(!complete)console.error('La medición terminó sin un informe nuevo. No cuenta como validación.');
  process.exitCode=code==null||!complete?1:code;
});
