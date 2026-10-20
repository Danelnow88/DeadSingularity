# Hábitat vivo — 13/10/2026

## Resultado y alcance

Se conservaron los ocho paisajes originales que el usuario aprobó. No se
generaron imágenes nuevas ni se reemplazaron sus WebP. La materia próxima usa
pliegues y bolsillos de gas con colores y detalle tomados del paisaje de cada
dimensión; sus recorridos se diseñaron individualmente en coordenadas de la
imagen fuente. No es otro paisaje que sigue al jugador.

El ambiente tiene actividad propia: circulación interna distante, deriva local
acotada del gas, dos grupos pequeños de puntos viajeros, un meteoro tenue y
ocasional y una oscilación lenta de iluminación cósmica. No es un ciclo literal
de día/noche ni se inventaron construcciones o flora sin relación con el mapa.

Jugador, enemigos, jefe y proyectiles abren un canal siguiendo su desplazamiento
real. El gas se acumula a los lados y recupera su forma gradualmente; la apertura
residual cae por debajo del 10% en aproximadamente cinco segundos sin nuevos
pasos. Cuatro parches pequeños de gas delante de los cuerpos ayudan a compartir
el plano, con alpha contenido y sin un velo de pantalla completa. En el vacío
no hay círculo visible ni lupa; el paisaje lejano no recibe el desplazamiento
del jugador. Ojos, proyectiles y avisos hostiles conservan prioridad.

Esto es presentación, no una mecánica nueva: no altera colisiones, daño,
velocidad, ocultamiento, IA, cámara, portales, arena, bordes ni progresión.
La inmersión definitiva requiere evaluación humana jugando; los tests verifican
comportamiento y conservación, no aprobación estética.

## Cómo verlo

- `PROBAR_ENTORNO_VIVO.cmd`: Electron real con perfil temporal separado, Boti y
  diez enemigos persistentes. Comienza junto al gas tras un breve acercamiento
  por controles normales; ese acercamiento pertenece sólo a esta prueba.
  WASD/flechas, Shift y clic. F6 apaga/enciende la reacción del gas, F8 compara
  gas/cintas, F9 recorre ocho mapas, F7 reinicia la sesión. Tras F7 se puede volver
  a acercar caminando. Protección del jugador/enemigos sólo en el laboratorio.
- `ABRIR_V1.cmd`: partida normal desde la fuente actual. Ajustes → Gráficos →
  Cosmos vivo / Entorno reactivo. Se respetan preferencias guardadas; habilitar
  ambos para ver la etapa completa. Cerrar y reabrir para cargar los cambios.
- Las estelas aprobadas de disparos quedan independientes de F6 y de Cosmos
  vivo. Apagar la reacción no las elimina. Reducir efectos atenúa las estelas
  y congela el ambiente, sin añadir reglas nuevas de combate.
- Los EXE/web anteriores no se reconstruyeron. No hubo commit, push,
  publicación, APK ni instalador nuevo.

## Código y coste acotado

`js/render/spaceHabitat.js` contiene la materia y su memoria. Dos campos
Float32 de 65×37 cuestan 19.240 bytes. Usa el segmento realmente recorrido,
recuperación exponencial y lectura de entidades; no modifica entidades ni sus
objetos de combate. Teletransportes y grandes discontinuidades no barren el mapa.
Los radios próximos son 31 unidades para caminar, 41 para dash, 22–36 enemigos,
42–56 jefes y 12–20 proyectiles. El campo anterior mantiene gain 0,20 y una
deformación local máxima de 7,6 unidades; nunca deforma el fondo distante.

`js/render/spaceEnvironment.js` combina ambos campos en una sola textura:
RG guarda desplazamiento, B apertura y A acumulación. La refinación bilineal
33×19 → 65×37 conserva el campo anterior, con error de cuantización máximo de
aproximadamente 0,03 unidades por eje. Hay un solo upload cuando cambia revisión
y una sola consulta de campo por fragmento, no un segundo campo GPU independiente.

Se mantienen cuatro texturas y un solo paso fullscreen:

- Ruido 128×128: 65.536 bytes.
- Paisaje original 1536×864: 5.308.416 bytes, recarga al cambiar fuente.
- Materia cercana 512×320: 655.360 bytes, preparada al cambiar escena/fuente.
- Campo combinado 65×37: 9.620 bytes, buffer estable.

El detalle original se copia una vez a un Canvas privado con `source-atop`,
respetando su alpha; no se cambia el archivo original ni se leen sus píxeles.
Una cache de ruido compartida de 491.520 bytes se reutiliza en todos los mapas.
Los cuatro parches 128×96 se reutilizan: 196.608 bytes de píxeles nominales.
No se crean texturas, contextos ni buffers grandes por frame. Los cielos
comparten el cargador original, con un máximo de dos fuentes en partida.

