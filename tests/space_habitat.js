'use strict';
// Portable presentation contracts: Canvas mocks only, no GPU or pixel readbacks.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const source=fs.readFileSync('js/render/spaceHabitat.js','utf8');
const IDS=['threshold','foundry','fracture','void-heart','ash-moon','jade-basin','drowned-vault','glass-desert'];
function readonly(value){
  return new Proxy(value,{set(){throw Error('presentation mutated its source');},
    defineProperty(){throw Error('presentation defined a source property');},
    deleteProperty(){throw Error('presentation deleted a source property');}});
}
function fixture(){
  const stats={canvases:[],imageData:0,sourceRequests:0,sourceCopies:[],byteArrays:[]};
  class TrackedUint8Array extends Uint8Array{
    constructor(...args){super(...args);stats.byteArrays.push(this);}
  }
  const images=Object.fromEntries(IDS.map(id=>[id,readonly({naturalWidth:1536,naturalHeight:864,width:1536,height:864})]));
  const entries=Object.fromEntries(IDS.map(id=>[id,readonly({id,file:'sky-'+id+'-v1.webp',ready:true,error:false,image:images[id]})]));
  function context(canvas){
    const calls=[],saved=[];
    return {calls,globalAlpha:1,globalCompositeOperation:'source-over',shadowBlur:0,
      save(){saved.push([this.globalAlpha,this.globalCompositeOperation]);},
      restore(){[this.globalAlpha,this.globalCompositeOperation]=saved.pop();},
      clearRect(){},fillRect(){},
      drawImage(image,...args){
        if(Object.values(images).includes(image)){
          assert(stats.canvases.includes(canvas),'approved artwork was drawn outside the habitat cache');
          assert.notEqual(canvas,image,'approved source was used as a render target');
          assert.equal(canvas.width,512);assert.equal(canvas.height,320);
          stats.sourceCopies.push({image,canvas,args,operation:this.globalCompositeOperation,alpha:this.globalAlpha});
        }
        calls.push(['image',image.id,...args,this.globalAlpha]);
      },
      beginPath(){},rect(...args){calls.push(['rect',...args]);},fill(){},
      moveTo(...args){calls.push(['move',...args]);},lineTo(...args){calls.push(['line',...args]);},stroke(){},
      createImageData(w,h){stats.imageData++;return {data:new Uint8ClampedArray(w*h*4)};},
      putImageData(data){canvas.pixels=new Uint8ClampedArray(data.data);},
      createRadialGradient(){return {addColorStop(){}};},
      getImageData(){throw Error('pixel readback is forbidden');}};
  }
  const document={createElement(name){assert.equal(name,'canvas');
    const canvas={id:stats.canvases.length,width:0,height:0};stats.canvases.push(canvas);
    const ctx=context(canvas);canvas.getContext=kind=>{assert.equal(kind,'2d','test must not create a GPU');return ctx;};return canvas;}};
  const math=Object.create(Math);math.random=()=>{throw Error('presentation consumed gameplay RNG');};
  const NV={settings:{graphics:{spaceResponse:true},gameplay:{reducedEffects:false}},
    getDimensionScenerySource(id){stats.sourceRequests++;return entries[id]||null;}};
  vm.runInNewContext(source,{window:{NV},document,Math:math,Float32Array,Float64Array,Uint8Array:TrackedUint8Array,Uint8ClampedArray,WeakMap,performance:{now:()=>0}});
  return {NV,habitat:NV.spaceHabitat,stats,images,entries,context};
}
function options(player,overrides={}){return {enabled:true,id:'threshold',W:900,H:540,time:0,variant:0,paused:false,player,enemies:[],bullets:[],meteors:[],...overrides};}
function neutral(frame){
  for(let k=0;k<frame.pixels.length;k+=4){
    assert.equal(frame.pixels[k],0,'neutral depletion must encode zero');
    assert.equal(frame.pixels[k+1],0,'neutral compressed matter must encode zero');
    assert.equal(frame.pixels[k+2],0,'unused field channel must stay zero');
    assert.equal(frame.pixels[k+3],255,'field alpha must stay opaque');
  }
}
function strongest(habitat,W,H){
  let best={x:W*.5,y:H*.5,matter:0};
  for(let y=3;y<34;y++)for(let x=6;x<54;x++){
    const px=x*W/64,py=y*H/36,value=habitat.sample(px,py).matter;
    if(value>best.matter)best={x:px,y:py,matter:value};
  }
  assert(best.matter>.2,'scene does not contain traversable dust');return best;
}
function move(habitat,o,actor,duration=.6,fps=120,speed=150){
  const start=o.time,startX=actor.x;
  for(let i=1;i<=Math.round(duration*fps);i++){o.time=start+i/fps;actor.x=startX+speed*i/fps;habitat.update(o);}
}

