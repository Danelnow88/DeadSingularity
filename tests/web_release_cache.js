// La publicación no puede combinar HTML nuevo con JS/CSS antiguos en caché.
const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const resources=[...html.matchAll(/(?:src|href)="((?:js|css|assets)\/[^\"]+)"/g)].map(m=>m[1]);
assert(resources.length>60,'faltan recursos de producción');
for(const href of resources){
  const url=new URL(href.replaceAll('&amp;','&'),'https://game.test/');
  assert(url.searchParams.get('nv'),'recurso sin identificador de entrega: '+href);
  assert(fs.existsSync(url.pathname.slice(1)),'referencia inexistente: '+href);
}
for(const file of ['js/data/pilotAnimationBaseline.js','js/render/pilotGeometry.js','js/render/pilotAppearance.js','js/render/player.js'])
  assert(resources.some(h=>h.startsWith(file+'?')),'renderer sin versión: '+file);
console.log('PASS web_release_cache: '+resources.length+' recursos versionados');
