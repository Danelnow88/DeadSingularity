// Versioned data contracts. No code from packages is evaluated.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.NV = root.NV || {}).Content = factory();
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  const GROUPS = ['pilots','weapons','enemies','elites','bosses','sectors','consumables'];
  const ID = /^[a-z][a-z0-9_-]{0,63}$/;
  const LIMITS = Object.freeze({ packageBytes: 262144, entries: 32, installed: 8, eventsPerFrame: 64 });
  const BEHAVIORS = Object.freeze(['chase','flank','shield','swarm','ranged','erratic','kami']);
  const clone = value => JSON.parse(JSON.stringify(value));
  function requireValue(ok, message) { if (!ok) throw new Error(message); }
  function inspect(value, depth = 0) {
    requireValue(depth <= 16, 'Datos demasiado profundos');
    if (typeof value === 'number') requireValue(Number.isFinite(value) && Math.abs(value) <= 1e9, 'Numero invalido');
    else if (typeof value === 'string') requireValue(value.length <= 8192, 'Texto demasiado largo');
    else if (value && typeof value === 'object') {
      requireValue(Object.getPrototypeOf(value) === Object.prototype || Array.isArray(value), 'Solo datos JSON');
      for (const key of Object.keys(value)) {
        requireValue(!['__proto__','prototype','constructor'].includes(key), 'Clave no permitida');
        inspect(value[key], depth + 1);
      }
    } else requireValue(value === null || typeof value === 'boolean', 'Solo datos JSON');
  }
  function number(value, min, max, label) {
    requireValue(Number.isFinite(value) && value >= min && value <= max, label + ': fuera de rango');
  }
  function definition(group, data) {
    requireValue(data && typeof data === 'object' && !Array.isArray(data), 'Definicion invalida');
    if (group === 'pilots') {
      requireValue(data.stats && typeof data.stats === 'object', 'Piloto sin stats');
      number(data.stats.hp,1,5000,'HP'); number(data.stats.speed,1,2000,'Velocidad');
      requireValue(['meteor','phase','bulwark','hivemind'].includes(data.special),'Habilidad no registrada');
    }
    if (group === 'weapons') {
      number(data.damage,0,10000,'Daño'); number(data.speed,1,5000,'Velocidad');
      number(data.range,1,5000,'Alcance'); number(data.fireRate,1,1000,'Cadencia');
    }
    if (['enemies','elites','bosses'].includes(group)) {
      number(data.hp,1,100000,'HP'); number(data.speed,0,2000,'Velocidad');
      number(data.radius,1,200,'Radio');
      if (group !== 'bosses') requireValue(BEHAVIORS.includes(data.behavior), 'Comportamiento desconocido');
      else { requireValue(['chase','charge','summon','circle','burst','teleport','slow_charge','phase','split','rage'].includes(data.pattern),'Patron de jefe no registrado'); requireValue(['repeater','heavy','summon','spread','beam','volley','bomb','orbs','split','rage'].includes(data.attack),'Ataque de jefe no registrado'); }
    }
    if (data.asset !== undefined) requireValue(/^assets\/[a-zA-Z0-9_./-]+$/.test(data.asset) && !data.asset.split('/').includes('..'), 'Recurso fuera de assets');
  }
  function validateCatalog(raw) {
    const value = clone(raw); inspect(value);
    requireValue(value.schemaVersion === 1 && ID.test(value.id), 'Catalogo incompatible');
    for (const group of GROUPS) {
      requireValue(Array.isArray(value[group]) && value[group].length <= 256, 'Grupo invalido: ' + group);
      const seen = new Set();
      for (const entry of value[group]) {
        requireValue(entry && ID.test(entry.id) && !seen.has(entry.id), 'ID invalido/duplicado en ' + group);
        seen.add(entry.id); definition(group,entry.data);
      }
    }
    return value;
  }
  function validatePackage(raw, base) {
    requireValue(new TextEncoder().encode(JSON.stringify(raw)).length <= LIMITS.packageBytes, 'Paquete demasiado grande');
    const pack = clone(raw); inspect(pack);
    requireValue(pack.schemaVersion === 1 && pack.catalogVersion === base.id && ID.test(pack.id), 'Paquete incompatible');
    requireValue(Object.keys(pack).every(k => ['schemaVersion','catalogVersion','id','name','version','entries'].includes(k)), 'Campos del paquete desconocidos');
    requireValue(typeof pack.name === 'string' && pack.name.length <= 80, 'Nombre invalido');
    requireValue(Number.isInteger(pack.version) && pack.version >= 1, 'Version invalida');
    requireValue(Array.isArray(pack.entries) && pack.entries.length > 0 && pack.entries.length <= LIMITS.entries, 'Limite de contenido');
    const seen = new Set();
    for (const entry of pack.entries) {
      requireValue(Object.keys(entry).every(k => ['group','id','archetype','stats','name','color'].includes(k)), 'Campo de contenido desconocido');
      requireValue(['enemies','weapons'].includes(entry.group) && ID.test(entry.id) && entry.id.startsWith(pack.id + '_'), 'ID debe pertenecer al paquete');
      requireValue(!seen.has(entry.id) && !base[entry.group].some(x => x.id === entry.id), 'ID duplicado');
      seen.add(entry.id);
      const archetype = base[entry.group].find(x => x.id === entry.archetype);
      requireValue(!!archetype, 'Arquetipo desconocido');
      // Direct projectiles and generic chase enemies are the first supported extension ABI.
      requireValue(entry.group === 'weapons' ? ['pistol','smg'].includes(entry.archetype) : archetype.data.behavior === 'chase' && archetype.data.shape !== 'specter', 'Arquetipo no extensible en API v1');
      const allowed = entry.group === 'weapons' ? ['damage','speed','range','fireRate'] : ['hp','speed','radius','damage','score','xp','minWave'];
      requireValue(entry.stats && Object.keys(entry.stats).every(k => allowed.includes(k)), 'Stats no permitidas');
      for (const [key,value] of Object.entries(entry.stats)) number(value,0, key === 'hp' ? 100000 : 10000,key);
      requireValue(typeof entry.name === 'string' && entry.name.length >= 1 && entry.name.length <= 80 && !/[<>]/.test(entry.name), 'Nombre inseguro');
      if (entry.color !== undefined) requireValue(/^#[0-9a-fA-F]{6}$/.test(entry.color), 'Color invalido');
      const data = Object.assign({},archetype.data,entry.stats,{id:entry.id,name:entry.name});
      definition(entry.group,data);
    }
    return pack;
  }
  function materialize(base, packages) {
    const out = clone(base);
    requireValue(packages.length <= LIMITS.installed, 'Demasiados paquetes');
    const ids = new Set();
    for (const raw of packages) {
      const pack = validatePackage(raw,base);
      requireValue(!ids.has(pack.id), 'Paquete duplicado'); ids.add(pack.id);
      for (const entry of pack.entries) {
        const source = base[entry.group].find(x => x.id === entry.archetype);
        const data = Object.assign({},clone(source.data),entry.stats,{id:entry.id,name:entry.name});
        if (entry.color) data.color = entry.color;
        out[entry.group].push({id:entry.id,data,packageId:pack.id,archetype:entry.archetype});
      }
    }
    return validateCatalog(out);
  }
  let base = null;
  return Object.freeze({ GROUPS, LIMITS, BEHAVIORS, clone, validateCatalog, validatePackage, materialize,
    setBase(value) { requireValue(!base,'Catalogo ya inicializado'); base = validateCatalog(value); },
    read(group) { requireValue(base && GROUPS.includes(group),'Catalogo no disponible'); return clone(base[group]); },
    getBase() { return clone(base); }
  });
});