const f=fixture(),h=f.habitat,actor={x:350,y:280,radius:20,dashActive:false},player=readonly(actor),o=options(player);
h.update(o);const surface=h.getSurface(),surfaceRevision=h.getSurfaceRevision(),frame=h.getGpuFrame(),pixels=frame.pixels;
assert.equal(surface.width,512);assert.equal(surface.height,320);
assert.equal(f.stats.sourceCopies.length,1,'approved gas detail was not copied once into the material cache');
assert.equal(f.stats.sourceCopies[0].image,f.images.threshold);assert.equal(f.stats.sourceCopies[0].canvas,surface);
assert.equal(f.stats.sourceCopies[0].operation,'source-atop','source detail replaced the traversable alpha mask');
assert(f.stats.sourceCopies[0].alpha>0&&f.stats.sourceCopies[0].alpha<1,'source detail obscures the authored material');
assert.equal(frame.width,65);assert.equal(frame.height,37);assert(pixels instanceof Uint8Array);
assert.equal(pixels.byteLength,65*37*4);assert.equal(frame.gain,1);neutral(frame);
assert.equal(h.getGpuFrame(),frame);assert.equal(h.getGpuFrame().pixels,pixels);
assert.deepEqual(Array.from(h.diagnostics().grid),[65,37]);assert.equal(h.diagnostics().foregroundPatches,4);
const spot=strongest(h,o.W,o.H);actor.x=spot.x;actor.y=spot.y;
// A scene's initial stationary contact must not erase a halo under the pilot.
const stationary=fixture(),still={x:spot.x,y:spot.y,radius:20,dashActive:false},so=options(readonly(still));
stationary.habitat.update(so);stationary.habitat.getSurface();const idleRevision=stationary.habitat.getGpuFrame().revision;
for(let i=1;i<=300;i++){so.time=i/60;stationary.habitat.update(so);}
neutral(stationary.habitat.getGpuFrame());assert.equal(stationary.habitat.getGpuFrame().revision,idleRevision);
assert.equal(stationary.habitat.sample(still.x,still.y).depletion,0);

