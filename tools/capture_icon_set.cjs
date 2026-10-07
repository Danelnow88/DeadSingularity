const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process');
const out=path.resolve(process.argv[2]||'previews/icon-set-refined-20261007');fs.mkdirSync(out,{recursive:true});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'nv-icons-'));const port=9475;let ws,id=0;const pending=new Map();
const browser=spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',['--headless=new','--no-first-run','--disable-extensions','--disable-background-networking','--user-data-dir='+profile,'--remote-debugging-port='+port,'about:blank'],{windowsHide:true,stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));function send(method,params={}){const n=++id;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(n);reject(new Error('CDP timeout '+method));},30000);pending.set(n,{resolve,reject,timer});ws.send(JSON.stringify({id:n,method,params}));});}
(async()=>{
  let targets;
  for(let i=0;i<100;i++){try{targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();break}catch{await sleep(120)}}
  if(!targets)throw new Error('Edge no inició');
  ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
  ws.addEventListener('message',({data})=>{const m=JSON.parse(data),p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result)}});
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:1100,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'file:///C:/Users/party/Desktop/JuegoDemo/previews/shop-icon-set-refined.html'});
  await sleep(900);
  const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
  fs.writeFileSync(path.join(out,'shop-icon-set-refined.png'),Buffer.from(r.data,'base64'));
  // Export equal transparent cells and a true-pixel readability strip, not resized screenshots.
  const exports=await send('Runtime.evaluate',{returnByValue:true,expression:`(()=>{
    const cells=[]; const c=document.createElement('canvas');c.width=128;c.height=128;const ctx=c.getContext('2d');
    const strip=document.createElement('canvas');strip.width=1260;strip.height=320;const s=strip.getContext('2d');
    s.fillStyle='#090d1b';s.fillRect(0,0,1260,320);s.font='12px system-ui';
    const draw=(g,id,context,x,y,size)=>{if(g.kind==='weapon')NV.drawWeaponIcon(context,id,x,y,size);else if(g.kind==='consumable')NV.drawConsumableIcon(context,id,x,y,size);else NV.drawMetaSkillIcon(context,id,x,y,size)};
    const items=groups.flatMap(g=>g.ids.map((id,i)=>({g,id,label:g.names[i]}))).filter(o=>o.g.kind!=='meta'||['hp','speed','armor','luck'].includes(o.id));
    items.forEach((o,i)=>{
      ctx.clearRect(0,0,128,128);draw(o.g,o.id,ctx,64,64,104);
      const pixels=ctx.getImageData(0,0,128,128).data;
      let visible=0;
      for(let y=0;y<128;y++)for(let x=0;x<128;x++)if(pixels[(y*128+x)*4+3]){
        visible++;
        if(x<2||y<2||x>125||y>125)throw new Error('Clipped icon: '+o.id);
      }
      if(visible<100)throw new Error('Empty icon: '+o.id);
      cells.push({name:o.g.kind+'-'+o.id,png:c.toDataURL('image/png')});
      [16,24,32,48].forEach((size,row)=>{draw(o.g,o.id,s,38+i*58,35+row*70,size);if(i===0){s.fillStyle='#9fb1cb';s.fillText(size+' px',8,63+row*70)}});
    });
    return {cells,strip:strip.toDataURL('image/png')};
  })()`});
  if(exports.exceptionDetails)throw new Error('Icon export failed: '+JSON.stringify(exports.exceptionDetails));
  const {cells,strip}=exports.result.value;
  const cellsOut=path.join(out,'icons');fs.mkdirSync(cellsOut,{recursive:true});
  for(const cell of cells)fs.writeFileSync(path.join(cellsOut,cell.name+'.png'),Buffer.from(cell.png.split(',')[1],'base64'));
  fs.writeFileSync(path.join(out,'icon-readability.png'),Buffer.from(strip.split(',')[1],'base64'));
  console.log('PASS icon set capture + '+cells.length+' transparent cells + 16/24/32/48px readability');
})().catch(e=>{console.error(e.stack);process.exitCode=1}).finally(async()=>{if(ws&&ws.readyState===1){try{await send('Browser.close')}catch{}ws.close()}browser.kill()});
