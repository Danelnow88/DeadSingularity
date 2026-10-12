// ===== ENGINE: proyectiles/balas (movimiento, colisiones con jugador/enemigos/jefe) =====
// updateBullets muta arrays por ref y devuelve { bullets, shake, hitstop, gameOver } porque esos
// son primitivos let en game.js. Los callbacks preservan las closures del monolito
// (computePlayerHit, killEnemy, applyKnockback, addFloatText, spawnExplosion, gameOver).
(() => {
  'use strict';
  const NV = window.NV;
  // Broad phase rebuilt after enemy movement. Reuse buckets and candidates;
  // keep original array order for shields, finite pierce and shotgun budgets.
  const collisionCells=new Map(),collisionBuckets=[],collisionCandidates=[];
  const CELL=96, byIndex=(a,b)=>a-b;
  let collisionMaxRadius=0;
  function cellKey(x,y){
    const a=x<0?-2*x-1:2*x,b=y<0?-2*y-1:2*y;
    return (a+b)*(a+b+1)/2+b;
  }
  function buildCollisionCells(enemies){
    collisionCells.clear();collisionMaxRadius=0;
    for(const bucket of collisionBuckets)bucket.length=0;
    let used=0;
    for(let i=0;i<enemies.length;i++){
      const e=enemies[i];
      if(!Number.isFinite(e.x)||!Number.isFinite(e.y)||!Number.isFinite(e.radius))return false;
      collisionMaxRadius=Math.max(collisionMaxRadius,e.radius);
      const key=cellKey(Math.floor(e.x/CELL),Math.floor(e.y/CELL));
      let bucket=collisionCells.get(key);
      if(!bucket){bucket=collisionBuckets[used]||(collisionBuckets[used]=[]);used++;collisionCells.set(key,bucket);}
      bucket.push(i);
    }
    return true;
  }
  function collisionQuery(b,oldX,oldY){
    const pad=collisionMaxRadius+(b.impactType==='sustain'?(b.splashRadius||18):4);
    const swept=b.impactType==='pellet';
    const x0=Math.floor(((swept?Math.min(oldX,b.x):b.x)-pad)/CELL);
    const x1=Math.floor(((swept?Math.max(oldX,b.x):b.x)+pad)/CELL);
    const y0=Math.floor(((swept?Math.min(oldY,b.y):b.y)-pad)/CELL);
    const y1=Math.floor(((swept?Math.max(oldY,b.y):b.y)+pad)/CELL);
    if(!Number.isFinite(x0+x1+y0+y1)||(x1-x0+1)*(y1-y0+1)>collisionCells.size*2)return null;
    collisionCandidates.length=0;
    for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
      const bucket=collisionCells.get(cellKey(x,y));
      if(bucket)for(let k=0;k<bucket.length;k++)collisionCandidates.push(bucket[k]);
    }
    collisionCandidates.sort(byIndex);
    return collisionCandidates;
  }

  function hasHitTarget(b, target) {
    return Array.isArray(b.hitTargets) && b.hitTargets.indexOf(target) !== -1;
  }

  function rememberHitTarget(b, target) {
    if (!Array.isArray(b.hitTargets)) b.hitTargets = [];
    if (b.hitTargets.indexOf(target) === -1) b.hitTargets.push(target);
  }

  function isTargetable(enemy) {
    return NV.isEnemyTargetable ? NV.isEnemyTargetable(enemy) : !!enemy && !enemy.dead;
  }

  function weaponDamageSource(b, mode) {
    if (!b || b.reflected || typeof b.wid !== 'string' || !b.wid) return null;
    return { kind: 'weapon', weaponId: b.wid, mode: mode || 'direct' };
  }

  // damageOverride: daño YA calculado para este impacto (ej. caída por ordinal de
  // rebote del Arco). Si falta, se usa b.damage intacto. Nunca se muta b.damage:
  // el proyectil conserva su daño original durante toda su vida.
  function applyPlayerBulletDamage(b, e, st, source, damageOverride) {
    const { addFloatText, killEnemy, applyKnockback } = st;
    if (NV.isEnemyDamageable && !NV.isEnemyDamageable(e)) return false;
    if (NV.isElitePredatorProjectileEvading && NV.isElitePredatorProjectileEvading(e)) return false;
    if (NV.tryElitePredatorProjectileEvade && NV.tryElitePredatorProjectileEvade(e, st.player, st.W, st.H)) return false;
    const baseNominal = Number.isFinite(damageOverride) ? damageOverride : b.damage;
    // El Francotirador tiene una tarea concreta dentro del arsenal: bajar elites.
    // El bonus es legible en su ficha y no afecta normales ni jefes.
    const nominal = b.wid === 'sniper' && e.isElite
      ? baseNominal * ((NV.BALANCE && NV.BALANCE.SNIPER_ELITE_DAMAGE_MULT) || 1.5)
      : baseNominal;
    const resisted = Math.max(1, nominal - (e.resist || 0));
    const snapProtected = b.guardProtectionSnapshot && b.guardProtectionSnapshot.has(e);
    const dealt = snapProtected ? resisted * 0.10 : (NV.guardProtectedDamage ? NV.guardProtectedDamage(e, resisted) : resisted);
    const hpBefore = NV.playtest && NV.playtest.enabled ? e.hp : 0;
    e.hp -= dealt;
    if (e.hp > 0 && NV.sfx && NV.sfx.impact) NV.sfx.impact('enemy', { x: e.x, worldWidth: st.W });
    if (NV.playtest && NV.playtest.enabled && !b.reflected && b.wid) {
      // El ordinal de rebote viaja en el propio proyectil; solo diagnóstico.
      NV.playtest.weaponEnemyHit(b.wid, source || 'direct', dealt, hpBefore, e.hp,
        (source === 'bounce' && Number.isFinite(b.bounceOrdinal)) ? b.bounceOrdinal : 0);
    }
    if (e.isElite) e.stun = 0.25;
    e.hitFlash = Math.max(e.hitFlash || 0, 0.10);
    var _hsCat = e.isElite ? "ELITE" : "NORMAL";
    var _hs = NV.hitSlowFor(_hsCat);
    if ((e.hitSlowImmunity || 0) <= 0 && (e.hitSlowUntil || 0) <= 0) { e.hitSlowUntil = _hs.activeDuration; e.hitSlowImmunity = _hs.activeDuration + _hs.immunity; }
    // Número de daño con código de color por intensidad (sin textos "CRITICAL!"):
    // normal blanco · sustancial cian · crítico rojo intenso con fuente mayor.
    const dfs = hitFloatStyle(dealt, !!b.crit);
    const damageText = NV.formatDamageText ? NV.formatDamageText(dealt) : String(Math.round(dealt * 100) / 100);
    if (damageText !== null) addFloatText(e.x, e.y - e.radius - 6, damageText, dfs.color, dfs.size, { damageValue: dealt });
    if (e.hp <= 0) killEnemy(e, weaponDamageSource(b, source));
    applyKnockback(e, b.x, b.y, b.knockback || 60);
    return true;
  }

  // Estilo del número de daño. Delegado en balance.js (NV.damageFloatStyle)
  // cuando está cargado; fallback mínimo para sandboxes que cargan bullets.js
  // aislado (p. ej. tests/boss_death_fix).
  function hitFloatStyle(dealt, crit) {
    if (NV.damageFloatStyle) return NV.damageFloatStyle(dealt, crit);
    return { color: crit ? '#FF2A4B' : '#FFFFFF', size: crit ? 17 : 13 };
  }

  // Arco: caída de daño ABSOLUTA por ordinal de rebote (1=primero, 2, 3).
  // Son multiplicadores relativos al b.damage ORIGINAL horneado al crear el
  // proyectil, NO acumulativos. El impacto primario nunca usa estos factores.
  const BOW_BOUNCE_FALLOFF = [0, 0.85, 0.70, 0.55];
  // Giro máximo por rebote. cos(120°) = -0.5: se compara producto punto normalizado.
  const BOW_MAX_TURN_DOT = -0.5;

  function bowBounceDamage(b, ordinal) {
    const base = b.damage;
    const mult = BOW_BOUNCE_FALLOFF[Math.max(0, Math.min(3, ordinal | 0))] || 1;
    return base * mult;
  }

  function findBounceTarget(from, enemies, b, inX, inY) {
    const radius = b.splashRadius || 180;
    const inLen = Math.hypot(inX, inY);
    let next = null, bestCos = -Infinity, bestDist = Infinity;
    for (const e of enemies) {
      if (!isTargetable(e) || hasHitTarget(b, e)) continue;
      const ox = e.x - from.x, oy = e.y - from.y;
      const d = Math.hypot(ox, oy);
      if (d > radius) continue;
      // Elegibilidad direccional: el objetivo debe estar dentro del arco de 120°
      // respecto a la dirección de llegada. Sin dirección válida no hay filtro.
      if (inLen > 1e-6) {
        if (d < 1e-6) continue;
        const cos = (inX * ox + inY * oy) / (inLen * d);
        if (cos < BOW_MAX_TURN_DOT - 1e-9) continue;
        // Política: mejor continuación angular; desempate por menor distancia;
        // desempate final por orden de iteración (determinista, sin azar).
        const betterAngle = cos > bestCos + 1e-12;
        const tiedAngle = cos > bestCos - 1e-12 && !betterAngle;
        if (betterAngle || (tiedAngle && d < bestDist)) {
          bestCos = betterAngle ? cos : bestCos;
          bestDist = d;
          next = e;
        }
      } else if (d < bestDist) {
        bestDist = d; next = e;
      }
    }
    return next;
  }

  function setupBowChain(b, firstTarget, enemies, inX, inY) {
    const targets = [];
    let from = firstTarget;
    let dirX = inX, dirY = inY;
    let remaining = b.bounceLeft;
    while (remaining > 0) {
      const next = findBounceTarget(from, enemies, b, dirX, dirY);
      if (!next) break;
      targets.push(next);
      rememberHitTarget(b, next);
      // La siguiente dirección de llegada es el segmento realmente recorrido.
      dirX = next.x - from.x; dirY = next.y - from.y;
      from = next;
      remaining--;
    }
    b.chainTargets = targets;
    b.chainIndex = 0;
    b.chainSpeed = 900;
    b.bounceOrdinal = 0;
    b.state = 'chain';
  }

  function segmentHitsCircle(x1, y1, x2, y2, cx, cy, radius) {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq <= 0.000001) return Math.hypot(cx - x2, cy - y2) < radius;
    const t = Math.max(0, Math.min(1, ((cx - x1) * dx + (cy - y1) * dy) / lenSq));
    return Math.hypot(cx - (x1 + dx * t), cy - (y1 + dy * t)) < radius;
  }

  // Los proyectiles de boss tienen siluetas deliberadamente grandes y brillantes.
  // La colision usa el nucleo peligroso, no el glow ni las puntas decorativas: asi
  // pasar apenas por debajo/al costado se siente justo. El segmento evita tunneling
  // en frames lentos sin agrandar ese nucleo.
  const HOSTILE_COLLISION_SCALE = Object.freeze({
    bossHeavyShell: 0.72,
    bossSpreadDisc: 0.72,
    bossChargedLance: 0.58,
    bossVolleyDart: 0.62,
    bossBomb: 0.68,
    bossOrb: 0.72,
    bossSplitShard: 0.62,
    bossRageCore: 0.68,
  });

  NV.hostileProjectileCollisionRadius = function (projectile) {
    const visualRadius = Math.max(1, Number(projectile && projectile.radius) || 5);
    const style = projectile && projectile.projectileStyle;
    const scale = HOSTILE_COLLISION_SCALE[style] || (projectile && projectile.sourceType === 'boss' ? 0.78 : 0.88);
    return visualRadius * scale;
  };

  NV.hostileProjectileHitsPlayer = function (projectile, oldX, oldY, player, characterSize, previousPlayer) {
    if (!projectile || !player) return false;
    // Hurtbox algo menor que el arte del personaje: los bordes luminosos y
    // accesorios siguen siendo visuales, no dano invisible.
    const playerRadius = Math.max(4, (Number(characterSize) || 20) * 0.38);
    const hitRadius = playerRadius + NV.hostileProjectileCollisionRadius(projectile);
    if(previousPlayer) return segmentHitsCircle(oldX-previousPlayer.x,oldY-previousPlayer.y,
      projectile.x-player.x,projectile.y-player.y,0,0,hitRadius);
    return segmentHitsCircle(oldX, oldY, projectile.x, projectile.y, player.x, player.y, hitRadius);
  };

  function shotgunCanDamage(b, target, isBoss) {
    const group = b.shotGroup;
    if (!group) return true;
    if (isBoss) {
      const cap = Math.max(1, group.bossCap || (NV.BALANCE && NV.BALANCE.SHOTGUN_BOSS_PELLET_CAP) || 8);
      if ((group.bossHits || 0) >= cap) return false;
      group.bossHits = (group.bossHits || 0) + 1;
      return true;
    }
    if (group.targets.indexOf(target) !== -1) return true;
    if (group.targets.length >= group.cap) return false;
    group.targets.push(target);
    return true;
  }

  function updateShotgunPelletVelocity(b, dt) {
    if (b.impactType !== 'pellet' || !Number.isFinite(b.shotgunBaseAngle)) return;
    const speed = b.shotgunSpeed || Math.hypot(b.vx, b.vy);
    const range = b.maxTravelDistance || 240;
    const bloomStart = Math.max(0, Math.min(range - 1, b.shotgunBloomStart || 90));
    const sampleDistance = Math.min(range, (b.traveledDistance || 0) + speed * Math.max(0, dt) * 0.5);
    const raw = Math.max(0, Math.min(1, (sampleDistance - bloomStart) / Math.max(1, range - bloomStart)));
    const bloom = 1 - (1 - raw) * (1 - raw);
    const compactHalf = (b.shotgunCompactSpread || 0.018) * 0.5;
    const maxHalf = (b.shotgunMaxSpread || 0.44) * 0.5;
    const offset = (b.shotgunSpreadFactor || 0) * (compactHalf + (maxHalf - compactHalf) * bloom);
    const angle = b.shotgunBaseAngle + offset;
    b.vx = Math.cos(angle) * speed;
    b.vy = Math.sin(angle) * speed;
    b.shotgunBloom = bloom;
  }

  function plasmaBossDamageMultiplier(b, st) {
    const multiplier = st && st.plasmaExperiment && b && b.wid === 'plasma'
      ? st.plasmaExperiment.bossDamageMultiplier : null;
    return Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
  }

  function explodeSplash(b, st, directTarget) {
    const radius = b.splashRadius || 0;
    if (radius <= 0) return;
    const { enemies, boss, spawnExplosion } = st;
    const plasmaTrial = b.wid === 'plasma' && st.plasmaExperiment;
    const splashDamage = target => {
      if(!plasmaTrial)return b.damage;
      const distance=Math.max(0,Math.hypot(target.x-b.x,target.y-b.y)-(target.radius||0));
      const fraction=Math.min(1,distance/radius);
      return b.damage*(plasmaTrial.splashCenterMultiplier+
        (plasmaTrial.splashEdgeMultiplier-plasmaTrial.splashCenterMultiplier)*fraction);
    };
    spawnExplosion(b.x, b.y, plasmaTrial ? 25 : 18, b.color, plasmaTrial ? 0.82 : 0.75);
    if (plasmaTrial && st.spawnShockwave) {
      st.spawnShockwave(b.x, b.y, {
        maxRadius: b.splashRadius || st.plasmaExperiment.blast.radius,
        color: st.plasmaExperiment.blast.color,
        innerColor: st.plasmaExperiment.blast.innerColor,
        width: st.plasmaExperiment.blast.width,
        style: 'plasmaTrial',
      });
    }
    for (const other of enemies) {
      if (!isTargetable(other) || hasHitTarget(b, other)) continue;
      if (Math.hypot(other.x - b.x, other.y - b.y) > radius + other.radius) continue;
      rememberHitTarget(b, other);
      applyPlayerBulletDamage(b, other, st, 'splash', splashDamage(other));
    }
    if (boss && boss !== directTarget && !boss.dead && Math.hypot(boss.x - b.x, boss.y - b.y) <= radius + boss.radius) {
      const bossDamage = splashDamage(boss) * plasmaBossDamageMultiplier(b, st);
      boss.hp -= bossDamage;
      if (NV.playtest && NV.playtest.enabled) NV.playtest.bossHit(b.wid, bossDamage, 'splash');
      boss.hitFlash = Math.max(boss.hitFlash, 0.10);
      NV.bossHitReaction(boss, bossDamage, st.addFloatText);
    }
  }

  NV.updateBullets = function (dt, st) {
    const { bullets, W, H, player, enemies, boss, CHARACTERS, SHIELD_COOLDOWN,
      applyPlayerDamage, addFloatText, killEnemy, applyKnockback, spawnExplosion } = st;
    let shake = st.shake || 0;
    let hitstop = st.hitstop || 0;
    let over = false;
    if (st.inertia && NV.InertiaChamber) NV.InertiaChamber.prepareShots(bullets,st.inertia);
    // Small scenes are cheaper as linear scans. After a hit, callbacks may move
    // or spawn entities: fall back for the rest of this update (no stale index).
    let collisionGridValid=bullets.length*enemies.length>=2048 && buildCollisionCells(enemies);

    for (const b of bullets) {
      if (b.dead) continue;
      if (!b.isEnemy && b.wid === 'bow' && b.state === 'chain' && b.chainTargets && b.chainIndex < b.chainTargets.length) {
        collisionGridValid=false;
        if (dt <= 0) {
          while (b.chainIndex < b.chainTargets.length) {
            const target = b.chainTargets[b.chainIndex++];
            if (!isTargetable(target)) continue;
            b.bounceOrdinal = b.chainIndex; // ordinal absoluto 1..3
            applyPlayerBulletDamage(b, target, st, 'bounce', bowBounceDamage(b, b.bounceOrdinal));
          }
          b.dead = true;
          continue;
        }
        const target = b.chainTargets[b.chainIndex];
        if (!isTargetable(target)) {
          b.chainIndex++;
          if (b.chainIndex >= b.chainTargets.length) b.dead = true;
          continue;
        }
        const dx = target.x - b.x, dy = target.y - b.y;
        const dist = Math.hypot(dx, dy);
        const speed = b.chainSpeed || 900;
        if (dist <= target.radius + 4) {
          b.bounceOrdinal = b.chainIndex + 1; // ordinal absoluto 1..3
          applyPlayerBulletDamage(b, target, st, 'bounce', bowBounceDamage(b, b.bounceOrdinal));
          b.chainIndex++;
          if (b.chainIndex >= b.chainTargets.length) b.dead = true;
        } else {
          const step = Math.min(dist, speed * dt);
          b.vx = dx / dist * speed;
          b.vy = dy / dist * speed;
          b.x += dx / dist * step;
          b.y += dy / dist * step;
        }
        continue;
      }

      updateShotgunPelletVelocity(b, dt);
      const oldX = b.x, oldY = b.y;
      // Inertia slows hostile shots to a crawl; it never freezes them in place.
      const bulletDt = b.isEnemy && st.inertia && st.inertia.held ? dt * .15 : dt;
      const cameraReady = !b.isEnemy || !NV.cameraThreatReady || NV.cameraThreatReady(b, dt,
        { x:oldX-5, y:oldY-5, w:10, h:10 }, .30);
      let travelStep = Math.hypot(b.vx, b.vy) * bulletDt;
      let expiresAfterStep = false;
      if (!b.isEnemy && b.maxTravelDistance > 0) {
        const remaining = Math.max(0, b.maxTravelDistance - (b.traveledDistance || 0));
        if (travelStep >= remaining) {
          const ratio = travelStep > 0 ? remaining / travelStep : 0;
          b.x += b.vx * bulletDt * ratio;
          b.y += b.vy * bulletDt * ratio;
          travelStep = remaining;
          expiresAfterStep = true;
        } else {
          b.x += b.vx * bulletDt;
          b.y += b.vy * bulletDt;
        }
        b.traveledDistance = (b.traveledDistance || 0) + travelStep;
      } else {
        b.x += b.vx * bulletDt;
        b.y += b.vy * bulletDt;
      }
      if (b.x < -10 || b.x > W + 10 || b.y < -10 || b.y > H + 10) {
        if (!b.isEnemy && b.impactType === 'splash') { collisionGridValid=false;explodeSplash(b, st); }
        b.dead = true;
        continue;
      }

      if (b.isEnemy) {
        const character = CHARACTERS[player.character] || {};
        if (cameraReady && !(st.inertia && b.inertiaReleaseGrace > 0) && NV.hostileProjectileHitsPlayer(b, oldX, oldY, player, character.size || 20, st.playerPrevious)) {
          collisionGridValid=false;
          if (player.bulwark > 0) {
            // Muralla: refleja la bala enemiga hacia el enemigo
            b.isEnemy = false;
            b.reflected = true;
            b.vx *= -1.1; b.vy *= -1.1;
            b.color = '#ffcf76';
            b.damage = 30; // +50% de reflejo con Muralla activa
            b.pierce = 1;
            if (NV.specialVisualEvent) NV.specialVisualEvent(player, 'reflect', b.x, b.y, Math.atan2(b.vy, b.vx));
            continue;
          }
          if (player.invuln <= 0) {
            b.dead = true;
            const hit = applyPlayerDamage(b.damage, { cause: 'projectile', projectile: b });
            if (hit.applied) {
              // F4: stun central (roll único + anti-stunlock). El stun NO es
              // invulnerabilidad: la puerta de arriba ya no exige stun <= 0,
              // así que el proyectil siempre daña (respetando invuln/armor).
              const stunRes = NV.tryApplyPlayerStun
                ? NV.tryApplyPlayerStun(player, b.stunDuration || (NV.BALANCE && NV.BALANCE.PLAYER_STUN_DEFAULT_DURATION) || 0.5, b.stunChance || 0, b, { addFloatText })
                : { applied: false };
              if (stunRes.applied) shake = Math.max(shake, 0.2);
              shake = Math.max(shake, hit.crit ? 0.3 : 0.1);
              if (hit.killed) { over = true; break; }
            }
          }
        }
      } else {
        // Penetración finita durante TODA la vida, no un presupuesto nuevo por frame.
        let hitCount = Array.isArray(b.hitTargets) ? b.hitTargets.length : 0;
        let candidates=collisionGridValid?collisionQuery(b,oldX,oldY):null,cursor=0,scanIndex=0;
        while(candidates?cursor<candidates.length:scanIndex<enemies.length){
          const enemyIndex=candidates?candidates[cursor++]:scanIndex++;
          const e=enemies[enemyIndex];
          if (!isTargetable(e)) continue;
          if (hasHitTarget(b, e)) continue;
          const dx = b.x-e.x, dy = b.y-e.y;
          const contactRadius = e.radius + (b.impactType === 'sustain' ? (b.splashRadius || 18) : 4);
          // Cheap exact broad phase before swept pellets; preserve original target order.
          if (b.impactType === 'pellet' &&
            (e.x < Math.min(oldX,b.x)-e.radius-3 || e.x > Math.max(oldX,b.x)+e.radius+3 ||
             e.y < Math.min(oldY,b.y)-e.radius-3 || e.y > Math.max(oldY,b.y)+e.radius+3)) continue;
          const collided = b.impactType === 'pellet'
            ? segmentHitsCircle(oldX, oldY, b.x, b.y, e.x, e.y, e.radius + 3)
            : dx*dx+dy*dy < contactRadius*contactRadius;
          if (collided) {
            collisionGridValid=false;candidates=null;scanIndex=enemyIndex+1;
            if (b.impactType === 'splash' && !b.guardProtectionSnapshot && NV.getGuardProtectionSource) {
              b.guardProtectionSnapshot = new Set();
              for (const candidate of enemies) {
                if (isTargetable(candidate) && NV.getGuardProtectionSource(candidate)) b.guardProtectionSnapshot.add(candidate);
              }
            }
            // ESCUDO (shielder): bloquea balas frontales solo cuando el escudo está listo.
            if (e.shield && b.wid !== 'laser') {
              if (e.shieldCd <= 0) {
                const facing = Math.atan2(player.y - e.y, player.x - e.x);
                const toBullet = Math.atan2(b.y - e.y, b.x - e.x);
                const diff = Math.abs(Math.atan2(Math.sin(toBullet - facing), Math.cos(toBullet - facing)));
                if (diff < Math.PI / 2) {
                  b.dead = true;
                  e.shieldCd = st.SHIELD_COOLDOWN; // queda recargando: vulnerable un instante
                  spawnExplosion(e.x + Math.cos(toBullet) * e.radius, e.y + Math.sin(toBullet) * e.radius, 4, e.color, 0.4);
                  break;
                }
              }
            }
            if (b.impactType === 'pellet' && !shotgunCanDamage(b, e)) continue;
            rememberHitTarget(b, e);
            applyPlayerBulletDamage(b, e, st, b.impactType === 'pellet' ? 'pellet' : 'direct');
            hitCount++;
            if (NV.playtest) NV.playtest.bulletHit(hitCount); // telemetría opt-in F08 (pierce/alineación)
            if (b.impactType === 'splash') explodeSplash(b, st);
            if (b.impactType === 'bounce' && b.bounceLeft > 0) {
              // La dirección de llegada es la del propio proyectil en el impacto.
              const inLen = Math.hypot(b.vx, b.vy);
              setupBowChain(b, e, enemies, b.vx, inLen > 1e-6 ? b.vy : 0);
              if (!b.chainTargets.length) b.dead = true;
              break;
            }
            // CONTRATO PIERCE (F04): `pierce` = TOTAL de objetivos dañables antes de morir
            // (primario + N penetraciones finitas). Alcanzado el límite la bala muere,
            // garantizando penetración finita y legible (p.ej. rifle 2 = primario + 1).
            if (b.pierce && hitCount >= b.pierce) { b.dead = true; break; }
          }
        }
        if (boss && !boss.dead && !b.dead) {
          const d = Math.hypot(b.x - boss.x, b.y - boss.y);
          const contactRadius = b.impactType === 'sustain' ? (b.splashRadius || 18) : 4;
          const bossCollision = b.impactType === 'pellet'
            ? segmentHitsCircle(oldX, oldY, b.x, b.y, boss.x, boss.y, boss.radius + 3)
            : d < boss.radius + contactRadius;
          const shotgunBossDamageAllowed = bossCollision && shotgunCanDamage(b, boss, true);
          if (shotgunBossDamageAllowed) {
            collisionGridValid=false;
            const bossDamage = (b.specialId ? b.damage * (b.bossDamageMult || 1) : b.damage) * plasmaBossDamageMultiplier(b, st);
            boss.hp -= bossDamage;
            if (NV.playtest && NV.playtest.enabled) NV.playtest.bossHit(b.specialId ? ('special:' + b.specialId) : b.wid, bossDamage, b.specialId ? 'special' : 'direct');
            boss.hitFlash = Math.max(boss.hitFlash, 0.10);
            var _bhs = NV.hitSlowFor("BOSS");
            var _bossHitstopAllowed = (boss.hitSlowImmunity || 0) <= 0;
            if (_bossHitstopAllowed && (boss.hitSlowUntil || 0) <= 0) { boss.hitSlowUntil = _bhs.activeDuration; boss.hitSlowImmunity = _bhs.activeDuration + _bhs.immunity; }
            if (b.impactType === 'splash') explodeSplash(b, st, boss);
            // HITSTOP con gate anti-spam: el freeze (juice) solo se rearma tras la
            // ventana de inmunidad del hitSlow (~0.35s). Rearmarlo en CADA bala
            // convertía el impacto en tirones constantes con armas rápidas
            // (0.03s × 15 disparos/s ≈ 45% de frames congelados contra el jefe).
            if (_bossHitstopAllowed) hitstop = 0.03;
            b.dead = true; NV.bossHitReaction(boss, bossDamage, addFloatText);
          } else if (bossCollision && b.impactType === 'pellet') {
            // Los perdigones que exceden el presupuesto igualmente chocan: no
            // atraviesan al jefe ni pueden reaparecer como impactos posteriores.
            b.dead = true;
          }
        }
      }
      if (expiresAfterStep && !b.dead) b.dead = true;
    }
    return { bullets: bullets.filter((b) => !b.dead), shake, hitstop, gameOver: over };
  };
})();