// Initialize the moving pilot at its dust location before measuring a wake.
o.id='foundry';h.update(o);h.getSurface();o.id='threshold';h.update(o);h.getSurface();
const beforeActor=JSON.stringify(actor);for(let i=0;i<30;i++)h.update(o);
assert.equal(JSON.stringify(actor),beforeActor);const beforeMoveRevision=h.getGpuFrame().revision;
move(h,o,actor);const displaced=h.diagnostics();
assert(displaced.totalDepletion>0&&displaced.maxDepletion>0,'ordinary movement does not open dust');
assert(displaced.pushedMatter>0,'ordinary movement does not pile dust to the sides');
assert(displaced.playerSources>0);assert.equal(actor.dashActive,false);
assert.equal(h.getGpuFrame(),frame);assert.equal(frame.pixels,pixels);assert(frame.revision>beforeMoveRevision);
assert(pixels.some((v,i)=>i%4===0&&v>0),'movement did not encode depleted matter');
assert(pixels.some((v,i)=>i%4===1&&v>0),'movement did not encode side accumulation');
for(let i=0;i<pixels.length;i+=4){assert.equal(pixels[i+2],0);assert.equal(pixels[i+3],255);}
const pausedPixels=new Uint8Array(pixels),pausedRevision=frame.revision,pausedTotal=h.diagnostics().totalDepletion,pauseTime=o.time;
o.paused=true;for(let i=0;i<100;i++){o.time+=1/60;h.update(o);h.getGpuFrame();}
assert.equal(frame.revision,pausedRevision);assert.deepEqual(new Uint8Array(pixels),pausedPixels);assert.equal(h.diagnostics().totalDepletion,pausedTotal);
o.paused=false;o.time=pauseTime;const repeatedTime=o.time,repeatRevision=frame.revision;
for(let i=0;i<100;i++){h.update(o);h.getGpuFrame();}
assert.equal(o.time,repeatedTime);assert.equal(frame.revision,repeatRevision);
for(let i=1;i<=600;i++){o.time+=1/120;h.update(o);}
assert(h.diagnostics().totalDepletion<displaced.totalDepletion*.1,'dust does not refill within five seconds');
assert(h.diagnostics().pushedMatter<displaced.pushedMatter*.02,'side accumulation does not settle');
assert.equal(h.getSurface(),surface);assert.equal(h.getSurfaceRevision(),surfaceRevision+2,'motion rebuilt authored artwork');
assert.equal(f.stats.sourceCopies.length,3,'moving or resting actors recopied the original artwork');

// Enemies, both projectile families and meteors share the presentation memory.
for(const [channel,isEnemy] of [['enemies',false],['bullets',false],['bullets',true],['meteors',false]]){
  const q=fixture(),a={x:spot.x,y:spot.y,radius:24,vx:150,vy:0,isEnemy},r=options(null,{[channel]:[readonly(a)]});
  q.habitat.update(r);q.habitat.getSurface();const before=JSON.stringify(a);q.habitat.update(r);assert.equal(JSON.stringify(a),before);
  move(q.habitat,r,a,.5);const d=q.habitat.diagnostics();assert(d.totalDepletion>0,'moving '+channel+' do not affect dust');
  assert(channel==='enemies'?d.enemySources>0:d.projectileSources>0,'missing source counter for '+channel);
}

// A boss traverses the same dust through its dedicated, read-only source hook.
{
  const q=fixture(),boss={x:spot.x,y:spot.y,radius:80,hp:1400,phase:2,
    combat:readonly({damage:41,cooldown:3})},r=options(null,{boss:readonly(boss)});
  const before=JSON.stringify({...boss,x:0});q.habitat.update(r);q.habitat.getSurface();
  assert(q.habitat.sample(boss.x,boss.y).matter>.2,'boss starts outside the material');
  neutral(q.habitat.getGpuFrame());move(q.habitat,r,boss,.5);
  const d=q.habitat.diagnostics();
  assert(d.totalDepletion>0&&d.pushedMatter>0,'moving boss did not open and push dust');
  assert(d.enemySources>0,'dedicated boss source was not tracked');
  assert(q.habitat.sample(spot.x,spot.y).depletion>0,'boss did not leave an opening in traversed material');
  assert.equal(JSON.stringify({...boss,x:0}),before,'boss presentation changed gameplay data');
}

// Cover-crop and mirror bits map material to the original artwork's UVs.
const alignment=fixture(),ah=alignment.habitat,ao=options(null,{W:1536,H:864});
ah.update(ao);ah.getSurface();const reference=[];
for(let y=4;y<33;y+=4)for(let x=6;x<59;x+=5)reference.push([x/64,y/36,ah.sample(x/64*ao.W,y/36*ao.H).matter]);
for(const variant of [1,2,3]){
  ao.variant=variant;ah.update(ao);
  for(const [u,v,mass] of reference)assert.equal(ah.sample((variant&1?1-u:u)*ao.W,(variant&2?1-v:v)*ao.H).matter,mass,'source mirror misplaced material');
}
for(const [W,H] of [[900,900],[1600,520],[800,1100]]){
  ao.W=W;ao.H=H;ao.variant=0;ah.update(ao);
  const ratio=Math.max(W/1536,H/864),cw=W/ratio/1536,ch=H/ratio/864,cx=(1-cw)/2,cy=(1-ch)/2;
  let checked=0;
  for(const [u,v,mass] of reference){
    if(u<=cx||u>=cx+cw||v<=cy||v>=cy+ch)continue;
    assert.equal(ah.sample((u-cx)/cw*W,(v-cy)/ch*H).matter,mass,'cover-crop stretched or shifted material');checked++;
  }
  assert(checked>15,'cover-crop test lacks interior source points');
}
assert.equal(ah.getSurfaceRevision(),1,'arena crop or mirrors rebaked source-space artwork');

