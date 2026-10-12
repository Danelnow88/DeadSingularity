# Ocho cielos de prueba — 12 de octubre de 2026

**Estado actual:** promovidos por pedido del usuario al juego normal y a pruebas,
en web, mobile y Electron. Los párrafos siguientes describen la etapa inicial
aislada; ver SKY_PROMOTION_2026-10-12.md para la publicación y validación final.

Implementados en Probar eventos dimensionales y en previews/dimension-environments.html. La galería permite alternar con la base publicada y ampliar cada mapa con los dibujos reales del combate. El modo normal conserva sus fondos anteriores; los terrenos no se borran. No se modifica balance, spawns, portales ni afinidades de enemigos.

Arte original generado con la herramienta integrada imagegen, inspirado conceptualmente en las cuatro referencias del usuario. No se copiaron fotografías. Predomina el negro, se reservaron espacios oscuros y se evitaron lienzo, cuadrículas y meteoros que parezcan munición. Los ocho nombres e IDs permanecen estables.

## Rendimiento y validación

Ocho WebP de 1536 × 864: 320104 bytes en total. Dos imágenes fuente como máximo en partida, ocho en galería; tres superficies cacheadas. No se añadió generación procedural ni filtros por frame. El paralaje existente sigue activo.

QA automatizado: ocho imágenes distintas cargadas; comunes, élites, jefes y núcleos dibujados sin errores de consola. 240 dibujos por mapa no regeneraron sus superficies. Comprobada la selección del archivo nuevo solo en pruebas y del original en normal. Los tiempos medidos son de envío de dibujo en caché, no una garantía de FPS en todos los dispositivos.

## Archivos y prompts reproducibles

### UMBRAL

Archivo final: `assets/scenery/sky-threshold-v1.webp`.

Prompt utilizado:

Use case: stylized-concept. Asset type: original wide landscape 16:9 cosmic sky backdrop for a fast top-down 2D roguelite with bright neon characters and red/white projectiles. Primary request: photorealistic astronomy-inspired night cosmos, inspired by nebula photography and fantastical planetary panoramas, NOT a painting, NOT an oil canvas. Smooth gaseous gradients, clean deep blacks, natural astronomical wisps with no gritty surface texture. At least 80% near-black negative space; keep the center and most of the frame very dark. Muted color accents in diffuse broad formations, no white or bright cores. Only a small sparse scattering of very dim tiny distant stars, no sharp glowing dots or thin diagonal bright streaks that look like ammunition. Landscape composition occupying the full image; wide drifting celestial forms rather than a land scene. No ground, foreground terrain, horizon, rocks, roots, ruins, walls, UI, characters, text, logos or watermarks. No canvas weave, grid, checkerboard, halftone, grain, brush strokes, over-detailed microtexture or dense sparkles. Critical: combat foreground must remain immediately readable on every part. Scene: a broad softly incomplete cyan and turquoise emission-nebula arc along the outer portions of the image, surrounding an enormous almost-black central void. Faint olive accents in only a few wisps, as in teal astronomical nebula photography. Asymmetric open arc, not a luminous portal or circular target. Clean cosmic depth.

### FUNDICIÓN

Archivo final: `assets/scenery/sky-foundry-v1.webp`.

Prompt utilizado:

Use case: stylized-concept. Asset type: original wide landscape 16:9 cosmic sky backdrop for a fast top-down 2D roguelite with bright neon characters and red/white projectiles. Primary request: photorealistic astronomy-inspired night cosmos, inspired by nebula photography and fantastical planetary panoramas, NOT a painting, NOT an oil canvas. Smooth gaseous gradients, clean deep blacks, natural astronomical wisps with no gritty surface texture. At least 80% near-black negative space; keep the center and most of the frame very dark. Muted color accents in diffuse broad formations, no white or bright cores. Only a small sparse scattering of very dim tiny distant stars, no sharp glowing dots or thin diagonal bright streaks that look like ammunition. Landscape composition occupying the full image; wide drifting celestial forms rather than a land scene. No ground, foreground terrain, horizon, rocks, roots, ruins, walls, UI, characters, text, logos or watermarks. No canvas weave, grid, checkerboard, halftone, grain, brush strokes, over-detailed microtexture or dense sparkles. Critical: combat foreground must remain immediately readable on every part. Scene: a distant oblique spiral galaxy with muted copper and burnt-orange dust arms on one outer third of the wide image, its core subdued deep amber, never white. Faint slate-blue interstellar wisps, broad black center, empty cosmos elsewhere. Inspired by dark spiral galaxy photographs but not an exact copy.

