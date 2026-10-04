# Tráiler: metal pesado y ruinas — 03-10-2026

## Último ajuste: oro pulido reflectante

Pedido posterior: evitar amarillo plano y acabado áspero, reflejar luz como
metal pulido tanto en las caras como en la profundidad marcada en verde.
El frente combina reflejo del fondo real, tintado de oro, zonas ámbar oscuras,
reflejos blancos estrechos y el barrido original. La cámara mueve esos reflejos.
La profundidad tiene luces direccionales actualizadas a24Hz en sus diez cachés;
conserva las30 capas y máscaras originales, por lo que su contorno estratificado
no se sustituye por otra geometría. Son reflejos simulados con Canvas2D, no
trazado físico de rayos ni refracción de vidrio.

Se redujeron picaduras/cepillado y se excluye el texto del grano de película;
el grano del fondo, la escena, partículas, nombre/encuadre, caída/apilado, cámara,
audio y controles se conservan. No se modifica el arranque del juego.
Base recuperable: `previews/trailer-metal-2026-10-03/before-mirror.html`.
Auditoría `node tools/audit_trailer.cjs --polish`:24 funciones protegidas y
fondos/build/poses intactos. QA Edge/Electron con `--polish` en los cuatro tamaños
ya documentados; además comprueba que cambien los reflejos de cara y profundidad
con la cámara y que las máscaras no pierdan opacidad por actualizaciones sucesivas.
Evidencias: `contracts-mirror.json`, `edge-mirror/`, `electron-mirror/`.
Captura actual: `edge-mirror/metal-1912-13.40.png`.
Coste local del callback en reproducción normal1280x800: Edge mediana2.1→2.7ms,
p953.1→4.1ms; Electron mediana2.4→3.1ms, p953.3→4.9ms. El material nuevo
tiene un coste medible (~29% de mediana); pasa el presupuesto de QA, sin
afirmar FPS/GPU ni rendimiento en teléfonos físicos.
`npm test`:165 suites,0 fallos. Sin commit/push.

Actualización posterior aprobada: título **DEAD SINGULARITY** y material de
oro amarillo brillante, con reflejos claros y sombras ámbar profundas según
la referencia de lingotes. DEAD arriba, SINGULARITY abajo. Se mide cada palabra
con Impact/espaciado reales antes de crear máscaras: límite de ancho del sprite
inferior76% y superior48% del viewport, incluyendo padding. Conserva zoom,
proyección y encuadre; ambas palabras quedan con≥6% de margen horizontal en
poses asentadas. La portada y pestaña HTML también muestran el nombre correcto.
Fondo, efectos, audio, cámara, caída y controles conservan exactamente su código
respecto de la versión metálica aprobada; sólo cambian nombres, paleta y ajuste
de tamaños. La altura de contacto se resuelve por la fórmula existente a partir
de la altura real de SINGULARITY.

Base previa a este ajuste: `previews/trailer-metal-2026-10-03/before-gold.html`.
QA actualizado: `node tools/audit_trailer.cjs --gold`, verificador Edge con
`--gold` y Electron con `--gold`. Evidencias `contracts-gold.json`,
`edge-gold/`, `electron-gold/` en la misma carpeta. Las capturas y resultados
sin sufijo gold que siguen abajo corresponden a la etapa anterior.

Estado: tratamiento visual aplicado al HTML actualizado por el usuario,
`dev/TRAILER CINEMATIC.HTML`. Abrir `ABRIR_TRAILER.cmd` o ese HTML directamente.
Autónomo, sin fuentes, scripts ni imágenes externas. El HTML ahora dice
DEAD SINGULARITY y conserva la tipografía Impact original.
Esta tarea modifica la escena autónoma; no añade una pantalla nueva al arranque
del juego ni cambia el paquete/lanzador de juego verificado anteriormente.

## Dirección visual aplicada

