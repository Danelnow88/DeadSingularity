const fs = require('fs');
let pass = 0, fail = 0;
function test(name, fn) { try { fn(); pass++; console.log('  ok  ' + name); } catch (error) { fail++; console.log('  FAIL ' + name + ' -> ' + error.message); } }
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('css/system-menu.css', 'utf8');
const js = fs.readFileSync('js/ui/systemMenu.js', 'utf8');

test('la barra histórica queda fuera de presentación sin eliminar sus nodos fuente', () => {
  for (const id of ['wave', 'score', 'shards', 'hpFill', 'hpText', 'hudToggle', 'sound', 'settingsBtn', 'fullscreenBtn']) {
    if (!html.includes('id="' + id + '"')) throw new Error('falta fuente ' + id);
  }
  if (!css.includes('.shell > .hud { display:none !important; }')) throw new Error('el header histórico sigue ocupando presentación');
});
test('el canvas ocupa el viewport y conserva un indicador vital independiente', () => {
  for (const token of ['position:fixed; inset:0', 'id="systemVitals"', 'id="systemHpFill"', 'id="systemHpText"']) {
    if (!html.includes(token) && !css.includes(token)) throw new Error('falta ' + token);
  }
});
test('menú refleja fuentes existentes y delega acciones en vez de duplicar gameplay', () => {
  for (const token of ['original.wave', 'original.score', 'original.shards', 'original.hpFill', 'original.sound.click()', 'original.settings.click()', 'original.fullscreen.click()']) {
    if (!js.includes(token)) throw new Error('falta delegación ' + token);
  }
  if (js.includes('NV.getState =')) throw new Error('el menú no puede reescribir el estado del juego');
});
test('música externa queda dentro de la sección experimental del sistema', () => {
  if (!html.includes('id="systemMusicSlot"') || !html.includes('MÚSICA EXPERIMENTAL')) throw new Error('slot experimental ausente');
  if (!js.includes('slot.appendChild(rhythm)')) throw new Error('el widget no se reubica');
});
console.log('RESULT system_menu: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);
