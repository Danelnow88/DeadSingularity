// Comprueba la entrega pública real; no escribe ni publica archivos.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const base = new URL(process.argv[2] || 'https://danelnow88.github.io/JuegoDemo/');
// fetch elimina BOM UTF-8; fs conserva ese marcador. No es una diferencia de código.
const normalize = text => text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
const localHTML = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const resources = new Set(['index.html']);
for (const match of localHTML.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)=["']([^"']+)["']/gi)) {
  if (/^(?:https?:|\/\/|data:)/i.test(match[1])) continue;
  if (/\.(?:js|css)(?:\?|$)/i.test(match[1])) resources.add(match[1]);
}
async function check(resource) {
  const url = new URL(resource, base);
  url.searchParams.set('verify', Date.now().toString());
  const response = await fetch(url, {signal: AbortSignal.timeout(30000), cache:'no-store'});
  assert.equal(response.status, 200, resource + ': HTTP');
  const localPath = path.resolve(root, resource.split('?')[0]);
  assert(localPath.startsWith(root + path.sep), 'Ruta fuera del proyecto');
  assert.equal(normalize(await response.text()), normalize(fs.readFileSync(localPath, 'utf8')), resource + ': Pages difiere del estado local');
}
(async () => {
  const queue = [...resources];
  await Promise.all(Array.from({length: 6}, async () => {while (queue.length) await check(queue.shift());}));
  console.log('PASS Pages: HTML y ' + (resources.size - 1) + ' scripts/styles coinciden con local.');
})().catch(error => {console.error(error.message.slice(0, 700)); process.exitCode = 1;});
