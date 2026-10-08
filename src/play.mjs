import {InputChannel,GameState} from './game/input.mjs';
import {bindInput} from './game/input-dom.mjs';
import {VerticalCycle,AudioStub,SAVE_KEY} from './game/cycle.mjs';
const el=id=>document.getElementById(id),canvas=el('scene'),ctx=canvas.getContext('2d'),state=new GameState(document.documentElement),input=new InputChannel(),game=new VerticalCycle({state}),audio=new AudioStub();input.policy='legacy-auto';let last=0,frames=0;
const binding=bindInput(input,{canvas,stick:el('stick'),buttons:{dash:el('dash')},state,toWorld:(x,y)=>game.world.toWorld(x,y)});
const notify=text=>{el('message').textContent=text;};
el('pause').onclick=()=>{state.togglePause();binding.stateChanged();};el('policy').onchange=()=>{input.policy=el('policy').value;};
el('buy').onclick=()=>{if(game.buyHp())notify('Vida mejorada');};el('deploy').onclick=()=>{game.deploy();input.clear();binding.stateChanged();notify('');};
el('restart').onclick=()=>{game.newRun();input.clear();binding.stateChanged();notify('');};
el('save').onclick=()=>{try{localStorage.setItem(SAVE_KEY,JSON.stringify(game.checkpoint()));notify('Checkpoint V1 guardado');}catch(e){notify('No se pudo guardar: '+e.message);}};
el('load').onclick=()=>{try{game.load(JSON.parse(localStorage.getItem(SAVE_KEY)));input.clear();binding.stateChanged();notify('Checkpoint V1 cargado');}catch(e){notify('No se pudo cargar: '+e.message);}};
el('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{notify('El navegador no permitió pantalla completa');}};
function render(){
  const view=game.world,box=canvas.getBoundingClientRect(),w=box.width,h=box.height,dpr=view.dpr;
  const pw=Math.round(w*dpr),ph=Math.round(h*dpr);if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph;}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#070e1a';ctx.fillRect(0,0,w,h);ctx.save();ctx.translate(view.mobile?view.offset.x:0,view.mobile?view.offset.y:0);ctx.scale(view.mobile?view.scale:w/view.view.width,view.mobile?view.scale:h/520);ctx.translate(-view.camera.x,-view.camera.y);
  ctx.fillStyle='#14263b';ctx.fillRect(0,0,view.arena.width,view.arena.height);ctx.strokeStyle='#567c90';ctx.lineWidth=3;ctx.strokeRect(1,1,view.arena.width-2,view.arena.height-2);
  const circle=(x,y,r,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();};
  for(const e of game.enemies){if(e.arrival>0){ctx.strokeStyle='#f5bf7d';ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,14+e.arrival*12,0,Math.PI*2);ctx.stroke();}else{circle(e.x,e.y,11,e.phase==='signal'?'#ffe399':e.phase==='press'?'#ff546c':'#f07bad');circle(e.x,e.y-2,3,'#151024');}}
  for(const d of game.drops){ctx.fillStyle='#9eeaff';ctx.fillRect(d.x-4,d.y-4,8,8);}for(const b of game.bullets)circle(b.x,b.y,3,'#ffffff');
  const p=game.body.position;circle(p.x,p.y,22,game.invulnerable>0?'#ffffff':'#7cf8ff');circle(p.x-6,p.y-3,3,'#091725');circle(p.x+6,p.y-3,3,'#091725');ctx.restore();
}
function frame(time){
  const dt=last?Math.min(.05,(time-last)/1000):0;last=time;const mobile=matchMedia('(pointer:coarse)').matches,box=canvas.getBoundingClientRect();
  if(!state.portrait)game.world.resize({width:box.width,height:box.height,left:box.left,top:box.top,mobile,dpr:devicePixelRatio});
  input.pollGamepad(Array.from(navigator.getGamepads?.()||[]).find(Boolean),game.body.position);let intent=input.sample(game.body.position,mobile);
  if(intent.events.some(e=>e.action==='pause')){state.togglePause();binding.stateChanged();intent=input.sample(game.body.position,mobile);}
  game.update(dt,intent);binding.stateChanged();if(!state.portrait)render();audio.consume(game.drain());frames++;
  el('hud').textContent=`VIDA ${game.hp}/${game.maxHp} · NV ${game.playerLevel} · OLEADA ${game.wave} · ${game.killed}/${game.rules.objective} · ${Math.ceil(game.remaining)} s · ◆ ${game.coins} · DASH ${Math.floor(game.body.energy)}`;
  el('pause').textContent=state.userPaused?'Reanudar':'Pausar';el('balance').textContent=`◆ ${game.coins} · Vida ${game.hp}/${game.maxHp}`;el('buy').textContent=`+25 HP · ◆ ${game.price()} · ${game.purchases}/6`;
  el('buy').disabled=state.state!=='shop'||game.coins<game.price()||game.purchases>=6;
  if(state.state==='wave_end')notify('Oleada completa — recogiendo fragmentos');else if(state.state==='shop_enter')notify('Entrando a la tienda');else if(state.state==='shop'&&['Oleada completa — recogiendo fragmentos','Entrando a la tienda'].includes(el('message').textContent))notify('');
  if(state.state==='gameover')notify('Fin de partida — Nueva partida para volver a intentar');
  requestAnimationFrame(frame);
}requestAnimationFrame(frame);
window.__vertical={snapshot:()=>({state:state.state,paused:state.paused,frames,wave:game.wave,hp:game.hp,maxHp:game.maxHp,coins:game.coins,killed:game.killed,spawned:game.spawned,x:game.body.position.x,energy:game.body.energy}),game,input};
