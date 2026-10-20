# Refresco y coherencia visual — 13/10/2026

## Estado de cierre

Auditoría y correcciones de coherencia terminadas. Se conserva el hábitat vivo,
los ocho paisajes, las estelas aprobadas, los efectos, la cantidad de entidades,
el combate, la cámara y los límites. No se migró a Rust/Wasm ni se redujo la
calidad para aparentar una mejora. No se publicó una nueva compilación.

**El objetivo de 165 FPS sostenidos y un piso de 100 FPS no está alcanzado.**
La siguiente tarea de rendimiento debe atacar el rasterizado de enemigos y
efectos Canvas, no reescribir primero la simulación.

## Cambios aplicados

- Reloj compartido de presentación, basado en segundos, para animaciones de
  jugador, enemigos, jefes, sectores, estrellas y feedback visual. Las vistas
  aisladas conservan su parámetro de frame cuando el reloj no está activo.
- Suavizado visual y amortiguación de partículas independientes del refresco,
  con el comportamiento de 60 Hz como referencia. No se cambió la física de
  proyectiles, el orden de actualización ni el paso de simulación del juego.
- Interpolación de la respuesta ambiental de 120 Hz entre pasos, compartida por
  CPU y textura GPU; cuatro arrays fijos adicionales (10.032 bytes).
- Mismo desplazamiento CSS de sacudida para Canvas principal y entorno WebGL.
  En pausa no se aplica sacudida ni avanza el reloj del mundo.
- Capa rítmica presente en cada dibujo: los modos de menor detalle mantienen
  un único Canvas cacheado entre actualizaciones, en vez de desaparecer al
  limpiar la pantalla. Sin cambiar el análisis de audio.
- Reloj independiente del lobby, incluido el bloqueo móvil en orientación
  vertical; no adelanta la simulación de la partida.
- Contador y telemetría calculan FPS mediante el intervalo medio, no la mediana.
  El contador sigue siendo opcional y no crea otro requestAnimationFrame.
  Tooltip y snapshot explican que mide callbacks rAF, no Hz ni presentación
  física. Se registra también el costo del callback completo y los picos.

## Mediciones reales

Electron visible, monitor LS32AG32x de 165 Hz, 1920×1080, escala 1,
RX 7800 XT activa mediante ANGLE D3D11/Skia Ganesh GL.

| Prueba | Resultado | Interpretación |
| --- | --- | --- |
| Pantalla completa, reposo visible | 164,29 FPS rAF | No hay límite artificial a 60 Hz |
| Carga pesada en ventana, versión original | 108,52 FPS | Referencia, 8 segundos |
| Carga pesada en ventana, versión sincronizada | 109,24 / 105,89 FPS | Dos capturas de 12 segundos; sin ganancia demostrable de FPS |
| Carga pesada final, pantalla completa | 92,15 FPS | 12 segundos, sin tracing; objetivo incumplido |
| Pantalla completa con tracing | 96,03 rAF / 96,12 presentación Chromium | Las dos métricas coinciden aproximadamente; no demuestra scanout físico |
| Solo diagnóstico: omitir dibujo de enemigos | 137,05 FPS | Señala un costo importante; NO es una optimización entregada |
| Solo diagnóstico: omitir dibujo de proyectiles | 98,34 FPS | Menor impacto que los enemigos; NO se entrega esta omisión |

Las capturas pesadas mantienen 24 enemigos, disparos y VFX completos salvo las
dos omisiones diagnósticas identificadas. No comparar ventana con pantalla
completa como si tuvieran igual cantidad de píxeles, ni tracing con capturas sin
tracing como prueba de mejora. Las duraciones inclusivas de categorías GPU se
solapan y no deben sumarse.

En la captura final con tracing el rasterizado medio es 6,58 ms (p95: 7,66 ms),
superior por sí solo al presupuesto de 6,06 ms de 165 Hz. La lógica y el envío
del dibujo son mucho menores (p95 aproximados: 0,4 y 1,9 ms respectivamente).
Chromium reportó 780 frames MAIN presentados y 533 descartados; los reportes
FORKED/PARTIAL no son frames adicionales. Esto explica por qué un contador
correcto no implica fluidez perfecta: también importan cadencia y picos.

## Experimentos que no se entregan al juego

Un cache Path2D de proyectiles fue visualmente idéntico, pero no mejoró de forma
demostrable el rendimiento: 106,34 / 106,14 FPS frente a 109,24 / 105,89 sin
cache. Se retiró del renderer de producción; queda únicamente como candidato
optativo en tools/performance/projectile_paths_candidate.cjs.
Canvas desynchronized tampoco resolvió los picos y no se activó en producción.
No se deshabilitaron enemigos, partículas ni efectos en el juego.

## Validación y reproducción

- npm run quality: aprobado tras los últimos ajustes; 226 pruebas, 0 fallos,
  sintaxis y contenido correctos, 145 recursos verificados y 87 archivos de la
  referencia congelada intactos. git diff --check sin errores de whitespace.
- tools/qa-refresh-coherence.cjs: 194 comparaciones nativas sin diferencia de
  píxeles, animación equivalente a 60/165 Hz, contador honesto, ritmo cacheado,
  alineación de sacudida y pausa. Resultado: aprobado.
- tools/qa-fps-counter.cjs: controles, persistencia y ubicación PC/móvil.
  Resultado: aprobado.
- tools/qa-space-environment.cjs: ocho mapas, ajustes, pausa, alineación móvil
  y fallback de pérdida GPU. Resultado: aprobado.
- Resultados locales: local/validation/refresh-coherence y
  local/validation/overlap-performance/refresh-*-20261013.json.
- tools/performance/analyze_refresh_trace.cjs permite analizar las trazas
  guardadas sin abrir el juego ni modificar sus fuentes.

Cerrar la instancia anterior y abrir ABRIR_V1.cmd para jugar con las fuentes
actuales. PROBAR_ENTORNO_VIVO.cmd conserva el laboratorio aislado. Los EXE
anteriores no contienen estos cambios; no se generaron paquetes web/APK/EXE,
ni se hicieron commit o push.

## Próxima etapa, no implementada en este cierre

Medir y optimizar el rasterizado Canvas de enemigos y VFX: separar siluetas
estáticas de ojos/animaciones, estudiar caches y agrupación de operaciones,
validar píxeles y cadencia antes/después con la misma carga y resolución.
Solo considerar mover una capa a GPU si esas mediciones lo justifican.
Conservar todos los efectos aprobados; no prometer un piso de FPS universal
sin medir hardware, resolución y las cargas representativas.

Referencias técnicas: [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame),
[Canvas getContext](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext),
[Electron Display](https://www.electronjs.org/docs/latest/api/structures/display) y
[Electron contentTracing](https://www.electronjs.org/docs/latest/api/content-tracing).
