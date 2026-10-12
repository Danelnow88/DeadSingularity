# Rendimiento sin reducción visual — etapa 1

Proyecto: `C:/Users/party/Desktop/DeadSingularity V1`. Sin commit ni push.
Cambios previos del usuario preservados. Copia del renderer antes de esta etapa:
`local/backups/performance-health-20261010/enemies.before.js`.

## Aplicado

`js/render/enemies.js`: reutiliza 26 Path2D fijos, frente a los cinco previos.
Incluye brazos, órbitas, aspas y cavidad del dron; piezas del tanque y sus tres
patas; cuerpo del escudero, enjambre y kamikaze; cuerpo y boquilla del escupidor.
Cada geometría se construye una sola vez y se comparte entre entidades.
No se cachean frames, estados ni tamaños: memoria acotada, sin degradación por
reescalado. Todas las capas de fill/stroke/glow, colores y orden se conservan.
Ojos, retroceso, giro, pulso y curvas dinámicas siguen animados. No hay cambios
de simulación, IA, ataques, sombras, resolución, DPR, partículas ni ajustes reales.
Fallback vectorial conservado para entornos sin Path2D.

## Evidencia

- Validación final `npm run quality`: sintaxis, catálogo, manifiesto, higiene del
  repositorio y 190 archivos de tests aprobados, cero fallos.
- `tests/common_path_cache.js`: 26 objetos persistentes para cientos de entidades
  con variaciones de tamaño, estado y frame; no crecen por frame/entidad.
- `tools/qa-fixed-paths.cjs`: 192 casos, ocho familias, cuatro escalas, tres tiempos,
  dos estados; posiciones fraccionarias, rotación y alpha. Comparación contra el
  código anterior y contra fallback: error máximo por canal **cero**.
- Evidencia visual y microbenchmark alternado: `local/validation/performance-health/fixed-paths.json`.
- Benchmark aislado: `tools/performance/run_overlap.cjs --fixed-bodies`.
  Perfil temporal, 24 enemigos durables, gráficos high, partículas y heavyVfx,
  reducedEffects=false. No altera el perfil del jugador.
  Se excluyen kamikazes del stress sostenido porque se autodestruyen; están
  incluidos en la comparación visual. La prueba exige 24 enemigos vivos.
- `health-common-offscreen-before-valid-20261010.json` vs
  `health-final-offscreen-20261010.json`, en `local/validation/overlap-performance`:
  última ventana draw mean 1,3775 → 1,2804 ms, draw p95 1,8 → 1,7 ms;
  frame p95 12,2 ms en ambas. Son corridas breves offscreen, no certifican FPS
  físicos, compatibilidad de todos los dispositivos ni una mejora porcentual estable.
  Microbenchmark fluctúa: no se usa como promesa de aceleración.
- Corridas `--composited` ocultas quedaron a 1 FPS y NO sirven como evidencia
  de rendimiento. Primer intento offscreen con kamikazes perdió densidad y fue
  rechazado por el harness. Un ensayo intermedio coincidió con tests y no se
  utiliza para atribuir ganancias. Las evidencias existentes no se eliminaron.

## Continuidad

La captura del usuario tiene 2.866.524 eventos, sin muestras JS. Indica costo
principal en raster/deserialización/flush del hilo GPU, no en lógica JS.
Esta etapa reduce reconstrucción de geometría, pero no elimina ese cuello ni
demuestra 120–165 FPS sostenidos. No bajar gráficos para alcanzar la meta.

Siguiente etapa: comparar raster por familia en escenas visibles equivalentes,
sin tracing simultáneo con benchmarks y sin otros tests corriendo. Cualquier
cache de imágenes requiere resolución/transformación correctas y comparación
visual; no reemplazar animaciones por sprites borrosos ni eliminar capas.
Usar trazas con muestras JS solo si se necesita atribución interna de CPU.
La captura inicial tenía reducedEffects=true: comprobarlo antes de comparar
"todo al máximo", sin cambiar preferencias reales sin consentimiento.

Comandos:

```cmd
npm.cmd run quality
node tools/performance/run_overlap.cjs --fixed-bodies --visible --seconds=30 --label=health-manual
```

El launcher de desarrollo usa el código actual al cerrar y abrir nuevamente.
No se reconstruyeron instaladores, portables ni publicaciones de Pages en esta etapa.
