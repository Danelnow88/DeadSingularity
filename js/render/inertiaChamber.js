// Inertia obelisk: carved faces and luminous conduits, no floating telemetry.
(() => {
  'use strict';const NV=window.NV;
  const spriteBase=typeof document!=='undefined'&&document.currentScript&&document.currentScript.src
    ? new URL('../../assets/dimension-cores/',document.currentScript.src).href : 'assets/dimension-cores/';
  const spriteDefinitions=[
    {file:'core-cyan-rig-v3.png',split:.72,width:96,anchorX:.50,anchorY:.44,color:'#70e6ef',
      podWidth:24,podAnchorY:.30,mouthY:.86,thrusters:[
      {x:-37,y:6,scale:.86,length:17,width:14,phase:0},
      {x:39,y:6,scale:.86,length:17,width:14,phase:1.7},
      {x:-30,y:34,scale:1,length:19,width:16,phase:.8},
      {x:32,y:36,scale:1,length:19,width:16,phase:2.5}]},
    {file:'core-gold-rig-v3.png',split:.72,width:86,anchorX:.50,anchorY:.44,color:'#ffd77d',
      podWidth:23,podAnchorY:.35,mouthY:.93,cables:true,thrusters:[
      {x:-49,y:30,socketX:-27,socketY:35,scale:1,length:23,width:18,phase:.5},
      {x:49,y:30,socketX:12,socketY:46,scale:1,length:23,width:18,phase:2.2},
      {x:47,y:-18,socketX:26,socketY:39,scale:.85,auxiliary:true,back:true,length:18,width:14,phase:3.6}]},
    {file:'core-magenta-body-v3.png',width:92,anchorX:.50,anchorY:.42,color:'#fc79d1',thrusters:[
      {x:0,y:55,length:30,width:32,phase:1.1}]},
  ];
  const THRUST_FRAMES=8,THRUST_CELL_W=128,THRUST_CELL_H=64;
  const spriteCache=[];
  // One small atlas per palette, built once on loading, not particles / live blur.
  function thrustAtlas(color) {
    const atlas=document.createElement('canvas');
    atlas.width=THRUST_FRAMES*THRUST_CELL_W;atlas.height=THRUST_CELL_H;
    const c=atlas.getContext('2d');if(!c)return null;
    for(let frame=0;frame<THRUST_FRAMES;frame++) {
      c.save();c.translate(frame*THRUST_CELL_W,0);
      const phase=frame/THRUST_FRAMES*Math.PI*2;
      const tail=104+8*Math.sin(phase),spread=12+2*Math.cos(phase);
      const glow=c.createLinearGradient(10,32,tail,32);
      glow.addColorStop(0,'#ffffff');glow.addColorStop(.12,color);
      glow.addColorStop(.60,color+'80');glow.addColorStop(1,color+'00');
      c.fillStyle=glow;
      for(let layer=0;layer<3;layer++) {
        const half=spread*(1-layer*.27);
        c.globalAlpha=layer===0?.25:layer===1?.45:.8;
        c.beginPath();c.moveTo(10,32-5);
        c.quadraticCurveTo(36,32-half,tail,32);
        c.quadraticCurveTo(38,32+half,10,32+5);c.closePath();c.fill();
      }
      // A moving compression knot stays inside the plume; no stray sparks.
      const knot=24+frame*8;
      c.globalAlpha=.34*(1-frame/THRUST_FRAMES);c.fillStyle='#fff9eb';
      c.beginPath();c.ellipse(knot,32,6,2.2,0,0,Math.PI*2);c.fill();
      c.restore();
    }
    return atlas;
  }
  function frameBitmap(image,left,right,width) {
    // Trim the sheet's transparent margins once; the saved art is unchanged.
    const sourceX=Math.round(image.naturalWidth*left),sourceW=Math.round(image.naturalWidth*right)-sourceX;
    const scan=document.createElement('canvas');scan.width=width;scan.height=Math.max(1,Math.round(width*image.naturalHeight/sourceW));
    const c=scan.getContext('2d');if(!c)return null;
    c.drawImage(image,sourceX,0,sourceW,image.naturalHeight,0,0,scan.width,scan.height);
    // Browsers may prohibit pixel readback when opening the roster via file://.
    // Keep the current cropped sprite usable even when automatic alpha trimming fails.
    let pixels;
    try{pixels=c.getImageData(0,0,scan.width,scan.height);}catch(_){return scan;}
    let x0=scan.width,y0=scan.height,x1=-1,y1=-1;
    if(pixels&&pixels.data)for(let y=0;y<scan.height;y++)for(let x=0;x<scan.width;x++) {
      if(pixels.data[(y*scan.width+x)*4+3]>40){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
    }
    if(x1<0)return scan;
    x0=Math.max(0,x0-2);y0=Math.max(0,y0-2);x1=Math.min(scan.width-1,x1+2);y1=Math.min(scan.height-1,y1+2);
    const trimmed=document.createElement('canvas');trimmed.width=width;
    trimmed.height=Math.max(1,Math.round(width*(y1-y0+1)/(x1-x0+1)));
    const t=trimmed.getContext('2d');if(!t)return scan;
    t.imageSmoothingQuality='high';
    t.drawImage(image,sourceX+x0*sourceW/scan.width,y0*image.naturalHeight/scan.height,
      (x1-x0+1)*sourceW/scan.width,(y1-y0+1)*image.naturalHeight/scan.height,0,0,trimmed.width,trimmed.height);
    return trimmed;
  }
  function updateRig(cached,def,target,age) {
    const elapsed=cached.lastAge===null||age<cached.lastAge?null:Math.min(.1,Math.max(0,age-cached.lastAge));
    for(let i=0;i<def.thrusters.length;i++) {
      const wanted=NV.InertiaRig?NV.InertiaRig.exhaustAngle(target,!!def.thrusters[i].auxiliary,!!def.cables):Math.PI/2;
      cached.angles[i]=elapsed===null||!NV.InertiaRig?wanted:NV.InertiaRig.approachAngle(cached.angles[i],wanted,elapsed);
    }
    cached.lastAge=age;
  }
  function drawCables(ctx,def,cached) {
    if(!def.cables||!cached.pod)return;
    ctx.save();ctx.filter='none';ctx.shadowBlur=0;
    for(let i=0;i<def.thrusters.length;i++) {
      const port=def.thrusters[i],podH=def.podWidth*port.scale*cached.pod.height/cached.pod.width;
      const angle=cached.angles[i]-Math.PI/2,neck=-podH*def.podAnchorY;
      const x=port.x-Math.sin(angle)*neck,y=port.y+Math.cos(angle)*neck;
      ctx.beginPath();ctx.moveTo(port.socketX,port.socketY);
      ctx.quadraticCurveTo((port.socketX+x)/2,Math.max(port.socketY,y)+10,x,y);
      ctx.strokeStyle='#13131c';ctx.lineWidth=3;ctx.stroke();
      ctx.strokeStyle='#72644d';ctx.lineWidth=1;ctx.stroke();
    }
    ctx.restore();
  }
  function drawThrusters(ctx,def,cached,age,charge,back) {
    if(!cached.thrust)return;
    const seconds=Number.isFinite(age)?age:0;
    ctx.save();ctx.filter='none';ctx.shadowBlur=0;
    for(let i=0;i<def.thrusters.length;i++) {
      const port=def.thrusters[i];if(!!port.back!==back)continue;
      const phase=seconds*7.5+port.phase;
      const pulse=1+.09*Math.sin(phase)+.035*Math.sin(phase*2.3);
      const frame=((Math.floor(seconds*14+port.phase*2)%THRUST_FRAMES)+THRUST_FRAMES)%THRUST_FRAMES;
      ctx.save();ctx.translate(port.x,port.y);ctx.rotate(cached.angles[i]-Math.PI/2);
      // Housing and flame share this gimbal transform, never separate angles.
      if(cached.pod) {
        const podW=def.podWidth*port.scale,podH=podW*cached.pod.height/cached.pod.width;
        ctx.drawImage(cached.pod,-podW/2,-podH*def.podAnchorY,podW,podH);
        ctx.translate(0,podH*(def.mouthY-def.podAnchorY));
      }
      ctx.rotate(Math.PI/2);ctx.globalCompositeOperation='lighter';
      ctx.globalAlpha=.65+.12*Math.sin(phase)+charge*.10;
      ctx.drawImage(cached.thrust,frame*THRUST_CELL_W,0,THRUST_CELL_W,THRUST_CELL_H,
        -2,-port.width/2,port.length*pulse,port.width);
      ctx.restore();
    }
    ctx.restore();
  }
  NV.preloadInertiaSprites=function() {
    if(typeof Image==='undefined')return;
    for(let i=0;i<spriteDefinitions.length;i++) {
      if(spriteCache[i])continue;
      const image=new Image();spriteCache[i]={image,ready:false,error:false,lastAge:null,
        angles:spriteDefinitions[i].thrusters.map(()=>Math.PI/2)};
      image.onload=()=>{
        if(typeof document!=='undefined'&&image.naturalWidth>0) {
          const def=spriteDefinitions[i];
          spriteCache[i].bitmap=frameBitmap(image,0,def.split||1,384);
          if(def.split)spriteCache[i].pod=frameBitmap(image,def.split,1,96);
          spriteCache[i].thrust=thrustAtlas(spriteDefinitions[i].color);
        }
        spriteCache[i].ready=image.naturalWidth>0;
        if(typeof window.dispatchEvent==='function'&&typeof Event!=='undefined')window.dispatchEvent(new Event('inertia-sprites-updated'));
      };
      image.onerror=()=>{spriteCache[i].error=true;if(typeof window.dispatchEvent==='function'&&typeof Event!=='undefined')window.dispatchEvent(new Event('inertia-sprites-updated'));};
      image.src=(NV.inertiaSpriteBaseUrl||spriteBase)+spriteDefinitions[i].file+'?nv=articulated-core-v3';
    }
  };
  NV.inertiaSpriteStatus=()=>spriteDefinitions.map((def,i)=>({file:def.file,
    ready:!!(spriteCache[i]&&spriteCache[i].ready),error:!!(spriteCache[i]&&spriteCache[i].error),
    articulated:!!(spriteCache[i]&&spriteCache[i].pod),rotors:spriteDefinitions[i].thrusters.length}));
  function drawSprite(ctx,view) {
    const target=view.target;
    if(!target)return false;
    NV.preloadInertiaSprites();
    const stage=Math.max(0,Math.min(2,target.pattern||0)),cached=spriteCache[stage],def=spriteDefinitions[stage];
    if(!cached||!cached.ready)return false;
    const image=cached.bitmap||cached.image,w=def.width,h=w*(image.height||image.naturalHeight)/(image.width||image.naturalWidth);
    const charge=target.windup>0?Math.max(0,Math.min(1,1-target.windup/.65)):0;
    const integrity=Math.max(0,Math.min(1,target.hp/target.maxHp));
    ctx.save();ctx.translate(target.x,target.y);
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    const age=Number.isFinite(view.age)?view.age:0;
    updateRig(cached,def,target,age);drawCables(ctx,def,cached);
    drawThrusters(ctx,def,cached,age,charge,true);
    // Damage and charge light the sprite itself, not a surrounding UI ring.
    const brightness=target.hitFlash>0?1.45:1+charge*.25;
    ctx.filter=brightness===1?'none':'brightness('+brightness+')';
    ctx.drawImage(image,-w*def.anchorX,-h*def.anchorY,w,h);ctx.filter='none';
    drawThrusters(ctx,def,cached,age,charge,false);
    // All designs keep their own identity at every HP level. Missing integrity
    // is shown through three tiny embedded energy facets, never a floating bar.
    ctx.fillStyle=def.color;
    for(let i=0;i<3;i++) {
      ctx.globalAlpha=integrity>i/3?.85:.12;
      const x=(i-1)*4,y=4;
      ctx.beginPath();ctx.moveTo(x,y-2);ctx.lineTo(x+1.5,y);ctx.lineTo(x,y+2);ctx.lineTo(x-1.5,y);ctx.closePath();ctx.fill();
    }
    ctx.globalAlpha=1;
    // These muzzle apertures exactly match the existing salvo directions.
    if(target.windup>0) {
      const ports=stage===0?[-.18,.18]:stage===1?[-.4,0,.4]:[0,Math.PI/2,Math.PI,Math.PI*1.5];
      ctx.strokeStyle='#ffe6ac';ctx.lineWidth=1+charge;ctx.globalAlpha=.3+charge*.7;
      for(const offset of ports) {
        const a=(target.aimAngle||0)+offset;
        ctx.beginPath();ctx.arc(Math.cos(a)*28,Math.sin(a)*28,1.5+charge,0,Math.PI*2);ctx.stroke();
      }
    }
    ctx.restore();return true;
  }
  NV.drawInertiaChamber=function(ctx,view) {
    if(!view)return;
    const palettes=['#87dfff','#be8bff','#f38bdd'];
    function polygon(points,fill,stroke) {
      ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
      for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
      ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}
      if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}
    }
    function material(a,b,fallback) {
      const gradient=ctx.createLinearGradient&&ctx.createLinearGradient(-22,-35,22,24);
      if(!gradient||typeof gradient.addColorStop!=='function')return fallback;
      gradient.addColorStop(0,a);gradient.addColorStop(1,b);return gradient;
    }
    ctx.save();ctx.lineWidth=1;
    if(view.target&&!drawSprite(ctx,view)) {
      const target=view.target,stage=Math.max(0,Math.min(2,target.pattern||0));
      const integrity=Math.max(0,Math.min(1,target.hp/target.maxHp));
      const charge=target.windup>0?Math.max(0,Math.min(1,1-target.windup/.65)):0;
      const struck=target.hitFlash>0;
      const energy=struck?'#fff5e6':target.windup>0?'#ffd69a':palettes[stage];
      ctx.translate(target.x,target.y);
      // Broad stepped plinth, anchored to the same physical objective position.
      ctx.fillStyle='rgba(0,0,0,.36)';ctx.beginPath();ctx.ellipse(4,27,32,10,0,0,Math.PI*2);ctx.fill();
      polygon([[-29,21],[0,5],[29,21],[0,38]],'#1b2134','#344054');
      polygon([[-26,18],[0,3],[26,18],[0,33]],'#303046','#565067');
      polygon([[-23,15],[0,2],[23,15],[0,29]],'#444059','#6d617c');
      polygon([[-21,-29],[0,-17],[0,25],[-21,13]],material('#4c3456','#231d32','#35233e'),'#625071');
      polygon([[0,-17],[21,-29],[21,13],[0,25]],material('#34283f','#161827','#252035'),'#4e425f');
      // Recessed vertical panel / ribs carved into both faces.
      polygon([[-8,-15],[-2,-12],[-2,23],[-8,19]],'#191627','#57435f');
      polygon([[2,-12],[8,-15],[8,19],[2,23]],'#111421','#4c3e59');
      ctx.strokeStyle='#725a7c';ctx.lineWidth=1;
      for(let i=0;i<3;i++) {
        const y=-13+i*10;
        ctx.beginPath();ctx.moveTo(-21,y-7);ctx.lineTo(-13,y-2);ctx.lineTo(-13,y+4);ctx.stroke();
        ctx.beginPath();ctx.moveTo(21,y-7);ctx.lineTo(13,y-2);ctx.lineTo(13,y+4);ctx.stroke();
      }
      // Lit chevrons form the tower's silhouette; their integrity is diegetic HP.
      ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle=energy;
      ctx.shadowColor=energy;ctx.shadowBlur=struck?10:4+charge*7;
      for(let i=0;i<3;i++) {
        ctx.globalAlpha=integrity>i/3?.62+.20*Math.sin(view.age*2+i*.3)+charge*.18:.14;
        const y=-10+i*10;
        ctx.lineWidth=1.6+charge;
        ctx.beginPath();ctx.moveTo(-19,y-9);ctx.lineTo(-10,y-4);ctx.lineTo(-10,y+2);ctx.stroke();
        ctx.beginPath();ctx.moveTo(19,y-9);ctx.lineTo(10,y-4);ctx.lineTo(10,y+2);ctx.stroke();
      }
      ctx.globalAlpha=.7+charge*.3;ctx.lineWidth=1.8;
      ctx.beginPath();ctx.moveTo(-10,12);ctx.lineTo(-10,18);ctx.lineTo(-17,14);ctx.lineTo(-17,3);ctx.stroke();
      ctx.beginPath();ctx.moveTo(10,12);ctx.lineTo(10,18);ctx.lineTo(17,14);ctx.lineTo(17,3);ctx.stroke();
      ctx.shadowBlur=0;ctx.globalAlpha=1;
      polygon([[0,-42],[21,-30],[0,-18],[-21,-30]],material('#8c718f','#4f405c','#706079'),'#b5a0bd');
      ctx.strokeStyle=struck?'#fff9ef':'#dfc9e4';ctx.lineWidth=1.8;
      ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(21,-30);ctx.stroke();
      // Gem sockets sit on the masonry rather than above the entity.
      for(let i=0;i<3;i++) {
        const x=(i-1)*9,y=-29+Math.abs(i-1)*2;
        polygon([[x,y-3],[x+2,y],[x,y+3],[x-2,y]],i<view.collected?'#f4dcac':'#6d5485','#baa2ce');
      }
      // Attack mouths preserve the actual, locked salvo direction and count.
      const ports=stage===0?[-.18,.18]:stage===1?[-.4,0,.4]:[0,Math.PI/2,Math.PI,Math.PI*1.5];
      for(const offset of ports) {
        const a=(target.aimAngle||0)+offset,x=Math.cos(a)*26,y=Math.sin(a)*26;
        ctx.save();ctx.translate(x,y);ctx.rotate(a);
        polygon([[-4,-3],[3,-2],[5,0],[3,2],[-4,3]],'#292336',target.windup>0?'#ffd69a':'#736083');
        if(target.windup>0){ctx.fillStyle='#fff1cb';ctx.globalAlpha=.3+.7*charge;ctx.fillRect(1,-1,3,2);}
        ctx.restore();
      }
      if(integrity<.5) {
        ctx.strokeStyle='#141220';ctx.lineWidth=1.6;ctx.beginPath();
        ctx.moveTo(-16,-21);ctx.lineTo(-13,-12);ctx.lineTo(-17,-6);ctx.lineTo(-14,5);ctx.stroke();
      }
    }
    ctx.restore();
    if(view.flash) {
      const t=1-view.flash.life/.45;
      ctx.save();ctx.translate(view.flash.x,view.flash.y);ctx.globalAlpha=1-t;ctx.lineWidth=1;
      for(let i=0;i<6;i++) {
        const a=i*Math.PI/3,d=8+t*24,x=Math.cos(a)*d,y=Math.sin(a)*d;
        polygon([[x-3,y-5],[x+3,y-2],[x+1,y+4],[x-2,y+1]],'#594364','#e5bdff');
      }
      ctx.restore();
    }
  };
})();
