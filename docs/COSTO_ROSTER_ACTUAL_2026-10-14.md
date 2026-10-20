# Rendimiento del roster vigente — 14/10/2026

Actualización posterior: el usuario autorizó cambios sutiles de píxeles y se
integraron motas/estrellas y detalles secundarios de Hydra. Estado vigente en
[OPTIMIZACION_SUTIL_2026-10-14.md](OPTIMIZACION_SUTIL_2026-10-14.md).
Las recomendaciones y referencias a candidatos no instalados de abajo son
históricas, previas a esa autorización.

## Conclusión práctica

La primera modificación a priorizar es el dibujo de estrellas/motas Canvas.
En la prueba en movimiento con diez enemigos actuales, cambiar sus paths
dispersos por `fillRect` mejoró **142,37→164,05 FPS**, conservando enemigos,
modelos, animaciones, colores, tamaños, partículas y movimiento ambiental.
La diferencia visual conocida está en el antialiasing de esas motas: el
candidato no cumple igualdad estricta píxel a píxel. Sigue aislado en herramientas;
no se activó en el juego normal. Esta tarea fue de investigación y propuesta.

No hay evidencia para recomendar bajar de diez a ocho enemigos antes de
evaluar ese cambio. Con 24 enemigos actuales el mismo cambio mejora mucho,
pero no alcanza 165 sostenidos en movimiento. Hay caídas puntuales incluso
en la prueba de diez: no se certifica un piso absoluto de 100 FPS ni todas
las escenas del juego.

## Corrección de la muestra anterior

El usuario señaló que varios enemigos ya no existen en su partida. Verificación:
`NV.dimensionBaselineRoster()` retira Dron, Escudo, Peón y Lútil independiente;
retira Rápido y Espectro Vacío de las élites. El Arquero conserva su mecánica
y usa el aspecto del Lútil mediante `rosterVisualId:'specter_lite'`.

El laboratorio `combatLab=1` usa por defecto el catálogo histórico: desactiva
`dimensionContentEnabled`. Las auditorías anteriores forzaban cinco drones,
cinco Lútil y dos Rápidos. **Sus cifras de costo por familia no describen el
roster vigente. Fue incorrecto priorizar drones para optimizar la partida actual.**
Las conclusiones generales sobre Canvas y la técnica de paths siguen siendo
hipótesis útiles, pero se revalidaron con el contenido actual.

Se corrigió el harness: `gpu_layer_audit.cjs` ahora usa por defecto
`--roster=production`; la referencia histórica requiere `--roster=legacy`.
El hook de contenido promovido se aplica exclusivamente al código servido en
memoria. El registro de spawn y el roster del juego en el proceso aislado se
alinean con la base promovida. Se verifican IDs y flags de Arquero, Enjambrito,
Escopuras y Espíritu. Cada informe conserva el catálogo y las entidades reales.
Los resultados antiguos sin estos datos deben interpretarse como históricos.

El harness en movimiento necesita `--production-roster`. El límite vigente de
partida es `ACTIVE_HOSTILE_LIMIT:10`; el laboratorio permite 30. Se midieron
por separado mezclas de diez y de 24, sin modificar ese límite del juego.

## Mediciones con los enemigos que existen hoy

1080p, monitor informado como 165 Hz, calidad alta/full, partículas y VFX activos,
escopeta F3, gas reactivo, movimiento y explosiones. Música/visualizador apagados.
Son mezclas de estrés controladas, no una reproducción exacta del trace del usuario.

| Escena en movimiento, 12 s | Original | Solo dibujo directo de motas |
|---|---:|---:|
| 10 enemigos: FPS medios | 142,37 | 164,05 |
| 10 enemigos: frame p95 / p99 ms | 8,10 / 10,30 | 6,20 / 6,20 |
| 10 enemigos: peor intervalo ms | 40,30 | 29,00 |
| 24 enemigos: FPS medios | 104,89 | 134,81 |
| 24 enemigos: frame p95 / p99 ms | 10,70 / 13,30 | 8,20 / 8,90 |
| 24 enemigos: peor intervalo ms | 49,20 | 40,60 |

Se verificó la misma cantidad en las doce muestras de cada ejecución. Las
trayectorias/estados en movimiento no son idénticos entre procesos; esta prueba
corrobora el aislamiento congelado. No equivale a medición de scanout físico.
La mezcla de diez incluye Enjambrito×2, Corredor×2, Escopuras, Arquero/Lútil,
Costurero, Devorador, Bastión y Asesino. La de 24 incluye los demás normales
y las seis élites; en movimiento el Kamikaze se reemplaza por un Corredor porque
se autodestruye y rompe la carga constante. Su IA no se modificó para impedirlo.

Fuentes en `local/validation/overlap-performance/`:
`active-ten-before.json`, `active-ten-rects.json`,
`active-live-before.json`, `active-live-rects.json`.
Una primera prueba en movimiento con 24 se abortó al perder el Kamikaze; no se cuenta.

### Aislamiento y trace nuevo

Una muestra congelada con los doce normales activos y seis élites, total 24,
dio 134–136 FPS de base; sin cuerpos comunes 153,46; sin cuerpos de élites
150,04; sin espectros normales 139,23. Quitar los glows comunes dio 136,33 y
quitar blur de actores 136,02: **no una mejora clara por encima del control**.
Con motas directas dio 164,92 FPS y Raster 2,970 ms frente a 5,118 ms original.

