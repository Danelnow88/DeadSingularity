# NEON VOID — dificultad, bosses y lenguaje hostil

Estado local al 1 de octubre de 2026. Continuar desde este archivo y comprobar
siempre el código actual antes de modificarlo. No se hizo commit ni push.

## Estado vigente tras L2b/L3/L4a

Actualización M1: enemigos aparecen dentro del arena y el movimiento/empuje de
producción se contiene con margen visual; esbirros también se acotan. NO HUD
oculta el indicador de Historia. Entrega actual y prioridades revisadas en
`PENDIENTES_REALES_2026-10-01.md`. El cierre L3/L4a abajo es histórico.

- Oleadas normales: grupos finitos, no cuota de movimiento ni victoria sólo por reloj.
- Historia NUEVA: 20 oleadas, asalto/jefe alternados, 10 jefes en orden completo.
  Checkpoints anteriores: misma ruta de cuatro jefes. Infinito/Lab: cadencia canónica.
- Ventanas de boss diferenciadas por dificultad; JEFE y TITÁN con dos lecturas.
- Rojo compartido para zonas ambientales, avisos de boss/fusión y fijación inicial.
  Pulso muestra los dos bordes reales; presión de boss muestra radio fijo.
- El diagnóstico siguiente es histórico, NO describe la versión nueva.

## Diagnóstico inicial verificado (antes de estos cortes)

- Hay **10 bosses definidos** en `js/data/gameData.js` y 10 perfiles de ataque
  en `js/engine/bossEncounters.js`.
- Una partida de Historia/Expedición termina tras la oleada 20: sólo enfrenta
  **4 bosses**, en oleadas 5, 10, 15 y 20. No son cinco. Hay tres rutas fijadas
  por el seed del perfil; las tres juntas cubren los 10, pero ninguna partida
  individual los recorre todos. Infinito usa los 10 secuencialmente hasta la
  oleada 50 y luego repite. Es una decisión de `expedition.js` y `game.js`, no
  un boss desconectado. El laboratorio también permite seleccionar cualquiera.

| Oleada | Ruta 1 | Ruta 2 | Ruta 3 |
| ---: | --- | --- | --- |
| 5 | JEFE | GUARDIÁN | JEFE |
| 10 | MUTANTE | TITÁN | SEÑOR DEL VACÍO |
| 15 | DESTRUCTOR | FANTASMA | NÉMESIS |
| 20 | APOCALIPSIS | APOCALIPSIS | COLOSO |

- Fácil/Normal/Difícil cambian multiplicadores de HP, daño y spawn
  (`balance.js`): `0,80/0,75/0,85`, `1/1/1` y `1,20/1,25/1,15`. También
  alteran la densidad blanda y la frecuencia de composiciones tácticas
  (`4/3/2` reposiciones). No cambian la condición de victoria de oleada:
  **las oleadas normales se completan al agotar el reloj**, incluso sin bajas.
  Es la explicación directa de poder avanzar inmóvil.
- La presión anti-espera de los bosses ya estaba dibujada y tenía lógica de
  daño, pero `game.js` omitía pasar `applyPlayerDamage` al encuentro. En la
  partida real el círculo no podía quitar HP. El test unitario no detectaba
  esa desconexión; se añadió comprobación de runtime real.
- El lenguaje existente ya define proyectiles hostiles rojos, acento amarillo
  para stun y silueta según origen en `js/render/projectiles.js`. La guía
  artística está en `docs/VISUAL_BIBLE.md`. Bosses, enemigos, zonas, minas y
  sectores todavía usan muchos colores locales; no hay una autoridad única
  para todos los estados. La primera consolidación debe partir de las
  convenciones actuales y respetar identidad secundaria por familia.

## Corte L1 completado

- `JEFE`: primer turno con tres pulsos por una línea; siguiente turno con dos
  pulsos por tres carriles. La mira anuncia los carriles y fija la puntería
  antes de disparar. En fase 2 mantiene el abanico. La ventana de recuperación
  sigue disponible. No se alteraron HP, daño, velocidad ni otros nueve bosses.
