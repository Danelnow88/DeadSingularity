const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('js/engine/bullets.js','utf8');
function load(linear){
  const NV={},box={window:{NV},Math,console};
  vm.runInNewContext(fs.readFileSync('js/data/balance.js','utf8'),box);
  vm.runInNewContext(fs.readFileSync('js/engine/boss.js','utf8'),box);
  let code=source;
  if(linear)code=code.replace('bullets.length*enemies.length>=2048 && buildCollisionCells(enemies)','false')
    .replace(/if \(b\.impactType === 'pellet' &&\s*\(e\.x <[\s\S]*?\)\) continue;/,'')
    .replace('dx*dx+dy*dy < contactRadius*contactRadius','Math.hypot(dx,dy) < contactRadius');
  vm.runInNewContext(code,box);return NV;
}
const indexed=load(false),linear=load(true);let seed=37;
const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
function state(enemies,bullets){return {enemies,bullets,W:2400,H:1600,player:{x:1200,y:800},boss:null,CHARACTERS:{},
  SHIELD_COOLDOWN:.9,addFloatText(){},killEnemy(e){e.dead=true;},applyKnockback(){},spawnExplosion(){}};}
const clone=x=>JSON.parse(JSON.stringify(x));
for(let trial=0;trial<250;trial++){
  const enemies=Array.from({length:80},(_,i)=>({x:random()*2100-80,y:random()*1400-50,radius:8+random()*100,hp:80,
    dead:i%19===0,shield:i%17===0,shieldCd:0}));
  const bullets=Array.from({length:60},(_,i)=>({x:random()*2200,y:random()*1400,vx:(random()-.5)*3000,vy:(random()-.5)*3000,
    damage:9,pierce:i%4+1,impactType:['direct','pellet','sustain'][i%3],splashRadius:30,hitTargets:[],wid:'rifle'}));
  const a=state(clone(enemies),clone(bullets)),b=state(clone(enemies),clone(bullets));
  for(let tick=0;tick<3;tick++){
    const resultA=indexed.updateBullets(.017,a),resultB=linear.updateBullets(.017,b);
    assert.equal(JSON.stringify(resultA),JSON.stringify(resultB),'projectile difference trial '+trial);
    assert.deepEqual(a.enemies,b.enemies,'damage/shield/order difference');a.bullets=resultA.bullets;b.bullets=resultB.bullets;
  }
}
const targets=[20,60,100].map(x=>({x,y:100,radius:5,hp:100}));
const bullet={x:20,y:100,vx:0,vy:0,damage:10,pierce:2,impactType:'pierce',hitTargets:[],wid:'rifle'};
const st=state(targets,[bullet]);indexed.updateBullets(0,st);assert(!bullet.dead);
bullet.x=60;indexed.updateBullets(0,st);assert(bullet.dead,'pierce budget resets next frame');
bullet.x=100;indexed.updateBullets(0,st);assert.equal(targets[2].hp,100);
console.log('PASS projectile grid: 750 differential ticks, large/negative bounds, swept pellets, shields/order and lifetime pierce');
