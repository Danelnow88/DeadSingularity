# Optimización sutil integrada — 14/10/2026

El usuario autorizó diferencias de píxeles con cambios visuales sutiles. Se
integraron dos ajustes medidos: rectángulos directos para estrellas/motas y
menos capas repetidas en los lóbulos secundarios de Hydra. La física del
entorno, estelas, simulación, modelos comunes, roster y límite de diez enemigos
se conservan. No hubo nuevos paquetes, commit, push ni publicación.

## Cambios activos

- `spaceEnvironment.js`: las 160 estrellas cercanas se dibujan con `fillRect`,
  conservando tres planos, alpha, tamaños, cámara y movimiento. Se evita el
  path disperso que cubría gran parte de la pantalla.
- `spaceResponse.js`: las 256 motas del campo reactivo usan el mismo envío
  directo. Sus posiciones siguen usando la interpolación del campo elástico;
  no se modificó integración, desplazamiento, gas ni reacción a actores/disparos.
  Son el polvo cercano nuevo; no las partículas de explosión ni las estelas.
- `spectralEnemies2D.js`: las seis élites activas efectivamente comparten RB6/
  Hydra. Se mantienen cuatro lóbulos, colores, ojos, partículas y ataques.
  Los tres lóbulos pequeños conservan relleno, contraste oscuro y borde de
  color, pero omiten el halo ancho y la tinta interior repetidos. El lóbulo
  principal conserva esos detalles. Los presets de lóbulos se reutilizan en
  WeakMap; no se crean objetos por frame. `NV.__subtleHydra=false` se reserva
  como referencia de QA; no es un nuevo ajuste para el jugador.
- `index.html`: nuevas claves de caché para esos tres scripts; manifiesto
  regenerado y verificado. El render de Enjambrito/Escopuras conserva el código
  previo: sus prototipos no dieron una mejora consistente y se retiraron.

La idea de reservar Hydra para una única especie rara queda para una etapa
futura de diseño/balance. No se alteraron frecuencias ni identidades para
disimular el costo en esta etapa.

## Resultados y límites

Monitor informado como 165 Hz, 1920×1080, alta/full, gas y VFX activos.
Las mediciones se hicieron con el **roster vigente promovido**, no con drones
o variantes retiradas. Movimiento, escopeta F3 y explosiones; música/rítmico
apagados. Cada prueba en movimiento verifica cantidad constante en 12 muestras.

| Prueba en movimiento | FPS medios | Frame p95 / p99 ms |
|---|---:|---:|
| Referencia anterior, diez actuales | 142,37 | 8,10 / 10,30 |
| Final activo, diez actuales | **163,97** | **6,20 / 6,20** |
| Motas optimizadas, Hydra anterior, 24 actuales | 131,93 | 8,40 / 11,60 |
| Motas optimizadas, Hydra refinada, 24 actuales | **143,52** | **8,00 / 9,80** |

Los procesos en movimiento usan la misma composición/semilla, pero sus
trayectorias no son idénticas: se corroboran con aislamiento de escena congelada.
No es reproducción exacta de toda la partida del usuario ni medición de scanout.
El peor intervalo del control final de diez fue 30,8 ms (dos >20 ms); **no se
garantizan 165 siempre ni piso absoluto de 100 FPS**. Tampoco 24 cuerpos a 165.

En el aislamiento de 24 actuales, Hydra pasó de 149,39 a 153,32 FPS; frame
p95/p99 7,0/7,6→6,8/7,0 ms; duración media de RasterDecoder en el proceso GPU
3,619→3,450 ms. Ese evento incluye envío/esperas, no es timer puro de shaders.
El ahorro mayor de motas ya se repitió: Raster 5,37→3,39–3,47 ms en otra
composición congelada; no sumar duraciones de ejecuciones distintas.

Enjambrito se probó con su cuerpo estático cacheado a 8×, manteniendo tres
fragmentos, órbita, ojos y cola. Escopuras con sus cuatro ojos agrupados en
cuatro envíos, manteniendo seguimiento individual. En conjunto dieron
149,39→150,07 FPS, y por separado 159,64→159,05/159,88 frente a control final
163,92: **no hay señal consistente para dejarlos en producción**.
El prototipo se archivó en `local/validation/subtle-render-20261014/common-candidate.js`.
Los pasos anteriores de esta investigación no prometen una mejora que no se midió.

## Verificación y evidencia

- `npm run quality`: 204 archivos de sintaxis; 226 suites, cero fallos; catálogo,
  higiene, 145 recursos y 87 referencias intactas.
- Electron: ocho escenarios, pausa, ajustes persistentes, alineación móvil y
  fallback tras pérdida GPU aprobados por `qa-space-environment.cjs`.
- QA visual de reposo y ataque en los ocho modelos implicados, presupuestos
  completos: ningún actor mutado. Enjambrito y Escopuras finales coinciden
  exactamente con la referencia; Hydra cambia sus detalles secundarios.
  Hoja antes/después: `local/validation/subtle-render-20261014/comparacion.png`.
- Respaldos anteriores al cambio en `local/validation/subtle-render-20261014/baseline/`.
  No se restauró ni descartó trabajo ajeno.

Informes: `overlap-performance/subtle-final-ten.json`, `subtle-live-reference.json`,
`subtle-live-hydra.json`; traces nuevos y desglose en
`gpu-layer-audit/subtle-details-summary.json` y `subtle-common-split.json`.

Repetir referencia/final de Hydra con motas optimizadas:

```powershell
node tools/performance/run_overlap.cjs --production-roster --detail-pass=reference --visible --fullscreen --graphic-space --response-motion --seconds=12 --label=hydra-reference-new
node tools/performance/run_overlap.cjs --production-roster --detail-pass=hydra --visible --fullscreen --graphic-space --response-motion --seconds=12 --label=hydra-final-new
node tools/performance/run_overlap.cjs --production-roster --hostiles=10 --visible --fullscreen --graphic-space --response-motion --seconds=12 --label=final-ten-new
node tools/qa-subtle-render.cjs
```

Cerrar/reabrir `ABRIR_V1.cmd` para ver los cambios locales en partida normal.
Los ejecutables antiguos y GitHub Pages publicados no se actualizaron aquí.
Las variantes de motas del harness previo ya coinciden con el render nativo
nuevo; no usar `--primitive-rects` como A/B nuevo después de esta integración.
Las variantes comunes rechazadas requieren su archivo archivado; el harness
se detiene si se intenta medirlas con el renderer normal, evitando falsos A/B.

Siguiente paso útil tras juicio visual del usuario: perfilar una escena real
con el visualizador musical y habilidades que usa, si todavía hay caídas.
No volver a limitar enemigos ni rediseñarlos globalmente sin costo medido.
