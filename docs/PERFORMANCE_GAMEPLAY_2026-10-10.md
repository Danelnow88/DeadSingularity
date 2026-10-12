# Etapa: gameplay sin análisis musical experimental

La petición excluye la conexión/análisis de música externa. No se eliminó esa
función, no se modificó su implementación ni la preferencia real del jugador.
Los perfiles temporales del benchmark fijan musicVolume=0 y rhythm.enabled=false;
al terminar verifican que no exista stream, escucha ni analizador activo.
Se mantienen SFX, particles=true, heavyVfx=true, high/full y reducedEffects=false.

## Resultado de las candidatas: ninguna instalada en el juego

| Candidata | Validación visual nativa | FPS sin tracing | Decisión |
| --- | --- | --- | --- |
| Tres paths persistentes para estrellas | 144 casos, diferencia máxima 23/255 en AA | No se midió tras fallo visual | Descartada |
| Core/full de fondo con alpha:false; detalle transparente | 1152 casos, diferencia cero | control A 132,50; candidata A 133,76; candidata B 133,27; control B 138,54 | No mejora sostenida; descartada |
| No pintar base donde la textura opaca la cubrirá | 288 casos, diferencia cero con máscara evenodd | candidata 127,43, inferior a los controles previos; no se certificó causalidad del descenso | Descartada |

Las dos primeras variantes del recorte de base dejaron costuras AA. La versión
final con máscara única pasó comparación en Canvas acelerado y de lectura
frecuente, pero no el requisito de rendimiento. No ampliar tolerancias de
imagen para hacer pasar una candidata fallida. No confundir la medición aislada
de 127,43 con una prueba A/B completa de regresión: bastó para no promoverla.

La prueba de FPS tuvo 24 enemigos durables, escopeta III, explosiones de 200
partículas cada 120 ms, ventanas visibles 1920x1080 y 4 s de warmup. Cada corrida
duró 30 s y usó perfil temporal distinto. No se grabaron trazas durante el A/B.
La composición/densidad es controlada; no es replay determinista: IA, FX y
tiempo real pueden recorrer estados diferentes entre corridas. Los FPS cuentan
callbacks/frame del renderer, no presentaciones físicas.

Informes JSON/PNG: `local/validation/overlap-performance/opaque-*.json` y
`base-cull-candidate-a-20261010.json`. Comparaciones de píxeles:
`local/validation/performance-health/star-paths.json`, `opaque-backdrop.json`
y `base-cull.json`. Fuentes descartadas y comprobadores quedan en
`local/backups/performance-health-20261010/`, fuera del build/publicación.

## Entrega útil de esta etapa

El harness normal conserva sus flags anteriores y suma `--common-wave`:
15 drones + 9 runners durables, ambiente FRACTURA, para reproducir el tipo de
carga de la captura del jugador sin necesitar otra captura. Los flags de las
tres candidatas de esta etapa se retiraron del harness publicable. La versión
experimental completa queda sólo como evidencia local para poder repetir.

Validación real final: `common-wave-final-20261010.json`, 12 s medidos después
del warmup, 108,37 callbacks/frame por segundo. Todas las muestras conservan
15 drones y 9 runners, high/full, partículas y heavyVfx; reducedEffects=false.
El reporte final certifica rhythm.enabled=false, state=off, active=false,
hasStream=false y musicVolume=0. No se midió con tracing activo. Es baseline,
no resultado de una optimización, ni comparación de ganancia contra la captura.
El problema se reproduce sin la función musical experimental.

```cmd
cd /d "C:\Users\party\Desktop\DeadSingularity V1"
node tools/performance/run_overlap.cjs --visible --seconds=30 --common-wave --label=common-wave-validation
```

No modificar el perfil real ni forzar GPU experimental. No realizar dos pruebas
gráficas en paralelo. El juego previo sólo estaba abierto pero sin actividad CPU
en la comprobación de interferencias; no se cerró ni alteró su partida.

## Continuidad

El cuello de botella sigue en raster/procesamiento de Canvas; la lógica de la
captura tuvo p95 update <=0,3 ms en la banda densa. El aumento sostenido de FPS
está **pendiente**, no logrado por estas candidatas ni por la prueba anterior de
agrupación de drones. No rehacer investigación de desync, bitmap de fondo,
agrupación de rotores, paths de estrellas, opacidad del fondo o sobrepintado:
ya hay evidencia del rechazo, disponible para revisar si cambia el entorno.

