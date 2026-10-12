'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const NV={sceneryPreviewGallery:true,dimensionIllustratedScenery:true};class Image{set src(value){this.url=value;this.naturalWidth=1536;this.naturalHeight=1024;if(this.onload)this.onload();}get src(){return this.url;}}
const ctx=new Proxy({globalAlpha:1},{get:(t,k)=>k in t?t[k]:()=>{},set:(t,k,v)=>{t[k]=v;return true;}});
class Canvas{getContext(){return ctx;}}
const box={window:{NV},Image,OffscreenCanvas:Canvas,console};vm.runInNewContext(fs.readFileSync('js/render/sectors.js','utf8'),box);
NV.registerTrialSceneryArt({'threshold':'sky-threshold-v1.webp','foundry':'sky-foundry-v1.webp'});
NV.dimensionSceneryTrial=false;NV.preloadDimensionScenery([0,1]);
assert.deepEqual(Array.from(NV.dimensionSceneryStatus(),e=>e.file),['threshold-v1.webp']);
NV.drawSectorBackdrop(ctx,900,520,0,1,{preview:true});assert.equal(NV.getSectorBackdropStats().artFile,'threshold-v1.webp');
const baselineBuilds=NV.getSectorBackdropStats().builds;NV.drawSectorBackdrop(ctx,900,520,1,1,{preview:true});assert.equal(NV.getSectorBackdropStats().builds,baselineBuilds);
NV.dimensionSceneryTrial=true;NV.preloadDimensionScenery([0,1]);
assert(NV.dimensionSceneryStatus().some(e=>e.file==='sky-threshold-v1.webp'));
assert(NV.dimensionSceneryStatus().some(e=>e.file==='sky-foundry-v1.webp'));
NV.drawSectorBackdrop(ctx,900,520,0,1,{preview:true});assert.equal(NV.getSectorBackdropStats().artFile,'sky-threshold-v1.webp');
NV.dimensionSceneryTrial=false;NV.drawSectorBackdrop(ctx,900,520,0,1,{preview:true});assert.equal(NV.getSectorBackdropStats().artFile,'threshold-v1.webp');
for(const bad of [{'unknown':'a.webp'},{'threshold':'../a.webp'},{'threshold':'https://example/a.png'},{'threshold':'C:/private.png'}])assert.throws(()=>NV.registerTrialSceneryArt(bad));
NV.registerTrialSceneryArt({});NV.preloadDimensionScenery([0]);
assert(NV.dimensionSceneryStatus().some(e=>e.file==='threshold-v1.webp'));
assert.equal(NV.DIMENSION_VISUALS.length,8);
vm.runInNewContext(fs.readFileSync('js/data/scenerySkyTrial.js','utf8'),box);
assert.equal(Object.keys(NV.dimensionSkyTrial.files).length,8);
assert(NV.dimensionSkyTrial.profiles.every(p=>p.starfield&&p.environmentType==='space'));
NV.dimensionSceneryTrial=false;assert.equal(NV.sectorVisualForWave(21,{preview:true}).starfield,true);
NV.drawSectorBackdrop(ctx,900,520,0,1,{preview:true});assert.equal(NV.getSectorBackdropStats().artFile,'sky-threshold-v1.webp');
NV.dimensionSceneryLegacy=true;assert.equal(NV.sectorVisualForWave(21,{preview:true}).starfield,false);
NV.drawSectorBackdrop(ctx,900,520,0,1,{preview:true});assert.equal(NV.getSectorBackdropStats().artFile,'threshold-v1.webp');
NV.dimensionSceneryLegacy=false;
NV.dimensionSceneryTrial=true;assert.equal(NV.sectorVisualForWave(21,{preview:true}).starfield,true);
NV.preloadDimensionScenery([0,1,2,3,4,5,6,7]);
assert.equal(NV.dimensionSceneryStatus().length,8);
assert(NV.dimensionSceneryStatus().every(s=>s.file.startsWith('sky-')));
// Gameplay starts in a fresh page, not in the gallery's eight-image cache.
NV.sceneryPreviewGallery=false;
vm.runInNewContext(fs.readFileSync('js/render/sectors.js','utf8'),box);
vm.runInNewContext(fs.readFileSync('js/data/scenerySkyTrial.js','utf8'),box);
NV.preloadDimensionScenery([0,1,2,3,4,5,6,7]);
assert(NV.dimensionSceneryStatus().length<=2);
// A future trial override must not mutate the approved production files.
NV.registerTrialSceneryArt({threshold:'future-threshold-v2.webp'});
NV.dimensionSceneryTrial=true;NV.drawSectorBackdrop(ctx,900,520,0,1,{preview:true});assert.equal(NV.getSectorBackdropStats().artFile,'future-threshold-v2.webp');
NV.dimensionSceneryTrial=false;NV.drawSectorBackdrop(ctx,900,520,0,1,{preview:true});assert.equal(NV.getSectorBackdropStats().artFile,'sky-threshold-v1.webp');
console.log('PASS promoted sky baseline, future trial isolation, legacy restoration, bounded cache and unchanged map catalog');
