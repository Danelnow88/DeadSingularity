const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const NV={},box={window:{NV},Math:Object.create(Math),console};
for(const f of ['data/balance','data/gameData','data/consumables','engine/weapons','engine/pickups','engine/enemies'])
  vm.runInNewContext(fs.readFileSync('js/'+f+'.js','utf8'),box);
let seed=1729;box.Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
let rare=0,bounty=0;
for(let i=0;i<10000;i++){
  const stock=NV.createEconomyStock(box.Math.random);
  assert.equal(stock.consumables.length,2);assert.equal(stock.consumables[0],'potion');
  rare+=stock.premium?1:0;bounty+=stock.consumables.includes('bounty')?1:0;
}
assert(rare>900&&rare<1500);assert(bounty>250&&bounty<550);
let weapons=0;
for(let i=0;i<3000;i++){
  const floor=[];
  NV.updateBossChests(.1,[{x:0,y:0}],{x:0,y:0},[],floor,NV.WEAPONS,()=>{},()=>{});
  assert(floor.length<=1);weapons+=floor.length;
}
assert(weapons>250&&weapons<600,'cofres demasiado generosos o sin armas');
const levels={},inventory=[{id:'rifle'}];
for(let i=1;i<=3;i++)assert.equal(NV.fuseWeaponDuplicate(inventory[0],inventory,levels,3).level,i);
assert(NV.fuseWeaponDuplicate(inventory[0],inventory,levels,3).maxed);
assert.equal(inventory.length,1);assert.equal(NV.evolvedWeaponImpact(NV.WEAPONS.find(w=>w.id==='rifle'),2).pierce,3);
const player={bounty:4,bountyKills:0,bountyTokens:0,x:500,y:500,xp:0,xpToNext:1e9,luck:0},pickups=[];
for(let i=0;i<80;i++)NV.killEnemy({e:{x:0,y:0,hp:0,score:1,xp:0,color:'#fff'},player,pickups,
  score:0,weaponLevels:{},weaponKills:{},addFloatText(){},spawnExplosion(){},sfx:{enemyDeath(){}},waveEvent:null});
assert.equal(player.bountyTokens,3);assert.equal(pickups.filter(p=>p.value===1).length,3);
player.economyBuffTime=60;NV.tickEconomyBuff(player,0);assert.equal(player.economyBuffTime,60);
NV.tickEconomyBuff(player,61);assert.equal(player.economyBuffTime,0);
console.log('PASS economy: stock, rarity, bounded chest loot, duplicates, traits, bounty cap, buff expiry');
