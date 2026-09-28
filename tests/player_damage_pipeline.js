// P0: autoridad única de aplicación de daño al jugador y regresiones de explosiones.
const fs = require('fs'), vm = require('vm');
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('  ok  ' + name); } catch (e) { fail++; console.log('  FAIL ' + name + ' -> ' + e.message); } }
function load(file, sbx) { vm.runInNewContext(fs.readFileSync(file, 'utf8'), sbx, { filename: file }); }
function sandbox() {
  const math = Object.create(Math);
  const sbx = { window: { NV: {} }, console, Math: math, Object, Array, Set, Map };
  for (const f of ['js/data/balance.js', 'js/data/gameData.js', 'js/engine/rhythm.js', 'js/engine/combat.js', 'js/engine/playerStun.js', 'js/engine/hazards.js', 'js/engine/enemies.js', 'js/engine/fx.js', 'js/engine/special.js', 'js/engine/bullets.js']) load(f, sbx);
  return sbx;
}
function damageState(NV, player, over) {
  return Object.assign({
    player, CHARACTERS: NV.CHARACTERS,
    calcEnemyDamage: (base) => ({ dmg: base, crit: false }),
    addFloatText() {}, sfx: { playerHit() {} }, onPlayerDamaged() {},
  }, over || {});
}
function killState(NV, enemy, player, over) {
  const base = {
    e: enemy, score: 0, player, weaponLevels: {}, weaponKills: {}, currentWeapon: { id: 'pistol' },
    WEAPON_KILLS_PER_LEVEL: 999, weaponKillProgress: () => 1,
    addFloatText() {}, spawnExplosion() {}, triggerFlash() {}, pickups: [], waveEvent: null, W: 900,
    sfx: { levelup() {}, explosion() {}, enemyDeath() {} },
  };
  return Object.assign(base, over || {});
}

t('pipeline aplica armor y devuelve resultado explícito', () => {
  const { window: { NV } } = sandbox();
  const player = { character: 'boti', hp: 100, armor: 4, permDodge: 0, invuln: 0, x: 0, y: 0 };
  const r = NV.applyPlayerDamage(20, damageState(NV, player));
  if (!r.applied || r.damage !== 16 || player.hp !== 84 || r.hpBefore !== 100 || r.hpAfter !== 84 || r.killed) throw new Error(JSON.stringify(r));
});

t('pipeline conserva modificadores recibidos de ROOK y NOVA', () => {
  const { window: { NV } } = sandbox();
  const rook = { character: 'rook', hp: 100, armor: 0, permDodge: 0, invuln: 0, x: 0, y: 0 };
  const nova = { character: 'nova', hp: 100, armor: 0, permDodge: 0, invuln: 0, x: 0, y: 0 };
  if (NV.applyPlayerDamage(20, damageState(NV, rook)).damage !== 17) throw new Error('ROOK');
  if (NV.applyPlayerDamage(20, damageState(NV, nova)).damage !== 24) throw new Error('NOVA');
});

t('projectile conserva crítico y dodge por default', () => {
  const sbx = sandbox(), NV = sbx.window.NV;
  let player = { character: 'boti', hp: 100, armor: 0, permDodge: 0, invuln: 0, x: 0, y: 0 };
  let r = NV.applyPlayerDamage(10, damageState(NV, player, { calcEnemyDamage: () => ({ dmg: 16, crit: true }), cause: 'projectile' }));
  if (!r.applied || !r.crit || r.damage !== 16) throw new Error('crit=' + JSON.stringify(r));
  player = { character: 'swarm', hp: 100, armor: 0, permDodge: 0, invuln: 0, x: 0, y: 0 };
  sbx.Math.random = () => 0;
  r = NV.applyPlayerDamage(10, damageState(NV, player, { cause: 'projectile' }));
  if (!r.dodged || r.applied || player.hp !== 100) throw new Error('dodge=' + JSON.stringify(r));
});

