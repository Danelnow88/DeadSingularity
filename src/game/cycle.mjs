// Primer corte vertical. Código nuevo; la referencia no se importa en runtime.
import {MotionBody} from './motion.mjs';
import {GameState,direction} from './input.mjs';
import {WorldView} from './world.mjs';
import {createDrone,stepDrones,hitDrone} from './drone.mjs';
import {rewardKill,tickCombo,passiveRegen} from './progression.mjs';
export const SAVE_KEY='deadSingularity.v1.verticalCheckpoint';
export const RULES=Object.freeze({pistol:{id:'pistol',damage:14,speed:500,range:380,fireRate:30},drone:{id:'drone',hp:25,speed:75,radius:11,damage:12},hpPrice:15,hpStep:4,hpGain:25,hpCap:6});
export function waveRules(wave){
  return {duration:wave<=5?15+(wave-1)*.75:wave<=15?18+(wave-5)*.8:Math.min(35,26+(wave-15)*.6),
    objective:Math.min(60,22+Math.floor((wave-1)*1.5)),batch:2+Math.min(3,Math.floor(wave/2)),refill:Math.max(.35,(1.3-wave*.035)*.86),
    softTarget:Math.min(28,Math.round(Math.min(26,wave<=5?18+(wave-1)*.5:wave<=15?20+(wave-5)*.4:24+(wave-15)*.2))+4),
    hp:Math.round(25*(wave<=10?1+.3*wave:4+(wave-10)*.28)*.85),speed:75+Math.min(40,wave*1.5),damage:(12+Math.min(60,Math.round(wave*1.5)))*.8};
}
export class AudioStub{consume(events){this.lastEvents=events.map(e=>e.type);}clear(){this.lastEvents=[];}}
export class VerticalCycle{
  constructor({state=new GameState(),world=new WorldView(),random=Math.random}={}){
    this.state=state;this.world=world;this.random=random;this.events=[];this.newRun();
  }
  emit(type,data={}){this.events.push({type,...data});}
  drain(){return this.events.splice(0);}
  newRun(){this.wave=1;this.coins=0;this.purchases=0;this.maxHp=120;this.hp=120;this.weaponLevel=1;this.weaponProgress=0;this.score=0;this.playerLevel=1;this.xp=0;this.xpNext=100;this.simFrame=0;this.combo={count:0,timer:0};this.body=new MotionBody({x:this.world.arena.width/2,y:this.world.arena.height-100,speed:195});this.state.userPaused=false;this.startWave();}
  startWave(){this.rules=waveRules(this.wave);this.remaining=this.rules.duration;this.spawnTimer=0;this.fireTimer=0;this.spawned=0;this.killed=0;this.waveHits=0;this.invulnerable=0;this.enemies=[];this.bullets=[];this.drops=[];this.state.set('playing');this.emit('waveStart',{wave:this.wave});}
  spawn(){
    const p=this.body.position,v=this.world;v.follow(p.x,p.y);
    // Colocación mínima interior; el director completo se reconstruirá después.
    const angle=this.random()*Math.PI*2,clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
    const x=clamp(p.x+Math.cos(angle)*240,Math.max(24,v.camera.x+24),Math.min(v.arena.width-24,v.camera.x+v.view.width-24));
    const y=clamp(p.y+Math.sin(angle)*240,Math.max(24,v.camera.y+24),Math.min(v.arena.height-24,v.camera.y+v.view.height-24));
    this.enemies.push(createDrone(x,y,this.rules.hp,angle));this.spawned++;this.emit('spawn');
  }
  shoot(input){
    const p=this.body.position;let aim;
    if(input.firePolicy==='manual'){if(!input.aimActive)return false;aim=direction(input.aimX,input.aimY);}
    else {let target=null,distance=Infinity;for(const e of this.enemies){const d=Math.hypot(e.x-p.x,e.y-p.y);if(e.arrival<=0&&d<distance){distance=d;target=e;}}if(!target||distance>380)return false;aim=direction(target.x-p.x,target.y-p.y);}
    const mult=this.weaponLevel<=25?1+.02*(this.weaponLevel-1):this.weaponLevel<=50?1.48+.01*(this.weaponLevel-25):1.73+.005*(this.weaponLevel-50);
    const crit=this.random()<.1,damage=Math.round(14*mult*(1+(this.wave-1)*.05))*(crit?2:1);
    this.bullets.push({x:p.x,y:p.y-20,vx:aim.x*500,vy:aim.y*500,damage});this.emit('shot',{damage,crit});return true;
  }
  update(dt,input={}){
    if(!Number.isFinite(dt)||dt<0||dt>.25)throw new Error('dt inválido');
    if(dt===0||this.state.paused)return;
    if(this.state.state==='wave_end'||this.state.state==='shop_enter'){this.updateTransition(dt,input);return;}
    if(this.state.state!=='playing')return;
    this.simFrame++;tickCombo(this.combo,dt);passiveRegen(this);
    this.body.step(input,dt);this.world.confine(this.body.position);this.world.follow(this.body.position.x,this.body.position.y);
    this.remaining=Math.max(0,this.remaining-dt);this.invulnerable=Math.max(0,this.invulnerable-dt);this.spawnTimer-=dt;
    if(this.spawnTimer<=0){const count=Math.min(this.rules.batch,this.rules.objective-this.spawned,this.rules.softTarget-this.enemies.length);for(let i=0;i<count;i++)this.spawn();this.spawnTimer=this.rules.refill;}
    this.fireTimer-=dt;
    if((input.firePolicy==='legacy-auto'||input.fire)&&this.fireTimer<=0){const fired=this.shoot(input);this.fireTimer=fired?Math.max(4/60,.5*Math.max(.55,1-.01*this.wave)*Math.max(.6,1-.004*(this.weaponLevel-1))):4/60;}
    const p=this.body.position;
    const active=this.enemies.filter(e=>e.arrival<=0);
    for(const e of this.enemies){if(e.arrival>0){e.arrival=Math.max(0,e.arrival-dt);if(e.arrival===0&&!e.puff){if(Math.hypot(e.x-p.x,e.y-p.y)<56){e.x=p.x<this.world.arena.width/2?this.world.arena.width-24:24;e.y=p.y<390?756:24;e.arrival=.9;}else{e.puff=true;e.arrival=.22;}}}}
    let lethal=false;
    stepDrones(active,p,this.world.arena,this.rules.speed,dt,e=>{
      if(this.invulnerable>0)return;const crit=this.random()<Math.min(.35,.1+this.wave*.018),damage=Math.round(crit?Math.round(this.rules.damage*1.6):this.rules.damage);
      this.hp=Math.max(0,this.hp-damage);lethal=this.hp<=0;this.invulnerable=.5;this.combo={count:0,timer:0};this.waveHits++;this.emit('playerDamage',{damage});this.kill(e,false);
    });
    for(const b of this.bullets){const oldX=b.x,oldY=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;
      for(const e of this.enemies){if(e.hp<=0||e.arrival>0)continue;const dx=b.x-oldX,dy=b.y-oldY,den=dx*dx+dy*dy,t=den?Math.max(0,Math.min(1,((e.x-oldX)*dx+(e.y-oldY)*dy)/den)):0;
        if(Math.hypot(e.x-oldX-t*dx,e.y-oldY-t*dy)<=15){e.hp-=b.damage;b.dead=true;this.emit('enemyDamage',{damage:b.damage});hitDrone(e,b.x,b.y);if(e.hp<=0)this.kill(e,true);
          break;
        }
      }
    }
    this.enemies=this.enemies.filter(e=>e.hp>0);this.bullets=this.bullets.filter(b=>!b.dead&&b.x>=0&&b.y>=0&&b.x<=this.world.arena.width&&b.y<=this.world.arena.height);
    this.drops=this.drops.filter(d=>{if(Math.hypot(d.x-p.x,d.y-p.y)<30){this.coins+=d.value;this.emit('pickup',{value:d.value});return false;}return true;});
    if(lethal||this.hp<=0){this.hp=0;this.state.set('gameover');this.emit('playerDeath');return;}
    if(this.remaining<=0&&this.spawned>=this.rules.objective&&!this.enemies.length){
      const selected=[...this.drops].sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y)).slice(0,15);for(const d of selected)d.collect=true;
      const reward=8+Math.min(12,this.wave)+(this.waveHits===0?8:0);this.coins+=reward;this.state.set('wave_end');this.transition=0;this.invulnerable=Math.max(this.invulnerable,2.65);this.bullets=[];this.emit('waveEnd',{reward});
    }
  }
  kill(e,weapon){if(e.resolved)return;e.resolved=true;e.hp=0;this.killed++;rewardKill(this,weapon);this.emit('enemyDeath');if(this.random()<.15){this.drops.push({x:e.x,y:e.y,value:1});this.emit('drop');}}
  updateTransition(dt,input){
    this.simFrame++;this.transition+=dt;this.invulnerable=Math.max(0,this.invulnerable-dt);
    if(this.state.state==='wave_end'){
      this.body.move(input,dt);this.world.confine(this.body.position);this.body.position.y=Math.max(30,this.body.position.y);const p=this.body.position;this.world.follow(p.x,p.y);
      this.drops=this.drops.filter(d=>{const distance=Math.hypot(d.x-p.x,d.y-p.y);if(d.collect&&distance>0){const step=Math.min(1400,520+distance*5.5)*dt;d.x+=(p.x-d.x)/distance*step;d.y+=(p.y-d.y)/distance*step;}
        if(Math.hypot(d.x-p.x,d.y-p.y)<30){this.coins+=d.value;this.emit('pickup',{value:d.value});return false;}return true;});
      if(this.transition>=2.1){for(const d of this.drops)if(d.collect){this.coins+=d.value;this.emit('pickup',{value:d.value});}this.drops=[];this.transition=0;this.state.set('shop_enter');}
    }else if(this.transition>=.35){this.state.set('shop');this.emit('shopReady');}
  }
  price(){return 15+4*this.purchases;}
  buyHp(){if(this.state.state!=='shop'||this.purchases>=6||this.coins<this.price())return false;const price=this.price();this.coins-=price;this.purchases++;this.maxHp+=25;this.hp+=25;this.emit('purchase',{id:'hp',price});return true;}
  deploy(){if(this.state.state!=='shop')return false;this.wave++;this.startWave();return true;}
  checkpoint(){if(this.state.state!=='shop')throw new Error('Guardá desde la tienda, entre oleadas');return {format:'dead-singularity-vertical',version:2,state:'shop',pilot:'boti',weapon:'pistol',wave:this.wave,hp:this.hp,maxHp:this.maxHp,coins:this.coins,purchases:this.purchases,weaponLevel:this.weaponLevel,weaponProgress:this.weaponProgress,score:this.score,playerLevel:this.playerLevel,xp:this.xp,xpNext:this.xpNext,simFrame:this.simFrame};}
  load(raw){
    if(!raw||raw.format!=='dead-singularity-vertical'||![1,2].includes(raw.version)||raw.state!=='shop'||raw.pilot!=='boti'||raw.weapon!=='pistol')throw new Error('Checkpoint incompatible');
    raw=raw.version===1?{...raw,playerLevel:1,xp:0,xpNext:100,simFrame:0}:raw;
    const bounds={wave:[1,9999],hp:[1,1260],maxHp:[120,1260],coins:[0,1e6],purchases:[0,6],weaponLevel:[1,100],weaponProgress:[0,1e6],score:[0,1e9],playerLevel:[1,100],xp:[0,1e20],xpNext:[100,1e20],simFrame:[0,1e12]};
    for(const [key,[min,max]] of Object.entries(bounds))if(!Number.isFinite(raw[key])||raw[key]<min||raw[key]>max||!Number.isInteger(raw[key])&&!['weaponProgress','score','xp'].includes(key))throw new Error('Checkpoint inválido: '+key);
    let threshold=100;for(let i=1;i<raw.playerLevel;i++)threshold=Math.floor(threshold*1.5);
    if(raw.maxHp!==120+25*raw.purchases+10*(raw.playerLevel-1)||raw.hp>raw.maxHp||raw.xpNext!==threshold||raw.xp>=threshold)throw new Error('Salud/progresión inconsistente');
    for(const key of Object.keys(bounds))this[key]=raw[key];this.combo={count:0,timer:0};this.rules=waveRules(this.wave);this.remaining=0;this.spawned=this.rules.objective;this.killed=this.rules.objective;this.enemies=[];this.bullets=[];this.drops=[];this.state.userPaused=false;this.state.set('shop');this.emit('loaded');return true;
  }
}
