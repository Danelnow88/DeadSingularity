# Élites: legibilidad y postura — muestra aislada

## Actualización: integración aprobada — 15/10/2026

El usuario aprobó la muestra y autorizó integrarla para jugar/probar en Electron.
Roster normal y prueba usan `refinedEliteReadability:true`, que el constructor
copia a las tres especies. Se precargan solo las tres texturas v2 en la partida;
no las v1 además. Postura activa automáticamente al perseguir y se asienta al
detenerse/atacar. Tamaños, ojos, hitboxes, IA, daño, spawn y ataques intactos.
`NV.__eliteReadability=false` conserva el A/B anterior en diagnóstico; imágenes
v1 y galería de comparación preservadas. No se hizo commit, push ni publicación.

Abrir ABRIR_V1.cmd tras cerrar la versión anterior para probar en partida.

### Comprobación Electron de integración

1080p, high/full, partículas y efectos activos, escopeta real, movimiento WASD,
ocho segundos de captura por caso, ejecuciones secuenciales. FPS = cadencia del
bucle, no medición física de scanout ni GPU hardware. Percentiles de intervalos
de rAF de la captura completa, no solo último segmento del monitor:

| Carga / versión | FPS | p95 /p99 ms | Peor ms |
|---|---:|---:|---:|
|10 enemigos /v1|163,60|6,1 /6,2|26,3|
|10 enemigos /v2 integrada|163,68|6,1 /6,2|31,4|
|24 enemigos /v1|148,73|7,8 /11,6|42,4|
|24 enemigos /v2 integrada|150,12|7,6 /10,8|38,9|

Sin regresión grande de cadencia detectada en estas pruebas cortas; NO demuestra
mejora significativa ni garantiza165 estables. Hay picos en ambas. La escena10
contiene Asesino/Fantasma; escena24 incluye las tres especies, dos de cada una.
No es una partida humana completa ni todos los consumibles simultáneos. No se
redujo calidad/cantidad para pasar: se comprueba presupuesto constante y tierfull.
Informes `local/validation/overlap-performance/elite-integrated-*-20261015.json`.

Tests comprueban elección de v2 sin override, retorno v1 diagnóstico, copia del
flag en spawn/roster, ojos, poses de ataque y no mutación. Los apartados de abajo
describen la preparación histórica de la muestra, antes de esta aprobación.

## Cómo verla

Doble clic en `PROBAR_ELITES_LEGIBLES.cmd` desde la raíz real del proyecto.
Cada columna tiene ACTUAL a la izquierda y PROPUESTA a la derecha; la fila
inferior usa referencia de1920px/900 unidades de cámara base, sin zoom adicional.
La escala final cambia con ventana/zoom real, por lo que no es una regla universal.
Los botones separan movimiento, postura, ruido ilustrativo y pausa.

No cambia el aspecto de la partida normal. Asesino/Fantasma/Goliat conservan sus
texturas aprobadas mientras `NV.__eliteReadability` no sea true. Enjambrito,
hitboxes, ojos aprobados (+20%), tamaños y mecánicas permanecen iguales.

## Arte alternativo no destructivo

Habilidad imagegen, herramienta integrada, modo edición `precise-object-edit`.
Una edición por sprite original, transparencia preservada; sin CLI ni claves.
Nuevas copias de proyecto:

- assets/elite-creatures/asesino-readable-v2.png
- assets/elite-creatures/fantasma-readable-v2.png
- assets/elite-creatures/goliat-readable-v2.png

Se conservaron el contorno, paleta, encuadre y cavidad ocular. Se redujeron
moteado y fisuras diminutas y se ampliaron los planos de luz y sombra. No se
añaden ojos pintados, cuchilla, boca, partes humanas, partículas o halos.
Las pupilas siguen dibujándose en vivo por el motor.

### Prompt común utilizado

Use case: precise-object-edit. Edit target: the single attached existing
transparent game creature sprite. Refine ONLY its INTERNAL material readability
for a fast 2D roguelite where this full sprite is displayed only 65-100 pixels
tall. Preserve the exact existing outer silhouette, orientation, proportions,
palette, empty eye cavity location and size, and framing/margins. Do not redesign
the creature. Replace tiny noisy surface mottling and hairline cracks with FEWER,
BROADER intentional planar shadows, wider soft-edged bevel highlights and a few
clear wider seams. Keep beautifully painted volumetric surfaces and organic life,
not a flat icon or simplistic geometry. Maintain dimensional mineral/chitin
material, no photographic microtexture. Keep the cavity fully dark and empty:
the engine draws three live eyes on top, do not paint any eyes. No face-mouth,
no added blade or weapon, no humanoid anatomy, no legs or arms. Keep all
background genuinely transparent, crisp alpha silhouette, no drop shadow or
exterior glow halo, no text, no new particles. Existing light accents must remain
disciplined, not cover the body. This is a conservative readability pass, not an
identity change.

### Sufijos por edición

Asesino (target: asesino-painted-v1.png): Preserve hooked organic side lobes and
slender pointed silhouette, violet seams and muted violet stone plates. No
central knife under the cavity.

Fantasma (target: fantasma-painted-v1.png): Preserve the spectral pearl-white
floating husk, three cyan flowing wisps and their exact contour, controlled cyan
highlights. Keep a ghostly soft material, not solid grey rock.

Goliat (target: goliat-painted-v1.png): Preserve the very broad heavy pink-rose
armored silhouette and all main protrusions. Merge small nested fractures into
broad weighty armor planes; retain central dark eye recess at its original position.

## Postura de persecución (solo propuesta)

Una inclinación máxima de0,075 rad (~4,3°) y desplazamiento de1,5 unidades
locales, suavizados en tiempo real. Se activa por desplazamiento observado del
actor, no por mover el ratón ni por simular velocidad inexistente. Se asienta
al detenerse y durante anticipación/ejecución/recuperación del ataque; ignora
saltos/teletransportes. No gira completamente el arte frontal. Usa WeakMap,
no escribe en entidades, no cambia IA, no añade dibujos ni filtros por frame.

Texturas alternativas usan el mismo límite400px y lente64px del render actual;
se preparan solo en la muestra o con flag de benchmark. Partida normal no las
descarga ni prepara sus superficies. Más definición NO implica más geometría.

## Verificación

La captura valida seis texturas con alpha, tres seguimientos oculares, animación,
integración de ataque existente y restauración de Canvas. Test elite_chase_pose
verifica límite, reposo, ataques, no mutación y equivalencia60/165Hz.
Captura/informe: local/validation/elite-readability-20261015/preview.png y preview.json.
No usar el FPS de la galería como evidencia de rendimiento del juego.

Estado: muestra para valoración visual; no adopción en partida.
Validación final: `npm run quality`, 228 suites sin fallos, manifiesto154 recursos,
87 archivos congelados idénticos; capturas de galería original y nueva pasan.

### Prueba preliminar de carga (no aprobación de rendimiento)

Dos ejecuciones secuenciales con24 enemigos, 1080p, high/full: control116,10 FPS,
propuesta100,98 FPS; p95/p99 reportados por el monitor12,2/12,2 ms frente a
18,2/18,3 ms. No son tiempos de GPU. Se intentó repetir el control, pero falló
el contrato `Stress quality changed`: no generó informe válido, no cuenta como
confirmación. Esa variación impide atribuir un ahorro o regresión estable a la
textura/postura. No se adopta en producción ni se presenta como optimización.
Fuentes: local/validation/overlap-performance/elite-readable-control-20261015.json
y elite-readable-candidate-20261015.json. La variante B de control NO es válida.
Pendiente comparación repetible antes de cualquier integración.
