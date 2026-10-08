const assert = require('assert');
const fs = require('fs');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
assert.equal(pkg.productName, 'DeadSingularity');
assert.equal(pkg.license, 'UNLICENSED');
assert(pkg.scripts['measure:performance'].includes('--json'));

const html = fs.readFileSync('index.html', 'utf8');
assert(html.includes('assets/brand/dead-singularity-mark.svg'));
assert(fs.existsSync('assets/brand/dead-singularity-mark.svg'));

const desktop = fs.readFileSync('desktop/main.cjs', 'utf8');
assert(desktop.includes("app.setAppUserModelId('com.deadsingularity.v1')"));
const policy=fs.readFileSync('desktop/runtime-policy.cjs','utf8');
assert(policy.includes('assets|css|js'));
assert(!policy.includes('reference'));
assert(desktop.includes('nodeIntegration:false,contextIsolation:true,sandbox:true'));
assert(desktop.includes("setWindowOpenHandler(()=>({action:'deny'}))"));
assert(desktop.includes('setPermissionRequestHandler'));
assert(fs.readFileSync('js/engine/performanceMonitor.js','utf8').includes('getSnapshot()'));

const game = fs.readFileSync('js/game.js', 'utf8');
assert(game.includes('perfSnapshot.frames >= 120'), 'falta warm-up antes del autoajuste visual');

const build = fs.readFileSync('tools/build-web.cjs', 'utf8');
assert(build.includes("['index.html','css','js','assets','AVISOS.md']"));
assert(build.includes('manifest.json'));
assert(build.includes('AVISOS.md'));

console.log('RESULT release_candidate_j: identidad, assets, diagnóstico y empaquetado OK');

