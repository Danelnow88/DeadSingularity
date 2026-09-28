const fs = require('fs');
const vm = require('vm');

const HTML = fs.readFileSync('index.html', 'utf8');
const CSS = fs.readFileSync('css/styles.css', 'utf8');
const PANEL_SOURCE = fs.readFileSync('js/ui/settingsPanel.js', 'utf8');

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('  ok  ' + name); }
  catch (error) { fail++; console.log('  FAIL ' + name + ' -> ' + error.message); }
}

function openingTagById(id) {
  const match = HTML.match(new RegExp('<([a-z][a-z0-9-]*)\\b[^>]*\\bid="' + id + '"[^>]*>', 'i'));
  if (!match) throw new Error('falta #' + id);
  return { tagName: match[1].toLowerCase(), source: match[0], index: match.index };
}

function attr(tag, name) {
  const match = tag.match(new RegExp('\\b' + name + '="([^"]*)"', 'i'));
  return match ? match[1] : null;
}

function elementFragmentById(id) {
  const opening = openingTagById(id);
  const tagPattern = new RegExp('<\\/?' + opening.tagName + '\\b[^>]*>', 'gi');
  tagPattern.lastIndex = opening.index;
  let depth = 0;
  let match;
  while ((match = tagPattern.exec(HTML))) {
    if (match.index < opening.index) continue;
    if (match[0][1] === '/') depth--;
    else depth++;
    if (depth === 0) return HTML.slice(opening.index, tagPattern.lastIndex);
  }
  throw new Error('cierre ausente para #' + id);
}

function containsId(fragment, id) {
  return new RegExp('\\bid="' + id + '"').test(fragment);
}

class ClassList {
  constructor(values) { this.values = new Set(values || []); }
  contains(value) { return this.values.has(value); }
  toggle(value, force) {
    if (force === true) this.values.add(value);
    else if (force === false) this.values.delete(value);
    else if (this.values.has(value)) this.values.delete(value);
    else this.values.add(value);
    return this.values.has(value);
  }
}

class Element {
  constructor(id, attrs, classes) {
    this.id = id || '';
    this.attributes = Object.assign({}, attrs);
    this.classList = new ClassList(classes);
    this.listeners = {};
    this.checked = false;
    this.value = this.attributes.value || '';
    this.textContent = '';
    this.title = '';
    this.parentNode = null;
    this.focused = false;
    this.hidden = Object.prototype.hasOwnProperty.call(this.attributes, 'hidden');
  }
  addEventListener(type, fn) { (this.listeners[type] || (this.listeners[type] = [])).push(fn); }
  emit(type, extra) {
    const event = Object.assign({ target: this, currentTarget: this, key: '', code: '', preventDefault() { this.prevented = true; } }, extra);
    (this.listeners[type] || []).forEach((fn) => fn(event));
    return event;
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null; }
  focus() { this.focused = true; }
  querySelector(selector) { return selector === 'output' ? this.output : null; }
}

const VOLUMES = [
  ['masterVolume', 'setMasterVolume'], ['musicVolume', 'setMusicVolume'],
  ['weaponsVolume', 'setWeaponsVolume'], ['uiVolume', 'setUiVolume'],
  ['playerVolume', 'setPlayerVolume'], ['enemiesVolume', 'setEnemiesVolume'],
  ['ambientVolume', 'setAmbientVolume'],
];

