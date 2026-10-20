# Espectros cósmicos V2 · revisión y síntesis previa a integración

15/10/2026. Estado: propuestas revisadas y sintetizadas, NO integradas ni animadas.
Abrir el mismo PROBAR_ESPECTROS_COSMICOS.cmd. V2 es la opción inicial; V1 permanece
intacta y se puede ver sola o junto a V2. La comparación inferior enfrenta V1/V2
al mismo ancho; opcionalmente muestra el aspecto actual del juego.

## Cambios y criterio

- Núcleo: conservar estructura trilobulada, tres ojos y abertura central; sintetizar
  la textura con crestas más anchas y estrellas/venas agrupadas. No convertirlo en
  núcleo-objetivo ni añadir otra mecánica.
- Arquero: conservar silueta asimétrica y órgano de arpón; centrar/regular sutilmente
  el ojo sobre su eje de disparo y ampliar el ritmo de detalle. No un rediseño global.
- Guardia: segunda variante más envolvente y orgánica, con pliegues protectores
  redondeados, ojos más visibles y menor apariencia de escudo geométrico rígido.

Material compartido: negro vivo, plata, ámbar/verde agua/carmesí por especie.
La habilidad imagegen se usó para ediciones de bitmap con herramienta integrada,
no CLI. Se revisaron las tres salidas y el resultado a escala en Electron.
La síntesis es artística/generativa, no una identidad exacta del contorno o píxeles.
Las V1 están preservadas para comparar y recuperar cualquier detalle preferido.

## Escalas de prueba

| Propuesta | Ancho de lienzo a referencia 1080p |
|---|---:|
| Arquero | 112 px |
| Guardia | 124 px |
| Núcleo | 118 px |

Se eligió la misma banda que los cósmicos aprobados, no una escala gigante para
ocultar falta de legibilidad. El visor incluye imágenes de referencia de Corredor
(103,04 px), Espíritu (112,39 px) y Escopuras (124,42 px), derivadas de sus factores
actuales del rig y de la cámara 1920/900. Los anchos incluyen margen transparente;
por eso la masa visible puede diferir entre siluetas. El selector 85/100/115% solo
cambia el visor. Ningún tamaño/collider/dato de producción fue modificado.

## Assets nuevos

- previews/concepts/spectral-cosmic-v2/archer-synth-v2.png
- previews/concepts/spectral-cosmic-v2/guard-synth-v2.png
- previews/concepts/spectral-cosmic-v2/core-synth-v2.png

Entradas de edición: las correspondientes imágenes intactas de
previews/concepts/spectral-cosmic-v1/. No se sobrescribió ningún original.

## QA y siguiente paso

Electron: tools/preview-spectral-concepts.cjs --capture comprueba alpha, carga de
V2, controles V1/comparación/referencia actual, tamaños y perfil temporal aislado.
Capturas/reporte: local/validation/spectral-cosmic-concepts-20261015/.
Test de assets y aislamiento: tests/spectral_cosmic_concepts.js. Sintaxis y
manifiesto de producción intactos verificados; sin cambios de IA, daño o radios.

No se promete mejora de GPU por síntesis: solo legibilidad de la textura. Una vez
validadas las formas nuevas, falta preparar placas de ojos, recortes articulados
mínimos y probar sus estados con la IA existente antes de la integración limpia.
No reutilizar posiciones de ojos de V1 sin adaptarlas. No animar con filtros/blur
por frame ni convertir estas imágenes en nuevas capas a pantalla completa.

## Prompts completos enviados

### archer

