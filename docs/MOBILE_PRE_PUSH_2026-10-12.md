# Revisión móvil previa al push — 12/10/2026

## Comprobaciones

- Calidad completa: 216 archivos de pruebas, cero fallos; sintaxis, catálogo,
  manifiesto y exclusiones de repositorio verificados.
- Táctil real emulado mediante Chromium: 915x412, 800x360, 844x390, 740x360,
  640x320, 568x320 y 1280x573; caso adicional de safe areas laterales y abajo.
  Movimiento analógico, multitouch, arma, consumible, especial, uso y pausa.
- Orientación: inicio vertical 390x844 muestra la petición de rotación, no
  ejecuta el fondo detrás del gate; giro a horizontal y regreso sin recargar.
- Edge/CDP: 51 comprobaciones (17 pantallas por cada tamaño 568x320, 844x390,
  1280x573): lobby, pilotos, permanentes, audio/controles/gráficos, ayuda,
  récords, combate, menú de sistema, estadísticas, tienda y sus tres pestañas,
  preparación y final de partida. Sin controles inaccesibles ni desbordamiento
  horizontal en esos casos. Capturas inspeccionadas adicionalmente.

La prueba usa un perfil temporal y fixtures sólo en la respuesta HTTP local;
no incorpora hooks al juego ni modifica el progreso del usuario. Para tienda
y fin se invocan las funciones originales mediante esa instrumentación de QA.
No se prueba una partida completa hasta el jefe final ni un móvil físico.

## Ajustes de presentación

- Hasta 740px de ancho horizontal, la tienda usa las pestañas táctiles existentes
  y una sección completa por vez, en vez de apretar tres columnas. Ofertas
  legibles, scroll vertical de contenido y botones de salida/despliegue siempre
  accesibles. Las vistas móviles anchas y escritorio conservan su distribución.
- Tutorial móvil separado de la vida y del equipo táctil.
- Permanentes y fin de partida no usan un transform que saque la pantalla
  completa del viewport móvil. No cambia daño, movimiento, economía o balance.
- Recursos CSS versionados nuevamente para evitar mezclar estilos en caché.

## Reproducción y evidencia

`node tools/qa-lobby-runner.cjs --mobile-hud` valida los tamaños, safe areas y giro.
Con Node 22+ y Edge instalado:
`node tools/qa-shop-layout-edge.cjs --mobile-screens` ejecuta la revisión de pantallas.
En Node antiguo se puede ejecutar ese script con el Node incluido en Electron
y `ELECTRON_RUN_AS_NODE=1`, sin lanzar una ventana del juego.

El nuevo diagnóstico nativo de pantallas no pudo arrancar en este entorno;
la revisión equivalente se completó en Edge. La validación táctil original
de Electron sí pasó; no se atribuye ese fallo al juego sin más evidencia.

Informes/capturas locales (no publicados): local/validation/mobile-screens/,
local/validation/mobile-ergonomics/, local/validation/mobile-push-quality.log.
Entregas actualizadas: web releases/DeadSingularity-V1-web-T9yTbp;
Electron releases/DeadSingularity-V1-desktop-Z5LrgH/win-unpacked;
Android assets sincronizados (no APK compilado).
