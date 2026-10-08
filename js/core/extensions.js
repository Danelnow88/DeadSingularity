// Only JSON data, local storage, menu-time activation; no third-party scripts.
(() => {
  'use strict';
  const NV = window.NV, key = 'deadSingularityPackagesV1', base = NV.Content.getBase();
  let installed = [];
  const targets = {weapons:NV.WEAPONS,enemies:NV.ENEMY_TYPES};
  function menu() { if (NV.getState && NV.getState() !== 'menu') throw new Error('Volver al lobby para cambiar contenido'); }
  function apply(packs) {
    const catalog = NV.Content.materialize(base,packs);
    for (const [group,target] of Object.entries(targets)) target.splice(0,target.length,...catalog[group].map(e => e.data));
    installed = packs; NV.activeCatalog = catalog;
  }
  function commit(packs) {
    menu(); NV.Content.materialize(base,packs);
    // Never silently discard a saved loadout when disabling a package.
    const raw = JSON.parse(localStorage.getItem('deadSingularityExpeditionV1') || 'null');
    const available = new Set(NV.Content.materialize(base,packs).weapons.map(e => e.id));
    if (raw && (raw.inventory || []).some(id => !available.has(id))) throw new Error('La partida guardada usa ese contenido. Conserva el paquete o termina la partida antes de desactivarlo.');
    localStorage.setItem(key,JSON.stringify(packs)); apply(packs);
    if (NV.events) NV.events.emit('catalog.changed',{id:base.id,packages:packs.map(p => ({id:p.id,version:p.version}))});
    return true;
  }
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(saved)) throw new Error('Registro de contenido invalido');
    apply(saved);
  } catch (error) { apply([]); NV.contentWarning = 'No se pudo restaurar contenido adicional: ' + error.message; }
  NV.extensions = Object.freeze({
    version:1,
    list:() => installed.map(p => ({id:p.id,name:p.name,version:p.version,entries:p.entries.length})),
    install(raw) {
      menu(); const pack = NV.Content.validatePackage(raw,base);
      if (installed.some(p => p.id === pack.id)) throw new Error('Paquete ya instalado');
      return commit([...installed,pack]);
    },
    disable(id) { menu(); if (!installed.some(p => p.id === id)) return false; return commit(installed.filter(p => p.id !== id)); },
    export:() => NV.Content.clone(installed),
    resolveWeapon:id => (NV.activeCatalog.weapons.find(e => e.id === id) || {}).archetype || id
  });
})();