Use case: precise-object-edit. Asset: transparent 2D top-down game creature sprite, second pass for native 1080p readability at 110-125 pixels wide. Edit the supplied corresponding first concept, save as a new version. Preserve its cosmic living black folded material, broad sculptural silver light, contained species-colored stars, excellent finish, no humanoids or mechanical armor. Crucial synthesis: REORGANIZE MICRODETAIL into a smaller number of BROADER readable structural ridges and larger deliberate star/vein clusters, thicker highlights separated by broad dark valleys. Preserve premium volumetric richness and the major features, not flat shapes. No glow haze or tiny glitter noise, no extra ornament, no black backdrop, no text or watermarks, full creature with transparent margins. Do not enlarge all anatomy to compensate for microdetail; solve internal visual scale. Same transparent canvas framing as input. Keep the approved asymmetric crescent/bow-like silhouette, big sweeping side lobes and integrated lower harpoon aperture almost exactly intact. ONLY subtle anatomy adjustment: move the single existing eye a LITTLE toward the central axis immediately above the harpoon aperture, level its excessive diagonal tilt slightly so the gaze reads deliberately forward. Keep it biological and expressive, not a new eye. Do not add a second eye, mouth teeth or extra horns. Preserve AMBER/GOLD accents only. Synthesize broad texture as described; this is a restrained refinement, not a redesign.

### guard

Use case: precise-object-edit. Asset: transparent 2D top-down game creature sprite, second pass for native 1080p readability at 110-125 pixels wide. Edit the supplied corresponding first concept, save as a new version. Preserve its cosmic living black folded material, broad sculptural silver light, contained species-colored stars, excellent finish, no humanoids or mechanical armor. Crucial synthesis: REORGANIZE MICRODETAIL into a smaller number of BROADER readable structural ridges and larger deliberate star/vein clusters, thicker highlights separated by broad dark valleys. Preserve premium volumetric richness and the major features, not flat shapes. No glow haze or tiny glitter noise, no extra ornament, no black backdrop, no text or watermarks, full creature with transparent margins. Do not enlarge all anatomy to compensate for microdetail; solve internal visual scale. Same transparent canvas framing as input. This species needs a NEW outline but the SAME material, color and two-eye identity. Replace the rigid diamond/heraldic shield outline and tall sharp top horn with a broader, rounded, asymmetric living sheltering mantle/carapace: domed broad upper fold, two eyes protected under a curved fleshy brow, soft scalloped side lobes curled inward around its lower body, short tapered folded underside. A substantial compact floating protective creature, not a literal shield, badge, helmet, humanoid face, stingray with a tail or a copy of the one-eye spirit. No limbs or long tendrils. SEAFOAM/JADE/TEAL accents only. Two eyes must be clearly visible, larger than the old slits, with calm vigilant expression. Strong clear broad-fold silhouette, less sharply triangular. Apply synthesized broad readable texture from the common spec.

### core

Use case: precise-object-edit. Asset: transparent 2D top-down game creature sprite, second pass for native 1080p readability at 110-125 pixels wide. Edit the supplied corresponding first concept, save as a new version. Preserve its cosmic living black folded material, broad sculptural silver light, contained species-colored stars, excellent finish, no humanoids or mechanical armor. Crucial synthesis: REORGANIZE MICRODETAIL into a smaller number of BROADER readable structural ridges and larger deliberate star/vein clusters, thicker highlights separated by broad dark valleys. Preserve premium volumetric richness and the major features, not flat shapes. No glow haze or tiny glitter noise, no extra ornament, no black backdrop, no text or watermarks, full creature with transparent margins. Do not enlarge all anatomy to compensate for microdetail; solve internal visual scale. Same transparent canvas framing as input. The user prefers this design most. Preserve EXACT approved three-lobed silhouette, ALL THREE eye locations and sizes, central dark spatial aperture, every major fold and overall pose. NO redesign, no eye repositioning, no new parts. Change ONLY internal texture organization for small-size readability: consolidate the hairline nested highlights and microscopic red/white stars into broad clear folds and larger selected vein/star clusters in the SAME existing anatomical regions. Keep dark central aperture dark, preserve CARMINE/CRIMSON identity. Do not turn it into a reactor or enlarge eyes. This is texture synthesis ONLY.

