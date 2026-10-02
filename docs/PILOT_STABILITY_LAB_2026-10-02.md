# Laboratorio de continuidad visual — 02-10-2026

Actualización posterior: ver `PILOT_CANONICAL_GEOMETRY_LAB_2026-10-02.md`.
El perfil elegido por el usuario reemplaza los defaults históricos de BOTI de
este informe. Ahora hay baseline protegido, copias guardables y geometrías
independientes en la misma herramienta; las mediciones siguientes son históricas.

Estado: experimento terminado y verificado, pendiente de valoración estética del
usuario. Sustituye la propuesta anterior del laboratorio; NO modifica producción.

## 1. Renderer real encontrado

El checkout local carga `js/render/player.js` desde `index.html`. La partida usa
`NV.drawPlayer` por el wrapper de `js/game.js` (zona4219); el lobby también llama
a esa función. Los cuerpos se dibujan dentro de su rama por `cid`. No se tomaron
como fuente dibujos de GitHub ni previews históricos.

Se encontró el laboratorio actual en `dev/pilot-concepts/index.html` y
`concepts.js`. Se conservaron su página, Canvas, comparación y pausa; se sustituyó
su diseño experimental anterior por la instrumentación del renderer real.

## 2. Sistema de movimiento/deformación

`NV_drawLiquidInkBlob` construye polígonos radiales con dos ondas: seno de4
lóbulos y coseno de3. Cada personaje conserva sus radios, amplitudes, número de
vértices, velocidades y seeds. `NV_drawFlowingPatterns` anima elipses internas;
`NV_drawDripsAndMelts` anima6 gotas; ENJAMBRE tiene dos anillos elípticos. El
wrapper suma bob y respiración. Los ojos son los4 arcos reales del renderer:
dos negros de radio2.5 y dos de radio1.2 con `char.eyeColor`.

## 3. Causa principal de variación

La geometría no cambia sólo por ruido: sus dos ondas avanzan aproximadamente
.20/.25 radianes por frame, multiplicadas por la velocidad de cada capa. En
algunos cuerpos la deformación combinada es grande respecto del radio. Además,
cada vértice añade `(Math.random()-.5)*2.5`, un jitter nuevo de±1.25 unidades.
BOTI consume30 muestras por render, NOVA26, ROOK19 y ENJAMBRE13. El bob/respiración
también mueve el centro visual, sin cambiar el centro lógico.

## 4. Diseño preservado

Se reutiliza el renderer real completo: mismos polígonos/capas, fills, strokes,
glow, colores, grosores, gotas, elipses internas, anillos y ojos. No se pintó una
entidad nueva ni se reconstruyó el arte a partir de metadata histórica. Esto
importa porque los colores efectivos del cuerpo no siempre son `char.color`:
NOVA se ve rojo/naranja en sus helpers, aunque su metadata tenga otros acentos.

## 5. Estrategia experimental

El laboratorio registra las instrucciones Canvas de `NV.drawPlayer`; las
reproduce conservando estilos y primitivas. Identifica sólo los caminos
poligonales cerrados de los cuerpos:2 capas BOTI,2 NOVA,1 ROOK,1 ENJAMBRE.

Mantiene una forma de referencia extraída del renderer actual en el frame95.
Combina sus vértices con los del mismo renderer en un tiempo más lento:

`referencia + amplitud*(1-estabilidad)*(contorno lento-referencia)`.

Añade microvariación determinista interpolada con smoothstep, limitada a
`±1.25*micro`, con semillas por piloto/capa/vértice. Los detalles internos y
gotas conservan sus fórmulas, avanzando a otro ritmo. El bob/respiración del
cuerpo completo se reduce al35%; ojos y cuerpo siguen moviéndose juntos.

Para detener también la columna original, su jitter usa muestras reproducibles
por piloto/frame exclusivamente aquí. Se sigue llamando al renderer real con
un generador temporal; `Math.random` se restaura síncronamente mediante finally.
La página no carga el coordinador, engine, audio, ajustes ni partidas. No hay
un cambio global de RNG en el juego. La referencia de frame95 es una muestra
válida del arte actual, no una nueva forma circular/geometría inventada.

## 6–9. Parámetros iniciales por piloto

Las velocidades son multiplicadores respecto de las animaciones actuales.
Estabilidad0 permite toda la deformación lenta;1 fija el contorno de referencia
conservando microvariación y movimiento de detalles. No usar1 como preset inicial.

| Piloto | Velocidad de contorno | Amplitud | Estabilidad | Microvariación | Velocidad de detalles |
|---|---:|---:|---:|---:|---:|
| BOTI | .18 | .85 | .48 | .35 | .75 |
| NOVA | .22 | .80 | .55 | .30 | .85 |
| ROOK | .14 | .90 | .45 | .25 | .60 |
| ENJAMBRE | .18 | .85 | .50 | .30 | .72 |

