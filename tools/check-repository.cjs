'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const result = spawnSync('git', ['-c', 'safe.directory=' + root, 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' });
if (result.error || result.status !== 0) {
  console.error(result.error || result.stderr);
  process.exit(1);
}
const files = [...new Set(result.stdout.split('\0').filter(Boolean))];
const forbidden = /^(?:node_modules|local|releases)\/|\.lnk$|(?:^|\/)\.env(?:\.|$)|\.(?:pfx|p12|key)$/i;
let bytes = 0;
const failures = [];
if (!files.includes('docs/releases/growth-1.manifest.json')) failures.push('Falta manifiesto de entrega en los archivos publicables');
for (const file of files) {
  if (forbidden.test(file) && !file.endsWith('.env.example')) failures.push('No publicar: ' + file);
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) continue; // Eliminacion local pendiente de registrar en Git.
  const stat = fs.statSync(absolute);
  if (!stat.isFile()) continue;
  bytes += stat.size;
  if (stat.size > 20 * 1024 * 1024) failures.push('Revisar archivo >20 MiB: ' + file);
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('PASS higiene Git: ' + files.length + ' rutas candidatas, ' + (bytes / 1048576).toFixed(2) + ' MiB. No reemplaza una auditoria de secretos.');
