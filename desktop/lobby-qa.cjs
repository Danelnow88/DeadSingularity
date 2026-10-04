// Flujo del lobby aprobado, con runtime real y perfil aislado del jugador.
const assert=require('node:assert/strict');
module.exports=async function(evaluate,shot,resize){
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  async function until(expr){for(let i=0;i<100;i++){if(await evaluate(expr))return;await sleep(100);}throw Error('Lobby QA: '+expr);}
  const layouts=[];
  for(const [width,height,mobile] of (resize?[[1440,900,false],[1280,800,false],[915,412,true],[844,390,true]]:[[1280,800,false]])){
    if(resize)await resize(width,height,mobile);await sleep(140);
    await evaluate('document.getElementById("startScreen").scrollTop=0');
    const layout=await evaluate(`(() => {
      const screen=document.getElementById('startScreen'),p=document.querySelector('.panel-piloto').getBoundingClientRect(),b=document.getElementById('permBtn').getBoundingClientRect();
      return {width:innerWidth,height:innerHeight,panel:p.width,button:b.width,left:p.left,buttonLeft:b.left,
        screenWidth:screen.clientWidth,scrollWidth:screen.scrollWidth,columns:getComputedStyle(document.querySelector('.main-lobby-panel')).gridTemplateColumns,
        canvas:{w:document.getElementById('lobbyPreview').width,h:document.getElementById('lobbyPreview').height},
        dots:document.querySelectorAll('#lobbyStoryDots .dot').length,buttons:Array.from(screen.querySelectorAll('button')).map(b=>b.textContent.trim())};
    })()`);
    assert.equal(layout.panel,layout.button);assert.equal(layout.left,layout.buttonLeft);
    assert(layout.scrollWidth<=layout.screenWidth+1,'overflow horizontal');assert.equal(layout.dots,10);
    assert.equal(layout.columns.split(' ').length,width<=980?1:3);assert(layout.canvas.w>0&&layout.canvas.h>0);
    assert(!layout.buttons.includes('PILOTOS'));
    await shot('lobby-'+width);layouts.push(layout);
    await evaluate('document.getElementById("permBtn").scrollIntoView({block:"center"})');await shot('pilot-panel-'+width);
    await evaluate('document.getElementById("lobbyModeHistory").scrollIntoView({block:"center"})');await shot('modes-'+width);
  }
  if(resize)await resize(1280,800,false);
  await evaluate('document.getElementById("startScreen").scrollTop=0');
  const pilots=[];
  for(const id of ['nova','rook','swarm','boti']){
    await evaluate('document.getElementById("hero-next").click()');
    assert.equal(await evaluate('NV.alpha.snapshot().character'),id);
    assert(await evaluate('document.getElementById("heroName").textContent===NV.CHARACTERS[NV.alpha.snapshot().character].name'));
    await shot('pilot-'+id);pilots.push(id);
  }
  await evaluate('document.getElementById("pilotsBtn").click()');
  assert(await evaluate('!document.getElementById("characterSelectScreen").classList.contains("hidden") && document.getElementById("startScreen").classList.contains("hidden")'));
  await evaluate('document.querySelector(".char-card[data-char=nova]").click();document.getElementById("startBtn").click()');
  assert.equal(await evaluate('NV.alpha.snapshot().character'),'nova');
  await evaluate('document.getElementById("permBtn").click()');
  assert(await evaluate('!document.getElementById("permShop").classList.contains("hidden")'));await shot('improvements');
  await evaluate('document.getElementById("permBack").click();document.getElementById("lobbySettingsBtn").click()');
  assert(await evaluate('document.documentElement.getAttribute("data-settings-open")==="true"'));
  await evaluate('document.getElementById("settingsClose").click();document.getElementById("lobbyModeEndless").click()');
  assert.equal(await evaluate('NV.alpha.snapshot().mode'),'endless');
  await evaluate('document.getElementById("lobbyModeHistory").click()');
  assert.equal(await evaluate('NV.alpha.snapshot().mode'),'expedition');
  const run=await evaluate(`(() => {const run=NV.expedition.create('expedition',0);run.cleared=6;run.bosses=3;
    return NV.expedition.save({version:1,character:'rook',wave:6,run,player:{hp:120,maxHp:120,xpToNext:100},inventory:['pistol'],currentWeapon:'pistol',levels:{pistol:1},kills:{},fus:{},consumables:[],shopBought:{},upgradeSlots:[],score:0,shards:100,difficulty:'normal'});})()`);
  assert(run);await until('document.querySelectorAll("#lobbyStoryDots .completed").length===3');
  await evaluate('document.querySelectorAll("#lobbyStoryDots .dot")[3].focus()');await sleep(220);
  assert.equal(await evaluate('document.getElementById("lobbyBossName").textContent'),'Jefe 4: GUARDIÁN');
  assert.equal(await evaluate('document.getElementById("lobbyBossSector").textContent'),'FUNDICIÓN');
  assert.equal(await evaluate('getComputedStyle(document.getElementById("lobbyStoryTooltip")).visibility'),'visible');
  await shot('checkpoint-tooltip');
  await evaluate('document.getElementById("alphaResume").click()');await until('NV.getState()==="playing"');
  assert.equal(await evaluate('NV.alpha.snapshot().wave'),7);assert.equal(await evaluate('NV.alpha.snapshot().character'),'rook');
  await shot('resumed-game');
  await evaluate('NV.input.togglePause()');assert(await evaluate('NV.alpha.snapshot().paused'));
  await evaluate('NV.input.togglePause()');
  assert(await evaluate('document.getElementById("startScreen").classList.contains("hidden")'));
  return {pass:true,layouts,pilots,modes:true,library:true,improvements:true,settings:true,checkpoint:true,pause:true};
};
