const fs=require('node:fs'),path=require('node:path');
if(!process.versions.electron){
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const result=require('node:child_process').spawnSync(require(path.join(__dirname,'../node_modules/electron')),[__filename],{env,windowsHide:true,stdio:'inherit'});
 if(result.error)throw result.error;process.exit(result.status??1);
}
const {app,nativeImage}=require('electron');
const root=path.resolve(__dirname,'..');
app.setPath('userData',fs.mkdtempSync(path.join(require('node:os').tmpdir(),'ds-tank-bake-')));
app.whenReady().then(()=>{
 const original=nativeImage.createFromPath(root+'/assets/singularity-family/tank.png');
 const generated=nativeImage.createFromPath(path.join(root,'docs/art-direction/tank-animation/retracted-source.png'));
 const size=original.getSize(),w=size.width,h=size.height;if(generated.getSize().width!==w||generated.getSize().height!==h)throw Error('Generated framing changed');
 const src=original.toBitmap(),gen=generated.toBitmap(),body=Buffer.from(src),front=Buffer.alloc(src.length),mid=Buffer.alloc(src.length);
 const smooth=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
 const poly=[[65,520],[190,509],[252,508],[292,483],[380,470],[450,483],[510,512],[555,543],[562,638],[520,683],[465,704],[396,711],[333,705],[290,694],[210,705],[120,710],[70,688]];
 function inside(x,y){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const p=(y*w+x)*4;
  // Local repair only. All armor and tissue outside this feathered region are exact originals.
  const mix=smooth((640-x)/55)*smooth((y-420)/45)*smooth((790-y)/45);
  for(let c=0;c<4;c++)body[p+c]=Math.round(src[p+c]*(1-mix)+gen[p+c]*mix);
  if(x<570&&y>460&&y<740&&inside(x+.5,y+.5))src.copy(x<265?front:mid,p,p,p+4);
 }
 const out=path.join(root,'assets/singularity-family/tank-animation');fs.mkdirSync(out,{recursive:true});
 for(const [name,pixels]of [['body-retracted',body],['sleeve-front',front],['sleeve-middle',mid]])fs.writeFileSync(path.join(out,name+'.png'),nativeImage.createFromBitmap(pixels,{width:w,height:h,scaleFactor:1}).toPNG());
 let different=0,alpha=0;for(let p=0;p<body.length;p+=4){if(body[p]!==src[p]||body[p+1]!==src[p+1]||body[p+2]!==src[p+2]||body[p+3]!==src[p+3])different++;if(body[p+3]===0)alpha++;}
 console.log(JSON.stringify({size,locallyChangedPixels:different,transparentPixels:alpha}));app.exit();
}).catch(e=>{console.error(e);app.exit(1);});
