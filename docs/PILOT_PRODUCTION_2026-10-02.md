# Pilotos aprobados — integración local y limpieza

## Estado entregado

El usuario aprobó `C:/Users/party/Desktop/neon-void-pilotos-a-f19488.png`.
BOTI: radial entrelazada (`woven`). NOVA: radial puntiaguda (`radial`).
ROOK: picos largos y cortos (`peaks`). ENJAMBRE: angular asimétrica (`asymmetric`).
Se conservan ojos, colores, gotas, anillos, habilidades y la configuración exacta
del runtime capturado. No se modificó daño, hitboxes, movimiento ni progresión.
La apariencia ahora se aplica al renderer real, también a las vistas del lobby
que lo reutilizan; no es un overlay ni un laboratorio dentro del juego.

## Arquitectura y pruebas

- `js/data/pilotAnimationBaseline.js`: base canónica protegida compartida.
- `js/render/pilotGeometry.js`: una sola definición de las formas aprobadas.
- `js/render/pilotAppearance.js`: adaptación directa de vértices Canvas,
  caché acotada por piloto/capa, sin Proxy ni cambios a Math.random.
- `js/render/player.js`: integra la apariencia manteniendo efectos y presentación.
- El laboratorio conserva el renderer nativo de diagnóstico y sus copias privadas;
  ya no duplica definiciones geométricas ni el baseline de animación.
- `tests/fixtures/pilot-native-renderer-2026-10-02.js` conserva la fuente original
  y su hash histórico; no se cambió ese hash para aprobar el renderer nuevo.
- `tests/fixtures/pilot-approved-commands.json` se capturó ANTES de integrar:
  32 streams completos Canvas, cuatro pilotos y ocho frames (incluido fraccional).
- `tests/pilot_production_appearance.js` compara comandos, estilos y coordenadas
  con tolerancia 1e-9; exige stack equilibrado, estado intacto y RNG sin consumir.
- 160 suites sin fallos, syntax checks y `git diff --check` sin errores.
- Web fuente, web empaquetada y Electron: cuatro partidas con movimiento y especial,
  atlas de cuerpo normal/tamaño de combate/especial, cero errores de consola.
- Benchmark aislado de los cuatro cuerpos: mediana 0,10 ms; p95 Web 0,30 ms y
  Electron 0,20 ms (200 muestras; no equivale al FPS global de una partida).
- Los atlas Web fuente/offline son idénticos por SHA256. Electron usa otro Chromium:
  el PNG no es idéntico byte a byte; la inspección visual confirma las mismas formas,
  colores y detalles, además de compartir exactamente las fuentes empaquetadas.

## Cómo probar

Cerrar una instancia vieja antes de abrir `JUGAR NEON VOID.cmd`.
Ese lanzador apunta a `releases/NEON-VOID-0.10.0-alpha-windows-mh6vEs/NEON VOID.exe`.
Web local: `index.html` / servidor habitual.
Web offline: `releases/NEON-VOID-0.10.0-alpha-web-38UTJD/index.html`.
Evidencia local: `previews/pilot-production-2026-10-02/`.
Comprobar los cuatro pilotos en lobby/partida y durante la especial.
La silueta más puntiaguda es sólo arte: el radio de colisión sigue intacto.

## Limpieza realizada

Se quitaron 36 builds antiguas generadas, 7.262.584.856 bytes (6,76 GiB).
Antes se verificaron rutas hijas directas de releases, ausencia de enlaces y
correspondencia de archivos con manifests. Una build incompleta sólo tenía seis
binarios de Electron: se verificaron por hash contra el runtime instalado.
Inventario: `PILOT_CLEANUP_INVENTORY_2026-10-02.json`.
Script fechado de esta operación: `tools/cleanup-pilot-releases-2026-10-02.ps1`;
sin `-Execute` sólo diagnostica. NO reutilizar como política automática futura.

Se conservan nueva Web/Windows y el par anterior vhwktw/7a9PJk como respaldo.
No se tocó código, referencias, documentación, partidas, node_modules ni .git.
Eliminación directa de builds redundantes: no fueron enviadas a la papelera;
se pueden volver a generar desde fuentes, no recuperar como carpetas borradas.
El proyecto mide ahora aproximadamente 2,45 GiB (2,63 GB decimales).
`previews/` y `releases/` quedan ignorados para no filtrar capturas/builds a Git;
las páginas de preview que ya estaban versionadas siguen conservadas.
En siguientes entregas: verificar primero y conservar sólo activa + respaldo.

## Publicación autorizada

Tras la entrega local, el usuario autorizó publicar todo el estado actual.
Revisar estado/diff y seleccionar únicamente fuentes necesarias:
existen numerosos cambios locales previos de otras tareas que deben preservarse.
Nunca `git add .`, ni incluir releases, node_modules, capturas, perfiles o reportes.
Destino solicitado: https://danelnow88.github.io/JuegoDemo/.
Verificar configuración real de Pages y despliegue; no dar por actualizado el
sitio por el mero hecho de ejecutar push. No rehacer la integración ya terminada.