function runtime() {
  const ids = {};
  const make = (id, attrs, classes) => (ids[id] = new Element(id, attrs, classes));
  const panel = make('settingsPanel', {}, ['settings-overlay', 'hidden']);
  const desktop = make('settingsBtn');
  make('lobbySettingsBtn');
  const close = make('settingsClose');
  const mute = make('settingsMuteToggle');
  const particles = make('settingsParticles');
  const heavy = make('settingsHeavyVfx');
  const names = ['audio', 'controls', 'graphics'];
  const tabs = names.map((name, index) => make('tab' + name, {
    'data-tab': name,
    'aria-controls': 'panel' + name,
    'aria-selected': index === 0 ? 'true' : 'false',
  }, ['settings-tab'].concat(index ? [] : ['active'])));
  const panels = names.map((name, index) => make('panel' + name, {
    'data-tab': name,
    'aria-labelledby': 'tab' + name,
    'aria-hidden': index === 0 ? 'false' : 'true',
    ...(index ? { hidden: '' } : {}),
  }, ['settings-tab-panel']));
  const graphics = ['auto', 'high', 'performance'].map((value) => new Element('', { value }));
  graphics.forEach((element) => { element.value = element.attributes.value; });
  const fire = ['manual', 'legacy-auto'].map((value) => new Element('', { value }));
  fire.forEach((element) => { element.value = element.attributes.value; });
  const volumeInputs = VOLUMES.map(([key]) => {
    const input = make('settings-' + key, { 'data-setting': key, value: '100' }, ['settings-volume']);
    const row = new Element();
    row.output = new Element();
    input.parentNode = row;
    return input;
  });
  const docListeners = {};
  const document = {
    activeElement: desktop,
    documentElement: { attributes: {}, setAttribute(key, value) { this.attributes[key] = String(value); } },
    getElementById(id) { return ids[id] || null; },
    querySelectorAll(selector) {
      if (selector === '.settings-tab') return tabs;
      if (selector === '.settings-tab-panel') return panels;
      if (selector === '.settings-volume') return volumeInputs;
      if (selector === 'input[name="graphicsQuality"]') return graphics;
      if (selector === 'input[name="firePolicy"]') return fire;
      if (selector === '#lobbyDiffOptions .lobby-diff-btn') return [];
      return [];
    },
    addEventListener(type, fn) { (docListeners[type] || (docListeners[type] = [])).push(fn); },
  };
  const changes = [], calls = [];
  const NV = {
    soundOn: true,
    input: { setSettingsOpen(value) { calls.push(['setSettingsOpen', value]); } },
    settings: {
      audio: { masterVolume: .42, musicVolume: .31, weaponsVolume: .73, uiVolume: .64, playerVolume: .55, enemiesVolume: .46, ambientVolume: .27 },
      graphics: { quality: 'high', particles: true, heavyVfx: false },
      controls: { firePolicy: 'manual' },
      gameplay: { difficulty: 'normal' },
    },
    onSettingsChange(fn) { changes.push(fn); },
    setSoundEnabled(value) { this.soundOn = !!value; calls.push(['setSoundEnabled', value]); },
    setGraphicsQuality(value) { this.settings.graphics.quality = value; calls.push(['setGraphicsQuality', value]); changes.forEach((fn) => fn()); },
    setGraphicsOption(key, value) { this.settings.graphics[key] = value; calls.push(['setGraphicsOption', key, value]); changes.forEach((fn) => fn()); },
    setFirePolicy(value) { this.settings.controls.firePolicy = value; calls.push(['setFirePolicy', value]); changes.forEach((fn) => fn()); },
  };
  VOLUMES.forEach(([key, setter]) => {
    NV[setter] = (value) => {
      NV.settings.audio[key] = value;
      calls.push([setter, value]);
      changes.forEach((fn) => fn());
    };
  });
  vm.runInNewContext(PANEL_SOURCE, { window: { NV }, document, console, Array, Object, Number, Math }, { filename: 'settingsPanel.js' });
  return { NV, calls, changes, panel, desktop, close, mute, tabs, panels, graphics, fire, particles, heavy, volumeInputs };
}

function assertOnlyVisible(panels, expectedIndex) {
  const visible = panels.filter((panel) => panel.hidden === false);
  if (visible.length !== 1 || visible[0] !== panels[expectedIndex]) {
    throw new Error('paneles visibles=' + panels.map((panel) => panel.hidden ? '0' : '1').join(','));
  }
  panels.forEach((panel, index) => {
    const shouldShow = index === expectedIndex;
    if (panel.getAttribute('aria-hidden') !== (shouldShow ? 'false' : 'true')) throw new Error('aria-hidden incorrecto en panel ' + index);
  });
}

test('HTML define exactamente tres tabpanels dentro del contenedor de pestañas', () => {
  const settings = elementFragmentById('settingsPanelBody');
  const panels = settings.match(/\brole="tabpanel"/g) || [];
  if (panels.length !== 3) throw new Error('tabpanel=' + panels.length);
  const wrapper = elementFragmentById('settingsTabPanels');
  for (const id of ['panelAudio', 'panelControls', 'panelGraphics']) {
    if (!containsId(wrapper, id)) throw new Error(id + ' quedó fuera del contenedor');
    elementFragmentById(id);
  }
});

test('header y tabs quedan fuera del único contenedor scrollable de paneles', () => {
  const settings = elementFragmentById('settingsPanelBody');
  const wrapper = elementFragmentById('settingsTabPanels');
  const headIndex = settings.indexOf('class="settings-head"');
  const tabsIndex = settings.indexOf('id="settingsTabs"');
  const panelsIndex = settings.indexOf('id="settingsTabPanels"');
  if (headIndex < 0 || tabsIndex < 0 || panelsIndex < 0) throw new Error('estructura principal incompleta');
  if (!(headIndex < tabsIndex && tabsIndex < panelsIndex)) throw new Error('orden estructural incorrecto');
  if (/settings-head|id="settingsTabs"/.test(wrapper)) throw new Error('header o tabs quedaron dentro del scroll');
});

