const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

// Persistencia y aplicación de texto grande, incluso sin DOM completo.
{
  const store = {};
  const attrs = {};
  const NV = {};
  const sandbox = { window: { NV }, console, document: { documentElement: { setAttribute(k, v) { attrs[k] = v; } } }, localStorage: {
    getItem: key => store[key] || null, setItem: (key, value) => { store[key] = value; }, removeItem: key => { delete store[key]; },
  } };
  vm.runInNewContext(fs.readFileSync('js/core/settings.js', 'utf8'), sandbox);
  assert.equal(NV.settings.gameplay.largeText, false);
  assert.equal(NV.setComfortOption('largeText', true), true);
  assert.equal(attrs['data-large-text'], 'true');
  assert.equal(JSON.parse(store.deadSingularitySettings).gameplay.largeText, true);
}

// Adaptador de mando: deadzone y normalización sin crear un RAF paralelo.
{
  const callbacks = [];
  const status = { textContent: '' };
  const NV = { input: {} };
  const sandbox = {
    window: { NV, addEventListener() {} }, console,
    navigator: { getGamepads: () => [] },
    document: { getElementById: () => status },
    requestAnimationFrame(fn) { callbacks.push(fn); },
  };
  vm.runInNewContext(fs.readFileSync('js/ui/gamepadControls.js', 'utf8'), sandbox);
  assert(NV.gamepad && NV.gamepad.supported);
  assert.equal(NV.gamepad.axis(0.19), 0);
  assert.equal(NV.gamepad.axis(-0.2), 0);
  assert(NV.gamepad.axis(0.6) > 0 && NV.gamepad.axis(0.6) < 1);
  assert.equal(NV.gamepad.axis(1), 1);
  assert.equal(callbacks.length, 0, 'el mando debe usar el loop principal');
  assert.equal(typeof NV.gamepad.poll, 'function');
}

const html = fs.readFileSync('index.html', 'utf8');
// Ocultar HUD oculta instrucciones opcionales sin marcar el tutorial como completo.
{
  const listeners={},nodes=[];
  const node=()=>({hidden:false,append(){},setAttribute(){},addEventListener(){}});
  const NV={input:{},getState:()=> 'playing'};
  const sandbox={window:{NV},performance:{now:()=>0},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
    document:{querySelector:()=>node(),createElement(){const n=node();nodes.push(n);return n;},addEventListener(name,fn){listeners[name]=fn;}}};
  vm.runInNewContext(fs.readFileSync('js/ui/onboarding.js','utf8'),sandbox);
  listeners['nv-game-state-change']({detail:{state:'playing'}});
  assert.equal(nodes[0].hidden,false);
  NV.tutorial.setHUDVisible(false); assert.equal(nodes[0].hidden,true); assert.equal(NV.tutorial.isComplete(),false);
  NV.tutorial.setHUDVisible(true); assert.equal(nodes[0].hidden,false);
}
assert(html.includes('id="gamepadStatus"'));
assert(html.indexOf('js/ui/onboarding.js') > html.indexOf('js/game.js'));
assert(html.indexOf('js/ui/gamepadControls.js') > html.indexOf('js/game.js'));
const tutorial = fs.readFileSync('js/ui/onboarding.js', 'utf8');
for (const token of ['deadSingularityTutorialV1', 'setMoveVector', 'setSlide', 'setFire', 'setSpecial', 'OMITIR']) assert(tutorial.includes(token));
const pad = fs.readFileSync('js/ui/gamepadControls.js', 'utf8');
for (const token of ['getGamepads', 'setMoveVector', 'setAimWorld', 'setFire', 'cycleWeapon', 'togglePause']) assert(pad.includes(token));
const game = fs.readFileSync('js/game.js', 'utf8');
assert(game.includes('analogMove'));
assert(game.includes('NV.input.setMoveVector'));
assert(game.includes('NV.gamepad.poll'));
assert(game.includes('NV.tutorial.poll'));
const css = fs.readFileSync('css/alpha.css', 'utf8');
assert(css.includes('.nv-tutorial'));
assert(css.includes('html[data-large-text="true"]'));
console.log('RESULT ux_onboarding_gamepad_i: tutorial, mando estándar y texto grande OK');
