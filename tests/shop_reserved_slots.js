const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('js/game.js','utf8');
const render=src.slice(src.indexOf('  function renderOffers('),src.indexOf('  function renderShopInspector('));
function node(){return {attrs:{},events:{},children:[],classList:{add(){}},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,v){this.events[k]=v;},appendChild(n){this.children.push(n);},querySelector(){return null;}};}
const weapons=node(),upgrades=node(),consumables=node();
const box={window:{NV:{}},wave:1,dom:{weaponOffers:weapons},document:{createElement:node},visualRarity:()=> 'common',renderShopInspector(){},handleShopPurchase(){throw Error('reserva comprable');}};
vm.createContext(box);vm.runInContext(fs.readFileSync('js/data/balance.js','utf8'),box);box.NV=box.window.NV;
vm.runInContext(src.slice(src.indexOf('  function shopRestrictionIcon('),src.indexOf('  function drawWeaponCanvas(')),box);vm.runInContext(render,box);
const stock=[{kind:'weapon',name:'Arma',desc:'Oferta real',price:10}];
box.renderOffers(weapons,stock);
assert.equal(stock.length,1,'no modifica stock');assert.equal(weapons.children.length,6);
for(const n of weapons.children.slice(1)){assert.equal(n.attrs.role,'note');assert.equal(n.attrs['aria-disabled'],'true');assert(n.innerHTML.includes('<svg'));assert(!n.events.keydown);n.events.click();assert(!/Próximamente|futuras etapas|Espacio reservado/.test(n.innerHTML));}
assert.equal(weapons.children[1].attrs['aria-label'],'Sin stock en esta visita');
for(let i=2;i<6;i++)assert.equal(weapons.children[i].attrs['aria-label'],'Disponible desde la oleada '+box.NV.ARMORY_SLOT_WAVES[i]);
box.renderOffers(upgrades,stock);box.renderOffers(consumables,stock);
assert.equal(upgrades.children.length,1);assert.equal(consumables.children.length,1);
assert(!fs.readFileSync('css/shop-remaster.css','utf8').includes('grid-auto-rows:152px'));
const empty=node();box.dom.weaponOffers=empty;const none=[];box.renderOffers(empty,none);assert.equal(none.length,0);assert.equal(empty.children.length,6);
box.wave=19;const late=node();box.dom.weaponOffers=late;box.renderOffers(late,none);assert(late.children.every(n=>n.attrs['aria-label']==='Sin stock en esta visita'));
console.log('PASS shop progression slots: real unlock labels, honest zero stock, no purchases on placeholders');