test('cada tab está asociado bidireccionalmente con su panel correcto', () => {
  for (const [suffix, key] of [['Audio', 'audio'], ['Controls', 'controls'], ['Graphics', 'graphics']]) {
    const tab = openingTagById('tab' + suffix).source;
    const panel = openingTagById('panel' + suffix).source;
    if (attr(tab, 'aria-controls') !== 'panel' + suffix || attr(tab, 'data-tab') !== key) throw new Error('tab' + suffix + ' mal asociado');
    if (attr(panel, 'aria-labelledby') !== 'tab' + suffix || attr(panel, 'data-tab') !== key) throw new Error('panel' + suffix + ' mal asociado');
  }
});

test('Audio contiene exclusivamente mute y los siete controles de volumen', () => {
  const audio = elementFragmentById('panelAudio');
  const required = ['settingsMuteToggle', 'settingsMasterVolume', 'settingsMusicVolume', 'settingsWeaponsVolume', 'settingsUiVolume', 'settingsPlayerVolume', 'settingsEnemiesVolume', 'settingsAmbientVolume'];
  for (const id of required) if (!containsId(audio, id)) throw new Error('Audio no contiene #' + id);
  for (const forbidden of ['settingsParticles', 'settingsHeavyVfx']) if (containsId(audio, forbidden)) throw new Error('Audio contiene #' + forbidden);
  if (/name="(?:firePolicy|graphicsQuality)"/.test(audio)) throw new Error('Audio contiene radios ajenos');
});

test('Controles contiene la política de disparo real y no contiene audio o gráficos', () => {
  const controls = elementFragmentById('panelControls');
  if ((controls.match(/name="firePolicy"/g) || []).length !== 2) throw new Error('firePolicy incompleto');
  for (const value of ['manual', 'legacy-auto']) if (!controls.includes('value="' + value + '"')) throw new Error('falta ' + value);
  if (/class="settings-volume"|name="graphicsQuality"|settingsParticles|settingsHeavyVfx/.test(controls)) throw new Error('Controles contiene opciones ajenas');
});

test('Gráficos contiene calidad, partículas y VFX, sin controles de audio/input', () => {
  const graphics = elementFragmentById('panelGraphics');
  if ((graphics.match(/name="graphicsQuality"/g) || []).length !== 3) throw new Error('calidades incompletas');
  for (const value of ['auto', 'high', 'performance']) if (!graphics.includes('value="' + value + '"')) throw new Error('falta ' + value);
  for (const id of ['settingsParticles', 'settingsHeavyVfx']) if (!containsId(graphics, id)) throw new Error('falta #' + id);
  if (/class="settings-volume"|name="firePolicy"/.test(graphics)) throw new Error('Gráficos contiene opciones ajenas');
});

test('paneles inactivos salen del layout mediante hidden nativo y CSS no lo anula', () => {
  for (const id of ['panelControls', 'panelGraphics']) {
    if (!/\shidden(?:\s|>)/.test(openingTagById(id).source)) throw new Error(id + ' no inicia oculto con hidden');
  }
  if (!/\.settings-tab-panel\[hidden\]\s*\{\s*display:\s*none\s*!important;\s*\}/.test(CSS)) throw new Error('falta regla efectiva [hidden]');
  if (/\.settings-tab-panel\s*\{[^}]*display:\s*block/.test(CSS)) throw new Error('display:block vuelve a anular el ocultamiento');
  if (/class="settings-tab-panel[^"]*\bhidden\b/.test(HTML)) throw new Error('tabpanels aún dependen de la clase hidden');
  if (!/\.settings-tab-panels\s*\{[^}]*overflow-y:\s*auto/.test(CSS)) throw new Error('scroll no está limitado al contenido activo');
  if (!/p\.hidden\s*=\s*!on/.test(PANEL_SOURCE)) throw new Error('runtime no actualiza hidden nativo');
});

test('el marco exterior tiene altura estable y el contenido absorbe el espacio restante', () => {
  if (!/\.settings-panel\s*\{[^}]*height:\s*(?!auto\b)[^;]+;[^}]*overflow:\s*hidden/.test(CSS)) {
    throw new Error('el modal no define una altura exterior estable');
  }
  if (!/\.settings-panel\s*\{[^}]*max-height:\s*100%/.test(CSS)) throw new Error('falta límite responsive del modal');
  if (!/\.settings-panel\s*>\s*\.settings-head,\s*\.settings-panel\s*>\s*\.settings-tabs\s*\{[^}]*flex:\s*0\s+0\s+auto/.test(CSS)) {
    throw new Error('header o tabs pueden encogerse con el contenido');
  }
  if (!/\.settings-tab-panels\s*\{[^}]*flex:\s*1\s+1\s+auto;[^}]*min-height:\s*0;[^}]*overflow-y:\s*auto/.test(CSS)) {
    throw new Error('el área común no ocupa el espacio restante con scroll interno');
  }
});

