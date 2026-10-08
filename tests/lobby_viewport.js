'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('js/ui/lobbyViewport.js','utf8'),values={},events={};
const lobby={style:{setProperty(k,v){values[k]=v;}}};
const visualViewport={width:800,height:320,offsetLeft:0,offsetTop:12,addEventListener(k,fn){events['visual:'+k]=fn;}};
const window={NV:{capabilities:{isMobile:true}},innerWidth:980,innerHeight:573,visualViewport,addEventListener(k,fn){events[k]=fn;}};
const document={getElementById(){return lobby;},addEventListener(k,fn){events[k]=fn;}};
vm.runInNewContext(source,{window,document});
assert.equal(values['--nv-lobby-height'],'320px');assert.equal(values['--nv-lobby-width'],'800px');
assert.equal(values['--nv-lobby-top'],'12px');
visualViewport.height=360;events['visual:resize']();assert.equal(values['--nv-lobby-height'],'360px');
window.visualViewport=null;events.pageshow();assert.equal(values['--nv-lobby-height'],'573px');
const css=fs.readFileSync('css/lobby-cosmos.css','utf8');
assert(css.includes('text-size-adjust:100%')&&css.includes('minmax(0,1fr)'));
assert(css.includes('#startScreen #heroName { font-size:clamp(20px,3vw,26px)'));
assert(css.includes('.main-lobby-actions { flex:0 0 auto; }'));
window.NV.capabilities.isMobile=false;values['--nv-lobby-width']='unchanged';
vm.runInNewContext(source,{window,document});assert.equal(values['--nv-lobby-width'],'unchanged');
console.log('PASS lobby visual viewport: browser chrome, offsets, resize, restoration, fallback and desktop isolation.');

// Physical-browser diagnostics must work even when mobile detection is wrong.
const nodes=[],scheduled=new Map(),listeners={};let id=0;
function node(){const n={style:{},setAttribute(){},append(){},focus(){this.focused=true;},select(){this.selected=true;},remove(){this.removed=true;}};nodes.push(n);return n;}
let lobbyHidden=false,mutation,disconnected=false;
const diagnosticLobby={classList:{contains(){return lobbyHidden;}},querySelector(){return {getBoundingClientRect(){return {left:0,top:50,width:300,height:200};},scrollHeight:350,clientHeight:200};}};
const diagDocument={hidden:false,documentElement:{className:'desktop'},body:{appendChild(){}},getElementById(){return diagnosticLobby;},createElement:node,
  addEventListener(k,fn){listeners[k]=fn;},removeEventListener(k){delete listeners[k];}};
let frames=10;
const diagWindow={NV:{capabilities:{isMobile:false,orientation:'landscape'},lobbyAtmosphere:{getSnapshot(){return {frames,stopReason:'particles-disabled'};}}},
  location:{search:'?lobbydiag=1'},innerWidth:980,innerHeight:400,
  getComputedStyle(){return {fontSize:'48px',overflowY:'hidden'};},
  setTimeout(fn){scheduled.set(++id,fn);return id;},clearTimeout(k){scheduled.delete(k);},
  addEventListener(k,fn){listeners[k]=fn;},removeEventListener(k){delete listeners[k];},
  navigator:{clipboard:{async writeText(){}}}};
vm.runInNewContext(source,{window:diagWindow,document:diagDocument,MutationObserver:class{constructor(fn){mutation=fn;}observe(){}disconnect(){disconnected=true;}}});
let diagnostic=JSON.parse(nodes[1].value);
assert(nodes[0].style.cssText.includes('background:#8b0012'));
assert.equal(nodes[3].textContent,'COPIAR DIAGNÓSTICO');assert(nodes[3].style.cssText.includes('min-height:48px'));
assert(nodes[4].textContent.includes('DIAGNÓSTICO TEMPORAL'));
assert.equal(diagnostic.mobile,false);assert.equal(diagnostic.atmosphere.stopReason,'particles-disabled');
assert.equal(diagnostic.panels['.panel-piloto'].contentH,350);assert.equal(diagnostic.panels['#heroName'].font,'48px');
assert.equal(scheduled.size,1);
const next=scheduled.values().next().value;scheduled.clear();frames=40;next();
assert.equal(JSON.parse(nodes[1].value).framesSinceSample,30);
diagDocument.hidden=true;listeners.visibilitychange();assert.equal(scheduled.size,0);
diagDocument.hidden=false;listeners.visibilitychange();assert.equal(scheduled.size,1);
lobbyHidden=true;mutation();assert.equal(nodes[0].style.display,'none');assert.equal(scheduled.size,0);
lobbyHidden=false;mutation();assert.equal(nodes[0].style.display,'block');assert.equal(scheduled.size,1);
(async()=>{
  let copied;diagWindow.navigator.clipboard.writeText=async text=>{copied=text;};
  await nodes[3].onclick();assert.equal(copied,nodes[1].value);assert.equal(nodes[3].textContent,'COPIADO ✓');
  diagWindow.navigator.clipboard.writeText=async()=>{throw Error('denied');};
  await nodes[3].onclick();assert(nodes[1].selected&&nodes[1].focused);assert.equal(scheduled.size,0);
  nodes[2].onclick();assert.equal(scheduled.size,0);assert.equal(nodes[0].removed,true);assert(disconnected);assert.deepEqual(Object.keys(listeners),[]);
  console.log('PASS opt-in physical-browser diagnostics: red banner, large copy target, manual copy fallback, metrics and cleanup.');
})().catch(error=>{console.error(error);process.exitCode=1;});
