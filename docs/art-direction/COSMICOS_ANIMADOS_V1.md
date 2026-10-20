# ESPÍRITU / ESCOPURAS — prueba animada v1, 15/10/2026

NOTA POSTERIOR: prueba aprobada e integrada. Estado vigente en
COSMICOS_INTEGRADOS_2026-10-15.md. Este documento conserva el proceso y las
mediciones iniciales; los tamaños y la mira se actualizaron al integrar.

Estado: laboratorio opt-in, NO integrado en partidas normales. Abrir
PROBAR_COSMICOS_ANIMADOS.cmd desde la raíz de DeadSingularity V1.

Se conservan los conceptos aprobados: Espíritu rojo v1, Escopuras verde v2.
No se retoca de nuevo la boca. Los rotores de los núcleos son referencia de
técnica de recorte/cache, no de movimiento ni anatomía.

## Movimiento y lectura

- Espíritu: cola oscilante, flotación, ligera inclinación, iris que sigue al
  jugador y párpado. Durante los 0,30 s de phase_out se desvanece el iris,
  dejando la esclerótica clara. Se conserva la desaparición y el aviso de
  destino de 0,48 s, pulso de 0,12 s y recuperación de 0,55 s.
- Escopuras: respiración leve, cuatro miradas y carga orgánica durante el
  windup existente de 0,60 s. Sifón articulado que se estira al disparar y vuelve
  durante los primeros 0,18 s de la recuperación original de 1 s; no queda
  estirado todo el tiempo que spitFired permanece activo. Un solo proyectil
  ilustrativo usa el renderer stunDroplet existente, no una nueva ráfaga.
  Sin rotación mecánica ni extremidades nuevas.
- La prueba reproduce estados y muestra proyectiles ilustrativos; no ejecuta
  una partida ni valida IA, daño o colisiones. Se conservan los avisos del
  renderer original. No se elimina telemetría: un ojo que blanquea no indica
  por sí solo dónde reaparecerá el enemigo.
- Corrección tras la captura del usuario: el párpado plano oscuro parecía un
  faltante de textura. Ahora lleva una región texturada cacheada del cuerpo.
  Revisado en local/validation/cosmic-creatures-20261015/states.png.

## Costo y límites

Dos placas compartidas y dos piezas móviles preparadas a 400 px de lado largo;
cinco iris y cinco párpados a 64 px. Por cuerpo: 3 drawImage (Espíritu) o 6
(Escopuras), más clips de ojos y un recorte adicional al parpadear. Sin blur,
filtros, lectura de píxeles ni generación de texturas por cuadro.
La inclinación es limitada para no voltear la ilustración frontal.
El renderer no escribe estados de simulación.

Normalmente no se descargan estos PNG: solo al abrir el laboratorio o invocar
prewarmCosmicCreatures explícitamente. Bandera NV.__cosmicCreatures aislada de
la propuesta mineral rechazada. NV.__cosmicStatic compara la articulación,
manteniendo mirada y flotación compartidas.

Los PNG originales permanecen en previews/concepts. Copias y placas editadas
están en assets/cosmic-creatures. La separación usa máscaras de recorte al
preparar: no son piezas 3D. La edición generativa puede introducir variaciones
locales; no se afirma igualdad matemática con el concepto original.

## Verificación reproducible

- node tests/cosmic_creatures.js
- node tools/preview-cosmic-creatures.cjs --capture
- node tools/performance/run_overlap.cjs --production-roster --hostiles=24 --visible --fullscreen --response-motion --seconds=8 --cosmic-creatures=reference --label=cosmic-rig-reference-20261015
- Repetir con --cosmic-creatures=articulated o static y etiqueta distinta.
- La comparación requiere 24 hostiles para incluir los dos tipos; la composición
  normal de diez de ese harness no incluye Espíritu. No confundir esta prueba
  forzada con una partida normal.
- FPS de rAF/cadencia del juego, no scanout físico ni tiempo GPU de hardware.
  No se garantiza 165 FPS por este cambio.

## Resultado exploratorio de rendimiento