- La presión anti-espera ahora llega al pipeline real de daño y puede terminar
  la partida. Salir del círculo rojo durante el aviso evita ese daño.
- El verificador de Edge comprueba el daño real y captura el abanico.
- Validación: sintaxis de `game.js`, `bossEncounters.js` y verificador; prueba
  dirigida `boss_encounters.js`; suite `145/145`; `git diff --check` limpio;
  Edge integral en `previews/difficulty-boss-l1/` (incluye tres viewports);
  Electron `desktop-qa.json` con `pass: true`, guardado y partida.
- Entregas: `releases/NEON-VOID-0.10.0-alpha-web-MARvq3` y
  `releases/NEON-VOID-0.10.0-alpha-windows-z8v9n3`. El lanzador apunta a la
  segunda. Ninguna build anterior fue eliminada.

## Siguiente corte exacto: L2

1. Cambiar la condición de fin de oleada normal para exigir participación
   verificable, sin crear un bloqueo infinito si el jugador juega bien.
   Revisar `game.js` (reloj, spawn, `triggerWaveVictory`), HUD y recompensa.
2. Diseñar una meta de bajas u objetivo equivalente por oleada, visible en HUD;
   medir Fácil/Normal/Difícil con pistola base y con build avanzada. El tiempo
   debe actuar como mínimo de supervivencia, no como victoria automática.
3. Probar muerte, fin de oleada, tienda, guardado/reanudación y móvil. Medir al
   jugador inmóvil con autofire: la run no debe completarse sola.

## Corte L2: corregido tras playtest

- La primera versión de L2 (movimiento acumulado + seis bajas en Normal)
  resultó artificial y era sorteable con una especial. Queda documentada como
  experimento descartado; la build L2a no debe publicarse como versión actual.
- L2b usa un asalto finito: 18/22/26 enemigos en oleada 1 según Fácil/Normal/
  Difícil. Las oleadas posteriores escalan con techo de 60. El director los
  despliega en grupos y respeta el presupuesto de entidades ya existente.
  El reloj es supervivencia mínima; la victoria exige que se hayan desplegado
  todos y no quede ninguno vivo. Una especial no salta grupos futuros.
- La barra combina tiempo mínimo y enemigos despejados; sólo puede llenarse
  cuando la victoria es posible. El HUD dice DESPEJADOS y POR LLEGAR; desaparece
  el requisito de distancia. Jefes y Combat Lab no cambian.
- Para que Fácil tampoco se complete quieto, los enemigos de las primeras
  cuatro oleadas coordinan una fijación periódica. Un trazo une al atacante con
  un círculo rojo marcado en la posición inicial del jugador; hay tiempo para
  salir y el golpe no persigue ni daña fuera del círculo. No es un evento ni
  una baliza nueva. Desaparece en oleada 5, donde rigen ataques de jefe.
- Pruebas: `tests/wave_clear_objective.js` y `tests/wave_pressure.js`. Edge con
  perfil aislado confirmó que Boti inmóvil termina derrotado en Fácil y Normal;
  tienda, guardar/salir, reanudación, muerte, jefe final y tres viewports pasan.
  Captura del aviso: `previews/difficulty-l2b/03-aviso-enemigo.png`.
- Criterio humano corregido: desafío para adolescentes/adultos también en
  Fácil. Probar oleadas 1–4 con pistola base y decir si la fijación avisa con
  tiempo suficiente, si el daño resulta justo y si la oleada dura demasiado.
- Cierre L2b: suite `147/147`, Edge integral y Electron con `pass: true`.
  Build verificada `releases/NEON-VOID-0.10.0-alpha-windows-HjMtMd`, ya
  seleccionada por el lanzador. La versión anterior sigue disponible.

## Corte L3 implementado

