const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
  const {InputChannel,GameState,padAxis}=await import('../src/game/input.mjs');const {MotionBody}=await import('../src/game/motion.mjs');
  const NV={},context={NV,navigator:{},document:{getElementById:()=>null},addEventListener(){}};context.window=context;vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root,'reference/prototype/js/core/inputIntent.js'),'utf8'),context);NV.input={};
  vm.runInContext(fs.readFileSync(path.join(root,'reference/prototype/js/ui/gamepadControls.js'),'utf8'),context);
  let comparisons=0,cases=0;const near=(a,b)=>{assert(Math.abs(a-b)<1e-9,`${a} != ${b}`);comparisons++;};
  for(const speed of [195,225,170,210])for(const hz of [30,60,144]){
    const input=new InputChannel(),body=new MotionBody({speed});let dashStarts=0,lastDash=false;
    for(let f=0;f<hz*4;f++){
      const right=f<hz,down=f>=hz&&f<hz*2,analog=f>=hz*2&&f<hz*3;
      input.key('KeyD',right);input.key('KeyS',down);input.vector('touch',analog?.3:0,analog?-.7:0);input.key('ShiftLeft',f>=10&&f<30);
      input.aimWorld(body.position.x+30,body.position.y+40);
      const actual=input.sample(body.position),expected=NV.inputIntent.createCombatIntent('manual');
      NV.inputIntent.setMoveFromButtons(expected,{right,down});const combined=NV.inputIntent.normalizeVector(expected.moveX+(analog?.3:0),expected.moveY+(analog?-.7:0));
      NV.inputIntent.setAimWorld(expected,body.position.x+30,body.position.y+40,body.position.x,body.position.y);
      near(actual.x,combined.x);near(actual.y,combined.y);near(actual.aimX,expected.aimX);near(actual.aimY,expected.aimY);
      assert.equal(actual.firePolicy,NV.inputIntent.effectiveFirePolicy(expected,false));body.step(actual,1/hz);
      if(body.dashing&&!lastDash)dashStarts++;lastDash=body.dashing;
    }assert.equal(dashStarts,1);cases++;
  }
  for(const x of [-1,-.8,-.2,-.01,0,.2,.4,1,2])near(padAxis(x),NV.gamepad.axis(x));
  const input=new InputChannel(),buttons=Array.from({length:10},()=>({pressed:false,value:0}));buttons[1].pressed=true;buttons[7].value=.9;buttons[9].pressed=true;
  input.pollGamepad({axes:[.6,-.6,1,0],buttons},{x:10,y:20});let intent=input.sample({x:10,y:20});assert(intent.dash&&intent.fire&&intent.aimActive);assert.equal(intent.events[0].action,'pause');
  input.setBlocked(true);input.setBlocked(false);input.pollGamepad({axes:[],buttons},{x:0,y:0});assert(!input.sample().dash,'Mantener B durante pausa no dispara al volver');
  buttons[1].pressed=false;input.pollGamepad({axes:[],buttons},{x:0,y:0});buttons[1].pressed=true;input.pollGamepad({axes:[],buttons},{x:0,y:0});assert(input.sample().dash);
  input.clear();input.key('ShiftLeft',true);input.setBlocked(true);input.setBlocked(false);input.key('ShiftLeft',true,true);assert(!input.sample().dash);input.key('ShiftLeft',false);input.key('ShiftLeft',true);assert(input.sample().dash);
  input.clear();input.key('KeyF',true);input.key('KeyF',true,true);assert.equal(input.sample().events.filter(e=>e.action==='use').length,1);
  input.clear();input.button('touch','dash',true);assert(input.sample().dash);input.button('touch','dash',false);assert(!input.sample().dash);
  const element={dataset:{}},state=new GameState(element);state.togglePause();state.orient(true,360,800);assert(state.paused&&state.portrait);state.orient(true,800,360);assert(state.paused&&!state.portrait);state.togglePause();assert(!state.paused);assert.equal(element.dataset.paused,'false');assert.equal(element.dataset.gameState,'playing');
  input.policy='manual';assert.equal(input.sample({},true).firePolicy,'legacy-auto');input.setBlocked(true);assert(!input.sample().fire&&!input.sample().dash&&input.sample().x===0);
  const out=path.join(root,'local/validation');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'input.json'),JSON.stringify({pass:true,cases,comparisons,checks:['reference directions/aim/gamepad deadzone','dash press edge','pause held suppression','portrait/user pause independence','touch release','action repeat suppression']},null,2));
  console.log(`PASS input: ${cases} secuencias, ${comparisons} comparaciones + pausa, orientación y acciones.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
