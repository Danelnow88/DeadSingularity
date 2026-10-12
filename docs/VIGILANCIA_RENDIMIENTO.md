# Vigilancia de rendimiento

El juego se deja en el estado actual: no bajar calidad, densidad, partículas,
estelas ni efectos para perseguir un número de FPS. El objetivo de 120 FPS
sostenidos sigue abierto; las mediciones disponibles muestran que aún hay
variación bajo carga y no certifican ese objetivo en todos los equipos.

## Protección contra regresiones

`npm test` incluye pruebas de contrato y regresión que conviene mantener en cada
cambio del loop, entidades, colisiones o render: `tests/knockback_time.js`
(30/60/120/144/165 Hz, jitter y referencia de 60 Hz),
`tests/health_trio.js` (reutilización y equivalencia de efectos) y
`tests/performance_overlap_contract.js` (condiciones de medición comparables).
`npm run quality` ejecuta además las verificaciones generales del proyecto.
Estas pruebas protegen invariantes y no sustituyen una medición real del juego.

## Medición manual comparable

Desde la raíz del proyecto, con Electron disponible:

```cmd
npm.cmd run measure:overlap -- --visible --common-wave --seconds=30 --label=manual
```

El harness usa perfil aislado y gráficos completos. No iniciar DevTools ni
grabación externa durante la comparación: se mide también su coste. Revisar el
informe recién generado bajo `local/validation/overlap-performance`; aceptar la
medición sólo si el proceso terminó normalmente, hubo muestras nuevas y la
densidad y escenario se mantuvieron iguales. Para una comparación A/B, conservar
hardware, resolución, calidad, oleada, duración y etiqueta del escenario. Hacer
tres corridas por versión y comparar mediana, p95/p99 de frame time y mínimos;
no tomar el pico de FPS como resultado.

Para investigar un tramo largo, usar la captura integrada documentada en
README: `npm.cmd run desktop -- --profile-performance`, F8 para iniciar/detener,
F7 para marcar y enviar `performance.trace.json.gz` junto con `session.json`.
Evitar el profiler de DevTools si vuelve a provocar el crash del navegador.

## Límites de interpretación

- No certificar 120 FPS con el contador visual ni con una prueba sintética sola.
- No aceptar mejoras con menos enemigos, efectos, partículas o calidad.
- Cambios de rendimiento deben incluir prueba de equivalencia visual y gameplay
  cuando afecten dibujo, cachés, pooling o ciclo de vida de entidades.
- Una captura sin crash sólo dice que esa sesión terminó; no demuestra que el
  error `STATUS_ACCESS_VIOLATION` esté resuelto.
- Mantener los informes representativos recientes; limpiar únicamente
  duplicados exactos o datos regenerables, nunca trazas únicas sin autorización.

Puntos de partida y límites históricos: `docs/PERFORMANCE_ECONOMY_PASS_2026-10-09.md`,
`docs/TIME_STANDARD_2026-10-10.md` y `docs/HEALTH_TRIO_2026-10-10.md`.