Historia mantiene cuatro sectores y veinte oleadas: diez asaltos y diez jefes,
en las oleadas pares 2–20. No agrega 35 oleadas idénticas ni otra capa de misiones.
Un flag persistido `bossProgression: full-roster` identifica partidas nuevas;
los guardados sin ese flag quedan en `legacy` y mantienen su ruta original.
`isBossWave` es la autoridad compartida por director, objetivos, contratos y eventos.
Infinito y Laboratorio siguen usando oleadas canónicas 5–50.

Lobby, manual, HUD y final explican misión completa, jefes vencidos y reinicio:
nueva Historia arranca de cero; permanentes y récords quedan. NO existe una
segunda campaña oculta tras el final. La prueba de Edge reanuda diez checkpoints
reales y comprueba las diez entradas distintas, además del recorrido clásico.

## Corte L4a implementado

- TITÁN alterna abanico concentrado y abierto; fase dos anuncia cinco carriles.
  Mantiene HP, daño, velocidades y recovery explícito, sin resistencia por arma.
- Fácil: aviso ×1,28 y recuperación ×1,25; Normal conserva ventanas; Difícil:
  aviso ×0,90 y recuperación ×0,82. Presión fija avisa 1,25/0,95/0,85 segundos.
- Sector: franja/anillo rojos, borde discontinuo en aviso y continuo activo.
  Colisión del pulso coincide con banda entre borde interior y exterior.
  Etiquetas cortas y acotadas al arena. Se conserva arte identitario del sector.
- Boss: círculo de presión con borde exterior fijo; aro interior es cuenta atrás,
  no una hitbox que se achica. Paleta común `NV.HOSTILE_SIGNALS`.
- Prueba `hostile_signal_geometry` para banda, etiquetas, no mutación y radio fijo.
  Prueba de bosses cubre presión/esquiva de 10×3 pares y dos lecturas de TITÁN.
  Galería: `previews/hostile-l4/`. Medición: `previews/boss-l4/`.

## Cortes posteriores

- L4c/L4d: Guardián con hueco desplazado y segunda lectura; Destructor con tres
  orígenes paralelos y abanico de fase dos. Emisores ambientales fijos sustituyen
  la presentación abstracta de venteo/grieta. Detalles y medición completa con
  autoataque en PENDIENTES_REALES_2026-10-01.md. El láser avanzado ganó con pequeña
  oscilación: desafío/economía siguen abiertos, no declararlos solucionados.

- **L3:** implementado con veinte oleadas alternadas y flag compatible, no campaña
  de cincuenta oleadas. Falta aprobación humana de duración/economía del recorrido.
- **L4 en adelante:** rediseñar un boss por corte: geometría, distancia útil,
  cadence, telegraph, punish window y matchups por rango. Medir con pistola,
  rifle y arma corta, quieto y en movimiento; evitar multiplicadores ocultos.
- **Lenguaje hostil:** inventariar render de comunes, espectros, élites,
  bosses, hazards y Speaker Mines. Unificar roles de color para aviso, activo,
  stun, impacto y entorno; conservar siluetas y acentos identitarios. Probar
  capturas con muchos enemigos y calidad reducida.

## Validación y continuidad

Cierre L3/L4a: suite `148/148`, Edge integral en `previews/history-l3-final/`,
galería ambiental y matriz de treinta escenarios sin excepciones. QA Electron
`desktop-qa.json`: `pass: true`, guardado y juego funcionando. Build publicada en
el lanzador: `releases/NEON-VOID-0.10.0-alpha-windows-at6KiE`; web:
`releases/NEON-VOID-0.10.0-alpha-web-pepsuS`. Builds anteriores conservadas.
Lista honesta de próximos trabajos: `PENDIENTES_REALES_2026-10-01.md`.

El criterio de cierre de cada corte es sintaxis, prueba dirigida, `npm test`,
`git diff --check`, verificación de arranque/partida y una build nueva de
Electron antes de cambiar `JUGAR NEON VOID.cmd`. Las pruebas automáticas no
demuestran que el combate se sienta justo: pedir playtest humano concreto.
