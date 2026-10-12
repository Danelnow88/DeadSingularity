// Adaptador CDP: ejecuta los mismos contratos de tienda en Edge real.
const {spawn}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),Module=require('node:module');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const port=19459,profile=fs.mkdtempSync(path.join(os.tmpdir(),'ds-shop-edge-'));
const edge=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port='+port,'--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
let socket,seq=0;const pending=new Map(),listeners=[];
async function ready(){
 let target;
 for(let i=0;i<50;i++){try{target=(await(await fetch('http://127.0.0.1:'+port+'/json')).json()).find(t=>t.type==='page');if(target)break;}catch{}await delay(200);}
 if(!target)throw Error('Edge CDP no inicia');
 socket=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown'){for(const l of listeners)l({level:'error',message:JSON.stringify(m.params.exceptionDetails)});}};
 await send('Page.enable');await send('Runtime.enable');
}
function send(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});}
class Window{
 constructor(options){listeners.length=0;this.width=options.width;this.height=options.height;this.webContents={on:(_name,l)=>listeners.push(l),executeJavaScript:async code=>{const r=await send('Runtime.evaluate',{expression:code,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;},capturePage:async()=>{await delay(80);const r=await send('Page.captureScreenshot',{format:'png',fromSurface:true});return {toPNG:()=>Buffer.from(r.data,'base64')};}};}
 async loadURL(url){await send('Emulation.setDeviceMetricsOverride',{width:this.width,height:this.height,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url});await delay(1000);}
 destroy(){listeners.length=0;}
}
const original=Module._load;
Module._load=function(name,...args){if(name==='electron')return {app:{on(){},setPath(){},commandLine:{appendSwitch(){}},whenReady:ready,exit(code){if(socket)socket.close();edge.kill();process.exit(code);}},BrowserWindow:Window,protocol:{registerSchemesAsPrivileged(){}}};return original.call(this,name,...args);};
require(process.argv.includes('--threat-redesign')?'./qa-threat-redesign.cjs':'./qa-shop-layout.cjs');
