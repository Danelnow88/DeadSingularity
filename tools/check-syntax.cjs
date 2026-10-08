'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
let checked = 0;
function walk(relative) {
  for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(relative, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(?:js|cjs|mjs)$/.test(entry.name)) {
      const result = spawnSync(process.execPath, ['--check', file], { cwd: root, encoding: 'utf8' });
      if (result.error || result.status !== 0) {
        console.error('FAIL syntax ' + file, result.error || result.stderr);
        process.exit(1);
      }
      checked++;
    }
  }
}
for (const directory of ['js', 'desktop', 'tools', 'src']) walk(directory);
console.log('PASS sintaxis: ' + checked + ' archivos; sin ejecutar ni modificar gameplay.');
