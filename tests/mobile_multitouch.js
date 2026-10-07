const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function run(pointer){
 const elements={},flags={},handlers={};let contexts=0,draws=0;
 function element(){return {handlers:{},classList:{add(){},remove(){},toggle(){},contains(){return false;}},style:{},setAttribute(){},getAttribute(){return ''},addEventListener(type,fn){(this.handlers[type]||=[]).push(fn);},querySelector(){return null;},getBoundingClientRect(){return {left:0,top:0,width:100,height:100}}};}
 const root=element();root.getAttribute=key=>key==='data-game-state'?'playing':'false';
 const doc={documentElement:root,getElementById(id){if(['shopTabs','shop','lobbyFullscreenBtn','fullscreenBtn'].includes(id))return null;return elements[id]||=element();},addEventListener(type,fn){(handlers[type]||=[]).push(fn);}};
 const input={getWeaponInfo(){return {id:'pistol',name:'Pistola'};}};for(const key of ['MoveLeft','MoveRight','MoveUp','MoveDown','Slide','Special'])input['set'+key]=value=>flags[key]=value;
 doc.getElementById('weaponIndicatorIcon').getContext=()=>{contexts++;return {clearRect(){}};};
 const win={NV:{capabilities:{isMobile:true},input,drawWeaponIcon(){draws++;}},document:doc,addEventListener(type,fn){(handlers[type]||=[]).push(fn);}};
 if(pointer)win.PointerEvent=function(){};
 vm.runInNewContext(fs.readFileSync('js/ui/mobileControls.js','utf8'),{window:win,document:doc,console});
 assert.equal(draws,1,'el icono inicial no se dibujó');input._onWeaponChange[0](input.getWeaponInfo());assert.equal(draws,2);assert.equal(contexts,1,'el contexto debe reutilizarse');
 function fire(target,type,id,x=50,y=50,other){const p={identifier:id,clientX:x,clientY:y};const event=pointer?{type,pointerId:id,clientX:x,clientY:y,preventDefault(){}}:{type,changedTouches:[p],touches:other?[other,p]:[p],preventDefault(){}};for(const fn of (target.handlers||target)[type]||[])fn(event);}
 const down=pointer?'pointerdown':'touchstart',move=pointer?'pointermove':'touchmove',up=pointer?'pointerup':'touchend';
 fire(elements.joystickZone,down,1);fire(elements.joystickZone,move,1,95,50,{identifier:2,clientX:0,clientY:50});assert.equal(flags.MoveRight,true);
 fire(handlers,up,2);assert.equal(flags.MoveRight,true,'otro dedo liberó el joystick');
 fire(elements.touchSlideBtn,down,2);assert.equal(flags.Slide,true);
 fire(handlers,up,3);assert.equal(flags.Slide,true,'otro dedo liberó el dash');
 fire(handlers,up,2);assert.equal(flags.Slide,false);
 fire(handlers,up,1);assert.equal(flags.MoveRight,false);
 fire(elements.touchSpecialBtn,down,4);fire(handlers,'blur',4);assert.equal(flags.Special,false);
}
run(true);run(false);console.log('PASS mobile_multitouch: Pointer/Touch, joystick, dedos independientes y blur');