// Scene/arena/variant transitions reset memory while retaining bounded resources.
const cached=fixture(),ch=cached.habitat,co=options(null),hashes=new Set();let cachedSurface=null,lastSurfaceRevision=0,cachedFrame=null,cachedPixels=null;
for(let pass=0;pass<2;pass++)for(const id of IDS){
  co.id=id;ch.update(co);const nextFrame=ch.getGpuFrame();neutral(nextFrame);
  if(cachedFrame){assert.equal(nextFrame,cachedFrame);assert.equal(nextFrame.pixels,cachedPixels);}else{cachedFrame=nextFrame;cachedPixels=nextFrame.pixels;}
  const copiesBefore=cached.stats.sourceCopies.length,next=ch.getSurface();
  assert.equal(cached.stats.sourceCopies.length,copiesBefore+1,'a scene cache must copy original gas detail exactly once');
  assert.equal(cached.stats.sourceCopies.at(-1).image,cached.images[id]);
  if(cachedSurface)assert.equal(next,cachedSurface,'scenes accumulate full material canvases');cachedSurface=next;
  assert(ch.getSurfaceRevision()>lastSurfaceRevision);lastSurfaceRevision=ch.getSurfaceRevision();
  if(pass===0)hashes.add(crypto.createHash('sha256').update(next.pixels).digest('hex'));
  const count=cached.stats.imageData,revision=ch.getSurfaceRevision(),bytes=ch.getGpuFrame().pixels,copies=cached.stats.sourceCopies.length;
  for(let i=0;i<20;i++){assert.equal(ch.getSurface(),next);assert.equal(ch.getGpuFrame().pixels,bytes);}
  assert.equal(cached.stats.imageData,count);assert.equal(ch.getSurfaceRevision(),revision);
  assert.equal(cached.stats.sourceCopies.length,copies,'unchanged surface recopied original artwork');
  assert.equal(ch.diagnostics().materialNoiseBytes,512*320*3);
  assert.equal(cached.stats.byteArrays.filter(array=>array.byteLength===512*320*3).length,1,'scene changes allocate another material noise cache');
  const local=strongest(ch,co.W,co.H),a={x:local.x,y:local.y,dashActive:false};co.player=readonly(a);co.time+=1/120;ch.update(co);move(ch,co,a,.15);
  assert(ch.diagnostics().totalDepletion>0,'approved scene lacks reactive dust: '+id);
  co.player=null;
}
assert.equal(hashes.size,IDS.length,'scene artwork or palettes are repeated');
assert.equal(cached.stats.canvases.length,5,'cached sprite/surface resources grow across scenes');
assert.equal(cached.stats.sourceCopies.length,IDS.length*2);
const noiseCache=cached.stats.byteArrays.find(array=>array.byteLength===512*320*3);assert(noiseCache);
assert(cached.stats.canvases.slice(1).every(c=>c.width===128&&c.height===96));
for(const change of [{W:1200},{H:720},{variant:1},{variant:2},{variant:3}]){
  const local=strongest(ch,co.W,co.H),a={x:local.x,y:local.y,dashActive:false};co.player=readonly(a);co.time+=1/120;ch.update(co);move(ch,co,a,.15);
  assert(ch.diagnostics().totalDepletion>0,'reset precondition did not create density memory');
  co.player=null;Object.assign(co,change);ch.update(co);neutral(ch.getGpuFrame());
}
const cachedBuilds=cached.stats.imageData,cachedCopies=cached.stats.sourceCopies.length;ch.getSurface();assert.equal(cached.stats.imageData,cachedBuilds);
assert.equal(cached.stats.sourceCopies.length,cachedCopies,'arena resize or variant recopied source gas detail');
assert.equal(cached.stats.byteArrays.filter(array=>array.byteLength===512*320*3).length,1);
assert.equal(cached.stats.byteArrays.find(array=>array.byteLength===512*320*3),noiseCache);
const unknownRevision=ch.getGpuFrame().revision;co.id='unknown';ch.update(co);assert.equal(ch.diagnostics().active,false);
neutral(ch.getGpuFrame());assert.equal(ch.getGpuFrame().gain,0);assert(ch.getGpuFrame().revision>unknownRevision);

