const assert = require('assert');
const fs = require('fs');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
assert.equal(pkg.productName, 'NEON VOID');
assert.equal(pkg.license, 'UNLICENSED');
assert(pkg.scripts['measure:performance'].includes('--json'));

const html = fs.readFileSync('index.html', 'utf8');
assert(html.includes('assets/brand/neon-void-mark.svg'));
assert(fs.existsSync('assets/brand/neon-void-mark.svg'));

const desktop = fs.readFileSync('desktop/main.cjs', 'utf8');
assert(desktop.includes("app.setAppUserModelId('com.neonvoid.game')"));
assert(desktop.includes("/^(js|css|assets)"));
assert(desktop.includes("icon: path.join(ROOT, 'assets', 'brand', 'neon-void-mark.svg')"));
assert(desktop.includes('performanceMonitor.getSnapshot'));
assert(desktop.includes('usedJSHeapSize'));

const game = fs.readFileSync('js/game.js', 'utf8');
assert(game.includes('perfSnapshot.frames >= 120'), 'falta warm-up antes del autoajuste visual');

const build = fs.readFileSync('tools/build_release.cjs', 'utf8');
assert(build.includes("['css', 'js', 'assets']"));
assert(build.includes('manifest.json'));
assert(build.includes('THIRD_PARTY_NOTICES.md'));

console.log('RESULT release_candidate_j: identidad, assets, diagnóstico y empaquetado OK');
