const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const NV={},box={window:{NV},Math,console};
for(const f of ['data/balance','data/gameData','data/consumables','core/utils','engine/weapons'])
  vm.runInNewContext(fs.readFileSync('js/'+f+'.js','utf8'),box);
const source=fs.readFileSync('js/game.js','utf8');
function extract(name){const a=source.indexOf('function '+name+'('),start=source.indexOf('{',a);let depth=0;
  for(let i=start;i<source.length;i++){if(source[i]==='{')depth++;if(source[i]==='}'&&--depth===0)return source.slice(a,i+1);}throw Error(name);}
const state={...box,NV,wave:1,WEAPONS:NV.WEAPONS,player:{hp:100,maxHp:100},inventory:[NV.WEAPONS[0]],
 currentWeapon:NV.WEAPONS[0],economyStock:{consumables:['potion','shield'],premium:true,passiveBought:false,premiumBought:false,weaponId:NV.WEAPONS[0].id},
 weaponFus:{},weaponLevels:{},weaponKills:{},WEAPON_KILLS_PER_LEVEL:6,MAX_WEAPON_FUSION:3,WEAPON_FUSION_DMG:.2,WEAPON_FUSE_PRICE:15,INVENTORY_SLOTS:6,
 CONSUMABLE_CAP:1,CONSUMABLE_STACK_CAP:3,CONSUMABLE_TYPE_SLOT_CAP:6,consumableBought:{},consumableItems:[],
 dom:{upgradesOffers:'passive',weaponOffers:'premium',shopFusionOffers:{classList:{toggle(){}}},consumableOffers:'consumables'},offers:{},
 renderOffers(slot,items){this.offers[slot]=items;},renderShopInspector(){},renderShopConsumableLoadout(){},renderUpgradeSlots(){},
 arenaW:()=>900,arenaH:()=>520,addFloatText(){},showBanner(){},updateHUD(){},sfx:{fuse(){},shopBuy(){}},RARITY_COLORS:{}};
