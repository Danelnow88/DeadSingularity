// Intenciones independientes del DOM. Los adaptadores no ejecutan gameplay.
const ACTION_KEYS={ShiftLeft:'dash',ShiftRight:'dash',Space:'special',KeyZ:'special',KeyX:'special'};
export function direction(x=0,y=0){const n=Math.hypot(x,y);return n>1e-6?{x:x/n,y:y/n,active:true}:{x:0,y:0,active:false};}
export function padAxis(value){const v=Number(value)||0;return Math.abs(v)<=.2?0:Math.sign(v)*Math.min(1,(Math.abs(v)-.2)/.8);}
const pressed=b=>!!(b&&(b.pressed||b.value>.55));
export class InputChannel{
  constructor(){this.keys=new Set();this.suppressed=new Set();this.touch={x:0,y:0};this.pad={x:0,y:0};this.buttons={};this.aim=null;this.previous={};this.events=[];this.blocked=false;this.policy='manual';}
  key(code,down,repeat=false){
    if(!down)this.suppressed.delete(code);
    if(down&&this.suppressed.has(code))return;
    const fresh=down&&!this.keys.has(code)&&!repeat;
    if(down)this.keys.add(code);else this.keys.delete(code);
    if(!fresh)return;
    const action={KeyP:'pause',Tab:'stats',KeyF:'use',KeyQ:'itemPrevious',KeyE:'itemNext'}[code];
    if(action&&(action==='pause'||!this.blocked))this.events.push({action});
    if(!this.blocked&&/^Digit[1-6]$/.test(code))this.events.push({action:'equip',index:Number(code.slice(5))-1});
  }
  button(source,action,down){const key=source+':'+action;if(!down)this.suppressed.delete(key);this.buttons[key]=!!down;}
  vector(source,x,y){this[source]={x:Number.isFinite(x)?Math.max(-1,Math.min(1,x)):0,y:Number.isFinite(y)?Math.max(-1,Math.min(1,y)):0};}
  aimWorld(x,y){if(Number.isFinite(x)&&Number.isFinite(y))this.aim={x,y};}
  pollGamepad(pad,origin){
    const b=pad?.buttons||[],a=pad?.axes||[];
    this.vector('pad',padAxis(a[0]),padAxis(a[1]));
    const rx=padAxis(a[2]),ry=padAxis(a[3]);if(Math.hypot(rx,ry)>.05)this.aimWorld(origin.x+rx*180,origin.y+ry*180);
    for(const [action,index] of [['fire',7],['dash',1],['special',0]])this.button('pad',action,pressed(b[index]));
    for(const [action,index] of [['weaponNext',5],['weaponPrevious',4],['itemNext',3],['use',2],['pause',9]]){
      const held=pressed(b[index]);if(held&&!this.previous[index]&&(action==='pause'||!this.blocked))this.events.push({action});this.previous[index]=held;
    }
  }
  setBlocked(value){
    value=!!value;if(value!==this.blocked){this.blocked=value;for(const key of this.keys)this.suppressed.add(key);for(const [key,held] of Object.entries(this.buttons))if(held)this.suppressed.add(key);this.keys.clear();this.touch={x:0,y:0};this.events=[];}
  }
  clear(){this.keys.clear();this.touch={x:0,y:0};this.pad={x:0,y:0};this.buttons={};this.aim=null;this.events=[];}
  sample(origin={x:0,y:0},mobile=false){
    const held=action=>Object.entries(this.buttons).some(([key,value])=>key.endsWith(':'+action)&&value&&!this.suppressed.has(key))||Object.entries(ACTION_KEYS).some(([key,value])=>value===action&&this.keys.has(key));
    const has=(...codes)=>codes.some(code=>this.keys.has(code));
    const keyboard=direction(Number(has('KeyD','ArrowRight'))-Number(has('KeyA','ArrowLeft')),Number(has('KeyS','ArrowDown'))-Number(has('KeyW','ArrowUp')));
    const move=direction(keyboard.x+this.touch.x+this.pad.x,keyboard.y+this.touch.y+this.pad.y);
    const aim=this.aim?direction(this.aim.x-origin.x,this.aim.y-origin.y):direction();
    const events=this.events.splice(0);
    return {x:this.blocked?0:move.x,y:this.blocked?0:move.y,aimX:aim.x,aimY:aim.y,aimActive:aim.active,
      dash:!this.blocked&&held('dash'),special:!this.blocked&&held('special'),fire:!this.blocked&&held('fire'),
      firePolicy:mobile?'legacy-auto':this.policy,events:this.blocked?events.filter(e=>e.action==='pause'):events};
  }
}
// Única autoridad de estado lógico y de atributos HTML.
export class GameState{
  constructor(element=null){this.element=element;this.state='playing';this.userPaused=false;this.portrait=false;this.suspended=false;this.sync();}
  get paused(){return this.userPaused||this.portrait||this.suspended;}
  set(state){this.state=state;this.sync();}
  togglePause(){if(this.state==='playing')this.userPaused=!this.userPaused;this.sync();}
  orient(mobile,width,height){this.portrait=mobile&&height>width;this.sync();}
  sync(){if(this.element){this.element.dataset.gameState=this.state;this.element.dataset.paused=String(this.paused);this.element.dataset.portrait=String(this.portrait);}}
}
