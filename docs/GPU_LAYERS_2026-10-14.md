# Auditoría GPU por capas — 14/10/2026

**Actualización: las tablas de este documento usan la composición histórica del
combatLab, con enemigos retirados de la partida normal. No usarlas para priorizar
drones ni clasificar el roster vigente.** Auditoría corregida y resultados nuevos:
[COSTO_ROSTER_ACTUAL_2026-10-14.md](COSTO_ROSTER_ACTUAL_2026-10-14.md).
Se verificó el contenido promovido después de la corrección del usuario.

## Resultado y límite de esta entrega

**165 FPS estables no están logrados. No se incorporó ninguna optimización
experimental al render normal en esta auditoría.** Se localizaron costos mediante
aislamiento de capas y se probaron alternativas. Las que mejoraron la cadencia
cambiaron píxeles; las que conservaron los píxeles no dieron una mejora consistente
del cuadro completo. Se respetó el criterio de rechazo solicitado.

No se modificaron simulación, resolución, cantidad de entidades, efectos ni
calidad. Los cambios de runtime que ya existían antes de esta auditoría se
preservaron. No hubo nuevos paquetes, commit, push ni publicación.

## Método y significado de las métricas

- Electron real, pantalla completa, monitor LS32AG32x informado como 165 Hz,
  1920×1080, escala 1; calidad alta y presupuesto visual completo.
- Escena: 24 enemigos (Costurero, Francotirador, Devorador, espectros, drones,
  corredores y élites), escopeta F3 y explosiones. Semilla fija. Tras calentar
  cinco segundos, se detiene la simulación **solo en el laboratorio**. Los mismos
  actores, proyectiles y partículas permanecen en todas las variantes de cada
  ejecución; se continúa dibujando con un ciclo visual de dos segundos.
- Cada caso: 1,6 s de estabilización, 6 s de cadencia rAF sin tracing y luego
  2,5 s de trace separado. Se repite el original para detectar deriva. Comparar
  dentro de una ejecución: los conteos congelados pueden variar entre ejecuciones.
- `p95/p99` se expresa en **milisegundos por cuadro** (menor es mejor).
  `FPS low 5%/1%` significa aquí `1000 / frameMs.p95/p99`, no el promedio del
  subconjunto más lento. No se confunde rAF con presentación física del monitor.
- **Raster ms** es la duración de `RasterDecoderImpl::DoRasterCHROMIUM` en el
  proceso GPU. Incluye trabajo de envío/esperas; NO es un temporizador de hardware
  que mida exclusivamente ejecución de shaders. Las familias del trace se
  solapan y no se suman. Estas capturas Electron no exponen `GPUTask`; su ausencia
  se registra como `null`, nunca como 0 ms. No se ha medido tiempo de hardware GPU
  individual de cada capa Canvas; se midió el efecto de omitir su dibujo.
- La omisión de capas es exclusivamente diagnóstica, mediante código servido
  en memoria. El juego instalado/normal no contiene estos interruptores.

## Aislamiento de capas, misma carga

Fuente canónica: `local/validation/gpu-layer-audit/final-layers-summary.json`.
24 enemigos, 12 proyectiles y 188 partículas congelados; conserva trazas `.gz`.

| Dibujo omitido | FPS medios | Frame p95 / p99 ms | Raster media / p95 / p99 ms |
|---|---:|---:|---:|
| Ninguno, inicio | 108,20 | 12,20 / 12,20 | 5,700 / 6,082 / 6,297 |
| Actores y avisos/campos de combate | 164,79 | 6,10 / 6,20 | 3,582 / 3,808 / 3,891 |
| Proyectiles y estelas | 112,03 | 12,20 / 18,20 | 5,604 / 6,067 / 6,304 |
| Partículas | 107,59 | 12,20 / 12,20 | 5,993 / 6,414 / 6,741 |
| Ambiente, Canvas + WebGL | 149,64 | 12,10 / 12,20 | 3,666 / 4,137 / 4,527 |
| Overlays de legibilidad/flash | 107,58 | 12,20 / 12,20 | 6,156 / 6,734 / 7,118 |
| HUD Canvas y `.hud,#fpsCounter` DOM | 108,09 | 12,20 / 18,20 | 5,909 / 6,487 / 6,835 |
| Ninguno, control final | 106,24 | 12,20 / 18,20 | 5,859 / 6,326 / 6,796 |

