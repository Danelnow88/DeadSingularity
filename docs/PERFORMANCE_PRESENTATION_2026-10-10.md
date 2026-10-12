# Etapa 2: comprobar FPS sostenidos, no solo coste JS

No cambia la presentación de producción. No hay commit, push ni builds.
Validación final: `npm run quality`, 190 archivos de tests, cero fallos.
Se verificaron high/full, 24 enemigos y efectos completos en todas las muestras
de las siete comparaciones, y hashes intactos del Canvas y sectores de producción.
Se amplió únicamente `tools/performance/electron_overlap.cjs` para medir
FPS del tramo completo con frames/timestamps del renderer, registrar los
atributos realmente concedidos por Canvas y admitir `--canvas-mode=desync`.
Este modo sustituye el módulo Canvas solo en la respuesta del servidor temporal;
`js/render/canvas.js` permanece sin modificar. No se cambian alpha, resolución,
antialias, color, partículas, sombras, efectos ni preferencias reales.

## A/B visible, sin tracing ni tests simultáneos

1920×1080, 24 enemigos durables, mismo seed/composición, escopeta III,
explosiones periódicas, high/full, heavyVfx=true, particles=true,
reducedEffects=false. Perfil temporal en cada corrida. Cuatro segundos de
warmup. Los FPS son callbacks de juego por tiempo real del renderer;
no constituyen contadores de presentación física de cada frame del compositor.

| Corrida | Duración solicitada | Canvas | FPS de todo el tramo |
| --- | --- | --- | --- |
| default-a | 12 s | normal | 134,71 |
| desync-a | 12 s | baja latencia | 137,72 |
| desync-b | 20 s | baja latencia | 134,98 |
| default-b | 20 s | normal | 137,57 |

El navegador concedió desynchronized=true en ambas candidatas. El orden se
invirtió para detectar warmup/variación. Los rangos se solapan: primera pareja
mejora y segunda empeora. **No hay aumento sostenido demostrado.** No activar
esta candidata en producción ni usar su mejor muestra para anunciar ganancias.
Frame p95 sigue aproximadamente 12,1–12,2 ms. El objetivo sigue pendiente.

Archivos en `local/validation/overlap-performance/presentation-*.json`:
estados, telemetría, versiones, GPU, configuración, atributos reales y muestras.
`measuredFPS` cuenta frames del tramo; evita inferir FPS sostenidos a partir de
una sola ventana rolling de 240 frames. La simulación sigue en tiempo real, por
lo que dos corridas no son una reproducción determinista idéntica píxel a píxel.
La igualdad de densidad es necesaria, no suficiente para certificar una mejora.

## Continuidad

Diagnóstico visible de capas (12 s, no entregable): sin cuerpos de enemigos
164,24 FPS; sin backdrop/starfield 151,32 FPS. La simulación/densidad se mantiene.
Esto localiza trabajo, NO demuestra que se puedan alcanzar esos FPS manteniendo
todos los gráficos. Los costes interactúan; no sumar ganancias de omisiones.

También se probó convertir las tres superficies del sector a ImageBitmap una
sola vez por cache build, con cierre de recursos al cambiar sector/variante/tamaño.
`tools/qa-background-bitmap.cjs`: 72 casos, sectores, tiers, variantes, escalas y
alpha fraccionario; error por canal cero. No modifica animaciones ni resolución.
Resultados visibles de 20 s: bitmap-a 132,67; control Canvas 133,34;
bitmap-b 134,60 FPS. Nuevamente no hay ganancia sostenida demostrada.
La candidata quedó SOLO en `local/backups/performance-health-20261010/sectors.candidate.js`;
se utiliza con `--background-bitmap` en el servidor temporal del harness.
`js/render/sectors.js` y `js/render/canvas.js` de producción no fueron alterados.
No activar candidatos que fallaron la condición de rendimiento como defaults.
Evidencias: `background-bitmap-*.json`, `background-canvas-c-20261010.json`,
`raster-isolate-*.json` y `local/validation/performance-health/background-bitmap.json`.

No desactivar GPU, cambiar backend ni quitar efectos como supuesto arreglo.
La traza original indica trabajo importante en raster/deserialización/flush.
Los benchmarks de aislamiento de capas son exclusivamente diagnósticos:
eliminar enemigos/fondo de una muestra nunca cuenta como mejora de producción.
La etapa siguiente debe reducir ese trabajo (composición/cache GPU de partes
estables preservando resolución, orden, transparencias y animaciones) y pasar
comparación visual antes de repetir A/B visible en varios tramos de 30–60 s.
No migrar de motor completo solo para ganar FPS sin justificarlo por evidencia.

Repetir, en orden alternado, sin otros benchmarks/tests simultáneos:

```cmd
node tools/performance/run_overlap.cjs --visible --seconds=30 --label=verify-normal
node tools/performance/run_overlap.cjs --visible --seconds=30 --canvas-mode=desync --label=verify-low-latency
```

Referencia técnica: https://html.spec.whatwg.org/multipage/canvas.html
La opción desynchronized es una sugerencia de latencia, no una garantía de FPS.
