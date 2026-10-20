# Espectros cósmicos · primera tanda de conceptos · 15/10/2026

Revisión posterior disponible: ESPECTROS_COSMICOS_REFINADOS_V2.md. El mismo CMD
abre ahora V2 y conserva el selector V1 y comparación lado a lado. Las imágenes
V1 aquí documentadas permanecen intactas. Sigue sin integrarse esta tanda.

Estado: tres propuestas estáticas para valoración. NO integradas, NO animadas.
Abrir PROBAR_ESPECTROS_COSMICOS.cmd en la raíz. El visor usa Electron con perfil
independiente; no guarda partidas. Muestra el aspecto actual mediante el renderer
real y el concepto ampliado y a escala tentativa (110/138/125 px de lienzo fuente
para Arquero/Guardia/Núcleo; no son tamaños finales aprobados).

## Criterio y contratos

Familia visual del Espíritu/Corredor/Escopuras aprobados: materia viva negra,
pliegues plateados amplios, ojos biológicos y estrellas contenidas, sin humanoides.
Se conservaron los acentos funcionales existentes: Arquero ámbar, Guardia verde
agua, Núcleo carmesí. Espectro Núcleo es el enemigo, NO los núcleos-objetivo.

- Arquero: silueta tensada de arco orgánico con un ojo y abertura de arpón integrada.
  Se verificó su previewHook en el roster canónico: no se propone reemplazarlo
  por un tirador de flechas ni cambiar su sinergia existente con Núcleo.
- Guardia: carapacho compacto de pliegues protectores, dos ojos bajo un reborde.
  Mantener su mecánica existente de protección/interposición.
- Núcleo: tres lóbulos vivos con ojos y abertura central de presión dimensional.
  Mantener su zona de peligro y coordinación con Arquero existentes.

La simplificación del microdetalle se pidió desde la generación para leer a baja
escala. No se promete ahorro de GPU por una imagen conceptual: todavía faltan
aprobación, rig acotado, placas de ojos y comparación con misma carga real.
No se modificaron archivos de producción, datos, simulación, tamaños ni colisiones.
No se tocaron núcleos-objetivo, bosses o especies aprobadas.

## Assets

Herramienta imagegen integrada (no CLI); habilidad imagegen usada para generar
bitmaps transparentes con referencia de acabado, no sustitutos SVG/procedurales.
Referencia de material: assets/cosmic-creatures/wisp-synth-source-v1.png.
Archivos nuevos guardados sin sobrescribir diseños:

- previews/concepts/spectral-cosmic-v1/archer-concept-v1.png
- previews/concepts/spectral-cosmic-v1/guard-concept-v1.png
- previews/concepts/spectral-cosmic-v1/core-concept-v1.png

## Verificación

`node tools/preview-spectral-concepts.cjs --capture`: carga tres PNG con alpha real,
las referencias del roster actual, controles de escala/fondo y perfil aislado.
Evidencia: local/validation/spectral-cosmic-concepts-20261015/preview.png y qa.json.
Test local: tests/spectral_cosmic_concepts.js. Sin loop permanente en el comparador.
Las animaciones se harán después de valorar los diseños: miradas/párpados,
contracción del órgano de disparo/escudo/abertura, con piezas mínimas cacheadas.

## Prompts completos

### archer

Use case: stylized-concept. Asset type: individual transparent-background 2D top-down game enemy sprite concept for DEADSINGULARITY. Input image 1 is MATERIAL/ART-DIRECTION REFERENCE ONLY, not an edit target; invent a new silhouette appropriate to the specified enemy, not another copy of the reference comma. Shared family: living black obsidian cosmic folded flesh, broad sculptural silver edges, deep black valleys, sparse contained star clusters/veins, expressive biological eye(s). Beautiful premium illustrated cosmic horror game creature, not photoreal statue and not flat icon. Readable at ~100-130 pixels: synthesize microtexture into broad elegant folds, limited nested contours, very few larger embedded stars. Creature clearly alive. No humanoids, head-and-torso anatomy, arms, legs, hands, feet, armor, robots, literal weapons held in hands, buildings or text. No detached floating ornaments, particle halos, glow fog, multiple creatures or scenery. Center complete silhouette with generous transparent margins, coherent front/top-down 2D game camera, facing toward lower edge; enough broad structural roots to animate 1-2 folds later. ONE individual creature only, no contact sheet. Actual transparent background. SPECTER ARCHER: lean asymmetric living crescent/organic recurved bow silhouette, one large watchful eye nested in upper-central fold. Its hunting organ is a compact integrated hollow hook/harpoon throat at the lower front, pointing toward lower edge, with two swept crescent lobes enclosing it like a living bow under tension. No held bow, no gun, no humanoid archer, not a fish and not the existing runner. AMBER/GOLD embedded star veins only, body black and silver. Communicate precise ranged snaring/harpoon attack through shape. The throat remains a broad simple opening, not tooth spaghetti.

