// Tests: topes de compra de consumibles en la tienda.
// Regla: los DOS topes (3 compras por visita y 10 unidades globales por tipo) comparten
// el mismo estado visual de tarjeta: se marca "BLOQUEADO" y la tarjeta NUNCA desaparece.
const fs = require('fs');
const vm = require('vm');

let pass = 0, fail = 0;
function t(desc, fn) { try { fn(); pass++; console.log('  ok  ' + desc); } catch (e) { fail++; console.log('  FAIL ' + desc + ' -> ' + e.message); } }

const game = fs.readFileSync('js/game.js', 'utf8');

// Extrae un bloque balanceado de llaves que empieza en `marker`, incluyendo el `;` final.
function extractBlock(source, marker) {
  const start = source.indexOf(marker);
  if (start < 0) throw new Error('no se encontró el bloque: ' + marker);
  let depth = 0;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(start, source.indexOf(';', i) + 1);
    }
  }
  throw new Error('bloque incompleto: ' + marker);
}

// Igual que shop_balance_feedback.js: extrae una función completa por nombre.
function extractFunction(source, name) {
  const start = source.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('no se encontró ' + name);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  for (let i = bodyStart; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error('función incompleta: ' + name);
}

const offersBlock = extractBlock(game, 'NV.consumableList().forEach((c) => {');
const visitCap = Number(/const CONSUMABLE_CAP = (\d+);/.exec(game)[1]);

function makeClassList() {
  const values = new Set();
  return { add(v) { values.add(v); }, remove(v) { values.delete(v); }, contains(v) { return values.has(v); } };
}


// Sandbox real: data + utils del proyecto (caps reales) + el bloque de ofertas de la tienda
// + el pipeline de compra (handleShopPurchase) sin duplicar lógica de producción.
function makeShop(initialShards) {
  const calls = { floats: [], generated: 0, hud: 0, inventory: 0, sound: 0 };
  const balance = { classList: makeClassList(), offsetWidth: 40, onanimationend: null, textContent: String(initialShards) };
  const sandbox = {
    console, Math, JSON, String, Number, Array, Object, Set, Boolean, RegExp, Date,
    window: {},
    SHOP_BALANCE_INSUFFICIENT_CLASS: 'shop-balance-insufficient',
    CONSUMABLE_CAP: visitCap,
    consumableBought: {},
    consumableItems: [],
    consumables: [],
    economyStock: {consumables:['potion','shield']},
    shards: initialShards,
    dom: { shopShards: balance },
    arenaW: () => 900,
    arenaH: () => 520,
    addFloatText: (x, y, text) => { calls.floats.push(text); },
    showBanner: (text) => { calls.floats.push(text); },
    generateOffers: () => { calls.generated++; },
    updateHUD: () => { calls.hud++; },
    renderInventory: () => { calls.inventory++; },
    setTimeout: (fn) => fn(),
    sfx: { shopBuy: () => { calls.sound++; } },
  };
  sandbox.window.NV = {};
  // El bloque de ofertas corre dentro del IIFE de game.js, donde `NV` es un binding local.
  // Al extraerlo hay que exponerlo como global del contexto (misma referencia que window.NV).
  sandbox.NV = sandbox.window.NV;
  vm.createContext(sandbox);
  for (const file of ['js/data/consumables.js', 'js/core/utils.js']) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
  }
  // game.js deriva ambos caps de NV (shop_meta.js cubre ese vínculo); aquí se replican
  // como globales del contexto para poder ejecutar el bloque de ofertas extraído.
  sandbox.CONSUMABLE_STACK_CAP = sandbox.window.NV.CONSUMABLE_STACK_CAP;
  sandbox.CONSUMABLE_TYPE_SLOT_CAP = sandbox.window.NV.CONSUMABLE_TYPE_SLOT_CAP;
  vm.runInContext([
    extractFunction(game, 'clearShopBalanceFeedback'),
    extractFunction(game, 'restartShopBalanceFeedback'),
    extractFunction(game, 'handleShopPurchase'),
  ].join('\n'), sandbox, { filename: 'shop-purchase' });
  return {
    sandbox, balance, calls,
    run: () => {
      // Cada render reconstruye el array de ofertas (renderOffers tampoco acumula).
      sandbox.consumables.length = 0;
      vm.runInContext(offersBlock, sandbox, { filename: 'offers' });
      return sandbox.consumables.slice(); // copia: la próxima llamada limpia el original
    },
  };
}

function stack(type, count) {
  return Array.from({ length: count }, () => ({ type, name: type }));
}

t('stock fijo: dos consumibles, uno de cada tipo por visita',()=>{
  const shop=makeShop(100),offers=shop.run();
  if(visitCap!==1||offers.length!==2)throw Error('stock o cap incorrecto');
  const potion=offers.find(o=>o.consumableType==='potion');
  if(!shop.sandbox.handleShopPurchase(potion,{classList:makeClassList()}))throw Error('compra falló');
  const blocked=shop.run().find(o=>o.consumableType==='potion');
  if(!blocked.disabled||shop.sandbox.shards!==90)throw Error('tope o saldo');
  if(shop.sandbox.handleShopPurchase(blocked,{classList:makeClassList()})!==false)throw Error('segunda compra permitida');
});
t('inventario: máximo tres por tipo con tarjeta visible',()=>{
 const shop=makeShop(100);shop.sandbox.consumableItems.push(...stack('potion',3));
 const offer=shop.run().find(o=>o.consumableType==='potion');
 if(!offer.disabled||offer.disabledReason!=='Límite 3/3')throw Error('límite');
});
t('tarjeta vieja: compra rechazada devuelve el saldo',()=>{
 const shop=makeShop(100),offer=shop.run().find(o=>o.consumableType==='potion');
 shop.sandbox.consumableBought.potion=1;
 if(shop.sandbox.handleShopPurchase(offer,{classList:makeClassList()})!==false)throw Error('stale permitida');
 if(shop.sandbox.shards!==100||shop.sandbox.consumableItems.length)throw Error('saldo o inventario alterado');
});
t('slots de tipos completos: no cobra otro tipo',()=>{
 const shop=makeShop(100);shop.sandbox.economyStock.consumables=['potion','bounty'];
 ['potion','overdrive','shield','bomb','freeze','magnet'].forEach(type=>shop.sandbox.consumableItems.push({type}));
 const offer=shop.run().find(o=>o.consumableType==='bounty');
 if(!offer.disabled||offer.disabledReason!=='Slots 6/6')throw Error('slots');
});
console.log('RESULT shop_consumable_caps: pass='+pass+' fail='+fail);process.exit(fail?1:0);
