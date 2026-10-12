# Laboratorio dimensional — 2026-10-10

Implementado únicamente como experimento opt-in. La campaña conserva oleadas,
economía, objetivos, dificultad y guardados. Sin commit, push ni publicación.

Etapa siguiente terminada: Museo también puede probarse en el recorrido real de
Historia/Infinito desde el lobby, bajo Eventos dimensionales y sin guardar.
Ver `docs/DIMENSION_EVENTS_2026-10-10.md`. Los enlaces y el bridge de laboratorio
de este documento siguen disponibles para diagnósticos aislados.

## Probar

Desde DeadSingularity V1: `npm run serve`. Abrir:

- `http://127.0.0.1:8091/index.html?combatLab=1&dimensionExperiment=museum-time&fresh=1`
- `http://127.0.0.1:8091/index.html?dimensionLab=traversal&fresh=1`
- `http://127.0.0.1:8091/index.html?dimensionLab=pursuit&fresh=1`

Museo: Rook, pistola y un tanque visible. Quieto desacelera el combate hasta
0,08; caminar lo acelera. Dash/stun fuerzan velocidad normal. Eliminar al tanque
completa el ensayo. Especiales y consumibles están deshabilitados deliberadamente.
La recarga de dash, disparo y regeneración comparten tiempo de combate.

`traversal`: cuatro campos estándar → Museo → estándar → estándar. Eliminar el
tanque abre el portal normal. No hay tienda ni recompensas reales al finalizar.

`pursuit`: el primer tanque custodia y no ejecuta IA hasta provocarlo. Para probar
la huida de forma controlada, usar en la consola del navegador:

```js
NV.dimensionLabRuntime.provoke();
NV.dimensionLabRuntime.completeObjective();
```

Entrar caminando al portal. En el siguiente campo aparece la misma identidad,
con la misma vida, tras una espera y la llegada de enemigo existente. Puede
seguir dos cruces; no se cura, duplica ni entrega drops. Para forzar el siguiente
escape de prueba, llamar nuevamente `completeObjective()` y entrar al portal.
Este bridge sustituye el futuro botín custodiado: NO se integró un componente
económico ni una persecución en campaña.

Bridge: `start('museum-time'|'traversal'|'pursuit', 'rook'|'boti')`, `restart()`,
`reset()`, `pause()`, `resume()`, `provoke(uid?)`, `completeObjective()`, `snapshot()`.
No expone referencias mutables a enemigos. Progresión/meta/checkpoint y tutorial
no se escriben. Persistencia del perseguidor es sólo entre campos en memoria.

## Arquitectura y límites

`js/experiments/dimensionRules.js`: fábricas puras de reloj y sesión; standard
es identidad. `pursuit.js`: máquina de estados, descriptor y ubicación acotada.
El adaptador en game.js conserva orden del motor; director y eventos aleatorios
se excluyen del ensayo. El Combat Lab anterior sigue funcionando.

Colisión experimental usa desplazamiento relativo de jugador/proyectil.
BOTI recibe 1 HP/5 segundos simulados en vez de regeneración por frames.
Clocks no modifican RAF ni el clamp de 30 ms. Sin replay determinista completo:
el combate nativo sigue usando Math.random. Geometría toroidal NO habilitada.
No añadir armas/habilidades a la whitelist sin auditar timers y dt=0.

Portales: renderer, modelos, bloque completo draw y tiempos existentes intactos.
SHA256 blackHoles.js: 07919233a57a7ec2608363f1b80a7d66bf79db9a520120062a0ad96f04ba4f50.
La llegada pertenece al enemigo, no modifica el portal. Comparación automática
en tests/dimension_portal_preservation.js; respaldo en
local/backups/dimension-experiment-20261010/.

## Validación y continuidad

`npm run quality`, `npm run qa:dimension-lab` y
`npm run qa:dimension-lab -- --mobile`. QA usa perfil Electron temporal y no
representa una prueba en teléfono físico. Reportes/capturas en
local/validation/dimension-lab/; la pasada mobile comparte destino de capturas.
Durante la observación de cruces, QA desactiva disparo sólo en su ventana temporal
para no matar al sujeto antes de transferirlo; el juego mantiene autodisparo nativo.
El QA histórico de dimensiones esperaba la tienda compacta anterior: se actualizó
su expectativa a las cuatro mejoras restauradas + pasivo, seis slots y dock visible.
No se modificó la tienda ni su balance como parte de esta implementación.

Resultado de cierre: `npm run quality` pasó 199 archivos de tests sin fallos;
el recorrido de campaña pasó los tres portales, pausa y tienda final. QA Electron
validó Museo, los cuatro campos y los dos traslados del perseguidor, sin premios
ni cambios en los guardados. El observador reinicia después de desactivar disparo
para eliminar proyectiles anteriores a la medición de vida conservada.

Terminado: reloj aislado, regeneración/recarga, barrido relativo, cruces originales,
perseguidor con límites y llegada validada, APIs de reset/pausa, exclusión de premios.
Siguiente paso de diseño: reemplazar el objetivo de composición del Museo por
fragmentos temporales y la provocación del bridge por un objeto custodiado real,
manteniendo la campaña desactivada hasta validar esas interacciones.
