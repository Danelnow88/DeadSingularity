'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const script = path.join(root, 'tools/create-shortcuts.ps1');
assert(fs.existsSync(script));
for (const name of ['ABRIR_V1.cmd', 'ABRIR_V1_WEB.cmd']) {
  const launcher = fs.readFileSync(path.join(root, name), 'utf8');
  assert(launcher.includes('%~dp0'));
  assert(launcher.includes('node_modules\\electron\\dist\\electron.exe'));
  assert(!launcher.includes('JuegoDemo'));
}
if (process.platform === 'win32') {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'dsv1-shortcuts-'));
  fs.mkdirSync(path.join(fixture, 'assets/brand'), { recursive: true });
  fs.copyFileSync(path.join(root, 'assets/brand/icon.ico'), path.join(fixture, 'assets/brand/icon.ico'));
  for (const name of ['ABRIR_V1.cmd', 'ABRIR_V1_WEB.cmd']) fs.writeFileSync(path.join(fixture, name), '@echo off\r\nexit /b 0\r\n');
  function run() {
    return spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, '-ProjectRoot', fixture], { encoding: 'utf8', timeout: 30000 });
  }
  const first = run();
  assert.equal(first.status, 0, first.stderr || String(first.error));
  const records = first.stdout.trim().split(/\r?\n/).map(line => JSON.parse(line));
  assert.equal(records.length, 2);
  assert(records.every(record => record.Created && record.Verified && record.Target.startsWith(fixture + path.sep) && record.Icon.startsWith(fixture + path.sep)));
  const snapshots = records.map(record => fs.readFileSync(path.join(fixture, record.Name)));
  const second = run();
  assert.equal(second.status, 0, second.stderr);
  assert(second.stdout.trim().split(/\r?\n/).map(line => JSON.parse(line)).every(record => !record.Created && record.Verified));
  records.forEach((record, index) => assert.deepEqual(fs.readFileSync(path.join(fixture, record.Name)), snapshots[index], 'No reemplazar accesos existentes'));
  // Un acceso ajeno tampoco debe reemplazarse ni crear el segundo parcialmente.
  fs.renameSync(path.join(fixture, 'ABRIR V1 WEB.lnk'), path.join(fixture, 'ABRIR V1.lnk'));
  const foreign = fs.readFileSync(path.join(fixture, 'ABRIR V1.lnk'));
  const denied = run();
  assert.notEqual(denied.status, 0);
  assert.deepEqual(fs.readFileSync(path.join(fixture, 'ABRIR V1.lnk')), foreign);
  assert(!fs.existsSync(path.join(fixture, 'ABRIR V1 WEB.lnk')));
  console.log('PASS accesos portables, idempotencia y preservacion de accesos ajenos. Fixture: ' + fixture);
} else console.log('PASS lanzadores; COM Windows no disponible en esta plataforma.');
