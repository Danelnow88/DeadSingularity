// Small facades and bounded immutable events over the existing runtime.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.NV = root.NV || {}).RuntimeTools = factory();
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  function immutable(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.freeze(value); for (const item of Object.values(value)) immutable(item);
    }
    return value;
  }
  function events(limit = 64, maxBytes = 16384) {
    const listeners = new Map(); let remaining = limit;
    return Object.freeze({
      beginFrame() { remaining = limit; },
      on(name,fn) {
        if (!/^[a-z][a-z0-9.:-]{0,63}$/.test(name) || typeof fn !== 'function') throw new Error('Evento invalido');
        if (!listeners.has(name)) { if(listeners.size>=64)throw new Error('Limite de tipos de evento'); listeners.set(name,new Set()); }
        const set = listeners.get(name);
        if (set.size >= 32) throw new Error('Limite de listeners');
        set.add(fn); return () => {set.delete(fn); if (!set.size) listeners.delete(name);};
      },
      emit(name,payload) {
        if (remaining <= 0) return false;
        const text = JSON.stringify({version:1,type:name,payload});
        if (text.length > maxBytes) return false;
        const event = immutable(JSON.parse(text)); remaining--;
        for (const fn of listeners.get(name) || []) { try {fn(event);} catch (_) { /* extensions cannot interrupt combat */ } }
        return true;
      }
    });
  }
  function measurePhases(clock) {
    const result = {updateMs:0,drawMs:0};
    return function (update,between,draw,dt) {
      const begin = clock(); update(dt); between(); const middle = clock(); draw(); const end = clock();
      result.updateMs = middle-begin; result.drawMs = end-middle; return result;
    };
  }
  function facades(NV) {
    const read = fn => immutable(JSON.parse(JSON.stringify(fn())));
    return Object.freeze({
      version:1,
      input:Object.freeze({snapshot:() => read(() => NV.getInputSnapshot ? NV.getInputSnapshot() : {}),
        pause:() => NV.input && NV.input.togglePause()}),
      simulation:Object.freeze({snapshot:() => read(() => NV.getRuntimeSnapshot()),alpha:() => read(() => NV.alpha.snapshot())}),
      render:Object.freeze({snapshot:() => read(() => NV.getRenderDiagnostics()),quality:value => NV.setGraphicsQuality(value)}),
      audio:Object.freeze({settings:() => read(() => NV.getSettings().audio),volume:(key,value) => NV.setAudioVolume(key,value)}),
      persistence:Object.freeze({export:() => read(() => NV.expedition.exportProgress()),import:value => NV.expedition.importProgress(value)})
    });
  }
  return Object.freeze({immutable,events,measurePhases,facades});
});

