const fs = require('fs');
let pass = 0, fail = 0;
function test(name, fn) { try { fn(); pass++; console.log('  ok  ' + name); } catch (error) { fail++; console.log('  FAIL ' + name + ' -> ' + error.message); } }

const css = fs.readFileSync('css/mobile.css', 'utf8');
const game = fs.readFileSync('js/game.js', 'utf8');
const mobile = fs.readFileSync('js/ui/mobileControls.js', 'utf8');

test('portrait móvil muestra un gate de rotación por encima de toda la app', () => {
  for (const token of ['.nv-mobile.nv-portrait .rotate-overlay', 'z-index:1000', 'display:flex !important', '.nv-mobile.nv-portrait .game-box > canvas']) {
    if (!css.includes(token)) throw new Error('falta ' + token);
  }
});
test('loop congela simulación y render durante el gate vertical', () => {
  for (const token of ['portraitMobileBlocked', "NV.capabilities.orientation === 'portrait'", 'lastTime = now;', 'requestAnimationFrame(loop);', 'return;']) {
    if (!game.includes(token)) throw new Error('falta ' + token);
  }
});
test('al entrar en paisaje se intenta fullscreen una vez y se mantiene fallback', () => {
  for (const token of ['tryLandscapeFullscreen', 'landscapeFullscreenAttempted', 'viewport.requestFullscreen()', 'viewport.lockLandscape()', 'orientationchange']) {
    if (!mobile.includes(token)) throw new Error('falta ' + token);
  }
});
console.log('RESULT mobile_orientation_gate: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);
