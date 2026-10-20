// Single-frame diagnostic. Counts actual Canvas submissions per current enemy.
// Counts are complexity indicators, not GPU timings; never used by normal game.
(() => {
  const NV=window.NV;
  NV.__countActorInk=draw=>{
    const stats=new Map(),original=new Map();
    for(const key of ['drawEnemy','drawSpectralEnemy2D','drawDimensionalThreatBody']){
      const fn=NV[key];if(typeof fn!=='function')continue;original.set(key,fn);
      NV[key]=function(ctx,e,...args){
        if(key==='drawDimensionalThreatBody'&&!['rift_weaver','dimension_sniper','void_devourer'].includes(e?.enemyTypeId))return fn.call(this,ctx,e,...args);
        const id=e?.visualId||e?.enemyTypeId||'unknown';
        const item=stats.get(id)||{id,instances:0,fills:0,strokes:0,images:0,blurredDraws:0,maxBlur:0,curves:0};
        item.instances++;stats.set(id,item);
        const methods=new Map();
        const proxy=new Proxy(ctx,{get(target,name){
          const value=target[name];if(typeof value!=='function')return value;
          if(!methods.has(name))methods.set(name,(...a)=>{
            if(['fill','fillRect','stroke','strokeRect','drawImage'].includes(name)){
              if(name==='drawImage')item.images++;else if(name.startsWith('stroke'))item.strokes++;else item.fills++;
              if(target.shadowBlur>0){item.blurredDraws++;item.maxBlur=Math.max(item.maxBlur,target.shadowBlur);}
            }
            if(['quadraticCurveTo','bezierCurveTo','arc','ellipse'].includes(name))item.curves++;
            return value.apply(target,a);
          });return methods.get(name);
        },set(target,name,value){target[name]=value;return true;}});
        return fn.call(this,proxy,e,...args);
      };
    }
    try{draw();}finally{for(const [key,fn]of original)NV[key]=fn;}
    return [...stats.values()].map(s=>({...s,drawsPerInstance:(s.fills+s.strokes+s.images)/s.instances}));
  };
})();