state.renderOffers=(slot,items)=>{state.offers[slot===state.dom.shopFusionOffers?'fusion':slot]=items;};
state.weaponFusionLevel=id=>state.weaponFus[id]||0;
state.tryWeaponFusion=w=>NV.fuseWeaponDuplicate(w,state.inventory,state.weaponFus,3);
state.upgradeSlots=[];state.shopBought={};state.UPGRADE_SLOT_CAP=6;
state.UPGRADE_LEVELS={hp:6,speed:Math.min(6,Math.ceil((NV.BALANCE.MAX_AGILITY-1)/NV.BALANCE.AGILITY_PER_UPGRADE)),armor:5,luck:6};state.SHOP_CAPS={hp:8,armor:5,luck:7};
state.MAX_AGILITY=2;state.AGILITY_PER_UPGRADE=.2;
state.player.agility=1;state.player.armor=0;state.player.luck=0;
vm.createContext(state);for(const name of ['upgradeLevel','runUpgradeOffers','generateOffers'])vm.runInContext(extract(name),state);
state.generateOffers();
assert.equal(state.offers.consumables.length,2);assert.equal(state.offers.passive.length,5);assert.equal(state.offers.premium.length,2);assert.equal(state.offers.fusion.length,1);
const id=state.economyStock.weaponId,component=state.offers.fusion.find(o=>o.weapon.id===id);
assert(component.buy());assert.equal(state.weaponFus[id],1);assert.equal(state.inventory.length,1);
assert.equal(component.buy(),false,'componente viejo compra dos veces');
state.generateOffers();assert(state.offers.fusion[0].disabled,'stock de componente reaparece');
assert.equal(state.economyStock.weaponId,id);
const buff=state.offers.passive[0];assert(buff.buy());assert.equal(state.player.economyBuffTime,60);
assert.equal(buff.buy(),false,'pasivo se acumula');state.generateOffers();assert(state.offers.passive[0].disabled);
const potion=state.offers.consumables[0];assert(potion.buy());assert.equal(potion.buy(),false);
assert.equal(state.consumableItems.length,1);assert.equal(state.consumableBought.potion,1);
console.log('PASS shop economy: fixed slots, stable stock, stale-card guards, fusion and temporary passive');
state.economyStock={consumables:['potion','shield'],premium:false,passiveBought:false,premiumBought:false,weaponId:null,basicWeaponId:null,basicBought:false};
state.generateOffers();
const basic=state.offers.premium.find(o=>!o.disabled);
assert(basic && basic.weapon,'armería básica vacía sin componente raro');
assert.equal(state.offers.premium.length,2,'faltan alternativas de armería');
const alternative=state.offers.premium.find(o=>o.weapon.id!==basic.weapon.id);
const basicId=basic.weapon.id,count=state.inventory.length;
const stockIds=JSON.stringify(state.economyStock.basicWeaponIds);
const owned=state.inventory.some(w=>w.id===basicId),previousFusion=state.weaponFus[basicId]||0;
assert(basic.buy());assert.equal(state.inventory.length,count+(owned?0:1));
if(owned)assert.equal(state.weaponFus[basicId],previousFusion+1,'duplicado no fusiona');
assert.equal(basic.buy(),false,'arma básica se compra dos veces');
assert.equal(alternative.buy(),false,'dos alternativas compradas en la misma visita');
state.generateOffers();assert.equal(JSON.stringify(state.economyStock.basicWeaponIds),stockIds,'stock vuelve a sortearse');
assert(state.offers.premium.find(o=>o.weapon.id===basicId).disabled);
// Recuperación del dock: niveles reales y guardias incluso sobre tarjetas viejas.
for(const icon of ['hp','speed','armor','luck']) {
 const offer=state.runUpgradeOffers().find(o=>o.metaIcon===icon);
 let bought=0;while(offer.buy()){bought++;assert(bought<=state.UPGRADE_LEVELS[icon]);}
 assert(bought>0);assert.equal(offer.buy(),false);
 const maxed=state.runUpgradeOffers().find(o=>o.metaIcon===icon);
 assert(maxed.disabled);assert.equal(maxed.buy(),false);
}
assert.equal(state.player.maxHp,250);assert.equal(state.player.armor,15);assert.equal(state.player.luck,12);
assert(state.player.agility<=state.MAX_AGILITY);
assert.equal(state.upgradeSlots.filter(u=>u.icon==='hp').length,6);
assert.equal(state.upgradeSlots.filter(u=>u.icon==='speed').length,5,'sixth agility purchase has no meaningful effect');
assert.equal(state.player.agility,2);
state.player.agility=1.9999999999999998;
assert.equal(state.runUpgradeOffers().find(o=>o.metaIcon==='speed').buy(),false,'saved rounding residue must not allow a sixth purchase');
state.player.agility=2;
console.log('PASS restored upgrades: effects, levels, maximums and stale-card guards');
state.inventory=NV.WEAPONS.slice();for(const w of state.inventory)state.weaponFus[w.id]=3;
state.economyStock={consumables:['potion','shield'],premium:false,basicWeaponId:'none',basicWeaponIds:[],basicBought:false};
state.generateOffers();assert.equal(state.offers.premium.length,0,'sin stock no inventa una tarjeta de componente');
for(const [nextWave,capacity] of [[2,2],[4,2],[5,3],[9,3],[10,4],[14,4],[15,5],[19,5],[20,6],[80,6]]){
 state.wave=nextWave-1;state.inventory=[NV.WEAPONS[0]];state.weaponFus={};
 state.economyStock=NV.createEconomyStock(()=>.9);state.generateOffers();
 assert.equal(state.offers.premium.length,capacity,'ofertas reales para oleada '+nextWave);
 assert.equal(new Set(state.offers.premium.map(o=>o.weapon.id)).size,capacity);
 const ids=JSON.stringify(state.economyStock.basicWeaponIds);state.generateOffers();assert.equal(JSON.stringify(state.economyStock.basicWeaponIds),ids);
 assert(state.offers.premium.every(o=>NV.armoryRarityAvailable(o.weapon.rarity,nextWave)||state.inventory.some(w=>w.id===o.weapon.id)));
 const chosen=state.offers.premium[0];assert(chosen.buy());
 assert.equal(state.offers.premium[1].buy(),false,'una compra entre todas las alternativas');
 state.generateOffers();assert.equal(state.offers.premium.length,capacity,'compra no vacía ni repone cartas');
 assert(state.offers.premium.every(o=>o.disabled));
}
console.log('PASS armory progression: all thresholds, 6 real offers, stable stock, single choice');

// Preview, purchase and retained mastery use the same entry level.
assert.equal(NV.weaponPurchaseLevel({},'rifle'),1);
assert.equal(NV.weaponPurchaseLevel({pistol:51},'rifle'),41);
assert.equal(NV.weaponPurchaseLevel({pistol:100},'rifle'),80);
assert.equal(NV.weaponPurchaseLevel({pistol:100,rifle:94},'rifle'),94);
state.inventory=[NV.weaponById('pistol')];state.weaponFus={};
state.weaponLevels={pistol:100};state.weaponKills={pistol:800};
state.economyStock={consumables:['potion','shield'],premium:false,basicWeaponId:'rifle',basicWeaponIds:['rifle'],basicBought:false};
state.generateOffers();
const catchup=state.offers.premium.find(o=>o.weapon.id==='rifle');
assert(catchup.badge.includes('80')&&catchup.desc.includes('nivel 80'));
assert(catchup.buy());assert.equal(state.weaponLevels.rifle,80);
assert.equal(state.weaponKills.rifle,79*6,'new weapon must not repay the catch-up XP');
assert.equal(state.weaponLevels.pistol,100);assert.equal(state.weaponFus.rifle,undefined);
assert.equal(catchup.buy(),false);assert.equal(state.inventory.length,2);
console.log('PASS purchased alternatives: visible level, 80% catch-up capped at 80, preserved mastery, XP floor and no free fusion.');
