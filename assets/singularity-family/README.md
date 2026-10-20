# Familia marfil · nueve enemigos

Actualización 19/10/2026: el aspecto en juego usa **basalto oscuro** en las zonas
marfil de las nueve especies. Los PNG originales siguen intactos; el renderer
recolorea una sola vez sus texturas cacheadas y las tres piezas móviles del Tanque.
No se aplican filtros por frame. Los colores de energía y los mapas de luz se
conservan. Ver `docs/art-direction/BASALTO_NUEVE_ENEMIGOS.md` desde la raíz.

Arte aprobado: `approved-reference.png`. Los nueve PNG individuales se prepararon con la herramienta integrada de generación de imágenes, usando la lámina aprobada como referencia de edición. Se conservan placas marfil, materia índigo, siluetas y los nueve acentos elegidos.

La preparación solicitó aislar una criatura por archivo, transparencia real, recorte fiel, limpieza de ruido pequeño y mayor resolución sin rediseñar. Las aberturas que atraviesan el cuerpo pueden ser transparentes; cavidades anatómicas, bocas de cañón y fondos de conductos conservan sus sombras. No se aplicaron filtros de nitidez ni nuevos efectos durante la partida.

`manifest.json` registra las medidas visibles anteriores, los colores y las instrucciones de extracción por criatura. Los originales conservan su resolución; el renderizador recorta los márgenes por alfa una vez al cargar y prepara una textura pequeña en caché. Cada cuerpo ocupa la misma extensión máxima visible medida antes de la sustitución, independientemente del espacio vacío del PNG. Cambia la proporción de algunos diseños, no el tamaño máximo aprobado. Los radios físicos, IA, estadísticas, velocidades y mecánicas no cambian.

El Tanque muestra el cañón extendido. No hay animación nueva de retracción ni articulación de placas; esa etapa queda pendiente para un trabajo posterior. Se conserva orientación básica hacia el objetivo en los cuerpos direccionales. Las señales existentes de peligro, escudos, congelación, impactos y fases del Espíritu continúan por sus rutas anteriores.

Integración compartida: `js/render/singularityFamily.js`, rutas comunes en `js/render/enemies.js` y espectrales en `js/render/spectralEnemies2D.js`. El catálogo y el juego cargan el mismo módulo. El modo legacy explícito del catálogo conserva la referencia histórica.

Verificación reproducible: `node tools/qa-singularity-family.cjs` (Electron oculto). Revisa carga de sprites, alfa, extensión visual, datos congelados, alcance de los nueve reemplazos, desaparición del Espíritu y combate real con las nueve especies. Guarda capturas e informe en `local/validation/singularity-family-v1`. Las mediciones previas y las copias de los cuatro archivos modificados están allí; no reemplazar la línea base con una medición de los sprites nuevos.

La legibilidad en escenas de batalla se revisó con el render real y se conserva evidencia gráfica. La preferencia artística final sigue siendo evaluable jugando: estas pruebas no garantizan reconocimiento instantáneo por cada jugador ni cubren todos los fondos y efectos posibles.

Compatibilidad con archivo local: los límites alfa y tamaños fuente se calculan de antemano y quedan incorporados al renderizador y al manifiesto. No se leen píxeles de canvas durante la carga. Así el catálogo funciona abierto directamente con file:// en navegadores normales, manteniendo sus medidas. Si se reemplaza un PNG por otro de distinto tamaño o recorte, también se deben regenerar estos metadatos.
