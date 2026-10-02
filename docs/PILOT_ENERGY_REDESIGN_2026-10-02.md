# Pilotos — rediseño rechazado y recuperación (02-10-2026)

**Continuación posterior:** también se retiró del laboratorio la segunda
propuesta de arte. El laboratorio actual conserva el renderer de producción y
experimenta exclusivamente con movimiento/variación. Ver
PILOT_STABILITY_LAB_2026-10-02.md; los apartados de propuesta abajo son históricos.

**ESTADO ACTUAL:** el usuario rechazó el rediseño corporal al verlo en
ABRIR_JUEGO_FRESH. Se retiró por completo de producción: renderer, CSS,
preferencia, checkbox, miniaturas Canvas, hook del loop y QA de esa propuesta.
El texto debajo conserva el registro histórico; NO describe el juego actual.

## Recuperación y nuevo punto de partida

Los cuerpos vuelven exactamente al renderer previo al rediseño, incluidos sus
ojos, paletas, deformación, corrientes y anillos. Se conservaron las especiales
de la tarea independiente SPECIAL_REMASTER_2026-10-02.md. No se tocaron ataques,
balance, hitboxes, cámara, eventos ni enemigos.

Comparación de las fuentes con Windows7a9PJk: los70 archivos js/css/assets son
equivalentes normalizando fin de línea y salto final; index.html coincide tras
quitar el overlay3D experimental tal como hace build_release. La entrega ya
existente es la misma implementación recuperada, por lo que no se generó otra
copia completa de Electron. JUGAR NEON VOID.cmd ahora apunta a Windows7a9PJk.
ABRIR_JUEGO_FRESH sigue sirviendo las fuentes locales, ahora restauradas.

Validación actual:

- npm test:158 suites,0 fallos. Log:previews/special-remaster-2026-10-02/tests-rollback.txt.
- Web:24 casos reales (4 pilotos ×3 dificultades ×desktop/landscape), activación,
  movimiento, pausa, fin de especial y las4 esquinas por piloto y entorno. PASS.
  Evidencia:previews/pilot-recovery-2026-10-02/web/report.json.
- Electron recuperado: inicio, aislamiento, guardado/resume y partida. PASS.
  Evidencia:previews/pilot-recovery-2026-10-02/electron/report.json.
- Verificación previa de las4 especiales en la misma entrega Electron: PASS,
  previews/special-remaster-2026-10-02/electron/report.json.

La nueva propuesta está exclusivamente en dev/pilot-concepts/index.html y
concepts.js. Se abre como archivo HTML o desde el servidor local. Compara el
renderer anterior real con una propuesta animada a escala ampliada y de combate.
No carga gameplay, ajustes ni guardados. No está referenciada por index.html
del juego, ni incluida en la lista de empaquetado de Electron.

Dirección alternativa: contornos angulares asimétricos, oscuro interior con
corrientes luminosas, membranas fragmentadas, paletas anteriores y ojos reales.
BOTI conserva cian/azul; NOVA rojo/naranja; ROOK violeta con remolinos dorados;
ENJAMBRE ámbar con órbitas que pasan delante y detrás de su núcleo. Las formas
fluctúan continuamente; se abandonó la propuesta de membranas redondeadas.

Comparación verificada en1280×1050,915×412 y844×390; sin overflow horizontal ni
errores JS. Screenshot:previews/pilot-recovery-2026-10-02/concept/comparison.png.
La valoración estética humana está pendiente. Este prototipo NO está aprobado
ni integrado en combate; su rendimiento integrado y compatibilidad con estados
de daño/dash/especial deberán medirse si se decide avanzar con esta dirección.

Continuación: revisar la comparación con el usuario; afinar esa dirección y
después integrar sólo una propuesta que resulte convincente. No reintroducir
pilotEnergy.js, la preferencia pilotLook ni el checkbox rechazado.

## Registro histórico de la propuesta rechazada

Continuación visual posterior a SPECIAL_REMASTER_2026-10-02.md. Las especiales
recién verificadas se conservan. Base recuperable: Windows7a9PJk / webvhwktw.
No se modifican nombres, stats, hitboxes, ataques, AI, cámara ni timings lógicos.

## Arquitectura y decisión

El cuerpo anterior vive dentro de render/player.js: blobs angulares con jitter
aleatorio, goteos, líneas internas y dos ojos. Se conserva íntegro como alternativa.
El wrapper sigue dibujando specials, consumibles, blink, vida crítica, posesión,
stun y ojos. El nuevo render/pilotEnergy.js sólo sustituye el cuerpo, con la misma
posición y char.size. El movimiento lógico y los límites no se tocan.

Se preservan la energía viva, las paletas corporales reales, el núcleo central,
los ojos pequeños, los anillos de ENJAMBRE y la compatibilidad con especiales.
Las nuevas siluetas fluctúan con armónicos continuos y ritmos propios, sin jitter.

- BOTI: condensación fría de tres lóbulos, pliegue luminoso y filamentos verticales.
- NOVA: semilla de plasma cálido, tres erupciones curvas y núcleo incandescente.
- ROOK: masa gravitatoria ancha y lenta, membrana violeta y bandas doradas curvas.
- ENJAMBRE: matriz oblonga con tres núcleos internos y órbita aqua/dorada inclinada.

## Rollback

Ajustes → Gráficos → desactivar «Nuevo aspecto de pilotos». Es inmediato y
persistente en Web/Electron, conserva progreso y las especiales nuevas. Volver
a activarlo recupera el rediseño. No requiere editar archivos ni volver de build.
API de diagnóstico: NV.setPilotLook('legacy'|'energy'). No cambia dificultad.

La preferencia usa el almacenamiento central. Su notificación es específica de
apariencia, porque los listeners generales preexistentes reinician intención de
disparo. Alternar el aspecto no debe tocar esa intención ni la cadencia.

## Precaución de compatibilidad

El antiguo cuerpo consume Math.random por vértice (BOTI30/NOVA26/ROOK19/SWARM13).
El wrapper nuevo conserva exactamente ese avance del stream compartido para
que seleccionar otro aspecto no modifique la secuencia aleatoria del combate.
El renderer nuevo en sí es puro y no usa RNG. Desacoplar el RNG de todo el juego
sería otra tarea; no se introduce ese refactor aquí.

## Performance

Superficies y halos cacheados: hasta8 texturas96². Sin gradients nuevos por
frame, shadowBlur adicional, entidades ni partículas funcionales. Minimal
conserva la silueta/núcleo; reduce adornos. Miniaturas comparten el renderer puro
a20fps sólo al mostrar el selector; no consumen RNG del juego.

Validación final, entregas y comparación de coste: pendientes de cierre.
