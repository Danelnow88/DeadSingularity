# NEON VOID — empezar con una IA

**Última continuidad local 02-10:** `PILOT_PRODUCTION_2026-10-02.md` prevalece
sobre los informes históricos de pilotos de abajo. El usuario aprobó los cuatro
contornos: BOTI woven, NOVA radial, ROOK peaks, ENJAMBRE asymmetric. Ya integrados
y verificados en Web/Windows; lanzador mh6vEs y web38UTJD. 160 suites sin fallos.
36 builds antiguas quitadas; conservar activa + respaldo. No repetir rediseño.
El usuario autorizó después publicar el estado actual en GitHub Pages; comprobar
remoto, excluir generados y validar el sitio tras el push.

Proyecto: **NEON VOID**. Repositorio: **Danelnow88/JuegoDemo**; rama de producción: **`master`**. GitHub es la fuente de verdad del código publicado; para una tarea, comprueba también el checkout y sus cambios locales. Nunca des por actualizada una copia de un archivo pegada en una conversación anterior.

**Estado local 30-09-2026:** alpha 0.10 todavía NO publicada; ver `ALPHA_RELEASE.md`.
Continuidad posterior al playtest: `PENDIENTES_REALES_2026-10-01.md` y
`DIFFICULTY_BOSSES_VISUAL_2026-10-01.md` prevalecen sobre diagnósticos históricos.
Hay una entrega Windows autocontenida y una web offline en `releases/`, además del
código fuente habitual. `JUGAR NEON VOID.cmd` abre la entrega Windows verificada.
Última pasada local: `ARENA_ADAPTATION_2026-10-02.md`: bosses en mundo, soporte,
láser integrado, densidad y X/puff. Continuación `DASH_TRAIL_2026-10-02.md`:
referencias recibidas, estela de cuatro pilotos completada; 157 suites sin fallos.
Continuación visual: SPECIAL_REMASTER_2026-10-02.md; Web vhwktw / Windows7a9PJk.
El usuario rechazó los cuerpos de pilotEnergy; se retiraron todos sus hooks.
Los cuerpos anteriores están restaurados y JUGAR NEON VOID.cmd apunta a7a9PJk;
158 suites sin fallos. Ver PILOT_ENERGY_REDESIGN_2026-10-02.md antes de continuar.
dev/pilot-concepts ahora compara el arte actual con MOVIMIENTO ESTABILIZADO,
reemplazando la propuesta anterior. Ver PILOT_STABILITY_LAB_2026-10-02.md:
renderer real reutilizado, controles por piloto, capturas A/B;75 archivos de
producción intactos. NO está aprobado para integrar. No reiniciar trabajo anterior.
Continuación: PILOT_CANONICAL_GEOMETRY_LAB_2026-10-02.md. El runtime recibido
fija BOTI en 1/.25/.5/.2/.75; NO restaurar sus antiguos defaults. Base canónica
inmutable y geometrías temporales independientes, exclusivamente en el MISMO lab.
No integrar estos contornos en gameplay sin una aprobación nueva del usuario.
Último cierre visual anterior: `PERIMETER_POLISH_2026-10-01.md` (margen28, nuevo borde,
full-bleed, web/Electron alineados). No confundir la entrega cósmica previa con ésta.
Editar fuentes NO actualiza un EXE ya empaquetado: tras una modificación futura,
volver a ejecutar las pruebas, generar una nueva entrega y actualizar el lanzador.
No sobrescribir builds verificadas ni confundir checkpoints de QA con partidas reales.

## Orden inicial recomendado

1. Leer [`README.md`](../README.md).
2. Leer este documento (`docs/AI_START_HERE.md`).
3. Leer [`AI_WORKFLOW.md`](AI_WORKFLOW.md).
4. Leer la documentación específica relevante.
5. Inspeccionar el código real involucrado.
6. Revisar `git status --short --branch` antes de editar.

## Dónde buscar

Juego estático HTML/CSS/JS sin build: `index.html` carga módulos que comparten `window.NV`. `js/core/` contiene capacidades, entrada, viewport y ajustes; `js/data/`, contenido y balance; `js/engine/`, sistemas de juego; `js/render/`, dibujo; `js/ui/`, interfaz y controles; `js/audio/`, sonido. `js/game.js` coordina estado y loop. `tests/` contiene pruebas Node; `dev/` ofrece herramientas locales y `previews/`, vistas de inspección (no asumir que todas pertenecen al despliegue).

## Reglas críticas

- Un solo gameplay para desktop y móvil: no duplicar estado, entidades ni lógica por plataforma.
- `js/core/viewport.js` es la autoridad de métricas: `ref*` para diseño, `view*` para vista y `arena*` para límites del mundo; no crear un segundo gestor.
- No cambiar balance sin solicitud explícita; audio y modos gráficos no deben alterar gameplay. Las pruebas headless no sustituyen una verificación visual real.
- Consulta los contratos completos antes de tocar sistemas: [Arquitectura](ARCHITECTURE.md), [Arquitectura móvil](MOBILE_ARCHITECTURE.md), [Estados UI](UI_STATES.md) y [Workflow para agentes](AI_WORKFLOW.md).

## Git y documentación

Preserva cambios locales existentes: no borres ni restaures archivos sin autorización. No hagas commit ni push salvo pedido explícito; usa staging selectivo, nunca `git add .` a ciegas, force push ni reset destructivo. Sigue [Testing](TESTING.md) y [Deployment](DEPLOYMENT.md) al validar o publicar.

Si un cambio altera arquitectura, flujo de trabajo, comportamiento documentado, baseline de pruebas o despliegue, actualiza también la documentación correspondiente.

## Cómo empezar una tarea nueva

- [ ] Identificar objetivo, alcance y restricciones del pedido.
- [ ] Leer `README.md`, esta guía y `AI_WORKFLOW.md`.
- [ ] Consultar la documentación pertinente (arquitectura, móvil/UI, pruebas o despliegue).
- [ ] Inspeccionar los módulos y tests reales afectados.
- [ ] Revisar `git status --short --branch` y distinguir cambios previos propios o ajenos.
- [ ] Planear el cambio mínimo sin descartar trabajo local.
- [ ] Validar con pruebas dirigidas, suite y `git diff --check` cuando corresponda.
- [ ] Revisar el diff y comunicar cambios, límites y resultados antes de publicar.

## Fuente de verdad

Para el comportamiento implementado, **código actual > documentación** si difieren. Informa la discrepancia y corrige la documentación pertinente; no sustituyas una comprobación del repositorio actual por texto pegado o recuerdos de otra conversación.
