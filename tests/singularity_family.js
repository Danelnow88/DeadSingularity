'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/singularity-family/manifest.json')));
const wanted = ['runner','tank','swarmlet','spitter','wisp','kamikaze','specter_archer','specter_guard','specter_core'];
assert.deepEqual(manifest.sprites.map(s => s.id), wanted);
assert.equal(new Set(manifest.sprites.map(s => s.color)).size, 9);
for (const item of manifest.sprites) {
  const png = fs.readFileSync(path.join(root, 'assets/singularity-family', item.id + '.png'));
  assert.equal(png.subarray(1,4).toString(), 'PNG');
  assert(png.readUInt32BE(16) >= 1024 && png.readUInt32BE(20) >= 1024);
  assert.equal(png[25], 6, item.id + ': alpha channel');
  assert(item.previousVisibleSize > 0);
}
for (const page of ['index.html','previews/enemy-roster-canonical.html']) {
  const html = fs.readFileSync(path.join(root,page),'utf8');
  const p = html.indexOf('/singularityFamily.js?');
  assert(p > 0 && p < html.indexOf('/enemies.js?'), page + ': common body hook ordering');
  assert(p < html.indexOf('/spectralEnemies2D.js?'), page + ': spectral body hook ordering');
}
const common = fs.readFileSync(path.join(root,'js/render/enemies.js'),'utf8');
const spectral = fs.readFileSync(path.join(root,'js/render/spectralEnemies2D.js'),'utf8');
assert(common.includes('NV.drawSingularityCommon'));
assert(spectral.includes('NV.drawSingularitySpecter'));
console.log('PASS approved nine-sprite family: RGBA production assets, distinct accent colors, measured size metadata and shared roster/game wiring.');

// Model a browser that blocks pixel readback for local-file image canvases.
const vm = require('node:vm');
const NV = {};
class LocalImage {
  set src(value) {
    const id = value.split('?')[0].split('/').pop().replace('.png','');
    const folder = value.includes('/tank-animation/') ? 'assets/singularity-family/tank-animation' : 'assets/singularity-family';
    const png = fs.readFileSync(path.join(root,folder,id+'.png'));
    this.naturalWidth=png.readUInt32BE(16); this.naturalHeight=png.readUInt32BE(20); this.onload();
  }
}
const ctx = { drawImage() {}, getImageData() { throw Error('Local-file canvas readback is blocked'); } };
const document = { currentScript: { src:'file:///game/js/render/singularityFamily.js' },
  createElement: () => ({width:0,height:0,getContext:()=>ctx}) };
vm.runInNewContext(fs.readFileSync(path.join(root,'js/render/singularityFamily.js'),'utf8'),{
  window:{NV},document,Image:LocalImage,URL,Map,Math
});
const stats=NV.singularityFamilyStats().species;
assert.equal(stats.length,9);
assert(stats.every(s=>s.ready&&!s.error),'All local-file sprites load without readback');
for(const s of stats){
  const spec=manifest.sprites.find(a=>a.id===s.id);
  assert(Math.abs(Math.max(s.width,s.height)-spec.previousVisibleSize*(spec.visualScale||1))<1e-9);
  assert.equal(s.crop.width,spec.sourceBounds.width);
}
console.log('PASS local-file image loading: blocked pixel readback, validated baked bounds and preserved sprite sizes.');
