const fs = require('fs'), vm = require('vm');
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('  ok  ' + name); } catch (e) { fail++; console.log('  FAIL ' + name + ' -> ' + e.message); } }
function setup(quality, overload) {
  const sb = { window: { NV: {} }, console, Math, Object, Array, WeakSet, Set, Map, localStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} } };
  for (const f of ['js/core/settings.js', 'js/render/visualBudget.js', 'js/render/spectralEnemies2D.js']) vm.runInNewContext(fs.readFileSync(f, 'utf8'), sb, { filename: f });
  sb.window.NV.setGraphicsQuality(quality); sb.window.NV.resetVisualBudget();
  for (let i = 0; i < (overload || 0); i++) sb.window.NV.updateVisualBudget(40);
  return sb.window.NV;
}
function enemy(i, x) { return { x: x == null ? 100 + i * 30 : x, y: 100, radius: 18, hp: 100, maxHp: 100, color: '#a1b2c3', visualId: 'elite_base', isElite: true, dead: false, hitFlash: 0, atkFlash: 0 }; }
function ctx() { const calls = { paths: 0, fills: 0, strokes: 0, arcs: 0, arcData: [], colors: [], scales: [], events: [], shadowBlurs: [] }; return new Proxy({ calls }, { get(o, k) { if (k === 'calls') return calls; if (k === 'beginPath') return () => calls.paths++; if (k === 'fill') return () => calls.fills++; if (k === 'stroke') return () => calls.strokes++; if (k === 'arc') return (x, y, r) => { calls.arcs++; calls.arcData.push([x, y, r]); calls.events.push(['arc', r]); }; if (k === 'scale') return (x, y) => { calls.scales.push([x, y]); calls.events.push(['scale', x, y]); }; if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => ({ addColorStop() {} }); return () => {}; }, set(o, k, v) { if (k === 'fillStyle' || k === 'strokeStyle' || k === 'shadowColor') calls.colors.push(String(v)); if (k === 'shadowBlur') calls.shadowBlurs.push(Number(v)); return true; } }); }
function renderCost(NV, e) { const c = ctx(); NV.drawSpectralEnemy2D(c, e, 30, { x: 450, y: 300 }, null); return c.calls; }
t('High conserva 7 full; Auto 4-7 usa full/medium/simple determinista', () => {
  let NV = setup('high'), es = Array.from({ length: 7 }, (_, i) => enemy(i)); let s = NV.prepareEnemyVisualBudget(es, { x: 100, y: 100 });
  if (s.full !== 7 || s.medium !== 0 || s.simplified !== 0) throw Error(JSON.stringify(s));
  NV = setup('auto'); for (const [n, exp] of [[4,[3,1,0]],[6,[3,2,1]],[7,[3,2,2]]]) { es = Array.from({ length:n }, (_,i)=>enemy(i)); s=NV.prepareEnemyVisualBudget(es,{x:100,y:100}); if ([s.full,s.medium,s.simplified].join() !== exp.join()) throw Error(n+':'+JSON.stringify(s)); }
});
t('Performance degrada de forma acotada y prioriza cercania', () => {
  const NV = setup('performance'), near = enemy(0, 110), mid = enemy(1, 300), far = enemy(2, 800), farther = enemy(3, 850), es = [far, farther, mid, near];
  const snapshot = JSON.stringify(es), s = NV.prepareEnemyVisualBudget(es, { x: 100, y: 100 });
  if ([s.full,s.medium,s.simplified].join() !== '1,1,2') throw Error(JSON.stringify(s));
  if (!(renderCost(NV, near).arcs > renderCost(NV, far).arcs)) throw Error('cercana no recibe mas detalle');
  if (JSON.stringify(es) !== snapshot) throw Error('mutacion de gameplay');
});
t('FULL/MEDIUM/SIMPLE conservan color, cuatro lobulos/ojos y radio', () => {
  const NV = setup('auto'), es = Array.from({ length: 7 }, (_, i) => enemy(i)), radii = es.map(e => e.radius); NV.prepareEnemyVisualBudget(es, { x: 100, y: 100 });
  for (const e of [es[0], es[3], es[6]]) { const c = renderCost(NV, e); if (c.paths < 14 || c.arcs < 9 || !c.colors.includes(e.color)) throw Error(JSON.stringify(c)); }
  if (es.some((e,i) => e.radius !== radii[i])) throw Error('radio alterado');
});
t('particulas Hydra estan agrupadas y caches son acotadas/estaticas', () => {
  const src = fs.readFileSync('js/render/spectralEnemies2D.js','utf8'), body = src.slice(src.indexOf('function drawLiquidParticles'), src.indexOf('function drawHydraSimplified'));
  if ((body.match(/ctx\.fill\(\)/g)||[]).length !== 1 || (body.match(/ctx\.beginPath\(\)/g)||[]).length !== 1) throw Error('particulas no agrupadas');
  if (!src.includes('const BLOB_ANGLE_COUNTS') || /new Map\([^)]*time|cache.*time/i.test(src)) throw Error('cache no acotada');
});
t('feedback y budget conservan contratos de integracion', () => {
  const NV=setup('auto'), e=enemy(0); e.hitFlash=.1; e.atkFlash=.2; e.fusionLevel=2; NV.prepareEnemyVisualBudget([e],{x:0,y:0}); const c=renderCost(NV,e);
  if (c.strokes < 5) throw Error('feedback perdido');
  const game=fs.readFileSync('js/game.js','utf8'); if ((game.match(/NV\.prepareEnemyVisualBudget\(/g)||[]).length !== 1) throw Error('prepare != 1/frame');
});
t('diagnostico Hydra: default FULL, CHEAP usa fallback simple y FULL se restaura exacto', () => {
  const NV = setup('high'), e = enemy(0), before = JSON.stringify(e);
  NV.prepareEnemyVisualBudget([e], { x: 100, y: 100 });
  if (NV.getHydraDiagnosticMode() !== 'full') throw Error('default no es full');
  const fullBefore = renderCost(NV, e);
  if (NV.setHydraDiagnosticMode('CHEAP') !== 'cheap') throw Error('cheap no normalizado');
  const cheap = renderCost(NV, e);
  if (!(cheap.arcs < fullBefore.arcs && cheap.paths <= fullBefore.paths)) throw Error('cheap no redujo body: ' + JSON.stringify({ fullBefore, cheap }));
  if (cheap.fills <= 0 || cheap.strokes <= 0) throw Error('cheap oculto/invisible');
  if (JSON.stringify(e) !== before) throw Error('cheap mutó entidad');
  if (NV.setHydraDiagnosticMode('invalid') !== 'cheap') throw Error('modo invalido cambió estado');
  NV.setHydraDiagnosticMode('full');
  const fullAfter = renderCost(NV, e);
  if (JSON.stringify(fullAfter) !== JSON.stringify(fullBefore)) throw Error('full no restauró ruta exacta');
});
t('diagnostico Hydra: CHEAP no cambia renderer de entidades no Hydra', () => {
  const NV = setup('high');
  const e = { x: 100, y: 100, radius: 18, hp: 100, maxHp: 100, color: '#67f8c8', enemyTypeId: 'specter_guard', dead: false, hitFlash: 0, atkFlash: 0 };
  const before = JSON.stringify(e), full = renderCost(NV, e);
  NV.setHydraDiagnosticMode('cheap');
  const cheapMode = renderCost(NV, e);
  if (JSON.stringify(cheapMode) !== JSON.stringify(full)) throw Error('no-Hydra cambió render');
  if (JSON.stringify(e) !== before) throw Error('no-Hydra mutó entidad');
});
t('escala corporal Hydra 0.65 es común a FULL/MEDIUM/SIMPLE/CHEAP y exclusiva de RB6', () => {
  const NV = setup('auto'), es = Array.from({ length: 7 }, (_, i) => enemy(i));
  NV.prepareEnemyVisualBudget(es, { x: 100, y: 100 });
  const expected = 0.85 * 0.65;
  for (const [label, e] of [['FULL', es[0]], ['MEDIUM', es[3]], ['SIMPLE', es[6]]]) {
    const c = renderCost(NV, e);
    if (!c.scales.length || Math.abs(c.scales[0][0] - expected) > 0.0001 || Math.abs(c.scales[0][1] - expected) > 0.0001) throw Error(label + ':' + JSON.stringify(c.scales));
  }
  NV.setHydraDiagnosticMode('cheap');
  const cheap = renderCost(NV, es[0]);
  if (Math.abs(cheap.scales[0][0] - expected) > 0.0001) throw Error('CHEAP:' + JSON.stringify(cheap.scales));
  const nonHydra = { x: 100, y: 100, radius: 18, hp: 100, maxHp: 100, color: '#67f8c8', enemyTypeId: 'specter_guard', dead: false, hitFlash: 0, atkFlash: 0 };
  const other = renderCost(NV, nonHydra);
  // RB5 NO recibe la escala corporal Hydra (0.85×0.65): su escala es la suya
  // ×0.65 (body scale de los cinco espectros, 0.82×0.65 = 0.533).
  if (Math.abs(other.scales[0][0] - 0.82 * 0.65) > 0.0001) throw Error('escala no-Hydra inesperada: ' + JSON.stringify(other.scales));
  if (Math.abs(other.scales[0][0] - 0.85 * 0.65) <= 0.0001) throw Error('no-Hydra recibió la escala Hydra: ' + JSON.stringify(other.scales));
  if (NV.HYDRA_BODY_SCALE !== 0.65 || Math.abs(NV.labModelVisualRadius(5) - 45 * 0.85 * 0.65) > 0.0001) throw Error('API escala inconsistente');
});
t('capas world-space se dibujan antes del transform corporal', () => {
  const NV = setup('high'), e = enemy(0); e.fusionLevel = 2; e.atkFlash = 0.2;
  NV.prepareEnemyVisualBudget([e], { x: 0, y: 0 });
  const c = renderCost(NV, e);
  const firstScale = c.events.findIndex((event) => event[0] === 'scale');
  const semanticBeforeScale = c.events.slice(0, firstScale).filter((event) => event[0] === 'arc').map((event) => event[1]);
  if (!semanticBeforeScale.some((r) => r > e.radius + 5)) throw Error('indicadores semánticos quedaron dentro del transform corporal');
});
t('cuerpo FULL Hydra limpio sustituye Canvas blur por faux glow explícito', () => {
  const NV = setup('high'), e = enemy(0);
  NV.prepareEnemyVisualBudget([e], { x: 0, y: 0 });
  const c = renderCost(NV, e);
  if (c.shadowBlurs.some((value) => value > 0)) throw Error('cuerpo FULL conserva Canvas blur: ' + JSON.stringify(c.shadowBlurs));
  if (c.strokes < 10) throw Error('faux glow/contornos insuficientes');
});
t('ocho variantes Hydra restauran halo ocular explícito sin Canvas blur', () => {
  const NV = setup('high');
  const variants = ['elite_base', 'elite_velocity', 'elite_bulwark', 'elite_predator', 'elite_phantom', 'elite_titan', 'elite_swift', 'elite_specter_void'];
  for (const visualId of variants) {
    const e = enemy(0); e.visualId = visualId;
    if (visualId === 'elite_specter_void') e.enemyTypeId = 'specter_elite_void';
    NV.prepareEnemyVisualBudget([e], { x: 0, y: 0 });
    const c = renderCost(NV, e);
    if (c.shadowBlurs.some((value) => value > 0)) throw Error(visualId + ' reintrodujo blur');
    if (c.arcs < 15) throw Error(visualId + ' sin capas oculares restauradas: arcs=' + c.arcs);
  }
});
t('tracking Hydra conserva desplazamiento de pupila con jitter determinista', () => {
  const NV = setup('high'), e = enemy(0);
  NV.prepareEnemyVisualBudget([e], { x: 0, y: 0 });
  const right = renderCost(NV, e), leftCtx = ctx();
  NV.drawSpectralEnemy2D(leftCtx, e, 30, { x: -450, y: 300 }, null);
  const rightEyes = right.arcData.slice(-15), leftEyes = leftCtx.calls.arcData.slice(-15);
  if (rightEyes.length !== 15 || leftEyes.length !== 15) throw Error('firma ocular incompleta');
  for (let i = 0; i < 15; i += 5) {
    if (!(rightEyes[i][2] > rightEyes[i + 1][2] && rightEyes[i + 1][2] > rightEyes[i + 2][2] && rightEyes[i + 2][2] > rightEyes[i + 3][2] && rightEyes[i + 3][2] > rightEyes[i + 4][2])) throw Error('capas oculares fuera de orden');
  }
  if (!rightEyes.some((arc, i) => Math.abs(arc[0] - leftEyes[i][0]) > 0.5)) throw Error('pupila no sigue objetivo');
});
t('hot path Hydra optimizado es determinista, sin arrays/objetos transitorios ni parsing repetido', () => {
  const src = fs.readFileSync('js/render/spectralEnemies2D.js', 'utf8');
  const model = src.slice(src.indexOf('case 5: // RB6 - Entidad Hidra'), src.indexOf('break;', src.indexOf('case 5: // RB6 - Entidad Hidra')) + 6);
  if (!src.includes('const HYDRA_DETAIL_FULL') || !src.includes('jitterScale: 0') || !src.includes('deterministicEyes: true') || !src.includes('eyeFauxGlow: true')) throw Error('perfil optimizado/ojos restaurados ausente');
  if (/Math\.random\(|\[\]|new Map|new Set|Object\.assign/.test(model)) throw Error('trabajo transitorio en dispatcher Hydra');
  if (!src.includes('COLOR_LUMINANCE_CACHE_LIMIT = 32') || !src.includes('const accentLum = luminance(enemyColor)') || !src.includes('const hydraAccentLum = accentLum')) throw Error('color Hydra no cacheado/acotado/compartido');
});
console.log('RESULT hydra_render_budget: pass=' + pass + ' fail=' + fail);
process.exitCode = fail ? 1 : 0;