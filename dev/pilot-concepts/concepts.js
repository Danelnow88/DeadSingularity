// Laboratorio aislado: usa el NV.drawPlayer LOCAL, sin copiar sus cuerpos.
// Registra Canvas y modifica sólo vértices del contorno y desplazamiento visual.
// No se carga en producción; sólo persiste copias de presets del laboratorio.
(() => {
  'use strict';
  const NV=window.NV,presets=NV.pilotLabPresets,geometry=NV.pilotLabGeometry;
  const env=presets.canonical.environment,N=env.noise,ANCHOR=env.anchor,TAU=Math.PI*2;
  const defaults=presets.canonical.settings,baseCache=new Map();
  const shapes={...NV.pilotAppearance.shapes};
  const settings=()=>presets.parameters();
  const seedOf=id=>NV.CHARACTER_ORDER.indexOf(id)*N.pilotSeedStep+N.seedBase;
  function hash(value){let x=value|0;x=Math.imul(x^(x>>>16),N.hashMix);x=Math.imul(x^(x>>>16),N.hashMix);return ((x^(x>>>16))>>>0)/4294967296;}
  function noise(seed,time){const k=Math.floor(time),f=time-k,s=f*f*(3-2*f);return (hash(seed+k*N.cellStep)*(1-s)+hash(seed+(k+1)*N.cellStep)*s)*2-1;}
  function player(id){return {x:0,y:0,character:id,hp:100,maxHp:100,invuln:0,phase:0,bulwark:0,shield:0,overdrive:0};}
  function record(id,frame,randomMode='sample'){
    const commands=[],stack=[],state={globalAlpha:1,shadowBlur:0},methods=new Map();
    const context=new Proxy(state,{
      get(target,key){
        if(key in target)return target[key];
        if(!methods.has(key))methods.set(key,(...args)=>{
          commands.push({op:key,args});
          if(key==='save')stack.push({...state});
          if(key==='restore'){const saved=stack.pop();for(const k of Object.keys(state))delete state[k];Object.assign(state,saved);}
        });
        return methods.get(key);
      },
      set(target,key,value){commands.push({set:key,value});target[key]=value;return true;},
    });
    let drawSeed=seedOf(id)+Math.floor(frame)*N.frameSeedStep,calls=0;
    const previous=Math.random;
    try{
      // Sólo esta página: muestras reproducibles para freeze. Restore síncrono
      // con finally. El juego real no carga esta instrumentación.
      Math.random=()=>randomMode==='zero'?.5:hash(drawSeed+(++calls)*N.drawSeedStep);
      (NV.drawPlayerOriginal || NV.drawPlayer)(context,player(id),NV.CHARACTERS,frame);
    }finally{Math.random=previous;}
    if(stack.length)throw Error('Stack Canvas desbalanceado');
    return commands;
  }
  function polygons(commands){
    const paths=[];let vertices=[];
    for(let i=0;i<commands.length;i++){
      const c=commands[i];if(c.op==='beginPath')vertices=[];
      else if(c.op==='moveTo'||c.op==='lineTo')vertices.push({index:i,x:c.args[0],y:c.args[1]});
      else if(c.op==='arc'||c.op==='ellipse'||c.op==='bezierCurveTo')vertices=[];
      else if(c.op==='closePath'&&vertices.length>=10){paths.push(vertices);vertices=[];}
    }return paths;
  }
  function experimental(id,frame,shape=shapes[id]){
    const p=settings()[id],detailFrame=ANCHOR+(frame-ANCHOR)*p.detailSpeed;
    const commands=record(id,detailFrame,'zero'),moving=polygons(record(id,ANCHOR+(frame-ANCHOR)*p.speed,'zero'));
    if(!baseCache.has(id))baseCache.set(id,polygons(record(id,ANCHOR)));
    const base=baseCache.get(id),output=polygons(commands);
    if(output.length!==base.length||output.length!==moving.length)throw Error('El renderer cambió: revisar adaptación de contornos');
    const weight=p.amplitude*(1-p.stability);
    for(let layer=0;layer<output.length;layer++){
      if(output[layer].length!==base[layer].length||output[layer].length!==moving[layer].length)throw Error('Topología diferente');
      const count=output[layer].length-1;
      for(let v=0;v<output[layer].length;v++){
        const a=v/count*TAU,b=base[layer][v],m=moving[layer][v];
        const jitter=noise(seedOf(id)+layer*N.layerSeedStep+(v%count)*N.vertexSeedStep,frame/env.fps*N.frequency)*N.amplitude*p.micro;
        commands[output[layer][v].index].args=[b.x+(m.x-b.x)*weight+Math.cos(a)*jitter,b.y+(m.y-b.y)*weight+Math.sin(a)*jitter];
      }
    }
    // Sólo se agrega una base geométrica distinta al MISMO campo de movimiento.
    // No se recalculan seeds, fases ni animación según los puntos de la forma nueva.
    if(shape!=='original')for(let layer=output.length-1;layer>=0;layer--){
      const path=output[layer],animated=path.map(v=>({x:commands[v.index].args[0],y:commands[v.index].args[1]}));
      const vertices=geometry.apply(shape,base[layer],animated);
      commands.splice(path[0].index,path.length,...vertices.map((p,i)=>({op:i?'lineTo':'moveTo',args:[p.x,p.y]})));
    }
    // Segundo translate = bob/respiración del cuerpo completo, ojos incluidos.
    // Los arcos y estilos de los ojos siguen siendo los del renderer real.
    let translates=0;
    for(const c of commands)if(c.op==='translate'&&++translates===2){c.args[1]*=env.bodyBobScale;break;}
    return commands;
  }
  function replay(ctx,commands){for(const c of commands){if(c.set)ctx[c.set]=c.value;else ctx[c.op](...c.args);}}
  function commandSample(id,frame,variant){return variant==='original'?record(id,frame):experimental(id,frame);}
  function movement(a,b){
    const pa=polygons(a),pb=polygons(b);let sum=0,max=0,count=0;
    for(let layer=0;layer<pa.length;layer++)for(let v=0;v<pa[layer].length-1;v++){
      const d=Math.hypot(pa[layer][v].x-pb[layer][v].x,pa[layer][v].y-pb[layer][v].y);sum+=d;max=Math.max(max,d);count++;
    }return {mean:sum/count,max,vertices:count};
  }
  function measure(){
    return NV.CHARACTER_ORDER.map(id=>{
      const result={id,parameters:{...settings()[id]},intervals:{}};
      for(const delta of [1,6,60,300]){
        const values={};
        for(const variant of ['original','experimental'])values[variant]=movement(commandSample(id,ANCHOR,variant),commandSample(id,ANCHOR+delta,variant));
        result.intervals[delta]={...values,reduction:1-values.experimental.mean/values.original.mean};
      }
      const totals={original:0,experimental:0};
      for(let sample=0;sample<20;sample++)for(const variant of ['original','experimental']){
        const f=ANCHOR+sample*60;
        totals[variant]+=movement(commandSample(id,f,variant),commandSample(id,f+6,variant)).mean;
      }
      result.multiWindow6={originalMean:totals.original/20,experimentalMean:totals.experimental/20,reduction:1-totals.experimental/totals.original,samples:20};
      return result;
    });
  }
  const canvas=document.getElementById('comparison'),ctx=canvas.getContext('2d');
  let frame=presets.canonical.capture.frame,paused=presets.canonical.capture.paused,last=performance.now(),lastPaint=-1;
  function paint(){
    ctx.fillStyle='#050914';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.font='600 17px system-ui';ctx.fillStyle='#c6d9ee';ctx.fillText('ORIGINAL ACTUAL',36,32);ctx.fillText('MISMA ANIMACIÓN · FORMA ELEGIDA',570,32);
    NV.CHARACTER_ORDER.forEach((id,row)=>{
      const y=58+row*310,p=settings()[id],left=record(id,frame),right=experimental(id,frame);
      ctx.strokeStyle='#192b41';ctx.beginPath();ctx.moveTo(24,y);ctx.lineTo(1076,y);ctx.stroke();
      ctx.fillStyle='#d9e7f7';ctx.font='600 16px system-ui';ctx.fillText(NV.CHARACTERS[id].name,36,y+27);
      ctx.fillStyle='#849ab0';ctx.font='12px system-ui';ctx.fillText(`Vel. ${p.speed.toFixed(2)} · amp. ${p.amplitude.toFixed(2)}`,570,y+27);
      ctx.fillText(`Estabilidad ${Math.round(p.stability*100)}%`,570,y+45);
      for(let col=0;col<2;col++){
        const commands=col?right:left;
        ctx.save();ctx.translate(270+col*534,y+140);ctx.scale(2.05,2.05);replay(ctx,commands);ctx.restore();
        ctx.save();ctx.translate(270+col*534,y+258);replay(ctx,commands);ctx.restore();
      }
      ctx.fillStyle='#6e849c';ctx.font='11px system-ui';ctx.fillText('Tamaño de combate',36,y+260);
    });
    document.getElementById('time').textContent=`Frame ${Math.round(frame)} · ${(frame/60).toFixed(2)} s`;
  }
  const pauseButton=document.getElementById('pause');
  function setPaused(value){paused=value;pauseButton.textContent=paused?'Reanudar':'Pausar';pauseButton.setAttribute('aria-pressed',String(paused));}
  pauseButton.addEventListener('click',()=>{setPaused(!paused);paint();});
  for(const button of document.querySelectorAll('[data-step]'))button.addEventListener('click',()=>{setPaused(true);frame+=Number(button.dataset.step);paint();});
  const selected=document.getElementById('pilot');
  const presetSelect=document.getElementById('preset'),shapeSelect=document.getElementById('shape');
  function syncControls(){
    for(const input of document.querySelectorAll('[data-param]')){input.value=settings()[selected.value][input.dataset.param];input.disabled=presets.isCanonical();input.nextElementSibling.value=Number(input.value).toFixed(2);}
    shapeSelect.value=shapes[selected.value];
    presetSelect.innerHTML='';for(const item of presets.list()){const option=document.createElement('option');option.value=item.id;option.textContent=item.name;presetSelect.appendChild(option);}presetSelect.value=presets.profile().id;
    document.getElementById('savePreset').disabled=presets.isCanonical();
    document.getElementById('presetStatus').textContent=presets.isCanonical()?'Base canónica protegida · animación bloqueada':'Copia editable · guardá tus ajustes para recuperarlos';
  }
  selected.addEventListener('change',syncControls);
  for(const input of document.querySelectorAll('[data-param]'))input.addEventListener('input',()=>{
    presets.edit(selected.value,input.dataset.param,Number(input.value));syncControls();paint();
  });
  function loadCanonical(){presets.load(presets.canonical.id);frame=presets.canonical.capture.frame;setPaused(presets.canonical.capture.paused);syncControls();paint();}
  document.getElementById('reset').addEventListener('click',loadCanonical);
  presetSelect.addEventListener('change',()=>{const id=presetSelect.value;if(id===presets.canonical.id)loadCanonical();else{presets.load(id);syncControls();paint();}});
  document.getElementById('duplicatePreset').addEventListener('click',()=>{
    const id=presets.duplicate(document.getElementById('presetName').value);if(!id){document.getElementById('presetStatus').textContent='Máximo 20 copias; exportá las existentes.';return;}syncControls();paint();
  });
  document.getElementById('savePreset').addEventListener('click',()=>{
    document.getElementById('presetStatus').textContent=presets.save()?'Copia guardada en este navegador':'No se pudo guardar en el navegador; exportá el JSON para conservarla.';
  });
  document.getElementById('exportPresets').addEventListener('click',()=>{
    const url=URL.createObjectURL(new Blob([JSON.stringify(presets.export(),null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='NEON_VOID_presets_visuales.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  function setShape(id,kind){if(!Object.hasOwn(shapes,id)||!geometry.names[kind])return false;shapes[id]=kind;return true;}
  shapeSelect.addEventListener('change',()=>{setShape(selected.value,shapeSelect.value);paint();});
  document.getElementById('anchor').addEventListener('click',()=>{frame=presets.canonical.capture.frame;setPaused(true);paint();});
  for(const button of document.querySelectorAll('[data-capture]'))button.addEventListener('click',()=>{
    setPaused(true);paint();const slot=button.dataset.capture,url=canvas.toDataURL(),panel=document.getElementById('capture-'+slot);panel.hidden=false;
    panel.querySelector('img').src=url;panel.querySelector('figcaption').textContent=`Captura ${slot.toUpperCase()} · frame ${Math.round(frame)}`;
    const link=panel.querySelector('a');link.href=url;link.download=`neon-void-pilotos-${slot}-f${Math.round(frame)}.png`;
  });
  document.getElementById('measure').addEventListener('click',()=>{
    const lines=measure().map(r=>`${NV.CHARACTERS[r.id].name}: +1f ${Math.round(r.intervals[1].reduction*100)}%, +6f ${Math.round(r.intervals[6].reduction*100)}% menos desplazamiento de vértices`);
    document.getElementById('metrics').textContent=lines.join('\n');
  });
  function loop(now){if(!paused)frame+=Math.min(env.maxDeltaMs,now-last)*(env.fps/1000);last=now;if(!paused&&now-lastPaint>=1000/env.redrawFps){paint();lastPaint=now;}requestAnimationFrame(loop);}
  window.pilotConcept={
    renderAt(value){frame=value;setPaused(true);paint();},measure,commandSample,polygons,presets,geometry,setShape,loadCanonical,
    nativeAnimationSample:(id,f)=>experimental(id,f,'original'),
    baseShape(id){if(!baseCache.has(id))experimental(id,ANCHOR,'original');return baseCache.get(id).map(path=>path.map(({x,y})=>({x,y})));},
    get settings(){return JSON.parse(JSON.stringify(settings()));},defaults,
    state:()=>({frame,paused,settings:JSON.parse(JSON.stringify(settings())),preset:presets.profile().id,shapes:{...shapes}}),
  };
  syncControls();setPaused(paused);paint();requestAnimationFrame(loop);
})();