### FRACTURA

Archivo final: `assets/scenery/sky-fracture-v1.webp`.

Prompt utilizado:

Use case: stylized-concept. Asset type: original wide landscape 16:9 cosmic sky backdrop for a fast top-down 2D roguelite with bright neon characters and red/white projectiles. Primary request: photorealistic astronomy-inspired night cosmos, inspired by nebula photography and fantastical planetary panoramas, NOT a painting, NOT an oil canvas. Smooth gaseous gradients, clean deep blacks, natural astronomical wisps with no gritty surface texture. At least 80% near-black negative space; keep the center and most of the frame very dark. Muted color accents in diffuse broad formations, no white or bright cores. Only a small sparse scattering of very dim tiny distant stars, no sharp glowing dots or thin diagonal bright streaks that look like ammunition. Landscape composition occupying the full image; wide drifting celestial forms rather than a land scene. No ground, foreground terrain, horizon, rocks, roots, ruins, walls, UI, characters, text, logos or watermarks. No canvas weave, grid, checkerboard, halftone, grain, brush strokes, over-detailed microtexture or dense sparkles. Critical: combat foreground must remain immediately readable on every part. Scene: two broad disjoint violet and indigo gas currents drift diagonally across opposite outer regions, separated by a vast irregular dark interstellar lane. A few dim blue-violet cloud knots, no lines or visible crack grid. Astronomical cosmic shear, smooth photographic gases, mostly ink-black darkness.

### CORAZÓN DEL VACÍO

Archivo final: `assets/scenery/sky-void-heart-v1.webp`.

Prompt utilizado:

Use case: stylized-concept. Asset type: original wide landscape 16:9 cosmic sky backdrop for a fast top-down 2D roguelite with bright neon characters and red/white projectiles. Primary request: photorealistic astronomy-inspired night cosmos, inspired by nebula photography and fantastical planetary panoramas, NOT a painting, NOT an oil canvas. Smooth gaseous gradients, clean deep blacks, natural astronomical wisps with no gritty surface texture. At least 80% near-black negative space; keep the center and most of the frame very dark. Muted color accents in diffuse broad formations, no white or bright cores. Only a small sparse scattering of very dim tiny distant stars, no sharp glowing dots or thin diagonal bright streaks that look like ammunition. Landscape composition occupying the full image; wide drifting celestial forms rather than a land scene. No ground, foreground terrain, horizon, rocks, roots, ruins, walls, UI, characters, text, logos or watermarks. No canvas weave, grid, checkerboard, halftone, grain, brush strokes, over-detailed microtexture or dense sparkles. Critical: combat foreground must remain immediately readable on every part. Scene: a distant vast dark dust-cloud silhouette edged very faintly by plum-red and muted magenta nebular emission, asymmetrical crescent-shaped gaseous flow outside the central playable area. Absolutely no circular glowing black hole, no portal and no bright central point. A quiet sparse cosmic emptiness.

### MAR DE CENIZA

Archivo final: `assets/scenery/sky-ash-moon-v1.webp`.

Prompt utilizado:

Use case: stylized-concept. Asset type: original wide landscape 16:9 cosmic sky backdrop for a fast top-down 2D roguelite with bright neon characters and red/white projectiles. Primary request: photorealistic astronomy-inspired night cosmos, inspired by nebula photography and fantastical planetary panoramas, NOT a painting, NOT an oil canvas. Smooth gaseous gradients, clean deep blacks, natural astronomical wisps with no gritty surface texture. At least 80% near-black negative space; keep the center and most of the frame very dark. Muted color accents in diffuse broad formations, no white or bright cores. Only a small sparse scattering of very dim tiny distant stars, no sharp glowing dots or thin diagonal bright streaks that look like ammunition. Landscape composition occupying the full image; wide drifting celestial forms rather than a land scene. No ground, foreground terrain, horizon, rocks, roots, ruins, walls, UI, characters, text, logos or watermarks. No canvas weave, grid, checkerboard, halftone, grain, brush strokes, over-detailed microtexture or dense sparkles. Critical: combat foreground must remain immediately readable on every part. Scene: a largely unlit charcoal-gray moon partially cropped near an outer corner, thin soft muted rust light on its limb. Distant broad smoky copper and blue-gray meteor-dust streams as diffuse cosmic trails near the margins, never bright projectile-like streaks. No lunar ground or walkable terrain, only open deep space viewed from afar.

### JARDÍN MINERAL

