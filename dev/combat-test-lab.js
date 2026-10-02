(() => {
  'use strict';
  const frame = document.getElementById('gameFrame');
  const encounterSelect = document.getElementById('encounterSelect');
  const playerSelect = document.getElementById('playerSelect');
  const waveInput = document.getElementById('waveInput');
  const waveField = document.getElementById('waveField');
  const difficultySelect = document.getElementById('difficultySelect');
  const durationInput = document.getElementById('durationInput');
  const enemyConfig = document.getElementById('enemyConfig');
  const bossConfig = document.getElementById('bossConfig');
  const bossSelect = document.getElementById('bossSelect');
  const weaponSelect = document.getElementById('weaponSelect');
  const weaponLevelInput = document.getElementById('weaponLevelInput');
  const weaponFusionInput = document.getElementById('weaponFusionInput');
  const firePolicySelect = document.getElementById('firePolicySelect');
  const rows = document.getElementById('compositionRows');
  const errors = document.getElementById('errors');
  const startBtn = document.getElementById('startBtn');
  const resetBtn = document.getElementById('resetBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const restartBtn = document.getElementById('restartBtn');
  const telemetry = {
    status: document.getElementById('tStatus'), wave: document.getElementById('tWave'),
    difficulty: document.getElementById('tDifficulty'), time: document.getElementById('tTime'),
    active: document.getElementById('tActive'), hp: document.getElementById('tHp'),
    bossHp: document.getElementById('tBossHp'), bossDamage: document.getElementById('tBossDamage'),
    fps: document.getElementById('tFps'), composition: document.getElementById('tComposition'),
  };
  let runtime = null;
  let catalog = [];
  let telemetryTimer = 0;

  function showErrors(messages) {
    const list = Array.isArray(messages) ? messages.filter(Boolean) : [];
    errors.textContent = list.join('\n');
    errors.classList.toggle('visible', list.length > 0);
  }

  function optionGroups(select, selectedId) {
    select.textContent = '';
    const groups = [
      { label: 'COMMON', items: catalog.filter((entry) => entry.spawnKind === 'normal' && !entry.spectral) },
      { label: 'SPECTRAL', items: catalog.filter((entry) => entry.spawnKind === 'normal' && entry.spectral) },
      { label: 'ELITE', items: catalog.filter((entry) => entry.spawnKind === 'elite') },
    ];
    for (const group of groups) {
      if (!group.items.length) continue;
      const optgroup = document.createElement('optgroup');
      optgroup.label = group.label;
      for (const entry of group.items) {
        const option = document.createElement('option');
        option.value = entry.id;
        option.textContent = entry.name + ' — ' + entry.id;
        if (entry.id === selectedId) option.selected = true;
        optgroup.appendChild(option);
      }
      select.appendChild(optgroup);
    }
  }

  function addCompositionRow(selectedId, quantity) {
    const row = document.createElement('div');
    row.className = 'composition-row';
    const select = document.createElement('select');
    select.className = 'enemy-select';
    optionGroups(select, selectedId);
    const input = document.createElement('input');
    input.className = 'enemy-quantity';
    input.type = 'number';
    input.min = '1';
    input.step = '1';
    input.value = String(quantity || 1);
    input.setAttribute('aria-label', 'Enemy quantity');
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove-row';
    remove.textContent = '×';
    remove.title = 'Remove enemy type';
    remove.addEventListener('click', () => row.remove());
    row.append(select, input, remove);
    rows.appendChild(row);
  }

  function selectedDurationMode() {
    const checked = document.querySelector('input[name="durationMode"]:checked');
    return checked ? checked.value : 'timed';
  }

  function readConfig() {
    const common = {
      characterId: playerSelect.value,
      difficultyId: difficultySelect.value,
      durationMode: selectedDurationMode(),
      durationSeconds: Number(durationInput.value),
    };
    if (encounterSelect.value === 'boss') {
      return Object.assign(common, {
        encounterMode: 'boss',
        bossIndex: Number(bossSelect.value),
        weaponId: weaponSelect.value,
        weaponLevel: Number(weaponLevelInput.value),
        weaponFusion: Number(weaponFusionInput.value),
        firePolicy: firePolicySelect.value,
      });
    }
    return Object.assign(common, {
      encounterMode: 'enemies',
      wave: Number(waveInput.value),
      composition: Array.from(rows.querySelectorAll('.composition-row')).map((row) => ({
        enemyId: row.querySelector('.enemy-select').value,
        quantity: Number(row.querySelector('.enemy-quantity').value),
      })),
    });
  }

  function syncEncounterControls() {
    const bossMode = encounterSelect.value === 'boss';
    enemyConfig.hidden = bossMode;
    bossConfig.hidden = !bossMode;
    waveField.hidden = bossMode;
  }

  function applyResult(result) {
    if (!result || !result.ok) showErrors(result && result.errors ? result.errors : ['Runtime command failed.']);
    else showErrors([]);
  }

  function prepareGameplayFocusTarget() {
    frame.tabIndex = 0;
    try {
      const doc = frame.contentDocument;
      const canvas = doc && doc.getElementById('game');
      if (canvas) canvas.tabIndex = 0;
      return canvas;
    } catch (error) {
      return null;
    }
  }

  function focusGameplay() {
    const canvas = prepareGameplayFocusTarget();
    try {
      frame.focus({ preventScroll: true });
      if (frame.contentWindow && typeof frame.contentWindow.focus === 'function') frame.contentWindow.focus();
      if (canvas && typeof canvas.focus === 'function') canvas.focus({ preventScroll: true });
      return true;
    } catch (error) {
      return false;
    }
  }

  function formatTime(value) {
    if (value == null) return '∞';
    const seconds = Math.max(0, value);
    return Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0');
  }

  function updateTelemetry() {
    if (!runtime) return;
    const snapshot = runtime.snapshot();
    telemetry.status.textContent = snapshot.status;
    telemetry.wave.textContent = String(snapshot.wave);
    telemetry.difficulty.textContent = String(snapshot.difficulty).toUpperCase();
    telemetry.time.textContent = formatTime(snapshot.elapsed) + ' / ' + formatTime(snapshot.remaining);
    telemetry.active.textContent = String(snapshot.activeEnemies);
    telemetry.bossHp.textContent = snapshot.boss && snapshot.boss.present
      ? Math.max(0, Math.ceil(snapshot.boss.hp)) + ' / ' + Math.ceil(snapshot.boss.maxHp)
      : '—';
    const bossReport = snapshot.telemetry && snapshot.telemetry.bosses
      ? (snapshot.telemetry.bosses.active || snapshot.telemetry.bosses.completed.slice(-1)[0])
      : null;
    telemetry.bossDamage.textContent = bossReport ? Math.round(bossReport.damage) + ' / ' + bossReport.hits + ' HITS' : '—';
    telemetry.hp.textContent = Math.max(0, Math.ceil(snapshot.player.hp)) + ' / ' + Math.ceil(snapshot.player.maxHp);
    telemetry.fps.textContent = snapshot.fps == null ? '—' : snapshot.fps.toFixed(1);
    telemetry.composition.textContent = snapshot.encounterMode === 'boss' && snapshot.boss
      ? (snapshot.boss.name || 'BOSS') + (snapshot.loadout ? ' · ' + snapshot.loadout.weaponId + ' LV.' + snapshot.loadout.weaponLevel + ' · FUS.' + snapshot.loadout.weaponFusion : '')
      : (snapshot.requestedComposition.length
        ? snapshot.requestedComposition.map((row) => row.enemyId + ' × ' + row.quantity).join(' · ')
        : 'No test started.');
    pauseBtn.textContent = snapshot.paused ? 'RESUME' : 'PAUSE';
    pauseBtn.disabled = snapshot.status !== 'RUNNING' && snapshot.status !== 'PAUSED';
    restartBtn.disabled = !snapshot.requestedComposition.length && !(snapshot.encounterMode === 'boss' && snapshot.loadout);
  }

  function populate() {
    catalog = runtime.getCatalog();
    for (const entry of runtime.getCharacters()) {
      const option = document.createElement('option');
      option.value = entry.id;
      option.textContent = entry.name + ' — ' + entry.id;
      playerSelect.appendChild(option);
    }
    for (const entry of runtime.getDifficulties()) {
      const option = document.createElement('option');
      option.value = entry.id;
      option.textContent = String(entry.label).toUpperCase();
      if (entry.selected) option.selected = true;
      difficultySelect.appendChild(option);
    }
    for (const entry of runtime.getBosses()) {
      const option = document.createElement('option');
      option.value = String(entry.index);
      option.textContent = entry.name + ' — WAVE ' + entry.canonicalWave;
      bossSelect.appendChild(option);
    }
    for (const entry of runtime.getWeapons()) {
      const option = document.createElement('option');
      option.value = entry.id;
      option.textContent = entry.name + ' — ' + entry.id;
      weaponSelect.appendChild(option);
      weaponLevelInput.max = String(entry.maxLevel || 100);
      weaponFusionInput.max = String(entry.maxFusion || 3);
    }
    addCompositionRow(catalog[0] && catalog[0].id, 1);
    startBtn.disabled = false;
    resetBtn.disabled = false;
    updateTelemetry();
    telemetryTimer = window.setInterval(updateTelemetry, 250);
  }

  function connectRuntime() {
    try {
      const win = frame.contentWindow;
      const candidate = win && win.NV && win.NV.combatLabRuntime;
      if (!candidate || !candidate.ready) return false;
      runtime = candidate;
      prepareGameplayFocusTarget();
      populate();
      return true;
    } catch (error) {
      showErrors(['Same-origin iframe access failed. Serve this page from the project root over HTTP.', error.message]);
      return false;
    }
  }

  function waitForRuntime() {
    if (connectRuntime()) return;
    let attempts = 0;
    const poll = window.setInterval(() => {
      attempts++;
      if (connectRuntime() || attempts >= 80) {
        window.clearInterval(poll);
        if (!runtime) showErrors(['Combat Lab runtime did not become ready. Serve the project through HTTP; file:// is not supported.']);
      }
    }, 250);
  }

  document.getElementById('addEnemyBtn').addEventListener('click', () => addCompositionRow(catalog[0] && catalog[0].id, 1));
  encounterSelect.addEventListener('change', syncEncounterControls);
  document.querySelectorAll('input[name="durationMode"]').forEach((radio) => {
    radio.addEventListener('change', () => { durationInput.disabled = selectedDurationMode() === 'infinite'; });
  });
  startBtn.addEventListener('click', () => {
    const result = runtime.start(readConfig());
    applyResult(result);
    if (result && result.ok) focusGameplay();
  });
  resetBtn.addEventListener('click', () => applyResult(runtime.reset()));
  restartBtn.addEventListener('click', () => {
    const result = runtime.restart();
    applyResult(result);
    if (result && result.ok) focusGameplay();
  });
  pauseBtn.addEventListener('click', () => {
    const snapshot = runtime.snapshot();
    const ok = snapshot.paused ? runtime.resume() : runtime.pause();
    if (!ok) showErrors(['Pause/resume is unavailable in the current state.']); else showErrors([]);
    updateTelemetry();
    if (ok && snapshot.paused) focusGameplay();
  });
  startBtn.disabled = true;
  resetBtn.disabled = true;
  pauseBtn.disabled = true;
  restartBtn.disabled = true;
  syncEncounterControls();
  frame.addEventListener('load', waitForRuntime, { once: true });
  window.addEventListener('beforeunload', () => { if (telemetryTimer) window.clearInterval(telemetryTimer); });
})();
