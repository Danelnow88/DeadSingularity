// Tests: recoger armas nunca auto-equipa; con inventario lleno el drop queda en el suelo.
const fs = require('fs'), vm = require('vm');
let pass = 0, fail = 0;
function t(desc, fn) { try { fn(); pass++; console.log('  ok  ' + desc); } catch (e) { fail++; console.log('  FAIL ' + desc + ' -> ' + e.message); } }
const sbx = { window: { NV: {} }, console, Math };
vm.runInNewContext(fs.readFileSync('js/engine/pickups.js', 'utf8'), sbx, { filename: 'pickups.js' });
const NV = sbx.window.NV;
function mk(weapon, x, y) { return { weapon, x, y, dead: false }; }
const texts = [], sfx = () => sfx.n++;
sfx.n = 0;

t('inventario CON lugar: guarda y no toca la equipada', () => {
  const inv = [], w = { name: 'Rifle' }, eq = { name: 'Pistola' };
  const r = NV.updateWeaponPickups(0.1, [mk(w, 0, 0)], { x: 0, y: 0 }, inv, 6, eq,
    (x, y, txt) => texts.push(txt), {}, sfx);
  if (inv.length !== 1 || inv[0] !== w) throw new Error('no guardó');
  if (r.currentWeapon !== eq) throw new Error('cambió la equipada');
});

t('inventario LLENO: no equipa, no consume el drop, avisa', () => {
  texts.length = 0; sfx.n = 0;
  const full = [{}, {}, {}, {}, {}, {}];
  const w = { name: 'Sniper' }, wp = mk(w, 0, 0), eq = { name: 'Pistola' };
  const r = NV.updateWeaponPickups(0.1, [wp], { x: 0, y: 0 }, full, 6, eq,
    (x, y, txt) => texts.push(txt), {}, sfx);
  if (r.currentWeapon !== eq) throw new Error('auto-equipó con inventario lleno');
  if (wp.dead) throw new Error('consumió el drop');
  if (full.length !== 6) throw new Error('metió algo al inventario');
  if (!texts.includes('INVENTARIO LLENO')) throw new Error('sin aviso');
  if (sfx.n !== 0) throw new Error('sonó como recogida');
});

t('aviso INVENTARIO LLENO con anti-spam mientras se pisa', () => {
  texts.length = 0;
  const full = [{}, {}, {}, {}, {}, {}];
  const wp = mk({ name: 'X' }, 0, 0);
  for (let i = 0; i < 10; i++) NV.updateWeaponPickups(0.1, [wp], { x: 0, y: 0 }, full, 6, {},
    (x, y, txt) => texts.push(txt), {}, sfx);
  const n = texts.filter((t2) => t2 === 'INVENTARIO LLENO').length;
  if (n > 1) throw new Error('spameó ' + n + ' avisos');
});

t('al liberar espacio vuelve a recogerse normalmente', () => {
  const inv = [], w = { name: 'Y' }, wp = mk(w, 0, 0);
  NV.updateWeaponPickups(0.1, [wp], { x: 0, y: 0 }, inv, 6, {}, () => {}, {}, sfx); // lleno
  NV.updateWeaponPickups(0.1, [wp], { x: 0, y: 0 }, inv, 6, {}, () => {}, {}, sfx); // aún lleno
  const r = NV.updateWeaponPickups(0.1, [wp], { x: 0, y: 0 }, [], 6, {}, () => {}, {}, sfx); // espacio
  if (!wp.dead || inv[0] !== w || !r.weaponPickups.every((p) => p.dead)) throw new Error('no se recogió tras liberar');
});

// ---- Pool de elegibles para NUEVOS drops (arma poseída en MAX fusión excluida) ----
(function () {
  const rm = { random: () => rndVal, floor: Math.floor, hypot: Math.hypot, min: Math.min };
  const sbx2 = { window: { NV: {} }, console, Math: rm };
  vm.runInNewContext(fs.readFileSync('js/engine/pickups.js', 'utf8'), sbx2, { filename: 'pickups.js' });
  const NV2 = sbx2.window.NV;
  let rndVal = 0;
  const rifle = { id: 'rifle', name: 'Rifle', rarity: 'rare' };
  const smg = { id: 'smg', name: 'SMG', rarity: 'common' };
  const banners = [];
  const W6 = [rifle, smg];

  t('drop EXCLUYE arma poseída en MAX fusión y elige de las elegibles', () => {
    rndVal = 0; // sin filtro el index 0 = rifle (regresión visible)
    const maxFus = (w) => w.id === 'rifle' && (3 >= 3); // rifle maxeado y poseída (mock del estado)
    const wp = [];
    const ok = NV2.spawnWeaponPickup(W6, wp, 900, 520, (t2) => banners.push(t2), {}, (w) => !maxFus(w));
    if (!ok) throw new Error('no generó pickup habiendo elegibles');
    if (wp.length !== 1 || wp[0].weapon.id !== 'smg') throw new Error('eligió inelegible: ' + (wp[0] && wp[0].weapon.id));
    if (banners.length !== 1) throw new Error('sin banner de drop');
  });

  t('arma NO poseída y poseída fusionable siguen siendo candidatas', () => {
    banners.length = 0;
    const wp = [];
    const isEligible = (w) => w.id !== 'EXCLUDED'; // nada excluido
    const ok = NV2.spawnWeaponPickup(W6, wp, 900, 520, (t2) => banners.push(t2), {}, isEligible);
    if (!ok || wp.length !== 1 || wp[0].weapon.id !== 'rifle') throw new Error('filtró de más');
  });

  t('TODAS las candidatas inelegibles: no genera pickup, sin banner, sin crash', () => {
    banners.length = 0;
    const wp = [];
    const ok = NV2.spawnWeaponPickup(W6, wp, 900, 520, (t2) => banners.push(t2), {}, () => false);
    if (ok !== false) throw new Error('devolvió true sin pickup');
    if (wp.length !== 0) throw new Error('generó pickup inválido');
    if (banners.length !== 0) throw new Error('anunció arma inexistente');
  });

  t('sin isEligible el comportamiento es el original (retrocompatible)', () => {
    rndVal = 0.99;
    const wp = [];
    NV2.spawnWeaponPickup(W6, wp, 900, 520, () => {}, {});
    if (wp.length !== 1 || wp[0].weapon.id !== 'smg') throw new Error('cambió selección base');
    if (W6.length !== 2 || W6[0] !== rifle) throw new Error('mutó el catálogo');
  });
})();

t('game.js conecta isWeaponDropEligible (weaponFus + MAX_WEAPON_FUSION + owned) a ambas rutas de drop', () => {
  const g = fs.readFileSync('js/game.js', 'utf8');
  for (const pat of [
    'function isWeaponDropEligible',
    '(weaponFus[w.id] || 0) >= MAX_WEAPON_FUSION',
    'inventory.some((iw) => iw.id === w.id)',
    'RARITY_COLORS, isWeaponDropEligible)',
    'sfx.pickup, isWeaponDropEligible)',
  ]) {
    if (!g.includes(pat)) throw new Error('falta: ' + pat);
  }
});

console.log('RESULT weapon_pickup: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);