test('Audio, Controles y Gráficos dejan exactamente un panel visible', () => {
  const r = runtime();
  assertOnlyVisible(r.panels, 0);
  r.tabs[1].emit('click');
  assertOnlyVisible(r.panels, 1);
  r.tabs[2].emit('click');
  assertOnlyVisible(r.panels, 2);
  r.tabs[0].emit('click');
  assertOnlyVisible(r.panels, 0);
});

test('navegación por flechas activa, enfoca y muestra sólo el panel adyacente', () => {
  const r = runtime();
  const right = r.tabs[0].emit('keydown', { key: 'ArrowRight' });
  if (!right.prevented || !r.tabs[1].focused || r.tabs[1].getAttribute('aria-selected') !== 'true') throw new Error('ArrowRight no activó Controles');
  assertOnlyVisible(r.panels, 1);
  const left = r.tabs[1].emit('keydown', { key: 'ArrowLeft' });
  if (!left.prevented || !r.tabs[0].focused) throw new Error('ArrowLeft no volvió a Audio');
  assertOnlyVisible(r.panels, 0);
});

test('los siete sliders llaman exactamente a su setter y actualizan porcentaje', () => {
  const r = runtime();
  r.volumeInputs.forEach((input, index) => {
    r.calls.length = 0;
    input.value = String(11 + index);
    input.emit('input');
    const setterCalls = r.calls.filter((call) => call[0].startsWith('set') && call[0].endsWith('Volume'));
    if (setterCalls.length !== 1 || setterCalls[0][0] !== VOLUMES[index][1]) throw new Error('setter incorrecto: ' + JSON.stringify(setterCalls));
    if (setterCalls[0][1] !== (11 + index) / 100) throw new Error('conversión incorrecta');
    if (input.parentNode.output.textContent !== (11 + index) + '%') throw new Error('output no fue live');
  });
});

test('settings-change resincroniza sliders, controles y gráficos', () => {
  const r = runtime();
  for (const [key] of VOLUMES) r.NV.settings.audio[key] = .5;
  r.NV.settings.controls.firePolicy = 'legacy-auto';
  r.NV.settings.graphics = { quality: 'performance', particles: false, heavyVfx: true };
  r.changes.forEach((fn) => fn());
  if (r.volumeInputs.some((input) => input.value !== '50' || input.parentNode.output.textContent !== '50%')) throw new Error('audio no resincronizado');
  if (!r.fire[1].checked || r.fire[0].checked) throw new Error('firePolicy no resincronizado');
  if (!r.graphics[2].checked || r.graphics[0].checked || r.graphics[1].checked) throw new Error('calidad no resincronizada');
  if (r.particles.checked || !r.heavy.checked) throw new Error('toggles no resincronizados');
});

test('mute conserva la autoridad única y sincroniza estado externo', () => {
  const r = runtime();
  r.mute.emit('click');
  if (r.NV.soundOn || r.calls.filter((call) => call[0] === 'setSoundEnabled').length !== 1) throw new Error('mute no delegó');
  if (r.mute.getAttribute('aria-pressed') !== 'false' || !r.mute.classList.contains('off')) throw new Error('mute visual incorrecto');
  r.NV.soundOn = true;
  r.NV.settingsUI.syncMute();
  if (r.mute.getAttribute('aria-pressed') !== 'true' || r.mute.classList.contains('off')) throw new Error('sync externo incorrecto');
});

test('modal abre/cierra, bloquea input y restaura foco', () => {
  const r = runtime();
  r.desktop.emit('click');
  if (r.panel.classList.contains('hidden') || r.panel.getAttribute('aria-hidden') !== 'false') throw new Error('no abrió');
  if (!r.tabs[0].focused) throw new Error('no enfocó tab activa');
  r.close.emit('click');
  if (!r.panel.classList.contains('hidden') || r.panel.getAttribute('aria-hidden') !== 'true') throw new Error('no cerró');
  if (!r.desktop.focused) throw new Error('no restauró foco');
  const lifecycle = r.calls.filter((call) => call[0] === 'setSettingsOpen').map((call) => call[1]).join(',');
  if (lifecycle !== 'true,false') throw new Error('lifecycle input=' + lifecycle);
});

test('bindings existentes de controles y gráficos siguen conectados', () => {
  const r = runtime();
  r.fire[1].checked = true;
  r.fire[1].emit('change');
  r.graphics[0].checked = true;
  r.graphics[0].emit('change');
  r.particles.checked = false;
  r.particles.emit('change');
  r.heavy.checked = true;
  r.heavy.emit('change');
  const names = r.calls.map((call) => call[0]);
  for (const name of ['setFirePolicy', 'setGraphicsQuality', 'setGraphicsOption']) if (!names.includes(name)) throw new Error('falta ' + name);
});

console.log('RESULT settings_panel_tabs: pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);