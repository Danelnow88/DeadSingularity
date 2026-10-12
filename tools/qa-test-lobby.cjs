'use strict';
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'ds-test-lobby-')));
app.whenReady().then(async()=>{
  const win=new BrowserWindow({width:1280,height:800,show:false,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true}});
  const out=path.join(root,'local/validation/test-lobby');fs.mkdirSync(out,{recursive:true});
  for(const [width,height] of [[1280,800],[1920,1080],[1920,930],[1366,768],[900,600],[800,450],[1000,700]]) for(const preview of [true,false]) {
    win.setMinimumSize(1,1);win.setContentSize(width,height);
    await win.loadFile(path.join(root,'index.html'),{query:preview?{dimensionEvents:'preview',fresh:'1'}:{fresh:'1'}});
    await new Promise(resolve=>setTimeout(resolve,700));
    const report=await win.webContents.executeJavaScript(`(()=>{
      const lobby=document.getElementById('startScreen');
      return {preview:NV.alpha.snapshot().eventPreview,skin:lobby.classList.contains('dimension-test-lobby'),
        play:document.getElementById('lobbyPlayBtn').textContent,status:lobby.querySelector('.lobby-online').textContent,
        combatFilter:getComputedStyle(document.getElementById('game')).filter,
        overflow:lobby.scrollHeight-lobby.clientHeight,
        footerBottom:lobby.querySelector('.lobby-footer').getBoundingClientRect().bottom,
        bars:[...lobby.querySelectorAll('.lobby-masthead,.lobby-footer')].map(e=>({left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right})),
        buttons:[...lobby.querySelectorAll('button')].filter(e=>e.getClientRects().length&&getComputedStyle(e).display!=='none').map(e=>({id:e.id,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,bottom:e.getBoundingClientRect().bottom})),
        upgradeColor:getComputedStyle(document.getElementById('permBtn')).borderColor,
        difficultyColor:getComputedStyle(lobby.querySelector('.lobby-diff-btn[aria-pressed=true]')).backgroundColor};
    })()`);
    assert.equal(!!report.preview,preview);assert.equal(report.skin,preview);
    assert.equal(report.play.includes('JUGAR PRUEBA'),preview);
    assert.equal(report.status.includes('MODO PRUEBA'),preview);
    assert.equal(report.combatFilter,'none');
    assert(report.overflow<=1,'lobby overflow '+JSON.stringify(report));
    assert(report.footerBottom<=height+1,'footer clipped');
    assert(report.bars.every(b=>Math.abs(b.left)<1&&Math.abs(b.right-width)<1),'bars must reach both edges '+JSON.stringify(report.bars));
    assert(report.buttons.every(b=>b.left>=-1&&b.right<=width+1&&b.bottom<=height+1),'buttons clipped '+JSON.stringify(report.buttons));
    if(preview){assert.equal(report.upgradeColor,'rgb(215, 144, 176)');assert.equal(report.difficultyColor,'rgb(117, 68, 95)');}
    const cards=await win.webContents.executeJavaScript(`(async()=>{
      const result=[];for(const pilot of NV.characterList()){
        NV.selectPilot(pilot.id);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
        const card=document.querySelector('#startScreen .panel-piloto'),upgrade=document.getElementById('permBtn');
        const rect=card.getBoundingClientRect();
        result.push({pilot:pilot.id,height:rect.height,upgrade:upgrade.getBoundingClientRect().top,
          overflow:card.scrollHeight-card.clientHeight,fields:[...card.querySelectorAll('#heroName,#heroPassive,#heroSkillDesc,#heroIdentity')].map(e=>({id:e.id,overflow:e.scrollHeight-e.clientHeight,width:e.scrollWidth-e.clientWidth}))});
      }return result;
    })()`);
    assert(cards.every(c=>Math.abs(c.height-cards[0].height)<.1&&Math.abs(c.upgrade-cards[0].upgrade)<.1),'pilot changes layout '+JSON.stringify(cards));
    assert(cards.every(c=>c.overflow<=1&&c.fields.every(f=>f.overflow<=1&&f.width<=1)),'pilot text overflow '+JSON.stringify(cards));
    if(width===1280)fs.writeFileSync(path.join(out,preview?'preview.png':'normal.png'),(await win.webContents.capturePage()).toPNG());
    if(width===1920&&height===930)fs.writeFileSync(path.join(out,preview?'preview-wide.png':'normal-wide.png'),(await win.webContents.capturePage()).toPNG());
    console.log(JSON.stringify({width,height,preview,overflow:report.overflow,footerBottom:report.footerBottom,cardHeight:cards[0].height,pilots:cards.length}));
  }
  console.log('PASS preview lobby skin and normal-mode restoration');win.destroy();app.quit();
}).catch(error=>{console.error(error);app.exit(1);});
