const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const sandbox = { window: { NV: {} } };
vm.createContext(sandbox);
for (const file of ['js/data/balance.js', 'js/engine/wavePressure.js']) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
}
const NV = sandbox.window.NV;
const source = { x: 200, y: 200, dead: false };
function setup(difficulty = 'easy') {
  let hits = 0, deaths = 0;
  const st = { state: NV.createWavePressure(), wave: 1, boss: null, active: true,
    difficulty, player: { x: 450, y: 420, radius: 10, hp: 120 }, enemies: [source],
    applyPlayerDamage: (_damage, options) => { hits++; assert.equal(options.cause, 'wave-targeted-pulse'); return { killed: false }; },
    onPlayerKilled: () => deaths++,
  };
  return { st, hits: () => hits, deaths: () => deaths };
}
const safe = setup();
NV.updateWavePressure(1.9, safe.st);
assert(safe.st.state.mark, 'debe fijar una marca desde un enemigo vivo');
assert.equal(safe.hits(), 0, 'el aviso no causa daño');
const target = { x: safe.st.state.mark.x, y: safe.st.state.mark.y };
safe.st.player.x += 80;
NV.updateWavePressure(1.1, safe.st);
assert.equal(safe.hits(), 0, 'salir del círculo evita todo el daño');
assert.equal(safe.st.state.mark, null);
assert.equal(target.x, 450, 'el ataque captura la posición al iniciar el aviso');

const idle = setup();
for (let i = 0; i < 45; i++) NV.updateWavePressure(0.5, idle.st);
assert(idle.hits() >= 5, 'inmovilidad prolongada debe recibir presión repetida');
idle.st.enemies = [];
idle.st.state.mark = null;
NV.updateWavePressure(1, idle.st);
assert.equal(idle.st.state.mark, null, 'sin enemigos vivos no aparece un aviso nuevo');

for (const change of [{ wave: 5 }, { boss: {} }, { active: false }]) {
  const t = setup(); Object.assign(t.st, change);
  NV.updateWavePressure(20, t.st);
  assert.equal(t.st.state.mark, null, 'jefe/laboratorio no reciben este ataque');
}
const game = fs.readFileSync('js/game.js', 'utf8');
assert(game.includes('NV.updateWavePressure(dt, {') && game.includes('NV.drawWavePressure(ctx, wavePressure)'));
assert(fs.readFileSync('index.html', 'utf8').includes('js/engine/wavePressure.js'));
console.log('OK wave_pressure');