Electron visible/fullscreen, 1920×1080, 24 hostiles, alta/full, partículas y
fondo reactivo, mismo harness y movimiento, 8 s por modo, sin trazado simultáneo:

| Modo | FPS medio | Intervalo p95 / p99 | Peor intervalo |
| --- | ---: | ---: | ---: |
| Referencia actual | 153,42 | 7,50 / 12,00 ms | 37,10 ms |
| Cósmicos sin articulación | 154,21 | 7,70 / 10,50 ms | 32,10 ms |
| Cósmicos articulados | 150,75 | 7,70 / 12,20 ms | 32,30 ms |

Informes íntegros: local/validation/overlap-performance/cosmic-rig-*-20261015.json.
Una pasada corta por modo no permite atribuir diferencias pequeñas al diseño:
NO demuestra ahorro, ni 165 FPS estables. Tampoco mide tiempo GPU de hardware.
Estos ensayos se hicieron después de texturar el párpado y antes del último
ajuste del rebote del sifón a 0,18 s de recovery. Ese ajuste final se verificó
funcionalmente en captura/QA, no se presenta como mejora medida de rendimiento.
Los diseños siguen opt-in: no se activa una supuesta optimización en producción.
QA general: 231 suites, cero fallos; captura: estados, mirada, movimiento,
pureza de entidades y aviso mark idéntico. Las texturas preparadas suman
aproximadamente 2,4 MiB de memoria RGBA compartida (no por enemigo).

## Prompts originales de las placas neutras

### wisp

Fuente: C:/Users/party/Desktop/DeadSingularity V1/previews/concepts/espiritu-cosmico-v1.png

Use case: precise-object-edit. Prepare a neutral body clean plate for a 2D cutout animation rig. Edit the attached APPROVED creature conservatively, NOT a new design. Keep EXACT original canvas size, transparent margins, framing, scale, pose, all unaffected silhouette edges, material, folds, colors, stars, silver highlights, texture and lighting. No restyling, no new details, no humanoid anatomy, no background. Genuine alpha transparency. Only make the following surgical removals for moving parts that the engine will restore from the original image: (1) Inside its ONE existing eye, remove the dark circular iris/pupil AND iris catchlights, filling that entire iris disc with matching softly shaded pale grey sclera so the existing eyeball is blank, with its surrounding black eyelid completely unchanged. Keep eye size, outline, placement and scleral material. Do not remove the eye socket or eye white; no black empty hole. (2) Remove ONLY the short trailing tail/wake extending to the RIGHT of the main coiled body, beginning at its narrow attachment near 63 percent of canvas width and 64 percent of canvas height. Keep the thick main curled body intact. At the tail's attachment leave a small natural underlying dark fold. The far-right trailing wake should now be transparent. This is a clean body layer, not the final assembled sprite. Never repaint the rest.

### spitter

Fuente: C:/Users/party/Desktop/DeadSingularity V1/previews/concepts/escopuras-cosmico-verde-v2.png

Use case: precise-object-edit. Prepare a neutral body clean plate for a 2D cutout animation rig. Edit the attached APPROVED creature conservatively, NOT a new design. Keep EXACT original canvas size, transparent margins, framing, scale, pose, all unaffected silhouette edges, material, folds, colors, stars, silver highlights, texture and lighting. No restyling, no new details, no humanoid anatomy, no background. Genuine alpha transparency. Only make the following surgical removals for moving parts that the engine will restore from the original image: (1) Inside ALL FOUR existing eyeballs, remove only their dark iris/pupil discs AND catchlights, replacing each disc with matching softly shaded pale grey sclera. Preserve the four eye shapes, sizes, placement, eyelids and scleral shading exactly. Leave four blank pale eyeballs, not black sockets. (2) Remove ONLY the projecting lower-front discharge siphon: the tube protruding from the body towards bottom-right, approximately canvas x 48-76 percent and y 58-94 percent. Do not change the rest of the creature outline. Reconstruct a small smooth dark cosmic fold beneath its root where the separate nozzle piece will pivot; where the tube extended outside the main body is now transparent. Keep all green stars, black folds and four eyes untouched outside these edits. Do not improve or redesign the removed nozzle: the original will be used as a separate piece. Never repaint the rest.

