const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const store = {};
const sandbox = { window: { NV: {} }, console, localStorage: {
  getItem: key => store[key] || null,
  setItem: (key, value) => { store[key] = value; },
  removeItem: key => { delete store[key]; },
} };
for (const file of ['data/gameData', 'data/balance', 'data/consumables', 'engine/expedition', 'engine/boss']) {
  vm.runInNewContext(fs.readFileSync('js/' + file + '.js', 'utf8'), sandbox, { filename: file });
}
const NV = sandbox.window.NV;

assert.deepStrictEqual([0, 1, 2].map(NV.weaponFusionShopPrice), [15, 23, 31]);
assert.deepStrictEqual([0, 1, 4].map(level => NV.runUpgradePrice('hp', level)), [15, 19, 31]);
assert.deepStrictEqual([0, 1, 4].map(level => NV.runUpgradePrice('armor', level)), [20, 25, 40]);
const totalUpgrades = [
  ...Array.from({ length: 8 }, (_, i) => NV.runUpgradePrice('hp', i)),
  ...Array.from({ length: 5 }, (_, i) => NV.runUpgradePrice('speed', i)),
  ...Array.from({ length: 5 }, (_, i) => NV.runUpgradePrice('armor', i)),
  ...Array.from({ length: 7 }, (_, i) => NV.runUpgradePrice('luck', i)),
].reduce((a, b) => a + b, 0);
assert.equal(totalUpgrades, 742, 'el gasto de mejoras debe competir con el ingreso garantizado tardío');

const run = NV.expedition.create('expedition', 0);
const newBossBudget = Array.from({length:10},(_,i)=>NV.bossRewardShards(i*2+2,run)).reduce((a,b)=>a+b,0);
assert.equal(newBossBudget,460,'diez bosses deben financiar decisiones, no todas las mejoras');
assert.equal(NV.bossRewardShards(10,null),100);
assert.equal(NV.bossRewardShards(10,{mode:'expedition',bossProgression:'legacy'}),100);
assert.equal(NV.bossRewardShards(10,NV.expedition.create('endless',0)),100);
const deadBoss = { hp:0,maxHp:100,dead:false,name:'QA',color:'#fff',radius:30,x:450,y:120,timer:0,pattern:'chase' };
const reward = NV.updateBoss(0, {boss:deadBoss,player:{x:450,y:430},enemies:[],bullets:[],W:900,H:520,
  wave:10,score:0,shards:7,shake:0,run,spawnExplosion(){},triggerWaveVictory(){},sfx:{}});
assert.equal(reward.shards,51,'pago productivo aplica el presupuesto de Historia');
const inventory = ['railgun', 'rifle', 'pistol'].map(NV.weaponById);
const levels = { railgun: 61, rifle: 30, pistol: 1 };
const kills = { railgun: 360, rifle: 174, pistol: 0 };
const st = { run, wave: 9, player: { hp: 100, maxHp: 100 }, shards: 200, inventory, levels, kills };
assert.equal(NV.expedition.prepare('calibrate', st).ok, false, 'calibración se desbloqueó antes del sector 3');
st.wave = 10;
const result = NV.expedition.prepare('calibrate', st);
assert(result.ok); assert.equal(result.shards, 138);
assert.equal(levels.railgun, 61); assert.equal(levels.rifle, 49); assert.equal(levels.pistol, 49);
assert.equal(kills.pistol, 48 * NV.BALANCE.WEAPON_KILLS_PER_LEVEL);
assert.equal(run.prep, 'calibrate');
assert.equal(NV.expedition.prepare('training', st).ok, false, 'se permitió una segunda preparación');

function tacticalCount(difficulty) {
  let count = 0;
  for (let cycle = 0; cycle < 12; cycle++) {
    if (NV.planWaveSpawnBatch(16, 5, cycle, NV.ENEMY_TYPES, difficulty).length) count++;
  }
  return count;
}
assert.deepStrictEqual(['easy', 'normal', 'hard'].map(tacticalCount), [3, 4, 6]);
assert.equal(NV.planWaveSpawnBatch(16, 3, 1, NV.ENEMY_TYPES, 'hard').length, 3);
assert.equal(NV.planWaveSpawnBatch(16, 3, 1, NV.ENEMY_TYPES, 'easy').length, 0);

const game = fs.readFileSync('js/game.js', 'utf8');
assert(game.includes('NV.runUpgradePrice'));
assert(game.includes('NV.weaponFusionShopPrice'));
assert(game.includes('ENEMY_TYPES, NV.runDifficulty'));
assert(game.includes('run: combatLabMode ? null : expeditionRun'),'ruta conectada al boss de producción');
const ui = fs.readFileSync('js/ui/alpha.js', 'utf8');
assert(ui.includes("'calibrate', 'CALIBRAR ARSENAL'"));
assert(fs.readFileSync('css/alpha.css', 'utf8').includes('grid-template-columns:repeat(2,minmax(0,1fr))'));
console.log('RESULT economy_curve_h: gastos tardíos, calibración y composición por dificultad OK');
