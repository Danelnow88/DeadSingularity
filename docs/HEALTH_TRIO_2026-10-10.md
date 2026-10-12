# Salud y coordinación del trío — 2026-10-10

## Etapa pequeña autorizada

Se conserva el límite actual de diez hostiles. No cambian estadísticas,
daño, tiempos de aviso/actividad, renderer, efectos, estelas, sonido ni resolución.
No se convierte el juego Canvas 2D a otro motor ni se migra su loop.

- Textos flotantes y ondas se compactan en sus mismos arrays, en orden estable.
  Se elimina la creación de dos arrays de actualización por frame, no los objetos
  visibles ni su animación. No se añade un pool que retenga referencias a jefes.
- Costurero y Devorador conservan una única zona simultánea. Se prioriza la espera
  acumulada de atacantes elegibles para reducir favoritismo por orden de array.
  Los candidatos fuera de cámara, alcance o aturdidos no bloquean la admisión.
- Devorador anticipa hasta 0,4 s de la velocidad filtrada del jugador, con
  desplazamiento máximo 60 unidades y margen respecto del núcleo inicial seguro.
  La geometría no persigue al jugador tras iniciarse el aviso. El Francotirador
  conserva su comportamiento y su reserva independiente de descarga.

No se añadió un director táctico completo ni selección de cobertura. La mejora
del Costurero en esta etapa es coordinación/admisión, no una nueva IA de rutas.

## Evidencia y límites del diagnóstico

Trace-20261010T150553.json.gz: 284379191 bytes descomprimidos, 1371670 eventos,
450 screenshots. Se observaron 9000 callbacks de animación a lo largo de 55,394 s:
162,45 callbacks/s medios, p95 6,169 ms, p99 12,199 ms. No son FPS físicos ni
certifican todos los estados de juego. Otros procesos tienen una ventana distinta.

Heap JS observado entre 10583364 y 25983688 bytes; último MajorGC libera de
24038732 a 11532448 bytes. 27 MajorGC, máximo 5,477 ms; 20 MinorGC, máximo 1,478 ms.
No hay evento explícito de crash/OOM. No se demuestra una fuga JS ni se descarta
un problema nativo/GPU. GPUTask acumula 35802 ms en el hilo del proceso GPU:
es tiempo de tareas, no una medida de utilización física de la GPU.

No se afirma arreglado STATUS_ACCESS_VIOLATION ni un aumento sostenido de FPS.
La compactación reduce asignaciones concretas; el siguiente benchmark debe ser
sin profiler y a carga equivalente. El archivo de diagnóstico existente de
Electron ya recoge render-process-gone durante el modo optativo de perfilado.

## Validación reproducible

tests/health_trio.js compara los efectos con la actualización por filter,
verifica orden/lifetime/animación y reutilización del array, equidad de zonas
a 30/60/120 FPS, exclusión fuera de cámara, anticipación acotada y cancelación.
tests/dimensional_threats.js mantiene avisos, colisión, defensas, pausa y render puro.
tools/qa-threat-redesign.cjs comprueba enemigos reales en desktop y viewport mobile,
sin tocar el perfil del usuario. No representa pruebas en teléfonos físicos.

Comandos: npm run quality; npm run build:web; ejecutar el QA nativo con Electron
y ELECTRON_RUN_AS_NODE ausente. Logs: local/validation/performance-health/quality-health-trio.log;
reporte nativo: local/validation/threat-redesign/report.json.

Resultados: 195 pruebas, cero fallos; build web Z1MNb5 verificada con 105 recursos.
QA nativo pasó los seis casos (tres identidades, desktop y viewport mobile),
incluidos fases, daño, pausa, bajas reales y reset. Renderer y bloque de estelas
se compararon con el estado anterior y permanecen intactos.

## Continuidad

Backups del estado local previo: local/backups/health-trio-20261010/.
No descartar otros cambios ni restaurar desde Git. No commit/push/instalador nuevo.
Las revisiones de caché de index.html se actualizan y se regenera el manifiesto.

Siguiente evidencia imprescindible para investigar el crash: versión exacta del
navegador/controlador, si ocurre sin grabar, y reporte/minidump nativo. Comparar
la misma escena sin DevTools, con DevTools y grabando sin screenshots/paint
instrumentation. Mantener aceleración GPU y gráficos; no aumentar heap ni forzar
GC como supuesto arreglo. Después medir superficies/cachés y composición antes
de hacer una refactorización grande de render o implementar pooling adicional.