t('invulnerabilidad bloquea shield, phase y bulwark', () => {
  const { window: { NV } } = sandbox();
  for (const kind of ['shield', 'phase', 'bulwark']) {
    const player = { character: kind === 'phase' ? 'nova' : kind === 'bulwark' ? 'rook' : 'boti', hp: 100, armor: 0, permDodge: 0, invuln: 2, x: 0, y: 0 };
    player[kind] = 2;
    const r = NV.applyPlayerDamage(50, damageState(NV, player, { allowCrit: false, allowDodge: false, cause: 'hazard' }));
    if (r.applied || r.reason !== 'invulnerable' || player.hp !== 100) throw new Error(kind + '=' + JSON.stringify(r));
  }
});

t('hazard deshabilita crítico y dodge pero respeta armor/pasiva', () => {
  const sbx = sandbox(), NV = sbx.window.NV;
  sbx.Math.random = () => 0;
  const player = { character: 'rook', hp: 100, armor: 4, permDodge: 10, invuln: 0, x: 0, y: 0 };
  let critCalls = 0;
  const r = NV.applyPlayerDamage(20, damageState(NV, player, {
    allowCrit: false, allowDodge: false, cause: 'mine-explosion',
    calcEnemyDamage() { critCalls++; return { dmg: 999, crit: true }; },
  }));
  if (!r.applied || r.dodged || r.crit || critCalls !== 0 || r.damage !== 14 || player.hp !== 86) throw new Error(JSON.stringify({ r, critCalls }));
});

t('speaker mine aplica daño una sola vez, sin crit/dodge', () => {
  const sbx = sandbox(), NV = sbx.window.NV;
  const player = { character: 'boti', hp: 100, maxHp: 100, armor: 0, luck: 0, permDodge: 10, invuln: 0, x: 400, y: 400, xp: 0, xpToNext: 999, level: 1 };
  const mine = { type: 'speakerMine', state: 'armed', stateTime: 0, x: 410, y: 400 };
  const apply = (base, opts) => NV.applyPlayerDamage(base, damageState(NV, player, Object.assign({}, opts, { calcEnemyDamage() { throw new Error('crit no permitido'); } })));
  const ctx = { wave: 4, W: 900, applyPlayerDamage: apply, spawnExplosion() {}, spawnShockwave() {}, triggerFlash() {}, sfx: {} };
  NV.detonateSpeakerMine(mine, ctx); NV.detonateSpeakerMine(mine, ctx);
  if (player.hp !== 60 || mine.state !== 'detonating') throw new Error('hp=' + player.hp + ' state=' + mine.state);
});

t('kamikaze aplica 24 una sola vez y respeta invulnerabilidad', () => {
  const { window: { NV } } = sandbox();
  const player = { character: 'nova', hp: 100, maxHp: 100, armor: 0, luck: 0, permDodge: 10, invuln: 0, x: 400, y: 400, xp: 0, xpToNext: 999, level: 1 };
  const enemy = { x: 410, y: 400, hp: 0, maxHp: 10, score: 1, xp: 1, color: '#fff', behavior: 'kami' };
  const apply = (base, opts) => NV.applyPlayerDamage(base, damageState(NV, player, Object.assign({}, opts, { calcEnemyDamage() { throw new Error('crit no permitido'); } })));
  NV.killEnemy(killState(NV, enemy, player, { applyPlayerDamage: apply }));
  if (player.hp !== 71 || !enemy.kamikazeDamageApplied) throw new Error('hp=' + player.hp); // 24 * NOVA 1.2 = 29
  const protectedPlayer = Object.assign({}, player, { hp: 100, invuln: 1 });
  const protectedEnemy = { x: 410, y: 400, hp: 0, maxHp: 10, score: 1, xp: 1, color: '#fff', behavior: 'kami' };
  const protectedApply = (base, opts) => NV.applyPlayerDamage(base, damageState(NV, protectedPlayer, opts));
  NV.killEnemy(killState(NV, protectedEnemy, protectedPlayer, { applyPlayerDamage: protectedApply }));
  if (protectedPlayer.hp !== 100) throw new Error('atravesó invulnerabilidad');
});

t('pipeline reporta muerte del jugador', () => {
  const { window: { NV } } = sandbox();
  const player = { character: 'boti', hp: 5, armor: 0, permDodge: 0, invuln: 0, x: 0, y: 0 };
  const r = NV.applyPlayerDamage(10, damageState(NV, player, { allowCrit: false, allowDodge: false, cause: 'hazard' }));
  if (!r.killed || player.hp !== -5 || r.hpAfter !== -5) throw new Error(JSON.stringify(r));
});

