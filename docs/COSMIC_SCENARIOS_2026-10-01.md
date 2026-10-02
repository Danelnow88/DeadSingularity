# NEON VOID — refactor visual de escenarios, 01-10-2026

## Resultado y alcance

Cuatro regiones cósmicas, sin cuadrícula, sobre el estado local avanzado.
No se usa el remoto como baseline. Se conserva todo cambio previo, incluso
archivos ya borrados por trabajos anteriores; no hubo reset, staging, commit,
push ni eliminación de archivos/builds durante esta tarea.

El corte está implementado, probado y empaquetado; no queda una conexión parcial.
No cambia progresión, balance, daño, HP, spawns, AI, colisiones, audio, controles,
dimensiones de arena ni comportamiento de cámara/worldMetrics.

## Arquitectura encontrada y conservada

- IIFE Canvas2D: `render/sectors.js` ya posee perfiles y renderer sectorial.
- `engine/expedition.js` decide rutas/bosses; `game.js` mantiene la oleada real.
- Son CUATRO fondos, no diez: `min(3,floor((wave-1)/5))`. Historia nueva tiene
  diez bosses en veinte oleadas; el fondo NO cambia con cada boss. Legacy e
  infinito conservan su misma selección (infinito mantiene el cuarto después de 20).
- La autoridad de mundo/cámara sigue en `core/viewport.js` y `NV.worldMetrics`.
  Vista desktop 900×520, arena 1350×780; móvil arena=1.5× vista dinámica.
- No se añade cámara, viewport, estado de gameplay, librería ni dependencia.

## Identidades visuales

| Región | Oleadas | Composición y referencias de posición |
| --- | --- | --- |
| UMBRAL | 1–5 | Río diagonal de nebulosa fría, luna inferior izquierda, bolsa índigo y vacío entre cúmulos. |
| FUNDICIÓN | 6–10 | Forja estelar: gigante eclipsado arriba-derecha, remolino cálido, tres grandes restos y polvo mineral. No vigas/paneles industriales. |
| FRACTURA | 11–15 | Fisura quebrada de grosor desigual, nubes violeta/azul y masas fragmentadas a ambos lados. |
| CORAZÓN DEL VACÍO | 16–20+ | Singularidad descentrada, lente de acreción oblicua, filamentos gravitatorios y cúmulo distante. |

Las cuatro composiciones son diferentes, no una plantilla recoloreada. El arte
es oscuro y apagado; blancos/rojos luminosos siguen perteneciendo al combate.
Las masas, grieta y singularidad son DECORACIÓN: no obstáculos/hazards nuevos.
La lectura humana de esta distinción sigue formando parte del playtest.

## Cámara y percepción de movimiento

Arte colocado en `(0,0,arenaW,arenaH)`, bajo el transform de mundo existente.
Nebulosas, luna, cuerpos, fragmentos y estrellas estáticas tienen coordenadas
deterministas del mundo: al mover cámara pasan al lado opuesto en pantalla.
No siguen al jugador ni hacen wrapping. Hay espacios vacíos, pero no un fondo
uniforme. El starfield lejano animado y la capa rítmica existentes permanecen
como decoración secundaria, no como única referencia de desplazamiento.

El zoom cinemático transforma esas mismas texturas, sin recalcular su posición.
No se modifican los límites físicos, HUD, NO HUD ni la posición de amenazas.

## Cuadrícula eliminada

Se retira el bucle de líneas cada 40 unidades, `drawGrid`, `gridRgb`, flags
`grid` y modo diagnóstico `no-grid`. Este último ahora es inválido, no un no-op
engañoso. Tests dejan de exigir grilla/Umbral completamente vacío y comprueban
ausencia de esas ramas, identidades y cache. El spatial grid de enemigos se
conserva: es estructura de simulación, no dibujo del terreno. No se reemplaza
la grilla por hexágonos, checkerboard ni puntos equidistantes.

## Rendimiento y límites del cache

Dos superficies offscreen del sector actual, mediante OffscreenCanvas o canvas
separado no insertado en DOM. Procedural se ejecuta al cambiar sector/arena:
gradientes, trazados y polvo NO se generan cada frame de producción. El fallback
directo conserva el mismo arte en harnesses que no tienen superficies Canvas.

- `full`: composición principal + detalle secundario, dos drawImage/frame.
- `reduced`: mismos hitos, detalle secundario atenuado a 35%; dos drawImage.
- `minimal`: mismos hitos y sin capa secundaria; un drawImage.
- Cache invalidado por sector o arenaW/H, nunca por frame, cámara, DPR o tier.
- Sólo dos texturas activas, hasta 1536×1024 cada una (~12 MiB RGBA máximos).
  Desktop: 1350×780, 8.424 MB decimales (~8.03 MiB). No crece por runs anteriores.
