(() => {
  'use strict';
  const clone=x=>JSON.parse(JSON.stringify(x));
  function freeze(x){for(const v of Object.values(x))if(v&&typeof v==='object')freeze(v);return Object.freeze(x);}
  const canonical=window.NV.PILOT_ANIMATION_BASELINE;
  const KEY='deadSingularityPilotLabCopiesV1',ids=Object.keys(canonical.settings),ranges={speed:[0,1],amplitude:[0,1.5],stability:[0,1],micro:[0,1],detailSpeed:[0,1]};
  let copies=[],active=null,sequence=0;
  function validSettings(settings){return !!settings&&ids.every(id=>settings[id]&&Object.entries(ranges).every(([key,[lo,hi]])=>typeof settings[id][key]==='number'&&Number.isFinite(settings[id][key])&&settings[id][key]>=lo&&settings[id][key]<=hi));}
  try{
    const loaded=JSON.parse(localStorage.getItem(KEY)||'[]');
    if(Array.isArray(loaded))copies=loaded.filter(c=>c&&/^copy-\d+$/.test(c.id)&&typeof c.name==='string'&&validSettings(c.settings)).slice(0,20).map(c=>freeze({id:c.id,name:c.name.slice(0,80),settings:clone(c.settings)}));
    sequence=Math.max(0,...copies.map(c=>Number(c.id.slice(5))));
  }catch(_){/* Bloquear storage no altera el preset de archivo. */}
  function current(){return active||canonical;}
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(copies));return true;}catch(_){return false;}}
  const api={
    canonical,
    profile:()=>clone({id:current().id,settings:current().settings,environment:canonical.environment,rendererContract:canonical.rendererContract}),
    parameters:()=>current().settings,
    isCanonical:()=>active===null,
    list:()=>[{id:canonical.id,name:canonical.name},...copies.map(c=>({id:c.id,name:c.name}))],
    load(id){if(id===canonical.id){active=null;return true;}const c=copies.find(c=>c.id===id);if(!c)return false;active=clone(c);return true;},
    duplicate(name){if(copies.length>=20)return false;const c={id:'copy-'+(++sequence),name:String(name||'Copia '+sequence).trim().slice(0,80)||'Copia '+sequence,settings:clone(current().settings)};copies.push(freeze(clone(c)));active=c;persist();return c.id;},
    edit(id,key,value){if(!active||!ids.includes(id)||!ranges[key]||!Number.isFinite(value)||value<ranges[key][0]||value>ranges[key][1])return false;active.settings[id][key]=value;return true;},
    save(){if(!active)return false;const index=copies.findIndex(c=>c.id===active.id);copies[index]=freeze(clone(active));return persist();},
    export:()=>({canonical:clone(canonical),copies:clone(copies),active:clone(current())}),
  };
  window.NV.pilotLabPresets=Object.freeze(api);
})();
