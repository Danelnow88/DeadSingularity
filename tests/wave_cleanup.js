'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');const noop=()=>{};
function makeGameCtx() {
  const g = fs.readFileSync('js/game.js', 'utf8');
  const c = {
    state: 'playing', paused: false,
    player: { hp: 100, x: 100, y: 100, invuln: 0, stun: 0, stunReapplyLockout: 0, character: 'nova' },
    enemies: [{ hp: 20, maxHp: 20, x: 100, y: 100, radius: 12 }],
    presentation: {}, hazards: [], bullets: [{ isEnemy: true, x: 0, y: 0 }], flameZones: [],
    hookSystem: null, minefieldState: {}, boss: null, bossChests: [], pickups: [], wave: 3,
    WAVE_END_DURATION: 2.1, WAVE_CLEANUP_DURATION: 0.4, BOSS_WAVE_END_DURATION: 2.25, BOSS_CHEST_HOLD: 2.25,
    SHOP_ENTER_DURATION: 0.5, arenaW: () => 900, arenaH: () => 520,
    NV: {
      updateShockwaves: (dt, a) => a, updatePlayerMovement: noop,
      updateMeteors: (dt, m) => ({ meteors: m }),
      activateNormalShardMagnetPull: noop,
    },
    clearCombatIntent: noop, syncGameState: noop, triggerFlash: noop, spawnExplosion: noop,
    showBanner: noop, sfx: { victory: noop },
    shake: 0, flashAlpha: 0, specialVFX: null, shockwaves: [], meteors: [], frame: 0,
    combatIntent: {}, updateParticles: noop, updateFloatTexts: noop, updateTrails: noop,
    updatePickups: noop, updateWeaponPickups: noop, updateBossChests: noop,
    updateBombImpacts: noop, // #11: cola de impactos pendientes vacía en estos escenarios
    };
  vm.createContext(c);
  // triggerWaveVictory real (corta antes de triggerFlash, mockeado) y
  // updatePresentation REAL completa (paso del timer + filtro de eliminación).
  vm.runInContext(g.slice(g.indexOf('  function triggerWaveVictory('), g.indexOf('  function triggerFlash(')), c);
  vm.runInContext(g.slice(g.indexOf('  function updatePresentation('), g.indexOf('  // === UPDATE ===')), c);
  vm.runInContext(g.slice(g.indexOf('  function update(dt)'), g.indexOf('  function shoot(')), c);
  for (const name of ['WAVE_END_DURATION', 'BOSS_WAVE_END_DURATION', 'BOSS_CHEST_HOLD', 'SHOP_ENTER_DURATION']) {
    c[name] = Number(new RegExp('const ' + name + ' = ([0-9.]+);').exec(g)[1]);
  }
  return c;
}


for(const isBoss of [false,true]){
 const c=makeGameCtx();c.enemies=[{enemyTypeId:'runner',hp:20,dead:false},{enemyTypeId:'tank',hp:0,dead:true},{enemyTypeId:'swarmlet',hp:10,arrival:true},{enemyTypeId:'specter_guard',hp:20,waveCleanup:true},{enemyTypeId:'boss_minion',hp:20}];
 c.bossChests=isBoss?[{x:100,y:100,timer:0,dead:false}]:[];assert.equal(c.triggerWaveVictory(isBoss,'BOSS','#ffd700'),true);assert.equal(c.state,'wave_end');assert.equal(c.enemies.length,0);assert.equal(c.bullets.length,0);assert.equal(c.flameZones.length,0);
 c.enemies.push({hp:20});c.updatePresentation(.01);assert.equal(c.enemies.length,0,'late callback restored enemy during victory');assert.equal(c.state,'wave_end');
 assert.equal(c.presentation.duration,isBoss?2.25:2.1);if(isBoss)assert.equal(c.bossChests.length,1,'boss reward lost');
}
{
 const g=fs.readFileSync('js/game.js','utf8'),c={state:'playing',enemies:[{hp:10}],dimensionExperiment:false,hookSystem:null,player:{},bullets:[],MAX_BULLETS:20,MAX_ENEMY_BULLETS:20,shake:0,enemyBulletCount:noop,applyPlayerDamage:noop,addFloatText:noop,spawnExplosion:noop,waveEvent:null,sfx:{},wave:1,hazards:[],arenaW:()=>900,arenaH:()=>520,viewX:()=>0,viewY:()=>0,viewW:()=>900,viewH:()=>520,combatLabMode:false,fieldEventSession:null,recordPlayerDamage:noop,NV:{}};
 vm.createContext(c);vm.runInContext(g.slice(g.indexOf('  function updateEnemies(dt)'),g.indexOf('  function updateBoss(dt)')),c);
 c.NV.updateEnemies=()=>{c.state='wave_end';c.enemies=[];return {enemies:[{dead:true},{hp:10}],shake:1};};c.updateEnemies(.016);assert.equal(c.enemies.length,0,'in-progress engine result resurrected enemies');
}
{
 const g=fs.readFileSync('js/game.js','utf8');let draws=0;const c={state:'playing',NV:{drawEnemyArrival:()=>false,drawDimensionalThreatBody:()=>false,hasCommonEnemyVisual:()=>true,drawEnemy:()=>draws++},ctx:{},frame:1,player:{},frameVisualRhythm:null,visualTimeSeconds:0,isEnemyRenderedByLite:()=>false};vm.createContext(c);vm.runInContext(g.slice(g.indexOf('  function drawEnemy(e)'),g.indexOf('  function drawBoss()')),c);
 for(const e of [{dead:true},{waveCleanup:true}])c.drawEnemy(e);assert.equal(draws,0);
 for(const state of ['wave_end','shop_enter','shop']){c.state=state;c.drawEnemy({enemyTypeId:'tank',hp:10});}assert.equal(draws,0);
 c.state='playing';c.drawEnemy({enemyTypeId:'tank',hp:10});assert.equal(draws,1);
}
console.log('PASS immediate wave cleanup: living/dead/arriving/minion entries removed for normal and boss victories; no late resurrection, reward loss, ghost draw or transition damage.');

{const g=fs.readFileSync("js/game.js","utf8"),c={state:"wave_end",score:10,NV:{killEnemy(){throw Error("late engine kill");}}};vm.createContext(c);vm.runInContext(g.slice(g.indexOf("  function killEnemy("),g.indexOf("  function updateEnemies(dt)")),c);c.killEnemy({enemyTypeId:"runner",hp:1},null);assert.equal(c.score,10);}