Repetición independiente, mismos 24 cuerpos entre los cuatro casos:

| Comparación | FPS | Frame p95 / p99 ms | Raster media / p95 / p99 ms |
|---|---:|---:|---:|
| Original A | 123,54 | 8,50 / 9,10 | 5,379 / 5,612 / 5,866 |
| Motas A | 160,36 | 6,50 / 7,00 | 3,468 / 3,720 / 3,842 |
| Original B | 121,85 | 8,70 / 9,20 | 5,374 / 5,610 / 5,686 |
| Motas B | 162,46 | 6,50 / 6,90 | 3,393 / 3,673 / 3,778 |

`Raster` sigue siendo duración de `RasterDecoderImpl::DoRasterCHROMIUM`
en el proceso GPU, incluyendo envío/esperas; no un timer exclusivo de shaders.
Cadencia sin tracing; trace capturado aparte. No sumar categorías solapadas ni
comparar FPS absolutos entre montajes/estados congelados diferentes.
Fuentes: `active-roster-summary.json`, `active-rects-repeat-summary.json` y trazas `.gz`.

### Cuáles enemigos revisar después

Otra muestra fija, tres Enjambritos y tres Corredores, base 115,07/control final
114,98 FPS: omitir Enjambritos da 126,02; omitir Corredores 120,25. Esto respalda
priorizar Enjambrito si se necesita margen adicional en esa composición;
no establece un ranking universal de los 18 tipos.

También se contaron las llamadas efectivas de dibujo de un frame real:

| Modelo | Fill/stroke/drawImage por cuerpo, aprox. |
|---|---:|
| Espíritu | 9 |
| Devorador / Guardia | 18 |
| Núcleo | 22 |
| Costurero / Arquero combinado | 24 |
| Francotirador | 27 |
| Enjambrito | 28 |
| Kamikaze | 33 |
| Corredor / Tanque | 34 |
| Comandante / Asesino / Goliath | 39 |
| Bastión / Centella | 42 |
| Fantasma | 46 |
| Escopuras | 49 |

Los conteos **no son tiempo GPU** ni prueban que Escopuras sea el más lento.
Dependen del estado; no incluyen toda geometría interna de Path2D ni campos
fuera del cuerpo. El tamaño en pantalla, solapamiento y cobertura del path
también importan: Enjambrito fue más costoso que Corredor pese a tener menos
llamadas. Escopuras y élites son candidatos de inspección por complejidad,
todavía no un ranking medido de ahorro individual.
Fuentes: `active-family-summary.json` y `active-complexity.json`.
`active-ink.json` fue una ejecución interrumpida al validar un ID; no usar como
resultado completo. `active-family` sirve para FPS; sus conteos iniciales estaban
incompletos y se corrigieron/revalidaron en `active-complexity`.

## Cambios concretos recomendados, en orden

1. Estrellas/motas: las dos llamadas `ctx.rect(...)` pasan a `ctx.fillRect(...)`.
   Se conservan agrupaciones de color/alpha, posiciones y cantidades. El
   antialiasing cambia ligeramente; revisar visualmente el candidato antes de
   adoptarlo. Es el ahorro grande ya demostrado. No rehacer paisajes ni humo.
2. Conservar el límite de diez y los modelos actuales mientras se mide margen
   con ese primer cambio. Eliminar brillos globalmente no dio ahorro claro.
3. Si hace falta más margen: experimento enfocado en Enjambrito, manteniendo
   sus tres fragmentos reconocibles y su movimiento; reducir capas interiores
   redundantes o reutilizar adornos estáticos. Después medir Escopuras/élites
   por componente. No quitar ojos, colores de variantes o avisos de ataque por
   un conteo alto de llamadas.
4. Para futuros diseños: medir cada modelo nuevo a escala real, aislado y en
   grupo, quieto y atacando. Aprobar por costo del cuadro completo y legibilidad;
   definir presupuestos distintos para comunes y élites con esos datos. No hay
   una cifra mágica de llamadas o enemigos que garantice 165 FPS.

El siguiente experimento tendría que comparar silueta y percepción además de
FPS. No prometer ahorro por simplemente cambiar tecnología: la simulación
medida continúa barata y el costo dominante encontrado está en raster/composición.

## Reproducir y verificación

```powershell
node tools/performance/gpu_layer_audit.cjs --roster=production --label=active-new --cases=full,commonBodies,eliteBodies,normalSpectral,commonGlow,attackBlur,rects,full
node tools/performance/run_overlap.cjs --production-roster --hostiles=10 --visible --fullscreen --graphic-space --response-motion --seconds=12 --label=ten-control-new
node tools/performance/run_overlap.cjs --production-roster --hostiles=10 --visible --fullscreen --graphic-space --response-motion --primitive-rects --seconds=12 --label=ten-rects-new
```

No ejecutar benchmarks GPU en paralelo. Sin cambios de producción, paquetes,
guardados, commit o push. Sintaxis de herramientas y contrato de aislamiento
aprobados; entrega conservada: 145 recursos, 87 referencias intactas. No se
repitió toda la suite, porque se modificaron herramientas de diagnóstico.

El usuario confirmó monitor encendido, Windows desbloqueado y uso local.
La sesión anterior del control mínimo quedó en 136; esta sesión alcanzó 164–165
en casos medidos. No se conoce la causa de esa variación y no se adjudica a
pantalla apagada o acceso remoto. No tratar 136 como techo permanente del equipo.
