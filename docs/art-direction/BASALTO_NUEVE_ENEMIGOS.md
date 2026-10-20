# Basalto oscuro — nueve enemigos

19/10/2026. Aplicado a Corredor, Tanque, Enjambrito, Escopuras, Espíritu,
Kamikaze, Espectro Arquero, Espectro Guardia y Espectro Núcleo.
Solo se cambia el material marfil. No se trasladan los rediseños de horror
del laboratorio de jefes, ni se cambian los jefes del juego. La extensión posterior
a Asesino, Fantasma y Goliat se describe al final de este documento.

## Implementación

`js/render/singularityFamily.js` prepara cada cuerpo usando un grafo SVG de
transferencia selectiva en sRGB. La máscara combina R>G>B, croma bajo y rechazo
de naranja saturado. Preserva cian, naranja, rosado, lima, blanco neutro,
rojo, amarillo, verde y violeta de los órganos. Conserva materia índigo.
El basalto mantiene luminancia relativa mediante gamma, sombras azul-negras y
reflejos gris-azulados; no es un negro plano.

Se procesa únicamente al cargar: nueve cuerpos y las tres piezas articuladas
del cañón. La textura ya recoloreada se dibuja por la ruta habitual. No hay nuevos
draws por criatura, filtros/blur en el bucle ni lecturas de píxeles en producción.
No se editan PNG originales, transparencia fuente, recortes, dimensiones, tamaños
visibles, hitboxes, estadísticas, spawn, IA, temporizadores o mapas de luz.

Las contribuciones filtrada y original se suman como regiones complementarias
premultiplicadas para conservar alfa. El contexto de preparación vuelve a 'none'.
Si no existe soporte DOM/Canvas para filtros, se conserva el original como fallback;
la apariencia basalto se verificó en Electron/Chromium y file://, no en todos los
navegadores móviles existentes.

## Verificación

- `node tests/basalt_material.js`: 12 preparaciones, un grafo, sin filtros por
  frame, readbacks ni mutaciones de entidades.
- `node tools/qa-singularity-family.cjs`: nueve especies en roster y combate real,
  tamaños anteriores, estados congelados, transparencia y ruta file://.
- Muestras sintéticas: marfil oscurece; los nueve acentos se conservan dentro de
  un nivel de cuantización; alfa parcial se conserva dentro de un nivel.
- Evidencia: `local/validation/singularity-family-v1/qa.json`,
  `production-size-review.png` y `combat.png`.

No se midió una mejora de FPS ni se promete coste cero al cargar. El número de
dibujos y las texturas por frame no aumenta. Para revertir, omitir el filtro en
prepare(); las imágenes originales nunca se sustituyeron.
## Extensión a los tres élites

Asesino, Fantasma y Goliat comparten ahora el mismo tono basalto, mediante el perfil `elite` del servicio `NV.cachedBasaltMaterialFilter`. Su máscara admite marfil neutro y reflejos rosados/violetas de las placas, sin aplicar el material a las lentes de los ojos. Se conservan escala, mirada, postura, mecánicas, luz de energía y transparencia de Fantasma. Los PNG originales no cambian. Se procesa una vez al preparar cada textura, no en cada cuadro.

Verificación: captura de `tools/preview-refined-elites.cjs --capture --readability`, animación, seguimiento de mirada, integración en el renderer de combate y entidades inmutables. No implica una medición de FPS ni una mejora de rendimiento.

## Extensión a Núcleo I, II y III

Perfil `core` en el mismo servicio, preparado durante la carga de `inertiaChamber.js`.
Se procesa cuerpo y carcasa articulada (tres cuerpos, dos carcasas), nunca el atlas
de llamas. Máscara de piedra neutra/rosada con rechazo adicional de amarillo para
preservar las inscripciones del Núcleo II. Se conservan el cristal cian del I,
las grietas magenta del III, transparencias, tamaños, anclajes y física de propulsión.
Los PNG originales no se modifican. El fallback sin lectura de píxeles de file://
también recibe basalto. Sin filtros de material ni capas adicionales por cuadro.

QA: `node tools/qa-core-basalt.cjs` comprueba las tres cargas, máscara de color,
animación de propulsores, entidades inmutables, transformaciones y carga file://;
produce una lámina ampliada y a escala real en `local/validation/core-basalt/cores.png`.

