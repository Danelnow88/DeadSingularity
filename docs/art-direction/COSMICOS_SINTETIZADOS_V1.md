# Cósmicos sintetizados · prueba de legibilidad · 15/10/2026

Actualización: aprobación e integración completadas con Espíritu +20%, Corredor
+5% y Escopuras sin aumento. Ver COSMICOS_SINTETIZADOS_INTEGRADOS_V1.md. El visor
ahora identifica la síntesis integrada y permite comparar los tamaños anteriores.
El texto siguiente conserva el registro de la propuesta original.

Estado: propuesta aislada para aprobación, NO integrada. No cambia los sprites
actuales, sus animaciones, los tamaños del juego, el balance ni los radios físicos.
«Fantasma» se interpretó por contexto como Espíritu cósmico rojo de un ojo,
no el Fantasma élite, cuyo diseño aprobado queda intacto.

## Abrir y valorar

En la raíz, doble clic en PROBAR_COSMICOS_SINTETIZADOS.cmd. Abre Electron
maximizado con perfil temporal independiente. También se puede abrir
previews/cosmic-readability.html directamente en navegador.

Tres botones seleccionan Corredor, Escopuras y Espíritu. Izquierda: original;
derecha: propuesta. Arriba: textura ampliada al mismo ancho. Abajo: comparación
del tamaño de combate, calculada con los tamaños y perfiles actuales del render:

| Criatura | Ancho corporal previo a cámara | Referencia 1080p (1920/900) |
|---|---:|---:|
| Corredor | 100 × 0,46 = 46 | 98,13 px |
| Escopuras | 90 × 1,35 × 0,48 = 58,32 | 124,42 px |
| Espíritu | 56 × 1,40 × 0,56 = 43,904 | 93,66 px |

Los anchos incluyen los márgenes transparentes de la imagen. La ventana avisa
si reduce la lámina; el DPR evita que el backing store introduzca pixelación.
El selector +10% afecta solo la propuesta y solo en el visor. Fondo claro/oscuro
y ruido ilustrativo permiten juzgar contraste. No es una simulación de combate.
La comparación es estática deliberadamente: no confundir una textura sintetizada
con un rig de animación ya adaptado y probado.

## Criterio

Mantener criaturas no humanoides, siluetas, grandes pliegues, ojos y sus colores
ámbar/verde/rojo. Ampliar el ritmo de crestas plateadas, valles negros y grupos
de estrellas; sintetizar el microdetalle que se pierde al bajar a ~100 px.
No se aplicó un filtro de nitidez global ni se sustituyó el material por formas
planas. Las variantes son ediciones generativas: no garantizan identidad exacta
del contorno o de la posición de cada píxel; revisar antes de promoverlas.

Se usó la habilidad imagegen con la herramienta integrada (no CLI). Originales
intactos en assets/cosmic-creatures/. Nuevas imágenes de propuesta:

- previews/concepts/cosmic-readability-v1/runner-sintetizado-v1.png
- previews/concepts/cosmic-readability-v1/spitter-sintetizado-v1.png
- previews/concepts/cosmic-readability-v1/wisp-sintetizado-v1.png

## Prompt común enviado

Use case: precise-object-edit. Asset type: transparent 2D game sprite, a
non-destructive readability variant, not a redesign. Edit only the supplied
creature. Preserve EXACT outer silhouette, pose, composition, transparent margins,
anatomical count, eye placement and original character identity. Preserve glossy
black living cosmic folded material and silver edge light. User loves this
design; do NOT turn into simple geometric shapes, cartoon, armor, robot or
humanoid. Synthesize INTERNAL texture for approximately 90-pixel on-screen width:
preserve every major fold and eye, but consolidate hairline nested ridges into
fewer, thicker, elegantly curved fold highlights; replace microscopic star dust
with readable larger restrained clustered stars and connected color veins in
same original locations. Make dark valleys and broad silver curved ridges
distinct, not a mass of glitter. Rich painted sculptural material, NOT flat
simplification. No extra anatomy, no limbs, no text, no backdrop or halo. Keep
the same framing/aspect as source. True transparent background. This is enlarging
the visual rhythm of details, not removing character features.

### Sufijo Corredor

Corredor: TWO eyes unchanged and same swept triple trailing fold structure,
AMBER stars/veins. Keep both eyes identical in size/location.

### Sufijo Escopuras

Escopuras: FOUR eyes unchanged, same wide folded body and bottom-right siphon
mouth; GREEN stars/veins. Preserve mouth design, no mouth alteration.

### Sufijo Espíritu

Espíritu: ONE eye unchanged, same curling comma body and tapering tail;
RED stars/veins. Keep all anatomy. Not the elite Fantasma.

## Validación y siguiente paso

tools/preview-cosmic-readability.cjs --capture comprueba las tres propuestas,
transparencia real, cambio de especie, controles y capturas. Evidencia en
local/validation/cosmic-readability-20261015/. El test de contrato verifica
escala, archivos y ausencia de integración/loop de render permanente.

No se afirma ahorro de GPU: menos detalle en una textura no garantiza menos
costo por píxel. El visor estático solo repinta al cambiar controles/tamaño.
Si el usuario aprueba: preparar placas de ojos neutros y ajustar recortes,
probar miradas/párpados y articulación con las nuevas texturas, comparar en la
misma carga Electron y recién entonces integrar. No reutilizar ciegamente los
recortes del rig anterior: una edición generativa puede mover detalles.