Archivo final: `assets/scenery/sky-jade-basin-v1.webp`.

Prompt utilizado:

Use case: stylized-concept. Asset type: original wide landscape 16:9 cosmic sky backdrop for a fast top-down 2D roguelite with bright neon characters and red/white projectiles. Primary request: photorealistic astronomy-inspired night cosmos, inspired by nebula photography and fantastical planetary panoramas, NOT a painting, NOT an oil canvas. Smooth gaseous gradients, clean deep blacks, natural astronomical wisps with no gritty surface texture. At least 80% near-black negative space; keep the center and most of the frame very dark. Muted color accents in diffuse broad formations, no white or bright cores. Only a small sparse scattering of very dim tiny distant stars, no sharp glowing dots or thin diagonal bright streaks that look like ammunition. Landscape composition occupying the full image; wide drifting celestial forms rather than a land scene. No ground, foreground terrain, horizon, rocks, roots, ruins, walls, UI, characters, text, logos or watermarks. No canvas weave, grid, checkerboard, halftone, grain, brush strokes, over-detailed microtexture or dense sparkles. Critical: combat foreground must remain immediately readable on every part. Scene: an immense emerald and jade nebula with several broad floating glassy green gas lobes, arranged asymmetrically along the outer portions of the wide frame, with giant black intervals. No literal minerals or crystals, no solid roots. Predominantly black with restrained green vapor, subtly translucent photographic gas depth.

### BÓVEDA SUMERGIDA

Archivo final: `assets/scenery/sky-drowned-vault-v1.webp`.

Prompt utilizado:

Use case: stylized-concept. Asset type: original wide landscape 16:9 cosmic sky backdrop for a fast top-down 2D roguelite with bright neon characters and red/white projectiles. Primary request: photorealistic astronomy-inspired night cosmos, inspired by nebula photography and fantastical planetary panoramas, NOT a painting, NOT an oil canvas. Smooth gaseous gradients, clean deep blacks, natural astronomical wisps with no gritty surface texture. At least 80% near-black negative space; keep the center and most of the frame very dark. Muted color accents in diffuse broad formations, no white or bright cores. Only a small sparse scattering of very dim tiny distant stars, no sharp glowing dots or thin diagonal bright streaks that look like ammunition. Landscape composition occupying the full image; wide drifting celestial forms rather than a land scene. No ground, foreground terrain, horizon, rocks, roots, ruins, walls, UI, characters, text, logos or watermarks. No canvas weave, grid, checkerboard, halftone, grain, brush strokes, over-detailed microtexture or dense sparkles. Critical: combat foreground must remain immediately readable on every part. Scene: deep navy and cobalt interstellar cloud vaults like enormous underwater shapes but entirely celestial gas; a very dark distant blue planet limb partly cropped at a margin, broad low-intensity cerulean haze on the opposite outer edge. No ocean, horizon or terrestrial surface. Very quiet abyssal night cosmos.

### DESIERTO DE VIDRIO

Archivo final: `assets/scenery/sky-glass-desert-v1.webp`.

Prompt utilizado:

Use case: stylized-concept. Asset type: original wide landscape 16:9 cosmic sky backdrop for a fast top-down 2D roguelite with bright neon characters and red/white projectiles. Primary request: photorealistic astronomy-inspired night cosmos, inspired by nebula photography and fantastical planetary panoramas, NOT a painting, NOT an oil canvas. Smooth gaseous gradients, clean deep blacks, natural astronomical wisps with no gritty surface texture. At least 80% near-black negative space; keep the center and most of the frame very dark. Muted color accents in diffuse broad formations, no white or bright cores. Only a small sparse scattering of very dim tiny distant stars, no sharp glowing dots or thin diagonal bright streaks that look like ammunition. Landscape composition occupying the full image; wide drifting celestial forms rather than a land scene. No ground, foreground terrain, horizon, rocks, roots, ruins, walls, UI, characters, text, logos or watermarks. No canvas weave, grid, checkerboard, halftone, grain, brush strokes, over-detailed microtexture or dense sparkles. Critical: combat foreground must remain immediately readable on every part. Scene: a sparse surreal planetary panorama with two widely separated largely black worlds near the margins, one has broad faint icy-blue rings, the other a quiet violet crescent. Very restrained translucent lavender cosmic haze behind them, nearly black central majority. Inspired by imaginative many-world cosmic art but only two large distant planets, no golden glitter rivers, no crystals or ground.

Modo de generación: herramienta integrada imagegen, sin CLI.
