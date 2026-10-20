# Cosmos vivo — 13/10/2026

Registro de la etapa anterior. La versión vigente añade materia atravesable y
se documenta en [HABITAT_VIVO_2026-10-13.md](HABITAT_VIVO_2026-10-13.md).
Las medidas y tamaños de campo de este archivo describen esa etapa previa.

## Decisión visual

Los ensayos de nubes básicas y jardín se descartaron por feedback del usuario.
Recuperamos las ocho nebulosas originales de `dimensionSkyBaseline`, sin cambiar
los archivos WebP. El jardín, su máscara y herramienta quedaron archivados en
`local/validation/space-clouds/rejected-garden`, fuera del runtime y la entrega.

Tres referencias compartidas: paisaje distante estable, circulación gaseosa
interna y polvo próximo reactivo. No se desplaza todo el dibujo, no se deforma
el paisaje alrededor del personaje y no hay avance radial permanente. Planetas,
anillos, núcleo de galaxia y límites conservan su lugar; la cámara sigue siendo
la del juego. La impresión de recorrer un lugar debe juzgarse andando, no con
una captura quieta. La calidad estética definitiva todavía requiere ese juicio.

## Para probar

- `PROBAR_ENTORNO_VIVO.cmd`: juego real en Electron, Boti y diez enemigos, perfil
  temporal separado. WASD/flechas, Shift y clic habituales. F6 alterna reacción,
  F8 compara gas/cintas sobre el mismo campo y fondo, F9 recorre los ocho mapas,
  F7 reinicia. Jugador protegido/enemigos persistentes sólo en esta prueba.
- `ABRIR_V1.cmd`: fuente actual en partida normal. Gráficos → Cosmos vivo y
  Entorno reactivo. Ambos activos por defecto; se respetan preferencias guardadas.
- Cerrar y reabrir para cargar el código. Los EXE/web empaquetados anteriores no
  contienen esta etapa. No hubo commit, push, publicación ni nuevo paquete.

## Implementación

`sectors.js` comparte su cache de originales mediante `getDimensionScenerySource`.
Máximo dos imágenes fuente en partida; no hay segundo cargador de imágenes.
`spaceEnvironment.js` usa un Canvas WebGL detrás del Canvas de combate, un solo
triángulo/paso fullscreen y cuatro texturas persistentes:

- Ruido 128×128: 65.536 bytes, un upload.
- Nebulosa original: 1536×864, 5.308.416 bytes, upload sólo al cambiar fuente.
- Gas cercano 512×320: 655.360 bytes, preparado una vez por escena.
- Campo de desplazamiento 33×19: 2.508 bytes, subimage sólo si cambia revisión.

No readbacks, recreación de contextos ni imágenes grandes por frame. Las motas
(256), estrellas (160) y marcas (capacidad 64) conservan buffers acotados y dibujo
agrupado. No se reducen enemigos, partículas de combate o efectos para medir.
La preparación gaseosa cachea funciones de columna y omite exp fuera del banco;
`surfaceBuildMs` muestra su costo puntual, distinto del costo por frame.

Circulación: flujo local acotado en UV, sin dependencia del jugador/cámara,
protección de planetas/anillos, vacío y puntos brillantes. Fundición pondera el
ángulo con una máscara y limita su deriva angular (±0,22 rad antes de máscara);
no interpola UV opuestas ni acumula deformación indefinida tras horas de juego.
El cover-crop centrado y los flips de variantes reproducen el renderer anterior.

`spaceResponse.js` conserva el campo elástico 33×19 y paso fijo 120 Hz; no limita
los FPS. Lee cuerpos y proyectiles sin modificarlos. Gain visual 0,20, máximo
7,6 unidades de longitud final, radio base del jugador 64 en vez de 82. El paisaje
distante nunca recibe esa deformación. No hay aclarado radial, tint por actividad
ni vaciado de alpha. Marcas de disparos/arco de contacto sólo donde hay materia.
Gas/motas toman el material del mapa; no se recolorean entidades o amenazas.

Pausa congela tiempo, campo y uploads; cambios de escena/variant/tamaño reinician
la respuesta. OFF preserva el ambiente sin respuesta; reducir efectos congela
animación y desactiva deformación. Sin WebGL se conserva la imagen original en
un Canvas cacheado, polvo reactivo y estrellas, sin mosaico de tiles ni costuras;
la circulación interna GPU no se emula en ese fallback. No hay mecánicas nuevas
de colisión, daño, aceleración u ocultamiento.

## Verificación

`npm run quality`: 221 suites, 0 fallos; 142 recursos de fuente verificados.
`local/validation/cosmos-vivo/quality.log`.

QA Electron `tools/preview-space-response.cjs --qa`: ocho originales, WASD/dash,
enemigos, disparos, F6/F8/F9, pausa sin uploads, menú, resolución y pérdida GPU.
Dos capturas con cámara/actores pausados y tiempos de ambiente 0/12 s comprueban
que el fondo cambia sin cargar otra imagen ni mover personajes.
Capturas/informe en `local/validation/cosmos-vivo`. QA adicional PC/móvil:
`tools/qa-space-environment.cjs`, ocho mapas, pausa, preferencia persistida,
alineación de canvas y fallback; informe en `local/validation/graphic-space`.

Comparación visible secuencial ABBA, ventana 1280×800, 12 s medidos + 4 s warmup/run,
24 hostiles persistentes, escopeta FIII, partículas completas, calidad alta/full,
movimiento real por teclado; mismo juego fuera de los dos renderers de prueba:

| Versión | FPS medidos (dos runs) | RAF p95 | RAF p99 |
| --- | --- | --- | --- |
| Cintas aprobadas iniciales | 121,08 / 121,57 | 15,2 / 15,1 ms | 15,8 / 15,8 ms |
| Cosmos vivo | 130,70 / 130,69 | 7,9 / 7,9 ms | 8,2 / 8,1 ms |

La nueva dirección también reduce la amplitud por pedido artístico: no es una
comparación pixelidéntica. Sí conserva carga, actores y VFX de combate. La
mejora en este caso ronda 7,7%; hubo picos aislados 38–39 ms en ambos. No prueba
165 FPS sostenidos, ausencia absoluta de stutters ni rendimiento en todo hardware.
Informes exactos en `local/validation/overlap-performance/cosmos-*-20261013.json`.

Comprobación adicional en ventana 1920×1080 (backing real 1904×993), misma carga,
una pareja de runs: cintas 100,09 FPS / cosmos vivo 112,82 FPS; RAF p95 15,5 ms
en ambos, p99 15,9 / 15,7 ms. Picos aislados 52,4 / 54,1 ms: sigue habiendo
trabajo de fluidez general, no se certifica 120–165 estables. Generación inicial
de gas: 14,5 ms en este run; QA por cambio de mapa 9,4–14,9 ms. Trabajo puntual
cacheado, no costo por frame. No llamar a la selección manual F9 una medición de
transiciones naturales sin enemigos; no se ocultan sus potenciales tirones.

Siguiente paso: validar con el usuario recorrido ida/vuelta, quieto, dash y fuego
en los ocho mapas. Ajustar amplitud/densidad sobre esta base, sin volver a cambiar
todo el lenguaje visual ni introducir obstáculos mientras se evalúa presentación.
