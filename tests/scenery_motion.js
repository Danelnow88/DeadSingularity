const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const NV={},points=[],context={getContext(){return {};}};
const sandbox={window:{NV},document:{getElementById(){return context;}},console};vm.createContext(sandbox);
for(const f of ['js/render/canvas.js','js/render/sectors.js','js/engine/dimensions.js'])vm.runInContext(fs.readFileSync(f,'utf8'),sandbox);
assert.equal(NV.SECTOR_VISUALS.length,4);assert.equal(NV.DIMENSION_VISUALS.length,8);
assert.equal(new Set(NV.DIMENSION_VISUALS.map(p=>p.name)).size,8);
for(let wave=1;wave<60;wave++){
 const run=NV.createDimensionRun(wave,false,{total:30},25,{preview:true});
 assert.equal(run.environments.length,4);assert.equal(new Set(run.environments).size,4);
 assert(run.environments.every(i=>i>=0&&i<8));
 const normal=NV.createDimensionRun(wave,false,{},25);assert(normal.environments.every(i=>i<4));
}
const ctx={beginPath(){},arc(x,y){points.push([x,y]);},fill(){}};
NV.drawStarfield(ctx,1000,700,0,500,350,null,{x:0,y:0});const initial=points.splice(0);
NV.drawStarfield(ctx,1000,700,0,500,350,null,{x:100,y:0});const shifted=points.splice(0);
for(let i=0;i<initial.length;i++){
 const dx=(initial[i][0]-shifted[i][0]+1000)%1000;
 assert([18,48,85].some(expected=>Math.abs(dx-expected)<1e-6));
 assert.equal(initial[i][1],shifted[i][1]);
}
assert.equal(initial.length,160);
assert.equal(NV.sectorVisualForWave(26).id,'void-heart');
assert.equal(NV.sectorVisualForWave(26,{preview:true}).id,'jade-basin');
console.log('PASS 8 named scenarios, unique journeys, production isolation and three camera parallax depths');
