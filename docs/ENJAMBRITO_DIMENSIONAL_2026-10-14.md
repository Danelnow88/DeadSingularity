# Enjambrito dimensional — nueva propuesta vigente

## Estado actual: aprobado provisionalmente e integrado

La variante limpia fue aceptada y activada en el roster promovido. Material
precalculado antes del combate; tres ojos, seguimiento y movimiento permanecen
vivos. La galería conserva original a la izquierda y nuevo a la derecha.
Se admite rediseñarlo en el futuro: esta integración no fija el arte definitivo.

A/B limpio: escena idéntica congelada de21 enemigos, original 148,11/151,95 FPS,
nuevo 155,97/156,95. p95 original12,1/12,1 ms; nuevo12,0/6,2; p99 permanece12,2.
Raster medio original3,418/3,415 ms, nuevo3,346/3,370; incluye esperas/envío.
Combate vivo de24 enemigos: 144,43 ->147,52 FPS. No mejora p95/p99 (12,1/12,2).
Son pruebas de carga mixta, no coste aislado por enemigo ni garantía de165 FPS.
Informes: `swarm-clean-20261014-summary.json`, `swarm-clean-live-reference.json`
y `swarm-clean-live-painted.json` dentro de `local/validation`.
227 suites pasan; QA de captura verifica ojos, movimiento y activación normal.

El resto de este documento registra las etapas históricas anteriores.

Corrección posterior solicitada por el usuario: la propuesta quedó sin los
filamentos externos ni la curva interior que parecía una boca. Conserva los
tres ojos, seguimiento, órbita, respiración y material con volumen. Se eliminó
también el atlas de filamentos, que ya no se utiliza. Solo se corrigió esta
versión; no se adoptó en partida normal. El original sigue intacto a la izquierda
de la comparación y en partida. Los números de abajo corresponden a la versión
anterior con filamentos: no se midió otro A/B para esta corrección estética.

El usuario descartó el pescado y pidió conservar el Enjambrito original: tres
pequeñas formas cian con ojos, orbitando juntas. Permite sumar algo del material
y volumen de los élites/núcleos para un lenguaje visual compartido. La partida
normal conserva el diseño original; esta propuesta está en el laboratorio.

`PROBAR_ENJAMBRITO_PINTADO.cmd` abre antes/después animado con cuatro estados.
La nueva versión no usa la imagen de pescado. Se dibuja por código y se prepara
una vez en una superficie compartida de 224×144: mismo contorno original,
material oscuro con sombra/volumen, borde iluminado plegado, fisura corta y
esclerótica integrada. Tres pupilas permanecen vivas y siguen al jugador.

Conserva separación, órbita 1,35, radios 14/9 y rotación `a*.25+i*.7`, tamaño,
avisos de ataque, estados, mecánicas y cantidad de organismos. Añade respiración
pequeña. Los filamentos ondulan con la fase original `t*4+i`; se preparan en un
atlas de 128 fases (1024×384), evitando nuevos strokes curvos cada cuadro.
Solo la fase del filamento está muestreada; órbita, cuerpo y pupilas se actualizan
continuamente. Error máximo aproximado del centro de la curva a escala 0,58:
0,036 unidades de mundo por redondeo de fase, antes de escala de cámara.

El primer candidato híbrido, con colas dibujadas como curvas cada cuadro, no
superó al control final en FPS: 147,64 / 148,76 / 149,96. No se adoptó esa
implementación. Se conserva el informe `swarm-dimensional-mixed-20261014*` como
diagnóstico histórico. No confundirlo con la variante final de atlas siguiente.

## A/B final

Misma escena congelada de 21 entidades actuales, con tres Enjambritos, tres
élites pintados integrados, escopeta F3, partículas/explosiones y fondo reactivo,
1080p y calidad alta/full. Reloj visual animado, dos segundos de fases iguales.
FPS medido sin tracing; trace raster en una ventana posterior. No es una partida
humana ni una prueba de todos los consumibles.

| Caso | FPS medios | Frame p95/p99 ms | Raster media/p95/p99 ms |
|---|---:|---:|---:|
| Original A | 153,63 | 12,10 / 12,20 | 3,343 / 3,688 / 4,007 |
| Dimensional A | 158,14 | 6,20 / 12,20 | 3,316 / 3,795 / 4,146 |
| Original B | 153,13 | 12,10 / 12,20 | 3,372 / 3,844 / 3,981 |
| Dimensional B | 157,61 | 6,20 / 12,20 | 3,272 / 3,646 / 3,946 |

Ventaja de cadencia repetida (~3%) y mejor p95, pero p99 permanece en12,20 ms.
Raster medio algo menor en ambas; sus percentiles no mejoran consistentemente.
Hubo intervalos de ~18 ms. No garantiza 165 ni elimina tirones; no extrapolar al
catálogo entero. Raster mide `RasterDecoderImpl::DoRasterCHROMIUM`, incluye envío
y esperas, no tiempo de hardware exclusivo. Categorías pueden solaparse.

Fuentes: `local/validation/gpu-layer-audit/swarm-dimensional-atlas-20261014*`.
Captura y QA: `local/validation/painted-swarm-20261014/preview.png`, `visual.json`.
QA comprueba ojos, movimiento y no mutación en aproximación/commit/reagrupación,
con Canvas restaurado. Contratos de animación y comportamiento colectivo pasan.

## Criterio de todo el juego y siguiente paso

`docs/CRITERIO_VISUAL_CRIATURAS.md` registra el lenguaje visual gradual: tamaño
por función, silueta propia, material/sombra/biseles, ojos vivos y color funcional
con luces controladas. No fuerza un filtro global ni modifica los demás enemigos.

Mostrar esta propuesta al usuario. Si se acepta, comparar en combate en movimiento
antes de adoptarla. Luego Escopuras. El pescado y sus cifras de rendimiento son
históricos y no son esta propuesta. Sin commit/push, sin nuevas publicaciones.