// OFF removes density response while ambient travelers and fixed dust anchors live.
f.NV.settings.graphics.spaceResponse=false;h.update(o);neutral(h.getGpuFrame());assert.equal(frame.gain,0);
const front=f.context({}),created=f.stats.canvases.length,built=f.stats.imageData,originalCopies=f.stats.sourceCopies.length;
o.time+=1/60;h.update(o);h.drawFront(front,o.time,player);const frontA=JSON.stringify(front.calls),anchors=front.calls.filter(c=>c[0]==='image');
assert.equal(anchors.length,4,'OFF removed the local foreground material');assert(front.calls.some(c=>c[0]==='rect'),'OFF removed ambient travelers');
front.calls.length=0;o.time+=10;h.update(o);h.drawFront(front,o.time,player);
assert.notEqual(JSON.stringify(front.calls),frontA,'OFF freezes autonomous ambient motion');
const drifting=front.calls.filter(c=>c[0]==='image');assert.equal(drifting.length,anchors.length);
for(let i=0;i<anchors.length;i++){
  const a=anchors[i],b=drifting[i];assert.equal(b[1],a[1],'ambient motion replaced its cached sprite');
  assert(Math.abs(b[2]-a[2])<=12&&Math.abs(b[3]-a[3])<=12,'ambient dust drift left its world anchor');
  assert.deepEqual(b.slice(4),a.slice(4),'ambient drift changed the sprite size or opacity');
}
for(let i=0;i<100;i++)h.drawFront(front,o.time,player);
assert.equal(f.stats.canvases.length,created);assert.equal(f.stats.imageData,built,'foreground sprites regenerate every frame');
assert.equal(f.stats.sourceCopies.length,originalCopies,'foreground frames recopy approved artwork');
f.NV.settings.gameplay.reducedEffects=true;front.calls.length=0;h.drawFront(front,o.time,player);const quiet=JSON.stringify(front.calls);
front.calls.length=0;o.time+=100;h.update(o);h.drawFront(front,o.time,player);assert.equal(JSON.stringify(front.calls),quiet,'reduced-effects ambient motion continues');

function trajectory(fps){
  const q=fixture(),a={x:spot.x-45,y:spot.y,radius:20,dashActive:false},r=options(readonly(a));
  q.habitat.update(r);q.habitat.getSurface();let integrated=0;
  for(let i=1;i<=fps*2;i++){r.time=i/fps;a.x=spot.x-45+Math.min(r.time,1)*130;q.habitat.update(r);integrated+=q.habitat.diagnostics().totalDepletion/fps;}
  return integrated;
}
const low=trajectory(30),high=trajectory(165);assert(low>0&&high>0);
assert(Math.abs(low-high)/Math.max(low,high)<.25,'cumulative depletion changes with refresh rate: '+low+' vs '+high);
assert(!/Math\.random|readPixels|getImageData|new Image\b/.test(source),'habitat uses gameplay RNG, readbacks or replacement artwork');
assert(Object.values(f.images).every(image=>image.naturalWidth===1536&&image.naturalHeight===864),'approved source metadata changed');
console.log('PASS space habitat: ordinary traversal, stationary/pause/recovery, actor/source isolation, eight source-aligned cached scenes, bounded sprites and FPS-independent dust');