t('specter_elite_void ranged conserva daño finito desde spawn hasta impacto', () => {
  const { window: { NV } } = sandbox();
  const enemies = [];
  NV.spawnElite({
    enemies, boss: null, wave: 17, W: 900, H: 520,
    ELITE_TYPES: NV.ELITE_TYPES.filter((type) => type.id === 'specter_elite_void'),
    MAX_HOSTILES: 30, MAX_HEAVY_HOSTILES: 7, waveEvent: null,
  });
  const source = enemies[0];
  if (!source || source.enemyTypeId !== 'specter_elite_void') throw new Error('spawn incorrecto');
  if (!Number.isFinite(source.damage) || source.damage !== source.eliteDamage) throw new Error('damage=' + source.damage + ' eliteDamage=' + source.eliteDamage);
  const player = { x: 100, y: 100, character: 'boti', hp: 120, maxHp: 120, armor: 0, permDodge: 0, bulwark: 0, invuln: 0, stun: 0 };
  const bullets = [{ x: 100, y: 100, vx: 0, vy: 0, damage: source.damage, color: source.color, radius: 5, isEnemy: true, dead: false, sourceEnemy: source, sourceType: source.enemyTypeId }];
  const apply = (base, opts) => NV.applyPlayerDamage(base, damageState(NV, player, Object.assign({}, opts, { allowCrit: false, allowDodge: false })));
  NV.updateBullets(0, { bullets, W: 900, H: 520, player, enemies: [], boss: null, CHARACTERS: NV.CHARACTERS, SHIELD_COOLDOWN: 1, applyPlayerDamage: apply, addFloatText() {}, killEnemy() {}, applyKnockback() {}, spawnExplosion() {} });
  if (!Number.isFinite(player.hp) || !Number.isFinite(player.maxHp) || player.maxHp <= 0 || player.hp >= 120) throw new Error('hp=' + player.hp + '/' + player.maxHp);
});

t('pipeline falla cerrado ante daño o salud no finitos', () => {
  const { window: { NV } } = sandbox();
  let player = { character: 'boti', hp: 100, maxHp: 100, armor: 0, permDodge: 0, invuln: 0, x: 0, y: 0 };
  let r = NV.applyPlayerDamage(undefined, damageState(NV, player, { allowCrit: false, allowDodge: false }));
  if (!r.killed || r.reason !== 'invalid-damage' || player.hp !== 0 || !Number.isFinite(player.hp)) throw new Error('damage=' + JSON.stringify(r));
  player = { character: 'boti', hp: NaN, maxHp: Infinity, armor: 0, permDodge: 0, invuln: 1, x: 0, y: 0 };
  r = NV.applyPlayerDamage(1, damageState(NV, player));
  if (!r.killed || r.reason !== 'invalid-player-health' || player.hp !== 0 || player.maxHp !== 1) throw new Error('health=' + JSON.stringify(r));
});

t('mutaciones repetidas permanecen finitas en waves representativas', () => {
  const { window: { NV } } = sandbox();
  for (const wave of [1, 5, 10, 20, 30, 40]) {
    const player = { character: 'boti', hp: 120 + wave, maxHp: 120 + wave, armor: wave % 6, permDodge: 0, invuln: 0, x: 0, y: 0 };
    for (let i = 0; i < 20 && player.hp > 0; i++) {
      const r = NV.applyPlayerDamage(3 + wave * 0.5, damageState(NV, player, { allowCrit: false, allowDodge: false }));
      if (!Number.isFinite(r.damage) || !Number.isFinite(player.hp) || !Number.isFinite(player.maxHp) || player.maxHp <= 0) throw new Error('wave=' + wave + ' i=' + i);
    }
  }
});

