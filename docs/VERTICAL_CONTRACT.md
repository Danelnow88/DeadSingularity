# Primer ciclo vertical — fases D y E

## Alcance exacto

Es una entrega técnica mínima, no el reemplazo visual del juego completo.
Código nuevo independiente en src/game/cycle.mjs y src/play.*. No se cargan
funciones, imágenes, música ni namespaces de reference en la partida nueva.
Los dibujos de prueba son Canvas procedimental nuevo; no son arte final.
AudioStub recibe eventos pero no reproduce sonido. No se añadió una dependencia.

Un perfil físico boti (120 HP, velocidad 195), arma pistol, enemigo drone.
Loop único: estado → entrada → update(dt) → render → eventos de audio.
Normal, sin permanentes ni contratos. Permite continuar repitiendo este corte
con la curva de oleadas; no tiene historia, bosses, roster ni finales completos.
Las otras acciones de entrada esperan sus módulos de gameplay.

## Reglas tomadas de la referencia, reimplementadas

| Regla | Valor / fuente |
| --- | --- |
| Pistola | daño 14, velocidad 500, activación 380, fireRate 30/60 s; gameData.js |
| Cadencia | factor oleada 1-0.01*w, factor nivel 1-0.004*(nivel-1), piso 4/60; game.js |
| Daño del arma | curva weaponLevelDamageMultiplier y +5%/oleada completada; balance.js |
| Crítico propio | 10%, daño doble; weapons.js |
| Progreso de arma | 1+0.06*w por baja, cap 3; umbral 6*nivel, cap nivel 100 |
| Dron base | HP 25, speed 75, radio 11, daño 12; gameData.js |
| Dron resuelto | HP redondeado por enemyHpScale*0.85; speed +min(40,1.5*w); daño +round(1.5*w), por 0.80 |
| Daño recibido | crítico enemigo 0.10+0.018*w (cap .35), x1.6 redondeado; invulnerabilidad post-hit .5 s |
| Llegada | aviso .9 s y puff .22 s, sin AI/target durante llegada; enemyArrival.js |
| Oleada 1 Normal | mínimo 15 s y 22 enemigos despejados; nunca solo el tiempo |
| Refill | batch 2+min(3,floor(w/2)); intervalo con compensación de arena y densidad blanda; balance.js |
| Drop | 15% comunes sin suerte/permanentes; valor 1, radio recogida <30; enemies.js/pickups.js |
| Fin de oleada | recoge hasta 15 drops más cercanos; premio 8+min(12,w), +8 sin daño; pickups.js/expedition.js |
| Compra HP | suma 25 a vida actual y máxima; 15+4*nivel, cap efectivo 6; game.js/balance.js |

## Diferencias deliberadas de alcance, no certificadas como paridad

La fase E incorpora formación del dron (anillo, aviso, avance y recuperación),
separación por cuadrícula, knockback y hit-slow, combos, XP y pasiva de boti.
Un contacto aplicado elimina al atacante: otorga XP/score/drop, pero no progreso
de arma. Una baja letal al jugador sigue siendo gameover aunque esa muerte
del dron dispare una subida de nivel. El daño de pistola redondea antes del crítico.
Se conserva victoria normal de 2.10 s, recogida magnética de hasta 15 fragmentos
y entrada de tienda de .35 s. Se puede caminar en victoria, sin activar ataques,
dash ni recarga. La presentación visual completa sigue pendiente.

La regeneración conserva la regla de 1 HP cada 300 frames de simulación, no
se convierte silenciosamente a segundos. V1 guarda ese contador de partida;
no replica la fase del contador global del prototipo que también avanza en menús.
La colocación interior sigue siendo de prueba: faltan director productivo,
fusiones de enemigos y las demás familias. Los fixtures de IA tienen dos drones
sin fusión, a 30/60/144 Hz; no certifican sinergias de todo el roster.
Colisión de bala usa segmento contra círculo para no perder impactos entre
frames. Faltan las demás semánticas del motor de proyectiles. El aviso conserva
tiempos, no el diseño final ni todo el director/camera safety de la referencia.
No se cambió el tuning de la referencia ni se afirma equivalencia de partidas.
Completar estos contratos antes de evaluar balance o retirar el prototipo.

## Guardado propio

Clave deadSingularity.v1.verticalCheckpoint; formato dead-singularity-vertical,
version 2. Guarda desde TIENDA: oleada completada, HP, compras, monedas, score,
nivel/progreso de pistola, XP/nivel/umbral del piloto y contador de simulación.
Admite checkpoints anteriores de V1 (version 1) con nivel inicial y XP cero;
no confundirlos con perfiles del prototipo. Combo se reinicia al cargar.
Cargar vuelve a esa tienda y continuar inicia la
oleada siguiente. No guarda movimiento, proyectiles, dash o una partida a mitad
de combate. Rechaza formato/version/piloto/arma desconocidos, números inválidos
y HP inconsistentes sin mutar la partida. No importa perfiles legacy.
Web HTTP y Electron dsv1 tienen almacenes separados; no hay sincronización
automática ni publicación. Perfiles de Electron, pruebas y logs quedan en local/.

## Evidencia y límites

check-loop: 30/60/144 Hz; 30 comparaciones contra reglas reales de referencia;
daño/muerte/drop/recogida/tienda/compra/continuación/guardado/carga/pausa.
La fixture de prueba inyecta movimiento circular y RNG cero para asegurar
críticos/drops. El juego normal conserva Math.random; no se alteró para ganar.
La prueba inmóvil inicial perdió; el harness corregido se mueve, sin cambiar daño.

Electron y web HTTP local (Chromium de Electron en modo QA) jugaron una oleada
en tiempo real, compraron HP (130→155 después de subir de nivel), guardaron, desplegaron oleada 2 y cargaron
la tienda de la oleada 1. local/validation/desktop-cycle.json y web-cycle.json;
capturas *-cycle-playing.png y *-cycle-shop.png, inspeccionadas visualmente.
No equivale a una prueba en Chrome/Edge externo ni Android físico. Mando real,
multitouch físico y fullscreen en navegadores reales requieren revisión humana.

## Archivos de fase D

src/game/cycle.mjs; src/play.html/css/mjs; tools/check-loop.cjs;
desktop/main.cjs (QA de ciclo nativo/HTTP y perfil local); index.html;
package.json; src/lab/input.mjs (offset del canvas y resize sin reasignar cada frame);
README.md y documentos de continuidad/estado.

Fase E: src/game/drone.mjs, progression.mjs, cycle.mjs, motion.mjs e input-dom.mjs;
src/play.mjs; tools/check-slice.cjs y check-loop.cjs; desktop/main.cjs y package.json.
check-slice: 147601 comparaciones de IA/impacto/XP/combos/regeneración contra
funciones de la referencia; además transición, pausa y migración de checkpoints.
