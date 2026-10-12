'use strict';
const assert=require('node:assert/strict'),ai=require('../js/engine/coreEvasion.js');
const ctx={W:1200,H:800,view:{x:0,y:0,width:1200,height:800},player:{x:500,y:400,effectiveMoveSpeed:195},bullets:[]};
const actor=(x=650,y=400)=>({x,y,vx:0,vy:0,ax:0,ay:0,hp:360,radius:24,pattern:0,windup:0});
function run(t,b,c,seconds){for(let frame=0;frame<seconds*120;frame++)ai.update(b,t,1/120,c);}
const near=actor(),nb=ai.create(near);run(near,nb,ctx,.7);
assert(near.x>650,'did not escape approaching player');assert(nb.danger>.5);
assert(Math.hypot(near.vx,near.vy)>90,'escape lacks urgency');
const far=actor(900),fb=ai.create(far);run(far,fb,ctx,.7);
assert(Math.hypot(far.vx,far.vy)<45,'safe core remains at panic speed');
const hit=actor(900),hb=ai.create(hit);hit.hp-=20;run(hit,hb,ctx,.2);
assert(hb.danger>=.85&&hb.burst>0,'damage did not increase risk');
const shot=actor(750),sb=ai.create(shot);
run(shot,sb,{...ctx,bullets:[{x:590,y:400,vx:400,vy:0,isEnemy:false}]},.2);
assert(sb.danger>=.8,'incoming shot ignored');
const hostile=actor(750),eb=ai.create(hostile);
run(hostile,eb,{...ctx,bullets:[{x:590,y:400,vx:400,vy:0,isEnemy:true}]},.2);
assert(eb.danger<.8,'hostile projectile counted as player pressure');
const winding=actor(),wb=ai.create(winding);winding.windup=.65;run(winding,wb,ctx,.7);
assert(Math.hypot(winding.vx,winding.vy)<55,'attack preparation lacks catch window');
const tired=actor(),tb=ai.create(tired);let recovery=false;
for(let frame=0;frame<480;frame++){ai.update(tb,tired,1/120,ctx);if(tb.recovery>.1&&tb.wantedSpeed<=48)recovery=true;}
assert(recovery,'sprint never recovers');
let scans=0;const massive=actor(),mb=ai.create(massive);
const shots=Array.from({length:5000},()=>({dead:true}));
const wrapped=new Proxy(shots,{get(a,key){if(/^\d+$/.test(String(key)))scans++;return a[key];}});
run(massive,mb,{...ctx,bullets:wrapped,unsafe:()=>true},1);
assert(scans<=96*20,'blocked navigation rescans unbounded projectile list');
assert.equal(massive.x,650);assert.equal(massive.y,400);
const pursuit=actor(850),pb=ai.create(pursuit),chaser={...ctx,player:{...ctx.player}};
let caught=false;
for(let frame=0;frame<1200;frame++) {
  const dx=pursuit.x-chaser.player.x,dy=pursuit.y-chaser.player.y,d=Math.hypot(dx,dy);
  if(d<=100){caught=true;break;}
  chaser.player.x+=dx/d*195/120;chaser.player.y+=dy/d*195/120;
  ai.update(pb,pursuit,1/120,chaser);
}
assert(caught,'baseline player cannot close to autoaim core priority range');
const corner=actor(1150,750),cb=ai.create(corner);
run(corner,cb,{...ctx,player:{x:1060,y:710}},8);
assert(corner.x>=48&&corner.x<=1152&&corner.y>=48&&corner.y<=752,'escaped world at corner');
assert(Math.hypot(corner.x-1150,corner.y-750)>25,'corner created permanently stuck core');
console.log('PASS core_evasion: proximity, hit/projectile risk, finite bursts/recovery, windup catch window, hostile-shot exclusion and bounded blocked-path scanning');
