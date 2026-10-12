# Rendimiento: capturas temporales y experimentos de dibujo descartados

## Alcance y cambio de producción

Se preservó el árbol de trabajo existente. No hubo commit, push, eliminación
de archivos del usuario, cambios de balance/IA/audio, reducción de resolución,
supresión de partículas/sombras ni flags nuevos de GPU. Preferencias reales
del usuario sin modificar. La ventana del usuario no se cerró automáticamente.

El renderer de producción volvió al estado exacto de inicio de esta etapa,
conservando los 26 paths y todos los cambios existentes de la etapa anterior.
SHA256: 909CE095485359D1C8CEAD340251AC1BC8A59E04C95B456750A9A81F8EC6715E.
Ninguna de las siguientes agrupaciones se incorporó. El test experimental
creado en esta etapa se retiró de la suite de producción verificando su hash;
su fuente queda en el staging y los QA/evidencias locales se conservan.
`index.html` actualiza únicamente el identificador de caché del renderer actual.

La segunda candidata: los cuatro brazos fijos de un drone se agrupan en un
Path2D compartido. Rotores/órbitas conservan sus círculos individuales; las
hélices, núcleos, ojos, bob y señales de estado siguen dibujándose cada frame
en su orden visual. Se conservan vectores, colores, alpha, grosores y glow.
3 operaciones nativas menos por drone/frame: tres strokes, mismos fills.
Cache acotada: 26 paths originales + 1 agrupado, sin texturas ni claves por
entidad, ángulo, tamaño, estado o tiempo. Fallback anterior cuando faltan
Path2D.addPath o DOMMatrix; también si el caller aplica filtros o blending
distinto de source-over. El modo diagnóstico legacy sigue separado.

### Diferencia visual declarada

No presentar este cambio como igualdad píxel a píxel. Skia rasteriza un path
agrupado con pequeñas diferencias de cobertura en bordes antialiasados.
QA nativa: 432 casos, Canvas con willReadFrequently=true y Canvas default,
seis escalas, tres frames, tres rotaciones, offset y
alpha fraccionarios, glow completo, modo diagnóstico sin glow, blur y blending
aditivo del caller (estos últimos usan fallback idéntico). Máximo 1/255 y 55
canales cambiados en lectura frecuente; 23/255 y 331 canales cambiados de
262144 por imagen en Canvas default en el peor caso;
no es un cambio uniforme de color. Montaje original/candidato/delta amplificado
inspeccionado. Todos los detalles se conservan; no se reemplaza el dibujo por
sprites de menor resolución. Fallback sin Path2D o DOMMatrix: diferencia cero.
El test tiene un límite de delta explícito para detectar regresiones mayores.
QA del cache de identidad aislado (sin agrupación): 192 casos, diferencia cero.

## Experimento rechazado: agrupación completa de rotores

La primera candidata agrupaba también los rotores/órbitas: 18 pinturas menos.
Pasó la comparación en Canvas orientado a lectura, pero la verificación
adicional en Canvas default detectó hasta 41/255 y 4832 canales modificados,
superando el presupuesto visual. Se reemplazó por la agrupación de SOLO brazos
antes de cerrar esta etapa. No aumentar el límite para hacer pasar esa variante.
Evidencia conservada: `drone-full-group-rejected.json` y fuente
`enemies.drone-full-group.rejected.js` en los directorios locales de validación
y backups, respectivamente. No publicar ni reinstalar esa candidata.

Los resultados siguientes pertenecen a esa variante RECHAZADA y no son una
ganancia de la entrega final:

1920×1080, Electron 44.5.0, 24 enemigos durables, mismo seed/composición,
escopeta III y explosiones periódicas. high/full, heavyVfx y particles activos,
reducedEffects=false. Warmup de cuatro segundos. Sin tracing ni tests simultáneos.
Orden: control-a, candidato-a, candidato-b, control-b, control-c, candidato-c,
control-d, candidato-d. Archivos `drone-batch-*-20261010.json` bajo
`local/validation/overlap-performance/`.

| Pareja | Tramo solicitado | Control FPS | Agrupación FPS |
| --- | --- | --- | --- |
| A | 12 s | 138,30 | 141,80 |
| B | 30 s | 139,14 | 140,05 |
| C | 30 s | 127,92 | 146,42 |
| D | 30 s | 137,98 | 142,42 |

El promedio de draw.mean de las muestras rolling de B fue 1,205→1,185 ms;
C 1,282→1,164 ms; D 1,218→1,165 ms. Estos promedios no son percentiles de
todo el tramo ni muestras estadísticas independientes.

