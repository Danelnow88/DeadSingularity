const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const html = fs.readFileSync('previews/enemy-roster-canonical.html', 'utf8');
function page(search) {
  const nodes = {};
  const document = {
    getElementById(id) {
      return nodes[id] ||= { textContent: '', innerHTML: '', value: '', addEventListener() {}, querySelectorAll() { return []; } };
    },
    querySelectorAll() { return []; }
  };
  const context = { window: { NV: {}, location: { search } }, document, URLSearchParams, console, requestAnimationFrame() {} };
  context.NV = context.window.NV;
  vm.createContext(context);
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
    const src = /src="\.\.\/([^"]+)"/.exec(match[0]);
    vm.runInContext(src ? fs.readFileSync(src[1].split('?')[0], 'utf8') : match[1], context);
  }
  return nodes;
}
for (const search of ['', '?roster=normal', '?roster=legacy']) {
  const nodes = page(search), text = nodes['export-text'].value;
  assert(!/undefined|NaN|Sin descripción verificada/.test(text));
  assert(text.includes('poseerte') && text.includes('tajo de filo frontal') && text.includes('soga'));
  assert(text.includes('Categoría real de aparición:') && text.includes('Aparición:'));
  assert(nodes.secciones.innerHTML.includes('Espectros'));
  assert(nodes.secciones.innerHTML.includes('Amenazas dimensionales'));
  const records = text.split('\n').filter(line => line.startsWith('  Qué hace:'));
  assert.strictEqual(records.length, search.includes('legacy') ? 35 : 29);
  if (!search.includes('legacy')) {
    for (const id of ['drone', 'shielder', 'specter_lite', 'specter_grunt', 'elite_velocity', 'specter_elite_void', 'elite_base', 'elite_bulwark', 'elite_swift']) {
      assert(!nodes.secciones.innerHTML.includes('data-id="normal::' + id + '"'));
      assert(!nodes.secciones.innerHTML.includes('data-id="elite::' + id + '"'));
    }
    assert(text.includes('velocidad 720') && text.includes('No dispara munición normal'));
    assert(text.includes('325 unidades/s')&&text.includes('mira orbital segmentada'));
    assert(!text.includes('único anillo de destino'));
    assert(text.includes('Comandante, Bastión y Centella'));
    for (const id of ['core_cyan','core_amber','core_magenta']) assert(text.includes('('+id+')'));
  }
  console.log('PASS roster document ' + (search ? 'normal' : 'preview') + ': ' + records.length + ' complete records');
}
for(const retired of ['paintedSwarmlet.js','cosmicCreatures.js','cosmicRunner.js','cosmicSpecters.js'])assert(!html.includes(retired),'retired rig loaded: '+retired);
assert(html.includes('singularityFamily.js'),'canonical family missing');
