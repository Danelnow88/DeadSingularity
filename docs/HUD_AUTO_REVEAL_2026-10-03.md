# HUD auto-ocultable — 03-10-2026

Estado: integrado y verificado. No queda implementación pendiente.

## Comportamiento

- Esenciales intactos: progreso/oleada, ENEMIGOS/BAJAS/FALTAN, JEFES,
  HP de boss y stamina de dash. El orden combo → boss → dash → armas se conserva.
- Cortina superior: combo y panel Canvas de armas/consumibles/hints;
  permanencia3s desde el trigger, apertura/cierre0.32s.
- Triggers: notificaciones existentes de arma y consumible, uso válido del
  especial, reactivación del botón HUD. Inicio/loadout/resume heredan esos caminos.
  Seleccionar otro consumible con click también notifica el cambio.
- Pausa congela timer y animación. Tienda/menú no consumen el timer.
- NO HUD oculta todo y limpia hitboxes; HUD revela al volver a activarlo.
- Hitboxes acompañan el desplazamiento y clip, conservando índices de grupos.
  Rectángulos fuera del viewport no seleccionan ni bloquean el disparo.
- Móvil: combo Canvas auto-oculto; boss/dash esenciales; chips DOM sin cambios.
- Cooldown noop, gameplay, balance, arena/cámara y audio no modificados por esta tarea.

## Archivos de esta tarea

`js/game.js`, `tests/hud_auto_reveal.js`, `tests/ui_foundation.js`,
`tools/verify_alpha.cjs`, `desktop/main.cjs`, `docs/UI_STATES.md`,
`README.md`, `docs/AI_START_HERE.md`, este informe y `JUGAR NEON VOID.cmd`.
Los cambios locales previos y entregas anteriores se conservaron. Sin commit/push.

## Validación

- Sintaxis del juego y contenedor Windows aprobada; `npm test`:165 suites/0 fallos.
- Nuevo test ejecuta timer y bloque de render con offsets reales de las capas;
  pausa, retrigger, cierre, hitboxes, modo móvil, guard y boss único protegidos.
- `ui_foundation` actualizado: el panel requiere desktop Y cortina abierta;
  la prueba anterior buscaba literalmente el guard sin animación.
- Edge headless real: inicio/resume, ocultación, rueda cambiando arma, especial,
  consumibles, pausa >3s, botón HUD/NO HUD y esenciales dibujándose sin cortina.
  Desktop1280x800, móviles emulados915x412 y844x390. Sin errores de runtime.
  No equivale a validación en teléfono físico.
- Paquete web repite esa prueba; EXE Windows valida arranque, almacenamiento,
  aislamiento Node, partida, cierre/reveal y pausa en perfil descartable.

Evidencias: `previews/hud-auto-reveal-2026-10-03/source-final/`,
`packaged-web/`, `desktop-qa.json` y `electron-hud-hidden.png`.

## Entrega y siguiente paso

Windows: `releases/NEON-VOID-0.10.0-alpha-windows-wvYvXn/`.
Web: `releases/NEON-VOID-0.10.0-alpha-web-bHKgiM/`.
`JUGAR NEON VOID.cmd` apunta al EXE verificado. Cerrar la instancia anterior.
Siguiente paso opcional: confirmar artísticamente la duración jugando;
para ajustar, modificar `HUD_REVEAL_SECONDS` en `js/game.js` y volver a validar.
