const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const NV={};vm.runInNewContext(fs.readFileSync('js/engine/sectorEncounters.js','utf8'),{window:{NV},Math});
for(const [W,H] of [[320,240],[900,520],[915,412],[844,390],[1914,935]])for(let serial=0;serial<6;serial++) {
  const p=NV.sectorLaserPattern(serial,W,H);assert.equal(p.length,[2,4,6][serial%3]);
  for(const h of p){assert.equal(h.width,6);if(h.kind==='vent'){
    assert(h.x/W<.30||h.x/W>.62,'cabezal superior fuera del HUD central');
    assert(h.x>25&&h.x<W-25);
    if(W>=600)assert(h.x+25<W/2-115 || h.x-25>W/2+115,'anillos fuera de la cápsula de oleada');
  }else assert(h.y>25&&h.y<H-25);}
  const hs=[...new Set(p.filter(h=>h.kind==='rift').map(h=>h.y))].sort((a,b)=>a-b);
  for(let i=1;i<hs.length;i++)assert(hs[i]-hs[i-1]>24,'celda mayor que núcleo y grosor de rayos');
}
const hazards=[],state=NV.createSectorEncounterState();let hits=0;
const ctx={wave:7,W:900,H:520,player:{x:0,y:0},playerRadius:9,applyPlayerDamage(){hits++;return{applied:true};}};
for(let cycle=0;cycle<3;cycle++){
  NV.updateSectorEncounter(10,hazards,state,ctx);assert.equal(hazards.length,[2,4,6][cycle]);
  const h=hazards[0];ctx.player={x:h.x||100,y:h.y||100};
  const before=hits;NV.updateSectorEncounter(.4,hazards,state,ctx);assert.equal(hits,before);
  NV.updateSectorEncounter(1.26,hazards,state,ctx);assert.equal(hits,before,'activación no salta aviso al daño');
  NV.updateSectorEncounter(.01,hazards,state,ctx);assert.equal(hits,before+1);
  NV.updateSectorEncounter(.1,hazards,state,ctx);assert.equal(hits,before+1,'sin daño por frame');
  ctx.player={x:15,y:15};NV.updateSectorEncounter(2,hazards,state,ctx);
  NV.updateSectorEncounter(.56,hazards,state,ctx);assert.equal(hazards.length,0,'se retira todo el grupo');
}
const ray={kind:'vent',laserHead:true,x:200,width:6};
assert(NV.sectorHazardContains(ray,{x:212,y:100},9));
assert(!NV.sectorHazardContains(ray,{x:213,y:100},9),'brillo no extiende colisión');
assert(!NV.sectorHazardContains(ray,{x:200,y:10},9),'cabezal no aplica daño invisible');
console.log('RESULT sector_laser_groups: 2/4/6, HUD, espacios, aviso, colisión fina y retiro OK');
