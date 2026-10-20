// Browser-only experiment: same current path, clipped to disjoint integer tiles.
(() => {
 const NV=window.NV,cache=new WeakMap();
 NV.__sparseContext=ctx=>{
  if(cache.has(ctx))return cache.get(ctx);
  let rectangles=[],valid=true;const bound=new Map();
  const proxy=new Proxy(ctx,{get(target,key){
   if(key==='beginPath')return ()=>{rectangles.length=0;valid=true;target.beginPath();};
   if(key==='rect')return (x,y,w,h)=>{rectangles.push([x,y,w,h]);target.rect(x,y,w,h);};
   if(key==='fill')return (...args)=>{
    if(!valid||rectangles.length<2||args.length)return target.fill(...args);
    if(NV.__sparseMode==='buckets'){
     const m=target.getTransform();if(m.b||m.c)return target.fill();
     const ordered=rectangles.map(r=>({r,x:m.a*r[0]+m.e,y:m.d*r[1]+m.f,w:m.a*r[2],h:m.d*r[3]}));
     // Keep overlapping antialias footprints in the original single fill.
     for(let i=0;i<ordered.length;i++)for(let j=0;j<i;j++){const a=ordered[i],b=ordered[j];if(a.x<b.x+b.w+2&&b.x<a.x+a.w+2&&a.y<b.y+b.h+2&&b.y<a.y+a.h+2)return target.fill();}
     const morton=(x,y)=>{let result=0;x=Math.floor(x/64)&65535;y=Math.floor(y/64)&65535;for(let i=0;i<16;i++)result+=(x>>i&1)*2**(i*2)+(y>>i&1)*2**(i*2+1);return result;};
     for(const r of ordered)r.key=morton(r.x,r.y);ordered.sort((a,b)=>a.key-b.key);
     for(let i=0;i<ordered.length;){const end=Math.min(ordered.length,i+8+(ordered.length-i===9?1:0));target.beginPath();for(;i<end;i++)target.rect(...ordered[i].r);target.fill();}target.beginPath();return;
    }
    const m=target.getTransform(),tile=32,used=new Set();
    for(const [x,y,w,h] of rectangles){const ax=m.a*x+m.c*y+m.e,ay=m.b*x+m.d*y+m.f,bx=m.a*(x+w)+m.c*(y+h)+m.e,by=m.b*(x+w)+m.d*(y+h)+m.f;
     for(let yy=Math.max(0,Math.floor((Math.min(ay,by)-2)/tile));yy<=Math.min(Math.ceil(target.canvas.height/tile)-1,Math.floor((Math.max(ay,by)+2)/tile));yy++)
      for(let xx=Math.max(0,Math.floor((Math.min(ax,bx)-2)/tile));xx<=Math.min(Math.ceil(target.canvas.width/tile)-1,Math.floor((Math.max(ax,bx)+2)/tile));xx++)used.add(yy*65536+xx);
    }
    if(NV.__sparseMode==='union'||NV.__sparseMode==='localclip'){
     const p=new Path2D();for(const value of used)p.rect((value%65536)*tile,Math.floor(value/65536)*tile,tile,tile);
     if(NV.__sparseMode==='localclip'){
      const local=new Path2D();local.addPath(p,m.inverse());target.save();target.clip(local);target.fill();target.restore();return;
     }
     target.save();target.resetTransform();target.clip(p);target.setTransform(m);target.fill();target.restore();return;
    }
    for(const value of used){const x=(value%65536)*tile,y=Math.floor(value/65536)*tile,p=new Path2D();p.rect(x,y,tile,tile);target.save();
     if(NV.__sparseMode==='localtiles'){const local=new Path2D();local.addPath(p,m.inverse());target.clip(local);}
     else{target.resetTransform();target.clip(p);target.setTransform(m);}
     target.fill();target.restore();}
   };
   if(['moveTo','lineTo','arc','ellipse','quadraticCurveTo','bezierCurveTo','roundRect'].includes(key))return (...args)=>{valid=false;return target[key](...args);};
   const value=target[key];if(typeof value!=='function')return value;if(!bound.has(key))bound.set(key,value.bind(target));return bound.get(key);
  },set(target,key,value){target[key]=value;return true;}});cache.set(ctx,proxy);return proxy;
 };
})();
