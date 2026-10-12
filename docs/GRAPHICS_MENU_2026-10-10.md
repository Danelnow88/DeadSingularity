# Menú de gráficos

Nueva pestaña minimalista: resolución interna, pantalla completa, calidad,
partículas, efectos de élites, reducir destellos, FPS y estado VSync automático.
Las descripciones se consultan con hover, foco de teclado o tap en el nombre.
La ayuda queda visible debajo de la lista, incluso al desplazar sus opciones.

Resolución de escritorio: automática (comportamiento anterior), 720p, 1080p y
1440p QHD/2K. Son presupuestos de render interno dentro de 1280×720, 1920×1080
y 2560×1440; se mantiene el aspecto de la ventana. Por ejemplo, una ventana
16:10 en 1440p dibuja a 2304×1440. El panel informa el tamaño efectivo. No cambia
la resolución del monitor, la caja CSS, la arena ni la conversión de entrada.
Móvil conserva la resolución automática y los límites previos de backing store.

Las preferencias anteriores de calidad/efectos se migran sin reemplazarlas.
Valores desconocidos de resolución vuelven a automática. Restaurar sólo cambia
graphics: conserva audio, controles, progreso y preferencias de accesibilidad.
Texto grande y lenguaje suave siguen disponibles en Controles. El compositor
GPU experimental sólo se muestra con `?devGraphics=1`; su API de diagnóstico
sigue disponible y no se presenta como opción gráfica de producción.

VSync se informa como automático: requestAnimationFrame se coordina con el
refresco del navegador. No se agregó un toggle sin soporte ni flags que alteren
el loop. Referencia: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame

Validación: tests/graphics_resolution.js verifica tamaños, migración,
persistencia, cámara/input, reset aislado y móvil/ultrawide. El QA real
tools/qa-graphics-settings.cjs verifica dimensiones de Canvas, ayudas, recarga
y layouts; capturas e informe en local/validation/graphics-settings.
Respaldo local previo del menú: local/backups/graphics-menu-20261010.

Resultado final: `npm run quality` pasó con 197 suites, cero fallos; entrega
verificada con 106 recursos y los 87 archivos de referencia intactos. QA real
de gráficos pasó en 1280×800, móvil horizontal 844×390 y vertical 390×844.
Build web: `releases/DeadSingularity-V1-web-RS2KIq` (7,41 MiB de recursos).
El launcher `ABRIR_V1.cmd` carga este código actual; el portable empaquetado
anterior no se regeneró. Sin commit, push ni publicación en esta pasada.