En el QA, la preparación inicial de gas fue 18,8 ms; cambios posteriores
11–30,2 ms (puede prepararse primero sin imagen y otra vez al estar lista).
Es coste puntual de cambio de mapa, no coste por frame; no se presenta como
transición natural libre de tirones. La media CPU de la actualización de memoria
en la prueba de estrés fue 0,038–0,039 ms, que NO incluye el coste GPU.

Pausa detiene memoria, animación y uploads. OFF conserva vida ambiental y borra
la respuesta. El fallback tras pérdida GPU conserva el original y dibuja gas
cacheado con una máscara pequeña de apertura; no emula la circulación interna
del shader y puede costar más que GPU. No se hace `readPixels`/`getImageData`
en el renderer de producción.

`js/render/spaceTrails.js` separa las estelas aprobadas del campo ambiental:
capacidad 64, buffer de 2.048 bytes, vida 0,28 s, colores del material del mapa,
dibujo por cuatro grupos de alpha y sin blur por marca. Lee posiciones reales,
incluyendo reflexión y frenado; no extrapola a través del movimiento inexistente.
Cobertura comprobada: nueve armas con proyectil en F0–FIII, disparos hostiles,
Hivemind, meteoros y las cabezas activas del francotirador dimensional. Lanzallamas
es un cono, no un proyectil; no se inventó una estela de vuelo. Una bala nacida y
eliminada entre dos observaciones no deja marca; no se modificó el motor para
capturar esa excepción. La capacidad conserva el límite del efecto aprobado.

`js/game.js` sólo entrega observadores de posición y llama al render de estelas.
`index.html` carga los dos módulos nuevos antes del entorno, con cache-busters
actualizados. Las pruebas de preservación verifican el resto del dibujo/portales.

## Verificación y rendimiento

`npm run quality`: 224 pruebas, 0 fallos.
`node tools/check-delivery.cjs`: 144 recursos verificados y 87 archivos de
referencia idénticos a la build congelada. El caso adicional de jefe readonly
también pasa en `tests/space_habitat.js`.

Tres pruebas nuevas: `space_habitat`, `environment_projectile_coverage` y
`habitat_field_uploads`. Verifican recuperación, desplazamiento real, ausencia
de mutaciones/readbacks, fuentes cubiertas, identidad de buffers, packing y
ausencia de uploads redundantes. Se conservan los guards de portales y gameplay.

QA Electron real: `tools/preview-space-response.cjs --qa --record` comprueba
desplazamiento, dash, disparos, ocho mapas, F6/F8, pausa, resize y fallback GPU.
`tools/qa-space-environment.cjs` pasa ocho cielos, ajuste persistente, alineación
PC/móvil y pérdida de contexto. Cero errores de consola en ambos.

Comparación visible secuencial, misma ventana 1920×1080 (backing 1904×993),
24 enemigos persistentes, escopeta FIII, calidad alta/full, movimiento real y
VFX completos; 4 s de calentamiento y 12 s de medida por run:

| Versión | FPS, dos runs | RAF p95 | RAF p99 |
| --- | --- | --- | --- |
| Cosmos previo, sin hábitat nuevo | 108,08 / 110,43 | 12,2 ms | 12,3 ms |
| Hábitat final, campo combinado | 109,09 / 111,51 | 12,2 ms | 12,3 ms |

Resultado comparable, sin caída media apreciable en estos runs; no se reivindica
esa pequeña diferencia como mejora garantizada. Persisten picos de 48–55 ms en
ambos. NO certifica 120–165 FPS estables ni todos los equipos. El prototipo con
dos campos separados había bajado a 104,90–106,81 FPS: se combinó el campo antes
de cerrar, sin quitar materia, actores ni VFX para recuperar ese coste.

Evidencia local:

- `local/validation/habitat-live/quality.log`, `report.json`, `recording.json`.
- `local/validation/habitat-live/recorrido.webm`: captura real con movimiento,
  disparos y recuperación; grabación a 30 FPS, NO benchmark de fluidez.
- `local/validation/graphic-space/report.json`: QA de escenarios/ajustes/móvil.
- `local/validation/overlap-performance/habitat-before-a-20261013.json`,
  `habitat-before-a2-20261013.json`, `habitat-packed-b-20261013.json` y
  `habitat-packed-b2-20261013.json`: medidas exactas de antes/después.

La implementación y las comprobaciones de esta etapa están terminadas. Lo
pendiente es el juicio del usuario en movimiento y ajustes artísticos concretos
si los solicita. Unificación global de paleta, bugs ajenos, mecánicas ambientales,
tráiler y empaquetado nuevo quedan fuera del alcance de esta tarea.
