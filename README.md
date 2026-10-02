# NEON VOID

Última entrega local (02-10): **cuatro formas de pilotos aprobadas e integradas**
en Web y Electron, 160 suites sin fallos y limpieza de builds duplicadas.
Abrí `JUGAR NEON VOID.cmd` (cerrá una instancia vieja antes).
[Entrega, pruebas, respaldo y publicación pendiente](docs/PILOT_PRODUCTION_2026-10-02.md).
Los informes visuales anteriores describen pasos históricos, no esta entrega.

## Alpha 0.10 — 30 de septiembre de 2026

Historia de 20 oleadas con diez jefes distintos (asalto/jefe alternados) y modo infinito. Los guardados anteriores conservan su ruta de cuatro jefes. Incluye preparación
entre oleadas, contratos, evoluciones de armas, guardado para continuar, récords
locales y controles de comodidad. [Cambios, pruebas y pendientes](docs/ALPHA_RELEASE.md).

Para jugar, abrí `JUGAR NEON VOID.cmd` en esta carpeta, o `index.html` con Edge/Chrome.
La entrega Windows también se puede abrir desde su `NEON VOID.exe` dentro de `releases`.
Conservá toda la carpeta de la entrega; el EXE necesita sus archivos acompañantes.
No hace falta instalar Node ni conectarse a Internet para jugar.

Pasada local del02-10: bosses recorren la arena con soporte gradual, láseres
compatibles alternados con ataques, mayor densidad y spawn con X roja/puff.
[Informe y continuidad](docs/ARENA_ADAPTATION_2026-10-02.md):157 suites sin fallos.
Los cuatro pilotos ahora dejan una estela estelar únicamente durante el dash,
sin cambiar su física. [Referencias, pruebas y entregas](docs/DASH_TRAIL_2026-10-02.md).

El rediseño corporal posterior fue rechazado y retirado: los cuatro pilotos
conservan su aspecto anterior. Web y el lanzador Windows vuelven a esa base;
158 suites sin fallos. [Recuperación y nueva comparación visual separada](docs/PILOT_ENERGY_REDESIGN_2026-10-02.md).

La comparación ahora estudia el **mismo arte con movimiento estabilizado**, sin
cambiar el juego. Abrí `dev/pilot-concepts/index.html` con Edge/Chrome; ofrece
controles por piloto y capturas A/B. [Informe y mediciones](docs/PILOT_STABILITY_LAB_2026-10-02.md).

El mismo laboratorio ahora conserva tu configuración exacta como **base canónica
protegida**. Elegí un piloto y «Forma base» para probar siluetas sin cambiar su
animación; «Duplicar preset» habilita sliders únicamente en una copia.
[Preset, pruebas y separación geométrica](docs/PILOT_CANONICAL_GEOMETRY_LAB_2026-10-02.md).

En la tienda, «Preparar oleada» abre las ayudas opcionales. «Desplegar» sigue
abajo a la derecha. «Guardar y salir» conserva el último checkpoint; si abrís
`ABRIR_JUEGO_FRESH.bat`, ese modo de prueba no guarda y el botón dice «Salir sin guardar».

El navegador y la app Windows tienen guardados separados. En **RÉCORDS / INFORME**
podés exportar e importar permanentes, récords y checkpoint para trasladarlos.
Exportá antes de importar si querés conservar el progreso del destino.

Para desarrollar/compilar Windows: Node **22.12 o superior**, `npm ci`,
`npm run runtime:install`, `npm test`, `npm run build:windows`.
`npm run build:web` genera una carpeta web offline. Cada build usa un destino nuevo.

La alpha no está publicada ni aprobada en Steam. No contiene pagos ni telemetría remota.

Roguelite arcade de supervivencia con estética synthwave/neón. El juego comparte una única implementación de gameplay entre desktop y móvil; la presentación, el viewport y la entrada se adaptan por capacidad y orientación.

## Tecnología

- HTML5, CSS y JavaScript sin framework ni proceso de build.
- Canvas2D para gameplay y render principal.
- Web Audio API para música procedural y efectos.
- Three.js 0.160.0 sólo para el overlay experimental `?legacy3d=1`; no se solicita por defecto ni se incluye su arranque en las entregas offline.
- Pruebas headless con Node.js.

## Ejecutar localmente

Requisito: Node.js.

```bash
node tools/serve.js
```

Abrir `http://localhost:8080/`. También puede abrirse `index.html` directamente, pero el servidor local reproduce mejor el entorno de GitHub Pages y permite probar desde otros dispositivos de la red.

## URLs importantes

- Producción: <https://danelnow88.github.io/JuegoDemo/>
- Repositorio: <https://github.com/Danelnow88/JuegoDemo.git>
- Fallback móvil legacy para depuración: `?dynamicView=0`
- Alias de compatibilidad: `?dynamicView=1` (ya no es necesario)

## Arquitectura resumida

