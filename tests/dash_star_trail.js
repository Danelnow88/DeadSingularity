// Estela compartida: visual-only, sin RNG de gameplay, anclada al mundo y acotada.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const NV={},math=Object.create(Math);math.random=()=>{throw new Error('FX consume RNG de combate');};
const context={window:{NV},Math:math,Map,console};
for(const file of ['data/gameData','data/balance','engine/movement','engine/fx'])
  vm.runInNewContext(fs.readFileSync('js/'+file+'.js','utf8'),context,{filename:file});
const source=fs.readFileSync('js/game.js','utf8');
assert(source.includes('NV.emitDashTrail(trails, dashing, trailStartX, trailStartY, player.x, player.y, player.color)'));
assert(source.includes('if (!dashing && frame % trailStep() === 0)'));
assert(!source.includes('Polvo de propulsión durante el dash'));
const qualities=[{trailDensity:1,decorativeParticleScale:1,secondaryGlow:true},
  {trailDensity:.5,decorativeParticleScale:.5,secondaryGlow:false},
  {trailDensity:.25,decorativeParticleScale:0,secondaryGlow:false}];
function draw(trails,budget) {
  const points=[];let stars=0,lines=0;
  const ctx=new Proxy({save(){},restore(){},beginPath(){},closePath(){},fill(){stars++;},
    arc(x,y,r){assert(Number.isFinite(x)&&Number.isFinite(y)&&r>=0);points.push([x,y,r]);},
    moveTo(){},lineTo(){lines++;},stroke(){}},{set(t,k,v){t[k]=v;return true;}});
  NV.drawTrails(ctx,trails,budget);return {points,stars,lines};
}
for(const character of NV.CHARACTER_ORDER) {
  const results=[];
  for(const budget of qualities) {
    const p={x:500,y:300,stun:0,moveVx:0,moveVy:0},trails=[];
    NV.configurePlayerDash(p);const initial=JSON.stringify(p);
    NV.emitDashTrail(trails,false,p.x,p.y,p.x+100,p.y,NV.CHARACTERS[character].color);
    assert.equal(trails.length,0,'caminar no genera estrellas');assert.equal(JSON.stringify(p),initial);
    for(let i=0;i<20;i++) {
      const x=p.x,y=p.y,dashing=NV.updatePlayerDash(p,i===0,1,1,0,0,false,1/60);
      NV.emitDashTrail(trails,dashing,x,y,p.x,p.y,NV.CHARACTERS[character].color);
      NV.updateTrails(1/60,trails);
    }
    assert(trails.length>0);assert(trails.every(t=>t.kind==='dashStar'&&t.color===NV.CHARACTERS[character].color));
    assert(trails.every(t=>t.x>=500 && t.endX<=p.x && t.endY<=p.y),'detrás del movimiento real');
    const anchored=JSON.stringify(trails);NV.worldMetrics={viewX:900,viewY:450};
    const rendered=draw(trails,budget);assert.equal(JSON.stringify(trails),anchored,'render/cámara muta mundo');
    assert(rendered.lines>0&&rendered.stars>0,'núcleo y estrellas persisten aun sin micropartículas');
    results.push(JSON.stringify(p));
    assert.strictEqual(NV.updateTrails(1,trails),trails);assert.equal(trails.length,0);
  }
  assert(results.every(r=>r===results[0]),'calidad cambia física/stamina');
}
// Trayectorias horizontal/vertical/curva se guardan por desplazamiento real.
const trails=[];NV.emitDashTrail(trails,true,40,40,90,40,'#caa7ff');
NV.emitDashTrail(trails,true,90,40,90,90,'#caa7ff');
assert(trails.some(t=>t.ny===1));assert(trails.some(t=>t.nx===-1));
const first=trails[0];for(let i=0;i<500;i++)NV.emitDashTrail(trails,true,i,0,i+15,2,'#ffcf76');
assert(trails.length<=NV.getDashTrailStats(trails).cap);
NV.updateTrails(1,trails);assert(NV.getDashTrailStats(trails).pool<=96);
NV.emitDashTrail(trails,true,0,0,0,0,'#ffcf76');assert.equal(trails.length,0,'pared no inventa trayectoria');
assert(first);console.log('dash_star_trail: cuatro pilotos, mundo, física, calidad, expiry, cap y RNG OK');
