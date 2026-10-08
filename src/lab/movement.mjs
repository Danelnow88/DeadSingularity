import {MotionBody} from '../game/motion.mjs';
import {WorldView} from '../game/world.mjs';
const canvas=document.getElementById('scene'),ctx=canvas.getContext('2d'),profile=document.getElementById('profile');
const view=new WorldView();let body=new MotionBody({x:675,y:390,speed:195}),paused=false,last=0;
const keys=new Set(),touch={x:0,y:0,dash:false,pointer:null},stick=document.getElementById('stick');
function reset(){body=new MotionBody({x:675,y:390,speed:Number(profile.value)});}
function clear(){keys.clear();touch.x=touch.y=0;touch.dash=false;touch.pointer=null;dashPointer=null;stick.firstElementChild.style.transform='';body.setPauseLatch(false);}
function pause(){paused=!paused;clear();document.getElementById('pause').textContent=paused?'Reanudar':'Pausar';}
document.getElementById('reset').onclick=reset;profile.onchange=reset;document.getElementById('pause').onclick=pause;
window.addEventListener('keydown',event=>{if(/^(Key[WASD]|Arrow|Shift)/.test(event.code)){event.preventDefault();keys.add(event.code);}if(event.code==='KeyP'&&!event.repeat)pause();});
window.addEventListener('keyup',event=>keys.delete(event.code));window.addEventListener('blur',clear);document.addEventListener('visibilitychange',()=>{if(document.hidden){clear();last=0;}});
function moveStick(event){if(event.pointerId!==touch.pointer)return;const box=stick.getBoundingClientRect();const x=(event.clientX-box.left-box.width/2)/40,y=(event.clientY-box.top-box.height/2)/40;const size=Math.max(1,Math.hypot(x,y));touch.x=x/size;touch.y=y/size;stick.firstElementChild.style.transform=`translate(${touch.x*32}px,${touch.y*32}px)`;}
stick.onpointerdown=event=>{if(touch.pointer!==null)return;touch.pointer=event.pointerId;stick.setPointerCapture(event.pointerId);moveStick(event);};stick.onpointermove=moveStick;
function endStick(event){if(event.pointerId===touch.pointer){touch.pointer=null;touch.x=touch.y=0;stick.firstElementChild.style.transform='';}}
stick.onpointerup=endStick;stick.onpointercancel=endStick;stick.onlostpointercapture=endStick;
const dash=document.getElementById('dash');let dashPointer=null;
dash.onpointerdown=event=>{if(dashPointer!==null)return;dashPointer=event.pointerId;dash.setPointerCapture(event.pointerId);touch.dash=true;};
function endDash(event){if(event.pointerId===dashPointer){dashPointer=null;touch.dash=false;}}
dash.onpointerup=endDash;dash.onpointercancel=endDash;dash.onlostpointercapture=endDash;
function frame(time){
  const box=canvas.getBoundingClientRect(),width=Math.max(1,Math.round(box.width)),height=Math.max(1,Math.round(box.height));
  const mobile=matchMedia('(pointer:coarse)').matches;
  if(view.box.width!==width||view.box.height!==height||view.mobile!==mobile)view.resize({width,height,left:box.left,top:box.top,mobile,dpr:devicePixelRatio});
  const dt=last?Math.min(.05,(time-last)/1000):0;last=time;
  if(!paused){body.step({x:Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'))+touch.x,y:Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'))+touch.y,dash:keys.has('ShiftLeft')||keys.has('ShiftRight')||touch.dash},dt);view.confine(body.position);}
  view.follow(body.position.x,body.position.y);
  const pixelW=Math.round(width*view.dpr),pixelH=Math.round(height*view.dpr);
  if(canvas.width!==pixelW||canvas.height!==pixelH){canvas.width=pixelW;canvas.height=pixelH;}
  ctx.setTransform(view.dpr,0,0,view.dpr,0,0);ctx.fillStyle='#070e1a';ctx.fillRect(0,0,width,height);
  const scaleX=mobile?view.scale:width/view.view.width,scaleY=mobile?view.scale:height/view.view.height;
  ctx.save();ctx.translate(mobile?view.offset.x:0,mobile?view.offset.y:0);ctx.scale(scaleX,scaleY);ctx.translate(-view.camera.x,-view.camera.y);ctx.fillStyle='#13233a';ctx.fillRect(0,0,view.arena.width,view.arena.height);
  ctx.strokeStyle='#35566f';ctx.lineWidth=2;ctx.strokeRect(1,1,view.arena.width-2,view.arena.height-2);
  ctx.strokeStyle='#20364b';ctx.lineWidth=1;ctx.beginPath();for(let x=0;x<view.arena.width;x+=90){ctx.moveTo(x,0);ctx.lineTo(x,view.arena.height);}for(let y=0;y<view.arena.height;y+=90){ctx.moveTo(0,y);ctx.lineTo(view.arena.width,y);}ctx.stroke();
  ctx.fillStyle=body.dashing?'#ffffff':'#84e3ed';ctx.beginPath();ctx.arc(body.position.x,body.position.y,22,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#07101d';for(const offset of [-6,6]){ctx.beginPath();ctx.arc(body.position.x+offset,body.position.y-3,3,0,Math.PI*2);ctx.fill();}ctx.restore();
  document.getElementById('readout').textContent=`Energía ${Math.round(body.energy)}/100 · ${paused?'PAUSA':body.dashing?'DASH':'Movimiento'}`;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__motionLab={snapshot:()=>({x:body.position.x,y:body.position.y,energy:body.energy,paused,arena:{...view.arena},camera:{...view.camera}})};
