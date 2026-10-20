# Enjambrito pintado — prueba visual y de costo

Estado actualizado: el usuario rechazó la criatura con aspecto de pescado.
Esa propuesta nunca se integró en partida. La galería fue rehecha con las
tres formas cian originales, material con volumen, ojos y filamentos móviles.
El PNG de pescado se conserva como artefacto histórico y no lo usa el renderer.
Los resultados numéricos de abajo pertenecen a esa versión rechazada y NO
deben atribuirse a la nueva propuesta dimensional. Criterio compartido:
`docs/CRITERIO_VISUAL_CRIATURAS.md`.

Pedido autorizado: empezar por Enjambrito, pequeño y vivo, con ojos que sigan al
jugador; comparar con el actual antes de extender esta técnica al catálogo.
La propuesta está aislada. Partida normal conserva el Enjambrito anterior.

Abrir `PROBAR_ENJAMBRITO_PINTADO.cmd`. Vista ampliada y tamaño real en paralelo,
pausa y cuatro estados: aproximación, listo, ataque y reagrupación. El cursor
dirige los ojos; la orientación corporal continúa derivando de la órbita.

## Diseño e implementación

Sprite generado con herramienta integrada, sin CLI externo, a partir del acabado
de `assets/dimension-cores/core-cyan-rig-v3.png` y
`assets/elite-creatures/asesino-painted-v1.png`. Son referencias de sombreado y
material, no objetos para copiar. Archivo final:
`assets/common-creatures/enjambrito-painted-v1.png`.

Prompt utilizado: criatura pequeña viva para enjambre espacial, caparazón
orgánico azul/teal con biseles cian y pocas placas legibles, pliegues cortos de
membrana, cola corta curva, vista horizontal con cabeza a la derecha, una
cavidad ocular vacía para añadir el ojo por código. Calidad pintada de las
referencias, formas grandes legibles a 14 px, alpha real y margen transparente;
una criatura por imagen. Sin texto, suelo, fondo, sombras de contacto ni
partículas; sin humanoides, brazos, patas, robots, naves o polígonos abstractos.

`js/render/paintedSwarmlet.js` prepara una única superficie corporal reutilizable
de 224 px de ancho; la esclerótica queda preparada en esa superficie. En cuadro:
tres imágenes compartidas y tres pupilas con brillo, sin blur ni filtros.
Cada componente conserva la órbita 1,35, separación 120°, radios 14/9 y giro
`a*.25+i*.7`; se añade respiración corporal pequeña. La cola pintada acompaña
al cuerpo, no conserva la antigua línea de cola que ondulaba por separado.
El acabado material y la silueta cambian; no es igualdad de píxeles.

El hook se inserta después de los avisos de listo/commit/reagrupación existentes.
Por ello mantiene señales funcionales, IA, daño, contacto, hitbox y cantidad de
entidades. Cada enemigo sigue dibujando exactamente tres organismos. El perfil
0,58 se conserva y el sprite mide 28 unidades de ancho antes de ese factor.
Solo `NV.__paintedSwarm=true` activa el candidato; no se persiste ni se cambia
en partida normal. Las imágenes se precargan solamente en la prueba/auditoría.

## Mediciones A/B repetidas

1080p, refresco informado 165 Hz, calidad alta/full, partículas, escopeta F3,
explosiones y entorno reactivo. Simulación congelada idéntica entre casos en
cada ejecución; el reloj y las animaciones visuales siguen avanzando en el
mismo ciclo. FPS sin tracing; trace raster en ventana posterior. No son
partidas humanas ni una validación de todos los consumibles. Comparar dentro
de cada ejecución, no los FPS absolutos de escenas distintas.

Diez Enjambritos (30 componentes), mismos enemigos/efectos:

| Caso | FPS | Frame p95/p99 ms | Raster media/p95/p99 ms |
|---|---:|---:|---:|
| Actual A | 164,79 | 6,20 / 6,20 | 2,639 / 2,892 / 2,978 |
| Pintado A | 164,79 | 6,20 / 6,20 | 2,113 / 2,306 / 2,372 |
| Actual B | 164,62 | 6,10 / 6,20 | 2,511 / 2,745 / 2,850 |
| Pintado B | 164,79 | 6,20 / 6,20 | 2,139 / 2,342 / 2,437 |

Ambos topan con refresco. El costo raster de la escena baja aproximadamente
15–20%; no significa que cada enemigo sea exactamente 15–20% más barato.

Escena mixta pesada: 21 entidades actuales, incluyendo tres Enjambritos y los
tres élites pintados integrados. Solo se alterna el renderer de Enjambrito:

| Caso | FPS | Frame p95/p99 ms | Raster media/p95/p99 ms |
|---|---:|---:|---:|
| Actual A | 151,46 | 12,10 / 12,20 | 3,511 / 3,908 / 4,148 |
| Pintado A | 157,79 | 6,20 / 12,20 | 3,270 / 3,661 / 3,977 |
| Actual B | 151,43 | 12,10 / 12,20 | 3,435 / 3,863 / 4,153 |
| Pintado B | 157,64 | 6,20 / 12,20 | 3,310 / 3,644 / 3,880 |

Mejora repetida del cuadro completo (~4,1%). p95 mejora; p99 sigue en 12,20 ms
y hubo cuadros de ~18 ms. No prometer 165 constantes ni multiplicar este ahorro
por todo el catálogo. `Raster` es duración de `RasterDecoderImpl::DoRasterCHROMIUM`
en proceso GPU, incluyendo envío/esperas, no timer exclusivo de hardware.
`gpuMs:null` indica evento no disponible, no costo cero.

Fuentes: `local/validation/gpu-layer-audit/swarm-painted-ten-20261014*` y
`swarm-painted-mixed-20261014*`, informes, resúmenes y trazas por caso.
Captura visual/QA: `local/validation/painted-swarm-20261014/preview.png` y
`visual.json`. QA comprueba seguimiento ocular y movimiento en tres estados,
datos de entidad intactos y transformación Canvas restaurada.

## Siguiente paso

Juicio visual del usuario; si se acepta, A/B en movimiento antes de adoptar
en partida normal. Luego Escopuras con el mismo criterio. No se cambió ningún
otro modelo, cantidad de enemigos, resolución o mecánica. Sin commit/push.
