'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Content=require('../js/core/content.js'),{snapshot}=require('../tools/content-catalog.cjs');
const parse=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
const base=parse('content/catalog.json'),pack=parse('content/packages/example-training.json');
assert.deepEqual(base,snapshot(require('node:path').resolve('reference/prototype')),'Catalogo base altera stats/arte originales');
assert.deepEqual(Content.validateCatalog(base),base);
const changed=Content.materialize(base,[pack]);
assert.equal(changed.weapons.length,base.weapons.length+1);
assert.equal(changed.enemies.length,base.enemies.length+1);
assert.equal(changed.weapons.at(-1).data.damage,12);
assert.equal(base.weapons.length,10);
for(const mutate of [
 p=>p.entries[0].stats.hp=-1,p=>p.entries[0].stats.speed=Infinity,
 p=>p.entries[0].archetype='not-registered',p=>p.entries[0].id='outside_namespace',
 p=>p.entries.push(p.entries[0]),p=>p.entries[0].name='<script>',
 p=>p.entries[0].stats.unknown=1,p=>p.code='alert(1)',p=>p.catalogVersion='future',
 p=>p.entries[0].stats.asset='../secrets',p=>p.entries[1].archetype='flamethrower',
 p=>p.entries[0].color='url(http://external)',p=>p.entries=Array(33).fill(p.entries[0])
]){
 const copy=structuredClone(pack);mutate(copy);assert.throws(()=>Content.validatePackage(copy,base));
}
assert.throws(()=>Content.materialize(base,[pack,pack]));
const data=new Map();let quota=false;const storage={getItem:k=>data.has(k)?data.get(k):null,
 setItem(k,v){if(quota)throw new Error('quota');data.set(k,String(v));},removeItem:k=>data.delete(k)};
const n={Content:Object.assign({},Content),WEAPONS:base.weapons.map(e=>structuredClone(e.data)),ENEMY_TYPES:base.enemies.map(e=>structuredClone(e.data)),getState:()=> 'menu'};
n.Content.getBase=()=>structuredClone(base);
vm.runInNewContext(fs.readFileSync('js/core/extensions.js','utf8'),{window:{NV:n},localStorage:storage});
quota=true;assert.throws(()=>n.extensions.install(pack));assert.equal(n.WEAPONS.length,10);quota=false;
assert(n.extensions.install(pack));assert.equal(n.WEAPONS.length,11);
data.set('deadSingularityExpeditionV1',JSON.stringify({inventory:['training_pistol']}));
assert.throws(()=>n.extensions.disable('training'));assert.equal(n.WEAPONS.length,11);
data.delete('deadSingularityExpeditionV1');assert(n.extensions.disable('training'));assert.equal(n.WEAPONS.length,10);
n.getState=()=> 'playing';assert.throws(()=>n.extensions.install(pack));
n.getState=()=> 'menu';n.extensions.install(pack);
const sandbox={window:{NV:n},console,Math,performance};
for(const file of ['js/data/balance.js','js/engine/weapons.js'])vm.runInNewContext(fs.readFileSync(file,'utf8'),sandbox);
const bullets=[];
n.shoot({player:{x:0,y:20,luck:-1000,permCrit:0,overdrive:0},enemies:[{x:100,y:20,radius:10,hp:1000,dead:false}],boss:null,bullets,
 aimVector:{x:1,y:0},currentWeapon:n.WEAPONS.find(w=>w.id==='training_pistol'),currentWeaponLevel:()=>1,weaponVisualTier:()=>0,
 BULLET_TIER_COLORS:['#fff'],MAX_BULLETS:100,permDamageBonus:0,playWeaponSound(){},fusionStep:.2,currentWeaponFusion:0,onTarget(){},onFlame(){}});
assert.equal(bullets.length,1);assert.equal(bullets[0].damage,12);assert.equal(bullets[0].wid,'training_pistol');
assert.equal(bullets[0].impactType,'direct');
console.log('PASS growth content: frozen parity, invalid packages, quota rollback, saved loadout and combat protection');

