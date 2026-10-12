/* Adapted from user's Sci-Fi V13 reference: graphics only, existing music bus.
   One selected instrument, fixed particle/ring pools and shared perimeter tile. */
(() => {
  'use strict';
  const NV=window.NV=window.NV||{},TAU=Math.PI*2,W=280,H=70,CAP=120,RINGS=8;
  const styles=Object.freeze([
    Object.freeze({id:'sparkler',name:'Sparkler',description:'Tres emisores de chispas multicolor con membrana y ondas de percusión.'}),
    Object.freeze({id:'chorus',name:'Chorus',description:'Cinco cuerdas luminosas pulsadas, con destellos que recorren cada cuerda.'}),
    Object.freeze({id:'prism',name:'Prism',description:'Seis haces cromáticos giratorios y un núcleo luminoso expansible.'}),
    Object.freeze({id:'volt',name:'Volt',description:'Cuatro emisores eléctricos: fragmentos, trazos y descargas luminosas.'})
  ]);
  const sparkColors=Object.freeze(['#ffc864','#00ffff','#ff55ee']);
  const chorusColors=Object.freeze(['#ffc864','#79cfff','#42ffc0','#ff55ee','#ff719a']);
  const voltColors=Object.freeze(['#00ffff','#ff55ee','#baff42','#ac79ff']);
  const sparkX=Object.freeze([56,140,224]),voltX=Object.freeze([42,106.4,173.6,238]);
  const prismColors=Object.freeze(['#ff7777','#ffe687','#baff78','#73ffec','#7daeff','#ed79ff']);
  const borders=Object.freeze({sparkler:'#ffc864',chorus:'#96c8ff',prism:'#ff96dc',volt:'#00ffc8'});
  // x,y,vx,vy,life,size,color channel; reused for all models. Negative life = free.
  const particles=new Float32Array(CAP*7),rings=new Float32Array(RINGS*6),glow=new Float32Array(5),pluck=new Float32Array(5);
  let selected='',lastContext=null,lastTime=-1,emitter=0,direction=1,cursor=0,ringCursor=0,accumulator=0,seed=1317;
  let particleCount=0,ringCount=0,lastPercussionId=0,areaScaleX=.84,areaScaleY=.28,visualLevel=0;
  const unit=v=>Number.isFinite(v)?Math.max(0,Math.min(1,v)):0;
  function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  function reset(id){
    selected=id;lastContext=null;lastTime=-1;emitter=0;direction=1;cursor=0;ringCursor=0;accumulator=0;seed=1317;
    particles.fill(0);rings.fill(0);glow.fill(0);pluck.fill(0);particleCount=0;ringCount=0;
    lastPercussionId=0;areaScaleX=.84;areaScaleY=.28;visualLevel=0;
  }
  function advance(n){emitter+=direction;if(emitter>=n){emitter=n-2;direction=-1;}else if(emitter<0){emitter=1;direction=1;}}
  function ring(x,y,color,strength){const o=(ringCursor++%RINGS)*6;rings[o]=x;rings[o+1]=y;rings[o+2]=2;rings[o+3]=1;rings[o+4]=color;rings[o+5]=unit(strength);}
  function spawn(x,y,vx,vy,size,color){const o=(cursor++%CAP)*7;
    particles[o]=x;particles[o+1]=y;particles[o+2]=vx;particles[o+3]=vy;particles[o+4]=1;particles[o+5]=size;particles[o+6]=color;
  }
  function dot(g,x,y,r,color,alpha){
    g.fillStyle=color;g.globalAlpha=Math.max(0,Math.min(1,alpha));g.beginPath();g.arc(x,y,Math.max(.15,r),0,TAU);g.fill();
  }
  function softLight(g,x,y,r,color,alpha){
    dot(g,x,y,r*2.4,color,alpha*.045);dot(g,x,y,r*1.6,color,alpha*.12);dot(g,x,y,r,color,alpha*.4);dot(g,x,y,r*.48,'#f6ffff',alpha*.8);
  }
  function percussion(g,dt,energy,colors){
    ringCount=0;for(let i=0;i<RINGS;i++){
      const o=i*6;if(rings[o+3]<=0)continue;
      rings[o+2]+=dt*(90+energy*150)*(.15+rings[o+5]*.85);rings[o+3]=Math.max(0,rings[o+3]-dt*4.5);
      if(!rings[o+3])continue;ringCount++;
      g.strokeStyle=colors[Math.round(rings[o+4])%colors.length];g.globalAlpha=rings[o+3]*rings[o+5]*.5;g.lineWidth=.6+rings[o+3]*rings[o+5]*1.5;
      g.beginPath();g.arc(rings[o],rings[o+1],rings[o+2],0,TAU);g.stroke();
    }
  }
  function applyMembrane(g,m,energy){
    const stroke=Number.isFinite(m.percussionStroke)?Math.max(-.18,Math.min(1,m.percussionStroke)):0,
      vibration=Math.sin(m._percussionAge*90)*unit(m.percussion)*.65;
    areaScaleX=.84+stroke*.11;areaScaleY=.28+energy*.11+stroke*.57;
    g.translate(W*.5,H*.5+vibration);g.rotate((unit(m.snarePulse)-unit(m.kickPulse))*.008);
    g.scale(areaScaleX,areaScaleY);g.translate(-W*.5,-H*.5);
  }
  function emissions(g,m,dt,energy,treble,level,small,electric){
    const colors=electric?voltColors:sparkColors,n=colors.length;
    const positions=electric?voltX:sparkX,x=positions[emitter];
    const rate=(unit(m.sustain)*5+unit(m.hatPulse)*18+unit(m.percussion)*(electric?300:230));
    accumulator=Math.min(12,accumulator+dt*rate*(small?.45:1));
    for(let count=Math.floor(accumulator);count>0;count--){
      accumulator--;const a=random()*TAU,speed=electric?45+random()*(level===3?150:70):18+random()*60;
      spawn(x,H*.5,Math.cos(a)*speed,Math.sin(a)*speed-(electric?0:18),.8+random()*1.5,emitter);
    }
    const drag=Math.exp(-dt*(electric?3.7:1.8)),speed=.5+energy*1.5;
    particleCount=0;
    for(let i=0;i<CAP;i++){
      const o=i*7;if(particles[o+4]<=0)continue;
      particles[o+2]*=drag;particles[o+3]=particles[o+3]*drag+(electric?0:dt*72);
      particles[o]+=particles[o+2]*dt*speed;particles[o+1]+=particles[o+3]*dt*speed;
      particles[o+4]=Math.max(0,particles[o+4]-dt*(electric?.7+treble*.7:.45+treble));
      if(particles[o]<0||particles[o]>W){particles[o+2]*=-.65;particles[o]=Math.max(0,Math.min(W,particles[o]));}
      if(particles[o+1]<0||particles[o+1]>H){particles[o+3]*=-.65;particles[o+1]=Math.max(0,Math.min(H,particles[o+1]));}
      if(particles[o+4]>0)particleCount++;
    }
    // Batch sparks by color and two fade bands instead of changing Canvas
    // state/stroking once for every particle. Persistent trails soften the bins.
    for(let color=0;color<n;color++)for(let fade=0;fade<2;fade++)for(let kind=0;kind<2;kind++){
      g.fillStyle=colors[color];g.strokeStyle=colors[color];g.globalAlpha=(fade?.78:.26)*(level?1:.3);g.lineWidth=1;g.beginPath();
      let used=false;
      for(let i=0;i<CAP;i++){
        const o=i*7,life=particles[o+4];
        if(life<=0||small&&i%2||Math.round(particles[o+6])!==color||(life>.48)!==!!fade)continue;
        const beam=electric||level===3&&i%2===0,px=particles[o],py=particles[o+1],size=particles[o+5];
        if(kind===1&&beam){g.moveTo(px,py);g.lineTo(px-particles[o+2]*.045,py-particles[o+3]*.045);used=true;}
        else if(kind===0){
          if(electric&&i%3===0){g.rect(px-size*.5,py-size*.5,size,size);used=true;}
          else if(!beam){const r=Math.max(.15,size*life);g.moveTo(px+r,py);g.arc(px,py,r,0,TAU);used=true;}
        }
      }
      if(used){if(kind)g.stroke();else g.fill();}
    }
    for(let i=0;i<n;i++){
      const px=positions[i];
      glow[i]+=((i===emitter?unit(m.percussion)*.85+unit(m.sustain)*.1:0)-glow[i])*(1-Math.exp(-dt*25));
      glow[i]=unit(glow[i]);const r=1.5+glow[i]*(2+energy*(electric?3:4));
      if(level)softLight(g,px,H*.5,r,colors[i],.2+glow[i]*.7);else dot(g,px,H*.5,1.5,colors[i],.15);
      if(electric&&glow[i]>.5&&level>=2){g.globalAlpha=glow[i]*energy*.3;g.strokeStyle=colors[i];g.lineWidth=1;g.beginPath();g.moveTo(px,0);g.lineTo(px,H);g.stroke();}
    }
  }
  function chorus(g,m,dt,energy,treble,level,small,hit){
    if(hit){advance(5);pluck[emitter]=unit(m.percussion);ring(W*(.15+emitter*.175),2,emitter,unit(m.percussion));
      for(let i=0;i<(small?3:5+Math.floor(energy*5));i++)spawn(emitter,0,0,60+random()*120,.8+random()*1.5,emitter);
    }
    for(let i=0;i<5;i++){
      pluck[i]*=Math.exp(-dt*3.7);const x=W*(.15+i*.175),amp=1+energy*3+pluck[i]*6,phase=i*1.731+m.rotation*.7;
      const stride=small?6:3;g.strokeStyle=chorusColors[i];g.globalAlpha=.3+pluck[i]*.6+energy*.1;g.lineWidth=.8+pluck[i]*1.5;g.beginPath();
      for(let y=0;y<=H;y+=stride){const px=x+Math.sin(y*.15+phase)*amp;if(!y)g.moveTo(px,y);else g.lineTo(px,y);}g.stroke();
      dot(g,x,2,1.5+pluck[i]*1.5,chorusColors[i],i===emitter&&level?.9:.3);
    }
    particleCount=0;for(let i=0;i<CAP;i++){
      const o=i*7;if(particles[o+4]<=0)continue;
      const channel=Math.round(particles[o+6]);particles[o+1]+=particles[o+3]*dt*(1+energy*1.5);
      particles[o+4]=Math.max(0,particles[o+4]-dt*(.48+treble*.6));
      if(particles[o+1]>H){particles[o+4]=0;continue;}particleCount++;
      const y=particles[o+1],amp=1+energy*3+pluck[channel]*6,px=W*(.15+channel*.175)+Math.sin(y*.15+channel*1.731+m.rotation*.7)*amp;
      dot(g,px,y,particles[o+5]*particles[o+4],chorusColors[channel],particles[o+4]);
    }
  }
  function prism(g,m,dt,energy,level,small,hit){
    const cx=W*.5,cy=H*.5,rotation=m.rotation*.45;
    if(hit&&level)ring(cx,cy,Math.floor(rotation)%6,unit(m.percussion));
    const beamLength=W*.7*(.20+energy*.7+unit(m.body)*.08),segments=small?6:10;
    for(let i=0;i<6;i++){
      const a=rotation+i/6*TAU,dx=Math.cos(a)*beamLength,dy=Math.sin(a)*beamLength,color=prismColors[i];
      // Piecewise feathered beam replaces six per-frame gradient allocations.
      for(let k=0;k<segments;k++){
        const start=k/segments,end=(k+1)/segments;
        g.strokeStyle=color;g.globalAlpha=(level?.3+energy*.5:.2)*(1-start)*(1-start);g.lineWidth=1+energy*2;
        g.beginPath();g.moveTo(cx+dx*start,cy+dy*start);g.lineTo(cx+dx*end,cy+dy*end);g.stroke();
      }
      if(level)softLight(g,cx+dx,cy+dy,1+energy*3,color,.5+energy*.5);
    }
    const r=1.5+unit(m.percussion)*7+unit(m.body)*1.5;
    softLight(g,cx,cy,r,'#ffe9a5',level?.6+energy*.35:.4);
  }
  function draw(id,g,c,m,tier){
    if(!Object.hasOwn(borders,id))return false;
    const fresh=selected!==id||g!==lastContext||m._time<lastTime||lastTime>=0&&m._time-lastTime>.25;if(fresh)reset(id);lastContext=g;
    const dt=lastTime<0?1/60:Math.max(0,Math.min(.1,m._time-lastTime));lastTime=m._time;
    const energy=unit(m.visualIntensity),treble=unit(m.brightness),level=energy<.045?0:energy<.23?1:energy<.55?2:3;
    visualLevel=level;
    const hit=m.percussionId>lastPercussionId&&unit(m.percussion)>.025;lastPercussionId=m.percussionId;
    if(fresh){g.globalAlpha=1;g.globalCompositeOperation='source-over';g.clearRect(0,0,320,64);g.fillStyle='#02050a';g.fillRect(0,0,320,64);}
    g.globalCompositeOperation='source-over';g.globalAlpha=1-Math.exp(-dt*(28+unit(m.drop)*32));
    g.fillStyle='#02050a';g.fillRect(0,0,320,64);g.globalAlpha=1;
    g.save();g.scale(320/W,64/H);g.save();applyMembrane(g,m,energy);
    g.globalCompositeOperation='lighter';
    const small=tier==='minimal';
    if(id==='chorus')chorus(g,m,dt,energy,treble,level,small,hit);
    else if(id==='prism')prism(g,m,dt,energy,level,small,hit);
    else{
      if(hit&&level){ring((id==='volt'?voltX:sparkX)[emitter],H*.5,emitter,unit(m.percussion));advance(id==='volt'?4:3);}
      emissions(g,m,dt,energy,treble,level,small,id==='volt');
    }
    percussion(g,dt,energy,id==='prism'?prismColors:id==='chorus'?chorusColors:id==='volt'?voltColors:sparkColors);g.restore();g.restore();
    g.globalCompositeOperation='source-over';g.globalAlpha=.4;g.strokeStyle=borders[id];g.lineWidth=.8;g.strokeRect(.5,.5,319,63);
    g.globalAlpha=1;
    return true;
  }
  NV.AudioVisualizerStyles=Object.freeze({styles,draw,reset:()=>reset(''),snapshot:()=>({selected,particleCount,ringCount,capacity:CAP,ringCapacity:RINGS,areaScaleX,areaScaleY,visualLevel})});
})();
