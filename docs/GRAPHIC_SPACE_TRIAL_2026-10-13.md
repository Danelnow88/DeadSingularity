# Espacio gráfico en movimiento — 13/10/2026

Primera prueba de un lenguaje común para los ocho escenarios. No redefine la
paleta de personajes/enemigos, variantes, combate, límites ni guardados.

## Qué cambia

- Fondo no fotográfico creado con código. Un solo campo de ruido suave 128×128
  (64 KiB), generado y subido una vez, compartido entre todos los escenarios.
- Masas amplias de color contenido, bandas suaves y siluetas de cuerpos/rings.
  Cada ID conserva una identidad: arco, espiral, corrientes, creciente, luna,
  filamentos minerales, bóveda azul y planeta anillado, respectivamente.
- Sensación común de avance con 160 estrellas a tres profundidades. El reloj
  visual gobierna el avance, no el número de frames; no desplaza al jugador.
- Polvo próximo delante/detrás y 16 estelas máximas por movimiento/dash.
  Texturas pequeñas horneadas una vez al cambiar de escenario; no filtros,
  generación de ruido por frame, readback GPU→CPU ni fotos en esta ruta.
- Arena, contorno exterior, colisiones, portales y HUD conservados. La prueba
  de preservación mantiene el hash de render ajeno a los hooks autorizados.
- Pausa congela movimiento; Reducir destellos congela el flujo principal.
  Fallo/pérdida WebGL vuelve a una composición gráfica Canvas cacheada y mantiene
  avance de estrellas. No requiere las fotografías para ese fallback.

## Comparar

En Ajustes → Gráficos, `Espacio gráfico en movimiento` está activado por defecto
en esta prueba. Desactivar recupera el arte ilustrado anterior, incluyendo la
Fundición animada conservada. La elección persiste y Restaurar gráficos vuelve
al default. No se borraron assets ni la implementación de Fundición anterior.

La galería de ilustraciones preexistente conserva sus imágenes originales;
para valorar el lenguaje nuevo usar la partida, no una foto estática.

## Comprobaciones

`tools/qa-space-environment.cjs`: ocho escenarios reales en Electron, una sola
subida GPU, pausa, toggle/persistencia, alineación móvil y pérdida de contexto.
Capturas e informe: `local/validation/graphic-space`.
`tests/space_environment.js`: ocho IDs, fallo sin reintentos, memoria acotada,
ausencia de fotografías/readback y movimiento independiente de FPS.

El harness admite `--graphic-space` / `--illustrated-space`, `--sky-index=0..7`.
Comparar igual resolución, densidad y full fijo, sin otros tests/benchmarks.
No anunciar FPS estables 120–165 sin evidencia. La aprobación estética es humana:
es una prueba reversible, no el reset definitivo de toda la estética del juego.

No hay buffs, camuflaje, nuevos daños ni cambio de velocidad. No commit/push.

## Medición visible inicial

Dos pares de 15 s en orden invertido, 1920×1080, 24 enemigos durables, full,
misma escena Umbral y fotos efectivamente cargadas en el control:
- `illustrated-actual-a` / `illustrated-actual-b`: 109,72 / 110,52 FPS.
- `graphic-actual-a` / `graphic-actual-b`: 116,10 / 115,45 FPS.
- p95 ~12,2 ms en todas: no se demuestra eliminación de saltos ni 120–165 FPS.

Las corridas `*-space-a/b` anteriores usaban el fallback procedural legacy como
control, no fotografías: no sirven para afirmar ganancia sobre el arte ilustrado.
Se agregó una aserción de `artReady` para evitar ese falso baseline. La comparación
es limitada y depende del equipo/carga; faltan partidas humanas y otros dispositivos.

## Entrega de la prueba

- 219 suites, cero fallos; QA gráfico PC/móvil y los ocho modos GPU aprobados.
- Web: `releases/DeadSingularity-V1-web-yVHmfH`.
- Electron: `releases/DeadSingularity-V1-desktop-NIiKh6/win-unpacked/DeadSingularity.exe`.
- Android: 141 recursos sincronizados; APK no compilado.
- `ABRIR_V1.cmd` carga el código actual. Cerrar/reabrir para cargar la prueba.

La galería conservada se rotula ahora como arte ilustrado para no presentarla
como captura del modo procedural. Assets previos y Fundición viva intactos.
