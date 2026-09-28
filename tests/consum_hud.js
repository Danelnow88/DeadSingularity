// Tests Fix 3: HUD de armas/consumibles en grillas de 6 slots + selección de consumible.
const fs = require('fs'), vm = require('vm');
let pass = 0, fail = 0;
function t(desc, fn) { try { fn(); pass++; console.log('  ok  ' + desc); } catch (e) { fail++; console.log('  FAIL ' + desc + ' -> ' + e.message); } }
function load(f, sbx) { vm.runInNewContext(fs.readFileSync(f, 'utf8'), sbx, { filename: f }); }

const sbx = { window: { NV: {} }, console, Math };
load('js/data/gameData.js', sbx);
load('js/core/utils.js', sbx);
const NV = sbx.window.NV;

t('groupConsumables: agrupa por tipo con conteo y orden de aparición', () => {
  const items = [{ type: 'potion' }, { type: 'shield' }, { type: 'potion' }];
  const g = NV.groupConsumables(items);
  if (g.length !== 2 || g[0].type !== 'potion' || g[0].count !== 2 || g[1].count !== 1) throw new Error(JSON.stringify(g));
});

t('consumeByType: quita la ÚLTIMA instancia del tipo elegido y preserva la primera aparición', () => {
  const items = [{ type: 'potion', id: 1 }, { type: 'potion', id: 2 }, { type: 'shield', id: 3 }];
  const got = NV.consumeByType(items, 'shield');
  if (!got || got.id !== 3) throw new Error('no quitó el shield');
  if (items.length !== 2 || items[0].id !== 1) throw new Error('mutación incorrecta');
  if (NV.consumeByType([], 'potion') !== null) throw new Error('vacío debería dar null');
  // Contrato de slots: consumir un tipo con varias unidades no mueve su primera aparición.
  const interleaved = [{ type: 'potion', id: 1 }, { type: 'shield', id: 2 }, { type: 'potion', id: 3 }];
  const removed = NV.consumeByType(interleaved, 'potion');
  if (!removed || removed.id !== 3) throw new Error('debería consumir la última instancia');
  if (interleaved[0].id !== 1) throw new Error('la primera aparición se movió');
});

t('P1: array intercalado [potion, shield, bomb, potion, shield, potion] conserva el orden de grupos', () => {
  const items = [
    { type: 'potion', name: 'Poción' }, { type: 'shield', name: 'Escudo' }, { type: 'bomb', name: 'Bomba' },
    { type: 'potion', name: 'Poción' }, { type: 'shield', name: 'Escudo' }, { type: 'potion', name: 'Poción' },
  ];
  const expected = 'potion,shield,bomb';
  if (NV.groupConsumables(items).map((x) => x.type).join(',') !== expected) throw new Error('orden inicial');
  // 2 consumos: quedan 1 potion, 2 shield, 1 bomb => el orden no puede cambiar.
  for (let use = 0; use < 2; use++) {
    if (!NV.consumeByType(items, 'potion')) throw new Error('no consumió potion en el uso ' + (use + 1));
    const order = NV.groupConsumables(items).map((x) => x.type).join(',');
    if (order !== expected) throw new Error('uso ' + (use + 1) + ' reordenó: ' + order);
    if (NV.groupConsumables(items)[0].count !== 2 - use) throw new Error('conteo de potion incorrecto en uso ' + (use + 1));
  }
  // El último consumo de potion vacía el tipo: recién ahí su slot desaparece y los
  // restantes se reconcilian (shield pasa a 0, bomb a 1) sin tocar su orden relativo.
  if (!NV.consumeByType(items, 'potion')) throw new Error('no consumió la última potion');
  const after = NV.groupConsumables(items).map((x) => x.type).join(',');
  if (after !== 'shield,bomb') throw new Error('tras vaciar el tipo: ' + after);
  if (NV.consumableCountByType(items, 'potion') !== 0) throw new Error('quedaron pociones');
});

t('P1: con los 6 slots de tipo ocupados y stacks múltiples, spamear no reordena slots', () => {
  const types = ['potion', 'overdrive', 'shield', 'bomb', 'freeze', 'magnet'];
  const items = [];
  // Alta intercalada (como compras en visitas sucesivas): 3 unidades por tipo.
  for (let round = 0; round < 3; round++) types.forEach((type) => NV.addConsumable(items, { type, name: type }, 10, 6));
  const expected = types.join(',');
  if (NV.groupConsumables(items).map((x) => x.type).join(',') !== expected) throw new Error('orden inicial');
  for (let use = 0; use < 8; use++) {
    const type = types[use % types.length];
    if (!NV.consumeByType(items, type)) throw new Error('no consumió ' + type);
    const order = NV.groupConsumables(items).map((x) => x.type).join(',');
    if (order !== expected) throw new Error('uso ' + (use + 1) + ' reordenó los slots: ' + order);
  }
  if (NV.consumableTypeCount(items) !== 6) throw new Error('se perdió un tipo');
});

t('P1: consumir la última unidad de un tipo lo elimina y reconcilia sin huecos ni saltos', () => {
  const items = [
    { type: 'potion', name: 'Poción' }, { type: 'shield', name: 'Escudo' },
    { type: 'bomb', name: 'Bomba' }, { type: 'potion', name: 'Poción' },
  ];
  if (NV.groupConsumables(items).map((x) => x.type).join(',') !== 'potion,shield,bomb') throw new Error('orden inicial');
  NV.consumeByType(items, 'potion');
  if (NV.groupConsumables(items).map((x) => x.type).join(',') !== 'potion,shield,bomb') throw new Error('se movió antes de tiempo');
  NV.consumeByType(items, 'potion');
  const order = NV.groupConsumables(items);
  if (order.map((x) => x.type).join(',') !== 'shield,bomb') throw new Error('no se reconcilió al vaciar el tipo');
  if (order.some((x) => !x.type || x.count !== 1)) throw new Error('grupo inválido tras reconciliar: ' + JSON.stringify(order));
  if (items.length !== 2) throw new Error('longitud incorrecta: ' + items.length);
  // El tipo liberado puede volver como tipo nuevo al final del orden de aparición.
  NV.addConsumable(items, { type: 'potion', name: 'Poción' }, 10, 6);
  if (NV.groupConsumables(items).map((x) => x.type).join(',') !== 'shield,bomb,potion') throw new Error('reingreso mal ubicado');
});

