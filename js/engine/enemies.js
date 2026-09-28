// ===== ENGINE: enemigos =====
// spawnEnemy/spawnElite empujan a `enemies` (por ref); killEnemy y updateEnemies devuelven
// los valores `let` que en game.js deben reasignarse (score, shake) y flags (gameOver).
// El resto de estado se muta por referencia (player, arrays) o via callbacks/closures.
(() => {
  'use strict';
  const NV = window.NV;

  function getDiffMult(kind) { return (typeof NV.difficultySafeMult === "function") ? NV.difficultySafeMult(kind, NV.runDifficulty) : 1; }

  function canSpawn(st, count, heavyCount) {
    if (NV.canSpawnHostileBatch) return NV.canSpawnHostileBatch(st, count, heavyCount);
    if (st.ignoreHostileBudget === true) return true;
    let heavy = 0;
    for (const e of st.enemies) if (!e.dead && (e.isElite || e.hostileClass === 'heavy')) heavy++;
    return st.enemies.filter((e) => !e.dead).length + count <= (st.MAX_HOSTILES || st.MAX_ENEMIES || 30)
      && heavy + (heavyCount || 0) <= (st.MAX_HEAVY_HOSTILES || 7);
  }
  function hostileClass(entity) {
    if (NV.hostileClassOf) return NV.hostileClassOf(entity);
    return entity && entity.isElite ? 'heavy' : ((entity && entity.hostileClass) || 'light');
  }

  function reportSpawnCandidate(st, candidate) {
    if (typeof st.onSpawnCandidate !== 'function') return;
    try { st.onSpawnCandidate(Object.freeze(candidate)); } catch (_) { /* hook futuro no altera spawn actual */ }
  }
  NV.describeEnemySpawnCandidate = function (type, x, y, isElite) {
    return { typeId: type && (type.id || type.visualId) || null, x, y, isElite: !!isElite };
  };

  // ---- F07 SPITTER: constantes de banda/telegraph/disparo ----
  // Banda espacial: lejos -> approach, en banda -> strafe, cerca -> retreat.
  // WINDUP real con snapshot + lead parcial topado; ATTACK = 1 disparo sin
  // homing; RECOVERY = ventana de castigo sin refire.

  // Lenguaje de proyectil hostil: SHAPE = familia que dispara (el COLOR lo
  // decide el efecto, en render). Presentacion pura, sin efecto de gameplay.
  const HOSTILE_RANGED_STYLES = Object.freeze({
    spitter: 'stunDroplet',
    specter_archer: 'spectralArrowhead',
    specter_core: 'coreSpike',
    specter_elite_void: 'voidStunNucleus',
  });

  // ---- SPECTER GRUNT: carga lineal legible y vulnerable ----
  const SPECTER_GRUNT_TRIGGER_RANGE = 320;
  const SPECTER_GRUNT_WINDUP = 0.45;
  const SPECTER_GRUNT_CHARGE_TIME = 0.75;
  const SPECTER_GRUNT_CHARGE_DISTANCE = 260;
  const SPECTER_GRUNT_CHARGE_SPEED_MULT = 4.0;
  const SPECTER_GRUNT_RECOVERY = 0.70;
  const SPECTER_GRUNT_COOLDOWN = 1.40;

  // ---- ELITE PREDATOR: cazador/ejecutor con evasiones limitadas ----
  const PREDATOR_STALK_RADIUS = 190;
  const PREDATOR_STALK_FALLBACK = 1.20;
  const PREDATOR_MARK_TIME = 0.35;
  const PREDATOR_HUNT_TIME = 1.20;
  const PREDATOR_HUNT_SPEED_MULT = 1.35;
  const PREDATOR_EXECUTION_TRIGGER_RANGE = 90;
  const PREDATOR_EXECUTION_WINDUP = 0.30;
  const PREDATOR_EXECUTION_RADIUS = 105;
  const PREDATOR_EXECUTION_ARC = Math.PI * 130 / 180;
  const PREDATOR_EXECUTION_ACTIVE_TIME = 0.14;
  const PREDATOR_EXECUTION_RECOVERY = 0.85;
  const PREDATOR_FAILED_HUNT_RECOVERY = 0.45;
  const PREDATOR_ATTACK_COOLDOWN = 2.30;
  const PREDATOR_INITIAL_ATTACK_DELAY = 0.65;
  const PREDATOR_EVADE_MAX_CHARGES = 2;
  const PREDATOR_EVADE_DURATION = 0.18;
  const PREDATOR_EVADE_DISTANCE = 75;
  const PREDATOR_EVADE_RECHARGE = 5.0;

  NV.ELITE_PREDATOR_HUNTER = Object.freeze({
    stalkRadius: PREDATOR_STALK_RADIUS,
    stalkFallback: PREDATOR_STALK_FALLBACK,
    markTime: PREDATOR_MARK_TIME,
    huntTime: PREDATOR_HUNT_TIME,
    huntSpeedMult: PREDATOR_HUNT_SPEED_MULT,
    executionTriggerRange: PREDATOR_EXECUTION_TRIGGER_RANGE,
    executionWindup: PREDATOR_EXECUTION_WINDUP,
    executionRadius: PREDATOR_EXECUTION_RADIUS,
    executionArc: PREDATOR_EXECUTION_ARC,
    executionActiveTime: PREDATOR_EXECUTION_ACTIVE_TIME,
    executionRecovery: PREDATOR_EXECUTION_RECOVERY,
    failedHuntRecovery: PREDATOR_FAILED_HUNT_RECOVERY,
    attackCooldown: PREDATOR_ATTACK_COOLDOWN,
    initialAttackDelay: PREDATOR_INITIAL_ATTACK_DELAY,
    evadeMaxCharges: PREDATOR_EVADE_MAX_CHARGES,
    evadeDuration: PREDATOR_EVADE_DURATION,
    evadeDistance: PREDATOR_EVADE_DISTANCE,
    evadeRecharge: PREDATOR_EVADE_RECHARGE,
  });

  // ---- ELITE GOLIATH: amenaza sísmica territorial, sin daño corporal ----
  const GOLIATH_SLAM_TRIGGER_RANGE = 130;
  const GOLIATH_SLAM_RADIUS = 145;
  const GOLIATH_SLAM_WINDUP = 0.35;
  const GOLIATH_AFTERSHOCK_DELAY = 1.50;
  const GOLIATH_AFTERSHOCK_RADIUS = 60;
  const GOLIATH_AFTERSHOCK_DAMAGE_MULT = 0.35;
  const GOLIATH_RECOVERY_TIME = 0.75;
  const GOLIATH_ATTACK_COOLDOWN = 1.50;
  const GOLIATH_INITIAL_ATTACK_DELAY = 0.75;
  const GOLIATH_HOLD_MIN = 118;
  const GOLIATH_HOLD_MAX = 138;
  const GOLIATH_RETREAT_RANGE = 108;
  const GOLIATH_RETREAT_SPEED_MULT = 0.35;
  const GOLIATH_IMPACT_VFX_TIME = 0.14;
  const GOLIATH_AFTERSHOCK_VFX_TIME = 0.18;

  // ---- ELITE PHANTOM: invasión / posesión no dañina ----
  const PHANTOM_ENTRY_RANGE = 210;
  const PHANTOM_ROAM_MIN = 150;
  const PHANTOM_ROAM_MAX = 205;
  const PHANTOM_MATERIALIZE_TIME = 0.25;
  const PHANTOM_WINDUP = 0.42;
  const PHANTOM_PREDICTION_TIME = 0.25;
  const PHANTOM_PREDICTION_MAX_LEAD = 40;
  const PHANTOM_COMMIT_TIME = 0.50;
  const PHANTOM_COMMIT_SPEED_MULT = 3.4;
  const PHANTOM_COMMIT_SPEED_CAP = 620;
  const PHANTOM_CAPTURE_PAD = 26;
  const PHANTOM_MISS_RECOVERY = 1.00;
  const PHANTOM_RETRY_COOLDOWN = 2.5;
  const PHANTOM_EXPEL_TIME = 0.35;
  const PHANTOM_RETURN_DISTANCE = 160;
  const PHANTOM_RETURN_MIN_DISTANCE = 110;
  const PHANTOM_RETURN_RECOVERY = 1.20;
  const PHANTOM_POST_COOLDOWN = 12.0;
  const PHANTOM_DRIFT_STRENGTH = 0.40;
  const PHANTOM_DRIFT_ANGULAR_SPEED = 0.55;
  const PHANTOM_DANGER_SCAN_INTERVAL = 1.0;
  const PHANTOM_DANGER_SCAN_RADIUS = 320;
  const PHANTOM_DANGER_MIN_DISTANCE = 60;
  const PHANTOM_DANGER_SWITCH_ANGLE = 0.6;
  const PHANTOM_DANGER_TURN_RATE = 1.6;

  NV.ELITE_PHANTOM_POSSESSION = Object.freeze({
    entryRange: PHANTOM_ENTRY_RANGE,
    roamMin: PHANTOM_ROAM_MIN,
    roamMax: PHANTOM_ROAM_MAX,
    materializeTime: PHANTOM_MATERIALIZE_TIME,
    windup: PHANTOM_WINDUP,
    predictionTime: PHANTOM_PREDICTION_TIME,
    predictionMaxLead: PHANTOM_PREDICTION_MAX_LEAD,
    commitTime: PHANTOM_COMMIT_TIME,
    commitSpeedMult: PHANTOM_COMMIT_SPEED_MULT,
    commitSpeedCap: PHANTOM_COMMIT_SPEED_CAP,
    capturePad: PHANTOM_CAPTURE_PAD,
    missRecovery: PHANTOM_MISS_RECOVERY,
    retryCooldown: PHANTOM_RETRY_COOLDOWN,
    expelTime: PHANTOM_EXPEL_TIME,
    returnDistance: PHANTOM_RETURN_DISTANCE,
    returnMinDistance: PHANTOM_RETURN_MIN_DISTANCE,
    returnRecovery: PHANTOM_RETURN_RECOVERY,
    postCooldown: PHANTOM_POST_COOLDOWN,
    driftStrength: PHANTOM_DRIFT_STRENGTH,
    driftAngularSpeed: PHANTOM_DRIFT_ANGULAR_SPEED,
    dangerScanInterval: PHANTOM_DANGER_SCAN_INTERVAL,
    dangerScanRadius: PHANTOM_DANGER_SCAN_RADIUS,
    dangerMinDistance: PHANTOM_DANGER_MIN_DISTANCE,
    dangerSwitchAngle: PHANTOM_DANGER_SWITCH_ANGLE,
    dangerTurnRate: PHANTOM_DANGER_TURN_RATE,
  });

  NV.ELITE_GOLIATH_SEISMIC = Object.freeze({
    triggerRange: GOLIATH_SLAM_TRIGGER_RANGE,
    slamRadius: GOLIATH_SLAM_RADIUS,
    windup: GOLIATH_SLAM_WINDUP,
    aftershockDelay: GOLIATH_AFTERSHOCK_DELAY,
    aftershockRadius: GOLIATH_AFTERSHOCK_RADIUS,
    aftershockDamageMult: GOLIATH_AFTERSHOCK_DAMAGE_MULT,
    recovery: GOLIATH_RECOVERY_TIME,
    attackCooldown: GOLIATH_ATTACK_COOLDOWN,
    initialAttackDelay: GOLIATH_INITIAL_ATTACK_DELAY,
    holdMin: GOLIATH_HOLD_MIN,
    holdMax: GOLIATH_HOLD_MAX,
    retreatRange: GOLIATH_RETREAT_RANGE,
    retreatSpeedMult: GOLIATH_RETREAT_SPEED_MULT,
    impactVfxTime: GOLIATH_IMPACT_VFX_TIME,
    aftershockVfxTime: GOLIATH_AFTERSHOCK_VFX_TIME,
  });

  // ---- SWARMLET: presión colectiva barata, sin asignación entre pares ----
  const MIN_SWARM_FOR_FORMATION = 3;
  const SWARM_LOCAL_RADIUS = 360;
  const SWARM_FORMATION_RADIUS = 150;
  const SWARM_FORMATION_TIME = 0.80;
  const SWARM_READY_TIME = 0.22;
  const SWARM_COMMIT_DURATION = 0.45;
  const SWARM_COMMIT_SPEED_MULT = 1.65;
  const SWARM_REGROUP_TIME = 0.65;
  const SWARM_REGROUP_SPEED_MULT = 0.75;

  // ---- WISP: fase breve con amenaza posicional diferida ----
  const WISP_ATTACK_TRIGGER_RANGE = 300;
  const WISP_ATTACK_COOLDOWN = 2.60;
  const WISP_INITIAL_ATTACK_DELAY = 0.75;
  const WISP_PHASE_OUT_TIME = 0.30;
  const WISP_MARK_TIME = 0.48;
  const WISP_PULSE_FLASH_TIME = 0.12;
  const WISP_PULSE_RADIUS = 68;
  const WISP_RECOVERY_TIME = 0.55;

  // ---- SPECTER CORE: control de zona persistente con snapshot tardío ----
  const CORE_ZONE_TRIGGER_RANGE = 340;
  const CORE_ZONE_WINDUP = 0.55;
  const CORE_ZONE_ARM_TIME = 0.50;
  const CORE_ZONE_RADIUS = 84;
  const CORE_ZONE_ACTIVE_TIME = 2.10;
  const CORE_ZONE_TICK_INTERVAL = 0.50;
  const CORE_ZONE_DAMAGE_MULT = 0.50;
  const CORE_MAX_ACTIVE_ZONES_PER_OWNER = 1;
  const CORE_MAX_ACTIVE_ZONES_GLOBAL = 4;
  const CORE_ZONE_COOLDOWN = 2.50;
  const CORE_INITIAL_ATTACK_DELAY = 0.80;
  const ARCHER_CORE_SYNERGY_RADIUS = 420;

  NV.SPECTER_CORE_ZONE = Object.freeze({
    triggerRange: CORE_ZONE_TRIGGER_RANGE,
    windup: CORE_ZONE_WINDUP,
    armTime: CORE_ZONE_ARM_TIME,
    radius: CORE_ZONE_RADIUS,
    activeTime: CORE_ZONE_ACTIVE_TIME,
    tickInterval: CORE_ZONE_TICK_INTERVAL,
    damageMult: CORE_ZONE_DAMAGE_MULT,
    maxPerOwner: CORE_MAX_ACTIVE_ZONES_PER_OWNER,
    maxGlobal: CORE_MAX_ACTIVE_ZONES_GLOBAL,
    cooldown: CORE_ZONE_COOLDOWN,
    initialAttackDelay: CORE_INITIAL_ATTACK_DELAY,
  });
  NV.ARCHER_CORE_SYNERGY = Object.freeze({ radius: ARCHER_CORE_SYNERGY_RADIUS });

  let coreZoneOwnerSerial = 0;

  function clampCoreZoneTarget(value, arenaSize) {
    const safeSize = Number.isFinite(arenaSize) ? arenaSize : CORE_ZONE_RADIUS * 2;
    const margin = Math.min(CORE_ZONE_RADIUS, safeSize * 0.5);
    return Math.max(margin, Math.min(Math.max(margin, safeSize - margin), Number.isFinite(value) ? value : margin));
  }

  function hookPullVector(source, player) {
    if (!source || !player) return null;
    const dx = source.x - player.x;
    const dy = source.y - player.y;
    const length = Math.hypot(dx, dy);
    if (!(length > 0.000001)) return null;
    return { x: dx / length, y: dy / length };
  }

  function isElitePredator(e) {
    return !!e && e.isElite === true && e.visualId === 'elite_predator';
  }

  function isEliteGoliath(e) {
    return !!e && e.isElite === true && e.visualId === 'elite_titan';
  }

  function isElitePhantom(e) {
    return !!e && e.isElite === true && e.visualId === 'elite_phantom';
  }

  NV.isEnemyCombatActive = function (enemy) {
    return !!enemy && !enemy.dead && !enemy.killResolved && !enemy.waveCleanup && enemy.phantomCombatInactive !== true;
  };

  NV.isEnemyTargetable = function (enemy) {
    return NV.isEnemyCombatActive(enemy) && enemy.wispPhaseTargetable !== false && enemy.phantomStalkPhased !== true;
  };

  NV.isEnemyDamageable = function (enemy) {
    return NV.isEnemyTargetable(enemy) && enemy.phantomDamageable !== false;
  };

  NV.phantomPossessionDuration = function (wave, waveEvent) {
    const duration = typeof NV.waveDuration === 'function' ? NV.waveDuration(wave, waveEvent) : 25;
    return Math.max(6, Math.min(9, duration * 0.28));
  };

  function initElitePhantom(e) {
    if (!isElitePhantom(e) || e.phantomState) return;
    e.phantomState = 'roam_stalk';
    e.phantomStateTimer = 0;
    e.phantomCooldown = 0;
    e.phantomDirX = 0;
    e.phantomDirY = 0;
    e.phantomEntryAngle = 0;
    e.phantomPossessionElapsed = 0;
    e.phantomPossessionDuration = 0;
    e.phantomReturnX = e.x;
    e.phantomReturnY = e.y;
    e.phantomOrbitSide = Math.sin((e.x || 0) * 0.017 + (e.y || 0) * 0.013) >= 0 ? 1 : -1;
    e.phantomCombatInactive = false;
    e.phantomDamageable = true;
    e.phantomStalkPhased = true;
  }

  function normalizeAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }

  function phantomDangerWeight(enemy) {
    const cls = hostileClass(enemy);
    let weight = cls === 'heavy' ? 3.0 : (cls === 'medium' ? 1.5 : 1.0);
    const id = enemy.enemyTypeId || enemy.id || enemy.visualId;
    if (id === 'spitter' || id === 'specter_elite_void' || id === 'elite_specter_void' || id === 'specter_archer') weight *= 1.5;
    return weight;
  }

  function isPhantomDangerCandidate(owner, enemy, player) {
    if (!enemy || enemy === owner || enemy.isBoss || enemy.boss || !NV.isEnemyCombatActive(enemy)) return false;
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const distanceSq = dx * dx + dy * dy;
    return distanceSq >= PHANTOM_DANGER_MIN_DISTANCE * PHANTOM_DANGER_MIN_DISTANCE
      && distanceSq <= PHANTOM_DANGER_SCAN_RADIUS * PHANTOM_DANGER_SCAN_RADIUS;
  }

  function scanPhantomDanger(possession, enemies, player) {
    let best = null;
    let bestScore = -Infinity;
    let bestAngle = possession.forceAngle;
    for (let i = 0; i < enemies.length; i++) {
      const candidate = enemies[i];
      if (!isPhantomDangerCandidate(possession.owner, candidate, player)) continue;
      const dx = candidate.x - player.x;
      const dy = candidate.y - player.y;
      const distance = Math.hypot(dx, dy);
      const proximity = Math.max(0.15, Math.min(1, 1 - distance / PHANTOM_DANGER_SCAN_RADIUS));
      const score = phantomDangerWeight(candidate) * proximity;
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
        bestAngle = Math.atan2(dy, dx);
      }
    }
    const current = possession.dangerAnchor;
    if (current && isPhantomDangerCandidate(possession.owner, current, player) && best && best !== current) {
      const currentAngle = Math.atan2(current.y - player.y, current.x - player.x);
      if (Math.abs(normalizeAngle(bestAngle - currentAngle)) <= PHANTOM_DANGER_SWITCH_ANGLE) best = current;
    }
    possession.dangerAnchor = best;
    possession.dangerActive = !!best;
  }

  function updatePhantomForceAngle(possession, enemies, player, dt) {
    possession.dangerScanTimer = Math.max(0, (possession.dangerScanTimer || 0) - dt);
    if (possession.dangerScanTimer <= 1e-9) {
      scanPhantomDanger(possession, enemies, player);
      possession.dangerScanTimer = PHANTOM_DANGER_SCAN_INTERVAL;
      possession.dangerScanCount = (possession.dangerScanCount || 0) + 1;
    }
    const anchor = possession.dangerAnchor;
    if (anchor && isPhantomDangerCandidate(possession.owner, anchor, player)) {
      possession.dangerActive = true;
      const targetAngle = Math.atan2(anchor.y - player.y, anchor.x - player.x);
      const delta = normalizeAngle(targetAngle - possession.forceAngle);
      const maxTurn = PHANTOM_DANGER_TURN_RATE * dt;
      possession.forceAngle = normalizeAngle(possession.forceAngle + Math.max(-maxTurn, Math.min(maxTurn, delta)));
    } else {
      possession.dangerAnchor = null;
      possession.dangerActive = false;
      possession.forceAngle = normalizeAngle(possession.forceAngle + PHANTOM_DRIFT_ANGULAR_SPEED * dt);
    }
  }

  function clearPhantomPossession(player, owner, removeOwner) {
    if (player && player.phantomPossession && (!owner || player.phantomPossession.owner === owner)) {
      player.phantomPossession.active = false;
      player.phantomPossession = null;
    }
    if (!owner) return;
    owner.phantomCombatInactive = !!removeOwner;
    owner.phantomDamageable = !removeOwner;
    owner.phantomPossessionElapsed = 0;
    owner.phantomPossessionDuration = 0;
    if (removeOwner) owner.phantomState = 'cleanup';
  }

  NV.clearPhantomPossession = function (player, removeOwner) {
    const possession = player && player.phantomPossession;
    const owner = possession && possession.owner;
    clearPhantomPossession(player, owner, removeOwner !== false);
    return owner || null;
  };

  function phantomReturnPoint(e, player, W, H, angle) {
    const margin = (e.radius || 16) + 24;
    const candidates = [angle + Math.PI, angle + Math.PI * 1.5, angle + Math.PI * 0.5];
    let best = null;
    for (let i = 0; i < candidates.length; i++) {
      const a = candidates[i];
      const x = Math.max(margin, Math.min(Math.max(margin, W - margin), player.x + Math.cos(a) * PHANTOM_RETURN_DISTANCE));
      const y = Math.max(margin, Math.min(Math.max(margin, H - margin), player.y + Math.sin(a) * PHANTOM_RETURN_DISTANCE));
      const distance = Math.hypot(x - player.x, y - player.y);
      const candidate = { x, y, distance };
      if (!best || candidate.distance > best.distance) best = candidate;
      if (i === 0 && distance >= PHANTOM_RETURN_MIN_DISTANCE) break;
    }
    return best || { x: e.x, y: e.y, distance: 0 };
  }

  function beginPhantomPossession(e, st) {
    const duration = NV.phantomPossessionDuration(st.wave, st.waveEvent);
    e.phantomState = 'possessed';
    e.phantomStateTimer = duration;
    e.phantomPossessionElapsed = 0;
    e.phantomPossessionDuration = duration;
    e.phantomEntryStartX = e.x;
    e.phantomEntryStartY = e.y;
    e.phantomCombatInactive = true;
    e.phantomDamageable = false;
    e.stun = 0;
    e.knockVelX = 0;
    e.knockVelY = 0;
    st.player.phantomPossession = {
      active: true,
      owner: e,
      elapsed: 0,
      duration,
      entryAngle: e.phantomEntryAngle,
      forceAngle: e.phantomEntryAngle,
      dangerAnchor: null,
      dangerActive: false,
      dangerScanTimer: 0,
      dangerScanCount: 0,
      transition: PHANTOM_EXPEL_TIME,
    };
  }

  function initEliteGoliath(e) {
    if (!isEliteGoliath(e) || e.goliathState) return;
    e.goliathState = 'approach';
    e.goliathStateTimer = 0;
    e.goliathAttackCooldown = GOLIATH_INITIAL_ATTACK_DELAY;
    e.goliathImpactSpent = false;
    e.goliathAftershockSpent = false;
    e.goliathImpactVfxTimer = 0;
    e.goliathAftershockVfxTimer = 0;
    e.goliathImpactX = e.x;
    e.goliathImpactY = e.y;
  }

  function clampPredatorCoordinate(value, radius, size) {
    const margin = Math.max(0, Number.isFinite(radius) ? radius : 0);
    const limit = Math.max(margin, (Number.isFinite(size) ? size : margin * 2) - margin);
    return Math.max(margin, Math.min(limit, value));
  }

  function segmentHitsCircle(x1, y1, x2, y2, cx, cy, radius) {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq <= 0.000001) return Math.hypot(cx - x2, cy - y2) < radius;
    const t = Math.max(0, Math.min(1, ((cx - x1) * dx + (cy - y1) * dy) / lenSq));
    return Math.hypot(cx - (x1 + dx * t), cy - (y1 + dy * t)) < radius;
  }

  function initElitePredator(e) {
    if (!isElitePredator(e) || e.predatorState) return;
    e.predatorState = 'stalk';
    e.predatorStateTimer = 0;
    e.predatorAttackCooldown = PREDATOR_INITIAL_ATTACK_DELAY;
    e.predatorFlankSide = e.predatorFlankSide === -1 ? -1 : 1;
    e.predatorStalkTimer = 0;
    e.predatorExecutionFacing = 0;
    e.predatorExecutionSpent = false;
    e.predatorExecutionImpactTimer = 0;
    e.predatorExecutionImpactX = e.x;
    e.predatorExecutionImpactY = e.y;
    e.predatorEvadeCharges = PREDATOR_EVADE_MAX_CHARGES;
    e.predatorEvadeRechargeTimer = 0;
    e.predatorEvadeSide = e.predatorFlankSide;
    e.predatorEvadeStartX = e.x;
    e.predatorEvadeStartY = e.y;
    e.predatorEvadeTargetX = e.x;
    e.predatorEvadeTargetY = e.y;
    e.predatorEvadeReturnState = 'stalk';
    e.predatorEvadeReturnTimer = 0;
  }

  NV.isElitePredatorProjectileEvading = function (e) {
    return isElitePredator(e) && e.predatorState === 'evade' && (e.predatorStateTimer || 0) > 1e-9;
  };

  NV.tryElitePredatorProjectileEvade = function (e, player, W, H) {
    if (!isElitePredator(e) || e.dead || e.killResolved) return false;
    initElitePredator(e);
    if (e.predatorEvadeCharges <= 0 || (e.predatorState !== 'stalk' && e.predatorState !== 'mark' && e.predatorState !== 'hunt')) return false;
    const dx = e.x - (player && Number.isFinite(player.x) ? player.x : e.x - 1);
    const dy = e.y - (player && Number.isFinite(player.y) ? player.y : e.y);
    const dist = Math.max(1, Math.hypot(dx, dy));
    const side = e.predatorEvadeSide === -1 ? -1 : 1;
    const lateralX = -dy / dist * side;
    const lateralY = dx / dist * side;
    e.predatorEvadeStartX = e.x;
    e.predatorEvadeStartY = e.y;
    e.predatorEvadeTargetX = clampPredatorCoordinate(e.x + lateralX * PREDATOR_EVADE_DISTANCE, e.radius, W);
    e.predatorEvadeTargetY = clampPredatorCoordinate(e.y + lateralY * PREDATOR_EVADE_DISTANCE, e.radius, H);
    e.predatorEvadeSide = -side;
    e.predatorEvadeCharges--;
    if (e.predatorEvadeRechargeTimer <= 1e-9) e.predatorEvadeRechargeTimer = PREDATOR_EVADE_RECHARGE;
    e.predatorEvadeReturnState = e.predatorState;
    e.predatorEvadeReturnTimer = e.predatorStateTimer || 0;
    e.predatorState = 'evade';
    e.predatorStateTimer = PREDATOR_EVADE_DURATION;
    return true;
  };

  NV.predictHookPullDestination = function (source, player, W, H) {
    const direction = hookPullVector(source, player);
    const distance = NV.BALANCE.HOOK_PULL_EXTERNAL_SPEED * NV.BALANCE.HOOK_PULL_DURATION;
    const x = player && Number.isFinite(player.x) ? player.x : 0;
    const y = player && Number.isFinite(player.y) ? player.y : 0;
    return {
      x: clampCoreZoneTarget(x + (direction ? direction.x * distance : 0), W),
      y: clampCoreZoneTarget(y + (direction ? direction.y * distance : 0), H),
    };
  };

  function requestArcherCoreSynergy(source, player, enemies, hazards, W, H) {
    if (!source || !player || !enemies || !hazards) return null;
    let nearest = null;
    let nearestDistSq = ARCHER_CORE_SYNERGY_RADIUS * ARCHER_CORE_SYNERGY_RADIUS;
    for (const candidate of enemies) {
      if (!candidate || candidate.dead || candidate.killResolved || candidate.waveCleanup
          || candidate.enemyTypeId !== 'specter_core') continue;
      if (candidate.coreZoneState !== 'positioning' || (candidate.coreZoneCooldown || 0) > 0) continue;
      if (!candidate.coreZoneOwnerId || typeof NV.canSpawnCoreZone !== 'function'
          || !NV.canSpawnCoreZone(hazards, candidate.coreZoneOwnerId)) continue;
      const dx = candidate.x - source.x;
      const dy = candidate.y - source.y;
      const distSq = dx * dx + dy * dy;
      if (distSq <= nearestDistSq) {
        nearest = candidate;
        nearestDistSq = distSq;
      }
    }
    if (!nearest) return null;
    const target = NV.predictHookPullDestination(source, player, W, H);
    nearest.coreZoneTargetX = target.x;
    nearest.coreZoneTargetY = target.y;
    nearest.coreZoneForcedTarget = true;
    nearest.coreZoneState = 'windup';
    nearest.coreZoneTimer = CORE_ZONE_WINDUP;
    return nearest;
  }

  NV.requestArcherCoreSynergy = requestArcherCoreSynergy;

  NV.WISP_PHASE_ATTACK = Object.freeze({
    triggerRange: WISP_ATTACK_TRIGGER_RANGE,
    cooldown: WISP_ATTACK_COOLDOWN,
    initialAttackDelay: WISP_INITIAL_ATTACK_DELAY,
    phaseOutTime: WISP_PHASE_OUT_TIME,
    markTime: WISP_MARK_TIME,
    pulseFlashTime: WISP_PULSE_FLASH_TIME,
    pulseRadius: WISP_PULSE_RADIUS,
    recoveryTime: WISP_RECOVERY_TIME,
  });

  function wispInitialDelay(enemy) {
    // Offset estable de spawn para que varios Wisps creados juntos no sincronicen
    // necesariamente su primer mark. No cambia el cooldown de producción posterior.
    const band = Math.abs(Math.floor((enemy.y || 0) / 24)) % 4;
    return WISP_INITIAL_ATTACK_DELAY + band * 0.08;
  }

  function clampWispDestination(value, arenaSize) {
    const safeSize = Number.isFinite(arenaSize) ? arenaSize : WISP_PULSE_RADIUS * 2;
    const min = Math.min(WISP_PULSE_RADIUS, safeSize * 0.5);
    return Math.max(min, Math.min(Math.max(min, safeSize - min), value));
  }

  // ---- SPECTER GUARD: protector/bodyguard periódico y no acumulable ----
  const GUARD_SEARCH_RADIUS = 280;
  const GUARD_RETARGET_INTERVAL = 0.50;
  const GUARD_ESCORT_DISTANCE = 42;
  const GUARD_ESCORT_DEADZONE = 4;
  const GUARD_ESCORT_SPEED_MULT = 1.40;
  const GUARD_PROTECTION_RADIUS = 90;
  const GUARD_ENCOUNTER_RADIUS = 420;
  const GUARD_DAMAGE_REDUCTION = 0.90;
  const guardProtectionSources = new WeakMap();
  const guardLiveFrames = new WeakMap();
  let guardFrame = 0;

  NV.SPECTER_GUARD_PROTECTOR = Object.freeze({
    searchRadius: GUARD_SEARCH_RADIUS,
    retargetInterval: GUARD_RETARGET_INTERVAL,
    escortDistance: GUARD_ESCORT_DISTANCE,
    escortDeadzone: GUARD_ESCORT_DEADZONE,
    escortSpeedMult: GUARD_ESCORT_SPEED_MULT,
    protectionRadius: GUARD_PROTECTION_RADIUS,
    encounterRadius: GUARD_ENCOUNTER_RADIUS,
    damageReduction: GUARD_DAMAGE_REDUCTION,
  });

  function guardTargetPriority(candidate) {
    if (candidate.enemyTypeId === 'specter_guard') return 0;
    if (candidate.behavior === 'ranged' || (candidate.stunChance || 0) > 0) return 3;
    if (candidate.isElite || candidate.hostileClass === 'heavy' || candidate.hostileClass === 'medium'
        || (candidate.enemyTypeId && candidate.enemyTypeId.indexOf('specter_') === 0)) return 2;
    return 1;
  }

  function isLiveGuardTarget(guard, target) {
    return !!target && target !== guard && NV.isEnemyCombatActive(target)
      && guardLiveFrames.get(target) === guardFrame;
  }

  function guardCanProtect(guard, target) {
    if (!guard || guard.dead || guard.killResolved || guard.waveCleanup || guard.enemyTypeId !== 'specter_guard') return false;
    if (!isLiveGuardTarget(guard, target) || guard.guardTarget !== target) return false;
    const targetDx = target.x - guard.x, targetDy = target.y - guard.y;
    if (targetDx * targetDx + targetDy * targetDy > GUARD_PROTECTION_RADIUS * GUARD_PROTECTION_RADIUS) return false;
    const player = guard.guardEncounterPlayer;
    if (!player) return false;
    const playerDx = player.x - guard.x, playerDy = player.y - guard.y;
    return playerDx * playerDx + playerDy * playerDy <= GUARD_ENCOUNTER_RADIUS * GUARD_ENCOUNTER_RADIUS;
  }

  function claimGuardProtection(guard, target) {
    guard.guardProtectionActive = false;
    if (!guardCanProtect(guard, target)) return false;
    const existing = guardProtectionSources.get(target);
    if (existing && existing.frame === guardFrame && guardCanProtect(existing.guard, target)) return false;
    guardProtectionSources.set(target, { guard, frame: guardFrame });
    guard.guardProtectionActive = true;
    return true;
  }

  NV.getGuardProtectionSource = function (target) {
    if (!NV.isEnemyCombatActive(target)) return null;
    const record = guardProtectionSources.get(target);
    if (!record || record.frame !== guardFrame || !guardCanProtect(record.guard, target)) return null;
    return record.guard;
  };

  NV.guardProtectedDamage = function (target, damage) {
    if (!Number.isFinite(damage)) return 0;
    return NV.getGuardProtectionSource(target) ? damage * (1 - GUARD_DAMAGE_REDUCTION) : damage;
  };

  // ---- Selección ponderada: tipos con 'weight' usan ese valor; el resto defaulta a 1.0 ----
  // Si ningún tipo disponible define weight, la selección es equivalente a uniforme.
  NV.weightedRandom = function (items) {
    if (!items || !items.length) return null;
    let total = 0;
    const weights = [];
    for (let i = 0; i < items.length; i++) {
      const w = typeof items[i].weight === 'number' ? items[i].weight : 1.0;
      weights.push(w);
      total += w;
    }
    if (total <= 0) return items[0];
    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  };

  function resolveSpawnPosition(st, options) {
    const explicit = options && options.position;
    if (explicit && Number.isFinite(explicit.x) && Number.isFinite(explicit.y)) {
      return { x: explicit.x, y: explicit.y };
    }
    return {
      x: Math.random() < 0.5 ? 0 : st.W,
      y: 80 + Math.random() * (st.H - 200),
    };
  }

  function normalHitboxRadius(type) {
    let radius = type.radius;
    if (type.id && NV.LAB_SPECTER_IDS && NV.labModelHitboxFactor) {
      const modelIndex = NV.LAB_SPECTER_IDS[type.id];
      if (modelIndex !== undefined) radius = type.radius * NV.labModelHitboxFactor(modelIndex, type.id);
    }
    return radius;
  }

  function eliteHitboxRadius(type) {
    let radius = type.radius;
    const key = type.id || type.visualId;
    if (key && NV.LAB_SPECTER_IDS && NV.labModelHitboxFactor) {
      const modelIndex = NV.LAB_SPECTER_IDS[key];
      if (modelIndex !== undefined) radius = type.radius * NV.labModelHitboxFactor(modelIndex);
    }
    return radius;
  }

  NV.productionEnemySpawnRadius = function (descriptor) {
    if (!descriptor || !descriptor.definition) return 0;
    return descriptor.spawnKind === 'elite'
      ? eliteHitboxRadius(descriptor.definition)
      : normalHitboxRadius(descriptor.definition);
  };

  function constructNormalEnemy(st, type, position) {
    const hostileClass = type.hostileClass || 'light';
    const hpScale = NV.enemyHpScale(st.wave);
    const dmgScale = Math.min(60, Math.round(st.wave * 1.5));
    const hp = Math.round(type.hp * hpScale * 0.85 * getDiffMult('hp') * (NV.roleHpMult ? NV.roleHpMult(type.id) : 1));
    const entity = {
      x: position.x, y: position.y,
      hp, maxHp: hp,
      speed: type.speed + Math.min(40, st.wave * 1.5),
      radius: normalHitboxRadius(type), color: type.color, shape: type.shape,
      enemyTypeId: type.id,
      hostileClass,
      movementClass: type.movementClass || (NV.enemyMovementClass ? NV.enemyMovementClass(type) : ((type.behavior === 'kami' || type.speed >= 150) ? 'fast' : (type.speed <= 70 ? 'slow' : 'normal'))),
      score: type.score * (1 + st.wave * 0.1), xp: type.xp * (1 + st.wave * 0.1),
      dead: false, behavior: type.behavior,
      angle: Math.random() * Math.PI * 2, erraticTimer: 0,
      knockbackRes: type.knockbackRes || 0, knockVelX: 0, knockVelY: 0,
      damage: ((type.damage || 10) + dmgScale) * 0.80 * getDiffMult('dmg') * (NV.roleDmgMult ? NV.roleDmgMult(type.id) : 1),
      shield: type.shield || false, shieldCd: 0, resist: type.resist || 0,
      hitFlash: 0, hitSlowUntil: 0, hitSlowImmunity: 0,
      erraticTargetAngle: Math.random() * Math.PI * 2,
      shootTimer: 0, stunChance: type.stunChance || 0, stunDuration: type.stunDuration || 0,
      coreZoneOwnerId: type.id === 'specter_core' ? ++coreZoneOwnerSerial : 0,
    };
    reportSpawnCandidate(st, NV.describeEnemySpawnCandidate(type, position.x, position.y, false));
    st.enemies.push(entity);
    if (type.id && type.id.indexOf('specter_') === 0) console.log('[SPAWN] wave=' + st.wave + ' type=' + type.id);
    return entity;
  }

  function constructEliteEnemy(st, type, position) {
    const eliteDmg = type.damage + Math.min(80, Math.round(st.wave * 2));
    const scaledEliteDamage = eliteDmg * 0.80 * getDiffMult('dmg');
    const hp = Math.round((type.hp + st.wave * st.wave * 1.5) * 0.85 * getDiffMult('hp'));
    const entity = {
      x: position.x, y: position.y,
      hp, maxHp: hp,
      speed: type.speed + st.wave,
      radius: eliteHitboxRadius(type), color: type.color, shape: type.shape,
      score: type.score, xp: type.xp, dead: false,
      behavior: type.behavior, angle: Math.random() * Math.PI * 2,
      hostileClass: 'heavy',
      movementClass: type.movementClass || (NV.enemyMovementClass ? NV.enemyMovementClass(type) : ((type.behavior === 'kami' || type.speed >= 150) ? 'fast' : (type.speed <= 70 ? 'slow' : 'normal'))),
      erraticTimer: 0, isElite: true, damage: scaledEliteDamage, eliteDamage: scaledEliteDamage,
      hitFlash: 0, hitSlowUntil: 0, hitSlowImmunity: 0,
      erraticTargetAngle: Math.random() * Math.PI * 2,
      knockbackRes: 0.3, knockVelX: 0, knockVelY: 0, shootTimer: 0,
      stunChance: type.stunChance || 0, stunDuration: type.stunDuration || 0, resist: type.resist || 0,
    };
    if (type.id) entity.enemyTypeId = type.id;
    if (type.visualId) entity.visualId = type.visualId;
    reportSpawnCandidate(st, NV.describeEnemySpawnCandidate(type, position.x, position.y, true));
    st.enemies.push(entity);
    if (type.spectralElite && type.id && type.id.indexOf('specter_') === 0) console.log('[SPAWN] wave=' + st.wave + ' type=' + type.id);
    return entity;
  }

  NV.spawnProductionEnemy = function (st, enemyId, options) {
    const descriptor = NV.getProductionEnemyDefinition ? NV.getProductionEnemyDefinition(enemyId) : null;
    if (!descriptor) return { ok: false, code: 'UNKNOWN_ENEMY_ID', enemyId };
    if (st.boss && !st.boss.dead) return { ok: false, code: 'BOSS_ACTIVE', enemyId };
    const heavyCount = descriptor.hostileClass === 'heavy' ? 1 : 0;
    if (!canSpawn(st, 1, heavyCount)) return { ok: false, code: 'HOSTILE_BUDGET', enemyId };
    const position = resolveSpawnPosition(st, options);
    const entity = descriptor.spawnKind === 'elite'
      ? constructEliteEnemy(st, descriptor.definition, position)
      : constructNormalEnemy(st, descriptor.definition, position);
    return { ok: true, entity, descriptor };
  };

  // ---- Spawn normal ----
  NV.spawnEnemy = function (st) {
    if (!canSpawn(st, 1, 0)) return false;
    if (st.boss && !st.boss.dead) return;

    const spectersEnabled = NV.SPECTER_ENABLED !== false;
    const enabledTypes = spectersEnabled
      ? st.ENEMY_TYPES
      : st.ENEMY_TYPES.filter((t) => t.shape !== 'specter');

    let type;
    const forcedType = st.forceTypeId && enabledTypes.find((t) => t.id === st.forceTypeId);
    if (forcedType) {
      // Force spawn: buscar el tipo específico (ignora minWave para testing/debug).
      type = forcedType;
    } else {
      // Pool por oleada: cada tipo tiene su minWave. Los umbrales reproducen el
      // desbloqueo escalonado original (slice por índice); kamikaze entra desde la 10.
      // F1 composición: los roles tácticos ganan peso con la oleada (techo 2.0),
      // con UNA sola llamada a Math.random (misma firma que weightedRandom).
      const available = enabledTypes.filter((t) => (t.minWave || 1) <= st.wave);
      const boost = (typeof NV.tacticalWeightBoost === 'function') ? NV.tacticalWeightBoost(st.wave) : 1;
      const tactical = NV.TACTICAL_ENEMY_IDS || {};
      // F3 presencia: el specter_archer (única fuente del Hook) pesa 0.12 en datos,
      // ~8x menos que el resto de roles tácticos (1.0); su peso EFECTIVO sube desde
      // HOOK_UNLOCK_WAVE para que el Hook sea observable. Solo composición: no toca
      // stats, minWave, fuerza total ni el número de hostiles (soft target intacto).
      const presence = (typeof NV.hookSourcePresenceMult === 'function') ? NV.hookSourcePresenceMult(st.wave) : 1;
      const effWeight = (t) => {
        const base = (typeof t.weight === 'number') ? t.weight : 1.0;
        const hookPresence = (t.id === 'specter_archer' && presence > 1) ? presence : 1;
        return base * hookPresence * (tactical[t.id] ? boost : 1);
      };
      let total = 0;
      for (const t of available) total += effWeight(t);
      let r = Math.random() * total;
      type = available[available.length - 1];
      for (const t of available) { r -= effWeight(t); if (r <= 0) { type = t; break; } }
    }
    if (!type) return;
    const hostileClass = type.hostileClass || 'light';
    if (!canSpawn(st, 1, hostileClass === 'heavy' ? 1 : 0)) return false;

    const position = resolveSpawnPosition(st);
    constructNormalEnemy(st, type, position);
    return true;
  };

  // ---- Spawn élite (cada 2 oleadas, desde la 3) ----
  NV.spawnElite = function (st) {
    if (st.wave < 3) return;
    if (st.wave % 2 === 0) return;
    if (st.boss && !st.boss.dead) return; // no élites durante un jefe
    // Élites base = ciclo original intacto. Espectrales = minWave + weight.
    const baseElites = st.ELITE_TYPES.filter((t) => !t.spectralElite);
    const spectralElites = st.ELITE_TYPES.filter((t) => t.spectralElite && (t.minWave || 1) <= st.wave);
    // Evento LLUVIA DE ÉLITES: 1 élite extra (3 en vez de 2) en cada spawn.
    const count = st.waveEvent === 'elites' ? 3 : 2;
    const startIndex = baseElites.length ? ((st.wave / 2 - 1) * 2) % baseElites.length : 0;
    for (let i = 0; i < count; i++) {
      if (!canSpawn(st, 1, 1)) break;
      let elite = baseElites.length ? baseElites[(startIndex + i) % baseElites.length] : null;
      // Chance rara de reemplazar por un élite espectral disponible (suma de weights).
      if (spectralElites.length) {
        const spectralWeight = spectralElites.reduce((s, se) => s + (typeof se.weight === 'number' ? se.weight : 0), 0);
        if (spectralWeight > 0 && Math.random() < Math.min(0.5, spectralWeight)) {
          elite = NV.weightedRandom(spectralElites) || elite;
        }
      }
      if (!elite) {
        // Sin élites base disponibles: cae al espectral disponible o se salta.
        elite = NV.weightedRandom(spectralElites);
        if (!elite) continue;
      }
      const position = resolveSpawnPosition(st);
      constructEliteEnemy(st, elite, position);
    }
  };

  // ---- Derribo (muta player/weaponLevels/weaponKills por ref; devuelve nuevo score) ----
  // Estilo del número de daño. Delegado en balance.js (NV.damageFloatStyle)
  // cuando está cargado; fallback mínimo para sandboxes aislados.
  function hitFloatStyle(dealt, crit) {
    if (NV.damageFloatStyle) return NV.damageFloatStyle(dealt, crit);
    return { color: crit ? '#FF2A4B' : '#FFFFFF', size: crit ? 17 : 13 };
  }
  NV.killEnemy = function (st) {
    const e = st.e;
    if (e && e.phantomCombatInactive) return st.score;
    if (e.killResolved || e.waveCleanup) return st.score;
    e.killResolved = true;
    e.dead = true;
    let score = st.score + e.score;
    st.player.xp += e.xp;
    st.addFloatText(e.x, e.y, '+' + Math.round(e.score), e.isElite ? '#ff0' : '#ffcf76');
    while (st.player.xp >= st.player.xpToNext) {
      st.player.xp -= st.player.xpToNext;
      st.player.level++;
      st.player.xpToNext = Math.floor(st.player.xpToNext * 1.5);
      st.player.maxHp += 10;
      st.player.hp = Math.min(st.player.hp + 20, st.player.maxHp);
      st.addFloatText(st.player.x, st.player.y - 50, 'LEVEL UP!', '#ff0');
      (st.sfx.playerLevelUp || st.sfx.levelup)();
      st.triggerFlash('#ff0');
    }
    // El arma equipada gana XP por derribos y sube de nivel.
    const wid = st.currentWeapon.id;
    const curLevel = st.weaponLevels[wid] || 1;
    st.weaponKills[wid] = (st.weaponKills[wid] || 0) + st.weaponKillProgress();
    // Tope duro de nivel de arma (WEAPON_MAX_LEVEL): Nv100 = pico de poder.
    // Sin texto flotante de subida: el nivel se lee en el HUD (badge del slot).
    if (curLevel < (NV.BALANCE.WEAPON_MAX_LEVEL || 100) && st.weaponKills[wid] >= st.WEAPON_KILLS_PER_LEVEL * curLevel) {
      st.weaponLevels[wid] = curLevel + 1;
      (st.sfx.fuse || st.sfx.levelup)(curLevel + 1);
    }
    st.spawnExplosion(e.x, e.y, 8, e.color, 0.3);
    if (e.isElite) {
      // El élite garantiza shards de mayor valor: matarlo es una decisión económica.
      st.pickups.push({ x: e.x, y: e.y, type: 'shard', value: 3, dead: false });
    } else if (Math.random() < 0.15 + st.player.luck * 0.01 + (st.player.permGreed || 0) * NV.BALANCE.GREED_PERM_DROP) {
      st.pickups.push({ x: e.x, y: e.y, type: 'shard', dead: false });
    }
    // Consumible RECOMPENSA: +1 shard y score doble por derribo durante su duración.
    if (st.player.bounty > 0) {
      score += e.score; // doble (ya sumamos el base arriba)
      st.pickups.push({ x: e.x, y: e.y, type: 'shard', value: 1, dead: false });
      st.addFloatText(e.x, e.y - 20, '+1 SHD BONUS', '#ffd700');
    }
    // Evento DÍA DE PAGO: cada derribo suelta además un shard extra de valor 2.
    if (st.waveEvent === 'payday') {
      st.pickups.push({ x: e.x + 6, y: e.y + 6, type: 'shard', value: 2, dead: false });
    }
    // KAMIKAZE: siempre detona al morir (por disparo o por autodetonacion).
    if (e.behavior === 'kami') {
      st.spawnExplosion(e.x, e.y, 34, '#ff5f3d', 1.1);
      if (!e.kamikazeDamageApplied && st.applyPlayerDamage && Math.hypot(e.x - st.player.x, e.y - st.player.y) < 95) {
        e.kamikazeDamageApplied = true;
        const hit = st.applyPlayerDamage(24, { cause: 'kamikaze-explosion', enemy: e, allowCrit: false, allowDodge: false });
        if (hit && hit.killed && st.onPlayerKilled) st.onPlayerKilled(hit);
      }
    }
    if (st.sfx.enemyDeath) st.sfx.enemyDeath(e.isElite ? 'elite' : 'normal', { x: e.x, worldWidth: st.W || 900 });
    else st.sfx.explosion(e.isElite ? 'elite' : 'normal', { x: e.x, worldWidth: st.W || 900 });
    return score;
  };

  // ---- Combo de kills (E1): encadena derribos con <2s entre ellos ----
  // combo = { count, timer } (estado en game.js). Devuelve bonus a aplicar.
  NV.comboOnKill = function (combo) {
    combo.count = combo.timer > 0 ? combo.count + 1 : 1;
    combo.timer = 2;
    const milestone = combo.count % 5 === 0; // cada 5: +1 shard
    return { count: combo.count, bonusScore: Math.min(50, 2 * combo.count), gemBonus: milestone ? 1 : 0, milestone };
  };

  NV.comboTick = function (combo, dt) {
    if (combo.timer > 0) { combo.timer -= dt; if (combo.timer < 0) { combo.timer = 0; combo.count = 0; } }
    return combo;
  };

  // ---- Consumibles: bomba de vacío y congelante ----
  NV.voidBomb = function (enemies, boss, onKill) {
    for (const e of enemies) {
      if (!NV.isEnemyDamageable(e)) continue;
      const isElite = !!(e.isElite || (e.hostileClass === 'heavy'));
      const dmg = isElite ? Math.round(e.maxHp * NV.BALANCE.VOID_BOMB_ELITE_DAMAGE_MULT) : e.maxHp;
      e.hp = Math.max(0, e.hp - dmg);
      if (e.hp <= 0 && onKill) onKill(e);
    }
    if (boss && !boss.dead) {
      boss.hp = Math.max(0, boss.hp - Math.round(boss.maxHp * NV.BALANCE.VOID_BOMB_BOSS_DAMAGE_MULT));
    }
  };
  NV.freezeEnemies = function (enemies, duration) {
    for (const e of enemies) { if (NV.isEnemyDamageable(e)) e.slowUntil = duration; }
  };

  // #11: sincronía mecánica/VFX de la bomba. El impacto se aplica al CRUZAR el
  // umbral de detonación (mismo lifetime y BOMB_IMPACT_T que el renderer), sin
  // setTimeout: avanza con el dt del game loop y se ejecuta exactamente una vez.
  NV.bombImpactDelay = function () {
    // Fuente neutral: js/data/consumables.js (funciona sin el renderer cargado).
    const defs = NV.CONSUMABLE_FX_LIFETIMES || {};
    const life = NV.BOMB_FX_LIFETIME != null ? NV.BOMB_FX_LIFETIME : (defs.bomb || 0);
    return life * (NV.BOMB_IMPACT_T != null ? NV.BOMB_IMPACT_T : 0);
  };
  NV.createBombImpact = function (enemies, boss, killEnemy) {
    return { enemies, boss, killEnemy, elapsed: 0, applied: false };
  };
  NV.tickBombImpacts = function (queue, dt) {
    if (!queue || !queue.length) return [];
    const delay = NV.bombImpactDelay();
    const remaining = [];
    for (const imp of queue) {
      if (!imp || imp.applied) continue; // impacto único: consumido no se re-ejecuta
      imp.elapsed += dt;
      if (imp.elapsed >= delay) { // cruce de umbral: no depende de acertar un frame exacto
        imp.applied = true;
        NV.voidBomb(imp.enemies, imp.boss, imp.killEnemy);
      } else {
        remaining.push(imp);
      }
    }
    return remaining;
  };

  // ----- Cuadrícula espacial (spatial hash) para vecinos cercanos -----
  // Reemplaza los loops O(n²) de separación entre enemigos (común, swarm, ranged)
  // por un barrido de celdas adyacentes: O(n) amortizado. Preserva los radios de
  // búsqueda y las fórmulas de empuje EXACTAS, solo cambia la forma de hallar
  // vecinos. CELL_SIZE fijo >= máximo radio de separación (GOLIATH 36*2+6=78).
  const SEP_CELL = 96;
  function gridCellX(x) { return Math.floor(x / SEP_CELL); }
  function gridCellY(y) { return Math.floor(y / SEP_CELL); }
  function buildSpatialGrid(enemies) {
    const grid = new Map();
    for (let i = 0; i < enemies.length; i++) {
      const it = enemies[i];
      if (!NV.isEnemyCombatActive(it) || it.phantomStalkPhased === true) continue;
      const cx = gridCellX(it.x), cy = gridCellY(it.y);
      const key = cx + ',' + cy;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(it);
    }
    return grid;
  }
  // Llama cb(otro) para cada enemigo vivo en celdas adyacentes a e (dx,dy en {-1,0,1}).
  // Como SEP_CELL >= radio de separación, 3x3 celdas siempre cubren el vecindario.
  function forEachGridNeighbor(e, grid, cb) {
    const cx = gridCellX(e.x), cy = gridCellY(e.y);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const cell = grid.get((cx + dx) + ',' + (cy + dy));
        if (!cell) continue;
        for (let k = 0; k < cell.length; k++) {
          const other = cell[k];
          if (other !== e) cb(other);
        }
      }
    }
  }

  function forEachGridNeighborRadius(e, grid, radius, cb) {
    const cx = gridCellX(e.x), cy = gridCellY(e.y);
    const cells = Math.ceil(radius / SEP_CELL);
    for (let dx = -cells; dx <= cells; dx++) {
      for (let dy = -cells; dy <= cells; dy++) {
        const cell = grid.get((cx + dx) + ',' + (cy + dy));
        if (!cell) continue;
        for (let k = 0; k < cell.length; k++) {
          const other = cell[k];
          if (other !== e) cb(other);
        }
      }
    }
  }

  function findGuardTarget(guard, grid) {
    let best = null;
    let bestPriority = -1;
    let bestDistanceSq = Infinity;
    const radiusSq = GUARD_SEARCH_RADIUS * GUARD_SEARCH_RADIUS;
    forEachGridNeighborRadius(guard, grid, GUARD_SEARCH_RADIUS, (candidate) => {
      if (!isLiveGuardTarget(guard, candidate)) return;
      const dx = candidate.x - guard.x, dy = candidate.y - guard.y;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq > radiusSq) return;
      const priority = guardTargetPriority(candidate);
      if (priority > bestPriority || (priority === bestPriority && distanceSq < bestDistanceSq)) {
        best = candidate;
        bestPriority = priority;
        bestDistanceSq = distanceSq;
      }
    });
    return best;
  }

  // ---- Fusión de enemigos: misma especie que se tocan se fusionan en uno más fuerte ----
  // fusionLevel: 0 = normal, 1+ = fusionado (más HP, daño, tamaño). Indicador visual en render.
  const FUSION_MIN = 3;       // enemigos mínimos para fusionar
  const FUSION_RADIUS = 40;   // distancia para considerarse "juntos"
  // ---- SPITTER (F07): banda de rango y tiempos ----
  // too far -> approach · en banda -> strafe/reposición · too close -> retreat.
  // WINDUP real (cero spawn, aim snapshot legible) -> ATTACK (1 disparo de la
  // familia existente, lead parcial topado, sin homing) -> RECOVERY real (sin
  // refire). Strafe persistente para evitar jitter izquierda/derecha.
  const SPIT_FAR = 320;
  const SPIT_NEAR = 180;
  const SPIT_BAND_MID = 250;
  const SPIT_WINDUP = 0.6;
  const SPIT_RECOVERY = 1.0;
  const SPIT_CYCLE = 1.6;
  const SPIT_BULLET_SPEED = 250;
  const SPIT_LEAD_FACTOR = 0.5;
  const SPIT_LEAD_CAP = 60;
  const SPIT_STRAFE_HOLD = 1.6;
  function enemyFusionKey(e) {
    // "Especie" estable: los espectrales usan enemyTypeId; los legacy caen a
    // visualId/shape/behavior para NO fusionar cualquier enemigo undefined con otro.
    return e.enemyTypeId || e.visualId || ((e.shape || 'enemy') + '|' + (e.behavior || 'chase') + '|' + (e.isElite ? 'elite' : 'normal'));
  }
  function fuseEnemies(enemies, st) {
    const grid = buildSpatialGrid(enemies);
    const fused = new Set();
    for (const e of enemies) {
      if (!NV.isEnemyCombatActive(e) || fused.has(e)) continue;
      const key = enemyFusionKey(e);
      // Buscar mismos de su especie cercanos (excluye él mismo).
      const sameType = [];
      forEachGridNeighbor(e, grid, (other) => {
        if (!NV.isEnemyCombatActive(other) || fused.has(other) || other === e) return;
        if (enemyFusionKey(other) !== key) return;
        if (Math.hypot(other.x - e.x, other.y - e.y) < FUSION_RADIUS) sameType.push(other);
      });
      if (sameType.length + 1 < FUSION_MIN) continue; // +1 por e mismo
      // Fusionar: e es el "anfitrión", los demás mueren y le transfieren poder.
      const group = [e, ...sameType];
      let totalHp = 0, totalMaxHp = 0, totalDmg = 0, cx = 0, cy = 0, maxLevel = e.fusionLevel || 0;
      for (const g of group) {
        totalHp += g.hp;
        totalMaxHp += g.maxHp;
        totalDmg += g.damage;
        cx += g.x; cy += g.y;
        maxLevel = Math.max(maxLevel, g.fusionLevel || 0);
        if (g !== e) { g.dead = true; fused.add(g); }
      }
      const n = group.length;
      e.x = cx / n; e.y = cy / n; // centróide del grupo
      e.hp = totalHp;
      e.maxHp = totalMaxHp;
      e.damage = Math.round(totalDmg * (1 + 0.15 * (n - 1))); // +15% por cada fusión extra
      e.radius = Math.min(60, e.radius * (1 + 0.18 * (n - 1))); // crece con tope
      e.fusionLevel = maxLevel + 1;
      // La fusión conserva su renderer, pero su clasificación mecánica puede escalar.
      // Extrema (nivel 3+ o radio 45+) consume heavy sólo si queda presupuesto; de
      // lo contrario permanece medium para no violar el cap autoritativo.
      if (hostileClass(e) !== 'heavy') {
        const extreme = e.fusionLevel >= 3 || e.radius >= 45;
        e.hostileClass = extreme && canSpawn(st, 0, 1) ? 'heavy' : 'medium';
      }
      e.color = fusionColor(e.fusionLevel);
      e.fusionFlash = 0.9;
      if (st && st.addFloatText) st.addFloatText(e.x, e.y - e.radius - 16, 'FUSION ' + e.fusionLevel, e.color);
      if (st && st.spawnExplosion) st.spawnExplosion(e.x, e.y, Math.max(18, e.radius * 0.8), e.color, 0.55);
      fused.add(e);
    }
  }
  function fusionColor(level) {
    // Progresión visual: normal → amarillo → naranja → rojo → blanco (fusión extrema).
    return ['#d8f6ff', '#ffe04a', '#ff9a24', '#ff3a24', '#ffffff'][Math.min(level, 4)];
  }
    // ===== F3: Hook/Pull system (specter_archer only, wave >= 15) =====
  // El hookSystem es GLOBAL (game-owned, creado en game.js via NV.createHookSystem).
  // Fases: idle -> windup -> projectile -> tether -> idle (+ lockoutTimer).
  // La reservacion del source se hace en el loop principal (ver bloque 'ranged');
  // esta funcion ejecuta la state machine y el tick de cooldowns enemigos.
  // El pull del jugador se aplica en game.js (after dash+movement, before arena clamp).

  // Reinicia el hookSystem al estado idle con lockout global y cooldown del source.
  // Usado por: projectile miss, tether expiration, source death, invalid source,
  // distance > max, player death, wave_end, shop_enter, gameover, restart.
  NV.resetHookState = function (hookSystem) {
    if (!hookSystem) return hookSystem;
    const src = hookSystem.srcEnemy;
    if (src) {
      src.hookOwner = false;
      src.hookWindup = false;
      src.hookCooldown = NV.hookCooldownForDifficulty(NV.runDifficulty);
    }
    hookSystem.phase = 'idle';
    hookSystem.windupTimer = 0;
    hookSystem.tetherTimer = 0;
    hookSystem.projectile = null;
    hookSystem.tether = null;
    hookSystem.srcEnemy = null;
    hookSystem.lockoutTimer = NV.BALANCE.HOOK_GLOBAL_LOCKOUT_POST_RELEASE;
    return hookSystem;
  };

  // Rompe el tether forzadamente (dash del jugador, player death).
  // Aplica cooldown source + lockout global. Limpia flags del source.
  NV.breakHookTether = function (hookSystem) {
    if (!hookSystem || hookSystem.phase !== 'tether') return false;
    const src = hookSystem.srcEnemy;
    if (src) {
      src.hookOwner = false;
      src.hookWindup = false;
      src.hookCooldown = NV.hookCooldownForDifficulty(NV.runDifficulty);
    }
    hookSystem.phase = 'idle';
    hookSystem.tetherTimer = 0;
    hookSystem.projectile = null;
    hookSystem.tether = null;
    hookSystem.srcEnemy = null;
    hookSystem.lockoutTimer = NV.BALANCE.HOOK_GLOBAL_LOCKOUT_POST_RELEASE;
    return true;
  };

  // State machine del Hook. Tick de lockout, cooldown enemigo-local, y fases.
  // Called AFTER the main enemy loop (movement/contact resolved) so the pull
  // direction uses the latest source/player positions.
  NV.updateHookSystem = function (dt, hookSystem, enemies, player, context) {
    if (!hookSystem) return;
    const B = NV.BALANCE;

    // 1. Tick lockout global (post-release / post-break)
    if (hookSystem.lockoutTimer > 0) {
      hookSystem.lockoutTimer -= dt;
      if (hookSystem.lockoutTimer < 0) hookSystem.lockoutTimer = 0;
    }

    // 2. Tick enemy-local cooldowns (solo specter_archer)
    for (const e of enemies) {
      if (e.dead) continue;
      if (e.enemyTypeId === 'specter_archer' && (e.hookCooldown || 0) > 0) {
        e.hookCooldown -= dt;
        if (e.hookCooldown < 0) e.hookCooldown = 0;
      }
    }

    const src = hookSystem.srcEnemy;

    // 3. Validar source en fases activas (muerte / fusion / removal del source)
    if (hookSystem.phase === 'windup' || hookSystem.phase === 'projectile' || hookSystem.phase === 'tether') {
      if (!src || src.dead || src.enemyTypeId !== 'specter_archer') {
        NV.resetHookState(hookSystem);
        return;
      }
    }

    // 4. State machine
    if (hookSystem.phase === 'windup') {
      hookSystem.windupTimer -= dt;
      if (hookSystem.windupTimer <= 0) {
        // Lanzar projectile: SNAPSHOT del jugador al FINAL del windup
        hookSystem.windupTimer = 0;
        if (src) {
          const pdx = player.x - src.x, pdy = player.y - src.y;
          const dist = Math.hypot(pdx, pdy);
          const invD = Math.max(dist, 1);
          const spd = B.HOOK_PROJECTILE_SPEED;
          hookSystem.projectile = {
            x: src.x, y: src.y,
            vx: pdx / invD * spd, vy: pdy / invD * spd,
            dist: 0,
          };
        }
        if (src) src.hookWindup = false;
        hookSystem.phase = 'projectile';
      }
    } else if (hookSystem.phase === 'projectile') {
      const p = hookSystem.projectile;
      if (!p) { NV.resetHookState(hookSystem); return; }
      const mx = p.vx * dt, my = p.vy * dt;
      p.x += mx; p.y += my;
      p.dist += Math.hypot(mx, my);

      // max range: miss
      if (p.dist >= B.HOOK_PROJECTILE_MAX_RANGE) {
        NV.resetHookState(hookSystem);
        return;
      }
      // hit: distancia al jugador < radio
      const d = Math.hypot(p.x - player.x, p.y - player.y);
      if (d < (player.radius || 20)) {
        // Hit: crear tether (snapshot posicion del source)
        hookSystem.tether = { srcX: src.x, srcY: src.y };
        hookSystem.tetherTimer = B.HOOK_PULL_DURATION;
        hookSystem.projectile = null;
        hookSystem.phase = 'tether';
        const synergyContext = context || {};
        requestArcherCoreSynergy(src, player, enemies, synergyContext.hazards,
          synergyContext.W, synergyContext.H);
      }
    } else if (hookSystem.phase === 'tether') {
      hookSystem.tetherTimer -= dt;
      if (hookSystem.tetherTimer <= 0) {
        NV.resetHookState(hookSystem); // expiracion
      } else if (src) {
        const d = Math.hypot(player.x - src.x, player.y - src.y);
        if (d > B.HOOK_TETHER_MAX_RANGE) {
          NV.resetHookState(hookSystem); // break distance > tether max
        }
      }
    }
  };

  // Player-side Hook update (testeable). Orden contractual: dash update ->
  // normal movement -> Hook external pull -> arena clamp (el clamp lo hace
  // game.js). wasDashing = player.dashActive ANTES del dash update de este
  // frame. Dash press-edge durante tether: break inmediato, sin pull ese
  // frame (aplica cooldown source + lockout global). Pull externo directo
  // sobre player.x/y: NO muta moveVx/moveVy, NO toca movement.js.
  // Retorna true si aplico pull este frame.
  NV.applyHookPull = function (dt, hookSystem, player, wasDashing) {
    if (!hookSystem || !player) return false;
    if (hookSystem.phase === 'tether' && !wasDashing && player.dashActive) {
      NV.breakHookTether(hookSystem);
      return false;
    }
    if (hookSystem.phase !== 'tether' || !hookSystem.srcEnemy || player.dashActive) return false;
    const direction = hookPullVector(hookSystem.srcEnemy, player);
    if (!direction) return false;
    const pullSpd = NV.BALANCE.HOOK_PULL_EXTERNAL_SPEED;
    player.x += direction.x * pullSpd * dt;
    player.y += direction.y * pullSpd * dt;
    return true;
  };

  // ---- Update de todos los enemigos (comportamientos, daño al jugador) ----
  // Devuelve { enemies, shake, gameOver }. Mutaciones de array/player por ref; los
  // primitivos let (enemies filtrado, shake) y el flag gameOver vuelven del retorno.
  NV.updateEnemies = function (dt, st) {
    // Cleanup nunca entra en AI, contacto, hook ni fusión, incluso si un caller
    // invoca el motor fuera de playing. Conserva los mismos objetos visuales.
    if (st.enemies.some((e) => e.waveCleanup)) {
      if (st.player && st.player.phantomPossession) NV.clearPhantomPossession(st.player, true);
      for (let i = 0; i < st.enemies.length; i++) {
        const member = st.enemies[i];
        if (member.enemyTypeId === 'specter_guard' && member.waveCleanup) {
          member.guardTarget = null;
          member.guardProtectionActive = false;
          member.guardEncounterPlayer = null;
          member.guardState = 'find';
          member.guardRetargetTimer = 0;
        }
      }
      const active = st.enemies.filter((e) => !e.waveCleanup);
      const result = NV.updateEnemies(dt, Object.assign({}, st, { enemies: active }));
      result.enemies = result.enemies.concat(st.enemies.filter((e) => e.waveCleanup));
      return result;
    }
    const { enemies, player, bullets, MAX_BULLETS, MAX_ENEMY_BULLETS, enemyBulletCount, applyPlayerDamage, addFloatText, wave, hookSystem } = st;
    let shake = st.shake || 0;
    let gameOver = false;
    // Cuadrícula espacial de vecinos (una pasada O(n)) — reutilizada por las 3
    // separaciones (común, swarm, ranged) y el chequeo de contacto posterior.
    const grid = buildSpatialGrid(enemies);
    guardFrame++;
    for (let i = 0; i < enemies.length; i++) {
      const member = enemies[i];
      if (NV.isEnemyCombatActive(member)) guardLiveFrames.set(member, guardFrame);
      if (member.enemyTypeId === 'specter_guard') {
        member.guardProtectionActive = false;
        member.guardEncounterPlayer = member.dead || member.waveCleanup ? null : player;
        if (member.dead || member.killResolved || member.waveCleanup) member.guardTarget = null;
      }
    }
    for (let i = 0; i < enemies.length; i++) {
      const member = enemies[i];
      if (member.enemyTypeId === 'specter_guard' && member.guardTarget && !isLiveGuardTarget(member, member.guardTarget)) {
        member.guardTarget = null;
        member.guardState = 'find';
        member.guardRetargetTimer = 0;
      }
    }
    // Resumen colectivo O(n), sin arrays auxiliares ni matching O(n²). El orden
    // estable del array vivo da un ordinal angular; bajas y llegadas redistribuyen
    // los slots automáticamente en el siguiente frame.
    let localSwarmCount = 0;
    for (let i = 0; i < enemies.length; i++) {
      const member = enemies[i];
      if (member.dead || member.enemyTypeId !== 'swarmlet') continue;
      const localDx = member.x - player.x;
      const localDy = member.y - player.y;
      if (localDx * localDx + localDy * localDy <= SWARM_LOCAL_RADIUS * SWARM_LOCAL_RADIUS) {
        member.swarmSlotIndex = localSwarmCount++;
        member.swarmInLocalGroup = true;
      } else {
        member.swarmSlotIndex = -1;
        member.swarmInLocalGroup = false;
      }
    }

    for (const e of enemies) {
      if (e.dead) continue;

      const kb = e.knockVelX || 0;
      const kby = e.knockVelY || 0;
      const kbx = Math.abs(kb) > 0.1 ? kb : 0;
      const kby2 = Math.abs(kby) > 0.1 ? kby : 0;

            if (e.stun > 0) e.stun -= dt;
            if (e.shieldCd > 0) e.shieldCd = Math.max(0, e.shieldCd - dt);
            if (e.contactCd > 0) e.contactCd = Math.max(0, e.contactCd - dt);
            if (e.atkFlash > 0) e.atkFlash = Math.max(0, e.atkFlash - dt);
            if (e.fusionFlash > 0) e.fusionFlash = Math.max(0, e.fusionFlash - dt);
      if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt);
      if (e.predatorExecutionImpactTimer > 0) e.predatorExecutionImpactTimer = Math.max(0, e.predatorExecutionImpactTimer - dt);
      if (e.goliathImpactVfxTimer > 0) e.goliathImpactVfxTimer = Math.max(0, e.goliathImpactVfxTimer - dt);
      if (e.goliathAftershockVfxTimer > 0) e.goliathAftershockVfxTimer = Math.max(0, e.goliathAftershockVfxTimer - dt);
      const stunned = e.stun > 0;
      // Congelante: algunos enemigos ralentizados (slowUntil).
      if (e.slowUntil > 0) e.slowUntil -= dt;
      if (e.hitSlowUntil > 0) e.hitSlowUntil = Math.max(0, e.hitSlowUntil - dt);
      if (e.hitSlowImmunity > 0) e.hitSlowImmunity = Math.max(0, e.hitSlowImmunity - dt);
      // Campo Minado acelera movimiento efectivo sin mutar permanentemente e.speed.
      const eventSpeed = NV.minefieldEnemySpeed ? NV.minefieldEnemySpeed(e, st.waveEvent) : e.speed;
      const hitSlowActive = e.hitSlowUntil > 0;
      const hitSlowMult = hitSlowActive ? NV.hitSlowFor(e.isElite ? "ELITE" : "NORMAL").multiplier : 1;
      const spd = eventSpeed * (e.slowUntil > 0 ? 0.5 : 1) * hitSlowMult;
      let specterChargeContactActive = false;
      let swarmContactActive = e.enemyTypeId !== 'swarmlet';
      let swarmCommitContactActive = false;
      let wispContactActive = e.enemyTypeId !== 'wisp';
      let phantomCommitContactActive = false;
      if (stunned && e.enemyTypeId === 'specter_guard' && e.guardTarget) claimGuardProtection(e, e.guardTarget);
      if (isElitePhantom(e)) {
          initElitePhantom(e);
          let phantomState = e.phantomState;
          const phantomDx = player.x - e.x;
          const phantomDy = player.y - e.y;
          const phantomDist = Math.max(1, Math.hypot(phantomDx, phantomDy));
          const playing = st.gameState == null || st.gameState === 'playing';
          const possession = player.phantomPossession;
          const possessionActive = !!(possession && possession.active);
          if (possessionActive && possession.owner !== e && (phantomState === 'materialize' || phantomState === 'entry_windup' || phantomState === 'entry_commit')) {
            e.phantomState = 'roam_stalk';
            e.phantomStateTimer = 0;
            e.phantomStalkPhased = true;
            phantomState = 'roam_stalk';
          }
          if (e.phantomCooldown > 0) e.phantomCooldown = Math.max(0, e.phantomCooldown - dt);

          if (phantomState === 'possessed') {
            if (!possessionActive || possession.owner !== e || !playing || player.hp <= 0 || e.waveCleanup) {
              clearPhantomPossession(player, e, true);
            } else {
              e.phantomPossessionElapsed += dt;
              e.phantomStateTimer = Math.max(0, e.phantomStateTimer - dt);
              possession.elapsed = e.phantomPossessionElapsed;
              possession.duration = e.phantomPossessionDuration;
              possession.transition = Math.max(0, (possession.transition || 0) - dt);
              updatePhantomForceAngle(possession, enemies, player, dt);
              e.x = player.x;
              e.y = player.y;
              if (e.phantomStateTimer <= 1e-9) {
                const forceAngle = possession.forceAngle;
                const returnPoint = phantomReturnPoint(e, player, st.W, st.H, forceAngle);
                e.phantomReturnX = returnPoint.x;
                e.phantomReturnY = returnPoint.y;
                clearPhantomPossession(player, e, false);
                e.phantomCombatInactive = true;
                e.phantomDamageable = false;
                e.phantomState = 'expel';
                e.phantomStateTimer = PHANTOM_EXPEL_TIME;
                e.phantomExpelStartX = player.x;
                e.phantomExpelStartY = player.y;
              }
            }
          } else if (phantomState === 'expel') {
            e.phantomStateTimer = Math.max(0, e.phantomStateTimer - dt);
            const progress = 1 - e.phantomStateTimer / PHANTOM_EXPEL_TIME;
            e.x = e.phantomExpelStartX + (e.phantomReturnX - e.phantomExpelStartX) * progress;
            e.y = e.phantomExpelStartY + (e.phantomReturnY - e.phantomExpelStartY) * progress;
            if (e.phantomStateTimer <= 1e-9) {
              e.x = e.phantomReturnX;
              e.y = e.phantomReturnY;
              e.phantomCombatInactive = false;
              e.phantomDamageable = true;
              e.phantomStalkPhased = false;
              e.phantomState = 'return_recovery';
              e.phantomStateTimer = PHANTOM_RETURN_RECOVERY;
            }
          } else if (phantomState === 'return_recovery') {
            e.phantomStateTimer = Math.max(0, e.phantomStateTimer - dt);
            if (e.phantomStateTimer <= 1e-9) {
              e.phantomState = 'cooldown';
              e.phantomCooldown = PHANTOM_POST_COOLDOWN;
            }
          } else if (phantomState === 'miss_recovery') {
            e.phantomStateTimer = Math.max(0, e.phantomStateTimer - dt);
            if (e.phantomStateTimer <= 1e-9) {
              e.phantomState = 'cooldown';
              e.phantomCooldown = PHANTOM_RETRY_COOLDOWN;
            }
          } else if (phantomState === 'entry_commit') {
            const oldX = e.x, oldY = e.y;
            const commitSpeed = Math.min(PHANTOM_COMMIT_SPEED_CAP, e.speed * PHANTOM_COMMIT_SPEED_MULT);
            e.x += e.phantomDirX * commitSpeed * dt;
            e.y += e.phantomDirY * commitSpeed * dt;
            e.phantomStateTimer = Math.max(0, e.phantomStateTimer - dt);
            phantomCommitContactActive = segmentHitsCircle(oldX, oldY, e.x, e.y, player.x, player.y, e.radius + PHANTOM_CAPTURE_PAD);
            if (phantomCommitContactActive) {
              const valid = !e.dead && player.hp > 0 && playing && !possessionActive
                && player.invuln <= 0 && !player.dashActive && !e.waveCleanup && !e.killResolved;
              if (valid) beginPhantomPossession(e, st);
              else {
                e.phantomState = 'miss_recovery';
                e.phantomStateTimer = PHANTOM_MISS_RECOVERY;
              }
            } else if (e.phantomStateTimer <= 1e-9) {
              e.phantomState = 'miss_recovery';
              e.phantomStateTimer = PHANTOM_MISS_RECOVERY;
            }
          } else if (phantomState === 'entry_windup') {
            e.phantomStateTimer = Math.max(0, e.phantomStateTimer - dt);
            e.x += phantomDx / phantomDist * spd * 0.15 * dt;
            e.y += phantomDy / phantomDist * spd * 0.15 * dt;
            if (e.phantomStateTimer <= 1e-9) {
              let leadX = (Number(player.moveVx) || 0) * PHANTOM_PREDICTION_TIME;
              let leadY = (Number(player.moveVy) || 0) * PHANTOM_PREDICTION_TIME;
              const leadDistance = Math.hypot(leadX, leadY);
              if (leadDistance > PHANTOM_PREDICTION_MAX_LEAD) {
                const leadScale = PHANTOM_PREDICTION_MAX_LEAD / leadDistance;
                leadX *= leadScale;
                leadY *= leadScale;
              }
              e.phantomPredictedX = player.x + leadX;
              e.phantomPredictedY = player.y + leadY;
              e.phantomPredictionLead = Math.hypot(leadX, leadY);
              const snapshotDx = e.phantomPredictedX - e.x;
              const snapshotDy = e.phantomPredictedY - e.y;
              const snapshotDistance = Math.max(1, Math.hypot(snapshotDx, snapshotDy));
              e.phantomDirX = snapshotDx / snapshotDistance;
              e.phantomDirY = snapshotDy / snapshotDistance;
              e.phantomEntryAngle = Math.atan2(e.phantomDirY, e.phantomDirX);
              e.phantomState = 'entry_commit';
              e.phantomStateTimer = PHANTOM_COMMIT_TIME;
            }
          } else if (phantomState === 'materialize') {
            e.phantomStateTimer = Math.max(0, e.phantomStateTimer - dt);
            e.phantomStalkPhased = false;
            if (e.phantomStateTimer <= 1e-9) {
              e.phantomState = 'entry_windup';
              e.phantomStateTimer = PHANTOM_WINDUP;
            }
          } else {
            if (phantomState === 'cooldown' && e.phantomCooldown <= 1e-9) {
              e.phantomState = 'roam_stalk';
              e.phantomStalkPhased = true;
            }
            const blocked = possessionActive && possession.owner !== e;
            const radial = phantomDist < PHANTOM_ROAM_MIN ? -1 : (phantomDist > PHANTOM_ROAM_MAX ? 1 : 0);
            const side = e.phantomOrbitSide || 1;
            const nx = phantomDx / phantomDist, ny = phantomDy / phantomDist;
            e.x += (nx * radial * spd * 0.65 + -ny * side * spd * 0.24 + kbx) * dt;
            e.y += (ny * radial * spd * 0.65 + nx * side * spd * 0.24 + kby2) * dt;
            if (e.phantomState === 'roam_stalk' && !blocked && playing && player.hp > 0
                && e.phantomCooldown <= 0 && phantomDist <= PHANTOM_ENTRY_RANGE) {
              e.phantomState = 'materialize';
              e.phantomStateTimer = PHANTOM_MATERIALIZE_TIME;
              e.phantomStalkPhased = false;
            }
          }
      } else if (!stunned) {
        if (isElitePredator(e)) {
          initElitePredator(e);
          e.predatorAttackCooldown = Math.max(0, (e.predatorAttackCooldown || 0) - dt);
          if (e.predatorEvadeCharges < PREDATOR_EVADE_MAX_CHARGES) {
            e.predatorEvadeRechargeTimer = Math.max(0, (e.predatorEvadeRechargeTimer || PREDATOR_EVADE_RECHARGE) - dt);
            if (e.predatorEvadeRechargeTimer <= 1e-9) {
              e.predatorEvadeCharges = Math.min(PREDATOR_EVADE_MAX_CHARGES, e.predatorEvadeCharges + 1);
              e.predatorEvadeRechargeTimer = e.predatorEvadeCharges < PREDATOR_EVADE_MAX_CHARGES ? PREDATOR_EVADE_RECHARGE : 0;
            }
          } else {
            e.predatorEvadeCharges = PREDATOR_EVADE_MAX_CHARGES;
            e.predatorEvadeRechargeTimer = 0;
          }
          const predatorDx = player.x - e.x;
          const predatorDy = player.y - e.y;
          const predatorDist = Math.hypot(predatorDx, predatorDy);

          if (e.predatorState === 'mark') {
            e.predatorStateTimer = Math.max(0, e.predatorStateTimer - dt);
            e.x += kbx * dt * 0.25;
            e.y += kby2 * dt * 0.25;
            if (e.predatorStateTimer <= 1e-9) {
              e.predatorState = 'hunt';
              e.predatorStateTimer = PREDATOR_HUNT_TIME;
            }
          } else if (e.predatorState === 'hunt') {
            e.predatorStateTimer = Math.max(0, e.predatorStateTimer - dt);
            if (predatorDist <= PREDATOR_EXECUTION_TRIGGER_RANGE) {
              e.predatorState = 'execution_windup';
              e.predatorStateTimer = PREDATOR_EXECUTION_WINDUP;
              e.predatorExecutionFacing = Math.atan2(predatorDy, predatorDx);
              e.predatorExecutionSpent = false;
              e.predatorExecutionImpactTimer = 0;
            } else if (e.predatorStateTimer <= 1e-9) {
              e.predatorState = 'recovery';
              e.predatorStateTimer = PREDATOR_FAILED_HUNT_RECOVERY;
              e.predatorAttackCooldown = PREDATOR_ATTACK_COOLDOWN;
              e.predatorFlankSide = -e.predatorFlankSide;
            } else {
              const invDist = Math.max(1, predatorDist);
              const side = e.predatorFlankSide === -1 ? -1 : 1;
              const huntSpeed = spd * PREDATOR_HUNT_SPEED_MULT;
              const curve = Math.min(0.32, Math.max(0.08, predatorDist / PREDATOR_STALK_RADIUS * 0.18));
              e.x += (predatorDx / invDist - predatorDy / invDist * side * curve) * huntSpeed * dt + kbx * dt;
              e.y += (predatorDy / invDist + predatorDx / invDist * side * curve) * huntSpeed * dt + kby2 * dt;
            }
          } else if (e.predatorState === 'execution_windup') {
            e.predatorStateTimer = Math.max(0, e.predatorStateTimer - dt);
            e.x += kbx * dt * 0.08;
            e.y += kby2 * dt * 0.08;
            if (e.predatorStateTimer <= 1e-9) {
              e.predatorState = 'execution';
              e.predatorStateTimer = PREDATOR_EXECUTION_ACTIVE_TIME;
              e.predatorExecutionSpent = false;
            }
          } else if (e.predatorState === 'execution') {
            if (!e.predatorExecutionSpent) {
              e.predatorExecutionSpent = true;
              const facing = e.predatorExecutionFacing || 0;
              const targetAngle = Math.atan2(player.y - e.y, player.x - e.x);
              const angleDiff = Math.abs(Math.atan2(Math.sin(targetAngle - facing), Math.cos(targetAngle - facing)));
              if (predatorDist <= PREDATOR_EXECUTION_RADIUS && angleDiff <= PREDATOR_EXECUTION_ARC * 0.5) {
                const hit = applyPlayerDamage(e.eliteDamage || e.damage, { cause: 'predator-execution', enemy: e });
                if (hit.dodged) e.atkFlash = 0.25;
                if (hit.applied) {
                  e.atkFlash = 0.45;
                  e.predatorExecutionImpactTimer = 0.12;
                  e.predatorExecutionImpactX = player.x;
                  e.predatorExecutionImpactY = player.y;
                  shake = Math.max(shake, hit.crit ? 0.3 : 0.15);
                  if (hit.killed) gameOver = true;
                }
              }
            }
            e.predatorStateTimer = Math.max(0, e.predatorStateTimer - dt);
            if (e.predatorStateTimer <= 1e-9) {
              e.predatorState = 'recovery';
              e.predatorStateTimer = PREDATOR_EXECUTION_RECOVERY;
              e.predatorAttackCooldown = PREDATOR_ATTACK_COOLDOWN;
              e.predatorFlankSide = -e.predatorFlankSide;
            }
          } else if (e.predatorState === 'recovery') {
            e.predatorStateTimer = Math.max(0, e.predatorStateTimer - dt);
            e.x += kbx * dt * 0.08;
            e.y += kby2 * dt * 0.08;
            if (e.predatorStateTimer <= 1e-9) {
              e.predatorState = 'stalk';
              e.predatorStalkTimer = 0;
            }
          } else if (e.predatorState === 'evade') {
            const remainingTime = Math.max(0.000001, e.predatorStateTimer || 0);
            const fraction = Math.min(1, dt / remainingTime);
            e.x += (e.predatorEvadeTargetX - e.x) * fraction;
            e.y += (e.predatorEvadeTargetY - e.y) * fraction;
            e.predatorStateTimer = Math.max(0, e.predatorStateTimer - dt);
            if (e.predatorStateTimer <= 1e-9) {
              e.x = e.predatorEvadeTargetX;
              e.y = e.predatorEvadeTargetY;
              e.predatorState = e.predatorEvadeReturnState || 'stalk';
              e.predatorStateTimer = e.predatorEvadeReturnTimer || 0;
            }
          } else {
            e.predatorState = 'stalk';
            e.predatorStalkTimer = (e.predatorStalkTimer || 0) + dt;
            const baseAngle = Math.atan2(e.y - player.y, e.x - player.x);
            const flankAngle = baseAngle + e.predatorFlankSide * Math.PI * 0.5;
            const targetX = player.x + Math.cos(flankAngle) * PREDATOR_STALK_RADIUS;
            const targetY = player.y + Math.sin(flankAngle) * PREDATOR_STALK_RADIUS;
            const moveDx = targetX - e.x;
            const moveDy = targetY - e.y;
            const moveDist = Math.hypot(moveDx, moveDy);
            if (moveDist > 8) {
              e.x += moveDx / Math.max(1, moveDist) * spd * dt + kbx * dt;
              e.y += moveDy / Math.max(1, moveDist) * spd * dt + kby2 * dt;
            }
            const flankReady = moveDist <= 42;
            const fallbackReady = e.predatorStalkTimer >= PREDATOR_STALK_FALLBACK;
            if (e.predatorAttackCooldown <= 1e-9 && (flankReady || fallbackReady)) {
              e.predatorState = 'mark';
              e.predatorStateTimer = PREDATOR_MARK_TIME;
            }
          }
        } else if (e.enemyTypeId === 'specter_guard') {
          if (!Number.isFinite(e.guardRetargetTimer)) e.guardRetargetTimer = 0;
          e.guardRetargetTimer = Math.max(0, e.guardRetargetTimer - dt);

          if (!isLiveGuardTarget(e, e.guardTarget)
              || Math.hypot(e.guardTarget.x - e.x, e.guardTarget.y - e.y) > GUARD_SEARCH_RADIUS) {
            e.guardTarget = null;
            e.guardState = 'find';
            e.guardRetargetTimer = 0;
          }
          if (e.guardRetargetTimer <= 1e-9) {
            e.guardTarget = findGuardTarget(e, grid);
            e.guardRetargetTimer = GUARD_RETARGET_INTERVAL;
            e.guardState = e.guardTarget ? 'escort' : 'chase';
          }

          if (e.guardTarget) {
            const ally = e.guardTarget;
            const allyFromPlayerX = ally.x - player.x;
            const allyFromPlayerY = ally.y - player.y;
            const allyFromPlayerDist = Math.max(1, Math.hypot(allyFromPlayerX, allyFromPlayerY));
            e.guardEscortX = ally.x + allyFromPlayerX / allyFromPlayerDist * GUARD_ESCORT_DISTANCE;
            e.guardEscortY = ally.y + allyFromPlayerY / allyFromPlayerDist * GUARD_ESCORT_DISTANCE;
            const escortDx = e.guardEscortX - e.x;
            const escortDy = e.guardEscortY - e.y;
            const escortDist = Math.hypot(escortDx, escortDy);
            if (escortDist > GUARD_ESCORT_DEADZONE) {
              e.guardState = escortDist > GUARD_ESCORT_DISTANCE * 0.5 ? 'escort' : 'reposition';
              e.x += escortDx / Math.max(1, escortDist) * spd * GUARD_ESCORT_SPEED_MULT * dt + kbx * dt;
              e.y += escortDy / Math.max(1, escortDist) * spd * GUARD_ESCORT_SPEED_MULT * dt + kby2 * dt;
            } else {
              e.guardState = 'reposition';
              e.x += kbx * dt;
              e.y += kby2 * dt;
            }
            claimGuardProtection(e, ally);
          } else {
            const angle = Math.atan2(player.y - e.y, player.x - e.x);
            const dist = Math.hypot(player.x - e.x, player.y - e.y);
            if (dist > e.radius + 30) {
              e.x += Math.cos(angle) * spd * dt + kbx * dt;
              e.y += Math.sin(angle) * spd * dt + kby2 * dt;
            }
          }
        } else if (e.enemyTypeId === 'wisp') {
          if (!e.wispPhaseState) {
            e.wispPhaseState = 'drift';
            e.wispPhaseTimer = 0;
            e.wispAttackCooldown = wispInitialDelay(e);
            e.wispTargetX = e.x;
            e.wispTargetY = e.y;
            e.wispPulseSpent = false;
            e.wispPhaseTargetable = true;
          }

          const wispDx = st.player.x - e.x;
          const wispDy = st.player.y - e.y;
          const wispDist = Math.hypot(wispDx, wispDy);
          const wispState = e.wispPhaseState;
          wispContactActive = false;

          if (wispState === 'phase_out') {
            e.wispPhaseTimer = Math.max(0, e.wispPhaseTimer - dt);
            e.x += kbx * dt * 0.15;
            e.y += kby2 * dt * 0.15;
            if (e.wispPhaseTimer <= 1e-9) {
              e.wispTargetX = clampWispDestination(st.player.x, st.W);
              e.wispTargetY = clampWispDestination(st.player.y, st.H);
              e.wispPhaseState = 'mark';
              e.wispPhaseTimer = WISP_MARK_TIME;
              e.wispPhaseTargetable = false;
            }
          } else if (wispState === 'mark') {
            e.wispPhaseTimer = Math.max(0, e.wispPhaseTimer - dt);
            if (e.wispPhaseTimer <= 1e-9) {
              e.x = e.wispTargetX;
              e.y = e.wispTargetY;
              e.wispPhaseState = 'pulse';
              e.wispPhaseTimer = WISP_PULSE_FLASH_TIME;
              e.wispPhaseTargetable = true;
              e.wispPulseSpent = true;
              const pulseDistance = Math.hypot(st.player.x - e.x, st.player.y - e.y);
              if (pulseDistance <= WISP_PULSE_RADIUS) {
                const hit = applyPlayerDamage(e.damage, { cause: 'wisp-pulse', enemy: e });
                if (hit.applied) {
                  e.atkFlash = Math.max(e.atkFlash || 0, WISP_PULSE_FLASH_TIME);
                  shake = Math.max(shake, hit.crit ? 0.3 : 0.15);
                  if (hit.killed) gameOver = true;
                }
              }
            }
          } else if (wispState === 'pulse') {
            e.wispPhaseTimer = Math.max(0, e.wispPhaseTimer - dt);
            if (e.wispPhaseTimer <= 1e-9) {
              e.wispPhaseState = 'recovery';
              e.wispPhaseTimer = WISP_RECOVERY_TIME;
            }
          } else if (wispState === 'recovery') {
            e.wispPhaseTimer = Math.max(0, e.wispPhaseTimer - dt);
            e.x += kbx * dt * 0.15;
            e.y += kby2 * dt * 0.15;
            if (e.wispPhaseTimer <= 1e-9) {
              e.wispPhaseState = 'drift';
              e.wispAttackCooldown = WISP_ATTACK_COOLDOWN;
              e.wispPulseSpent = false;
            }
          } else {
            e.wispPhaseTargetable = true;
            e.wispAttackCooldown = Math.max(0, (e.wispAttackCooldown || 0) - dt);
            if (wispDist <= WISP_ATTACK_TRIGGER_RANGE && e.wispAttackCooldown <= 1e-9) {
              e.wispPhaseState = 'phase_out';
              e.wispPhaseTimer = WISP_PHASE_OUT_TIME;
              e.wispPulseSpent = false;
            } else {
              e.erraticTimer -= dt;
              if (e.erraticTimer <= 0) { e.erraticTargetAngle = Math.random() * Math.PI * 2; e.erraticTimer = 0.5; }
              e.x += Math.cos(e.erraticTargetAngle) * spd * dt + kbx * dt;
              e.y += Math.sin(e.erraticTargetAngle) * spd * dt + kby2 * dt;
            }
          }
        } else if (e.enemyTypeId === 'specter_core') {
          if (!e.coreZoneState) {
            e.coreZoneState = 'positioning';
            e.coreZoneTimer = 0;
            e.coreZoneCooldown = CORE_INITIAL_ATTACK_DELAY;
            e.coreZoneTargetX = e.x;
            e.coreZoneTargetY = e.y;
            if (!e.coreZoneOwnerId) e.coreZoneOwnerId = ++coreZoneOwnerSerial;
          }
          if (e.coreZoneCooldown > 0) e.coreZoneCooldown = Math.max(0, e.coreZoneCooldown - dt);

          const coreDx = st.player.x - e.x;
          const coreDy = st.player.y - e.y;
          const coreDist = Math.hypot(coreDx, coreDy);
          const coreInvDist = Math.max(coreDist, 1);
          const hazards = st.hazards || [];
          const canPlaceZone = typeof NV.canSpawnCoreZone === 'function'
            ? NV.canSpawnCoreZone(hazards, e.coreZoneOwnerId)
            : false;

          if (e.coreZoneState === 'windup') {
            e.coreZoneTimer = Math.max(0, e.coreZoneTimer - dt);
            e.x += kbx * dt * 0.2;
            e.y += kby2 * dt * 0.2;
            if (e.coreZoneTimer <= 1e-9) {
              if (!e.coreZoneForcedTarget) {
                e.coreZoneTargetX = clampCoreZoneTarget(st.player.x, st.W);
                e.coreZoneTargetY = clampCoreZoneTarget(st.player.y, st.H);
              }
              e.coreZoneForcedTarget = false;
              const zone = typeof NV.spawnCoreZone === 'function'
                ? NV.spawnCoreZone(hazards, e, e.coreZoneTargetX, e.coreZoneTargetY)
                : null;
              e.coreZoneState = 'recovery';
              e.coreZoneTimer = CORE_ZONE_COOLDOWN;
              e.coreZoneCooldown = zone ? CORE_ZONE_COOLDOWN : 0.25;
            }
          } else if (e.coreZoneState === 'recovery') {
            e.coreZoneTimer = Math.max(0, e.coreZoneTimer - dt);
            const desired = 230;
            const bandError = coreDist - desired;
            const move = Math.abs(bandError) > 24 ? Math.sign(bandError) * spd * 0.35 : 0;
            e.x += coreDx / coreInvDist * move * dt + kbx * dt;
            e.y += coreDy / coreInvDist * move * dt + kby2 * dt;
            if (e.coreZoneTimer <= 1e-9) e.coreZoneState = 'positioning';
          } else {
            if (coreDist <= CORE_ZONE_TRIGGER_RANGE && e.coreZoneCooldown <= 0 && canPlaceZone) {
              e.coreZoneState = 'windup';
              e.coreZoneTimer = CORE_ZONE_WINDUP;
            } else {
              const desired = 230;
              const bandError = coreDist - desired;
              const radial = Math.abs(bandError) > 24 ? Math.sign(bandError) : 0;
              const strafe = ((e.coreZoneOwnerId || 0) & 1) ? 1 : -1;
              const mx = coreDx / coreInvDist * radial * spd * 0.55 + (-coreDy / coreInvDist) * strafe * spd * 0.20;
              const my = coreDy / coreInvDist * radial * spd * 0.55 + (coreDx / coreInvDist) * strafe * spd * 0.20;
              e.x += mx * dt + kbx * dt;
              e.y += my * dt + kby2 * dt;
            }
          }
        } else if (e.enemyTypeId === 'specter_grunt') {
          if (!e.specterChargeState) {
            e.specterChargeState = 'approach';
            e.specterChargeTimer = 0;
            e.specterChargeCooldown = 0;
            e.specterChargeDirX = 0;
            e.specterChargeDirY = 0;
            e.specterChargeDistance = 0;
          }
          if (e.specterChargeCooldown > 0) {
            e.specterChargeCooldown = Math.max(0, e.specterChargeCooldown - dt);
          }

          const gruntDx = st.player.x - e.x;
          const gruntDy = st.player.y - e.y;
          const gruntDist = Math.hypot(gruntDx, gruntDy);
          const gruntState = e.specterChargeState;

          if (gruntState === 'windup') {
            e.specterChargeTimer = Math.max(0, e.specterChargeTimer - dt);
            e.x += kbx * dt;
            e.y += kby2 * dt;
            if (e.specterChargeTimer <= 1e-9) {
              const aimDist = Math.max(gruntDist, 1);
              e.specterChargeDirX = gruntDx / aimDist;
              e.specterChargeDirY = gruntDy / aimDist;
              e.specterChargeDistance = 0;
              e.specterChargeTimer = SPECTER_GRUNT_CHARGE_TIME;
              e.specterChargeState = 'charge';
            }
          } else if (gruntState === 'charge') {
            specterChargeContactActive = true;
            const chargeStep = spd * SPECTER_GRUNT_CHARGE_SPEED_MULT * dt;
            e.x += e.specterChargeDirX * chargeStep + kbx * dt;
            e.y += e.specterChargeDirY * chargeStep + kby2 * dt;
            e.specterChargeDistance += chargeStep;
            e.specterChargeTimer = Math.max(0, e.specterChargeTimer - dt);
            if (e.specterChargeTimer <= 0 || e.specterChargeDistance >= SPECTER_GRUNT_CHARGE_DISTANCE) {
              e.specterChargeState = 'recovery';
              e.specterChargeTimer = SPECTER_GRUNT_RECOVERY;
            }
          } else if (gruntState === 'recovery') {
            e.specterChargeTimer = Math.max(0, e.specterChargeTimer - dt);
            e.x += kbx * dt;
            e.y += kby2 * dt;
            if (e.specterChargeTimer <= 0) {
              e.specterChargeState = 'approach';
              e.specterChargeCooldown = SPECTER_GRUNT_COOLDOWN;
            }
          } else {
            if (gruntDist <= SPECTER_GRUNT_TRIGGER_RANGE && e.specterChargeCooldown <= 0) {
              e.specterChargeState = 'windup';
              e.specterChargeTimer = SPECTER_GRUNT_WINDUP;
            } else {
              const angle = Math.atan2(gruntDy, gruntDx);
              e.x += Math.cos(angle) * spd * dt + kbx * dt;
              e.y += Math.sin(angle) * spd * dt + kby2 * dt;
            }
          }
        } else if (isEliteGoliath(e)) {
          initEliteGoliath(e);
          e.goliathAttackCooldown = Math.max(0, (e.goliathAttackCooldown || 0) - dt);
          const goliathDx = st.player.x - e.x;
          const goliathDy = st.player.y - e.y;
          const goliathDist = Math.hypot(goliathDx, goliathDy);
          const goliathInvDist = Math.max(goliathDist, 1);

          if (e.goliathState === 'slam_windup') {
            e.goliathStateTimer = Math.max(0, (e.goliathStateTimer || 0) - dt);
            if (e.goliathStateTimer <= 1e-9 && !e.goliathImpactSpent) {
              e.goliathImpactSpent = true;
              e.goliathImpactX = e.x;
              e.goliathImpactY = e.y;
              e.goliathImpactVfxTimer = GOLIATH_IMPACT_VFX_TIME;
              const impactDistance = Math.hypot(st.player.x - e.goliathImpactX, st.player.y - e.goliathImpactY);
              if (impactDistance <= GOLIATH_SLAM_RADIUS) {
                const hit = applyPlayerDamage(e.eliteDamage, { cause: 'goliath-seismic-slam', enemy: e });
                if (hit.applied) {
                  if (NV.tryApplyPlayerStun) NV.tryApplyPlayerStun(st.player, e.stunDuration || 0, e.stunChance || 0, e, { addFloatText });
                  shake = Math.max(shake, hit.crit ? 0.3 : 0.15);
                  if (hit.killed) gameOver = true;
                }
              }
              e.goliathState = 'aftershock_window';
              e.goliathStateTimer = GOLIATH_AFTERSHOCK_DELAY;
              e.goliathAftershockSpent = false;
            }
          } else if (e.goliathState === 'aftershock_window') {
            e.goliathStateTimer = Math.max(0, (e.goliathStateTimer || 0) - dt);
            if (e.goliathStateTimer <= 1e-9 && !e.goliathAftershockSpent) {
              e.goliathAftershockSpent = true;
              e.goliathAftershockVfxTimer = GOLIATH_AFTERSHOCK_VFX_TIME;
              const aftershockDistance = Math.hypot(st.player.x - e.goliathImpactX, st.player.y - e.goliathImpactY);
              if (aftershockDistance <= GOLIATH_AFTERSHOCK_RADIUS) {
                const aftershockDamage = Math.round(e.eliteDamage * GOLIATH_AFTERSHOCK_DAMAGE_MULT);
                const hit = applyPlayerDamage(aftershockDamage, { cause: 'goliath-aftershock', enemy: e });
                if (hit.applied) {
                  shake = Math.max(shake, hit.crit ? 0.22 : 0.10);
                  if (hit.killed) gameOver = true;
                }
              }
              e.goliathState = 'recovery';
              e.goliathStateTimer = GOLIATH_RECOVERY_TIME;
            }
          } else if (e.goliathState === 'recovery') {
            e.goliathStateTimer = Math.max(0, (e.goliathStateTimer || 0) - dt);
            if (e.goliathStateTimer <= 1e-9) {
              e.goliathState = 'approach';
              e.goliathAttackCooldown = GOLIATH_ATTACK_COOLDOWN;
              e.goliathImpactSpent = false;
              e.goliathAftershockSpent = false;
            }
          } else if (e.goliathAttackCooldown <= 1e-9 && goliathDist <= GOLIATH_SLAM_TRIGGER_RANGE) {
            e.goliathState = 'slam_windup';
            e.goliathStateTimer = GOLIATH_SLAM_WINDUP;
            e.goliathImpactSpent = false;
            e.goliathAftershockSpent = false;
          } else if (goliathDist > GOLIATH_HOLD_MAX) {
            e.x += goliathDx / goliathInvDist * spd * dt + kbx * dt;
            e.y += goliathDy / goliathInvDist * spd * dt + kby2 * dt;
          } else if (goliathDist < GOLIATH_RETREAT_RANGE) {
            e.x -= goliathDx / goliathInvDist * spd * GOLIATH_RETREAT_SPEED_MULT * dt;
            e.y -= goliathDy / goliathInvDist * spd * GOLIATH_RETREAT_SPEED_MULT * dt;
          } else if (goliathDist < GOLIATH_HOLD_MIN) {
            const correction = Math.min(1, (GOLIATH_HOLD_MIN - goliathDist) / (GOLIATH_HOLD_MIN - GOLIATH_RETREAT_RANGE));
            e.x -= goliathDx / goliathInvDist * spd * GOLIATH_RETREAT_SPEED_MULT * correction * dt;
            e.y -= goliathDy / goliathInvDist * spd * GOLIATH_RETREAT_SPEED_MULT * correction * dt;
          }
        } else if (e.behavior === 'chase') {
          const angle = Math.atan2(st.player.y - e.y, st.player.x - e.x);
          e.x += Math.cos(angle) * spd * dt + kbx * dt;
          e.y += Math.sin(angle) * spd * dt + kby2 * dt;
        } else if (e.behavior === 'flank') {
          // RUNNER (F06): flanqueador. F05 (NV.enemyState) es la UNICA fuente
          // autoritativa de state lifecycle CUANDO disponible; fallback interno si no.
          const player = st.player;
          const dx = player.x - e.x, dy = player.y - e.y;
          const distToPlayer = Math.hypot(dx, dy);
          const invDist = Math.max(distToPlayer, 1);

          // Inicializar flankSide una sola vez (persistido en e.flankSide).
          if (e.flankSide !== -1 && e.flankSide !== 1) {
            e.flankSide = Math.random() < 0.5 ? -1 : 1;
          }

          // --- State lifecycle: F05 es autoridad; fallback interno si no cargado ---
          if (NV.enemyState) {
            if (!e.intent) {
              e.intent = NV.enemyState.createIntent(e);
              e.intent.preferredRange = 130;
            }
            NV.enemyState.updateIntent(e, dt); // tick del timer
            var intent = e.intent;
            var state = intent.state;
            var t = intent.stateTimer;
          } else {
            if (!e.flankState) e.flankState = 'idle';
            if (e.stateTimer == null) e.stateTimer = 0.8;
            e.stateTimer -= dt;
            if (e.stateTimer < 0) e.stateTimer = 0;
            var state = e.flankState;
            var t = e.stateTimer;
          }

          var targetX, targetY;
          var next;

          if (state === 'idle' || state === 'positioning') {
            // APPROACH: acercamiento lateral. Target offset lateral respecto al
            // jugador, PERO distinto de player.center.
            next = state;
            var flankOffset = 90 + e.flankSide * 30;
            targetX = player.x + (-dy / invDist) * flankOffset;
            targetY = player.y + (dx / invDist) * flankOffset;
            if (distToPlayer < 80 || t <= 0) {
              next = 'attack'; // -> COMMIT
              e.committedTargetX = player.x + e.flankSide * 18; // SNAPSHOT
              e.committedTargetY = player.y + e.flankSide * 10; // SNAPSHOT
              e.commitDirX = e.committedTargetX - e.x; // SNAPSHOT
              e.commitDirY = e.committedTargetY - e.y; // SNAPSHOT
              if (NV.enemyState) e.intent.stateTimer = 0.45; else e.stateTimer = 0.45;
            }
          } else if (state === 'attack' || state === 'COMMIT') {
            // COMMIT: lunge hacia el SNAPSHOT. El jugador no redirige al Runner.
            next = state;
            targetX = e.committedTargetX;
            targetY = e.committedTargetY;
            if (t <= 0 || distToPlayer < e.radius + 20) {
              next = 'recovery'; // -> RECOVERY
              if (NV.enemyState) e.intent.stateTimer = 0.6; else e.stateTimer = 0.6;
              if (Math.random() < 0.4) e.flankSide = -e.flankSide;
            }
          } else if (state === 'recovery') {
            // RECOVERY: retroceso crea separacion antes del proximo approach.
            next = state;
            var awayDist = Math.hypot(e.x - player.x, e.y - player.y);
            var retreatDist = 120;
            targetX = e.x + (dx ? -dx / Math.max(awayDist, 1) : 0) * retreatDist;
            targetY = e.y + (dy ? -dy / Math.max(awayDist, 1) : 0) * retreatDist;
            if (t <= 0) {
              next = 'positioning'; // -> APPROACH
              if (NV.enemyState) e.intent.stateTimer = 0.8; else e.stateTimer = 0.8;
            }
          } else {
            // Fallback a POSITIONING (APPROACH) si estado inesperado.
            next = 'positioning';
            targetX = player.x + (-dy / invDist) * (90 + e.flankSide * 30);
            targetY = player.y + (dx / invDist) * (90 + e.flankSide * 30);
            if (NV.enemyState) e.intent.stateTimer = Math.max(e.intent.stateTimer, 0.8);
          }

          // Persistir estado (F05 es autoridad; fallback usa campos propios).
          if (NV.enemyState) {
            intent.state = next;
          } else {
            e.flankState = next;
          }

          // Movimiento hacia el objetivo.
          var toTargetX = targetX - e.x;
          var toTargetY = targetY - e.y;
          var toTargetDist = Math.hypot(toTargetX, toTargetY);
          if (toTargetDist > 1e-3) {
            var inv = 1 / toTargetDist;
            var moveSpeed = spd;
            e.x += toTargetX * inv * moveSpeed * dt;
            e.y += toTargetY * inv * moveSpeed * dt;
          }
          // Steering de F05 (factor de movimiento, sin override de legacy).
          if (NV.enemyState) NV.enemyState.computeSteering(e);
        } else if (e.behavior === 'kami') {
          // KAMIKAZE: persigue; a <130px se arma (mecha 0.8s, parpadeo) y detonan.
          const angle = Math.atan2(st.player.y - e.y, st.player.x - e.x);
          const dist = Math.hypot(st.player.x - e.x, st.player.y - e.y);
          if (!e.armed && dist < 130) { e.armed = true; e.fuse = 0.8; }
          if (e.armed) {
            e.fuse -= dt;
            const creep = spd * 0.3 * dt; // avanza lento mientras está armado
            e.x += Math.cos(angle) * creep;
            e.y += Math.sin(angle) * creep;
            if (e.fuse <= 0) {
              e.dead = true;
              if (st.onKill) st.onKill(e); // pasa por killEnemy: puntos/drops/explosión
              continue;
            }
          } else {
            e.x += Math.cos(angle) * spd * dt + kbx * dt;
            e.y += Math.sin(angle) * spd * dt + kby2 * dt;
          }
        } else if (e.behavior === 'erratic') {
          e.erraticTimer -= dt;
          if (e.erraticTimer <= 0) { e.erraticTargetAngle = Math.random() * Math.PI * 2; e.erraticTimer = 0.5; }
          const _angleDiff = Math.atan2(Math.sin(e.erraticTargetAngle - e.angle), Math.cos(e.erraticTargetAngle - e.angle));
          e.angle += _angleDiff * Math.min(1, 5 * dt);
          e.x += (Math.cos(e.angle) * spd + kbx) * dt;
          e.y += (Math.sin(e.angle) * spd + kby2) * dt;
        } else if (e.behavior === 'swarm') {
          if (!e.swarmState) {
            e.swarmState = 'approach';
            e.swarmStateTimer = 0;
            e.swarmCommitDirX = 0;
            e.swarmCommitDirY = 0;
            e.swarmRegroupDirX = 0;
            e.swarmRegroupDirY = 0;
            e.swarmCommitContactSpent = false;
          }
          const hasCollective = e.swarmInLocalGroup && localSwarmCount >= MIN_SWARM_FOR_FORMATION;
          const swarmDx = st.player.x - e.x;
          const swarmDy = st.player.y - e.y;
          const swarmDist = Math.max(1, Math.hypot(swarmDx, swarmDy));

          if (e.swarmState === 'commit') {
            swarmCommitContactActive = !e.swarmCommitContactSpent;
            swarmContactActive = swarmCommitContactActive;
            e.swarmStateTimer = Math.max(0, e.swarmStateTimer - dt);
            e.x += (e.swarmCommitDirX * spd * SWARM_COMMIT_SPEED_MULT + kbx) * dt;
            e.y += (e.swarmCommitDirY * spd * SWARM_COMMIT_SPEED_MULT + kby2) * dt;
            if (e.swarmStateTimer <= 1e-9) {
              const awayX = -swarmDx / swarmDist;
              const awayY = -swarmDy / swarmDist;
              const side = ((e.swarmSlotIndex || 0) & 1) ? -1 : 1;
              const regroupX = awayX + (-awayY) * 0.55 * side;
              const regroupY = awayY + awayX * 0.55 * side;
              const regroupLen = Math.max(1, Math.hypot(regroupX, regroupY));
              e.swarmRegroupDirX = regroupX / regroupLen;
              e.swarmRegroupDirY = regroupY / regroupLen;
              e.swarmState = 'regroup';
              e.swarmStateTimer = SWARM_REGROUP_TIME;
            }
          } else if (e.swarmState === 'regroup') {
            e.swarmStateTimer = Math.max(0, e.swarmStateTimer - dt);
            e.x += (e.swarmRegroupDirX * spd * SWARM_REGROUP_SPEED_MULT + kbx) * dt;
            e.y += (e.swarmRegroupDirY * spd * SWARM_REGROUP_SPEED_MULT + kby2) * dt;
            if (e.swarmStateTimer <= 1e-9) {
              e.swarmState = hasCollective ? 'form' : 'approach';
              e.swarmStateTimer = hasCollective ? SWARM_FORMATION_TIME : 0;
            }
          } else if (hasCollective) {
            if (e.swarmState !== 'form') {
              e.swarmState = 'form';
              e.swarmStateTimer = SWARM_FORMATION_TIME;
            }
            const slotAngle = -Math.PI / 2 + (e.swarmSlotIndex / localSwarmCount) * Math.PI * 2;
            e.swarmTargetX = st.player.x + Math.cos(slotAngle) * SWARM_FORMATION_RADIUS;
            e.swarmTargetY = st.player.y + Math.sin(slotAngle) * SWARM_FORMATION_RADIUS;
            const targetDx = e.swarmTargetX - e.x;
            const targetDy = e.swarmTargetY - e.y;
            const targetDist = Math.max(1, Math.hypot(targetDx, targetDy));
            e.x += (targetDx / targetDist * spd + kbx) * dt;
            e.y += (targetDy / targetDist * spd + kby2) * dt;
            e.swarmStateTimer = Math.max(0, e.swarmStateTimer - dt);
            e.swarmReady = e.swarmStateTimer <= SWARM_READY_TIME;
            if (e.swarmStateTimer <= 1e-9) {
              const commitDx = st.player.x - e.x;
              const commitDy = st.player.y - e.y;
              const commitDist = Math.max(1, Math.hypot(commitDx, commitDy));
              e.swarmCommitDirX = commitDx / commitDist;
              e.swarmCommitDirY = commitDy / commitDist;
              e.swarmCommitContactSpent = false;
              e.swarmReady = false;
              e.swarmState = 'commit';
              e.swarmStateTimer = SWARM_COMMIT_DURATION;
            }
          } else {
            e.swarmState = 'approach';
            e.swarmStateTimer = 0;
            e.swarmReady = false;
            swarmContactActive = true;
            const angle = Math.atan2(swarmDy, swarmDx);
            e.x += (Math.cos(angle) * spd + kbx) * dt;
            e.y += (Math.sin(angle) * spd + kby2) * dt;
          }
          // Evitar amontonarse con otros swarm próximos (cuadrícula, no O(n²)):
          // mismo radio (radius*4) y mismo empuje (10*dt) que antes.
          forEachGridNeighbor(e, grid, (other) => {
            if (!other.dead && Math.hypot(other.x - e.x, other.y - e.y) < e.radius * 4) {
              const oa = Math.atan2(other.y - e.y, other.x - e.x);
              e.x -= Math.cos(oa) * 10 * dt;
              e.y -= Math.sin(oa) * 10 * dt;
            }
          });
        } else if (e.behavior === 'shield') {
          const angle = Math.atan2(st.player.y - e.y, st.player.x - e.x);
          const dist = Math.hypot(st.player.x - e.x, st.player.y - e.y);
          if (dist > e.radius + 30) {
            e.x += Math.cos(angle) * spd * dt + kbx * dt;
            e.y += Math.sin(angle) * spd * dt + kby2 * dt;
          }
        } else if (e.behavior === 'ranged') {
          // SPITTER / ESCOPURAS (F07): F05 es la autoridad de estados.
          // Banda [SPIT_NEAR, SPIT_FAR]: lejos -> approach, en banda ->
          // strafe persistente, cerca -> RETREAT. WINDUP real sin spawn con
          // aim snapshot + lead parcial topado; ATTACK = 1 disparo familia
          // existente sin homing; RECOVERY = ventana de castigo sin refire.
          const pdx = st.player.x - e.x, pdy = st.player.y - e.y;
          const dist = Math.hypot(pdx, pdy);
          const invD = Math.max(dist, 1);
          // F3: Hook owner cannot normal-fire durante su Hook windup.
          // Congela al owner (sin strafe ni avances de state) mientras windupea.
          if (hookSystem && hookSystem.phase === 'windup' && hookSystem.srcEnemy === e) { continue; }
          if (e.spitStrafe !== -1 && e.spitStrafe !== 1) {
            e.spitStrafe = Math.random() < 0.5 ? -1 : 1;
            e.spitStrafeT = SPIT_STRAFE_HOLD;
          }
          if (!(e.spitStrafeT > 0)) {
            e.spitStrafeT = SPIT_STRAFE_HOLD;
            if (Math.random() < 0.35) e.spitStrafe = -e.spitStrafe;
          } else {
            e.spitStrafeT -= dt;
          }
          let rState, rTimer;
          if (NV.enemyState) {
            if (!e.intent) {
              e.intent = NV.enemyState.createIntent(e);
              e.intent.preferredRange = SPIT_BAND_MID;
              e.intent.flankOffset = 90;
            }
            NV.enemyState.updateIntent(e, dt);
            rState = e.intent.state;
            rTimer = e.intent.stateTimer;
          } else {
            if (e.spitState == null) { e.spitState = 'idle'; e.spitTimer = 0; }
            e.spitTimer = Math.max(0, (e.spitTimer || 0) - dt);
            rState = e.spitState;
            rTimer = e.spitTimer;
          }
          const setRState = (next, timer) => {
            if (NV.enemyState) { e.intent.state = next; e.intent.stateTimer = timer; }
            else { e.spitState = next; e.spitTimer = timer; }
            rState = next; rTimer = timer;
          };
          const fireSpitterShot = () => {
            if (e.hookOwner) return; // F3: owner en Hook windup no dispara normal
            const tx0 = (e.spitAimX != null ? e.spitAimX : st.player.x);
            const ty0 = (e.spitAimY != null ? e.spitAimY : st.player.y);
            const ang = Math.atan2(ty0 - e.y, tx0 - e.x);
            if (bullets.length < MAX_BULLETS && st.enemyBulletCount() < MAX_ENEMY_BULLETS)
              bullets.push({ x: e.x, y: e.y, vx: Math.cos(ang) * SPIT_BULLET_SPEED, vy: Math.sin(ang) * SPIT_BULLET_SPEED, damage: e.damage, color: e.color, isEnemy: true, dead: false, stunChance: e.stunChance || 0, stunDuration: e.stunDuration || 0, sourceEnemy: e, sourceType: e.enemyTypeId || 'ranged', projectileStyle: HOSTILE_RANGED_STYLES[e.enemyTypeId] || 'genericBolt' });
            e.shootTimer = 0;
            e.spitFired = true;
          };
          if (rState === 'idle') {
            e.shootTimer = e.shootTimer || 0;
            e.spitFired = false;
            setRState('positioning', Math.max(rTimer || 0, 0.2));
          } else if (rState === 'positioning') {
            e.shootTimer = (e.shootTimer || 0) + dt;
            e.spitFired = false;
            if (dist < SPIT_NEAR) {
              setRState('retreat', 0.6);
            } else if (dist >= SPIT_NEAR && dist <= SPIT_FAR && e.shootTimer >= SPIT_CYCLE && !e.hookWindup) {
              const pvx = st.player.moveVx || 0, pvy = st.player.moveVy || 0;
              const tof = dist / SPIT_BULLET_SPEED;
              let lx = pvx * tof * SPIT_LEAD_FACTOR, ly = pvy * tof * SPIT_LEAD_FACTOR;
              const lm = Math.hypot(lx, ly);
              if (lm > SPIT_LEAD_CAP) { lx *= SPIT_LEAD_CAP / lm; ly *= SPIT_LEAD_CAP / lm; }
              e.spitAimX = st.player.x + lx;
              e.spitAimY = st.player.y + ly;
              e.spitFired = false;
              setRState('windup', SPIT_WINDUP);
            } else {
              let mx, my;
              if (dist > SPIT_FAR) {
                mx = (pdx / invD) * spd * 0.5; my = (pdy / invD) * spd * 0.5;
              } else {
                const sx = (-pdy / invD) * e.spitStrafe, sy = (pdx / invD) * e.spitStrafe;
                const drift = (dist - SPIT_BAND_MID) / Math.max(SPIT_FAR - SPIT_NEAR, 1);
                mx = sx * spd * 0.4 + (pdx / invD) * spd * 0.25 * drift;
                my = sy * spd * 0.4 + (pdy / invD) * spd * 0.25 * drift;
              }
              e.x += mx * dt + kbx * dt;
              e.y += my * dt + kby2 * dt;
            }
          } else if (rState === 'windup') {
            // F3: el Hook owner NO dispara normal durante el Hook windup (gate completo).
            if (!(e.hookOwner || e.hookWindup) && rTimer <= 0) {
              fireSpitterShot();
              setRState('recovery', SPIT_RECOVERY);
            } else if ((e.hookOwner || e.hookWindup) && rTimer <= 0) {
              setRState('positioning', 0.2);
            }
          } else if (rState === 'attack') {
            // F3: el Hook owner NO dispara normal durante el Hook windup/attack.
            if (e.hookOwner || e.hookWindup) {
              setRState('positioning', 0.2);
            } else {
              if (!e.spitFired) fireSpitterShot();
              setRState('recovery', SPIT_RECOVERY);
            }
          } else if (rState === 'recovery') {
            if (rTimer <= 0) setRState('positioning', 0.2);
          } else if (rState === 'retreat') {
            e.spitFired = false;
            const rx = (-pdx / invD), ry = (-pdy / invD);
            e.x += rx * spd * 0.6 * dt + kbx * dt;
            e.y += ry * spd * 0.6 * dt + kby2 * dt;
            if (dist > SPIT_NEAR + 30 || rTimer <= 0) setRState('positioning', 0.2);
          } else {
            setRState('positioning', 0.2);
          }
          // Separación ranged (cuadrícula, no O(n²)): mismo radio (radius+...)*0.7
          // y mismo empuje ((minD-od)*1.2*dt) que antes. Vale en todos los estados.
          forEachGridNeighbor(e, grid, (other) => {
            if (other.dead) return;
            const od = Math.hypot(other.x - e.x, other.y - e.y);
            const minD = (e.radius + other.radius) * 0.7;
            if (od > 0 && od < minD) {
              const a2 = Math.atan2(e.y - other.y, e.x - other.x);
              const push = (minD - od) * 1.2 * dt;
              e.x += Math.cos(a2) * push;
              e.y += Math.sin(a2) * push;
            }
          });
          if (NV.enemyState) NV.enemyState.computeSteering(e);
          // ===== F3: Hook/Pull reservation (specter_archer only, wave >= 15) =====
          // Condiciones: specter_archer, wave >= unlock, local cooldown <= 0,
          // hookSystem idle, lockout <= 0, no owner, no normal ranged windup/attack.
          if (e.enemyTypeId === 'specter_archer'
              && wave >= NV.BALANCE.HOOK_UNLOCK_WAVE
              && (e.hookCooldown || 0) <= 0
              && hookSystem
              && hookSystem.phase === 'idle'
              && (hookSystem.lockoutTimer || 0) <= 0
              && !e.hookOwner
              && rState !== 'windup' && rState !== 'attack') {
            e.hookOwner = true;
            hookSystem.phase = 'windup';
            hookSystem.windupTimer = NV.BALANCE.HOOK_WINDUP_TIME;
            hookSystem.srcEnemy = e;
            e.hookWindup = true;
          }
        }
      }

      // Separación suave común para enemigos cuerpo a cuerpo: evita que varios
      // chase/kami/erratic/shield se apilen sobre el mismo punto del jugador.
      // Cuadrícula espacial (no O(n²)): mismo minD (r+r+6) y mismo empuje que antes.
      const goliathCommitted = isEliteGoliath(e)
        && (e.goliathState === 'slam_windup' || e.goliathState === 'aftershock_window' || e.goliathState === 'recovery');
      if (NV.isEnemyCombatActive(e) && e.behavior !== 'ranged' && !isElitePhantom(e) && !goliathCommitted && !(e.enemyTypeId === 'wisp' && e.wispPhaseState !== 'drift')) {
        const idx = enemies.indexOf(e);
        forEachGridNeighbor(e, grid, (other) => {
          if (other.dead) return;
          const dx = e.x - other.x, dy = e.y - other.y;
          const od = Math.hypot(dx, dy);
          const minD = e.radius + other.radius + 6;
          if (od < minD) {
            // superposición exacta: dirección determinística por índice (igual que antes)
            const a = od > 0 ? Math.atan2(dy, dx) : (idx - enemies.indexOf(other)) * 2.399963229728653;
            const push = Math.min(1.6, (minD - od) * 7 * dt);
            e.x += Math.cos(a) * push;
            e.y += Math.sin(a) * push;
          }
        });
      }

      e.knockVelX = (e.knockVelX || 0) * 0.92;
      e.knockVelY = (e.knockVelY || 0) * 0.92;

            const d = Math.hypot(e.x - st.player.x, e.y - st.player.y);
      const inContact = d < e.radius + 20;
      const contactDamageEnabled = (e.enemyTypeId !== 'specter_grunt' || specterChargeContactActive)
        && (e.enemyTypeId !== 'swarmlet' || swarmContactActive)
        && (e.enemyTypeId !== 'wisp' || wispContactActive)
        && !isElitePhantom(e)
        && !isElitePredator(e)
        && !isEliteGoliath(e);
      if (contactDamageEnabled && inContact && st.player.invuln <= 0 && (e.contactCd || 0) <= 0) {
        if (swarmCommitContactActive) e.swarmCommitContactSpent = true;
        const baseDmg = e.isElite ? (e.eliteDamage || 0) : e.damage;
        const hit = applyPlayerDamage(baseDmg, { cause: 'contact', enemy: e });
        if (hit.dodged) {
          e.atkFlash = 0.25; // gesto corto: destaca QUÉ enemigo intentó golpear
        } else if (hit.applied) {
          const contactAngle = d > 0 ? Math.atan2(e.y - st.player.y, e.x - st.player.x) : e.angle || 0;
          const contactPush = Math.max(90, (e.speed || 0) * 1.2) * (1 - (e.knockbackRes || 0) * 0.5);
          e.knockVelX = Math.cos(contactAngle) * contactPush;
          e.knockVelY = Math.sin(contactAngle) * contactPush;
          e.contactCd = 1.0;
          e.atkFlash = 0.45; // gesto de ataque: el render destaca QUÉ enemigo está golpeando
          if (st.spawnExplosion) st.spawnExplosion(player.x + Math.cos(contactAngle) * 12, player.y + Math.sin(contactAngle) * 12, 3, '#ff6b6b', 0.5); // chispa de impacto en el punto de contacto
          if (e.enemyTypeId === 'specter_grunt' && specterChargeContactActive) {
            // La carga es un ataque consumible, no una muerte kamikaze: tras un
            // impacto aplicado el grunt sobrevive y queda expuesto en recovery.
            e.specterChargeState = 'recovery';
            e.specterChargeTimer = SPECTER_GRUNT_RECOVERY;
          } else {
            // El resto de contactos conserva la semántica global: cada pérdida de
            // HP tiene una causa única y el atacante pasa por puntos/xp/drops.
            e.dead = true;
            if (st.onKill) st.onKill(e);
          }
          // F4: stun central (roll único + anti-stunlock). El stun NO bloqueó el
          // daño de contacto (la puerta de arriba ya no exige stun <= 0).
          const contactCanStun = e.enemyTypeId !== 'spitter' && e.enemyTypeId !== 'specter_elite_void';
          if (contactCanStun && NV.tryApplyPlayerStun) NV.tryApplyPlayerStun(st.player, e.stunDuration || 0, e.stunChance || 0, e, { addFloatText });
          shake = Math.max(shake, hit.crit ? 0.3 : 0.15);
          if (hit.killed) { gameOver = true; return { enemies: enemies.filter((x) => !x.dead), shake, gameOver }; }
        }
      }
        }
    // ===== F3: Hook/Pull state machine (after enemy loop, before fusion) =====
    // idle -> windup -> projectile -> tether -> idle (+ lockout).
    // El pull del jugador se aplica en game.js (player update ordering).
    // Limpieza source removal/fusion: si el source ya no está en el array vivo
    // (filtrado por killEnemy/fusión del frame), invalidar el hook antes de tickear.
    if (hookSystem && hookSystem.srcEnemy && (hookSystem.phase === 'windup' || hookSystem.phase === 'projectile' || hookSystem.phase === 'tether')) {
      if (!enemies.includes(hookSystem.srcEnemy)) NV.resetHookState(hookSystem);
    }
    if (hookSystem) NV.updateHookSystem(dt, hookSystem, enemies, player, {
      hazards: st.hazards || [], W: st.W, H: st.H,
    });
    // Fusión posterior al movimiento/contacto del frame: si 3+ enemigos de la
    // misma especie quedaron tocándose, se condensan en uno más grande y peligroso.
    fuseEnemies(enemies, st);
    return { enemies: enemies.filter((e) => !e.dead), shake, gameOver };
  };
})();