Las diferencias pequeñas no prueban una mejora ni un costo negativo: hay deriva
y ruido. La escena no activa todo postproceso posible; el control de UI no quita
el pequeño botón DOM del menú. No se extrapola el resultado a todos los mapas,
jefes, habilidades, mobile ni otras GPU.

**Conclusión fuerte:** actores/combate y ambiente son los dos grupos dominantes.
Dentro del ambiente, la señal principal viene de las estrellas y motas Canvas,
no de los pequeños velos delanteros ni del shader de la nebulosa.

Desglose en `primitives-summary.json` (base 109,47–111,19 FPS): sin estrellas,
135,50 FPS y Raster 4,186 ms; sin capa trasera, 121,18 FPS y 5,054 ms;
sin velos delanteros, 111,14 FPS y 5,709 ms. Sin drones, 133,10 FPS;
sin corredores, 121,30 FPS. Son omisiones para identificar costo, no soluciones.

Las estrellas forman tres paths dispersos de rectángulos diminutos; las motas,
dos. Cambiar solamente la forma de enviarlos al Canvas reduce mucho el costo.
Esto respalda que el raster de esos paths es un foco útil; no prueba que eliminar
nubes o bajar la resolución sea necesario.

## Alternativas probadas y rechazadas

| Candidato aislado | Resultado | Decisión |
|---|---|---|
| Rectángulos directos (`fillRect`) en estrellas/motas | 109,47→141,44 y 111,19→141,82 FPS; Raster 5,728→3,784 y 5,646→3,802 ms | Rechazado: píxeles distintos, máximo 13/255 por canal |
| Descartar motas fuera de pantalla, conservando el path | 111,13→112,52 y 112,56→112,66 FPS | Rechazado: mejora no consistente; píxeles iguales en los 18 casos probados |
| Path nativo en lugar de Path2D de enemigos | 106,85→109,36 y 111,86→106,86 FPS | Rechazado: no mejora repetible |
| Recorte conservador del modelo espectral | Aproximadamente 110 FPS; no mejora completa | Rechazado |
| Original recortado por teselas enteras | Diferencia máxima 1/255 | Rechazado por igualdad estricta |
| Unión de teselas, un solo fill original | Diferencia máxima 1/255 | Rechazado por igualdad estricta |
| Grupos espaciales de rectángulos | Diferencia máxima 13/255 en estrellas | Rechazado |

El último ensayo de culling mantuvo Raster casi igual:
5,588→5,581 ms y 5,589→5,528 ms. Frame p95/p99: 14,9/15,3→15,1/15,4 ms;
14,9/15,3→14,9/15,3 ms. La cadencia de esta sesión difiere de la anterior pese
a que Electron sigue informando 165 Hz; no se mezclan sus percentiles con los
de la ejecución anterior ni se atribuye esa diferencia al código.

### Comprobación en partida en movimiento del candidato más rápido

`local/validation/overlap-performance/gpu-live-before.json` y
`gpu-live-rects.json`, 12 s sin tracing, mismo montaje de carga y calidad.
Las trayectorias no son idénticas porque el tiempo real avanza: corroboración,
no sustituto del aislamiento anterior ni comparación píxel a píxel.

| Métrica | Original | Rectángulos directos, solo laboratorio |
|---|---:|---:|
| FPS medios | 103,34 | 136,95 |
| Frame p95 / p99 ms | 12,20 / 18,20 | 12,20 / 18,10 |
| FPS low 5% / 1% | 81,97 / 54,95 | 81,97 / 55,25 |

Aunque mejora la media, casi no mejora los percentiles lentos y no llega a
165. **No se entregó como optimización válida.** El trace nuevo de la prueba
congelada sí muestra menor Raster, pero no hay una mejora antes/después de
producción que certificar: el runtime no se cambió.

### Comparación de píxeles

`tools/qa-gpu-primitives.cjs`: 18 comparaciones por alternativa: estrellas y
motas, escalas 1 / 1,37 / 2,1, tiempos 0 / 1,5 / 13,73, traslación fraccional,
Canvas acelerado 1920×1080. Compara todos los canales RGBA. Control original
contra original: **18/18 con diferencia 0**. Culling: **18/18 diferencia 0**.
Las otras alternativas mencionadas fallan; los JSON guardan conteo y máximo.

Es una prueba localizada de primitivas, no una certificación de todos los
frames del juego. Un candidato aceptable todavía necesita comparación del
cuadro completo, cámara en movimiento, todas las dimensiones y máscaras/
transparencias sobre fondos reales. No se relajó la tolerancia para aprobarlo.

## Trace de referencia

