'use strict';
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'local/validation/threat-presence');
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'ds-presence-')));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  fs.mkdirSync(out, { recursive: true });
  const win = new BrowserWindow({ width:1200,height:800,show:false,
    webPreferences:{offscreen:true,backgroundThrottling:false,sandbox:true,contextIsolation:true} });
  const errors = [], reports = [];
  win.webContents.on('console-message', d => { if(d.level === 'error') errors.push(d.message); });
  const evaluate = code => win.webContents.executeJavaScript(code,true);
  async function openScenario() {
    await win.loadFile(path.join(root,'index.html'),{query:{fresh:'1',combatLab:'1'}}); await delay(600);
    await evaluate(`
    window.qaPresence = []; window.qaShots = 0;
    const shoot = NV.shoot, update = NV.updateEnemies;
    NV.shoot = function(st) { const result = shoot(st); if(result) window.qaShots++; return result; };
    NV.updateEnemies = function(dt,st) {
      const result = update(dt,st);
      window.qaPresence = st.enemies.filter(e=>NV.isDimensionalThreat(e)&&!e.dead)
        .map(e=>({id:e.enemyTypeId,hp:e.hp,maxHp:e.maxHp,phase:e.dimensionalThreat&&e.dimensionalThreat.phase}));
      return result;
    }; true;
    `);
  }
  const selected = process.argv.find(a=>a.startsWith('--id='));
  for(const id of ['rift_weaver','dimension_sniper','void_devourer'].filter(id=>!selected||id===selected.slice(5))) {
    await openScenario();
    const wave = await evaluate(`NV.getProductionEnemyDefinition('${id}').definition.minWave`);
    await evaluate("NV.setFirePolicy('legacy-auto'); window.qaPresence=[]; window.qaShots=0;");
    const config={characterId:'boti',wave,difficultyId:'normal',durationMode:'infinite',composition:[{enemyId:id,quantity:1}]};
    const result=await evaluate(`NV.combatLabRuntime.start(${JSON.stringify(config)})`); assert(result.ok);
    await evaluate('NV.input.setFire(true)');
    const started=Date.now(),deadline=started+30000; let attack=null,last=null;
    while(Date.now()<deadline) {
      const s=await evaluate('({runtime:NV.getRuntimeSnapshot(),enemies:window.qaPresence,shots:window.qaShots})');
      last=s;
      if(!attack && s.enemies.some(e=>e.phase==='active')) {
        attack={seconds:(Date.now()-started)/1000,enemy:s.enemies[0],shots:s.shots};
        fs.writeFileSync(path.join(out,id+'-under-autofire.png'),(await win.webContents.capturePage()).toPNG());
      }
      if(s.runtime.enemies===0) {
        assert(attack,id+' muere antes de ejecutar su mecánica con autodisparo');
        assert(s.shots>0,id+' no fue derrotado con arma real');
        reports.push({id,wave,attack,shots:s.shots,playerHp:s.runtime.player.hp}); break;
      }
      assert.equal(s.runtime.state,'playing',id+' no es resoluble con el arma inicial');
      await delay(20);
    }
    if(!reports.some(r=>r.id===id)) fs.writeFileSync(path.join(out,id+'-failure.json'),JSON.stringify(last,null,2));
    assert(reports.some(r=>r.id===id),id+' no se pudo resolver');
    console.log('PASS presencia con autodisparo',id,JSON.stringify(reports.at(-1)));
    await evaluate('NV.combatLabRuntime.reset()');
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'runtime.json'),JSON.stringify({pass:true,reports,errors},null,2)); app.exit(0);
}).catch(e=>{console.error(e);app.exit(1);});
