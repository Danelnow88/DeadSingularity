# ESPÍRITU / ESCOPURAS — integración aprobada

15/10/2026. Sustituye el estado de laboratorio de COSMICOS_ANIMADOS_V1.md.
Los dos conceptos y sus animaciones aprobadas son ahora el dibujo predeterminado
en la partida actual. Abrir ABRIR_V1.cmd, no hace falta un lanzador de prueba.

## Lectura y tamaño

Se conservan las ilustraciones y piezas existentes: no se borran detalles ni
se regeneran imágenes. Escala visual respecto de la muestra aprobada: Espíritu
×1,40; Escopuras ×1,35. Son puntos de partida para legibilidad en combate, no una
promesa de reproducir cada microdetalle de la ilustración ampliada. Revisados
en referencia 1080p y en captura de escena de combate con otros enemigos.
Las texturas preparadas siguen a 400 px, con ojos/párpados a 64 px: el aumento
no multiplica caches ni número de piezas. Hitboxes y cantidad de spawns intactas.

## Mira del Espíritu

Anillos orbitales segmentados y cuatro puntas convergentes, rojo hostil contenido,
sin relleno transparente a pantalla completa, blur, filtros ni partículas nuevas.
El anillo interior conserva el radio real de daño de 68 unidades; el exterior
converge de 91 a 68 durante los mismos 0,48 s del aviso. No cambia destino,
teletransporte, daño, targetability o recuperación. El aviso no se elimina.

## Moco espacial de Escopuras

Conserva la silueta de gota stunDroplet y el disparo único. Cuerpo verde #71d693,
pequeño reflejo húmedo y acento amarillo secundario de stun. Sin blur en esta
familia, ni gotas/partículas/estelas adicionales. Es una excepción explícita a
la regla roja de los demás proyectiles hostiles, no un cambio global de paleta.
Se identifica por sourceType=spitter + projectileStyle=stunDroplet, sin buscar
la entidad emisora cada cuadro. Otros enemigos y bosses permanecen rojos.

Velocidad de Escopuras: 250 → 325 unidades/s (+30%). Los otros ranged conservan
250. La predicción usa la nueva velocidad, manteniendo snapshot, lead parcial
0,5 y cap 60. Se mantienen windup 0,6 s, recovery 1 s, daño y chance/duración
del stun. No se implementa todavía moco adherido al personaje ni debuffs nuevos.

## Integración y fallback

Prewarm al cargar la partida normal/promovida, una sola cache compartida.
El módulo no descarga archivos al evaluarse: el juego solicita explícitamente
la preparación. Si una imagen falla o aún carga, queda el cuerpo legacy como
fallback ejecutable. __cosmicCreatures=false conserva referencia QA; no hay que
activar ninguna bandera para jugar. Las antiguas propuestas minerales no se
integran; sus laboratorios siguen separados.

## Verificación

Validación general completada: npm run quality, 231 suites sin fallos,
163 recursos verificados y 87 archivos históricos congelados idénticos.

- tests/cosmic_creatures.js: selección predeterminada, cache acotada, ojos,
  párpados texturados, dibujo puro y radios de mira conservados.
- tests/spitter_f07.js / hostile_projectile_language.js: proyectil de 325,
  stun intacto, moco verde exclusivo, otros ranged siguen a 250/rojo.
- tests/wisp_phase_attack.js: tiempos, teletransporte, evasión y daño intactos.
- node tools/preview-cosmic-creatures.cjs --capture: selección por defecto
  idéntica a la aprobada, estados/miradas, mira nueva, carga automática de
  sprites y arranque real de una partida normal, sin override ni errores.
- Evidencia visual/QA en local/validation/cosmic-production-20261015/.

Prueba de carga: Electron visible/fullscreen 1920×1080, 24 hostiles durables,
high/full, fondo reactivo, proyectiles y partículas, ocho segundos sin tracing.
Resultado: 148,04 FPS medios de cadencia del juego; intervalos p95=12,10 ms,
p99=12,20 ms, peor=36,40 ms. Informe:
local/validation/overlap-performance/cosmic-production-sized-20261015.json.
La escena excede el cap normal de diez. Es una pasada exploratoria, no una
demostración de 165 FPS estables ni una comparación causal antes/después:
también cambió la velocidad del proyectil y su recorrido. No mide GPU hardware.
No se redujeron entidades, efectos ni resolución para la medición.

Pendiente de otra iteración: valoración jugando del tamaño final y futura
representación del moco sobre personajes. No se altera nada más del roster.
