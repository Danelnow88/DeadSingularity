# Lobby integrado — 03-10-2026

El usuario aprobó la maqueta y pidió integrarla. IMPLEMENTADO y entregado en
web/Windows. Sin commit/push ni descartes. Se preservan los cambios locales
existentes y contemporáneos de audio, spawn y demás sistemas.

Composición aprobada: panel de piloto/MEJORAS izquierda, preview/JUGAR centro,
Historia/Infinito derecha. CSS final `css/lobby-layout.css` acotada a startScreen,
cargada tras capas previas. El botón MEJORAS tiene el mismo ancho y alineación
que el panel, sin otro botón a su lado. VER TODOS abre la biblioteca desde el
panel; flechas seleccionan con la autoridad existente. Se mantienen perfiles,
habilidades, cuatro geometrías aprobadas y renderer real, sin sustituirlos por
el rombo estático de la maqueta. Ajustes en header; dificultad, manual e informe
en el centro. CONTINUAR sólo cuando hay checkpoint válido.

Las tarjetas usan NV.alpha.setMode y el flujo JUGAR existente. La ruta usa el
checkpoint real:10 encuentros nuevos o4 de ruta anterior, según guardado.
Puntos por hover/foco/touch actualizan jefe/sector/oleada reales. Miniatura CSS
con acento del jefe; no inventa Crios ni Sector Helado. El récord se etiqueta
GLOBAL porque el perfil actual no separa Historia/Infinito. No se modifican
economía, progreso, balance, arena, física, combate ni temporizaciones.

Responsive3→1 a980px, scroll vertical del overlay, tooltip reubicado en móvil.
Se corrigió la restricción heredada390px de acciones y se compactaron alturas
para1280×800 sin recorte de JUGAR/dificultad/manual. Maqueta original preservada.

Validación:

- Suite final `RESULT run_all: total=164 failed=0`; syntax/diff checks correctos.
- Edge real aislado:1440×900,1280×800, móviles emulados915×412 y844×390.
- Anchos idénticos panel/MEJORAS, Grid3/1, cero overflow horizontal y preview.
- Cuatro pilotos, biblioteca, mejoras/volver, ajustes/volver, ambos modos.
- Checkpoint fixture full-roster con3 jefes completados: tooltip GUARDIÁN,
  FUNDICIÓN, oleada8; CONTINUAR reanuda oleada7 con ROOK; pausa/continuar.
- JUGAR inicia Infinito y el run conserva mode=endless.
- Capturas fuente y paquete revisadas; errores JS vacíos. No teléfono físico.
- EXE REAL: --nv-qa --nv-lobby-qa, perfil descartable, pass/saved/lobby true,
  partida activa, errors[], exit0. No toca perfil del jugador.
-78 archivos JS/CSS/assets coinciden por SHA256 fuente/web/Windows; index
  empaquetado idéntico entre ambos (normalización3D habitual).

Evidencia: `previews/lobby-integration-2026-10-03/source-final`, `packaged-web`
y `desktop-qa.json`. Repetición: `verify_alpha.cjs BASE OUT --lobby-integrated`.
El QA compartido está en `desktop/lobby-qa.cjs`.

Entregas nuevas, anteriores conservadas:

- Web `releases/NEON-VOID-0.10.0-alpha-web-CjSELh`.
- Windows `releases/NEON-VOID-0.10.0-alpha-windows-YXD1IK`.
- `JUGAR NEON VOID.cmd` actualizado después de validar. Cerrar EXE viejo primero.

Archivos de esta tarea: index.html, css/lobby-layout.css (nuevo), js/ui/alpha.js,
desktop/lobby-qa.cjs (nuevo), desktop/main.cjs, tools/build_release.cjs,
tools/verify_alpha.cjs, JUGAR NEON VOID.cmd, README, AI_START_HERE, UI_STATES,
LOBBY_LAYOUT y este informe. No se tocaron los cuerpos de pilotos ni gameplay.
Implementación terminada; siguiente paso: feedback del usuario en la entrega.
