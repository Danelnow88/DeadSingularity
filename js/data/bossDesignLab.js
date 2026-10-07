// Datos visuales exactos de jefesV11.txt; no alteran combate ni colisiones.
(() => {
'use strict';
const NV = window.NV;
NV.BOSS_DESIGNS = Object.freeze([
  {
    bossIndex: 1,
    id: 'boss_1_jefe',
    name: 'JEFE',
    color: '#3a72ff',
    radius: 52,
    shape: 'hex_mandala',
    behavior: 'orbit_pulse',
    category: 'BOSS',
    family: 'BOSS-SPECTRAL',
    cost: 'HEAVY',
    designPass: 'hex_core_vortex',
    note: 'Rosetón estelar con ondas de gravedad concéntricas, destellos en cruz hiper-lumínicos y núcleo abisal latente.'
  },
  {
    bossIndex: 2,
    id: 'boss_2_titan',
    name: 'TITÁN',
    color: '#89b8ff',
    radius: 54,
    shape: 'star8_crystalline',
    behavior: 'charge',
    category: 'BOSS',
    family: 'BOSS-SPECTRAL',
    cost: 'HEAVY',
    designPass: 'star_layered_crystal',
    note: 'Estrella helada con campo de esquirlas orbitales, destellos de refracción de diamante y aura electromagnética.'
  },
  {
    bossIndex: 3,
    id: 'boss_3_senor_del_vacio',
    name: 'SEÑOR DEL VACÍO',
    color: '#2a88ff',
    radius: 56,
    shape: 'vortex_singularity',
    behavior: 'summon',
    category: 'BOSS',
    family: 'BOSS-SPECTRAL',
    cost: 'HEAVY',
    designPass: 'singularity_abyssal',
    note: 'REFINADO: Espirales de filamentos ultra-finitos en azul eléctrico, micro-órbitas de agujas gravitatorias y discos de acreción interconectados.'
  },
  {
    bossIndex: 4,
    id: 'boss_4_guardian',
    name: 'GUARDIÁN',
    color: '#b0c8ff',
    radius: 50,
    shape: 'icosahedron_eye',
    behavior: 'circle',
    category: 'BOSS',
    family: 'BOSS-SPECTRAL',
    cost: 'HEAVY',
    designPass: 'sacred_prism_eye',
    note: 'REFINADO: Geometría sagrada extendida con aristas secundarias hyper-finas, aureolas de anillos concéntricos con runas del lore y trazos continuos.'
  },
  {
    bossIndex: 5,
    id: 'boss_5_destructor',
    name: 'DESTRUCTOR',
    color: '#ff2a7a',
    radius: 54,
    shape: 'hyper_star_supernova',
    behavior: 'burst',
    category: 'BOSS',
    family: 'BOSS-SPECTRAL',
    cost: 'HEAVY',
    designPass: 'supernova_star_canonical',
    note: 'REFINADO MÁXIMO: Micro-espines de alta densidad en el perímetro exterior, filamentos rosados y cian ultrafinos entrelazados con continuidad limpia.'
  },
  {
    bossIndex: 6,
    id: 'boss_6_nemesis',
    name: 'NÉMESIS',
    color: '#5cd2ff',
    radius: 52,
    shape: 'star_diamond_cross',
    behavior: 'teleport',
    category: 'BOSS',
    family: 'BOSS-SPECTRAL',
    cost: 'HEAVY',
    designPass: 'crystal_diamond_star',
    note: 'Estrella en cruz de cuatro espadas de cristal con campo de fuerza cuántico, aura de teletransporte y núcleo cegador.'
  },
  {
    bossIndex: 7,
    id: 'boss_7_coloso',
    name: 'COLOSO',
    color: '#ff3333',
    radius: 56,
    shape: 'volcanic_crystal_star',
    behavior: 'slam_wave',
    category: 'BOSS',
    family: 'BOSS-SPECTRAL',
    cost: 'HEAVY',
    designPass: 'magma_star_monolith',
    note: 'Estrella volcánica con erupciones de magma flotantes, halo de fuego incandescente y núcleo de ojo volcánico hirviente.'
  },
  {
    bossIndex: 8,
    id: 'boss_8_fantasma',
    name: 'FANTASMA',
    color: '#84e1ff',
    radius: 46,
    shape: 'ether_comet',
    behavior: 'phase',
    category: 'BOSS',
    family: 'BOSS-SPECTRAL',
    cost: 'HEAVY',
    designPass: 'spectral_comet_tail',
    note: 'Cometa etéreo con cola fluida multicapa de niebla espectral, filamentos de energía brillante y halo intangible de ánimas.'
  },
  {
    bossIndex: 9,
    id: 'boss_9_mutante',
    name: 'MUTANTE',
    color: '#d662ff',
    radius: 54,
    shape: 'chaos_spiked_star',
    behavior: 'split_orbit',
    category: 'BOSS',
    family: 'BOSS-SPECTRAL',
    cost: 'HEAVY',
    designPass: 'multi_eye_chaos_star',
    note: 'Estrella caótica con descargas eléctricas violáceas, espinas de cristal alienígena en rotación y enjambre de ojos vigiles.'
  },
  {
    bossIndex: 10,
    id: 'boss_10_apocalipsis',
    name: 'APOCALIPSIS',
    color: '#ff5500',
    radius: 58,
    shape: 'solar_cataclysm_star',
    behavior: 'rage_cataclysm',
    category: 'BOSS',
    family: 'BOSS-SPECTRAL',
    cost: 'HEAVY',
    designPass: 'cataclysm_black_sun',
    note: 'REFINADO FINAL: Corona de destellos de agujas ultra-finitas en degradé amarillo/naranja, órbitas de partículas de fuego continuo alrededor del sol negro.'
  }
].map(entry => Object.freeze(entry)));
NV.attachBossDesign = function(boss, index) {
  const design = NV.BOSS_DESIGNS[index];
  if (!boss || !design) return boss;
  boss.visual = design;
  boss.designPass = design.designPass;
  boss.bossIndex = design.bossIndex;
  return boss;
};
})();
