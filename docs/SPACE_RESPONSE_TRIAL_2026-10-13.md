# Respuesta espacial — una escena jugable, 13/10/2026

> Registro histórico de la primera prueba de cintas. La versión vigente es
> `docs/COSMOS_VIVO_2026-10-13.md`: originales restaurados, reacción reducida
> en los ocho mapas, gas interno y comparación F6/F8/F9. Este ensayo inicial
> se conserva como referencia de interacción y benchmark, no como estado actual.

## Qué se prueba

La sensación de recorrer un medio que responde, no un nuevo fondo rasterizado.
La maqueta generada anteriormente NO es un asset del juego. El usuario priorizó
el desplazamiento propio/de enemigos/proyectiles sobre la forma visual final.

Sólo Umbral incorpora una capa cercana deformable. Las posiciones de referencia
son coordenadas de arena, bajo la misma transformación que los actores: no sigue
pegada al personaje ni cambia su anclaje por zoom, cámara o DPR. Hay tres corrientes
de materia y 256 motas persistentes. Al pasar un cuerpo desplaza la capa; el dash
la abre más; los disparos causan perturbaciones y bordes breves sólo al atravesar
una corriente. Después recupera su forma. No se añade una mecánica de daño,
ocultamiento, velocidad, colisión u obstáculos. No se modifican colores/siluetas.

## Cómo abrir y comparar

- `PROBAR_ENTORNO_VIVO.cmd`: ventana Electron con el juego real en combatLab y
  un perfil temporal separado. Boti, cuatro drones, cuatro runners y dos spitters.
  WASD/flechas, Shift y disparo manual normales. F6 compara reacción ON/OFF con
  la misma materia. F7 reinicia. La prueba protege al jugador y restaura la vida
  de los enemigos para observar el efecto; esas ayudas no existen en producción.
  Música silenciada en la prueba; no afecta la preferencia personal.
- Partida normal desde `ABRIR_V1.cmd`: en Gráficos activar Espacio gráfico en
  movimiento y Entorno reactivo · prueba Umbral. La nueva reacción aparece sólo
  en Umbral. Desactivarla conserva las corrientes sin deformación; desactivar
  Espacio gráfico recupera el modo anterior.
- Ningún EXE anterior de releases contiene esta etapa. No se generó nuevo paquete
  web, APK ni portable en esta prueba focalizada.

## Implementación y límites

`js/render/spaceResponse.js`: retícula elástica visual 33×19, seis Float32Array
(15.048 bytes), integración fija a 120 pasos/s independiente del render, hasta
50 ms de recuperación por frame para no hacer catch-up ilimitado. NO limita los
FPS ni reemplaza el bucle físico del juego. Las fuerzas usan movimiento real
medido entre muestras; WeakMap externo para cuerpos, sin añadir propiedades a
actores. Proyectiles recorren hasta cinco muestras de segmento; memoria circular
de 64 marcas. Nada de RNG de gameplay, lectura de píxeles, uploads por cuadro,
contextos GPU nuevos ni partículas-objeto ilimitadas.

El dibujo agrupa curvas por estilo y utiliza Canvas bajo los actores; un borde
local muy tenue pasa delante por debajo del cuerpo/ojos. Se restaura el contexto
al salir. No hay iluminación física completa de las siluetas ni fluido volumétrico.
Pausa congela campo y fuentes; al salir de Umbral o desactivar se reinicia la capa.
Reducir destellos desactiva la deformación y conserva la materia quieta. El
fallback Canvas sigue funcionando aunque se pierda el contexto del fondo GPU.

`game.js` sólo pasa referencias de lectura a enemigos/proyectiles/pausa al render
existente. El test de preservación normaliza esa única adición exacta y mantiene
el hash protegido de portales/resto del render. Opciones persistidas por el
sistema existente; sin cambiar claves de perfiles ni guardados.

## Verificación

220 suites sin fallos, manifiesto de 142 recursos. Informe:
`local/validation/space-response/quality.log`.
QA real: `node node_modules/electron/cli.js tools/preview-space-response.cjs --qa`.
Comprueba desplazamiento/dash reales, enemigos, tiros, pausa, opción mediante UI,
aislamiento a un mapa, resolución y pérdida de contexto GPU. Capturas walking,
reaction-on/off y report.json en `local/validation/space-response`.

El costo JS del módulo se recoge en diagnostics; no incluye todo el trabajo de
raster/composición GPU. La primera comparación con ventanas ocultas composited
(`response-off/on-20261013`) resultó limitada a ~1 FPS por la presentación oculta:
NO sirve como evidencia de rendimiento. Comparación offscreen separada conserva
24 enemigos, partículas/efectos completos y calidad alta; no equivale a FPS
físicos de monitor. No se garantiza 120–165 sostenidos ni se recortan actores/VFX.

Medición offscreen de esta ejecución (8 s + calentamiento, 24 actores resistentes,
escopeta FIII y partículas completas): OFF 60,83 FPS / ON 59,92 FPS. Costo JS
promedio del módulo ON: actualización 0,033 ms y dibujo 0,215 ms; OFF dibujo
0,173 ms. Una pareja de ejecuciones no demuestra FPS de presentación ni elimina
stutters; no se presenta como mejora de fluidez global. Informes exactos:
`local/validation/overlap-performance/response-off-offscreen-20261013.json` y
`response-on-offscreen-20261013.json`.

Smoke adicional aprobado: ocho mapas originales, toggle/persistencia, alineación
móvil y pérdida GPU; menú gráfico en PC, móvil horizontal/vertical, resolución,
ayudas y reset. No se filtró la deformación a los otros siete escenarios.

Pendiente únicamente para decidir la siguiente etapa: juicio del usuario sobre
la sensación EN MOVIMIENTO. El aspecto sigue provisional. No extender esta
reacción a los otros siete mapas sin evaluar antes esta escena.
