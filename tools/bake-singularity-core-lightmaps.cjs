'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(__dirname,'..');
if(!process.versions.electron){
 const {spawn}=require('node:child_process'),env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const p=spawn(require(path.join(root,'node_modules/electron')),[__filename],{env,windowsHide:true,stdio:'inherit'});
 p.on('exit',c=>process.exitCode=c??1);p.on('error',e=>{console.error(e);process.exitCode=1;});
}else{
 const {app,nativeImage}=require('electron');
 app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'ds-core-bake-')));
 app.whenReady().then(()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/singularity-family/manifest.json')));
  const out=path.join(root,'assets/singularity-family/lighting');fs.mkdirSync(out,{recursive:true});
  const colors={runner:[54,214,250],tank:[255,155,50],swarmlet:[237,113,164],spitter:[176,229,42],wisp:[237,245,255],kamikaze:[255,100,110],specter_archer:[244,205,64],specter_guard:[54,199,151],specter_core:[150,92,255]};
  const bands={runner:[175,207],tank:[14,43],swarmlet:[321,355],spitter:[62,96],kamikaze:[348,18],specter_archer:[39,64],specter_guard:[142,178],specter_core:[245,292]};
  const metadata=[];
  function blur(input,w,h,sigma){
   const radius=Math.ceil(sigma*3),kernel=[];let sum=0;
   for(let k=-radius;k<=radius;k++){const v=Math.exp(-k*k/(2*sigma*sigma));kernel.push(v);sum+=v;}
   for(let k=0;k<kernel.length;k++)kernel[k]/=sum;
   const temp=new Float32Array(input.length),output=new Float32Array(input.length);
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=0;for(let k=-radius;k<=radius;k++){const xx=x+k;if(xx>=0&&xx<w)v+=input[y*w+xx]*kernel[k+radius];}temp[y*w+x]=v;}
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=0;for(let k=-radius;k<=radius;k++){const yy=y+k;if(yy>=0&&yy<h)v+=temp[yy*w+x]*kernel[k+radius];}output[y*w+x]=v;}
   return output;
  }
  for(const sprite of manifest.sprites){
   const b=sprite.sourceBounds;
   const k=256/Math.max(b.width,b.height),cw=Math.round(b.width*k),ch=Math.round(b.height*k),pad=48,w=cw+pad*2,h=ch+pad*2;
   const src=nativeImage.createFromPath(path.join(root,'assets/singularity-family',sprite.id+'.png')).crop({x:b.x,y:b.y,width:b.width,height:b.height}).resize({width:cw,height:ch,quality:'best'}).toBitmap();
   const mask=new Float32Array(w*h),alpha=new Float32Array(w*h);let selected=0;
   for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
    const o=(y*cw+x)*4,B=src[o],G=src[o+1],R=src[o+2],a=src[o+3]/255,ix=(y+pad)*w+x+pad;
    alpha[ix]=a;if(a<.1)continue;
    // The telescopic sleeves move independently; they must not leave a stationary light ghost.
    if(sprite.id==='tank'&&b.x+x/k<580&&b.y+y/k>440&&b.y+y/k<750)continue;
    const hi=Math.max(R,G,B),lo=Math.min(R,G,B),delta=hi-lo,sat=hi?delta/hi:0;
    let weight=0;
    if(sprite.id==='wisp'){
     if(hi>125&&sat<.28&&B>R+3&&G>R-4)weight=Math.min(1,(hi-105)/100)*a;
    }else if(delta>25&&hi>95&&sat>.30){
     let hue=delta===0?0:hi===R?60*((G-B)/delta%6):hi===G?60*((B-R)/delta+2):60*((R-G)/delta+4);if(hue<0)hue+=360;
     const [low,high]=bands[sprite.id],inside=low<high?hue>=low&&hue<=high:hue>=low||hue<=high;
     if(inside)weight=Math.min(1,(hi-75)/105)*Math.min(1,(sat-.25)/.35)*a;
    }
    mask[ix]=weight;if(weight>.15)selected++;
   }
   if(selected<30)throw Error('Insufficient core mask: '+sprite.id);
   const close=blur(mask,w,h,2),spill=blur(mask,w,h,14),wide=blur(mask,w,h,32),pixels=Buffer.alloc(w*h*4),rgb=colors[sprite.id];
   for(let i=0;i<w*h;i++){
    // Light is strongest on actual colored tissue; broad spill softly tints its neighbors.
    // No outlines, solid circles, or frame-time blur. A broad transparent falloff follows the emitting tissue.
    const emit=mask[i]*1.15+close[i]*.8;
    const bleed=spill[i]*1.7+Math.pow(wide[i],.72)*1.45;
    const a=Math.min(1,emit+bleed);
    const white=.25*mask[i];
    // NativeImage's raw Windows bitmap uses premultiplied BGRA.
    pixels[i*4]=Math.round((rgb[2]*(1-white)+255*white)*a);
    pixels[i*4+1]=Math.round((rgb[1]*(1-white)+255*white)*a);
    pixels[i*4+2]=Math.round((rgb[0]*(1-white)+255*white)*a);
    pixels[i*4+3]=Math.round(a*255);
   }
   const png=nativeImage.createFromBitmap(pixels,{width:w,height:h,scaleFactor:1}).toPNG();
   fs.writeFileSync(path.join(out,sprite.id+'.png'),png);
   metadata.push({id:sprite.id,width:w,height:h,padding:pad,coreWidth:cw,coreHeight:ch,selectedPixels:selected,bytes:png.length});
  }
  fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({version:'core-light-v2',method:'Offline hue-mask + three separable Gaussian convolutions; original sprite files unchanged',textures:metadata},null,2));
  console.log('Baked nine core emission/spill maps: '+metadata.reduce((n,s)=>n+s.bytes,0)+' PNG bytes');app.exit(0);
 }).catch(e=>{console.error(e);app.exit(1);});
}
