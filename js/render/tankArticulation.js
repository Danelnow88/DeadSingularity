// Presentation only: articulation samples existing AI timers and never advances them.
(() => {
  'use strict';
  const NV = window.NV;
  const clamp = x => Math.max(0, Math.min(1, x));
  const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  NV.drawTankMuzzleFlame = function (ctx, e) {
    if (!e.tankCannonShotEmitted || e.tankCannonState !== 'recovery') return;
    const elapsed = (NV.ENEMY_ROLE_REWORK?.tank?.recovery || 1.05) - Math.max(0, Number(e.tankCannonTimer) || 0);
    if (elapsed < 0 || elapsed >= .12) return;
    const f = 1 - elapsed / .12, length = 3 + 5 * f, spread = .8 + 1.6 * f;
    ctx.save();ctx.globalAlpha *= f * .88;ctx.shadowBlur = 0;
    ctx.fillStyle = '#d8b98d';ctx.beginPath();ctx.moveTo(-.5,-spread);
    ctx.quadraticCurveTo(length * .48,-spread * 1.28,length,0);
    ctx.quadraticCurveTo(length * .48,spread * 1.28,-.5,spread);ctx.closePath();ctx.fill();
    ctx.fillStyle = '#fff0d5';ctx.beginPath();ctx.moveTo(0,-spread*.48);
    ctx.quadraticCurveTo(length*.4,-spread*.55,length*.72,0);
    ctx.quadraticCurveTo(length*.4,spread*.55,0,spread*.48);ctx.closePath();ctx.fill();ctx.restore();
  };
  NV.tankArticulationPose = function (e) {
    const cfg = NV.ENEMY_ROLE_REWORK?.tank;
    if (e?.tankCannonState === 'windup') {
      const elapsed = (cfg?.windup || .9) - Math.max(0, Number(e.tankCannonTimer) || 0);
      return { extension: ease(elapsed / .58), recoil: 0 };
    }
    if (e?.tankCannonState === 'recovery') {
      const elapsed = (cfg?.recovery || 1.05) - Math.max(0, Number(e.tankCannonTimer) || 0);
      return { extension: 1 - ease((elapsed - .22) / .50), recoil: .10 * (1 - ease(elapsed / .16)) };
    }
    return { extension: 0, recoil: 0 };
  };
})();
