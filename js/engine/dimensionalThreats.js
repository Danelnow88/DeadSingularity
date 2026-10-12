// Amenazas geométricas: una preparación de ataque y una zona simultáneas.
// Sin arrays de partículas, escaneos de balas ni alteración de controles.
(() => {
  'use strict';
  const NV = window.NV;
  const profiles = Object.freeze({
    rift_weaver: Object.freeze({ kind: 'cut', windup: 1.55, active: 4.8, recovery: .8, cooldown: 3.1, range: 400, approach: .55, width: 30, damageMult: 2.2, damageInterval: .75 }),
    void_devourer: Object.freeze({ kind: 'devour', windup: 1, active: 2.6, recovery: .9, cooldown: 3.5, range: 380 }),
    dimension_sniper: Object.freeze({ kind: 'snipe', windup: 1.15, lockTime: .18, prediction: .22, active: .5, recovery: .85, cooldown: 2.7, range: 410 })
  });
  NV.DIMENSIONAL_THREATS = profiles;
  NV.isDimensionalThreat = e => !!e && !!profiles[e.enemyTypeId || e.id];
  const live = e => !e.dead && !e.waveCleanup && !e.killResolved;
  NV.dimensionalSpawnAllowed = function (type, st) {
    if (!profiles[type.id]) return true;
    if (st.boss && !st.boss.dead) return false;
    let count = 0;
    for (const e of st.enemies) if (live(e) && NV.isDimensionalThreat(e)) {
      if (e.enemyTypeId === type.id) return false;
      count++;
    }
    return count < 2;
  };
  // Una pasada adicional O(n); la reserva se comparte durante TODO el frame.
  NV.prepareDimensionalThreats = function (st) {
    st.dimensionalReservations = { attack: null, zone: null, nextZone: null };
    st.dimensionalPressure = 0;
    for (const e of st.enemies) {
      if (!live(e) || e.arrival) continue;
      if (!NV.isDimensionalThreat(e)) {
        // Coordinar sin modificar IA, velocidad ni daño de los enemigos comunes.
        if (!(e.stun > 0) && Math.hypot(e.x-st.player.x,e.y-st.player.y)<210) st.dimensionalPressure++;
        continue;
      }
      const s = e.dimensionalThreat;
      if (e.stun > 0) { NV.cancelDimensionalThreat(e); continue; }
      if (s && (s.phase === 'windup' || s.phase === 'active')) {
        st.dimensionalReservations[s.kind === 'snipe' ? 'attack' : 'zone'] = e;
      }
      // Prioridad por espera, no por posición en el array. No reservar para
      // alguien fuera de alcance/cámara: no debe bloquear a los demás.
      const cfg = profiles[e.enemyTypeId], view = st.threatView;
      const visible = !view || (e.x >= view.x + 20 && e.y >= view.y + 20
        && e.x <= view.x + view.width - 20 && e.y <= view.y + view.height - 20);
      if (s && s.kind !== 'snipe' && s.phase === 'position' && s.cooldown <= 0
        && visible && st.player.hp > 0 && Math.hypot(e.x-st.player.x,e.y-st.player.y) <= cfg.range) {
        const previous = st.dimensionalReservations.nextZone;
        if (!previous || (s.zoneWait || 0) > (previous.dimensionalThreat.zoneWait || 0))
          st.dimensionalReservations.nextZone = e;
      }
    }
  };
  NV.cancelDimensionalThreat = function (e) {
    const s = e.dimensionalThreat;
    if (!s) return;
    s.phase = 'position'; s.elapsed = 0; s.cooldown = 1.2; s.geometry = null; s.zoneWait = 0;
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function arenaPoint(x, y, st, margin) {
    const W = st.W || 900, H = st.H || 520;
    margin = Math.min(margin, Math.min(W, H) * .25);
    return { x: clamp(x, margin, W - margin), y: clamp(y, margin, H - margin) };
  }
  function geometry(e, st, kind) {
    const p = st.player, dx = p.x - e.x, dy = p.y - e.y;
    const d = Math.max(1, Math.hypot(dx, dy)), nx = d <= 1 ? 1 : dx / d, ny = d <= 1 ? 0 : dy / d;
    if (kind === 'devour') {
      const radius = Math.min(126, Math.min(st.W || 900, st.H || 520) * .23);
      // Intercepta el movimiento, sin perseguirlo durante el aviso. La
      // anticipación deja al jugador dentro del núcleo inicialmente seguro.
      const s = e.dimensionalThreat, vx = s.velocityX || 0, vy = s.velocityY || 0;
      const lead = Math.min(60, Math.max(0, radius - 8 - (p.radius || 20) - 12));
      const factor = Math.min(.4, lead / Math.max(1, Math.hypot(vx, vy)));
      const c = arenaPoint(p.x + vx * factor, p.y + vy * factor, st, radius + 12);
      return { x: c.x, y: c.y, outer: radius, inner: radius - 8 };
    }
    if (kind === 'cut') {
      // No nace bajo el jugador: el costurero ocupa un flanco cercano y lo recorre.
      const s=e.dimensionalThreat,velocity=Math.hypot(s.velocityX||0,s.velocityY||0);
      const ux=velocity>35?s.velocityX/velocity:nx,uy=velocity>35?s.velocityY/velocity:ny;
      const half=Math.min(110,Math.min(st.W||900,st.H||520)*.21);
      // Cruza la ruta de movimiento; junto a una pared corta la retirada, no nace encima.
      let chosen;
      for(const [vx,vy] of [[ux,uy],[-ux,-uy],[-uy,ux],[uy,-ux]]){
        const c=arenaPoint(p.x+vx*110,p.y+vy*110,st,60);
        const a=arenaPoint(c.x-vy*half,c.y+vx*half,st,44);
        const b=arenaPoint(c.x+vy*half,c.y-vx*half,st,44);
        const candidate={ax:a.x,ay:a.y,bx:b.x,by:b.y,sourceX:e.x,sourceY:e.y,halfWidth:profiles.rift_weaver.width};
        if(!chosen || pointDistance(p.x,p.y,a.x,a.y,b.x,b.y)>pointDistance(p.x,p.y,chosen.ax,chosen.ay,chosen.bx,chosen.by))chosen=candidate;
        if(pointDistance(p.x,p.y,a.x,a.y,b.x,b.y)>(p.radius||20)+candidate.halfWidth+20)return candidate;
      }
      return chosen;
    }
    // Boca de entrada frente al tirador; salida lateral al objetivo, nunca encima.
    const a = arenaPoint(e.x + nx * 36, e.y + ny * 36, st, 24);
    const side = e.x < p.x ? 1 : -1;
    const b = arenaPoint(p.x - ny * 150 * side, p.y + nx * 150 * side, st, 30);
    const vx = p.x - b.x, vy = p.y - b.y, len = Math.max(1, Math.hypot(vx, vy));
    const end = arenaPoint(b.x + vx / len * (len + 100), b.y + vy / len * (len + 100), st, 20);
    const angle = Math.atan2(vy, vx), length = Math.hypot(end.x - b.x, end.y - b.y);
    const rays = [-.22, 0, .22].map(offset => {
      const q = arenaPoint(b.x + Math.cos(angle + offset) * length, b.y + Math.sin(angle + offset) * length, st, 20);
      return { ax: b.x, ay: b.y, bx: q.x, by: q.y };
    });
    return { entryX: a.x, entryY: a.y, ax: b.x, ay: b.y, bx: end.x, by: end.y,
      rays, sourceX: e.x, sourceY: e.y };
  }
  function aimSniper(e,st,s,cfg){
    const g=s.geometry,p=st.player;
    const target=arenaPoint(p.x+(s.velocityX||0)*cfg.prediction,p.y+(s.velocityY||0)*cfg.prediction,st,20);
    g.targetX=target.x;g.targetY=target.y;
    const angle=Math.atan2(target.y-g.ay,target.x-g.ax);
    const length=Math.min(360,Math.hypot(target.x-g.ax,target.y-g.ay)+100);
    for(let i=0;i<3;i++){
      const offset=(i-1)*.17;
      const end=arenaPoint(g.ax+Math.cos(angle+offset)*length,g.ay+Math.sin(angle+offset)*length,st,20);
      const ray=g.rays[i];ray.ax=g.ax;ray.ay=g.ay;ray.bx=end.x;ray.by=end.y;
    }
    g.bx=g.rays[1].bx;g.by=g.rays[1].by;
    e.dimensionalFacing=Math.atan2(target.y-e.y,target.x-e.x);
  }
  function pointDistance(x, y, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const t = clamp(((x - ax) * dx + (y - ay) * dy) / Math.max(1e-9, dx * dx + dy * dy), 0, 1);
    return Math.hypot(x - ax - dx * t, y - ay - dy * t);
  }
  // Colisión barrida de la línea: también detecta cruzarla entre dos frames.
  NV.dimensionalLineHits = function (g, x, y, px, py, radius) {
    const cross = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    const a = cross(g.ax, g.ay, g.bx, g.by, px, py), b = cross(g.ax, g.ay, g.bx, g.by, x, y);
    const c = cross(px, py, x, y, g.ax, g.ay), d = cross(px, py, x, y, g.bx, g.by);
    if (a * b < 0 && c * d < 0) return true;
    return Math.min(pointDistance(x, y, g.ax, g.ay, g.bx, g.by),
      pointDistance(px, py, g.ax, g.ay, g.bx, g.by),
      pointDistance(g.ax, g.ay, px, py, x, y), pointDistance(g.bx, g.by, px, py, x, y)) <= radius;
  };
  NV.updateDimensionalThreat = function (e, dt, st, speed) {
    const cfg = profiles[e.enemyTypeId];
    if (!cfg || !live(e) || e.arrival || !(dt > 0)) return false;
    if (e.stun > 0) { NV.cancelDimensionalThreat(e); return false; }
    const s = e.dimensionalThreat || (e.dimensionalThreat = { kind: cfg.kind, phase: 'position', elapsed: 0,
      cooldown: .35, age: 0, geometry: null, spent: false, tick: 0, lastX: st.player.x, lastY: st.player.y });
    s.age = (s.age || 0) + dt;
    const p = st.player, dx = p.x - e.x, dy = p.y - e.y, dist = Math.max(1, Math.hypot(dx, dy));
    // Filtrado temporal, limitado incluso durante dash: no persigue un teletransporte.
    const blend=1-Math.exp(-dt/.12),vx=(p.x-s.lastX)/dt,vy=(p.y-s.lastY)/dt;
    const cap=Math.min(1,260/Math.max(1,Math.hypot(vx,vy)));
    s.velocityX=(s.velocityX||0)+(vx*cap-(s.velocityX||0))*blend;
    s.velocityY=(s.velocityY||0)+(vy*cap-(s.velocityY||0))*blend;
    const reservations = st.dimensionalReservations || (st.dimensionalReservations = { attack: null, zone: null });
    const temporal = cfg.kind==='snipe' && st.temporalShots;
    const preparationDt = temporal && Number.isFinite(temporal.controlDt)
      ? Math.max(dt,Math.min(.1,temporal.controlDt)) : dt;
    const attackDt = temporal && s.phase==='active' && temporal.held ? dt*.15 :
      temporal && s.phase==='windup' ? preparationDt : dt;
    // Una zona de exclusión y un disparo. Una costura no silencia al francotirador.
    const key = cfg.kind === 'snipe' ? 'attack' : 'zone';
    let killed = false;
    if (s.phase === 'position') {
      e.dimensionalFacing = Math.atan2(dy, dx);
      const coordinated=(st.dimensionalPressure||0)>=2 || (cfg.kind==='snipe' && reservations.zone);
      s.cooldown = Math.max(0, s.cooldown - dt*(coordinated?1.3:1));
      const desired = cfg.kind === 'snipe' ? 275 : (cfg.kind === 'devour' ? 195 : 225);
      const radial = dist > desired + 25 ? 1 : (dist < desired - 25 ? -1 : 0);
      const side = (e.angle || 0) < Math.PI ? 1 : -1;
      const orbit = cfg.kind === 'cut' ? .32 : (cfg.kind === 'snipe' ? .2 : .08);
      e.x += (dx / dist * radial - dy / dist * orbit * side) * speed * dt + (e.knockVelX || 0) * dt;
      e.y += (dy / dist * radial + dx / dist * orbit * side) * speed * dt + (e.knockVelY || 0) * dt;
      const view = st.threatView;
      const visible = !view || (e.x >= view.x + 20 && e.y >= view.y + 20
        && e.x <= view.x + view.width - 20 && e.y <= view.y + view.height - 20);
      const eligible = s.cooldown <= 0 && dist <= cfg.range && p.hp > 0 && visible;
      if (key === 'zone') s.zoneWait = eligible ? (s.zoneWait || 0) + dt : 0;
      const zoneTurn = key !== 'zone' || !reservations.nextZone || reservations.nextZone === e;
      if (!reservations[key] && eligible && zoneTurn) {
        reservations[key] = e; s.phase = 'windup'; s.elapsed = 0;
        s.zoneWait = 0;
        s.geometry = geometry(e, st, cfg.kind); s.spent = false; s.tick = 0;
        s.locked=false;s.weaveProgress=0;
      }
    } else {
      s.elapsed += attackDt;
      if(cfg.kind==='snipe' && s.phase==='windup' && !s.locked){
        aimSniper(e,st,s,cfg);
        // Última corrección a 180 ms del disparo; después el aviso NO sigue al jugador.
        if(s.elapsed>=cfg.windup-cfg.lockTime)s.locked=true;
      }
      if (cfg.kind === 'cut' && s.phase === 'windup') {
        const g=s.geometry;
        const approach=clamp(s.elapsed/cfg.approach,0,1);
        s.weaveProgress=clamp((s.elapsed-cfg.approach)/(cfg.windup-cfg.approach),0,1);
        if(s.elapsed<cfg.approach){
          // Desplazamiento real, visible y vulnerable hacia el primer punto.
          e.x=g.sourceX+(g.ax-g.sourceX)*approach;e.y=g.sourceY+(g.ay-g.sourceY)*approach;
          e.dimensionalFacing=Math.atan2(g.ay-g.sourceY,g.ax-g.sourceX);
        } else {
          e.x=g.ax+(g.bx-g.ax)*s.weaveProgress;e.y=g.ay+(g.by-g.ay)*s.weaveProgress;
          e.dimensionalFacing=Math.atan2(g.by-g.ay,g.bx-g.ax);
        }
      }
      if (s.phase === 'windup' && s.elapsed >= cfg.windup) {
        s.elapsed -= cfg.windup; s.phase = 'active'; e.atkFlash = .18;
        if (st.sfx && st.sfx.enemyAttack) st.sfx.enemyAttack(e.enemyTypeId, { x: e.x, worldWidth: st.W });
        // No barrer el movimiento anterior al instante de activación.
        s.lastX = p.x; s.lastY = p.y;
      }
      if (s.phase === 'active') {
        const g = s.geometry;
        let connects = false;
        if (cfg.kind === 'devour') {
          g.inner = g.outer - 8 - (g.outer - 16) * clamp(s.elapsed / cfg.active, 0, 1);
          s.tick = Math.max(0, s.tick - dt);
          const distance = Math.hypot(p.x - g.x, p.y - g.y), r = p.radius || 20;
          connects = s.tick <= 0 && distance + r >= g.inner && distance - r <= g.outer;
        } else {
          if (cfg.kind === 'cut') {
            s.tick=Math.max(0,s.tick-dt);
            connects=s.tick<=0 && NV.dimensionalLineHits(g,p.x,p.y,s.lastX,s.lastY,(p.radius||20)+g.halfWidth);
            // Tras coser se aparta por el borde, sin teleportar el ataque al jugador.
            const len=Math.max(1,Math.hypot(g.bx-g.ax,g.by-g.ay));
            const exit=clamp(s.elapsed/.45,0,1)*(g.halfWidth+e.radius+12);
            const point=arenaPoint(g.bx-(g.by-g.ay)/len*exit,g.by+(g.bx-g.ax)/len*exit,st,e.radius+8);
            e.x=point.x;e.y=point.y;
          } else if (!s.spent && cfg.kind === 'snipe') {
            // Tres agujas físicas: sólo el tramo recorrido este frame puede golpear.
            const t = clamp(s.elapsed / cfg.active, 0, 1);
            const previous = clamp((s.elapsed - attackDt) / cfg.active, 0, 1);
            connects = g.rays.some(ray => {
              const vx = ray.bx - ray.ax, vy = ray.by - ray.ay;
              return NV.dimensionalLineHits({ ax: ray.ax + vx * previous, ay: ray.ay + vy * previous,
                bx: ray.ax + vx * t, by: ray.ay + vy * t },
              p.x, p.y, s.lastX, s.lastY, (p.radius || 20) + 4);
            });
          }
        }
        if (connects) {
          const hit = st.applyPlayerDamage(e.damage * (cfg.kind === 'cut' ? cfg.damageMult : cfg.kind === 'devour' ? .55 : 1),
            { cause: 'dimensional-' + cfg.kind, enemy: e, allowCrit: false });
          // Cadencia limitada en áreas, un intento por salva. Respeta esquiva/invulnerabilidad.
          if (cfg.kind === 'devour') s.tick = .85;
          else if(cfg.kind==='cut')s.tick=cfg.damageInterval;
          else s.spent = true;
          killed = !!hit.killed;
        }
        if (s.elapsed >= cfg.active) {
          s.phase = 'recovery'; s.elapsed = 0; s.geometry = null;
        }
      } else if (s.phase === 'recovery' && s.elapsed >= cfg.recovery) {
        s.phase = 'position'; s.elapsed = 0; s.cooldown = cfg.cooldown;
      }
    }
    s.lastX = p.x; s.lastY = p.y;
    return killed;
  };
})();
