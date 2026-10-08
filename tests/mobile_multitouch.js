const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function run(pointer){
 const elements={},flags={},handlers={};let contexts=0,draws=0;
 function element(){return {handlers:{},classList:{add(){},remove(){},toggle(){},contains(){return false;}},style:{},setAttribute(){},getAttribute(){return ''},addEventListener(type,fn){(this.handlers[type]||=[]).push(fn);},querySelector(){return null;},getBoundingClientRect(){return {left:0,top:0,width:100,height:100}}};}
 const root=element();root.getAttribute=key=>key==='data-game-state'?'playing':'false';
 const doc={documentElement:root,getElementById(id){if(['shopTabs','shop','lobbyFullscreenBtn','fullscreenBtn'].includes(id))return null;return elements[id]||=element();},addEventListener(type,fn){(handlers[type]||=[]).push(fn);}};
 const cycles=[];
 const input={getWeaponInfo(){return {id:'pistol',name:'Pistola'};},getConsumableInfo(){return null;},cycleWeapon(dir){cycles.push(['weapon',dir]);},cycleConsumable(dir){cycles.push(['item',dir]);}};for(const key of ['MoveLeft','MoveRight','MoveUp','MoveDown','Slide','Special'])input['set'+key]=value=>flags[key]=value;
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
 if(pointer){fire(elements.touchSlideBtn,down,5);fire(elements.touchSlideBtn,'lostpointercapture',6);assert.equal(flags.Slide,true,'captura de otro dedo no libera DASH');fire(elements.touchSlideBtn,'lostpointercapture',5);assert.equal(flags.Slide,false);}
 assert.equal(elements.touchUseBtn.disabled,true,'sin items USAR queda deshabilitado');
 let uses=0;input.useSelected=()=>uses++;fire(elements.touchUseBtn,down,7);assert.equal(uses,0);
 input._onConsumableChange[0]({type:'shield',name:'Escudo',count:2});assert.equal(elements.touchUseBtn.disabled,false);fire(elements.touchUseBtn,down,7);assert.equal(uses,1);
 fire(elements.weaponIndicator,down,8);fire(handlers,up,9);assert.equal(cycles.length,0,'otro dedo no cambia equipo');fire(elements.weaponIndicator,up,8);assert.deepEqual(cycles.pop(),['weapon',1]);
 fire(elements.weaponIndicator,down,10,80,50);fire(elements.weaponIndicator,up,10,30,50);assert.deepEqual(cycles.pop(),['weapon',1]);
 fire(elements.consumableIndicator,down,11,30,50);fire(elements.consumableIndicator,up,11,80,50);assert.deepEqual(cycles.pop(),['item',-1]);
 fire(elements.weaponIndicator,down,12);fire(elements.weaponIndicator,pointer?'pointercancel':'touchcancel',12);fire(handlers,up,12);assert.equal(cycles.length,0,'cancelar no cicla');
 input.setMoveVector=(x,y)=>flags.vector=[x,y];
 fire(elements.joystickZone,down,13,80,30);assert.equal(flags.MoveRight,false,'agarre lejos de la base no salta');
 fire(elements.joystickZone,move,13,100,30);assert(flags.vector[0]>0&&flags.vector[0]<1&&flags.vector[1]===0,'intensidad analógica parcial');
 fire(elements.joystickZone,move,13,180,130);assert(Math.abs(Math.hypot(...flags.vector)-1)<1e-9,'diagonal limitada a la misma velocidad máxima');
 fire(handlers,'resize',13);assert.deepEqual(flags.vector,[0,0]);
}
run(true);run(false);console.log('PASS mobile_multitouch: Pointer/Touch, floating/analog stick, tap/swipe, consumption, independent fingers and resets');
