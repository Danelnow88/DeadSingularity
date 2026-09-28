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

t('estructura: no queda early return que borre la tarjeta y los dos topes marcan disabled', () => {
  if (/if \(bought >= CONSUMABLE_CAP\) return;/.test(game)) throw new Error('sigue el early return que hace desaparecer la oferta');
  if (!game.includes('const visitFull = bought >= CONSUMABLE_CAP;')) throw new Error('sin bandera de tope por visita');
  if (!game.includes('disabled: stackFull || visitFull || typeSlotsFull')) throw new Error('la oferta no marca ambos topes como disabled');
  if (visitCap !== 3) throw new Error('cap por visita alterado: ' + visitCap);
});

t('3 compras del mismo consumible en una visita: la tarjeta sigue visible y bloqueada', () => {
  const shop = makeShop(500);
  shop.sandbox.consumableItems.push(...stack('potion', 3));
  shop.sandbox.consumableBought.potion = 3;
  const offers = shop.run();
  if (offers.length !== 7) throw new Error('desaparecieron tarjetas: ' + offers.length);
  const potion = offers.find((o) => o.consumableType === 'potion');
  if (!potion) throw new Error('la tarjeta de potion desapareció al llegar al tope de visita');
  if (!potion.disabled) throw new Error('la tarjeta no quedó bloqueada');
  const expected = 'Visita ' + visitCap + '/' + visitCap;
  if (potion.disabledReason !== expected) throw new Error('motivo: ' + potion.disabledReason);
  if (!potion.badge.includes('3/' + visitCap)) throw new Error('badge sin contador de visita: ' + potion.badge);
  // Las otras tarjetas no se ven afectadas por el tope de potion.
  const shield = offers.find((o) => o.consumableType === 'shield');
  if (shield.disabled) throw new Error('otro tipo quedó bloqueado por contagio');
});

t('2 compras: la tarjeta sigue comprable (el bloqueo aparece exactamente en el tope)', () => {
  const shop = makeShop(500);
  shop.sandbox.consumableItems.push(...stack('potion', 2));
  shop.sandbox.consumableBought.potion = 2;
  const potion = shop.run().find((o) => o.consumableType === 'potion');
  if (!potion || potion.disabled) throw new Error('bloqueó antes del tope');
  if (potion.badge.includes(visitCap + '/' + visitCap)) throw new Error('badge ya en tope');
});

t('10 unidades del mismo tipo: la tarjeta sigue visible y bloqueada por límite global', () => {
  const shop = makeShop(500);
  shop.sandbox.consumableItems.push(...stack('potion', 10));
  const offers = shop.run();
  if (offers.length !== 7) throw new Error('desaparecieron tarjetas: ' + offers.length);
  const potion = offers.find((o) => o.consumableType === 'potion');
  if (!potion) throw new Error('la tarjeta de potion desapareció al llegar al límite global');
  if (!potion.disabled) throw new Error('la tarjeta no quedó bloqueada');
  if (potion.disabledReason !== 'Límite 10/10') throw new Error('motivo: ' + potion.disabledReason);
});

t('prioridad de motivos: global 10/10 > visita 3/3 > slots 6/6', () => {
  const sixTypes = ['potion', 'overdrive', 'shield', 'bomb', 'freeze', 'magnet'];
  // (1) Global + visita simultáneos => gana el global.
  const both = makeShop(500);
  both.sandbox.consumableItems.push(...stack('potion', 10));
  both.sandbox.consumableBought.potion = 3;
  const global = both.run().find((o) => o.consumableType === 'potion');
  if (global.disabledReason !== 'Límite 10/10') throw new Error('prioridad global: ' + global.disabledReason);

  // (2) Visita + slots de tipos simultáneos => gana la visita.
  const visitVsSlots = makeShop(500);
  sixTypes.forEach((type) => visitVsSlots.sandbox.consumableItems.push({ type, name: type }));
  visitVsSlots.sandbox.consumableBought.potion = 3;
  const visit = visitVsSlots.run().find((o) => o.consumableType === 'potion');
  if (visit.disabledReason !== 'Visita ' + visitCap + '/' + visitCap) throw new Error('prioridad visita: ' + visit.disabledReason);

  // (3) Sólo slots de tipos => motivo de slots.
  const slotsOnly = makeShop(500);
  sixTypes.forEach((type) => slotsOnly.sandbox.consumableItems.push({ type, name: type }));
  const bounty = slotsOnly.run().find((o) => o.consumableType === 'bounty');
  if (bounty.disabledReason !== 'Slots 6/6') throw new Error('motivo de slots: ' + bounty.disabledReason);
});

t('4ta compra defensiva: no cobra shards ni agrega stock aunque la UI quede desincronizada', () => {
  const shop = makeShop(100);
  shop.sandbox.consumableItems.push(...stack('potion', 2));
  shop.sandbox.consumableBought.potion = 2;
  const potion = shop.run().find((o) => o.consumableType === 'potion');
  if (potion.disabled) throw new Error('precondición: la tarjeta debería estar habilitada');
  // La UI quedó vieja: justo antes del click ya se consumió el 3er cupo de la visita.
  shop.sandbox.consumableBought.potion = 3;
  const stockBefore = shop.sandbox.consumableItems.length;
  const shardsBefore = shop.sandbox.shards;
  const ok = shop.sandbox.handleShopPurchase(potion, { classList: makeClassList() });
  if (ok !== false) throw new Error('la 4ta compra no fue rechazada');
  if (shop.sandbox.consumableItems.length !== stockBefore) throw new Error('agregó stock con el tope alcanzado');
  if (shop.sandbox.shards !== shardsBefore) throw new Error('cobró shards con el tope alcanzado');
  if (shop.sandbox.consumableBought.potion !== 3) throw new Error('contador de visita alterado');
  if (!shop.calls.floats.some((text) => String(text).includes('3/' + visitCap))) throw new Error('sin feedback del tope de visita');
});

t('3 compras reales por visita: el 3er click compra y el 4to (tarjeta ya bloqueada) no muta nada', () => {
  const shop = makeShop(100);
  const offerFor = () => shop.run().find((o) => o.consumableType === 'potion');
  for (let i = 0; i < 3; i++) {
    const offer = offerFor();
    if (offer.disabled) throw new Error('se bloqueó antes del click ' + (i + 1));
    if (shop.sandbox.handleShopPurchase(offer, { classList: makeClassList() }) !== true) throw new Error('la compra ' + (i + 1) + ' no se efectuó');
    if (shop.sandbox.consumableBought.potion !== i + 1) throw new Error('contador tras compra ' + (i + 1) + ': ' + shop.sandbox.consumableBought.potion);
  }
  if (shop.sandbox.consumableItems.length !== 3) throw new Error('stock final incorrecto: ' + shop.sandbox.consumableItems.length);
  if (shop.sandbox.shards !== 100 - 3 * 10) throw new Error('shards incorrectos: ' + shop.sandbox.shards);
  const blocked = offerFor();
  if (!blocked || !blocked.disabled) throw new Error('la tarjeta no quedó bloqueada tras el 3er click');
  const stockBefore = shop.sandbox.consumableItems.length;
  const shardsBefore = shop.sandbox.shards;
  if (shop.sandbox.handleShopPurchase(blocked, { classList: makeClassList() }) !== false) throw new Error('el 4to click no fue rechazado');
  if (shop.sandbox.consumableItems.length !== stockBefore || shop.sandbox.shards !== shardsBefore) throw new Error('el 4to click mutó estado');
});

console.log('RESULT shop_consumable_caps: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);
