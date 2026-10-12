# Próxima dirección: ocho cielos nocturnos y espaciales

Registro histórico de preparación. La colección ya está promovida a normal y
pruebas; ver SKY_PROMOTION_2026-10-12.md. Los fondos anteriores son legacy.

Preparación completada después de recibir las cuatro referencias cósmicas.
Ver SKY_REWORK_2026-10-12.md para la implementación, assets y prompts finales.
Los terrenos sólidos quedan pospuestos y conservados; la base publicada no cambia.

## Preparación disponible

- Se mantienen ocho mapas, sus IDs y nombres actuales para rastrear cambios.
- El renderer admite un conjunto alternativo de imágenes locales, exclusivo
  de la sesión de pruebas y la galería. La versión normal sigue usando la base
  aprobada. scenerySkyTrial.js registra ahora ocho cielos generados y optimizados.
- Registrar futuros archivos finales de assets/scenery mediante
  `NV.registerTrialSceneryArt({threshold:'sky-threshold-v1.webp', ...})`.
  Usar nombres simples .webp/.png; no URLs, rutas absolutas o traversal.
  Hacerlo desde un módulo de datos compartido por la galería y la partida,
  una vez existan los archivos, no desde una configuración guardada del usuario.
- Caché distingue archivo y mapa: alternar versiones no reutiliza un bitmap
  de la otra colección. Siguen los límites de dos imágenes en partida y ocho
  en galería, y las tres superficies del escenario actual.
- Arte pendiente: oscuridad dominante, tonos de acento distintos, formas
  cósmicas amplias; sin suelo caminable, textura de lienzo/óleo, tramado,
  ruido denso, puntos brillantes que parezcan proyectiles o velos sobre combate.
- Revisar primero las referencias y un candidato ampliado con enemigos/HUD;
  después completar los ocho y reflejarlos en la galería. No generar a ciegas.

## Observación sobre la textura

En sectors.js no se encontró una cuadrícula decorativa superpuesta a las
imágenes. Los fondos raster actuales contienen pintura/textura, se convierten
a WebP y se dibujan en superficies de hasta 1536x1024 que la cámara amplía.
Eso puede hacer más visible el material pintado o artefactos de escalado;
no identifica por sí solo la causa exacta de la «gasa» observada. Hace falta
comparar una captura concreta, el asset original, su WebP y el dibujo cacheado.
No aumentar todas las texturas a 4K ni agregar shaders/filtros por frame como
supuesto arreglo: primero establecer cuál es el artefacto.

La clasificación de enemigos terrestres/espaciales queda pospuesta junto con
los terrenos. Esta preparación no cambia apariciones, combate, portales ni
paralaje. No incluye commit, push o publicación de esta nueva dirección.
