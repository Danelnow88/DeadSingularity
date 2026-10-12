# Eventos dimensionales — 2026-10-10

Actualización 2026-10-11: el evento temporal de prueba ahora es Cámara de
Inercia, con suspensión de disparos y objetivo de tres fragmentos. Su mecánica,
validación y siguiente paso están en `INERTIA_CHAMBER_2026-10-11.md`; las
recomendaciones de duración y promoción del prototipo de abajo son históricas.

## Decisión e integración

No hay tercer modo. Historia e Infinito comparten un catálogo de eventos;
Historia no queda excluida de las mecánicas que se desarrollen para Infinito.
Los eventos nuevos pasan primero por prueba opt-in del recorrido real.
La campaña normal mantiene su selección, peligros, economía y dificultad.
No se habilitó el Museo aleatoriamente en partidas con guardado.

Desde el lobby: **PROBAR EVENTOS DIMENSIONALES**, elegir Historia o Infinito
y JUGAR. La sesión muestra PRUEBA SIN GUARDAR y puede volver al juego normal.
El botón conserva modo y piloto elegidos; también se pueden cambiar en el lobby de prueba.
URL directa: `http://127.0.0.1:8091/index.html?dimensionEvents=preview`.
Para Infinito: añadir `&eventMode=endless`. No es necesario `fresh=1`: el propio
flag congela progreso, permanentes y checkpoint. Tutorial no escribe en esta sesión.

Oleada 1: universo 1 estándar → universo 2 Museo → universos 3 y 4 estándar →
tienda original. Son enemigos/densidad/director reales, no el tanque único del
laboratorio. Armas, especiales, consumibles y compras siguen disponibles.
También aparece en el segundo campo de oleadas de evento elegibles (%3), nunca
en oleadas de jefe. El menú de preparación ofrece Museo sólo en la prueba y en
una siguiente oleada válida. No existe un sistema de loot especial nuevo.

## Arquitectura

`js/engine/dimensionEvents.js` es el catálogo/política pura compartida. Cada
entrada identifica `kind`, `stage`, `scope`, `adapter`, `rule` y exclusividad.
Los IDs legacy se conservan para guardados, enemigos, audio y hazards existentes.

| Evento | Adaptador conservado | Estado |
| --- | --- | --- |
| Niebla | overlay existente | estable |
| Minas parlantes / speakers | hazards independientes existentes | estable |
| Ronda de élites | composición/spawns existentes | estable |
| Día de pago | drops existentes | estable |
| Fundición, Fractura, Corazón | peligros de sector existentes | estable |
| Museo del Tiempo | reloj compartido de combate | sólo prueba |

Clima es un tipo de evento, no el nombre de toda la categoría. Las minas
parlantes NO son un segundo campo de minas del módulo weather antiguo: no se
activa ese módulo latente ni se duplican daños/spawns. Los sectores conservan
su whitelist de compatibilidad con bosses en su adaptador original.

`createSession(config, NV.DimensionRules)` construye un plan de cuatro campos.
`enter(depth)` resetea reloj/acumuladores y devuelve el ID a usar por los adapters.
`sample(dt,intent,safety)` devuelve tiempo de control y combate; `isTemporal()`
es O(1), sin snapshot/arrays por frame. `snapshot()` es una copia para diagnóstico.
La selección legacy sólo ve IDs estables: agregar un evento preview al catálogo
o restaurar un ID desde un checkpoint no lo habilita silenciosamente.

El adapter de game.js activa Museo al entrar al segundo campo y lo desactiva al
salir. No modifica el bloque draw, assets de agujeros negros, modelos, radio ni
los tiempos de apertura/tránsito/llegada. La regla temporal pura existente se
reutiliza desde `js/experiments/dimensionRules.js`; no se duplica su implementación.

## Contrato temporal y seguridad

- Movimiento/control del jugador: tiempo normal. Combate quieto: escala hasta 0,08;
  al moverse vuelve suavemente a 1. Dash, stun, hook, posesión forzada y transición
  de portal fuerzan 1 para no prolongar un bloqueo injusto.
