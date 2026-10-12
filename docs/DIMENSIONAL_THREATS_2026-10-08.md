# Costurero, Devorador y Francotirador dimensional — 08/10/2026

Implementación en el roster productivo, no solo en una preview. Son tres enemigos
nuevos: las rutinas y estadísticas de los trece originales se conservan.

## Revisión de presencia — estado vigente

El autor detectó que morían antes de mostrar el ataque y no estaban al nivel
visual del roster. Se reforzaron SOLO estas tres familias, sin tocar armas ni
stats de los enemigos anteriores. No se agregó invulnerabilidad artificial.

| Enemigo | HP base | Velocidad | Radio | Daño base | Peso |
| --- | ---: | ---: | ---: | ---: | ---: |
| Costurero | 90 | 100 | 16 | 16 | .50 |
| Devorador | 130 | 70 | 22 | 15 | .40 |
| Francotirador dimensional | 80 | 110 | 15 | 19 | .45 |

Los valores pasan por el escalado original. Mejor recompensa acompaña su mayor
resistencia. Se conservan desbloqueos 2/3/4, cap de dos vivos y reservas de ataque.
Entrada al ataque .35 s y alcance 380–410 evitan acercarse lentamente bajo fuego
sin responder. El posicionamiento incorpora flanqueo/órbita y retirada por rol.

- Costurero: aviso .95 s; fisura que barre hasta 92 unidades durante 1.1 s,
  daño una vez por barrido. Recuperación .8 s, cooldown 2.5 s. Una sombra del
  espacio anticipa la distancia completa: salir por el lado no barrido o dash.
- Francotirador: tres rayos fijos salen de una boca dimensional; aviso 1 s,
  ataque .24 s, un impacto máximo, recuperación .85 s y cooldown 2.7 s.
  Requiere desplazamiento lateral suficiente o dash, no tres impactos apilados.
- Devorador: aviso 1.1 s; compresión 3.8 s hasta núcleo de radio 8. Ya no permite
  quedarse quieto indefinidamente en el centro. Salir antes del cierre o destruir
  al dueño. Daño cada .85 s; recuperación .9 s y cooldown 4 s.

Rediseño Canvas2D: carapazas con material sombreado, guadañas articuladas,
corona de placas y ojo abisal, tirador con aletas y lente refractiva. Fisura negra
con dos bordes luminosos, lentes multicapa y filamentos que convergen en la zona.
Son trazos procedurales efímeros, no partículas ni trails persistentes. Se retiró
el marcador genérico rojo de CONTACTO para estas familias: ese peligro no existe.

`tools/qa-threat-presence.cjs` verifica cada familia desde su oleada de desbloqueo
en normal con autodisparo desde el inicio y exige ataque antes de morir, seguido
de baja real con el arma inicial. `qa-dimensional-threats.cjs` prueba conjunto,
pausa y limpieza con movimientos reales; quedarse inmóvil ya no es una estrategia
válida para resolver el conjunto. Prueba humana pendiente para ajustar presión.

### Verificación de esta revisión

182 archivos de pruebas aprobados; sintaxis de 138 archivos y catálogo generado
verificados. Cada familia en normal con Boti, autodisparo y arma inicial desde el
inicio ejecutó su mecánica antes de morir (sin inmortalidad ni alterar HP desde QA).
Reportes en `local/validation/threat-presence/runtime.json`.
Encuentro conjunto en escritorio completado con Boti y movimientos reales.
El escenario de estrés móvil reúne las tres familias (producción limita a dos):
completado con Rook, arma inicial y recorrido evasivo, sin especiales ni cheats.
Se verificaron seis fases, daño, pausa, bajas reales y ausencia de geometría
remanente. Build actual: `releases/DeadSingularity-V1-web-nPzhnf`.
Las cifras no sustituyen la prueba humana de presión con builds avanzadas.
Sin commit, push ni publicación. Próximo paso: evaluar las amenazas en oleadas
2–4 de una partida normal y calibrar SOLO frecuencia/ventanas de estas familias
si el autor encuentra problemas de lectura o presión excesiva.

## Reglas de primera implementación — históricas, reemplazadas arriba

- `rift_weaver`, COSTURERO: light, desde oleada 2, peso .30. Marca una línea
  fija durante 1.05 s; las dos puntas cierran la costura. Corte activo .26 s,
  un intento de impacto, recuperación .8 s y cooldown 3.8 s.
