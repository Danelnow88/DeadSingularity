// ===== DATOS: definiciones de consumibles (se usan con la tecla F en partida) =====
// Puro datos de efectos. La lógica está en game.js (useConsumable), que lee estos
// valores en vez de hardcodearlos. Se carga ANTES de game.js.
(() => {
  'use strict';
  const NV = window.NV;

  NV.CONSUMABLES = {
    potion:    { key: 'potion',    name: 'Poción',     useName: 'POCIÓN',     desc: 'Restaura 40 de vida. Usar con F.',     price: 10, banner: 'Poción guardada (F para usar)',  color: '#22c55e', hp: 40 },
    overdrive: { key: 'overdrive', name: 'Overdrive',  useName: 'OVERDRIVE',  desc: '+18% de velocidad durante 5 s. F para usar.', price: 18, banner: 'Overdrive guardado (F)',         color: '#caa7ff', speedMult: 1.18, duration: 5 },
    shield:    { key: 'shield',    name: 'Escudo',     useName: 'ESCUDO',     desc: 'Invulnerable durante 3 s. F para usar.',  price: 22, banner: 'Escudo guardado (F)',            color: '#ffcf76', duration: 3 },
    bomb:      { key: 'bomb',      name: 'Bomba',      useName: 'BOMBA',      desc: 'Daño en área: 25% comunes, 50% élites, 8% jefe.', price: 34, banner: 'Bomba guardada (F)',             color: '#ff5f9b' },
    freeze:    { key: 'freeze',    name: 'Congelante', useName: 'CONGELANTE', desc: 'Ralentiza 50% durante 4 s. No afecta jefes.', price: 26, banner: 'Congelante guardado (F)',        color: '#67e8f9', duration: 4 },
    magnet:    { key: 'magnet',    name: 'Imán',       useName: 'IMÁN',       desc: 'Atrae shards y armas cercanas. F para usar.', price: 20, banner: 'Imán guardado (F)',              color: '#7cf8ff' },
    bounty:    { key: 'bounty',    name: 'Recompensa', useName: 'RECOMPENSA', desc: 'Durante 10 s: cada baja da +1 shard y x2 score.', price: 30, banner: 'Recompensa guardada (F)',        color: '#ffd700', duration: 10 },
  };
  NV.CONSUMABLE_ORDER = ['potion', 'overdrive', 'shield', 'bomb', 'freeze', 'magnet', 'bounty'];
  // Tope acumulado por tipo durante la partida. Generoso para permitir preparación,
  // pero evita stacks infinitos que rompen el balance de supervivencia/daño.
  NV.CONSUMABLE_STACK_CAP = 10;
  // Los slots de consumibles representan tipos distintos equipados/disponibles.
  // El HUD tiene 6 espacios; no se puede cargar un 7mo tipo simultáneo.
  NV.CONSUMABLE_TYPE_SLOT_CAP = 6;
  // #11: timing compartido de la Bomba de Vacío — fuente NEUTRA (js/data) leída
  // por el engine (impacto mecánico) y el renderer (VFX). Única copia de cada número.
  NV.BOMB_FX_LIFETIME = 0.9;
  NV.BOMB_IMPACT_T = 0.46;
  NV.consumableList = function () {
    return NV.CONSUMABLE_ORDER.map((key) => NV.CONSUMABLES[key]).filter(Boolean);
  };
  Object.freeze(NV.CONSUMABLES);
  Object.freeze(NV.CONSUMABLE_ORDER);
})();