- No se consume Math.random/RNG de gameplay. El hash de arte es determinista.

Se corrigió la integración visual de tiers: el código anterior buscaba
`performance/medium`, pero visualBudget realmente entrega `full/reduced/minimal`.
No se modifica visualBudget ni sus reglas de simulación/calidad.

En QA Edge, preparación de los tres sectores no iniciales: ~13–16.5 ms de
envío CPU; Umbral ya estaba caliente por el lobby. Los tiempos calientes bajo
resolución del reloj NO equivalen a coste GPU cero. Electron QA registró draw
p50≈0.60 ms/p95≈1.00 ms al iniciar, pero también spikes de frame al arrancar.
Son muestras cortas/headless, no promesa de FPS ni performance en tu hardware.

## Archivos modificados en ESTA tarea

- `js/render/sectors.js`: arte, cache acotado y diagnóstico decorativo.
- `js/game.js`: eliminar grilla/flag/modo y pasar tier real; sólo sección render.
- `tests/sector_visuals.js`: composiciones distintas, cache, tiers, resize,
  coordenadas de mundo, transparencia, RNG, fallback y límites de memoria.
- `tests/render_pipeline_diagnostics.js`: retirar diagnóstico obsoleto y
  reforzar ausencia de grilla/integración de tier.
- `tests/rhythm_analysis_render.js`: comprobar orden de capas sin esperar grilla.
- `tools/verify_alpha.cjs`: rama `--backgrounds-only`, reutilizando el QA local.
- `README.md`, `docs/ARCHITECTURE.md`, `docs/VISUAL_BIBLE.md`, `docs/TESTING.md`,
  `docs/PENDIENTES_REALES_2026-10-01.md`, este informe y `JUGAR NEON VOID.cmd`.

Otros cambios visibles en git status son anteriores y no se descartan.

## Verificación

- Baseline y cierre: `npm test`, 153 suites, cero fallos.
- Syntax checks: sectores, game, herramienta y tres tests modificados.
- Dirigidos: sector_visuals, render_pipeline_diagnostics (6 casos),
  rhythm_analysis_render (21 casos); incluidos en suite final.
- Diff y status revisados; `git -c core.safecrlf=false diff --check` sin errores.
- Skill de verificación visual aplicada con fallback al harness Edge CDP
  existente: agent-browser CLI no estaba instalado; no se instala nada.
- `previews/cosmic-backgrounds-visual-final/report.json`: 17 grupos, errors:[];
  cuatro regiones en desktop 1280×800 y móvil táctil emulado 915×412/844×390,
  movimiento horizontal/vertical, presupuesto, boss y hazards reales. Cambio
  real jefe oleada10 -> tienda -> desplegar11 -> FRACTURA confirmado.
- Atlas completo, full/minimal y capturas de combate inspeccionados. No grilla.
- `previews/cosmic-backgrounds-camera/report.json`: cinco layouts, conversión,
  recorridos físicos de los cuatro bordes, pausa, NO HUD y resize, errors:[].
- `previews/cosmic-backgrounds-integral-final/report.json`: tienda/checkpoint,
  muerte/victoria, diez bosses, spawns y láseres 2/4/6; sin excepciones/red externa.
- `previews/cosmic-backgrounds-integral-final/desktop-qa.json`: Electron
  pass:true, saved:true, playing y errors:[]. Perfil QA separado, no tus partidas.
- Fuentes `game.js`/`render/sectors.js` iguales por SHA-256 en ambos paquetes.

## Entregas y prueba humana

Windows: `releases/NEON-VOID-0.10.0-alpha-windows-FY9PMZ`.
Web: `releases/NEON-VOID-0.10.0-alpha-web-lCQ8mU`.
`JUGAR NEON VOID.cmd` apunta al EXE verificado. Entregas de cámara anteriores
preservadas, no sobrescritas ni borradas. Sólo las nuevas entregas llevan este arte.

Falta aprobación humana de estética/legibilidad y fluidez sostenida en combate
intenso, especialmente con brillo de pantalla bajo, música externa, zoom
cinemático y dispositivo móvil real/fullscreen/DPI. No se promete validación
física por tener capturas emuladas. Recorré una región en varias direcciones y
compará la siguiente; no debería parecer que la nebulosa te sigue.

Los pendientes de balance adulto, enemigos y off-screen de cámara NO se resuelven
como efecto lateral de arte; siguen en PENDIENTES_REALES_2026-10-01.md.
