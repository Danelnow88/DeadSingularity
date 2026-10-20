'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const NV={},draws=[];
function context(canvas){return new Proxy({
  drawImage(image){canvas.source=image.source||image.src;draws.push(canvas.source);},
  createRadialGradient:()=>({addColorStop(){}}),
  getImageData:()=>({data:new Uint8ClampedArray(16).fill(255)})
},{get:(o,k)=>k in o?o[k]:()=>{}});}
class FakeImage{constructor(){this.naturalWidth=this.naturalHeight=2;}set src(value){this._src=value;this.onload();}get src(){return this._src;}}
const document={createElement:()=>{const canvas={};canvas.getContext=()=>context(canvas);return canvas;}};
vm.runInNewContext(fs.readFileSync('js/render/refinedElites.js','utf8'),{window:{NV},document,Image:FakeImage,Math,Map,WeakMap});
NV.prewarmRefinedElites();NV.prewarmRefinedEliteReadability();
for(const visualId of ['elite_predator','elite_phantom','elite_titan']){
  const e={visualId,refinedEliteReadability:true,x:0,y:0},before=JSON.stringify(e);
  draws.length=0;assert(NV.drawRefinedEliteBody(context({}),e,1,'',100,0));
  assert(draws[0].endsWith('-readable-v2.png'),'production uses approved v2');
  NV.__eliteReadability=false;draws.length=0;assert(NV.drawRefinedEliteBody(context({}),e,1,'',100,0));
  assert(draws[0].endsWith('-painted-v1.png'),'reference override remains available');
  delete NV.__eliteReadability;assert.equal(JSON.stringify(e),before);
}
assert.match(fs.readFileSync('js/game.js','utf8'),/dimensionContentEnabled && NV\.prewarmRefinedEliteReadability/);
assert.match(fs.readFileSync('js/engine/enemies.js','utf8'),/if \(type\.refinedEliteReadability\) entity\.refinedEliteReadability = true/);
console.log('PASS approved elite art: production selection, reference override, pure entities and preload/spawn wiring');
