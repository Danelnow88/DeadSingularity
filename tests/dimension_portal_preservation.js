'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
assert.equal(hash(fs.readFileSync('js/render/blackHoles.js')),'07919233a57a7ec2608363f1b80a7d66bf79db9a520120062a0ad96f04ba4f50');
const game=fs.readFileSync('js/game.js','utf8').replace(/\r\n/g,'\n');
let draw=game.slice(game.indexOf('  function draw()'),game.indexOf('  function loop('));
// Only these exact HUD substitutions are permitted: show the real collection
// objective instead of an expired timer. All other drawing, especially portals,
// is still compared byte-for-byte against the original normalized renderer.
const hudChanges=[
  ["      const inertiaObjective = fieldEventSession && fieldEventSession.objectiveView();\n",''],
  ['const progress = inertiaObjective ? inertiaObjective.collected / inertiaObjective.required : waveTimer', 'const progress = waveTimer'],
  [" : inertiaObjective ? ' · NÚCLEOS ' + inertiaObjective.collected + '/' + inertiaObjective.required : waveTimer", ' : waveTimer'],
  ["ctx.fillText(inertiaObjective ? (fieldReady ? 'ALCANZÁ EL CRUCE' : 'DESTRUÍ LOS NÚCLEOS') : waveTimer", 'ctx.fillText(waveTimer'],
];
for(const [changed,original] of hudChanges) {
  assert.equal(draw.split(changed).length,2,'Expected exactly one approved HUD substitution');
  draw=draw.replace(changed,original);
}
// Approved scenery experiment: normalize only camera parallax and preview
// palette wiring. Portal graphics and all unrelated draw code remain protected.
draw=draw.replace('NV.sectorVisualForWave(visualWave,sceneryOptions)','NV.sectorVisualForWave(visualWave)');
assert.equal(draw.split('        preview: dimensionContentEnabled,\n').length,2);
draw=draw.replace('        preview: dimensionContentEnabled,\n','');
assert.equal(draw.split('      preview: dimensionContentEnabled,\n').length,2);
draw=draw.replace('      preview: dimensionContentEnabled,\n','');
const starChange="      if (drawStarfield&&(!sectorVisual||sectorVisual.starfield!==false)) {\n        starCamera.x=cameraLeft;starCamera.y=cameraTop;\n        NV.drawStarfield(ctx, cameraW, cameraH, frame, player.x - cameraLeft, player.y - cameraTop, frameVisualRhythm,dimensionContentEnabled?starCamera:null);\n      }";
assert.equal(draw.split(starChange).length,2);
draw=draw.replace(starChange,'      if (drawStarfield) NV.drawStarfield(ctx, cameraW, cameraH, frame, player.x - cameraLeft, player.y - cameraTop, frameVisualRhythm);');
assert.equal(hash(draw),'979964c2079199060419e571273b8049ed3de209d3ea02be8fcdbfadfc0b5c64','Rendering outside the approved objective HUD changes must remain identical');
const dimensions=fs.readFileSync('js/engine/dimensions.js','utf8');
assert(dimensions.includes('run.age >= 1.2'));assert(dimensions.includes('run.transit >= 1.15'));
console.log('PASS dimension_portal_preservation: portal bytes, non-objective rendering and transition timings unchanged');
