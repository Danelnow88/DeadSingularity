const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn}=require('node:child_process');
const base=process.argv[2]||'http://localhost:8127';
const out=path.resolve(process.argv[3]||'previews/trailer-metal-2026-10-03/edge');
fs.mkdirSync(out,{recursive:true});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'nv-trailer-qa-'));
const port=9456,errors=[];let ws,id=0;const pending=new Map();
const browser=spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',[
  '--headless=new','--no-first-run','--disable-extensions','--disable-background-networking',
  '--autoplay-policy=no-user-gesture-required','--user-data-dir='+profile,'--remote-debugging-port='+port,'about:blank'
],{windowsHide:true,stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function send(method,params={}){const current=++id;return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{pending.delete(current);reject(new Error('CDP timeout '+method));},30000);
  pending.set(current,{resolve,reject,timer});ws.send(JSON.stringify({id:current,method,params}));});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});
  if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}
(async()=>{
  let targets;for(let i=0;i<100;i++){try{targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();break;}catch{await sleep(150);}}
  if(!targets)throw new Error('Edge no inició');
  ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
  ws.addEventListener('message',({data})=>{const m=JSON.parse(data);if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}
    if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
  await send('Runtime.enable');await send('Page.enable');
  const result=await require('./trailer-qa.cjs').run({evaluate,out,baselineOnly:process.argv.includes('--baseline'),gold:process.argv.includes('--gold'),polish:process.argv.includes('--polish'),
    capture:async name=>{const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(shot.data,'base64'));},
    navigate:async(file,width,height,instrumented)=>{
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
      await send('Page.navigate',{url:instrumented?'about:blank':base+'/'+file.split('/').map(encodeURIComponent).join('/')});
      for(let i=0;i<100;i++){await sleep(50);if(await evaluate(instrumented?'location.href==="about:blank"':'!!document.getElementById("overlay") && !!document.getElementById("c")'))break;}
    }});
  if(errors.length)throw new Error(errors.join('\n'));
  console.log('PASS trailer: '+result.cases.length+' tamaños; geometría/timeline/cámara y controles; sin excepciones');
})().catch(error=>{fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({error:String(error.stack),errors},null,2));console.error(error.stack);process.exitCode=1;})
.finally(async()=>{if(ws&&ws.readyState===1){try{await send('Browser.close');}catch{}ws.close();}browser.kill();});
