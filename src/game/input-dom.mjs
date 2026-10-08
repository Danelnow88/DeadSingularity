// Adaptación DOM: teclado, cursor y multitouch; sin otro loop ni física.
export function bindInput(channel,{canvas,stick,buttons={},state,toWorld,onState=()=>{}}){
  const abort=new AbortController(),options={signal:abort.signal};let stickId=null;
  const stateChanged=()=>{channel.setBlocked(state.paused||!['playing','wave_end'].includes(state.state));onState();};
  const keyboard=event=>{
    if(event.target.closest?.('input,select,textarea'))return;
    if(/^(Key[WASDPFQEXZ]|Arrow|Shift|Space|Tab|Digit[1-6])/.test(event.code))event.preventDefault();
    channel.key(event.code,event.type==='keydown',event.repeat);
  };
  window.addEventListener('keydown',keyboard,options);window.addEventListener('keyup',keyboard,options);
  window.addEventListener('blur',()=>{channel.clear();state.suspended=true;state.sync();stateChanged();},options);
  window.addEventListener('focus',()=>{state.suspended=false;state.sync();stateChanged();},options);
  document.addEventListener('visibilitychange',()=>{channel.clear();state.suspended=document.hidden;state.sync();stateChanged();},options);
  function orient(){state.orient(matchMedia('(pointer:coarse)').matches,innerWidth,innerHeight);stateChanged();}
  window.addEventListener('resize',orient,options);orient();
  if(canvas){canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'){const p=toWorld(e.clientX,e.clientY);channel.aimWorld(p.x,p.y);}},options);
    canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button===0){canvas.setPointerCapture(e.pointerId);channel.button('mouse','fire',true);}},options);
    for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>channel.button('mouse','fire',false),options);
  }
  if(stick){
    const move=e=>{if(e.pointerId!==stickId)return;const r=stick.getBoundingClientRect(),x=(e.clientX-r.left-r.width/2)/(r.width*.35),y=(e.clientY-r.top-r.height/2)/(r.height*.35),n=Math.max(1,Math.hypot(x,y));channel.vector('touch',x/n,y/n);stick.firstElementChild.style.transform=`translate(${x/n*30}px,${y/n*30}px)`;};
    stick.addEventListener('pointerdown',e=>{if(stickId!==null)return;stickId=e.pointerId;stick.setPointerCapture(stickId);move(e);},options);
    stick.addEventListener('pointermove',move,options);
    for(const event of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(event,e=>{if(e.pointerId===stickId){stickId=null;channel.vector('touch',0,0);stick.firstElementChild.style.transform='';}},options);
  }
  for(const [action,element] of Object.entries(buttons)){
    let id=null;element.addEventListener('pointerdown',e=>{if(id!==null)return;id=e.pointerId;element.setPointerCapture(id);channel.button('touch',action,true);if(action==='use'&&!channel.blocked)channel.events.push({action});},options);
    for(const event of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(event,e=>{if(e.pointerId===id){id=null;channel.button('touch',action,false);}},options);
  }
  return {stateChanged,dispose:()=>abort.abort()};
}
