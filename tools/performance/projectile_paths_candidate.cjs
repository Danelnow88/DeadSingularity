// Browser-injected experiment only. NOT a runtime module or delivery resource.
// Pixel-equivalent, but the measured frame improvement was inconclusive.
(() => {
  'use strict';
  const NV=window.NV,original=NV.drawBulletShape,bulletPaths=new WeakMap();
  const shapes=new Set(['bullet','arrow','orb','pellet','flame']);
  let enabled=true,builds=0,hits=0;
  NV.setProjectilePathCacheEnabled=value=>{enabled=value!==false;};
  NV.getProjectilePathCacheStats=()=>({enabled,builds,hits});
  NV.drawBulletShape=function(ctx,b,def,g){
    const kind=def.shape;
    if(!enabled||typeof Path2D!=='function'||!shapes.has(kind))return original(ctx,b,def,g);
    let item=bulletPaths.get(def);
    if(!item||item.g!==g||item.kind!==kind||item.len!==def.len||item.w!==def.w||item.r!==def.r){
      const a=new Path2D(),second=new Path2D(),third=new Path2D();
      const L=(def.len||0)*(1+g),W=(def.w||0)*(1+g),r=(def.r||2.5)*(1+g);
      if(kind==='bullet'){
        a.rect(-L*.55,-W/2,L*.75,W);second.moveTo(L*.2,-W/2);second.lineTo(L*.5,0);second.lineTo(L*.2,W/2);second.closePath();
      }else if(kind==='arrow'){
        a.moveTo(-L*.55,0);a.lineTo(L*.42,0);second.moveTo(L*.42,-2.5);second.lineTo(L*.78,0);second.lineTo(L*.42,2.5);second.closePath();
        third.moveTo(-L*.55,0);third.lineTo(-L*.32,-3);third.moveTo(-L*.55,0);third.lineTo(-L*.32,3);
      }else if(kind==='orb'||kind==='pellet'){
        a.arc(0,0,r,0,Math.PI*2);if(kind==='orb')second.arc(0,0,r*.5,0,Math.PI*2);
      }else{
        a.moveTo(L*.45,0);a.quadraticCurveTo(0,-W/2,-L*.55,0);a.quadraticCurveTo(0,W/2,L*.45,0);a.closePath();
        second.moveTo(L*.18,0);second.quadraticCurveTo(0,-W*.35,-L*.22,0);second.quadraticCurveTo(0,W*.35,L*.18,0);second.closePath();
      }
      item={g,kind,len:def.len,w:def.w,r:def.r,a,second,third,radius:r};bulletPaths.set(def,item);builds++;
    }else hits++;
    ctx.save();ctx.translate(b.x,b.y);ctx.rotate(Math.atan2(b.vy,b.vx));ctx.fillStyle=ctx.strokeStyle=b.color;
    if(kind==='arrow'){ctx.lineWidth=1.6;ctx.stroke(item.a);ctx.fill(item.second);ctx.stroke(item.third);}
    else if(kind==='orb'){ctx.fill(item.a);ctx.fillStyle='rgba(255,255,255,0.5)';ctx.fill(item.second);}
    else if(kind==='pellet'){
      const r=item.radius;ctx.globalAlpha=.92;ctx.fillStyle='#fff4cf';ctx.fill(item.a);
      ctx.globalAlpha=.48;ctx.fillStyle=b.color;ctx.fillRect(-r*1.8,-r*.28,r*1.6,r*.56);
    }else if(kind==='flame'){
      ctx.fill(item.a);ctx.globalAlpha=.6;ctx.fillStyle='rgba(255,255,255,0.9)';ctx.fill(item.second);ctx.globalAlpha=1;
    }else{ctx.fill(item.a);ctx.fill(item.second);}
    ctx.restore();
  };
})();
