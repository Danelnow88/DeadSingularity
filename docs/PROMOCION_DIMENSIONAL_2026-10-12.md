# Base dimensional promovida — 12/10/2026

## Estado y alcance

La versión normal y la sesión «Probar eventos dimensionales» comparten ahora
el contenido aprobado. El lobby de prueba conserva su paleta ciruela y su
prohibición de guardar. La partida normal conserva permanentes, récords,
checkpoints y Continuar. No se cambia automáticamente el progreso del usuario.
No se hizo push ni publicación: este hito se registra primero en Git local.

## Contenido promovido

- Catálogo activo: 12 enemigos de aparición normal (incluidos espectros y
  amenazas), 6 élites, 10 jefes, 3 variantes de núcleo y el esbirro invocado.
  Dron, Escudo, Peón, Lútil independiente, Rápido y Espectro Vacío se retiran
  de aparición. El Arquero conserva disparos, soga y el aspecto del Lútil.
- Enjambrito: vida 10, daño 8, velocidad 140, elegible desde oleada 1,
  peso 1,6, grupos desde dos miembros y aproximación ágil. Se mantiene frágil.
  Espíritu y Escopuras mantienen las correcciones de movimiento/lectura.
- Plasma: perfil aprobado de daño, crecimiento y fusión, daño reducido contra
  jefes, daño secundario radial y explosión legible. El catálogo legacy no
  sustituye el perfil efectivo de combate.
- Cámara de Inercia: núcleo evasivo, sprites actuales y propulsores alineados.
  Un núcleo por encuentro, elegible desde oleada 3, sin jefes, al menos dos
  oleadas completas de descanso, sin repetir el último modelo; máximo tres
  encuentros en Historia, ilimitados en Infinito. El checkpoint conserva
  el contador y el siguiente encuentro. Guardados anteriores sin ese campo
  siguen siendo válidos y arrancan un plan de encuentros nuevo al continuar.
- Ocho escenarios disponibles: Umbral, Fundición, Fractura, Corazón del Vacío,
  Mar de Ceniza, Jardín Mineral, Bóveda Sumergida y Desierto de Vidrio.
  Se conservan cuatro universos por oleada y la selección existente del
  catálogo de ocho; no se prometen los ocho en la primera oleada.
  Seis fondos raster y dos procedurales. Paralaje y dibujo cacheado en ambos
  modos; no se cambian portales, colisiones ni obstáculos por el arte.
- Música propia: los cuatro visualizadores y su respuesta actual pasan a ambos
  modos, exclusivamente en Electron Windows. Opcional, apagada hasta que se
  activa con consentimiento, análisis local sin grabación/envío. Web y móvil
  no habilitan captura nativa. Se mantienen controles de origen, frame,
  gesto del usuario, lista cerrada de servicios y exclusión de laboratorios.
- Se registran también los cambios acumulados de UI (lobby, ajustes, tienda,
  HUD, FPS), rendimiento (presupuestos, cachés, perfilado y solapamiento),
  economía, armas y ergonomía móvil presentes en este directorio de trabajo.
  Su detalle histórico permanece en los documentos temáticos de docs/.

## Fuentes de verdad y futuras pruebas

`NV.dimensionBaselineRoster()` devuelve la base promovida.
`NV.dimensionTrialRoster()` parte de esa base y queda reservado para cambios
futuros SOLO en el lobby de pruebas. No editar el baseline para un experimento
sin aprobación. El flag de sesión de prueba controla apariencia y persistencia;
el flag de contenido aprobado no depende de entrar al lobby ciruela.

Enemy Roster muestra por defecto el catálogo actual de ambos modos; normal y
preview son equivalentes hoy. `?roster=legacy` es referencia histórica, no
enemigos activos. Las galerías y el texto exportable usan los renderers reales.
La galería de escenarios muestra los mismos assets que la partida.

La clasificación terrestre/espacial de enemigos y escenarios NO se implementó
en esta promoción. Queda para el siguiente experimento y su revisión de balance.

## Entrega y exclusiones

Web, mobile web y Electron usan el mismo index/js/css/assets. El staging Android
copia los recursos verificados por el manifiesto; eso no compila un APK.
Electron se empaqueta localmente sin publicación automática.

Git incluye fuentes, assets finales, documentación, pruebas y las dos galerías
canónicas. Excluye node_modules, builds en releases/, perfiles/guardados/QA y
fuentes de generación en local/, accesos con rutas personales, credenciales y
el boceto de trabajo «MUESTRA BOCETO DE SPEAKER DANEL.txt».
No borrar esos archivos locales al preparar el commit.

Un futuro push a master puede disparar calidad y publicación de Pages según
los workflows actuales. Requiere autorización separada: NO hacerlo como parte
de este commit local.

## Verificación

La batería previa tenía 214 archivos y cuatro fallos de fixtures/expectativas
desactualizadas. Tras corregirlos y agregar el contrato de promoción: 215
archivos de pruebas, cero fallos. QA de arranque oculto comprueba normal y
pruebas, escritorio y móvil emulado, mismo contenido y guardados separados.
La captura real de música de terceros y el juego en un teléfono físico no se
pueden dar por verificados con esos tests. No se garantiza impacto cero en FPS
ni balance humano idéntico: requiere juego real.

Evidencia local: local/validation/promotion-final-tests.log y
local/validation/promotion/runtime.json. Estos informes no se publican.

También pasaron: ergonomía táctil emulada (multitouch, armas, consumibles,
pausa), interfaz nativa de música en ambos modos cancelando consentimiento
sin capturar audio, arranque del ejecutable empaquetado final y soak desktop/web
con tres repeticiones de diez muestras para cada perfil high/auto/performance,
sin reinicios en esas muestras. No demuestra estabilidad ilimitada ni sustituye
las tareas de vigilancia de rendimiento ya documentadas.
