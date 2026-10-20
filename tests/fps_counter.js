const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const store={},events={},elements=[];
const NV={},box={window:{NV},console,Math,localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v},
  document:{createElement:()=>({setAttribute(){}}),body:{appendChild:e=>elements.push(e)},addEventListener:(key,fn)=>events[key]=fn}};
for(const file of ['core/settings','ui/fpsCounter'])vm.runInNewContext(fs.readFileSync('js/'+file+'.js','utf8'),box);
const output=elements[0];assert(output.hidden);assert.equal(NV.settings.graphics.showFPS,false);
NV.setGraphicsOption('showFPS',true);assert(!output.hidden);assert.equal(JSON.parse(store.deadSingularitySettings).graphics.showFPS,true);
for(let i=0;i<=84;i++)NV.updateFpsCounter(i*1000/165);
assert.equal(output.textContent,'165 FPS');
assert.equal(NV.getFpsCounterSnapshot().metric,'raf-callbacks');
assert.equal(NV.getFpsCounterSnapshot().presentedFPS,null,'rAF was advertised as optical presentation');
assert(NV.getFpsCounterSnapshot().worstMs<6.2);
NV.setGraphicsOption('showFPS',false);NV.setGraphicsOption('showFPS',true);
let stamp=0;NV.updateFpsCounter(stamp);
for(let i=0;i<100;i++){stamp+=(i%3===0?2:1)*1000/165;NV.updateFpsCounter(stamp);}
assert(Math.abs(parseInt(output.textContent,10)-124)<=1,'missed refresh intervals hidden by the median');
NV.setGraphicsOption('showFPS',false);const text=output.textContent;NV.updateFpsCounter(99999);assert.equal(output.textContent,text);assert(output.hidden);
NV.setGraphicsOption('showFPS',true);NV.updateFpsCounter(0);NV.updateFpsCounter(1000);assert.equal(output.textContent,'1 FPS','clamped gameplay dt used instead of actual rAF timestamps');
events.visibilitychange();assert.equal(output.textContent,'-- FPS');
NV.resetSettings();assert(output.hidden);assert.equal(JSON.parse(store.deadSingularitySettings).graphics.showFPS,false);
const saved=store.deadSingularitySettings;store.deadSingularitySettings=JSON.stringify({graphics:{showFPS:true}});
vm.runInNewContext(fs.readFileSync('js/core/settings.js','utf8'),box);assert.equal(NV.settings.graphics.showFPS,true);
store.deadSingularitySettings=saved;
const html=fs.readFileSync('index.html','utf8');assert(html.includes('id="settingsShowFPS"'));assert(html.includes('js/ui/fpsCounter.js'));
console.log('PASS FPS: opt-in persistence/reset, true rAF cadence, hidden fast path and visibility reset');
