// Menú de sistema único para escritorio y móvil. Conserva las acciones y datos
// históricos como fuentes de verdad; sólo cambia dónde se presentan.
(() => {
  'use strict';
  const d = document;
  const NV = window.NV = window.NV || {};
  const menu = d.getElementById('systemMenu');
  const toggle = d.getElementById('systemMenuToggle');
  const close = d.getElementById('systemMenuClose');
  const slot = d.getElementById('systemMusicSlot');
  const rhythm = d.getElementById('rhythm-widget');
  const original = {
    wave: d.getElementById('wave'), score: d.getElementById('score'), shards: d.getElementById('shards'),
    hpText: d.getElementById('hpText'), hpFill: d.getElementById('hpFill'), hpBar: d.querySelector('.hp-bar'),
    sound: d.getElementById('sound'), stats: d.getElementById('charBtn'), hud: d.getElementById('hudToggle'),
    settings: d.getElementById('settingsBtn'), fullscreen: d.getElementById('fullscreenBtn'),
  };
  const mirror = {
    wave: d.getElementById('systemWave'), score: d.getElementById('systemScore'), shards: d.getElementById('systemShards'),
    hpText: d.getElementById('systemHpText'), hpFill: d.getElementById('systemHpFill'), sound: d.getElementById('systemSoundBtn'),
  };
  if (!menu || !toggle) return;
  if (rhythm && slot) slot.appendChild(rhythm);

  function sync() {
    ['wave', 'score', 'shards', 'hpText'].forEach((key) => {
      if (original[key] && mirror[key]) mirror[key].textContent = original[key].textContent || '—';
    });
    if (original.hpFill && mirror.hpFill) {
      mirror.hpFill.style.width = original.hpFill.style.width || '100%';
      const critical = original.hpFill.classList.contains('critical') || (original.hpBar && original.hpBar.classList.contains('critical'));
      mirror.hpFill.classList.toggle('is-critical', critical);
    }
    if (original.sound && mirror.sound) {
      const on = original.sound.getAttribute('aria-pressed') !== 'false';
      mirror.sound.textContent = on ? '🔊 SONIDO' : '🔇 SILENCIO';
      mirror.sound.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }
  function setOpen(open) {
    menu.hidden = !open;
    d.documentElement.classList.toggle('nv-system-menu-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) { sync(); const target = menu.querySelector('button'); if (target) target.focus(); }
    else toggle.focus();
  }
  NV.systemMenu = { open: () => setOpen(true), close: () => setOpen(false), toggle: () => setOpen(menu.hidden) };
  toggle.addEventListener('click', () => NV.systemMenu.toggle());
  if (close) close.addEventListener('click', () => setOpen(false));
  menu.addEventListener('click', (event) => {
    const button = event.target.closest('[data-system-action]');
    if (!button) return;
    const action = button.getAttribute('data-system-action');
    if (action === 'pause' && NV.input && typeof NV.input.togglePause === 'function') NV.input.togglePause();
    else if (action === 'stats' && original.stats) original.stats.click();
    else if (action === 'hud' && original.hud) original.hud.click();
    else if (action === 'sound' && original.sound) original.sound.click();
    else if (action === 'settings' && original.settings) original.settings.click();
    else if (action === 'fullscreen' && original.fullscreen) original.fullscreen.click();
    sync();
    if (action !== 'sound' && action !== 'hud') setOpen(false);
  });
  d.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !menu.hidden) setOpen(false); });
  d.addEventListener('nv-game-state-change', () => { if (!menu.hidden) setOpen(false); });
  // Los tests/embeds mínimos pueden no exponer MutationObserver. El menú sigue
  // siendo interactivo allí; sólo pierde la sincronización reactiva automática.
  if (typeof MutationObserver === 'function') {
    const observer = new MutationObserver(sync);
    [original.wave, original.score, original.shards, original.hpText, original.hpFill, original.hpBar, original.sound]
      .filter(Boolean).forEach((node) => observer.observe(node, { childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:['style','class','aria-pressed'] }));
  }
  sync();
})();