t('updateBullets usa pipeline y conserva comportamiento de proyectil', () => {
  const { window: { NV } } = sandbox();
  const player = { x: 100, y: 100, character: 'boti', hp: 20, armor: 0, permDodge: 0, bulwark: 0, invuln: 0, stun: 0 };
  const bullets = [{ x: 100, y: 100, vx: 0, vy: 0, damage: 8, color: '#f00', radius: 5, isEnemy: true, dead: false }];
  const apply = (base, opts) => NV.applyPlayerDamage(base, damageState(NV, player, opts));
  const r = NV.updateBullets(0, { bullets, W: 900, H: 520, player, enemies: [], boss: null, CHARACTERS: NV.CHARACTERS, SHIELD_COOLDOWN: 1, applyPlayerDamage: apply, addFloatText() {}, killEnemy() {}, applyKnockback() {}, spawnExplosion() {} });
  if (player.hp !== 12 || r.bullets.length !== 0 || r.gameOver) throw new Error(JSON.stringify({ hp: player.hp, r }));
});

function hostilePlayer() {
  return { x: 100, y: 100, character: 'boti', hp: 100, maxHp: 100, armor: 0, permDodge: 0, invuln: 0, bulwark: 0, stun: 0 };
}
function hostileBullet(over) {
  return Object.assign({ x: 100, y: 100, vx: 0, vy: 0, damage: 10, radius: 5, isEnemy: true, dead: false }, over || {});
}
function bulletStep(NV, player, bullets, events) {
  return NV.updateBullets(0, {
    bullets, W: 900, H: 520, player, enemies: [], boss: null, CHARACTERS: NV.CHARACTERS,
    SHIELD_COOLDOWN: 1, applyPlayerDamage(base, opts) {
      return NV.applyPlayerDamage(base, damageState(NV, player, Object.assign({}, opts, {
        allowCrit: false, allowDodge: false, onPlayerDamaged(event) { events.push(event); },
      })));
    },
    addFloatText() {}, killEnemy() {}, applyKnockback() {}, spawnExplosion() {},
  });
}

t('proyectiles enemigos y de jefe: primer daño, segundo bloqueado y daño al expirar', () => {
  const { window: { NV } } = sandbox();
  for (const source of ['enemy', 'boss']) {
    const player = hostilePlayer(), events = [];
    const bullets = [hostileBullet({ sourceType: source }), hostileBullet({ sourceType: source })];
    const first = bulletStep(NV, player, bullets, events);
    if (player.hp !== 90 || player.invuln !== 0.5 || events.length !== 1 || first.bullets.length !== 1) throw new Error(source + ': ' + JSON.stringify({ hp: player.hp, invuln: player.invuln, events: events.length }));
    bulletStep(NV, player, first.bullets, events);
    if (player.hp !== 90 || events.length !== 1) throw new Error(source + ': segundo impacto durante ventana');
    player.invuln = Math.max(0, player.invuln - 0.5);
    bulletStep(NV, player, first.bullets, events);
    if (player.hp !== 80 || player.invuln !== 0.5 || events.length !== 2) throw new Error(source + ': impacto tras caducar');
  }
});

t('contacto y proyectil en el mismo frame no acumulan daño', () => {
  const { window: { NV } } = sandbox(), player = hostilePlayer(), events = [];
  const enemy = { x: 100, y: 100, radius: 10, damage: 10, speed: 0, dead: false, behavior: 'chase', enemyTypeId: 'basic', knockVelX: 0, knockVelY: 0 };
  const apply = (base, opts) => NV.applyPlayerDamage(base, damageState(NV, player, Object.assign({}, opts, { allowCrit: false, allowDodge: false, onPlayerDamaged(e) { events.push(e); } })));
  const state = { enemies: [enemy], player, bullets: [], W: 900, H: 520, MAX_BULLETS: 200, MAX_ENEMY_BULLETS: 40, enemyBulletCount: () => 0, applyPlayerDamage: apply, addFloatText() {}, spawnExplosion() {} };
  NV.updateEnemies(0, state);
  if (player.hp !== 90 || player.invuln !== 0.5) throw new Error('contacto: hp=' + player.hp + ' invuln=' + player.invuln);
  bulletStep(NV, player, [hostileBullet()], events);
  if (player.hp !== 90 || events.length !== 1) throw new Error('contacto + proyectil: ' + player.hp);
});

