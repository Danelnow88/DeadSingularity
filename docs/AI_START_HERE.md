# NEON VOID — empezar con una IA

Proyecto: **NEON VOID**. Repositorio: **Danelnow88/JuegoDemo**; rama de producción: **`master`**. GitHub es la fuente de verdad del código publicado; para una tarea, comprueba también el checkout y sus cambios locales. Nunca des por actualizada una copia de un archivo pegada en una conversación anterior.

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