- `dimension_sniper`, FRANCOTIRADOR DIMENSIONAL: light, desde oleada 3, peso .25.
  Dos bocas de grieta y una trayectoria de salida fija durante 1.15 s. Disparo
  instantáneo geométrico .18 s, sin homing ni ráfaga. Recuperación .85 s, cooldown
  4.4 s. Solo la trayectoria de salida causa daño; la conexión a la entrada es
  la guía del ataque.
- `void_devourer`, DEVORADOR DE ESPACIO: medium, desde oleada 4, peso .20.
  Marca una región durante 1.3 s; el anillo peligroso invade progresivamente
  el núcleo seguro durante 4.8 s. Radio exterior hasta 126, adaptado a arena;
  núcleo termina en radio 35. La región se libera al matar al dueño, sin residuo.
  Daño de .55 del daño resuelto del enemigo, como máximo cada .85 s;
  recuperación .9 s y cooldown 6 s. No bloquea físicamente el movimiento:
  se puede salir, esquivar atravesando el anillo o matar al dueño.

El contacto de estos enemigos NO aplica el ataque genérico ni los autodestruye.
Vida, daño y radio pasan por las autoridades de escalado y spawn existentes.
Los impactos usan `applyPlayerDamage`, sin críticos añadidos, y respetan defensas.
El jugador puede interrumpir preparaciones matando al dueño; stun cancela la
geometría. No se alteran controles, armas, bosses ni duración/cierre de campos.

## Densidad, legibilidad y complejidad

Máximo dos enemigos de estas familias simultáneos en el despliegue normal,
incluyendo apariciones pendientes; máximo uno de cada tipo. No entran como
soporte de boss. Lab/force spawn conserva su función de diagnóstico.
Una sola reserva compartida de corte/disparo y una sola zona pueden estar en
preparación/ataque a la vez. No inician ataques desde fuera de cámara.
La preparación tiene geometría fija: no persigue al piloto ni cambia la línea
anunciada. El corte usa colisión barrida para detectar cruces entre frames.

Los modelos Canvas2D tienen siluetas propias (agujas, núcleo segmentado y tirador
con lente). Líneas discontinuas anuncian; líneas continuas y centro claro atacan.
El Devorador usa un solo anillo translúcido, borde interno y tres muescas de
compresión. Una guía discreta vincula la zona con su dueño. Sin banners, métricas
nuevas, partículas, estelas acumuladas, fullscreen flashes ni sombras costosas.
Geometría y animación viven en la entidad y desaparecen con ella; el renderer
no muta gameplay. Avisos críticos no dependen del presupuesto decorativo.

Una pasada O(n) adicional prepara reservas; actualización y render O(1) por
enemigo nuevo, sin consultas enemigo×balas. Se reutiliza la separación espacial
existente. No se promete O(n) estricto para el peor caso de la cuadrícula antigua.

## Archivos y verificación

- `content/catalog.json`: tres definiciones; `js/data/catalog.js` generado.
- `js/data/gameData.js`: fallback equivalente, clasificación explícita preservada.
- `js/engine/dimensionalThreats.js`: estados, geometría, reservas y daño.
- `js/render/dimensionalThreats.js`: siluetas y avisos autoritativos.
- `js/engine/enemies.js` y `js/game.js`: integración con spawn, IA, cámara y render.
- `tests/dimensional_threats.js`: snapshots, daño único, compresión, muerte,
  stun, reservas reales entre frames, cámara, 30/60/120 FPS y render puro.
- `tools/qa-dimensional-threats.cjs`: encuentro real en normal; captura seis
  fases, impacto real, pausa, bajas mediante arma y reset. Admite `--mobile`.

Próximo paso de diseño: prueba humana de presión a partir de oleadas 2–4,
para ajustar frecuencia/peso sin cambiar el resto del balance. Las familias
participan en el pool normal de todos los universos una vez desbloqueadas;
no hay reemplazos cosméticos aleatorios de la identidad de un mismo enemigo.
No se implementó todavía un selector procedural de familias por dimensión.
No se hizo commit, push ni publicación.

## Resultado de cierre

182 archivos de pruebas aprobados; sintaxis de 137 archivos y catálogo generado
verificados. Pruebas nativas de escritorio y móvil en normal completadas con las
seis fases, impactos, congelación por pausa, bajas con arma real y reset sin
geometría remanente. Capturas revisadas en `local/validation/dimensional-threats/`
y `local/validation/dimensional-threats-mobile/`. Build web local verificada:
`releases/DeadSingularity-V1-web-5X2s0F`. La calibración subjetiva de presión queda
como siguiente prueba humana, no como afirmación de balance idéntico.
