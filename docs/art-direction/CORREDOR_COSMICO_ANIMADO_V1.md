# CORREDOR CÓSMICO — prueba animada v1, 15/10/2026

Estado actualizado: INTEGRADO por autorización del usuario el 15/10/2026.
Partida normal y catálogo usan js/render/cosmicRunner.js, con las dos imágenes
en assets/cosmic-creatures/. El visor PROBAR_CORREDOR_COSMICO.cmd comparte ese
módulo y permite comparar con legacy. IA, daño, velocidad, radio 9 y spawn no
cambian. El lanzador de prueba deja el perfil de partidas del usuario intacto.
La preparación técnica y mediciones siguientes documentan la etapa de laboratorio.
QA de integración real: tools/qa-cosmic-production.cjs, con protocolo y CSP de
producción, sin banderas de activación; captura y reporte en
local/validation/cosmic-integrated-20261015/. No se afirma estabilidad a 165 FPS.

## Qué muestra

- Izquierda: animación ampliada; abajo, el concepto original sin modificar.
- Derecha: Corredor nuevo a escala base de cámara 1080p (1920/900), con la IA
  real de updateEnemies, no una trayectoria inventada. El disco celeste es
  solamente un objetivo guía, no una representación nueva del personaje.
- Guía automática o cursor dentro del campo; comparación visual con el Corredor
  actual; pausa y articulación conmutables.
- Dos iris que siguen al objetivo, párpados texturados, leve respiración,
  dos pliegues posteriores con flexión pequeña. El cuerpo gira al flanquear,
  sigue la dirección fijada al embestir y se orienta al retirarse.
- No se agrega un windup: la IA actual dispara COMMIT al agotarse el timer o
  acercarse a menos de 80 unidades. El cuerpo se comprime durante los últimos
  0,22 s del timer o al acercarse de 110 a 80 unidades; eso es dibujo, no altera
  el umbral de ataque. Si la IA interrumpe por cercanía, no se inventa una pausa.
- Compresión/despliegue usando los timers existentes; COMMIT hasta 0,45 s y
  recuperación de 0,60 s. No se cambia velocidad, daño, hitbox, spawn o IA.
- Simulación del visor con dt real de cada rAF, acotado a 0,03 s; no se dibuja
  movimiento de actores a 120 Hz sobre un visor a 165 Hz sin interpolación.
  El giro usa respuesta exponencial con tiempo transcurrido, no pasos por frame.

## Preparación de imagen y costo

Original intacto: previews/concepts/corredor-cosmico-ambar-v1.png.
Placa técnica nueva: previews/concepts/corredor-cosmico-ojos-neutros-v1.png.
Editada con la habilidad imagegen y la herramienta integrada, no CLI.
Única operación pedida al generador: retirar dos iris rellenando esclerótica.
La edición generativa no certifica identidad matemática fuera de los ojos.

Recortes preparados una vez en previews/cosmic-runner.js: frente, pliegue superior
y pliegue inferior con raíces solapadas; dos iris y dos párpados tomados del
material original. Texturas de cuerpo con lado largo de referencia de 400 px;
ojos/párpados de 64 px. Cinco drawImage por cuerpo; hasta siete con párpados.
Sin blur, filtros, lectura de bitmap por frame, partículas o estelas nuevas.
Cache total aproximada 1,25 MiB RGBA compartida, incluyendo la referencia estática
para comparar. No se multiplica por enemigo.

Tamaño inicial del sprite: 100 unidades antes de la escala común del Corredor
(0,46), aproximadamente 98 px de lienzo de sprite a 1080p/cámara base, algo menos
para el contorno real. Es una referencia de diseño para evaluar jugando, no una
promesa de que cada microdetalle del PNG se vea en combate. La colisión sigue
con radio 9. No se agranda otra familia ni se reduce densidad.

