// Laboratorio aislado: preservación exacta y separación forma / movimiento.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
let pass=0,fail=0;
const plain=x=>JSON.parse(JSON.stringify(x));
function t(name,fn){try{fn();pass++;console.log('ok '+name);}catch(e){fail++;console.error('FAIL '+name,e.stack);}}
function environment(storage=new Map(),blocked=false){
  const NV={},box={window:{NV},localStorage:{getItem:k=>storage.get(k),setItem(k,v){if(blocked)throw Error('storage bloqueado');storage.set(k,v);}}};
  for(const file of ['js/data/pilotAnimationBaseline.js','js/render/pilotGeometry.js','dev/pilot-concepts/animation-presets.js','dev/pilot-concepts/geometry.js'])vm.runInNewContext(fs.readFileSync(file,'utf8'),box);
  return {P:NV.pilotLabPresets,G:NV.pilotLabGeometry,storage};
}
const captured=JSON.parse(fs.readFileSync('dev/pilot-concepts/captured-runtime.json','utf8'));
t('valores exactos del runtime, frame fraccional y contratos de fuentes reales',()=>{
  const {P}=environment();assert.deepEqual(plain(P.canonical.settings),captured.settings);
  assert.equal(P.canonical.capture.frame,captured.frame);assert.equal(P.canonical.capture.paused,captured.paused);
  const c=P.canonical.rendererContract;
  const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n')).digest('hex');
  assert.equal(hash('tests/fixtures/pilot-native-renderer-2026-10-02.js'),c.sha256LF);assert.equal(hash(c.dataFile),c.dataSha256LF);
});
t('base recursivamente congelada; sliders, snapshots y saves no la sobrescriben',()=>{
  const {P}=environment(),before=plain(P.canonical);
  const frozen=x=>{assert(Object.isFrozen(x));for(const v of Object.values(x))if(v&&typeof v==='object')frozen(v);};frozen(P.canonical);
  assert.equal(P.edit('boti','speed',.1),false);assert.equal(P.save(),false);
  P.parameters().boti.speed=.1;P.profile().settings.nova.speed=.1;
  assert.deepEqual(plain(P.canonical),before);assert(P.isCanonical());
});
t('duplicar, editar, guardar y recargar copia; recuperar canónico intacto',()=>{
  const {P,storage}=environment(),id=P.duplicate('Prueba');assert(id);
  assert(P.edit('nova','speed',.38));assert(P.edit('boti','amplitude',1.1));
  assert.equal(P.edit('nova','speed',NaN),false);assert.equal(P.edit('nova','speed',2),false);
  assert.equal(P.edit('unknown','speed',.2),false);assert.equal(P.edit('nova','fake',.2),false);
  assert(P.save());const next=environment(storage).P;
  assert(next.load(id));assert.equal(next.parameters().nova.speed,.38);assert.equal(next.parameters().boti.amplitude,1.1);
  assert(next.load(next.canonical.id));assert.deepEqual(plain(next.parameters()),captured.settings);
  const exported=plain(next.export());exported.canonical.settings.boti.speed=0;
  assert.deepEqual(plain(next.canonical.settings),captured.settings);
});
t('storage bloqueado no destruye base; entradas canónicas o inválidas no se importan',()=>{
  const {P}=environment(new Map(),true),id=P.duplicate('Sin storage');assert(id);assert.equal(P.save(),false);
  assert(P.load(P.canonical.id));assert.deepEqual(plain(P.parameters()),captured.settings);
  const storage=new Map([['neonVoidPilotLabCopiesV1',JSON.stringify([
    {id:'CANONICAL_ANIMATION_BASELINE',name:'trampa',settings:captured.settings},
    {id:'copy-7',name:'válida',settings:captured.settings},
    {id:'copy-8',name:'inválida',settings:{}},
  ])]]);
  const next=environment(storage).P;assert.equal(next.list().length,2);assert.equal(next.list()[1].id,'copy-7');
  assert.equal(next.duplicate('Nueva'),'copy-8');assert.deepEqual(plain(next.canonical.settings),captured.settings);
});
t('geometría distinta + mismo campo: offset estático y evolución temporal idéntica',()=>{
  const {P,G}=environment(),snapshot=plain(P.profile());
  const ref=Array.from({length:17},(_,i)=>({x:40*Math.cos(i/16*Math.PI*2),y:40*Math.sin(i/16*Math.PI*2)}));
  const animated=(time)=>ref.map((v,i)=>({x:v.x+Math.sin(i*.4+time)*3,y:v.y+Math.cos(i*.3+time)*2}));
  const first=animated(.2),second=animated(2.7);
  for(const kind of Object.keys(G.names)){
    const a=G.apply(kind,ref,first),b=G.apply(kind,ref,second),base=G.points(kind,ref);
    if(kind==='original')assert.deepEqual(plain(a),first);else {assert.equal(a.length,base.length);assert.notDeepEqual(plain(base),ref);}
    for(let i=0;i<a.length;i++){
      const u=i/(a.length-1),field=v=>v.map((p,j)=>({x:p.x-ref[j].x,y:p.y-ref[j].y}));
      const d=G.sample(field(first),u),next=G.sample(field(second),u);
      assert(Math.abs((b[i].x-a[i].x)-(next.x-d.x))<1e-10);
      assert(Math.abs((b[i].y-a[i].y)-(next.y-d.y))<1e-10);
      assert(Math.abs(a[i].x-base[i].x-d.x)<1e-10);
      assert(Number.isFinite(a[i].x)&&Number.isFinite(a[i].y));
    }
    assert.deepEqual(plain(P.profile()),snapshot);
  }
  assert.throws(()=>G.points('fake',ref));
});
t('asimetría localizada; las demás formas permanecen exactamente iguales',()=>{
  const {G}=environment();
  const ref=Array.from({length:17},(_,i)=>({x:40*Math.cos(i/16*Math.PI*2),y:40*Math.sin(i/16*Math.PI*2)}));
  const expected={original:'e7276b230a6bfd1023e1a7fc05e04f68b36c6e67304ff247ac9d2752c3a53a72',
    radial:'8a40e38273bee88398ffcd5a9cef7dd99c1915e9498e53ebac45500ccde5eed9',
    star:'7e3eeb710be2a1d4482ed77536851b668c5102ed4d6bb6999667aa665fffb992',
    peaks:'f51a0972874c251c90414186041a904f58f098940163b4c2728817f1b08d89f1'};
  for(const [kind,hash] of Object.entries(expected))
    assert.equal(crypto.createHash('sha256').update(JSON.stringify(G.points(kind,ref))).digest('hex'),hash);
  const shape=G.points('asymmetric',ref);assert.equal(shape.length,41);assert.deepEqual(plain(shape[0]),plain(shape[40]));
  // Debe pertenecer a la familia radial de la referencia, con muchas agujas.
  const radii=shape.slice(0,-1).map(p=>Math.hypot(p.x,p.y));
  const peaks=radii.filter((r,i)=>r>radii[(i+39)%40]&&r>radii[(i+1)%40]).length;
  assert(peaks>=12,'la silueta perdió la complejidad radial de la referencia');
  const balanced=radii.filter((r,i)=>Math.abs(r-radii[(i+20)%40])<1e-10).length;
  assert(balanced>=30&&balanced<40,'la asimetría debe afectar sólo parte del diseño');
});
t('laboratorio no carga juego ni motor ni módulos en producción',()=>{
  const html=fs.readFileSync('dev/pilot-concepts/index.html','utf8'),game=fs.readFileSync('index.html','utf8');
  assert(!html.includes('js/game.js'));assert(!html.includes('js/engine/'));assert(!game.includes('pilot-concepts'));
});
console.log('RESULT pilot_canonical_lab: pass='+pass+' fail='+fail);process.exit(fail?1:0);
