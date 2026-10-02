// Aparición anticipada: reserva presupuesto, avisa, materializa y recién activa IA.
// Sin partículas persistentes, setTimeout ni otro contador de oleada.
(() => {
  'use strict';
  const NV = window.NV;
  NV.beginEnemyArrival = function (enemy, state) {
    if (!state.announceSpawn) return enemy;
    enemy.arrival = { stage: 'warning', remaining: .9, duration: .9 };
    return enemy;
  };
  NV.updateEnemyArrival = function (enemy, dt, state) {
    const a = enemy.arrival;
    if (!a) return false;
    a.remaining = Math.max(0, a.remaining - dt);
    if (a.remaining > 0) return true;
    const player = state.player;
    const occupied = player && Math.hypot(player.x - enemy.x, player.y - enemy.y) < enemy.radius + (player.radius || 20) + 25;
    if (occupied && a.stage === 'warning') {
      // No surgir sobre el piloto ni bloquear la oleada: mudar aviso y repetirlo.
      const W = state.W || 900, H = state.H || 520;
      const target = NV.enemyArenaPosition({ radius: enemy.radius,
        x: player.x < W * .5 ? W : 0, y: player.y < H * .5 ? H : 0 }, W, H);
      enemy.x = target.x; enemy.y = target.y;
      a.stage = 'warning'; a.remaining = a.duration = .9;
      return true;
    }
    if (a.stage === 'warning') {
      a.stage = 'puff'; a.remaining = a.duration = .22;
      return true;
    }
    enemy.arrival = null;
    return true; // Este frame todavía muestra el final; IA activa desde el siguiente.
  };
  NV.drawEnemyArrival = function (ctx, enemy) {
    const a = enemy.arrival;
    if (!a || enemy.dead) return false;
    const progress = Math.max(0, Math.min(1, 1 - a.remaining / a.duration));
    const radius = Math.max(12, Math.min(22, enemy.radius));
    ctx.save(); ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ff3b4f'; ctx.fillStyle = '#b7c6d0'; ctx.lineWidth = 2.5;
    if (a.stage === 'warning') {
      // Una sola X: dos diagonales procedurales; sin anillo, fuente ni emoji.
      const half = radius * (.72 + .055 * Math.sin(progress * Math.PI * 3));
      ctx.lineCap = 'round'; ctx.globalAlpha = .65 + progress * .3;
      ctx.beginPath();
      ctx.moveTo(enemy.x-half, enemy.y-half); ctx.lineTo(enemy.x+half, enemy.y+half);
      ctx.moveTo(enemy.x-half, enemy.y+half); ctx.lineTo(enemy.x+half, enemy.y-half);
      ctx.stroke();
      ctx.globalAlpha *= .28; ctx.lineWidth = 5; ctx.stroke();
    } else {
      // Puff detrás del cuerpo: centro denso y lóbulos/fragmentos ligeros.
      ctx.globalAlpha = .3 * (1 - progress);
      ctx.beginPath(); ctx.arc(enemy.x, enemy.y, radius * (.48 + progress * .4), 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI * 2 / 8;
        const offset = radius * (.35 + progress * 1.2);
        ctx.globalAlpha = (i % 2 ? .20 : .35) * (1 - progress);
        ctx.beginPath(); ctx.arc(enemy.x + Math.cos(angle) * offset,
          enemy.y + Math.sin(angle) * offset, (i % 2 ? 3 : 6) + (1-progress) * 3, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Warning oculta el cuerpo; puff ya no lo oculta. La protección de contacto
    // y targetability .22s permanece, sin alterar IA/daño ni crear otro spawn.
    ctx.restore(); return a.stage === 'warning';
  };
})();
