/* La tienda sigue siendo tres paneles, pero cada oferta debe poder explicar su
   función sin obligar a leer todas las tarjetas. Este contrato evita que una
   futura pasada visual quite esa ayuda contextual o rompa el uso por teclado. */
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const game = fs.readFileSync('js/game.js', 'utf8');
const css = fs.readFileSync('css/shop-remaster.css', 'utf8');

for (const section of ['shop-section-calibrations', 'shop-section-armory', 'shop-section-protocols']) {
  assert(html.includes(`class="shop-section ${section}"`), `se conserva el panel principal ${section}`);
}
for (const id of ['shopInspector', 'shopInspectorIcon', 'shopInspectorKind', 'shopInspectorName', 'shopInspectorDesc', 'shopInspectorPrice']) {
  assert(html.includes(`id="${id}"`), `detalle contextual ${id}`);
}
assert(game.includes('function renderShopInspector(item)'), 'render contextual disponible');
assert(game.includes("el.addEventListener('pointerenter', inspect)"), 'hover actualiza detalle');
assert(game.includes("el.addEventListener('focus', inspect)"), 'foco de teclado actualiza detalle');
assert(game.includes("el.addEventListener('click', inspect)"), 'toque/clic actualiza detalle');
assert(css.includes('grid-template-columns:repeat(3,minmax(0,1fr))'), 'desktop conserva tres tarjetas');
assert(css.includes('@media (max-width:700px)'), 'móvil adapta la composición');
assert(css.includes('#shopInspector .shop-inspector-copy'), 'estilos del detalle apuntan al id real');
assert(css.includes('scrollbar-width:none'), 'la tienda no muestra barras de scroll internas');
assert(css.includes('transform:none'), 'hover de ofertas no desplaza ni desborda tarjetas');
assert(game.includes('Sin stock') && game.includes('compras '), 'badges de consumibles son claros');

console.log('shop remaster contract OK');
