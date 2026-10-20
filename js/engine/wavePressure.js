// Artillería temprana: proyectil físico de tanque, sin marcas ni daño de área.
(() => {
  'use strict';
  const NV = window.NV;
  const profiles = { easy: {first:1.9, interval:2.15, damage:28}, normal:{first:1.8,interval:2,damage:34}, hard:{first:1.7,interval:1.85,damage:40} };
  NV.createWavePressure = () => ({ timer: null, mark: null, serial:0 });
  NV.updateWavePressure = function (dt, st) {
    if (!st || !st.state || !(dt>0)) return;
    const s=st.state; s.mark=null;
    if(!st.active || st.wave>=5 || st.boss || !st.player || st.player.hp<=0) return;
    const cfg=profiles[st.difficulty] || profiles.normal;
    if(s.timer==null)s.timer=cfg.first;
    s.timer=Math.max(0,s.timer-dt);
    if(s.timer>0)return;
    // Una única descarga global y sólo de artillería visible, nunca de perseguidores.
    const v=st.threatView;
    const sources=st.enemies.filter(e=>e.enemyTypeId==='tank' && !e.isElite && !e.dead && !e.arrival && !e.waveCleanup && !e.killResolved && !(e.stun>0)
      && (!e.tankCannonState || e.tankCannonState === 'approach')
      && (!v || e.x>=v.x+20 && e.x<=v.x+v.width-20 && e.y>=v.y+20 && e.y<=v.y+v.height-20));
    if(!sources.length)return;
    if(!st.bullets || st.bullets.length>=st.MAX_BULLETS || st.enemyBulletCount()>=st.MAX_ENEMY_BULLETS)return;
    const e=sources[(s.serial||0)%sources.length],dx=st.player.x-e.x,dy=st.player.y-e.y,d=Math.max(1,Math.hypot(dx,dy));
    // Si están cuerpo a cuerpo, dejar espacio de reacción a la bala viajera.
    if(d<100)return;
    // Request the same aimed windup as normal artillery. Only updateEnemies emits shells.
    // This used to fire immediately, even while the cannon was stowed or recovering.
    e.tankCannonState='windup';e.tankCannonTimer=NV.ENEMY_ROLE_REWORK?.tank?.windup || .9;
    e.tankCannonTargetX=st.player.x;e.tankCannonTargetY=st.player.y;
    e.tankCannonFired=false;e.tankCannonShotEmitted=false;
    e.tankPressureShot={damage:cfg.damage,speed:280,radius:9};
    if(st.sfx && st.sfx.telegraph)st.sfx.telegraph({x:e.x,worldWidth:st.W});
    s.serial=(s.serial||0)+1;s.timer=cfg.interval;
  };
  NV.drawWavePressure = function () {};
})();