Se leyó `Trace-20261013T163452.json.gz`; resumen reproducible en
`local/validation/gpu-layer-audit/reference-summary.json`.
rAF CPU: mediana 0,905 ms, p95 1,449 ms, p99 1,968 ms: consistente con que
la lógica JS no explica por sí sola la pérdida de fluidez.

Sobre todo el intervalo seleccionado por el analizador (no necesariamente el
mismo recorte del usuario), presentación registrada: media 11,121 ms,
p95 18,195 ms, p99 18,233 ms. Unión de `GPUTask` en `CrGpuMain`: 92,49 % del
intervalo entre primera y última tarea. Incluye tareas breves: la mediana de
todas es 0,207 ms, y **no equivale** a mediana por frame. No mezclar la categoría
GPUTask de Chrome con RasterDecoder de Electron como si fueran la misma medida.

## Reproducir

Desde la raíz del proyecto; las pruebas de cadencia abren una ventana temporal
en pantalla completa y se cierran solas. No ejecutar dos benchmarks GPU juntos.
Los archivos grandes quedan en `local/validation/`, no en el paquete del juego.

```powershell
node tools/performance/gpu_layer_audit.cjs --label=layers-new --cases=full,actors,projectiles,particles,environment,post,ui,full
node tools/performance/summarize_gpu_layers.cjs local/validation/gpu-layer-audit/layers-new.json local/validation/gpu-layer-audit/layers-new-summary.json
node tools/performance/gpu_layer_audit.cjs --label=rects-new --cases=full,rects,full,rects
node tools/performance/gpu_layer_audit.cjs --label=cull-new --cases=full,cull,full,cull
node tools/qa-gpu-primitives.cjs --control
node tools/qa-gpu-primitives.cjs --cull
node tools/qa-gpu-primitives.cjs
node tools/qa-gpu-primitives.cjs --union
node tools/performance/run_overlap.cjs --visible --fullscreen --graphic-space --response-motion --seconds=12 --label=live-original-new
node tools/performance/run_overlap.cjs --visible --fullscreen --graphic-space --response-motion --primitive-rects --seconds=12 --label=live-rects-new
```

Las pruebas de píxeles de candidatos rechazados devuelven código 1 a propósito.
`--primitive-rects` solo modifica la copia servida por el harness.

No usar `baseline.json` inicial como tabla definitiva (algunas APIs congeladas
impidieron la omisión inicial). Tampoco usar el caso `drawDimensionalThreatBody`
de `detail.json`: una condición inicial omitía más cuerpos de los previstos.
Ambos problemas se corrigieron en el harness; `final-layers` y `primitives`
son las ejecuciones válidas posteriores.

## Siguiente paso concreto

### Continuación del 14/10: recortes exactos y control de refresco independiente

Se probaron más alternativas, siempre fuera del runtime:

| Alternativa | Píxeles | Original → candidato (dos pares) | Decisión |
|---|---|---|---|
| Unión de recortes sin cambiar la transformación Canvas (`localclip`) | 18/18 exactos | 111,86→88,12; 110,79→89,14 FPS | Rechazado: más lento |
| Recortes individuales sin cambiar la transformación (`localtiles`) | Máximo 1/255 | No se mide rendimiento después de fallar imagen | Rechazado |
| Recorte conservador de drones/corredores (`actorclip`) | 36/36 exactos, incluye destellos | 111,29→112,25; 113,47→111,82 FPS | Rechazado: sin ganancia repetible |
| Agrupar cuatro trazos de los drones (`batcharms`) | Máximo 17/255 | No se mide rendimiento después de fallar imagen | Rechazado |

Raster del recorte unido: 5,573→7,914 ms y 5,645→7,916 ms. Raster del recorte
de actores: 5,531→5,487 ms y 5,504→5,556 ms. En este último, frame p95/p99
14,7/15,2→14,7/15,2 ms y 14,7/15,1→14,7/15,2 ms. No hay mejora que entregar.
Fuentes: `localclip-summary.json`, `actorclip-summary.json` y los cuatro
`primitives-*-pixels.json` correspondientes, en la carpeta de auditoría.

**Hallazgo adicional: la cadencia de esta sesión está limitada incluso sin el
juego.** `tools/performance/refresh_ceiling.cjs` abre una página sin juego,
entidades ni simulación. Un cuadrado animado de 20×20 píxeles sobre un Canvas
1080p obtiene **136,15 FPS**, p50 7,3 ms, p95 7,6 ms, p99 7,9 ms; con bloqueo
temporal del sueño de pantalla, **135,86 FPS**, p50 7,3 ms, p95 7,7 ms,
p99 7,9 ms. El control de lobby obtuvo 137,24 FPS y el combate original de
esa misma prueba, 108,09 FPS. La prueba totalmente estática da menos FPS y
no se usa como techo de animación: la ausencia de daño puede cambiar la cadencia.