NOVA conserva un ritmo más rápido; ROOK es más lento y pesado. Las identidades
no se normalizan a una geometría común.

## 10. Consistencia entre capturas

Se guardaron frames95,96,101,155 y395 (incluyen intervalos de1/6/60/300 frames).
Se midió el desplazamiento medio de vértices locales del contorno, sin confundirlo
con FPS, calidad artística, desplazamiento de gotas ni movimiento del jugador.
También se midieron20 ventanas distintas separadas por60 frames, comparando +6.

| Piloto | Original, media +6f | Experimental, media +6f | Reducción |
|---|---:|---:|---:|
| BOTI | 4.782 unidades | .412 unidades | 91.4% |
| NOVA | 5.017 | .455 | 90.9% |
| ROOK | 5.487 | .398 | 92.8% |
| ENJAMBRE | 3.204 | .251 | 92.2% |

No quedaron estáticos: las instrucciones experimentales cambian a los5 segundos.
Las capturas muestran ojos/colores preservados, centro más tranquilo y masa
principal reconocible mientras corrientes, gotas y anillos siguen vivos.
La preferencia estética y cuánto movimiento conservar los decide el usuario.

## 11. Archivos modificados

- `dev/pilot-concepts/index.html`: controles y textos de comparación.
- `dev/pilot-concepts/concepts.js`: reutilización/instrumentación del renderer,
  estabilización, comparación, métricas, pausa y capturas.
- `tools/verify_alpha.cjs`: flag de QA `--pilot-stability`.
- Documentación: este informe, `README.md`, `docs/AI_START_HERE.md` y nota de
  continuidad en `PILOT_ENERGY_REDESIGN_2026-10-02.md`.
- Evidencia generada dentro de `previews/pilot-stability-2026-10-02/`.

## 12–13. Producción y originales

Gameplay NO alterado. Personajes originales activos. Ningún archivo de `js/`,
`css/`, `assets/`, `desktop/`, index.html de producción ni lanzadores cambió:
75 hashes SHA256 antes/después coinciden. Ver `production-before.json` y
`production-check.json`. No cambian ataques, especiales, hitboxes, físicas,
movimiento, stats, balance, armas, enemigos, bosses, HUD, targeting ni colisiones.
No se reconstruyó Electron porque no hay nada nuevo que integrar allí.

## 14. Cómo abrir

Abrir `C:\Users\party\Desktop\JuegoDemo\dev\pilot-concepts\index.html` con
Chrome/Edge. Funciona directamente como archivo, sin servidor ni instalación.
Si se usa el servidor existente: `/dev/pilot-concepts/index.html`.

## 15. Controles y verificación

Selector de piloto; sliders de velocidad del contorno, amplitud, estabilidad,
microvariación y velocidad de detalles; reset de los4 presets; pausa/reanudar;
avance de1/6/60 frames; volver al frame95; capturas A/B visibles y descarga PNG;
medición de desplazamiento de vértices. No guarda preferencias ni archivos
automáticamente. Capturas A/B permanecen sólo en memoria hasta recargar.

Edge headless verificó1280×1050,915×412 y844×390, tanto HTTP como archivo local:
sin errores JS ni desborde horizontal. Comprobó color/estilos,4 arcos de ojos,
topología por piloto, freeze reproducible, animación, restauración del RNG,
ausencia de mutación de metadata, sliders independientes, reset, pasos y capturas.
Se inspeccionaron visualmente capturas del inicio, tras5s y la UI con controles.
No sustituye probar la estética en el monitor del usuario.

`npm test`:158 suites,0 fallos. Syntax checks y `git diff --check`:PASS.
Reportes:`previews/pilot-stability-2026-10-02/web/report.json` y `file/report.json`;
log de tests:`tests.txt`; capturas:`web/frame-95.png` hasta `frame-395.png`.

La instrumentación registra instrucciones y crea arrays: es adecuada para un
laboratorio limitado a30fps, no una arquitectura que se deba copiar directamente
al loop de producción. Si se aprueba, la integración deberá adaptar el helper
visual con un RNG cosmético propio y validar estados de combate/performance.

## 16. Primera prueba recomendada

Empezar con los4 presets, observar la animación continua y después usar «Volver
al inicio», «Capturar A», «+6 frames», «Capturar B». Comparar también después de
1 segundo. Si se siente demasiado contenido, bajar estabilidad gradualmente.
Esta prueba no autoriza ni decide una integración al juego.

No se hizo commit, push, staging ni operaciones destructivas de Git.
