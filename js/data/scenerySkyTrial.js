// Approved cosmic baseline shared by web, Android and Electron.
// Historical filename retained; future trials can override files separately.
(() => {
  'use strict';
  const NV=window.NV;
  const descriptions=[
    'Arco abierto de nebulosa turquesa sobre un gran vacío oscuro.',
    'Galaxia espiral distante, polvo cobrizo y sombra intergaláctica.',
    'Corrientes de gas violeta separadas por una oscura fractura cósmica.',
    'Nubes de polvo casi negras con un borde ciruela y magenta apagado.',
    'Luna oscura y corrientes difusas de polvo estelar rojizo.',
    'Nebulosa de jade y esmeralda suspendida entre amplios vacíos negros.',
    'Bóveda de gas azul profundo y un lejano borde planetario.',
    'Mundos oscuros, anillos tenues y bruma cósmica azul-violeta.'
  ];
  const files=Object.freeze(Object.fromEntries(NV.DIMENSION_VISUALS.map(p=>[p.id,'sky-'+p.id+'-v1.webp'])));
  const profiles=Object.freeze(NV.DIMENSION_VISUALS.map((p,i)=>Object.freeze(Object.assign({},p,{
    background:'#01030b',starfield:true,environmentType:'space',description:descriptions[i]
  }))));
  NV.dimensionSkyBaseline=Object.freeze({files,profiles});
  NV.dimensionSkyTrial=NV.dimensionSkyBaseline;
  NV.registerTrialSceneryArt(files);
})();
