// Comparación reproducible del HTML real. Instrumentación sólo en el navegador QA.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
function instrument(html) {
  const clock = `<script>
    window.__clock=0;window.__queue=[];window.__ends=0;window.__skips=0;
    window.__realNow=performance.now.bind(performance);
    performance.now=()=>__clock;
    requestAnimationFrame=fn=>(__queue.push(fn),__queue.length);
    let seed=1337;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    addEventListener('trailer:end',()=>__ends++);addEventListener('trailer:skip',()=>__skips++);
    window.__advance=ms=>{while(__clock<ms){__clock=Math.min(ms,__clock+1000/60);const q=__queue;__queue=[];q.forEach(fn=>fn(__clock));}};
  </script>`;
  const hook = `
    const qaSlab=slab;let qaCalls=[];
    slab=function(tt,o){
      const k=o.sF*o.m;
      const matrix=ctx.getTransform().translate(vpX,vpY).scale(k).translate(-vpX,-vpY).translate(o.px,o.py).rotate(o.rot*180/Math.PI).scale(o.sx,o.sy);
      const x=-(tt.bx+tt.tw/2),y=-tt.by;
      const points=[[x,y],[x+tt.w,y],[x,y+tt.h],[x+tt.w,y+tt.h]].map(p=>new DOMPoint(...p).matrixTransform(matrix));
      qaCalls.push({title:tt===titles.J?'lower':'upper',bounds:{left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))},...o});return qaSlab(tt,o);
    };
    const qaDraw=draw;draw=function(){qaCalls=[];qaDraw();};
    window.__trailerSnapshot=()=>({time:t,started,muted,volume:master&&master.gain.value,
      viewport:[W,H,dpr],vp:[vpX,vpY],camera:[zoom,roll,shx,shy],slabs:qaCalls,
      titles:Object.fromEntries(Object.entries(titles).map(([k,v])=>[k,{w:v.w,h:v.h,tw:v.tw,asc:v.asc,sides:v.solidSides.length}])),
      particles:{sparks:sparks.length,shards:shards.length,dust:dust.length},events:events.map(e=>({t:e.t,done:e.done})),
      ends:__ends,skips:__skips});
    window.__trailerReflectionProbe=()=>Object.fromEntries(Object.entries(titles).map(([id,tt])=>{
      const canvas=document.createElement('canvas');canvas.width=64;canvas.height=32;const g=canvas.getContext('2d');
      const digest=source=>{g.clearRect(0,0,64,32);g.drawImage(source,0,0,64,32);const pixels=g.getImageData(0,0,64,32).data;let hash=0,opaque=0;for(let i=0;i<pixels.length;i++){hash=(Math.imul(hash,31)+pixels[i])|0;if(i%4===3&&pixels[i]>200)opaque++;}return {hash,opaque};};
      return [id,{front:digest(tt.tmp),side:digest(tt.solidSides[5])}];
    }));
  `;
  assert(html.includes('resize();\nrequestAnimationFrame(frame);') || html.includes('resize();\r\nrequestAnimationFrame(frame);'));
  return html.replace('<script>', clock+'\n<script>').replace(/resize\(\);\r?\nrequestAnimationFrame\(frame\);/, hook+'\nresize();\nrequestAnimationFrame(frame);');
}
async function run({evaluate,capture,navigate,out,baselineOnly=false,gold=false,polish=false}) {
  const result={cases:[],controls:[],errors:[]};
  const phases=[3.8,4.2,5.22,6.4,13.4,14.3];
  for(const [width,height] of [[1912,844],[1280,800],[915,412],[844,390]]) {
    for(const variant of baselineOnly?['original']:['original','metal']) {
      const file=variant==='original'?'previews/trailer-metal-2026-10-03/'+(polish?'before-mirror.html':gold?'before-gold.html':'original.html'):'dev/TRAILER CINEMATIC.HTML';
      const html=fs.readFileSync(path.join(ROOT,file),'utf8');
      await navigate(file,width,height,true);
      await evaluate(`document.open();document.write(${JSON.stringify(instrument(html))});document.close();`);
      await evaluate('document.getElementById("overlay").click();__advance(250);');
      let comparisons=[];
      for(const time of phases) {
        const measured=await evaluate(`(()=>{const start=__realNow();__advance(${250+time*1000});return {snapshot:__trailerSnapshot(),cost:__realNow()-start};})()`);
        const snapshot=measured.snapshot;
        assert(snapshot.started);assert.equal(snapshot.slabs.length,time<4.35?1:2);
        assert(Object.values(snapshot.titles).every(title=>title.sides===10&&title.tw>0));
        comparisons.push({time,snapshot,cost:measured.cost,...(polish?{reflection:await evaluate('__trailerReflectionProbe()')}:{})});
        if(width===1912 || time===13.4)await capture(`${variant}-${width}-${time.toFixed(2)}`);
      }
      assert.equal(comparisons.at(-1).snapshot.ends,1);
      await evaluate('__advance(16000)');assert.equal(await evaluate('__ends'),1);
      if(variant==='original')result.cases.push({width,height,original:comparisons});
      else {
        const entry=result.cases.at(-1);entry.metal=comparisons;
        for(let i=0;i<comparisons.length;i++) {
          const before=entry.original[i].snapshot,after=comparisons[i].snapshot;
          const structural=value=>JSON.parse(JSON.stringify(value,(key,v)=>(gold?['glowColor','bounds','py']:['glowColor','bounds']).includes(key)?undefined:v));
          assert.deepEqual(structural(after.slabs),structural(before.slabs),'caída, escala, profundidad y apilado');
          assert.deepEqual(after.camera,before.camera,'cámara');assert.deepEqual(after.vp,before.vp,'punto de fuga');
          if(!gold)assert.deepEqual(after.titles,before.titles,'dimensiones y siluetas');
          if((gold||polish)&&comparisons[i].time>=6.4)for(const slab of after.slabs) {
            assert(slab.bounds.left>=width*.06&&slab.bounds.right<=width*.94,'margen horizontal del título: '+JSON.stringify(slab.bounds));
            assert(slab.bounds.top>=height*.07&&slab.bounds.bottom<=height*.93,'título dentro del encuadre');
          }
          assert.deepEqual(after.events,before.events,'timeline de impactos');
        }
        if(polish) {
          for(const id of ['J','D']) {
            const a=comparisons.at(-2).reflection[id],b=comparisons.at(-1).reflection[id];
            assert.notEqual(a.front.hash,b.front.hash,'reflejo frontal responde a cámara');
            assert.notEqual(a.side.hash,b.side.hash,'reflejo del volumen responde a cámara');
            assert(Math.abs(a.side.opaque-b.side.opaque)<4,'el tintado no erosiona la máscara');
          }
        }
        await evaluate(`dispatchEvent(new KeyboardEvent('keydown',{key:'m'}));`);
        assert.equal(await evaluate('__trailerSnapshot().volume'),0);
        await evaluate(`dispatchEvent(new KeyboardEvent('keydown',{key:'m'}));`);
        assert.equal(await evaluate('__trailerSnapshot().muted'),false);
        await evaluate(`dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));`);assert.equal(await evaluate('__skips'),1);
        await evaluate(`document.getElementById('c').click();__advance(__clock+1000);`);
        assert(await evaluate('__trailerSnapshot().time<1'));
        result.controls.push({width,mute:true,unmute:true,skip:true,replay:true,endOnce:true});
      }
    }
  }
  if(!baselineOnly) {
    result.realtime=[];
    for(const variant of ['original','metal']) {
      const file=variant==='original'?'previews/trailer-metal-2026-10-03/'+(polish?'before-mirror.html':gold?'before-gold.html':'original.html'):'dev/TRAILER CINEMATIC.HTML';
      await navigate(file,1280,800,false);
      assert(await evaluate('!!document.getElementById("c") && !!document.getElementById("overlay")'));
      await evaluate(`window.__frameCosts=[];const raf=requestAnimationFrame;
        requestAnimationFrame=callback=>raf(stamp=>{const begin=performance.now();callback(stamp);__frameCosts.push(performance.now()-begin);});
        document.getElementById('overlay').click();`);
      await new Promise(resolve=>setTimeout(resolve,6800));
      const costs=await evaluate(`(()=>{const a=__frameCosts.slice(30).sort((a,b)=>a-b);return {frames:a.length,median:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],overlayHidden:document.getElementById('overlay').classList.contains('hide')};})()`);
      assert(costs.frames>20&&costs.overlayHidden,'reproducción real avanza');
      result.realtime.push({variant,...costs});
      if(variant==='metal') {
        await evaluate(`document.documentElement.requestFullscreen().catch(error=>{window.__fullscreenError=String(error);});`);
        await new Promise(resolve=>setTimeout(resolve,200));
        result.fullscreen=await evaluate('!!document.fullscreenElement');
        await evaluate('if(document.fullscreenElement)document.exitFullscreen();');
        await capture('realtime-metal-1280');
      }
    }
    const before=result.realtime[0],after=result.realtime[1];
    result.performance={medianRatio:after.median/before.median,p95Ratio:after.p95/before.p95};
    // No extrapolar a dispositivo físico: evidencia del coste en este navegador.
    assert(after.median<Math.max(33,before.median*1.5),'regresión de coste visible');
  }
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(result,null,2));
  return result;
}
module.exports={run};