- Los módulos IIFE publican APIs compartidas en `window.NV`.
- `js/core/viewport.js` es la única fuente de métricas de referencia, vista y arena.
- `js/game.js` coordina estado, loop, gameplay compartido y transiciones UI.
- `js/engine/` contiene sistemas de gameplay; `js/render/` contiene renderers; `js/data/` contiene definiciones de contenido y balance.
- `NV.applyPlayerDamage` es la autoridad de daño al jugador; `NV.getHostileBudget` deriva el presupuesto vivo con topes de 30 hostiles y 7 heavy, boss incluido.
- Proyectiles hostiles: el cuerpo ROJO (`#ff3b4f`) comunica daño, un acento AMARILLO secundario (`#ffd84a`) indica que puede aturdir y la FORMA comunica la familia de origen/ataque (`projectileStyle`); todo se resuelve en `NV.drawHostileProjectile` sin lookup de enemigos.
- Teclado y controles táctiles escriben en la misma abstracción lógica `NV.input`.
- El lobby, Game Over y Settings usan DOM compartido con presentación responsive.
- `js/core/settings.js` centraliza calidad visual y persistencia sin alterar gameplay.

Detalles: [Arquitectura](docs/ARCHITECTURE.md).

Los cuatro escenarios de la expedición conservan sus cambios en oleadas 1, 6,
11 y 16. Ahora son regiones cósmicas distintas, sin cuadrícula: nebulosa/luna,
forja estelar, fractura espacial y singularidad. Hitos y polvo quedan anclados
al mundo para hacer perceptible la cámara. Arte Canvas2D cacheado, sin nuevas
dependencias ni cambios de combate. [Informe de escenarios](docs/COSMIC_SCENARIOS_2026-10-01.md).

## Comportamiento móvil

- **Desktop:** referencia/vista `900x520`, arena `1350x780`; cámara sigue con 28 unidades de exterior visual, sin cambiar paredes físicas.
- **Móvil landscape:** Dynamic World View y Dynamic Arena automáticos. Altura visible `520`, ancho según canvas físico; arena `1.5×` vista en ambos ejes, sin stretch. El campo ya no está limitado por la pantalla.
- **Móvil portrait:** se conserva el overlay de orientación y el comportamiento legacy de métricas.
- `?dynamicView=0` fuerza temporalmente contain `900x520` en móvil landscape para diagnóstico.
- El HUD móvil usa datos DOM arriba, menú único arriba-derecha y selectores de arma/item abajo-centro; el panel Canvas redundante se conserva solo en desktop.

## Ajustes gráficos

El panel compartido **Ajustes** ofrece calidad `Auto`, `Alta` y `Rendimiento`, además de toggles para partículas y VFX intensos de élites. El valor por defecto es **Alta**, equivalente a la calidad visual previa. Los modos alternativos solo reducen coste visual secundario; no cambian enemigos, daño, vida, spawns ni dificultad.

La familia visual élite `RB6 / Entidad Hidra` dispone de un presupuesto LOD estable por proximidad al jugador en `Auto` y `Rendimiento`. Todas las entidades siguen visibles y funcionales.

- **Lenguaje de color hostil:** el peligro entrante usa una familia roja consistente — `#ff6474` (warning/telegrafía), `#ff3b4f` (amenaza activa) y `#ffffff` (impacto). Es solo presentación: no afecta daño, timings ni dificultad.

Contrato completo: [Arquitectura móvil](docs/MOBILE_ARCHITECTURE.md) y [Estados UI](docs/UI_STATES.md).

## Pruebas

```bash
node --check js/core/viewport.js
node --check js/game.js
node tests/mobile_compat.js
node tests/world_metrics_noop.js
node tests/dynamic_viewport.js
node tests/dynamic_arena.js
npm test
```

Baseline local de perímetro, 1 de octubre de 2026: 154 suites; cero fallos. Incluye
19 casos específicos de cámara/arena y 9 de perímetro, además del plan previo. Pruebas y cierre
de empaquetado: [Testing](docs/TESTING.md). Arquitectura, riesgos y archivos:
[Camera foundation](docs/CAMERA_FOUNDATION_2026-10-01.md).
Pulido y sincronización web/Windows: [Perímetro](docs/PERIMETER_POLISH_2026-10-01.md).

## Despliegue

GitHub Pages publica la rama `master`. El flujo normal es validar, hacer staging selectivo, crear un commit nuevo y ejecutar `git push origin master`; nunca se usa force push para un deploy normal.

Procedimiento completo: [Deployment](docs/DEPLOYMENT.md).

## Documentación

- [Punto de entrada para agentes de IA](docs/AI_START_HERE.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Arquitectura móvil](docs/MOBILE_ARCHITECTURE.md)
- [Estados UI](docs/UI_STATES.md)
- [Workflow para agentes de IA](docs/AI_WORKFLOW.md)
- [Testing](docs/TESTING.md)
- [Deployment](docs/DEPLOYMENT.md)

## Referencias de herramientas visuales

Los iconos de consumibles se renderizan mediante `js/render/consumableIcons.js` y la API `NV.drawConsumableIcon`. La comprobación visual integrada está en `previews/consumable-icons-integration-preview.html`.

## Limitaciones conocidas

- Una arena móvil más ancha puede reducir la dificultad efectiva y la densidad aparente de spawns.
- Los patrones de jefes usan mayormente amplitudes absolutas en unidades de mundo.
- La distribución de pickups y meteoritos puede sentirse distinta en arenas anchas.
- La suite completa actual no registra fallos; cualquier fallo posterior debe investigarse como posible regresión.
