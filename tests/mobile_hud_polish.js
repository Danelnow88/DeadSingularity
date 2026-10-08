const fs = require('fs');

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log('  ok  ' + name); }
  catch (error) { fail++; console.log('  FAIL ' + name + ' -> ' + error.message); }
}

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('css/styles.css', 'utf8');
const finalMobile = fs.readFileSync('css/mobile.css', 'utf8');
const game = fs.readFileSync('js/game.js', 'utf8');
const mobile = fs.readFileSync('js/ui/mobileControls.js', 'utf8');

t('mobile arma/item incluyen canvas de icono y etiqueta legible', () => {
  for (const id of ['weaponIndicatorIcon', 'weaponIndicatorName', 'consumableIndicatorIcon', 'consumableIndicatorName']) {
    if (!html.includes('id="' + id + '"')) throw new Error('falta ' + id);
  }
  if (!mobile.includes('NV.drawWeaponIcon(iconCtx')) throw new Error('arma no reutiliza drawWeaponIcon');
  if (!mobile.includes('NV.drawConsumableIcon(iconCtx')) throw new Error('item no reutiliza drawConsumableIcon');
});

t('dock final agrupa equipo a la derecha y deja libre JEFE/DASH', () => {
  if (!html.includes('id="mobileLoadout"')) throw new Error('falta dock compartido');
  if (!finalMobile.includes('right:max(8px,var(--nv-safe-right,env(safe-area-inset-right')) throw new Error('safe area ausente');
  if (!finalMobile.includes('position:static !important; inset:auto !important; transform:none !important;')) throw new Error('switches todavía posicionados en el centro');
  if (!finalMobile.includes('width:222px; height:52px')) throw new Error('dock compacto ausente');
  if (!html.includes('</div>\n        </div>\n        <button id="touchUseBtn"') && !html.includes('</div>\r\n        </div>\r\n        <button id="touchUseBtn"')) throw new Error('USAR debe estar separado del equipo');
  if (!finalMobile.includes('height:84px !important')) throw new Error('acciones no ampliadas');
  if (!finalMobile.includes('width:clamp(210px,27vw,280px)')) throw new Error('agarre amplio ausente');
});

t('especial mobile integra progreso, segundos y estado listo', () => {
  if (!html.includes('id="touchSpecialStatus"')) throw new Error('falta estado integrado');
  if (!css.includes('conic-gradient(from -90deg')) throw new Error('falta anillo de progreso');
  if (!mobile.includes("style.setProperty('--special-progress'")) throw new Error('JS no publica progreso visual');
  if (!mobile.includes("ready ? 'LISTO'")) throw new Error('falta estado LISTO');
  if (!mobile.includes('Math.ceil(Math.max(0, info.remaining || 0))')) throw new Error('falta tiempo restante');
});

t('estado especial reutiliza cooldown existente sin cambiar valores ni activación', () => {
  if (!game.includes('remaining = Math.max(0, player.specialCd || 0)')) throw new Error('no lee specialCd existente');
  if (!game.includes('1 - remaining / max')) throw new Error('normalización de progreso inesperada');
  if (!game.includes('if (combatIntent.abilityIntent && player.specialCd <= 0) useSpecial();')) throw new Error('activación especial alterada');
  if (game.includes('player.specialCd = char.maxCd + 0.5;')) throw new Error('game.js no debe reasignar cooldown');
});

t('contador enemigo y combo quedan apilados upper-left en canvas', () => {
  if (!game.includes('if (!mobilePresentation) {') || !game.includes('viewY() + 43')) throw new Error('telemetría secundaria no se limita a desktop');
  if (!game.includes('ctx.translate(vx, vy)') || !game.includes("mobilePresentation ? { x: 12, y: 83 } : null")) throw new Error('combo mobile no conserva una posición segura en la vista trasladada');
  if (game.includes('ctx.fillText(countText, barX + barW + 8, barY + 10)')) throw new Error('contador superior-centro antiguo sigue activo');
});

t('desktop conserva la posición legacy del combo y sólo relocaliza enemigos', () => {
  const hud = fs.readFileSync('js/render/hud.js', 'utf8');
  if (!hud.includes('opts.x == null ? 10')) throw new Error('x legacy del combo desktop cambió');
  if (!hud.includes('opts.y == null ? 20')) throw new Error('y legacy del combo desktop cambió');
  if (!game.includes("mobilePresentation ? { x: 12, y: 83 } : null")) throw new Error('desktop no delega al default legacy');
});

t('switching e input especial conservan las rutas existentes', () => {
  for (const token of ["bindCycleIndicator(weaponIndicator,'cycleWeapon')", "bindCycleIndicator(consumableIndicator,'cycleConsumable')", "bindHeldAction(specialBtn, 'setSpecial')", 'input[setter](true)', 'input[setter](false)']) {
    if (!mobile.includes(token)) throw new Error('ruta de input ausente: ' + token);
  }
});

console.log('RESULT mobile_hud_polish: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);
