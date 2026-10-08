import {MotionBody} from '../game/motion.mjs';
import {WorldView} from '../game/world.mjs';
import {InputChannel,GameState} from '../game/input.mjs';
import {bindInput} from '../game/input-dom.mjs';
const el=id=>document.getElementById(id),canvas=el('scene'),ctx=canvas.getContext('2d'),view=new WorldView(),input=new InputChannel(),state=new GameState(document.documentElement);
let body,last=0,intent={};function reset(){body=new MotionBody({x:675,y:390,speed:Number(el('profile').value)});}reset();
const binding=bindInput(input,{canvas,stick:el('stick'),buttons:{dash:el('dash'),special:el('special'),use:el('use')},state,toWorld:(x,y)=>view.toWorld(x,y)});
el('pause').onclick=()=>{state.togglePause();binding.stateChanged();};el('reset').onclick=reset;el('profile').onchange=reset;el('policy').onchange=()=>{input.policy=el('policy').value;};
function frame(time){
  const dt=last?Math.min(.05,(time-last)/1000):0;last=time;input.pollGamepad(Array.from(navigator.getGamepads?.()||[]).find(Boolean),body.position);intent=input.sample(body.position,matchMedia('(pointer:coarse)').matches);
  if(intent.events.some(e=>e.action==='pause')){state.togglePause();binding.stateChanged();intent=input.sample(body.position);}
  if(!state.paused){body.step(intent,dt);view.confine(body.position);}else body.setPauseLatch(intent.dash);
  el('pause').textContent=state.userPaused?'Reanudar':'Pausar';
  if(!state.portrait){const box=canvas.getBoundingClientRect();view.resize({left:box.left,top:box.top,width:box.width,height:box.height,mobile:matchMedia('(pointer:coarse)').matches,dpr:devicePixelRatio});view.follow(body.position.x,body.position.y);
    const width=Math.round(box.width*view.dpr),height=Math.round(box.height*view.dpr);if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}ctx.setTransform(view.dpr,0,0,view.dpr,0,0);ctx.fillStyle='#070e1a';ctx.fillRect(0,0,box.width,box.height);
    const p=view.toScreen(body.position.x,body.position.y);ctx.fillStyle='#84e3ed';ctx.beginPath();ctx.arc(p.x-box.left,p.y-box.top,22,0,Math.PI*2);ctx.fill();
  }
  el('readout').textContent=`Energía ${Math.round(body.energy)} · ${state.paused?'PAUSA':intent.firePolicy==='manual'?'Manual':'Autoataque'}`;
  el('intent').textContent=`Entrada (${intent.x.toFixed(2)}, ${intent.y.toFixed(2)}) · disparo ${intent.fire} · especial ${intent.special} · ${intent.events.map(e=>e.action).join(', ')}`;
  requestAnimationFrame(frame);
}requestAnimationFrame(frame);
window.__inputLab={snapshot:()=>({x:body.position.x,y:body.position.y,energy:body.energy,paused:state.paused,intent,state:state.state})};