t('tope acumulado de consumibles por tipo: addConsumable bloquea al llegar a 10', () => {
  NV.CONSUMABLE_STACK_CAP = 10;
  NV.CONSUMABLE_TYPE_SLOT_CAP = 6;
  const items = Array.from({ length: 10 }, () => ({ type: 'potion', name: 'Poción' }));
  if (NV.consumableCountByType(items, 'potion') !== 10) throw new Error('count potion');
  if (NV.canAddConsumable(items, 'potion', 10)) throw new Error('debería bloquear potion llena');
  if (NV.addConsumable(items, { type: 'potion', name: 'Poción' }, 10)) throw new Error('agregó sobre cap');
  if (!NV.addConsumable(items, { type: 'shield', name: 'Escudo' }, 10)) throw new Error('bloqueó otro tipo');
  NV.consumeByType(items, 'potion');
  if (!NV.addConsumable(items, { type: 'potion', name: 'Poción' }, 10)) throw new Error('no permitió tras consumir');
});

t('tope de slots por tipo: bloquea 7mo tipo pero permite stackear tipo existente', () => {
  NV.CONSUMABLE_STACK_CAP = 10;
  NV.CONSUMABLE_TYPE_SLOT_CAP = 6;
  const types = ['potion', 'overdrive', 'shield', 'bomb', 'freeze', 'magnet'];
  const items = types.map((type) => ({ type, name: type }));
  if (NV.consumableTypeCount(items) !== 6) throw new Error('tipos=' + NV.consumableTypeCount(items));
  if (NV.canAddConsumable(items, 'bounty', 10, 6)) throw new Error('debería bloquear 7mo tipo');
  if (NV.addConsumable(items, { type: 'bounty', name: 'Recompensa' }, 10, 6)) throw new Error('agregó 7mo tipo');
  if (!NV.addConsumable(items, { type: 'potion', name: 'Poción' }, 10, 6)) throw new Error('bloqueó stack de tipo existente');
  for (let i = 0; i < 2; i++) NV.consumeByType(items, 'potion');
  if (NV.consumableTypeCount(items) !== 5) throw new Error('al vaciar tipo deberían quedar 5');
  if (!NV.addConsumable(items, { type: 'bounty', name: 'Recompensa' }, 10, 6)) throw new Error('no permitió tipo nuevo tras liberar slot');
});

t('cycleIndex: cicla selección en ambos sentidos sin salirse', () => {
  if (NV.cycleIndex(0, 3, -1) !== 2) throw new Error('wrap abajo');
  if (NV.cycleIndex(2, 3, 1) !== 0) throw new Error('wrap arriba');
  if (NV.cycleIndex(5, 0, 1) !== 0) throw new Error('lista vacía segura');
});

t('HUD dibuja filas horizontales (drawSlotRow) y expone rects para el click', () => {
  const h = fs.readFileSync('js/render/hud.js', 'utf8');
  if ((h.match(/drawSlotRow/g) || []).length < 2) throw new Error('faltan filas horizontales de slots');
  if (!h.includes('NV.consumSlotRects')) throw new Error('sin rects para hit-test');
  if (!h.includes('NV.drawConsumableIcon')) throw new Error('HUD no usa iconos canvas de consumibles');
  if (h.includes('return { icon: g.icon')) throw new Error('HUD conserva placeholder g.icon');
});

t('game.js conecta Q (ciclar), F (usar seleccionado) y click en slot', () => {
  const g = fs.readFileSync('js/game.js', 'utf8');
  if (!g.includes("canvas.addEventListener('click'")) throw new Error('sin click handler');
  const start = g.indexOf('function startGame()');
  const next = g.indexOf('function nextWave()', start);
  if (start < 0 || next < 0 || !g.slice(start, next).includes('consumSel = 0;')) throw new Error('sin reset por partida');
  if (!g.includes('NV.consumeByType(consumableItems')) throw new Error('F no usa el tipo seleccionado');
});

t('P1.5: selección preservada por identidad de tipo tras consumir (no salta a otro stack)', () => {
  const g = fs.readFileSync('js/game.js', 'utf8');
  if (!g.includes('function reconcileConsumSel')) throw new Error('helper de reconciliación ausente');
  if (!g.includes('preserveType')) throw new Error('reconcileConsumSel no preserva tipo');
  if (!g.includes('findIndex')) throw new Error('no reubica por identidad de tipo');
  if (!g.includes('reconcileConsumSel(selectedType)')) throw new Error('no preserva tipo tras consumir');
  if (g.includes('consumSel = Math.max(0, consumSel - 1);')) throw new Error('heurística vieja de selección presente');
  const h = fs.readFileSync('js/render/hud.js', 'utf8');
  if (h.includes('wItem.fuseLevel')) throw new Error('HUD aún lee fuseLevel de instancia');
  if (!h.includes('fusionFor(wItem.id)')) throw new Error('HUD no consume estado central de fusión');
  if (!g.includes('weaponFusionLevelFor')) throw new Error('game.js no pasa callback de fusión al HUD');
});

console.log('RESULT consum_hud: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);