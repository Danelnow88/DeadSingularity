'use strict';
// Deterministic rendering QA. Uses synthetic analysis values, never microphone,
// display capture, real music, user profiles, saves, or gameplay mutations.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'local/validation/audio-perimeter');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'ds-audio-perimeter-')));
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
app.whenReady().then(async()=>{
  const win=new BrowserWindow({width:900,height:560,useContentSize:true,show:false,
    webPreferences:{offscreen:true,backgroundThrottling:false,sandbox:true,contextIsolation:true,preload:path.join(root,'desktop/audio-preload.cjs')}});
  let permissionRequests=0;
  win.webContents.session.setPermissionRequestHandler((_webContents,_permission,callback)=>{permissionRequests++;callback(false);});
  const run=code=>win.webContents.executeJavaScript(code,true);
  const seed=`Object.assign(NV.rhythm,{enabled:true,active:true,state:'listening',energy:.8,energyRaw:.8,
    bass:.8,mids:.65,highs:.4,beat:1,kick:1,snare:.65,onset:1,accent:1,punch:.85,
    density:3,onsetRate:3,tempoBpm:120,lastOnsetAt:10,lastBeatAt:10,lastShakeAt:-99});`;

  await win.loadFile(path.join(root,'index.html'),{query:{fresh:'1'}});
  const normal=await run(`(()=>{${seed}
    const canvas=document.createElement('canvas');canvas.width=200;canvas.height=120;
    const c=canvas.getContext('2d');NV.drawRhythmLayer(c,200,120,0);
    const pixels=c.getImageData(0,0,200,120).data;let legacyPixels=0;
    for(let i=3;i<pixels.length;i+=4)if(pixels[i])legacyPixels++;
    c.clearRect(0,0,200,120);NV.AudioPerimeter.tick(1/60,{active:true,paused:false,hidden:false});
    NV.AudioPerimeter.draw(c,160,80,1,{tier:'full'});
    const after=c.getImageData(0,0,200,120).data;let perimeterPixels=0;
    for(let i=3;i<after.length;i+=4)if(after[i])perimeterPixels++;
    return {legacyPixels,perimeterPixels,snapshot:NV.AudioPerimeter.snapshot()};
  })()`);
  assert(normal.legacyPixels>1000,'normal legacy music renderer changed');
  assert.equal(normal.perimeterPixels,0,'normal game rendered experimental perimeter');
  assert.equal(normal.snapshot.enabled,false,'normal game enabled experimental perimeter');

  await win.loadFile(path.join(root,'index.html'),{query:{fresh:'1',dimensionEvents:'preview'}});
  const result=await run(`(()=>{${seed}
    const padding=NV.viewport.cameraExteriorPadding,W=900-padding*2,H=560-padding*2;
    const canvas=document.createElement('canvas');canvas.width=900;canvas.height=560;
    const c=canvas.getContext('2d',{willReadFrequently:true});
    function base(){
      c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,900,560);
      c.fillStyle='#03070e';c.fillRect(0,0,900,560);
      c.fillStyle='#081525';c.fillRect(padding,padding,W,H);
      for(let i=0;i<80;i++){c.fillStyle=i%2?'#344d69':'#45415a';c.fillRect(padding+((i*139)%W),padding+((i*71)%H),1,1);}
      c.translate(padding,padding);
    }
    function labelledImage(){
      // Text is presentation only: GPU/font readback differences must not count
      // as musical changes in the deterministic untouched-center pixel fixture.
      c.save();c.setTransform(1,0,0,1,0,0);c.fillStyle='#80a9bd';c.textAlign='center';c.font='13px system-ui';
      c.fillText('PERÍMETRO MUSICAL · SOLO FUERA DEL CAMPO',450,245);
      c.fillStyle='#47627b';c.font='11px system-ui';
      c.fillText('Mismo análisis de audio · centro de combate intacto',450,271);c.restore();
      return canvas.toDataURL('image/png').split(',')[1];
    }
    function pixels(){return c.getImageData(0,0,900,560).data;}
    function render(){base();NV.AudioPerimeter.draw(c,W,H,1,{tier:'full'});return pixels();}
    base();const baseline=pixels();
    Object.assign(NV.rhythm,{energy:0,energyRaw:0,bass:0,mids:0,highs:0,beat:0,kick:0,snare:0,onset:0,accent:0,punch:0,density:0,onsetRate:0});
    for(let frame=0;frame<120;frame++)NV.AudioPerimeter.tick(1/60,{active:true,paused:false,hidden:false});
    const beforeHook=NV.AudioPerimeter.snapshot().stats.drawCalls;
    base();NV.drawSectorPerimeter(c,W,H,1,{tier:'full'});
    const sectorIntegrated=NV.AudioPerimeter.snapshot().stats.drawCalls>beforeHook;
    const quiet=render(),quietImage=labelledImage();
    ${seed}
    NV.rhythm.data=new Uint8Array(256);NV.rhythm.analysisRevision=0;
    for(let frame=0;frame<154;frame++){
      const hit=frame%30===0;Object.assign(NV.rhythm,{kick:hit?1:0,onset:hit?1:0,beat:hit?1:0,
        ...(hit?{lastOnsetAt:10+frame/60,lastBeatAt:10+frame/60}:{})});
      for(let bin=0;bin<256;bin++)NV.rhythm.data[bin]=Math.min(255,12+
        (bin<18?(hit?205:45):bin<95?(frame%15<3?110:28):(frame%5===0?110:18)));
      NV.rhythm.analysisRevision++;
      NV.AudioPerimeter.tick(1/60,{active:true,paused:false,hidden:false});
    }
    const rhythm=render(),rhythmicImage=labelledImage();
    let centerChanges=0,exteriorChanges=0,animatedExterior=0;
    const centerBounds={minX:900,minY:560,maxX:0,maxY:0};
    const sideChanges={top:0,right:0,bottom:0,left:0};
    for(let y=0;y<560;y++)for(let x=0;x<900;x++){
      const i=(y*900+x)*4;
      const changed=rhythm[i]!==baseline[i]||rhythm[i+1]!==baseline[i+1]||rhythm[i+2]!==baseline[i+2]||rhythm[i+3]!==baseline[i+3];
      const animated=rhythm[i]!==quiet[i]||rhythm[i+1]!==quiet[i+1]||rhythm[i+2]!==quiet[i+2]||rhythm[i+3]!==quiet[i+3];
      const inside=x>=padding&&x<padding+W&&y>=padding&&y<padding+H;
      if(changed){if(inside){centerChanges++;centerBounds.minX=Math.min(centerBounds.minX,x);centerBounds.minY=Math.min(centerBounds.minY,y);centerBounds.maxX=Math.max(centerBounds.maxX,x);centerBounds.maxY=Math.max(centerBounds.maxY,y);}else{
        exteriorChanges++;if(y<padding)sideChanges.top++;if(y>=padding+H)sideChanges.bottom++;
        if(x<padding)sideChanges.left++;if(x>=padding+W)sideChanges.right++;
      }}
      if(animated&&!inside)animatedExterior++;
    }
    // Render must restore all Canvas state (including arbitrary parent transforms).
    const transform=c.getTransform(),alpha=c.globalAlpha,composition=c.globalCompositeOperation;
    NV.AudioPerimeter.draw(c,W,H,1,{tier:'full'});
    const restored=c.getTransform();
    const stateRestored=['a','b','c','d','e','f'].every(k=>transform[k]===restored[k])&&alpha===c.globalAlpha&&composition===c.globalCompositeOperation;
    const legacy=document.createElement('canvas');legacy.width=200;legacy.height=120;
    const lc=legacy.getContext('2d');NV.drawRhythmLayer(lc,200,120,0);
    const lp=lc.getImageData(0,0,200,120).data;let legacyPixels=0;
    for(let i=3;i<lp.length;i+=4)if(lp[i])legacyPixels++;
    const shake=NV.rhythmShakeBoost(NV.rhythm,NV.rhythm.lastOnsetAt);
    const movingPose=JSON.stringify(NV.AudioPerimeter.snapshot().motion);
    NV.AudioPerimeter.tick(.25,{active:true,paused:true,hidden:false});
    const pauseFrozen=movingPose===JSON.stringify(NV.AudioPerimeter.snapshot().motion);
    NV.AudioPerimeter.tick(1/60,{active:true,paused:false,hidden:false});
    // Warm all sector palettes/tier paths before measuring allocation policy.
    for(const wave of [1,6,11,16])for(const tier of ['full','reduced','minimal'])NV.AudioPerimeter.draw(c,W,H,wave,{tier});
    // The bounded atlas retains only the last palette, so warm the measured one.
    NV.AudioPerimeter.draw(c,W,H,1,{tier:'full'});
    const counts={canvas:0,gradient:0};
    const oldCreate=document.createElement,proto=CanvasRenderingContext2D.prototype;
    const oldLinear=proto.createLinearGradient,oldRadial=proto.createRadialGradient;
    document.createElement=function(tag,...rest){if(tag==='canvas')counts.canvas++;return oldCreate.call(this,tag,...rest);};
    proto.createLinearGradient=function(...args){counts.gradient++;return oldLinear.apply(this,args);};
    proto.createRadialGradient=function(...args){counts.gradient++;return oldRadial.apply(this,args);};
    const oldOffscreen=window.OffscreenCanvas;
    if(oldOffscreen)window.OffscreenCanvas=class extends oldOffscreen{constructor(...args){counts.canvas++;super(...args);}};
    const timings=[],animatedTimings=[],syntheticWaveform=new Float32Array(512);
    for(let i=0;i<512;i++)syntheticWaveform[i]=Math.sin(i*Math.PI/16)*.75;
    const waveformSource={fftSize:512,getFloatTimeDomainData(target){target.set(syntheticWaveform);}};
    const previousAnalyser=NV.rhythm.analyser;
    // Include the shared analyser waveform-copy + RMS/crest work in animated
    // CPU measurements, without constructing or activating any real source.
    NV.rhythm.analyser=waveformSource;
    try{
      for(let batch=0;batch<20;batch++){
        const start=performance.now();
        for(let frame=0;frame<100;frame++)NV.AudioPerimeter.draw(c,W,H,1,{tier:'full'});
        timings.push((performance.now()-start)/100);
      }
      for(let batch=0;batch<20;batch++){
        const start=performance.now();
        for(let frame=0;frame<100;frame++){
          NV.rhythm.analysisRevision++;
          if(frame%6===0)NV.rhythm.hatId++;
          if(frame%30===0)NV.rhythm.kickId++;
          NV.AudioPerimeter.tick(1/60,{active:true,paused:false,hidden:false});
          NV.AudioPerimeter.draw(c,W,H,1,{tier:'full'});
        }
        animatedTimings.push((performance.now()-start)/100);
      }
    }finally{
      document.createElement=oldCreate;proto.createLinearGradient=oldLinear;proto.createRadialGradient=oldRadial;
      if(oldOffscreen)window.OffscreenCanvas=oldOffscreen;
      NV.rhythm.analyser=previousAnalyser;NV.rhythm.analysisRevision++;
    }
    timings.sort((a,b)=>a-b);animatedTimings.sort((a,b)=>a-b);
    const snapshot=NV.AudioPerimeter.snapshot();
    const beforeCull=snapshot.stats.paints;
    c.save();c.translate(100000,100000);NV.AudioPerimeter.draw(c,W,H,1,{tier:'full'});c.restore();
    const culled=NV.AudioPerimeter.snapshot();
    const detail=document.createElement('canvas');detail.width=440;detail.height=90;
    const dc=detail.getContext('2d');dc.translate(220-W*.28*3,45+padding*.5*3);dc.scale(3,3);
    NV.AudioPerimeter.draw(dc,W,H,1,{tier:'full'});
    const detailImage=detail.toDataURL('image/png').split(',')[1];
    // Every alternative gets the same synthetic musical sequence. Verify each
    // exterior mask and responsive geometry, then measure shared-tile update.
    const styles=[],gallery=document.createElement('canvas');gallery.width=1040;gallery.height=720;
    const gc=gallery.getContext('2d');gc.fillStyle='#03070e';gc.fillRect(0,0,1040,720);
    const defaultStyle=NV.AudioPerimeter.getStyle();
    for(const [index,design] of NV.AudioPerimeter.styles.entries()){
      NV.AudioPerimeter.setStyle(design.id);
      Object.assign(NV.rhythm,{energy:0,energyRaw:0,bass:0,mids:0,highs:0,beat:0,kick:0,snare:0,onset:0,accent:0,punch:0,density:0,onsetRate:0});
      for(let frame=0;frame<480;frame++)NV.AudioPerimeter.tick(1/60,{active:true});
      const resting=render();
      ${seed}
      for(let frame=0;frame<154;frame++){
        const hit=frame%30===0;Object.assign(NV.rhythm,{kick:hit?1:0,onset:hit?1:0,beat:hit?1:0,
          ...(hit?{lastOnsetAt:100+index*10+frame/60,lastBeatAt:100+index*10+frame/60}:{})});
        for(let bin=0;bin<256;bin++)NV.rhythm.data[bin]=Math.min(255,12+
          (bin<18?(hit?205:45):bin<95?(frame%15<3?110:28):(frame%5===0?110:18)));
        NV.rhythm.analysisRevision++;NV.AudioPerimeter.tick(1/60,{active:true});render();
      }
      const active=render();let inside=0,animated=0;
      const sides={top:0,right:0,bottom:0,left:0};
      for(let y=0;y<560;y++)for(let x=0;x<900;x++){
        const i=(y*900+x)*4;
        const changed=active[i]!==baseline[i]||active[i+1]!==baseline[i+1]||active[i+2]!==baseline[i+2]||active[i+3]!==baseline[i+3];
        const delta=active[i]!==resting[i]||active[i+1]!==resting[i+1]||active[i+2]!==resting[i+2];
        const interior=x>=padding&&x<padding+W&&y>=padding&&y<padding+H;
        if(changed&&interior)inside++;
        if(delta&&!interior)animated++;
        if(changed&&!interior){if(y<padding)sides.top++;if(y>=padding+H)sides.bottom++;if(x<padding)sides.left++;if(x>=padding+W)sides.right++;}
      }
      const sample=document.createElement('canvas');sample.width=440;sample.height=90;
      const sc=sample.getContext('2d');sc.translate(220-W*.28*3,45+padding*.5*3);sc.scale(3,3);
      NV.AudioPerimeter.draw(sc,W,H,1,{tier:'full'});
      const sampleImage=sample.toDataURL('image/png').split(',')[1],row=20+index*175;
      gc.fillStyle='#c5e8f6';gc.font='700 21px system-ui';gc.fillText((index+1)+'. '+design.name,26,row+55);
      gc.fillStyle='#728ca4';gc.font='12px system-ui';gc.fillText('ADAPTACIÓN BOCETO V13',26,row+79);
      gc.drawImage(sample,300,row+8,704,144);
      const oldSurface=window.OffscreenCanvas,alloc={canvas:0,gradient:0};
      const pl=proto.createLinearGradient,pr=proto.createRadialGradient;
      if(oldSurface)window.OffscreenCanvas=class extends oldSurface{constructor(...args){alloc.canvas++;super(...args);}};
      proto.createLinearGradient=function(...args){alloc.gradient++;return pl.apply(this,args);};
      proto.createRadialGradient=function(...args){alloc.gradient++;return pr.apply(this,args);};
      const batches=[];
      NV.rhythm.analyser=waveformSource;
      try{
        for(let batch=0;batch<20;batch++){
          const start=performance.now();
          for(let frame=0;frame<100;frame++){
            NV.rhythm.analysisRevision++;if(frame%6===0)NV.rhythm.hatId++;if(frame%30===0)NV.rhythm.kickId++;
            NV.AudioPerimeter.tick(1/60,{active:true});NV.AudioPerimeter.draw(c,W,H,1,{tier:'full'});
          }batches.push((performance.now()-start)/100);
        }
      }finally{if(oldSurface)window.OffscreenCanvas=oldSurface;proto.createLinearGradient=pl;proto.createRadialGradient=pr;
        NV.rhythm.analyser=previousAnalyser;NV.rhythm.analysisRevision++;}
      batches.sort((a,b)=>a-b);
      styles.push({id:design.id,name:design.name,centerChanges:inside,animatedExterior:animated,sideChanges:sides,counts:alloc,
        animatedMeanMs:batches.reduce((sum,n)=>sum+n,0)/batches.length,animatedP95BatchMs:batches[18],sampleImage});
    }
    NV.AudioPerimeter.setStyle(defaultStyle);
    const galleryImage=gallery.toDataURL('image/png').split(',')[1];
    // Four deliberately different synthetic arrangements. These are not audio
    // recordings or an assertion about artists: they exercise the real renderer
    // with sustained tones, kick+hat subdivisions, heavy sparse hits and a dense
    // full-band texture. Native capture remains completely disabled throughout.
    const profiles=[
      {id:'calm',name:'SUAVE / SOSTENIDO',level:.065,kickHz:.6,hatHz:0,density:0,bpm:74},
      {id:'trap',name:'GRAVE + HI-HAT RÁPIDO',level:.35,kickHz:1.6,hatHz:12,density:7,bpm:96},
      {id:'breakdown',name:'GOLPE PESADO / ESPACIO',level:.56,kickHz:.85,hatHz:1.7,density:1.8,bpm:84},
      {id:'dense',name:'DENSO / PERCUSIÓN RÁPIDA',level:.75,kickHz:8,hatHz:14,density:14,bpm:174}
    ];
    const musicSheet=document.createElement('canvas');musicSheet.width=1440;musicSheet.height=720;
    const mc=musicSheet.getContext('2d');mc.fillStyle='#03070e';mc.fillRect(0,0,1440,720);
    mc.fillStyle='#a9c9d9';mc.font='700 18px system-ui';mc.fillText('CUATRO INSTRUMENTOS · CUATRO ARREGLOS SINTÉTICOS',24,30);
    mc.fillStyle='#658497';mc.font='11px system-ui';mc.fillText('Sin música real ni captura · cada panel comparte el mismo análisis · tamaño y posiciones intactos',24,51);
    for(let column=0;column<profiles.length;column++){
      mc.fillStyle='#86a3b8';mc.font='10px system-ui';mc.fillText(profiles[column].name,185+column*312,82);
    }
    const profileResults=[];
    for(const [row,design]of NV.AudioPerimeter.styles.entries())for(const [column,profile]of profiles.entries()){
      NV.AudioPerimeter.setStyle(design.id);
      Object.assign(NV.rhythm,{enabled:false,active:false,state:'off'});NV.AudioPerimeter.tick(1/120,{active:true});
      Object.assign(NV.rhythm,{enabled:true,active:true,state:'listening',energy:0,energyRaw:0,bass:0,mids:0,highs:0,
        kick:0,snare:0,onset:0,hats:0,beat:0,accent:0,punch:0,density:0,onsetRate:0,
        kickId:0,snareId:0,onsetId:0,hatId:0,lastOnsetAt:0,analysisRevision:0});
      for(let frame=0;frame<360;frame++)NV.AudioPerimeter.tick(1/120,{active:true});
      const rest=render();let previousKick=-1,previousHat=-1,previousSnare=-1;
      let maxIntensity=0,maxAggression=0,minArea=1,maxArea=0,minLevel=3,maxLevel=0;
      for(let frame=0;frame<576;frame++){
        const time=(frame+1)/120,k=Math.floor(time*profile.kickHz),h=Math.floor(time*profile.hatHz),s=Math.floor(time*(profile.id==='dense'?4:.8));
        const kickAge=time-k/profile.kickHz,hatAge=profile.hatHz?time-h/profile.hatHz:9,snareHz=profile.id==='dense'?4:.8,
          snareAge=time-s/snareHz,kick=Math.exp(-kickAge/.065),hat=Math.exp(-hatAge/.024),snare=Math.exp(-snareAge/.045);
        if(frame%2===0){
          if(k!==previousKick){NV.rhythm.kickId++;NV.rhythm.onsetId++;NV.rhythm.lastOnsetAt=time;previousKick=k;}
          if(profile.hatHz&&h!==previousHat){NV.rhythm.hatId++;previousHat=h;}
          if(profile.id!=='calm'&&s!==previousSnare){NV.rhythm.snareId++;previousSnare=s;}
          const level=profile.level*(.77+.23*kick),wall=profile.id==='dense'?.75:profile.id==='breakdown'?.30:.12;
          for(let bin=0;bin<256;bin++){
            const lower=bin<3?(profile.id==='trap'?.58:.25)+kick*.35:bin<45?wall+snare*.25:bin<150?wall*.55+hat*.35:.015;
            const melody=Math.exp(-(((bin-12-Math.sin(time*.7)*6)/4)**2))*.32;
            NV.rhythm.data[bin]=Math.min(255,Math.round(255*profile.level*(lower+melody)));
          }
          Object.assign(NV.rhythm,{energy:level,energyRaw:level,bass:level*(.65+kick*.3),mids:level*(.4+wall*.5),
            highs:level*(.15+hat*.55),kick,snare:profile.id==='calm'?0:snare,onset:Math.max(kick,snare),hats:hat,
            beat:kick,accent:kick>.5?1:.15,punch:kick,density:profile.density,onsetRate:profile.density,tempoBpm:profile.bpm});
          NV.rhythm.analysisRevision++;
        }
        NV.AudioPerimeter.tick(1/120,{active:true});render();
        const pose=NV.AudioPerimeter.snapshot().motion;
        maxIntensity=Math.max(maxIntensity,pose.intensity||0);maxAggression=Math.max(maxAggression,pose.aggression||0);
        if(frame>120){const designPose=NV.AudioPerimeter.snapshot().design;
          minArea=Math.min(minArea,designPose.areaScaleY);maxArea=Math.max(maxArea,designPose.areaScaleY);
          minLevel=Math.min(minLevel,designPose.visualLevel);maxLevel=Math.max(maxLevel,designPose.visualLevel);}
      }
      const moving=render();let center=0,exterior=0;
      for(let y=0;y<560;y++)for(let x=0;x<900;x++){
        const i=(y*900+x)*4,isInside=x>=padding&&x<padding+W&&y>=padding&&y<padding+H;
        const changed=moving[i]!==baseline[i]||moving[i+1]!==baseline[i+1]||moving[i+2]!==baseline[i+2];
        const animated=moving[i]!==rest[i]||moving[i+1]!==rest[i+1]||moving[i+2]!==rest[i+2];
        if(isInside&&changed)center++;if(!isInside&&animated)exterior++;
      }
      const panel=document.createElement('canvas');panel.width=440;panel.height=90;
      const pc=panel.getContext('2d');pc.translate(220-W*.28*3,45+padding*.5*3);pc.scale(3,3);
      NV.AudioPerimeter.draw(pc,W,H,1,{tier:'full'});
      if(column===0){mc.fillStyle='#c5e8f6';mc.font='700 17px system-ui';mc.fillText(design.name,24,154+row*153);}
      mc.drawImage(panel,174+column*312,104+row*153,306,100);
      const movingPose=JSON.stringify(NV.AudioPerimeter.snapshot().motion);
      NV.AudioPerimeter.tick(.05,{active:true,paused:true});const frozen=movingPose===JSON.stringify(NV.AudioPerimeter.snapshot().motion);
      const paintsBefore=NV.AudioPerimeter.snapshot().stats.paints;
      c.save();c.translate(100000,100000);NV.AudioPerimeter.draw(c,W,H,1,{tier:'full'});c.restore();
      const afterCull=NV.AudioPerimeter.snapshot();
      profileResults.push({style:design.id,profile:profile.id,centerChanges:center,animatedExterior:exterior,maxIntensity,maxAggression,minArea,maxArea,minLevel,maxLevel,
        frozen,culled:afterCull.stats.modules===0&&afterCull.stats.culled===4&&afterCull.stats.paints===paintsBefore,
        panelImage:panel.toDataURL('image/png').split(',')[1]});
    }
    NV.AudioPerimeter.setStyle(defaultStyle);
    const musicSheetImage=musicSheet.toDataURL('image/png').split(',')[1];
    Object.assign(NV.rhythm,{enabled:false,active:false,state:'off'});
    NV.AudioPerimeter.tick(1/60,{active:true,paused:false,hidden:false});
    const offModules=NV.AudioPerimeter.draw(c,W,H,1,{tier:'full'});
    const offSnapshot=NV.AudioPerimeter.snapshot();
    return {padding,sectorIntegrated,centerChanges,centerBounds,exteriorChanges,animatedExterior,sideChanges,stateRestored,pauseFrozen,legacyPixels,shake,counts,snapshot,
      drawSubmissionMeanMs:timings.reduce((sum,n)=>sum+n,0)/timings.length,drawSubmissionP95BatchMs:timings[18],
      animatedMeanMs:animatedTimings.reduce((sum,n)=>sum+n,0)/animatedTimings.length,animatedP95BatchMs:animatedTimings[18],
      culledAll:culled.stats.modules===0&&culled.stats.culled===4&&culled.stats.paints===beforeCull,
      quietImage,rhythmicImage,detailImage,styles,galleryImage,profileResults,musicSheetImage,offModules,offSnapshot};
  })()`);
  console.log('PIXELS:',JSON.stringify({padding:result.padding,centerChanges:result.centerChanges,centerBounds:result.centerBounds,exteriorChanges:result.exteriorChanges,animatedExterior:result.animatedExterior}));
  assert.equal(result.centerChanges,0,'music effect changed pixels inside gameplay bounds');
  assert.equal(result.sectorIntegrated,true,'sector perimeter does not integrate quiet preview modules');
  assert(result.exteriorChanges>100,'perimeter is not visibly rendered');
  assert(result.animatedExterior>50,'perimeter does not respond to synthetic musical rhythm');
  for(const [side,changed]of Object.entries(result.sideChanges))assert(changed>15,'unrendered exterior side: '+side);
  assert.equal(result.stateRestored,true,'perimeter renderer leaked Canvas state');
  assert.equal(result.pauseFrozen,true,'paused music perimeter advanced animation');
  assert.equal(result.legacyPixels,0,'preview still renders legacy full-map visualizer');
  assert.equal(result.shake,0,'preview still shakes camera for external music');
  assert.equal(result.counts.canvas,0,'perimeter creates canvases on warm draw');
  assert.equal(result.counts.gradient,0,'perimeter creates gradients on warm draw');
  assert.equal(result.snapshot.enabled,true,'preview did not activate renderer');
  assert.equal(result.offModules,0,'disabled option still renders speaker modules');
  assert.equal(result.offSnapshot.motion.drive,0,'disabled option retained a queued stroke');
  assert.equal(result.culledAll,true,'offscreen modules repainted/submitted');
  assert.equal(permissionRequests,0,'synthetic QA unexpectedly requested capture permission');
  assert.equal(result.styles.length,4);
  assert.equal(new Set(result.styles.map(s=>s.sampleImage)).size,4,'alternative designs look identical');
  for(const style of result.styles){
    assert.equal(style.centerChanges,0,style.id+' changed gameplay pixels');assert(style.animatedExterior>50,style.id+' has no musical animation');
    for(const [side,n] of Object.entries(style.sideChanges))assert(n>15,style.id+' missing '+side);
    assert.equal(style.counts.canvas,0,style.id+' allocates surfaces on warm draw');assert.equal(style.counts.gradient,0,style.id+' allocates gradients on warm draw');
  }
  assert.equal(result.profileResults.length,16);
  for(const profile of result.profileResults){
    assert.equal(profile.centerChanges,0,profile.style+'/'+profile.profile+' modified the battlefield');
    assert(profile.animatedExterior>50,profile.style+'/'+profile.profile+' has no response');
    assert(profile.frozen,profile.style+'/'+profile.profile+' moved while paused');
    assert(profile.culled,profile.style+'/'+profile.profile+' repainted an offscreen panel');
    if(profile.profile==='dense')assert(profile.maxArea-profile.minArea>.15,profile.style+' does not actually expand/contract during dense percussion');
    if(profile.profile==='calm')assert(profile.maxArea<.55,profile.style+' is oversized during a calm passage');
  }
  for(const style of result.styles){
    const samples=result.profileResults.filter(p=>p.style===style.id);
    assert.equal(new Set(samples.map(p=>p.panelImage)).size,4,style.id+' used identical poses for different arrangements');
  }
  fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'quiet.png'),Buffer.from(result.quietImage,'base64'));
  fs.writeFileSync(path.join(out,'rhythmic.png'),Buffer.from(result.rhythmicImage,'base64'));
  fs.writeFileSync(path.join(out,'speaker-detail.png'),Buffer.from(result.detailImage,'base64'));
  fs.writeFileSync(path.join(out,'visualizer-designs.png'),Buffer.from(result.galleryImage,'base64'));
  fs.writeFileSync(path.join(out,'visualizer-music-states.png'),Buffer.from(result.musicSheetImage,'base64'));
  for(const style of result.styles){fs.writeFileSync(path.join(out,'visualizer-'+style.id+'.png'),Buffer.from(style.sampleImage,'base64'));delete style.sampleImage;}
  for(const profile of result.profileResults)delete profile.panelImage;
  const report={...result,normal};delete report.quietImage;delete report.rhythmicImage;delete report.detailImage;delete report.galleryImage;delete report.musicSheetImage;
  fs.writeFileSync(path.join(out,'qa.json'),JSON.stringify(report,null,2)+'\n');
  // A real browser has no native preload capability: capture controls and the
  // experimental speakers must be unavailable even with the preview query.
  const web=new BrowserWindow({show:false,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true}});
  await web.loadFile(path.join(root,'index.html'),{query:{fresh:'1',dimensionEvents:'preview'}});
  const webPolicy=await web.webContents.executeJavaScript(`({enabled:NV.AudioPerimeter.enabled,
    hidden:document.getElementById('rhythm-widget').classList.contains('hidden'),
    selector:!!document.getElementById('nativeMusicStyle'),
    native:!!window.deadSingularityDesktopAudio})`);
  assert.equal(webPolicy.enabled,false);assert.equal(webPolicy.hidden,true);assert.equal(webPolicy.native,false);assert.equal(webPolicy.selector,false);web.destroy();
  console.log('SUBMISSION COST, not full-game FPS:',JSON.stringify({meanMs:result.drawSubmissionMeanMs,p95BatchMs:result.drawSubmissionP95BatchMs}));
  console.log('ANIMATED CPU UPDATE + SHARED PAINT + DRAW, not full-game FPS:',JSON.stringify({meanMs:result.animatedMeanMs,p95BatchMs:result.animatedP95BatchMs}));
  console.log('FOUR STYLES (CPU, not full-game FPS):',JSON.stringify(result.styles));
  console.log('PASS audio perimeter: preview isolation, strict exterior pixels, responsive movement, no warm canvas/gradient creation, no capture requests, Canvas state restored');
  win.destroy();app.exit(0);
}).catch(error=>{console.error(error);app.exit(1);});
