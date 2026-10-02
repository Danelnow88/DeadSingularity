# Arena + cámara 2D — foundation local

Pedido vigente: separar mundo físico y vista, sin otro viewport manager, sin
rebalancear intencionalmente. Estado local prevalece sobre GitHub. Se revisó
git status --short --branch antes de editar; se preservaron cambios y borrados
previos. Sin commit, push, reset, restore, clean ni eliminación de archivos.

## Arquitectura y tamaño

La autoridad sigue siendo js/core/viewport.js y el mismo objeto NV.worldMetrics.
ref=900x520; view es la ventana lógica. arena=view × 1.5 en ambos ejes (2.25× área),
una elección explicada antes de implementarse para permitir recorrido sin mapa
gigante. Desktop view=900x520, arena=1350x780, rangos cámara x=0..450, y=0..260.
Móvil conserva Dynamic World View: viewH=520, viewW=max(900,520×aspecto del canvas
físico). Arena usa 1.5× esas métricas, no resolución CSS ni DPR. El fallback
dynamicView=0 y portrait mantienen vista 900x520, pero también arena 1350x780.

Prueba móvil táctil real EMULADA (no dispositivo): 915x412 dio vista aproximada
1164.24x520 y arena 1746.35x780; 844x390 dio vista 1134.79x520 y arena 1702.19x780.
El canvas físico descuenta bordes/padding; no asumir que su aspecto es el del
monitor completo. Fixtures puros de canvas exacto 915x412 dan viewW=1154.85.

viewport.followPlayer usa clamp(player - view/2,0,arena-view). Sin smoothing,
dead-zone, zoom nuevo ni física de cámara. Sólo escribe viewX/Y. La inercia del
movimiento sigue intacta. En bordes reales el jugador deja de estar centrado,
pero puede llegar hasta la pared. No hay región lógica fuera del mundo visible.
El zoom cinemático existente sigue clamped dentro de la arena.

World→render: transformación Canvas existente y cámara legacy opcional reciben
viewX/Y. Borde y arte sectorial se anclan a arena real. Estrellas y capa rítmica
siguen decorativas; no delimitan física. No se añade otro Canvas/loop/cámara.

Screen→world: ambas conversiones suman/restan viewX/Y, incluidos desktop y
fallback móvil. El cursor físico se reproyecta al seguir; mover cámara no exige
otro mousemove. Entrada programática de mundo (mando/Lab) no se reemplaza por
un cursor antiguo. Shake físico se aplica antes de draw/reproyección de retícula.
HUD, pausa, combo y dock quedan anclados a la vista. Click dock usa coordenadas
locales de UI. El toggle NO HUD conserva su autoridad.

Resize: no transforma la simulación todos los frames. Cuando cambia Dynamic
Arena se reconcilian bounds una vez desde el coordinador, fuera de draw. Pickups
siguen alcanzables; enemigos desplazados y minas reavisan. Un boss cancela/reavisa
el cast; zonas activas que quedarían fuera se desactivan, no se trasladan para
dañar. El engine de láseres ya cancela/reavisa si cambia W/H.

## Auditoría de consumidores y consecuencias

| Sistema | Autoridad y adaptación |
| --- | --- |
| Movimiento, dash, Hook pull | Física mundial; clamps arenaW/H en game.js, sin tope view. |
| Enemigos/IA/spawns | engine/enemies, enemyArrival; W/H reales, presupuesto/avisos intactos. Pueden estar fuera de cámara, no fuera de arena. |
| Bosses | boss y bossEncounters reciben arena. Posiciones/patrones originales; aviso de rayos alcanza diagonal real, no longitud fija 800. |
| Balas, rebotes, splash, llama | Colisiones/rangos mundiales; culling arena. Salir de cámara NO destruye una bala. |
| Pickups, drops, cofres | Mundo, recogida por distancia; resize preserva acceso. No nuevos drops ni magnetismo. |
| Meteoros, drones, especiales | W/H físicos; meteoros siguen entrando desde arriba del mundo, no arriba de cámara. Cantidades/daño intactos. |
| Mines/Core/sector/pulso | Hazards mundiales, lifecycle propio. Cabezales láser en bordes reales; no pegados al viewport. |
| HUD/transiciones/tienda/Game Over | UI visible anclada a view/DOM, cine clamped, guardados sin coordenadas de cámara. |
| Manual/auto/móvil/mando | Un input compartido. Manual convierte pantalla; auto conserva selección/rango mundial; touch/mando usan intents existentes. |
| Render/calidad/performance | Canvas2D y presupuestos anteriores, sin culling lógico basado en cámara ni gameplay mobile-only. |
| Legacy opcional | Frustum Three/Espectro consume view; no cargado en release offline, no validado visualmente como producto 3D. |
| Weather | Desconectado antes y después; no se activa un segundo sistema ambiental. |

## Protección mínima off-screen