t('max conserva protección larga, esquiva/bloqueo no generan ventana', () => {
  const sbx = sandbox(), NV = sbx.window.NV, player = hostilePlayer();
  player.invuln = 3;
  const bypass = NV.applyPlayerDamage(10, damageState(NV, player, { respectInvulnerability: false, allowDodge: false, allowCrit: false }));
  if (!bypass.applied || player.hp !== 90 || player.invuln !== 3) throw new Error('max: ' + player.invuln);
  player.invuln = 0;
  const dodger = hostilePlayer(); dodger.character = 'swarm';
  sbx.Math.random = () => 0;
  const dodge = NV.applyPlayerDamage(10, damageState(NV, dodger));
  if (!dodge.dodged || dodger.invuln !== 0 || dodger.hp !== 100) throw new Error('dodge');
  const blocked = NV.applyPlayerDamage(10, damageState(NV, player, { respectInvulnerability: true, allowDodge: false, allowCrit: false, postHitInvuln: 0 }));
  if (!blocked.applied || player.invuln !== 0) throw new Error('opt-out');
  player.invuln = 2;
  const ignored = NV.applyPlayerDamage(10, damageState(NV, player));
  if (ignored.applied || player.invuln !== 2 || player.hp !== 80) throw new Error('blocked');
  const reflected = hostileBullet(); player.invuln = 0; player.bulwark = 3;
  bulletStep(NV, player, [reflected], []);
  if (player.hp !== 80 || player.invuln !== 0 || reflected.isEnemy || reflected.dead) throw new Error('reflection');
});

t('proyectil que aturde conserva stun del impacto pese a invulnerabilidad nueva', () => {
  const sbx = sandbox(), NV = sbx.window.NV, player = hostilePlayer(), events = [];
  sbx.Math.random = () => 0;
  bulletStep(NV, player, [hostileBullet({ stunChance: 1, stunDuration: 0.7 }), hostileBullet()], events);
  if (player.hp !== 90 || player.invuln !== 0.5 || player.stun !== 0.7 || events.length !== 1) throw new Error(JSON.stringify({ hp: player.hp, invuln: player.invuln, stun: player.stun }));
});

t('ataques explícitos y explosiones discretas heredan la protección central', () => {
  const { window: { NV } } = sandbox();
  for (const cause of ['goliath-seismic-slam', 'goliath-aftershock', 'wisp-pulse', 'predator-execution', 'kamikaze-explosion', 'speaker-mine', 'specter-grunt-charge', 'swarmlet-commit']) {
    const player = hostilePlayer();
    const first = NV.applyPlayerDamage(10, damageState(NV, player, { cause, allowCrit: false, allowDodge: false }));
    const second = NV.applyPlayerDamage(10, damageState(NV, player, { cause, allowCrit: false, allowDodge: false }));
    if (!first.applied || second.applied || player.hp !== 90 || player.invuln !== 0.5) throw new Error(cause);
  }
});

t('zona Core conserva ticks de 0.50 s sin abrir protección global', () => {
  const { window: { NV } } = sandbox(), player = hostilePlayer(), hazards = [];
  const zone = NV.spawnCoreZone(hazards, { damage: 12, coreZoneOwnerId: 1 }, 100, 100);
  const state = NV.createMinefieldState(); state.spawnTimer = 999;
  const opts = [];
  const step = (dt) => NV.updateSpeakerMines(dt, hazards, state, {
    player, waveEvent: null, wave: 20, boss: null, transitioning: false,
    applyPlayerDamage(base, options) {
      opts.push(options);
      return NV.applyPlayerDamage(base, damageState(NV, player, Object.assign({}, options, { allowCrit: false, allowDodge: false })));
    },
  });
  step(zone.armTime); step(0.01);
  if (player.hp !== 94 || player.invuln !== 0 || opts[0].postHitInvuln !== 0) throw new Error('primer tick: ' + player.hp);
  step(0.49);
  if (player.hp !== 94) throw new Error('tick prematuro');
  step(0.01);
  if (player.hp !== 88 || player.invuln !== 0) throw new Error('segundo tick: ' + player.hp);
  player.invuln = 3;
  step(0.5);
  if (player.hp !== 88 || player.invuln !== 3) throw new Error('zona ignoró protección larga');
});

console.log('RESULT player_damage_pipeline: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);