### guard

Use case: stylized-concept. Asset type: individual transparent-background 2D top-down game enemy sprite concept for DEADSINGULARITY. Input image 1 is MATERIAL/ART-DIRECTION REFERENCE ONLY, not an edit target; invent a new silhouette appropriate to the specified enemy, not another copy of the reference comma. Shared family: living black obsidian cosmic folded flesh, broad sculptural silver edges, deep black valleys, sparse contained star clusters/veins, expressive biological eye(s). Beautiful premium illustrated cosmic horror game creature, not photoreal statue and not flat icon. Readable at ~100-130 pixels: synthesize microtexture into broad elegant folds, limited nested contours, very few larger embedded stars. Creature clearly alive. No humanoids, head-and-torso anatomy, arms, legs, hands, feet, armor, robots, literal weapons held in hands, buildings or text. No detached floating ornaments, particle halos, glow fog, multiple creatures or scenery. Center complete silhouette with generous transparent margins, coherent front/top-down 2D game camera, facing toward lower edge; enough broad structural roots to animate 1-2 folds later. ONE individual creature only, no contact sheet. Actual transparent background. SPECTER GUARD: stout broad compact protective living scalloped shield/manta silhouette, two expressive eyes peeking from a single sheltered horizontal recess. Interlocking broad organic folds cup forward like a heavy protective carapace, smoothly rounded outer rim with 3-4 organic points, and small integrated back pleat. Clearly a living creature, not a shield object or a mechanical core. SEAFOAM/JADE green-teal star veins, black and silver body. Communicate physically shielding nearby allies through broad sheltering silhouette. Avoid long tentacles, spikes forest and generic circular eyeball.

### core

Use case: stylized-concept. Asset type: individual transparent-background 2D top-down game enemy sprite concept for DEADSINGULARITY. Input image 1 is MATERIAL/ART-DIRECTION REFERENCE ONLY, not an edit target; invent a new silhouette appropriate to the specified enemy, not another copy of the reference comma. Shared family: living black obsidian cosmic folded flesh, broad sculptural silver edges, deep black valleys, sparse contained star clusters/veins, expressive biological eye(s). Beautiful premium illustrated cosmic horror game creature, not photoreal statue and not flat icon. Readable at ~100-130 pixels: synthesize microtexture into broad elegant folds, limited nested contours, very few larger embedded stars. Creature clearly alive. No humanoids, head-and-torso anatomy, arms, legs, hands, feet, armor, robots, literal weapons held in hands, buildings or text. No detached floating ornaments, particle halos, glow fog, multiple creatures or scenery. Center complete silhouette with generous transparent margins, coherent front/top-down 2D game camera, facing toward lower edge; enough broad structural roots to animate 1-2 folds later. ONE individual creature only, no contact sheet. Actual transparent background. SPECTER CORE ENEMY: compact unsettling living knotted dimensional bud/anemone-like organ, three watchful biological eyes clustered in an upper arc around a dark central fleshy aperture. Three broad curled folded lobes arranged in a unified slightly triangular silhouette with a lower central opening that could dilate to cast an area attack. A dangerous creature, NOT the large objective nuclei, not a machine, orb reactor, building or turret. CARMINE/CRIMSON embedded stars/veins in black silver material. No bright glowing ball at center, no thin tentacle forest. Communicate gathering and releasing spatial pressure with broad layered flesh.