El siguiente frente razonable es reducir sustancialmente las operaciones de
cuerpos comunes, por ejemplo evaluar capas cacheadas con ojos/rotor animados
independientes. Esto exige una nueva candidata y validación de calidad: no
prometer que un atlas/sprite mantendrá AA/transparencias iguales sin comprobarlo.
No recortar efectos, frame rate de animaciones, resolución ni presupuesto visual
para ganar un benchmark. No publicar una candidata que no supere A/B visible.

No commit ni push en esta etapa. No limpieza de cambios ajenos ni restauración
de código del usuario. El estado jugable de partida se preserva.

## Validaciones al cierre

`npm run quality`: 192 archivos de tests, cero fallos; sintaxis, contenido,
manifiesto de entrega, referencia congelada e higiene Git también pasaron.
Log: `local/validation/performance-health/quality-gameplay-final.log`.
`npm run qa:alpha -- --features-only`: PASS en Electron y build web real.
Este pase comprueba funciones, no es un nuevo soak de oleadas prolongadas.
Se comprobaron sin cambios los hashes de game.js, render/canvas.js,
render/sectors.js y render/enemies.js frente al inicio de esta etapa.

Los tres nuevos comprobadores de candidatas descartadas se movieron al respaldo
local después de verificar sus hashes propios; son recuperables. No se eliminó
ninguna captura, build, código previo ni cambio local del usuario. El harness
publicable no tiene los flags star-paths/opaque-backdrop/base-cull.

## Continuación: geometría de detalles y protección del exportador

Se evaluaron 14 paths fijos adicionales para ojos y luces de drones/runners.
La candidata pasó 216 comparaciones nativas, con diferencia **cero** en cada
canal: Canvas acelerado y de lectura frecuente, escalas, rotaciones, alpha,
filtro blur y composición aditiva. Fallback sin Path2D también idéntico.

Cuatro corridas visibles de 20 s, common-wave, sin tracing, en orden A/B/B/A:

| Control A | Candidata A | Candidata B | Control B |
| --- | --- | --- | --- |
| 97,3146 FPS | 108,1823 FPS | 95,4386 FPS | 97,3159 FPS |

El beneficio no se repite. Una segunda prueba aislada del renderer dibujó
exactamente 120 fotogramas de 24 enemigos y forzó flush tras cada fotograma.
Cuatro pares alternados: control 1013,975 ms de media, candidata 1012,65 ms.
La diferencia (~0,13%) no justifica instalarla. Este microbenchmark incluye
readback y no representa FPS de presentación. Candidata descartada; el renderer
de producción conserva su hash anterior. Evidencia y script reproducible en
`local/backups/performance-health-20261010/detail-paths-20261010/`; mediciones
de juego en `local/validation/overlap-performance/detail-*.json`.

La consulta **completa** de GPU confirmó RX 7800 XT activa, ANGLE D3D11,
GaneshGL, driver 32.0.31041.1004 e inProcessGpu=false. Los datos básicos de
capturas anteriores no bastaban para identificar el backend activo.

Corrección aplicada sólo al profiler opt-in: al finalizar, consulta GPU completa
con plazo de 2 s, fallback básico con plazo de 0,5 s y errores registrados en
session.json. Si ambas consultas fallan o se bloquean, exporta igualmente la
traza y su informe. La lectura de features tampoco puede abortar la exportación.
Antes, un rechazo de getGPUInfo impedía generar session.json y comprimir la traza.
Se conserva el esquema v3 con campos aditivos gpuInfoType y gpuInfoErrors.
No se cambiaron flags gráficos, drivers, preferencias ni gameplay.

Regresiones verificadas: datos completos, fallback, consultas rechazadas,
features rechazadas, timeout y respuesta tardía; siempre se conservan los dos
archivos completos de la captura. Los tests existentes del profiler también pasan.
El aumento sostenido de FPS continúa pendiente; no presentar esta corrección
del exportador como optimización de FPS ni como cura del crash de DevTools.

Cierre: `npm run quality` pasó con **193 archivos de tests, cero fallos**.
La captura nativa `gpu-export-final-20261010` pasó: common-wave de 24 enemigos,
high/full con todos los efectos, música experimental inactiva y dos archivos
exportados. Log de quality: `local/validation/performance-health/quality-gpu-export-20261010.log`.
Se verificaron sin cambios los hashes de game.js, render/canvas.js,
render/sectors.js y render/enemies.js. Sin commit, push ni build nuevo.
