const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
  const {WorldView}=await import('../src/game/world.mjs');let comparisons=0,cases=0;
  const near=(a,b,label)=>{assert(Math.abs(a-b)<1e-8,label+`: ${a} != ${b}`);comparisons++;};
  for(const [width,height] of [[900,520],[1280,800],[915,412],[800,360],[360,800],[2560,1440]])for(const mobile of [false,true])for(const dynamicOff of [false,true]){
    const box={left:13,top:27,width,height},NV={capabilities:{isMobile:mobile,orientation:height>width?'portrait':'landscape'}};
    const context={NV,document:{documentElement:{classList:{add(){},remove(){}}},getElementById(){return {getBoundingClientRect:()=>box};},addEventListener(){}},location:{search:dynamicOff?'?dynamicView=0':''},devicePixelRatio:3,addEventListener(){},console};context.window=context;vm.createContext(context);
    vm.runInContext(fs.readFileSync(path.join(root,'reference','prototype','js','core','viewport.js'),'utf8'),context,{timeout:1000});
    const modern=new WorldView().resize({...box,mobile,dynamicOff,dpr:3}),legacy=NV.viewport,m=NV.worldMetrics;
    for(const [a,b,name] of [[modern.arena.width,m.arenaW,'arenaW'],[modern.arena.height,m.arenaH,'arenaH'],[modern.view.width,m.viewW,'viewW'],[modern.scale,legacy.displayScale,'scale'],[modern.dpr,legacy.dpr,'dpr']])near(a,b,name);
    for(const x of [20,m.arenaW/2,m.arenaW-20])for(const y of [20,m.arenaH/2,m.arenaH-20]){
      legacy.followPlayer(x,y);modern.follow(x,y);near(modern.camera.x,m.viewX,'cameraX');near(modern.camera.y,m.viewY,'cameraY');
      for(const point of [[13,27],[width/2,height/2],[width+13,height+27]]){
        const a=modern.toWorld(...point),b=legacy.screenToGame(...point);near(a.x,b.x,'toWorldX');near(a.y,b.y,'toWorldY');
        const c=modern.toScreen(a.x,a.y),d=legacy.gameToScreen(b.x,b.y);near(c.x,d.x,'toScreenX');near(c.y,d.y,'toScreenY');
      }
      assert.equal(modern.containsRect(x,y,22,22),legacy.intersectsWorldRect(x,y,22,22));
    }
    box.width=844;box.height=390;legacy.refresh();modern.resize({...box,mobile,portrait:height>width,dynamicOff,dpr:3});
    near(modern.camera.x,m.viewX,'resizeX');near(modern.camera.y,m.viewY,'resizeY');cases++;
  }
  const out=path.join(root,'local','validation');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'world.json'),JSON.stringify({pass:true,cases,comparisons},null,2));
  console.log(`PASS mundo/cámara: ${cases} escenarios, ${comparisons} comparaciones numéricas.`);
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