Se conserva el volumen original por capas hacia el punto de fuga, las máscaras,
los agujeros, la perspectiva, la caída, la deformación/apilado y los impactos.
Frente de acero brillante con zonas grafito y reflejos de cobre/champagne;
laterales acero oscuro, bisel superior iluminado. Cepillado y pequeños reflejos
de metal caliente se cachean al construir; los reflejos se recortan a la cara.
La aberración del impacto usa ámbar/blanco acero. El barrido de luz existente
conserva su recorrido y timing.

Los chispazos pasan a blanco caliente/ámbar/naranja. Hay más partículas en los
tres eventos de impacto existentes; el choque superior agrega siete puntos
de emisión a lo largo de la unión real proyectada. Tope450 chispas, misma
gravedad/rebote/vida. Los restos y comportamiento del TV se conservan.

El fondo usa tres capas de ruinas y picos anclados al horizonte, pequeñas
chimeneas/fuegos/ventanas, cielo vino/púrpura oscuro y rojo quemado, planeta
cobrizo, humo y brasas cálidas. Suelo oscuro y grietas ámbar; rejilla atenuada.
Parallax, cámara, viñeta, letterbox, resolución/DPR y encuadre son los existentes.
Bloom ambiente bajó de0.22 a0.13 para preservar grafito y lectura; la respuesta
del flash mantiene los tiempos previos.

## Verificación

- `tools/audit_trailer.cjs`: sintaxis del script inline;26 funciones comparadas
  con la base, audio y controles intactos, funciones de cámara/proyección,
  poses de títulos (sólo cambia glowColor), máscaras/extrusión y eventos
  trailer:end/trailer:skip conservados. Sin dependencias de Internet.
- `tools/verify_trailer.cjs`: Edge real headless, perfil temporal; captura y
  comparación determinista de poses/dimensiones/cámara/timeline en3.8,4.2,
  5.22,6.4,13.4 y14.3s. Tamaños1912x844,1280x800,915x412 y844x390.
- `tools/verify_trailer_electron.cjs`: mismos casos en Electron aislado,
  HTML local y Node deshabilitado en la página. Exit0, sin errores.
- Silenciar/desmutear, repetir, Escape y evento final único comprobados en los
  cuatro tamaños. Pantalla completa comprobada durante reproducción real.
- Dos reproducciones reales adicionales por renderer. Mediana de trabajo
  de frame en Edge: base2.4ms/nuevo2.2ms; p95:3.4/3.3ms.
  Electron: mediana2.8/2.8ms; p95:4.1/4.0ms. Son mediciones locales de CPU
  durante callback, no garantía de FPS/GPU ni de teléfono físico.
- `npm test`:165 suites,0 fallos. Sin cambios de gameplay, balance, métricas
  del mundo, HUD, audio del juego o lanzador principal. Sin commit/push.

El verificador instrumenta sólo sus páginas de prueba: reloj/RNG reproducibles
y observación de llamadas al renderer. El HTML de entrega usa su loop normal.
Se prueba además reproducción normal para que ese reloj no oculte errores.

Evidencia: `previews/trailer-metal-2026-10-03/contracts.json`,
`edge-final/report.json`, `electron/report.json`, `electron/result.json` y PNGs.
Captura final: `edge-final/metal-1912-13.40.png`.
Copia original completa previa a esta edición: `original.html` en esa carpeta.
No se descarta ni restaura automáticamente trabajo local.

## Archivos y continuidad

Modificados en esta tarea: `dev/TRAILER CINEMATIC.HTML`, `README.md`,
`docs/AI_START_HERE.md`.
Nuevos: `ABRIR_TRAILER.cmd`, este informe, `tools/audit_trailer.cjs`,
`tools/trailer-qa.cjs`, `tools/verify_trailer.cjs`,
`tools/verify_trailer_electron.cjs`. Las evidencias quedan en previews.

La implementación y QA están terminadas. Siguiente paso artístico: verlo
reproduciéndose y ajustar únicamente materiales/fondo/VFX si el usuario
señala algo. Conservar la copia base y volver a ejecutar auditoría/comparación
tras cualquier cambio. Una futura integración al arranque se trata como tarea
separada, con el mismo evento final/skip y sin alterar gameplay.