engine/cameraSafety NO es gestor de coordenadas: consume worldMetrics/viewport.
Proyectiles hostiles y Hook recién descubiertos tienen 0.30s de lectura antes
de colisionar; un círculo discontinuo distingue la lectura de las balas. Láser,
mina o zona recién descubierta reavisa 0.55s antes de poder dañar. Se conserva
la entidad, posición, trayectoria, grupo y reloj del ataque. Ataques siempre
visibles conservan su funcionamiento. Pausa congela esos timers. Una caída de
FPS no consume todo el aviso en el primer frame de descubrimiento. El pulso
comprueba intersección del anillo real, no sólo su rectángulo envolvente.

Las miras del boss se dibujan aunque el cuerpo esté fuera de cámara; presión
anti-espera aparece en la posición del jugador. No se añaden minimapa, flechas
ni indicadores de todas las entidades. No cambia autoridad de daño al jugador.

## Segunda etapa — identificada, NO abierta

- Fuente/carga de láser puede quedar fuera de cámara aunque la línea se vea;
  falta evaluar orientación por audio y legibilidad sin HUD.
- Boss puede empezar fuera de cámara (spawn y movimientos se conservan). Leer
  su silueta, fase y hueco requiere acercarse; revisar colocación/encuentro por boss.
- Autoataque puede elegir targets fuera de cámara dentro de su rango original.
- Limpieza de oleada exige recorrer arena para encontrar supervivientes; decidir
  lenguaje de búsqueda sin volver a llenar el HUD. No hay enemigos fuera de arena.
- Drops, monedas y meteoros tienen mayor dispersión; un meteoro tarda más en
  alcanzar zonas bajas. Notificaciones mundiales centradas en mapa pueden quedar
  fuera de vista. Banners DOM y tienda siguen disponibles.
- La densidad/tiempo de encuentros cambia con arena 2.25× mayor. No compensar
  silenciosamente cantidad, cadencia, HP o economía para taparlo.
- LOD/culling puramente visual de entidades fuera de cámara puede optimizarse,
  sin dejar de actualizar IA/colisiones ni borrar entidades invisibles.
- Pantallas físicas, DPI, touch/mando real, sonido y diversión requieren humano.

## Balance y worldMetrics

Sí cambia worldMetrics: arena mayor y viewX/Y dinámicos. Sí cambia gameplay por
geometría, recorrido y protección off-screen explícita. No se modifican HP,
daño, velocidades, cadencias, rangos, recompensas, dificultad, conteos ni reglas
de final de oleada intencionalmente. No afirmar que el balance efectivo quedó
igual: tamaño/visibilidad/protección pueden alterarlo y requieren playtest.

## Archivos de este corte

- js/core/viewport.js; js/game.js; index.html.
- js/engine/cameraSafety.js (nuevo helper, no manager); bullets.js; enemies.js;
  hazards.js; sectorEncounters.js; bossEncounters.js (sólo longitud de dibujo).
- js/render/hazards.js; js/render/projectiles.js.
- tests/camera_foundation.js; dynamic_arena.js; dynamic_viewport.js;
  world_metrics_noop.js; mobile_compat.js; mobile_hud_polish.js;
  rhythm_analysis_render.js; tools/verify_alpha.cjs.
- README.md; docs/ARCHITECTURE.md; MOBILE_ARCHITECTURE.md; TESTING.md;
  PENDIENTES_REALES_2026-10-01.md; este informe; JUGAR NEON VOID.cmd al verificar.

## Verificación y cierre

19 casos específicos de cámara: cuatro bordes, centro, conversiones, resize,
fullscreen, legacy móvil, culling, colisión real off-screen y reconciliación.
La suite general se ejecuta antes del empaquetado; ver cierre operativo en
PENDIENTES_REALES_2026-10-01.md. Checks de sintaxis y diff sin cambios destructivos.
Edge CDP, no dependencia npm nueva: previews/camera-foundation-touch-final,
cinco layouts, puntero móvil grueso, movimiento real por los cuatro bordes,
cursor inmóvil, selección dock sin disparar, pausa, NO HUD y resize. Capturas
desktop y móvil revisadas visualmente. Sin excepciones runtime.
Regresión integral final: previews/camera-integral-final. Stress headless 19
escenarios: previews/camera-integral/performance-stress.json; NO garantía de FPS.
Publicar launcher sólo tras Electron pass:true/saved:true/playing/errors:[].

Cierre verificado: suite 153/153; Electron aprobó con esos cuatro criterios.
Diez módulos cambiados coinciden por hash en ambas entregas. Windows:
releases/NEON-VOID-0.10.0-alpha-windows-pD8QaO; Web:
releases/NEON-VOID-0.10.0-alpha-web-6G98xt. JUGAR NEON VOID.cmd actualizado
después de comprobarlo. Build 6fhn6g anterior preservada. No se eliminó nada.
Fullscreen: contrato y conversión comprobados en test; faltan fullscreen/touch
de dispositivo físico. La foundation está cerrada; segunda fase no iniciada.
