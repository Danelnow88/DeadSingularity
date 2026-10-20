# Preparación para publicación — 20/10/2026

## Qué se conserva

El código, recursos actuales, referencias artísticas, planes de dirección,
documentación y pruebas de producción. También se mantienen los lanzadores
principales y las muestras que usan el renderer vigente.
No se tocan perfiles, guardados, respaldos ni la referencia congelada.

## Archivo recuperable

Los prototipos de lectura cósmica y espectros anteriores a la familia de sprites
actual, sus imágenes, dos pruebas exclusivas de aquellas maquetas y sus
lanzadores pasan a `local/archive/pre-push-20261020/`, con estructura original.
También se archivan las galerías de criaturas sustituidas y la maqueta de tráiler.
El manifiesto local del archivo registra origen, destino y hash de cada archivo.
No se borra definitivamente ningún diseño.

Estas muestras no estaban en la entrega. Sus dos pruebas dependían de archivos
ignorados por Git: no eran reproducibles en un clon limpio. Las pruebas de los
sprites vigentes, animaciones, combate, escalas y señales se conservan.

## Maqueta de jefes privada

`PRUEBA DE CONCEPTO DE JEFES.html` permanece local y está ignorada explícitamente.
La higiene del repositorio rechaza incorporarla incluso si alguien la agrega
forzadamente. No se publica en Git ni en Pages. El juego utiliza
`js/render/cosmicBossArt.js`, autónomo y ya generado: no necesita ese HTML.
La regeneración de arte es una herramienta local opcional; el CI y el paquete
web consumen el módulo generado y no requieren la maqueta privada.

## Entrega

GitHub Pages debe recibir solo el resultado de `npm run build:web`:
`index.html`, `js/`, `css/`, `assets/`, `AVISOS.md`, `.nojekyll` y manifiesto.
No se envían perfiles, `node_modules`, archivos de validación, maquetas, pruebas,
documentación, Electron ni respaldos al sitio jugable.

Antes de generar el manifiesto de entrega, ejecutar
`node tools/version-web-entry.cjs`: cada recurso del HTML lleva como versión
su hash real. Así una publicación no mezcla código nuevo con JS/CSS anteriores
del caché del navegador. Después: `node tools/release-manifest.cjs` y calidad.
