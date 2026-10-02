// Regresion: las siluetas grandes de proyectiles de jefe no deben causar dano
// cuando el jugador esquiva por debajo; el movimiento rapido tampoco atraviesa.
const fs = require('fs'), vm = require('vm');
const sbx = { window: { NV: {} }, console, Math };
vm.runInNewContext(fs.readFileSync('js/engine/bullets.js', 'utf8'), sbx, { filename: 'bullets.js' });
const NV = sbx.window.NV;
let pass = 0, fail = 0;
function t(desc, fn) {
  try { fn(); pass++; console.log('  ok  ' + desc); }
  catch (e) { fail++; console.log('  FAIL ' + desc + ' -> ' + e.message); }
}

t('la bomba usa su nucleo y no todo el arte luminoso', () => {
  const bomb = { x: 100, y: 100, radius: 10, sourceType: 'boss', projectileStyle: 'bossBomb' };
  const r = NV.hostileProjectileCollisionRadius(bomb);
  if (Math.abs(r - 6.8) > 1e-9) throw new Error('radio=' + r);
});

t('pasar claramente por debajo de la bola no golpea', () => {
  const bomb = { x: 130, y: 100, radius: 10, sourceType: 'boss', projectileStyle: 'bossBomb' };
  const player = { x: 115, y: 119 };
  if (NV.hostileProjectileHitsPlayer(bomb, 100, 100, player, 20)) throw new Error('falso positivo debajo');
});

t('el nucleo que cruza al jugador si golpea incluso en frame lento', () => {
  const lance = { x: 160, y: 100, radius: 9, sourceType: 'boss', projectileStyle: 'bossChargedLance' };
  const player = { x: 120, y: 100 };
  if (!NV.hostileProjectileHitsPlayer(lance, 80, 100, player, 20)) throw new Error('tunneling');
});

t('tocar solo el glow de la lanza es una esquiva valida', () => {
  const lance = { x: 130, y: 100, radius: 9, sourceType: 'boss', projectileStyle: 'bossChargedLance' };
  const player = { x: 115, y: 115 };
  if (NV.hostileProjectileHitsPlayer(lance, 100, 100, player, 20)) throw new Error('glow contado como dano');
});

console.log('RESULT boss_projectile_fairness: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);