El módulo se carga únicamente en el visor o mediante una opción del benchmark.
index.html NO lo importa ni descarga estas imágenes. El hook opcional de
enemies.js no sustituye ningún cuerpo si el módulo/bandera no están activos.
NV.__cosmicRunner=true es exclusiva de la prueba. Un arranque limpio del juego
normal se verifica sin drawCosmicRunner instalado. Espíritu/Escopuras siguen
integrados como antes, sin cambios a sus piezas ni imágenes.

## Verificación y reproducción

Validación final completada: npm run quality, 232 suites sin fallos; 163 recursos
verificados y 87 archivos de referencia congelada intactos. Smoke Electron:
idle → attack → recovery → positioning observados en IA real; un arranque limpio
del juego normal sigue sin instalar el rig experimental.

- node tests/cosmic_runner_preview.js
- node tests/runner_flank.js
- node tools/preview-cosmic-runner.cjs --capture
- Capturas, estados y JSON: local/validation/cosmic-runner-20261015/
- El test de render verifica seguimiento ocular, movimiento, matriz restaurada,
  datos del enemigo intactos, dos ojos/tres partes y desactivación por defecto.
  Test adicional compara el giro a 60 y 165 Hz. El visor prueba también los
  campos de estado compatibles flankState/stateTimer usados por la entrada real.
- No se considera suficiente ver un PNG bonito para integrar: falta la
  valoración del usuario sobre movimiento, tamaño y lectura de la embestida.

## Comparación final de escena completa

Electron visible, fullscreen, 1920×1080, 24 hostiles durables de composición
actual (cuatro Corredores), shotgun y explosiones repetidas, fondo reactivo,
movimiento del jugador y gráficos high/full. Ocho segundos por captura sin
tracing ni cambios de calidad, entidades o resolución. Se realizaron una primera
pareja exploratoria y una segunda en orden inverso con la animación final.

| Animación final | FPS medio | Intervalo p95 | Intervalo p99 | Peor intervalo |
| --- | ---: | ---: | ---: | ---: |
| Corredor actual | 147,71 | 12,10 ms | 12,30 ms | 36,50 ms |
| Cósmico articulado | 154,48 | 9,20 ms | 12,20 ms | 24,30 ms |

Informes: local/validation/overlap-performance/runner-cosmic-final-reference-20261015.json
y runner-cosmic-final-articulated-20261015.json.
Los percentiles usan diagnostics.frameGaps de TODA la captura, no la última
ventana del contador. La media es cadencia del juego/rAF, no scanout físico
ni tiempo GPU hardware. La diferencia observada es favorable (~4,6% en esa
pareja), pero no prueba estabilidad a 165 FPS ni ahorro constante por enemigo.
Las escenas evolucionan bajo dt real; no se afirma replay idéntico píxel a píxel.
La primera pareja corresponde a antes del retoque de compresión por distancia
y queda como evidencia exploratoria, no como medición final intercambiable.

## Prompt de la placa técnica

Use case: precise-object-edit. Animation clean plate, NOT a new design.
Edit the attached APPROVED amber cosmic Corredor conservatively. Preserve EXACT canvas dimensions, alpha transparency, creature placement, margins, full silhouette, every organic fold and trailing hook, stars, amber veins, black/silver material, lighting, eye sockets, eye size and all pixels outside the two iris regions as closely as possible.
Only change: inside BOTH EXISTING eyeballs, remove the dark circular iris/pupil and their catchlights. Replace each removed iris disc with the matching softly shaded pale grey-white veined sclera, so both eyeballs are blank. Keep the existing lids and surrounding folds entirely unchanged. Do NOT remove eyeballs, erase sockets, shrink eyes or create black holes.
No other edits. Especially do not alter the tail/folds, shape, amber stars, texture density or body edges. Do not add teeth, limbs, mouth, scenery or particles. Genuine transparent alpha outside the original creature silhouette. The engine will restore the original irises as moving parts; this is a technical body layer, not a final concept image.

