(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.NV = root.NV || {}).Pursuit = factory();
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  const copy = value => value == null ? null : JSON.parse(JSON.stringify(value));
  function create(uid) {
    if(typeof uid!=='string'||!uid||uid.length>96)throw new Error('Invalid pursuit identity');
    let phase='guarding', record=null, wait=0, reason=null;
    const resolved=new Set();
    return {
      get phase() { return phase; },
      get record() { return copy(record); },
      provoke(e,field) {
        if(phase!=='guarding'||!e||e.dead||e.enemyTypeId!=='tank'||
          ![e.hp,e.maxHp,e.damage,e.speed].every(Number.isFinite)||e.hp<=0||e.hp>e.maxHp||e.damage<0||e.speed<0) return false;
        record={version:1,uid,typeId:e.enemyTypeId,fieldId:field,hp:e.hp,maxHp:e.maxHp,
          damage:e.damage,speed:e.speed,transfersLeft:2,lastTransferId:null,heavy:e.hostileClass==='heavy'};
        e.pursuitUid=uid; phase='active'; return true;
      },
      depart(e,transferId) {
        if(phase!=='active'||!record||transferId===record.lastTransferId) return false;
        if(!e||e.dead||!(e.hp>0)) return false;
        if(record.transfersLeft===0) { phase='escaped';reason='transfer-limit';return false; }
        record.hp=e.hp;record.maxHp=e.maxHp;record.lastTransferId=transferId;
        record.transfersLeft--;phase='transit';return true;
      },
      entered(field) {
        if(phase!=='transit') return false;
        record.fieldId=field;wait=0;phase='waiting';return true;
      },
      tick(dt) {
        if(phase!=='waiting') return false;
        wait+=Math.max(0,dt);
        if(wait>=10.5){phase='escaped';reason='no-safe-arrival';return false;}
        return wait>=2.5;
      },
      placed(e) {
        if(phase!=='waiting'||!e) return false;
        Object.assign(e,{hp:record.hp,maxHp:record.maxHp,damage:record.damage,speed:record.speed,pursuitUid:uid});
        phase='materializing';return true;
      },
      arrived() { if(phase==='materializing'){phase='active';return true;}return false; },
      retry() { if(phase==='materializing'){phase='waiting';return true;}return false; },
      kill(id) {
        if(id!==uid||resolved.has(id)||!['active','materializing'].includes(phase)) return false;
        resolved.add(id);phase='killed';return true;
      },
      cancel(why) { if(!['killed','escaped','cancelled'].includes(phase)){phase='cancelled';reason=why;} },
      reservations() { return phase==='waiting' ? {hostiles:1,heavy:record.heavy?1:0} : {hostiles:0,heavy:0}; },
      snapshot() { return {uid,phase,record:copy(record),wait,reason}; }
    };
  }
  function safePosition(point, ctx) {
    const r=ctx.radius, v=ctx.view, p=ctx.player;
    if(point.x<r+20||point.y<r+20||point.x>ctx.W-r-20||point.y>ctx.H-r-20) return false;
    if(point.x<v.x+r+20||point.y<v.y+r+20||point.x>v.x+v.width-r-20||point.y>v.y+v.height-r-20) return false;
    if(Math.hypot(point.x-p.x,point.y-p.y)<Math.max(180,r+(p.radius||20)+25)) return false;
    if(ctx.enemies.some(e=>!e.dead&&e!==ctx.self&&Math.hypot(point.x-e.x,point.y-e.y)<r+e.radius+20)) return false;
    return !(ctx.unsafe && ctx.unsafe(point,r));
  }
  function position(ctx) {
    const v=ctx.view;
    for(let i=0;i<8;i++) {
      const angle=i*Math.PI/4;
      const p={x:v.x+v.width/2+Math.cos(angle)*(v.width/2-ctx.radius-24),
        y:v.y+v.height/2+Math.sin(angle)*(v.height/2-ctx.radius-24)};
      if(safePosition(p,ctx))return p;
    }
    return null;
  }
  return Object.freeze({create,position,safePosition});
});
