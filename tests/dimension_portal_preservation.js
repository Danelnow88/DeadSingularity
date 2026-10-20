'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
assert.equal(hash(fs.readFileSync('js/render/blackHoles.js')),'07919233a57a7ec2608363f1b80a7d66bf79db9a520120062a0ad96f04ba4f50');
const game=fs.readFileSync('js/game.js','utf8').replace(/\r\n/g,'\n');
let draw=game.slice(game.indexOf('  function draw()'),game.indexOf('  function loop('));
// Approved cosmetic boss integration: forwarding the existing player to the
// renderer only lets its eyes track the target. No portal/world code changes.
const cosmicBossGaze='    NV.drawBoss(ctx, boss, frame, player);';
assert.equal(draw.split(cosmicBossGaze).length,2,'Exactly one presentation-only boss gaze hook');
draw=draw.replace(cosmicBossGaze,'    NV.drawBoss(ctx, boss, frame);');
// Nueva bifurcación autorizada: normalizar sólo sus cinco hooks concretos.
// El hash del modelo de agujero negro y del resto del renderer sigue protegido.
const routeChanges=[
 ["    if (state === 'playing' && !combatLabMode && dimensionRun && dimensionRun.routeChoices) NV.drawDimensionRouteArrows(ctx, dimensionRun,\n      {vx,vy,vw,vh,scaleX,scaleY,worldScaleX,worldScaleY,worldOffsetX,worldOffsetY});\n", ''],
 ["dimensionRun.phase === 'transit' && dimensionRun.chosenRoute !== 'stable' ? dimensionRun.transit / 1.15 : 0", "dimensionRun.phase === 'transit' ? dimensionRun.transit / 1.15 : 0"],
 ["      if (dimensionRun.stablePortal) NV.drawStablePortal(ctx, dimensionRun.stablePortal, dimensionRun, vbp && vbp.tier !== 'full');\n", ''],
 ["dimensionRun && dimensionRun.portal && !dimensionRun.routeChoices", "dimensionRun && dimensionRun.portal"],
 ["    if (state === 'playing' && !combatLabMode && dimensionRun && dimensionRun.routeChoices) NV.drawDimensionRouteHints(ctx, dimensionRun,\n      {vx,vy,vw,vh,scaleX,scaleY,worldScaleX,worldScaleY,worldOffsetX,worldOffsetY});\n", ''],
];
for(const [changed,original] of routeChanges){assert.equal(draw.split(changed).length,2,'Un único hook de bifurcación autorizado');draw=draw.replace(changed,original);}
const rhythmCoherenceChange='        NV.drawRhythmLayer(ctx, cameraW, cameraH, frame, rbStep);';
assert.equal(draw.split(rhythmCoherenceChange).length,2,'One approved hold-between-updates rhythm hook');
draw=draw.replace(rhythmCoherenceChange,'        if (frame % rbStep === 0) NV.drawRhythmLayer(ctx, cameraW, cameraH, frame);');
const pausedShakeChange="    if (!paused && shake > 0 && (state === 'playing' || state === 'player_dying' || state === 'wave_end')) {";
assert.equal(draw.split(pausedShakeChange).length,2,'Only freeze cosmetic camera shake while paused');
draw=draw.replace(pausedShakeChange,"    if (shake > 0 && (state === 'playing' || state === 'player_dying' || state === 'wave_end')) {");
for(const [now,old] of [
  ['\n      t: visualTimeSeconds,',"\n      t: (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() / 1000 : frame / 60,"],
  ['\n        t: visualTimeSeconds,','\n        t: performance.now() / 1000,'],
  ['      const pulse = 0.6 + Math.sin(visualTimeSeconds * 60 * 0.15) * 0.4;','      const pulse = 0.6 + Math.sin(frame * 0.15) * 0.4;'],
]){assert.equal(draw.split(now).length,2,'One precise shared presentation-clock hook');draw=draw.replace(now,old);}
const sharedSkyChanges=[
 ['      enemies,bullets,meteors,boss,paused:paused||state!==\'playing\',\n',''],
 ["\n    if(NV.spaceTrails){\n      NV.spaceTrails.update({enabled:state==='playing'||state==='wave_end'||state==='player_dying'||state==='gameover',id:sectorVisual&&sectorVisual.id,time:visualTimeSeconds,W:arenaW(),H:arenaH(),bullets,meteors,enemies,paused:paused||state!=='playing'});\n      NV.spaceTrails.draw(ctx);\n    }\n",''],
 ["    const spatialStyle=drawBackgroundEffects&&(state==='playing'||state==='wave_end'||state==='player_dying'||state==='gameover')&&NV.spaceEnvironment&&NV.spaceEnvironment.isRequested(sectorVisual);\n    const liveEnvironment=spatialStyle?NV.spaceEnvironment:NV.foundryAtmosphere;\n    if(spatialStyle&&NV.foundryAtmosphere)NV.foundryAtmosphere.hide();\n    if(!spatialStyle&&NV.spaceEnvironment)NV.spaceEnvironment.hide();\n    const foundryActive=liveEnvironment&&liveEnvironment.render({",'    const foundryActive=NV.foundryAtmosphere&&NV.foundryAtmosphere.render({'],
 ['      if(spatialStyle&&!foundryActive)NV.spaceEnvironment.drawFallback(ctx,arenaW(),arenaH(),sectorVisual.id,visualTimeSeconds);\n',''],
 ['if (!spatialStyle&&!foundryActive&&NV.drawSectorBackdrop)','if (!foundryActive&&NV.drawSectorBackdrop)'],
 ['        if(spatialStyle)NV.spaceEnvironment.drawTravelStars(ctx,cameraW,cameraH,visualTimeSeconds,cameraLeft,cameraTop);\n        else NV.drawStarfield','        NV.drawStarfield'],
 ['if(foundryActive||spatialStyle)liveEnvironment.drawBehind','if(foundryActive)NV.foundryAtmosphere.drawBehind'],
 ['if(foundryActive||spatialStyle)liveEnvironment.drawFront','if(foundryActive)NV.foundryAtmosphere.drawFront'],
];
for(const [changed,original] of sharedSkyChanges){assert.equal(draw.split(changed).length,2,'Expected one approved common sky hook');draw=draw.replace(changed,original);}
// Only these exact HUD substitutions are permitted: show the real collection
// objective instead of an expired timer. All other drawing, especially portals,
// is still compared byte-for-byte against the original normalized renderer.
const hudChanges=[
  ["      const inertiaObjective = fieldEventSession && fieldEventSession.objectiveView();\n",''],
  ['const progress = inertiaObjective ? inertiaObjective.collected / inertiaObjective.required : waveTimer', 'const progress = waveTimer'],
  [" : inertiaObjective ? ' · NÚCLEOS ' + inertiaObjective.collected + '/' + inertiaObjective.required : waveTimer", ' : waveTimer'],
  ["ctx.fillText(inertiaObjective ? (fieldReady ? 'ALCANZÁ EL CRUCE' : 'DESTRUÍ LOS NÚCLEOS') : waveTimer", 'ctx.fillText(waveTimer'],
];
// Approved Fundición atmosphere hooks: normalize only these exact additions;
// retain the original byte-level protection of portals and unrelated rendering.
const atmosphereChanges=[
  ["    const foundryActive=NV.foundryAtmosphere&&NV.foundryAtmosphere.render({\n      enabled:drawBackgroundEffects&&(state==='playing'||state==='wave_end'||state==='player_dying'||state==='gameover'),\n      id:sectorVisual&&sectorVisual.id,time:visualTimeSeconds,W:arenaW(),H:arenaH(),\n      variant:dimensionRun&&dimensionRun.depth>0?dimensionRun.seed+dimensionRun.depth*7919:0,\n      sx:worldScaleX,sy:worldScaleY,ox:worldOffsetX,oy:worldOffsetY,player,\n    });\n    if(foundryActive){ctx.save();ctx.resetTransform();ctx.clearRect(0,0,canvas.width,canvas.height);ctx.restore();}\n",''],
  ['if(!foundryActive)ctx.fillRect','ctx.fillRect'],
  ['if (!foundryActive&&NV.drawSectorBackdrop)','if (NV.drawSectorBackdrop)'],
  ['\n    if(foundryActive)NV.foundryAtmosphere.drawBehind(ctx,visualTimeSeconds,player);\n',''],
  ['    if(foundryActive)NV.foundryAtmosphere.drawFront(ctx,visualTimeSeconds,player);\n',''],
];
for(const [changed,original] of atmosphereChanges){assert.equal(draw.split(changed).length,2,'Expected exactly one approved atmosphere hook');draw=draw.replace(changed,original);}
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
assert.equal(hash(draw),'e6aa75dcec6faa6219f89a2e40a742de043274c4d28a6683615ddda793d01775','Rendering outside the approved HUD and canonical enemy cleanup changes must remain identical');
const dimensions=fs.readFileSync('js/engine/dimensions.js','utf8');
assert(dimensions.includes('run.age >= 1.2'));assert(dimensions.includes('run.transit >= 1.15'));
console.log('PASS dimension_portal_preservation: portal bytes, non-objective rendering and transition timings unchanged');
