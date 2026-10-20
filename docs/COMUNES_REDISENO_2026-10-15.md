# Escopuras, Corredor y Espíritu — diseños desde cero

## Estado y acceso

Usuario autorizó empezar desde cero la siguiente tanda. Tres diseños nuevos
terminados como muestra animada, NO adoptados en partida normal.
Abrir `PROBAR_COMUNES_REDISENADOS.cmd` en la raíz del proyecto, Electron.
Cada pareja muestra ACTUAL a la izquierda / PROPUESTA a la derecha. Arriba
ampliación; abajo referencia1080p/cámara base900, sin zoom adicional. Cambiar
reposo/estados automáticos y mover el cursor para revisar seguimiento ocular.

La escala de transformación es igual por pareja; las siluetas son nuevas, no
calcos de las anteriores y sus cajas visibles no son idénticas. No se cambió
la escala global del juego ni la física para favorecer la prueba.

## Identidad

- Escopuras: organismo de presión con dos sacos plegados y un sifón inferior,
  cuatro ojos vivos, tonos pizarra/azul con acentos fríos. Se comprime/infla al
  preparar el ataque; luz local en el sifón al disparar, no un filtro global.
- Corredor: semilla depredadora alargada con cresta y pliegues posteriores,
  dos ojos, carbón/ocre/dorado. Conserva orientación interpolada del flanqueo,
  dirección de commit y postura de recuperación. No se convierte en un humano.
- Espíritu: membrana jade plegada sobre una cavidad de un ojo y cola curva;
  fase y pulso siguen sus estados reales. No copia la silueta del Fantasma élite.

Piezas amplias y sombras legibles, no microdetalle ni texturas fotográficas.
Referencia de acabado: élites v2 (solo estilo, no identidad/forma). La habilidad
imagegen produjo tres imágenes nuevas con transparencia real mediante la
herramienta integrada, sin CLI. Prompts completos y referencias guardados en
`docs/COMUNES_REDISENO_PROMPTS_2026-10-15.md`.

Activos nuevos de proyecto (anteriores preservados):

- assets/common-creatures/spitter-remodel-v1.png
- assets/common-creatures/runner-remodel-v1.png
- assets/common-creatures/wisp-remodel-v1.png

## Implementación aislada

`js/render/refinedCommon.js` prepara una vez cada cuerpo recortado por alpha a4x
y una lente64×64. Superficies totales aproximadas:779392 bytes para la tanda.
Cada cuerpo se dibuja una vez y los ojos siguen vivos. Respiración continua,
blink y transformaciones, no animación por cuadro de atlas ni blur/filtros nuevos.
Material y gradientes no se reconstruyen por frame.

Solo se activa con `NV.__commonRemodel=true` o el ID de una familia. La partida
normal no establece el flag ni precarga estos sprites. Los tres ganchos de
render se insertan DESPUÉS de orientación/estado y ANTES del cuerpo antiguo.
El código anterior sigue como fallback; Tanque, Enjambrito, élites, bosses y
amenazas dimensionales no se rediseñan en esta tanda.
Aviso MARK y pulso hostil de Espíritu permanecen en código original, antes del
body: no se eliminan al elegir sprite nuevo. Daño, timings, IA, cantidad de
entidades, hitboxes, progresión, armas y controles no se modifican.

## Verificación visual/funcional

`node tools/preview-common-remodel.cjs --capture` verifica carga de los3 alpha,
ojos con seguimiento, animación, diferencia de arte, estados reposo/carga/
ataque/recuperación, no mutación de actores y restauración de Canvas.
MARK de Espíritu es idéntico píxel a píxel entre ambos modos.
Salida: `local/validation/common-remodel-20261015/preview.png` y `qa.json`.
Tests de Corredor19, Escopuras14, Espíritu7 y visuales comunes27 pasan.
Nuevo test common_remodel verifica ausencia de descargas normales, opt-in por
familia, cache acotado, ojos4/2/1, pureza y Tanque intacto.

## Rendimiento preliminar Electron

1080p,24 enemigos del roster actual,6 élites v2, ocho comunes redibujados:
4 Corredores,2 Escopuras y2 Espíritus. Misma composición/semilla, movimiento
WASD, escopeta, partículas/explosiones, fondo vivo, high/full. Corridas separadas
con8s de captura; simulación animada, NO un estado congelado idéntico por frame.
No se reduce cantidad, resolución o tier; los contratos lo comprueban.

| Versión | FPS medios | rAF p95 /p99 ms | Peor ms |
|---|---:|---:|---:|
| Actual A |128,22|12,1 /13,4|36,4|
| Nueva A |150,63|9,0 /11,0|36,4|
| Actual B |115,95|12,5 /14,9|24,6|
| Nueva B |146,87|8,7 /12,1|42,4|

La ventaja se repite frente a controles variables. Es evidencia preliminar de
esta escena, NO una mejora fija por especie, ni prueba GPU de hardware, ni165
estables. No extrapolar a todo el catálogo. Persisten picos y la sesión varía.
Informes completos con percentiles de rAF, peores intervalos, composición y
calidad: `local/validation/overlap-performance/common-new-*-20261015.json`.
No usar el FPS de la galería para evaluar el juego ni comparar con informes de
otras sesiones como si fueran el mismo estado. Falta juicio visual humano y,
si se acepta, integración explícita seguida de prueba normal con10 hostiles.

## Próximo paso

Valorar los tres diseños animados. Ajustar lo que no convenza sin tocar la
versión normal. Integrar únicamente los aceptados y verificar luego Electron.
No empezar otra tanda ni reformar paleta/IA global hasta cerrar esta revisión.
Validación final: `npm run quality` completo,230 suites sin fallos. Entrega158
recursos y87 archivos congelados intactos. Sin commit, push ni publicación.