- Enemigos, proyectiles, director, timer de oleada, cooldowns, regeneración, buffs,
  peligros, meteoros, drones, quemaduras y aura: tiempo de combate.
- Consumibles con impacto diferido y su VFX comparten ese tiempo. BOTI en Museo
  cura 1 HP/5 segundos simulados, no por frames. Dash conserva distancia original
  pero recarga por tiempo de combate. Colisión de proyectiles usa barrido relativo.
- La duración base y el refill base NO reciben la compensación legacy de clima.
  El HUD y el timer consultan la duración correcta del campo actual.
- Pausa/hitstop no avanzan el reloj; al volver al lobby se descarta la sesión.
- Durante Museo no se superponen minas/niebla/élites extra/sector hazards: se
  reemplaza el ID ambiental, manteniendo la presión normal y las amenazas enemigas.
- Música, cámara y presentación general no se reescriben. No se promete replay
  determinista ni simulación a timestep fijo. Se conserva el clamp del motor.

## Evolución sin estropear la base

Para añadir un evento: definir ID, objetivo/decisión principal, regla, adaptador,
presupuesto de peligros y compatibilidades; añadirlo como `stage:'preview'`.
Registrar pruebas de entrada/salida, pausa, derrota, victoria, tienda, reset,
consumibles/especiales y no escritura de progreso. Probar en ambos caminos antes
de definir su frecuencia estable. El catálogo no admite cargar código externo.

No se eliminó ningún legacy en esta etapa. Recomendación de revisión posterior:
mantener minas parlantes como referencia de peligro físico; transformar Día de
pago en elección con riesgo y rondas de élites en roles/composición. Revisar
niebla antes de sustituirla, sin mezclar ese balance con la validación temporal.
Las nuevas temáticas deben cambiar decisiones, no ser sólo una paleta o texto.
Persecución sigue en el laboratorio anterior: no se activó dentro de estas runs.

Siguiente paso exacto: probar manualmente el Museo con los cuatro pilotos en el
recorrido real, ajustar el mínimo temporal/duración sólo si esas pruebas lo
requieren, y luego definir su frecuencia compartida en Historia/Infinito antes
de promoverlo a `stable`. Después desarrollar un segundo evento sistémico.
Cambiar sólo `stage` no activa Museo en la campaña: también debe aprobarse y
actualizarse la política de selección de campos, hoy restringida a preview.

## Validación y recuperación

Base previa: 199 archivos de tests, cero fallos. Nueva suite incorpora
`tests/dimension_events.js`; no se relajaron las aserciones del laboratorio.
`tests/dimension_portal_preservation.js` sigue comprobando el renderer completo.

Comandos: `npm run quality`, `npm run qa:dimension-events`,
`npm run qa:dimension-events -- --endless --mobile`,
`npm run qa:dimension-lab`, `electron tools/qa-dimensions.cjs --normal`.
QA usa perfiles Electron temporales, no representa un teléfono físico.
Reportes/capturas en `local/validation/dimension-events/`.
Respaldo previo en `local/backups/dimension-events-20261010/` (incluye trabajo
local previo, no únicamente Git). Sin commit, push ni publicación.

Resultado de cierre: `npm run quality` pasó los 200 archivos de tests, cero
fallos. Historia de escritorio con Rook e Infinito con controles móviles/BOTI
pasaron entrada desde lobby, selección conservada, escala temporal, especial,
pausa, cuatro campos, tres portales y tienda final. En ambos hubo hasta diez
hostiles por campo y los cuatro guardados sembrados permanecieron idénticos.
El recorrido normal sin preview también llegó a la tienda con su stock intacto.
El renderer completo y los bytes de blackHoles.js siguen iguales.
La captura offscreen de Electron puede pedir un reintento de compositor;
QA admite hasta cinco intentos, no omite capturas ni aserciones funcionales.