Resultados experimentales positivos, con variación considerable, que no se
incorporan por su fallo visual. No prometer +X%
universal, 165 FPS constantes, ni mejoras x5. FPS aquí cuenta frames del juego
por tiempo real del renderer, no frames físicos presentados por el compositor.
La simulación corre en tiempo real y no es un replay determinista idéntico;
el seed/composición y densidad coincidentes no eliminan esa limitación.
La ventana del juego del usuario seguía abierta; puede existir carga externa.
Comparar sesiones reales equivalentes antes de certificar aumento sostenido
en el hardware del jugador. Desync/bitmap fallidos de la etapa previa no se
activaron como defaults: ver PERFORMANCE_PRESENTATION_2026-10-10.md.

## Experimento rechazado: agrupar solo brazos

La segunda variante ahorra tres operaciones por drone, no dieciocho. Comparar
`drone-arms-control-20261010.json` (baseline inyectado desde el backup original)
y `drone-arms-candidate-20261010.json` (candidata temporal), con tramos visibles de
20 segundos, high/full y los mismos efectos/densidad: control 141,43 FPS;
candidata 138,77 FPS. No demostró ganancia. Se retiró del renderer de producción
sin descartar ningún cambio previo; quedó en `enemies.drone-candidate.js` local.
El test de producción experimental se retiró al descartar esta variante.
La prueba humana equivalente sigue siendo necesaria para orientar el siguiente
cambio útil. No probar más variantes arbitrarias como si garantizasen aumento.
No usar ninguna corrida `drone-batch-*` como ganancia de esta variante.

## Captura temporal: dos archivos, sin cambiar la calidad

`desktop/performance-profile.cjs`: session.json versión 3, hasta 301 muestras
ligeras a 1 Hz únicamente en el modo opt-in de perfilado. Incluye estado,
pausa, wave, enemigos, contador de frame, timestamp del renderer, visibilidad y
snapshot del monitor. Fallos aislados no abortan la captura; respuestas tardías
no contaminan capturas posteriores. No se inyecta instrumentación por frame
en el juego normal. Los percentiles del monitor son ventanas rolling.

`recordingSeconds`/`elapsedSeconds` terminan al pedir stop; `exportSeconds`
mide flush/compresión. Antes elapsedSeconds mezclaba esos tiempos. Los archivos
históricos permanecen intactos. No atribuir a gameplay los segundos de exportar.
Se mantienen exactamente performance.trace.json.gz + session.json por captura,
compresión streaming y fallback raw sin pérdida si gzip falla.

Prueba real de ocho segundos en combate con high/full y todos los efectos:
`local/validation/overlap-performance/profile-timeline-qa-20261010.json` enlaza
la captura. Ocho muestras, 8,072 s hasta stop, 6,933 s de exportación. Dos
archivos completos, sin crash observado en esta prueba. Tracing añade carga;
sus FPS no se usan como comparación de ganancia. Esto no certifica resuelto
el STATUS_ACCESS_VIOLATION original del panel Performance de DevTools.

## Continuidad y test sencillo del usuario

Cerrar/reabrir la app: una ventana ya abierta conserva el código anterior.
Desde la carpeta DeadSingularity V1:

```cmd
npm.cmd run desktop -- --profile-performance
```

F8 graba; jugar 30–45 segundos de combate representativo con calidad máxima;
F7 marca tirones si aparecen; F8 detiene si no paró antes por buffer. Esperar
TRAZA GUARDADA y pulsar F6. Enviar los dos archivos de esa captura juntos.
Mismo tamaño de ventana/monitor, calidad y condiciones de carga para comparar.
No activar muestreo JS extra salvo necesidad de atribución de funciones.

Pruebas: `npm run quality` (191 archivos de tests, cero fallos tras el retiro),
`node tests/common_path_cache.js`, `node tests/performance_profile_sampling.js`,
QA nativa `tools/qa-fixed-paths.cjs` y `tools/qa-drone-layers.cjs`,
harness `--profile-capture` en perfil aislado. QA completo escritorio/web:
18 tramos de 20 segundos (high/auto/performance, tres repeticiones por entorno),
sin reinicios observados. Esa batería se hizo durante la evaluación de las
candidatas; la revisión funcional adicional escritorio/web también pasó sobre
el estado final sin agrupaciones. No usar estos soak tests como ganancia de FPS máximos.
Build web final: `releases/DeadSingularity-V1-web-gY8M6q`, 105 recursos, 7,39 MiB.
La build verifica el mismo renderer original y el token actualizado de caché;
perfiles/backups/labs no se incluyen. No se construyó instalador nuevo ni hubo
publicación en Pages en esta etapa. Para probar inmediatamente, usar el launcher
de desarrollo desde V1 y cerrar/reabrir la ventana existente.

Respaldos exactos previos:
`local/backups/performance-health-20261010/enemies.pre-drone-layers.js`
y `performance-profile.pre-timeline.cjs`. No restaurarlos sobre otros cambios
sin revisar diff/hashes. Siguiente foco: replay comparable y raster del resto
de enemigos/capas, manteniendo todos sus detalles y verificando cada cambio.
