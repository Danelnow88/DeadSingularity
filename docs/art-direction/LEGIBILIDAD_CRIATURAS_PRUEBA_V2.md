# Legibilidad de criaturas — muestra controlada

16/10/2026. La limpieza y el inventario no resuelven la lectura visual. Esta
etapa prueba una corrección de material y jerarquía, sin rediseñar todas las
criaturas ni prometer ahorro de GPU por sintetizar una textura.

## Ver la muestra

Abrir `previews/enemy-roster-canonical.html` (también PRUEBAS.cmd, opción 1).
Pulsar **Comparar legibilidad · Corredor**. Filtra Corredor y muestra actual y
propuesta con el mismo tamaño de cuerpo. El canvas se limita a 560 px CSS para
no agrandar automáticamente al quedar una sola tarjeta. La pausa general funciona.

Se usa un ciclo ilustrativo compartido, inspirado en amague/preparación/impulso,
no una simulación real de combate ni una nueva IA. No cambia la velocidad del
juego para hacer visible el arte. Otros enemigos siguen mostrando su arte actual.

## Cambio de arte

Entrada: `assets/cosmic-creatures/runner-synth-source-v1.png`.
Salida: `previews/concepts/runner-legibility-v2.png`.
Herramienta: edición integrada de imágenes. Original intacto.
Mantiene silueta, dos ojos, aletas y paleta; agrupa líneas/relieves, reduce puntos
y aumenta jerarquía ocular. La edición generativa no garantiza píxeles idénticos.
El rig conserva ojos móviles, párpados y tres piezas. Se reutiliza la placa limpia
original solo dentro de máscaras oculares; evaluar sus transiciones antes de
integrar. Namespace separado: `runnerLegibilityNV`; no reemplaza funciones NV.

## Validación

`node tools/preview-enemy-roster.cjs --capture`: lista de 29 entradas, espectros
actuales listos/dibujados, comparación aislada, ancho CSS máximo 560 y consola
sin errores. Evidencia: `local/validation/root-cleanup-20261016/`.
El dibujo sigue cacheado y no usa filtros/blur por frame. No se midió ahorro GPU.

## Siguiente paso

Validar lectura en esta escala y movimiento. Si funciona, extender la jerarquía
de masas/ojos al Espíritu y Escopuras, después a los tres espectros; no copiar
una silueta única. Los élites que el usuario considera legibles son referencia,
no candidatos a rehacer automáticamente. Mantener criaturas vivas no humanoides.
No integrar ninguna textura de esta etapa sin valoración visual.

## Prompt

Use case: precise-object-edit. Edit this exact two-eyed amber cosmic runner game sprite for readability at only 100 pixels wide in active combat. Preserve its recognizable curved nonhumanoid silhouette, two swept rear fins, facing LEFT, exact eye centers, same pose, framing and transparent background. Preserve black living cosmic skin, silver sculptural ridges and amber energy identity. SYNTHESIZE the interior: combine many tiny thin ribbons into a few broader rounded organic folds and softly shaded volumes, retain the major anatomical folds but substantially reduce hairline etching and micro-star glitter. Give the eye-bearing front a readable fleshy mass, like a living dimensional creature rather than ornamental tribal tattoo; do NOT add teeth, mouth, limbs, humanoid anatomy or armor. Enlarge BOTH eyes and their sockets about 20 percent around their original centers (first at x24.2%,y50.5%; second x44.9%,y63.0%) with large readable iris and white sclera. Keep color palette disciplined, reduce tiny white star dots, keep a few amber energy patches. Do not increase overall creature scale. Must remain recognizably this creature, not a new species, no fish shape, no legs. High-quality polished painted game sprite, broadly legible materials rather than dense wire-like lines. Single creature only.