El monitor sigue informado como 165 Hz. `app.getGPUInfo('complete')` y WebGL
confirman RX 7800 XT activa, ANGLE D3D11, Skia GaneshGL, aceleración habilitada;
no se deduce render por software de los campos incompletos de `getGPUInfo('basic')`.
Versiones: Electron 44.5.0, Chromium 152.0.7977.130.

El trace original del caso `actorclip-0-full` de esta continuación anuncia
`interval_us:6061`, pero los tiempos de origen de `DisplayScheduler::BeginFrame`
tienen mediana **7,320 ms** y p95 **7,815 ms**. Hay 341 eventos
`WaitForVSync Sleep` en `GpuVSyncThread`, con esperas típicas cercanas a 7,3 ms.
El analizador ahora expone ambos intervalos y esa espera por separado en `vsync`.

El código público de Chromium contiene una espera de respaldo cuando falla o
retorna demasiado pronto la espera de VBlank; redondea el intervalo hacia arriba
a milisegundos antes de dormir. Es consistente con lo observado, pero **no prueba
la causa local** (pantalla/sesión/driver/compositor). [Fuente Chromium](https://raw.githubusercontent.com/chromium/chromium/main/ui/gl/vsync_thread_win.cc).

Se ensayó `UseCompositorClockVSyncInterval` exclusivamente en la ventana mínima:
dio aproximadamente **10 FPS**, por lo que se descartó. La implementación tiene
un respaldo de 100 ms cuando falla la espera; no se capturó su código de error
local, así que no se atribuye a un motivo concreto. [Fuente DComp](https://raw.githubusercontent.com/chromium/chromium/main/ui/gl/vsync_thread_win_dcomp.cc).
El proceso se cerró; no se modificaron flags del juego, ajustes de Windows,
drivers ni preferencias persistentes. El bloqueo de suspensión se liberó.

Pruebas reproducibles:

```powershell
node tools/qa-gpu-primitives.cjs --localclip
node tools/qa-gpu-primitives.cjs --localtiles
node tools/qa-gpu-primitives.cjs --actorclip
node tools/qa-gpu-primitives.cjs --batcharms
node tools/performance/gpu_layer_audit.cjs --label=actorclip-new --cases=full,actorclip,full,actorclip
node tools/performance/refresh_ceiling.cjs
node tools/performance/refresh_ceiling.cjs --keep-awake
```

Informes del control: `refresh-ceiling.json`, `refresh-ceiling-awake.json`,
`refresh-ceiling-compositor.json`; control de partida en
`overlap-performance/gpu-continuation-refresh-control.json`.
Sintaxis de herramientas comprobada y entrega revalidada (145 recursos,
87 referencias intactas). No se repitió la suite completa en esta continuación;
el resultado de 226 suites que sigue corresponde al cierre anterior del día.

**Antes de certificar nuevos FPS absolutos:** confirmar con el usuario pantalla
encendida, sesión local desbloqueada o uso de acceso remoto, y repetir el control
mínimo hasta explicar su cadencia. No confundir este límite adicional con la
solución del costo Canvas: la caída bajo combate sigue pendiente. La pregunta
se presentó al usuario; aún no hay respuesta al cerrar esta continuación.

Validación de cierre: `npm run quality` aprobado (sintaxis de 199 archivos,
catálogo, 145 recursos de entrega, 87 archivos de referencia sin cambios,
higiene de repositorio y 226 suites de prueba con 0 fallos). Sintaxis individual
de las nuevas herramientas aprobada. `git diff --check` acotado a los archivos
seguidos de esta auditoría pasa; el chequeo global informa CRLF/espacios en
modificaciones preexistentes de otros archivos, que no se reescribieron.

Sigue pendiente una optimización que satisfaga simultáneamente imagen idéntica
y mejora del cuadro completo. Priorizar raster Canvas de paths dispersos y
los cuerpos comunes (drones/corredores), conservando orden y cobertura del
antialiasing. No volver a gastar el primer esfuerzo en humo, simulación o Wasm.
Si se propone aceptar pequeñas diferencias de antialiasing, eso requiere una
decisión explícita del usuario: no está autorizado por esta tarea.
