// Build reproducible por lista permitida. Cada entrega va a una carpeta NUEVA:
// no borra entregas anteriores, partidas, documentos ni contenido del usuario.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const pkg = require('../package.json');
const windows = process.argv.includes('--windows');
const base = path.join(ROOT, 'releases');
fs.mkdirSync(base, { recursive: true });
const out = fs.mkdtempSync(path.join(base, 'NEON-VOID-' + pkg.version + (windows ? '-windows-' : '-web-')));
let game = out;
if (windows) {
  const electronDist = path.join(ROOT, 'node_modules', 'electron', 'dist');
  if (!fs.existsSync(path.join(electronDist, 'electron.exe'))) throw new Error('Falta Electron. Ejecutá npm run runtime:install con Node >=22.12.');
  fs.cpSync(electronDist, out, { recursive: true });
  fs.renameSync(path.join(out, 'electron.exe'), path.join(out, 'NEON VOID.exe'));
  game = path.join(out, 'resources', 'app'); fs.mkdirSync(game, { recursive: true });
}
for (const dir of ['css', 'js', 'assets']) fs.cpSync(path.join(ROOT, dir), path.join(game, dir), { recursive: true });
// El overlay 3D experimental depende de Internet y no forma parte de la alpha.
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
  .replace(/\s*<script type="importmap">[\s\S]*?<\/script>/, '')
  .replace(/\s*<script type="module">[\s\S]*?<\/script>/, '');
fs.writeFileSync(path.join(game, 'index.html'), html);
if (windows) {
  fs.mkdirSync(path.join(game, 'desktop'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'desktop', 'main.cjs'), path.join(game, 'desktop', 'main.cjs'));
  fs.copyFileSync(path.join(ROOT, 'desktop', 'special-qa.cjs'), path.join(game, 'desktop', 'special-qa.cjs'));
  fs.copyFileSync(path.join(ROOT, 'desktop', 'pilot-qa.cjs'), path.join(game, 'desktop', 'pilot-qa.cjs'));
  fs.copyFileSync(path.join(ROOT, 'desktop', 'audio-qa.cjs'), path.join(game, 'desktop', 'audio-qa.cjs'));
  fs.copyFileSync(path.join(ROOT, 'desktop', 'lobby-qa.cjs'), path.join(game, 'desktop', 'lobby-qa.cjs'));
  fs.writeFileSync(path.join(game, 'package.json'), JSON.stringify({ name: pkg.name, version: pkg.version, main: 'desktop/main.cjs', private: true }, null, 2));
}
const instructions = 'NEON VOID — ALPHA ' + pkg.version + '\r\n\r\n' +
  (windows ? 'Abrí NEON VOID.exe. No requiere instalar Node ni conexión. Conservá toda esta carpeta, no sólo el EXE. F11: pantalla completa.\r\n' : 'Abrí index.html con Edge o Chrome actual. No requiere instalación ni conexión.\r\n') +
  '\r\nWASD/flechas: movimiento. Mouse/clic: disparo. Shift: dash. Espacio: especial. 1–6/rueda: armas. Q/E: objeto. F: usar. P: pausa.\r\n' +
  '\r\nPara avanzar una oleada común: sobreviví el tiempo mínimo y eliminá los enemigos restantes. El HUD muestra BAJAS, FALTAN APARECER y segundos; al agotarse el reloj indica LIMPIEZA.\r\n' +
  '\r\nHistoria: 20 oleadas, cuatro sectores y diez jefes distintos. Alternás asalto y jefe; al vencer al décimo termina la misión. Otra Historia empieza de cero con tus mejoras permanentes. Los guardados anteriores mantienen su ruta original. Infinito: continuar sin límite. En la tienda la preparación es opcional.\r\n' +
  '\r\nContinuar restaura el último checkpoint entre oleadas. Los datos se guardan localmente. La app Windows y el navegador tienen guardados separados; Récords permite EXPORTAR/IMPORTAR PROGRESO.\r\n' +
  '\r\nAlpha: no tiene integración Steam, multijugador ni logros online. No está firmada digitalmente. No es una publicación comercial aprobada.\r\n';
fs.writeFileSync(path.join(out, 'LEEME.txt'), instructions);
fs.copyFileSync(path.join(ROOT, 'docs', 'THIRD_PARTY_NOTICES.md'), path.join(out, 'AVISOS.md'));
const files = [];
function walk(dir) { for (const item of fs.readdirSync(dir, { withFileTypes: true })) { const file = path.join(dir, item.name); if (item.isDirectory()) walk(file); else files.push({ path: path.relative(out, file).replaceAll('\\', '/'), size: fs.statSync(file).size, sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') }); } }
walk(out);
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ version: pkg.version, platform: windows ? 'win32-x64' : 'web', createdAt: new Date().toISOString(), files }, null, 2));
console.log(out);
