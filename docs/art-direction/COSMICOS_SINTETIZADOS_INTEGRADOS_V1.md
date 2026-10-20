# Cósmicos sintetizados integrados · 15/10/2026

Solicitud aprobada: integrar los tres aspectos sintetizados, Espíritu +20%,
Corredor +5%, Escopuras al último tamaño aprobado. Se eligió 20% para Espíritu
dentro de la preferencia explícita 15–20%. No se amplía el Fantasma élite.

## Tamaños visuales

| Criatura | Tamaño del rig | Perfil común | Ancho de referencia 1080p |
|---|---:|---:|---:|
| Corredor | 100 × 1,05 = 105 | 0,46 | 103,04 px |
| Espíritu | 56 × 1,40 × 1,20 = 94,08 | 0,56 | 112,39 px |
| Escopuras | 90 × 1,35 = 121,5 | 0,48 | 124,42 px |

Referencia cámara 1920/900. Anchos incluyen márgenes transparentes. Radio físico
del Corredor sigue en 9. No se tocó ningún radio físico, IA, velocidad, daño,
composición, elegibilidad de oleada o telemetría. El pulso del Espíritu conserva
radio 68; Escopuras conserva proyectil verde y velocidad 325.

## Assets y animación

Copias exactas de las texturas aprobadas del visor, comprobadas por SHA-256:

- assets/cosmic-creatures/runner-synth-source-v1.png
- assets/cosmic-creatures/spitter-synth-source-v1.png
- assets/cosmic-creatures/wisp-synth-source-v1.png

Nuevas placas técnicas generadas con imagegen integrado, no CLI:

- assets/cosmic-creatures/runner-synth-clean-v1.png
- assets/cosmic-creatures/spitter-synth-clean-v1.png
- assets/cosmic-creatures/wisp-synth-clean-v1.png

Los originales previos y las propuestas en previews/concepts permanecen intactos.
El rig prepara su caché una sola vez: dibuja primero la textura aprobada, luego
usa la placa limpia SOLO dentro de las máscaras de ojos, nunca en el cuerpo
completo. Evita que cambios generativos incidentales alteren los pliegues aprobados.
Se ajustaron recortes de iris y posición de ojos al nuevo material. Conserva
seguimiento, párpados texturados, respiración y articulación por estados reales.

Sin nuevas partículas, filtros, sombras borrosas, lecturas de píxeles ni texturas
por cuadro. Mismas piezas y número de ojos: Corredor 3/2; Espíritu 1/1; Escopuras
1/4 (pieza móvil/ojos en estos últimos). La ampliación aumenta área visual: no se
afirma ahorro o estabilidad de FPS sin una comparación de rendimiento específica.

## Prompt de placas técnicas

En cada llamada se usó el correspondiente PNG sintetizado aprobado como objetivo.
Se reemplazó COUNT por TWO (runner), FOUR (spitter) u ONE (wisp):

Use case: precise-object-edit. Edit target: supplied approved transparent cosmic
game creature. Make an animation CLEAN PLATE, not a redesign. ONLY remove the
COUNT dark irises/pupils inside the existing eyeballs and replace those tiny
regions with matching pale gray-white veined sclera, as if each eyeball is blank.
Keep every original eye socket, eyelid, original eye size, eye position and
complete eye globe intact. Do NOT remove the eyes themselves. Do NOT change even
the surrounding highlights, silhouette, stars, body folds, color, pose, scale,
margins or canvas framing. Preserve transparency and EXACT source pixel dimensions,
1312 by 1199. No extra parts, no text, no background. This plate will be used only
inside masked eye sclera areas, the original approved body remains authoritative.

## Validación

- Tests de cachés, tamaños, pureza de entidades, ojos, blink y movimiento.
- Test de integración: fuentes idénticas al aprobado, dimensiones coincidentes,
  factores de escala y ausencia de lecturas/filtros en el render.
- Visores Electron con mirada y estados: tools/preview-cosmic-runner.cjs y
  tools/preview-cosmic-creatures.cjs --capture.
- Entrada normal con protocolo/CSP de producción: tools/qa-cosmic-production.cjs.
  Comprueba que cargan sin flags y se dibujan durante la partida; inyección de
  tres enemigos de diagnóstico solo en memoria del perfil temporal.
- Catálogo: tools/qa-roster-art.cjs; comparador: tools/preview-cosmic-readability.cjs.

Evidencia local en local/validation/cosmic-integrated-20261015/,
cosmic-production-20261015/, cosmic-runner-20261015/ y roster-art-20261015/.
Cerrar completamente el juego anterior y abrir ABRIR_V1.cmd.
