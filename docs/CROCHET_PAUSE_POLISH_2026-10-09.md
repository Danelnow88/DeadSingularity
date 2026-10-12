# Crochet, paleta y desafío en pausa

## Alcance y decisión

Feedback de `C:/Users/party/Desktop/12345666.png`: borde sin ramas ni puntas,
puntadas curvas y color propio del Costurero. Tras la aclaración del autor,
el desafío se trasladó a **pausa**, no a estadísticas. Tab conserva su contenido.
Sin cambios de daño, duración, colisiones, ataques, recompensas o guardados.
Devorador, Tanque y los demás elementos de la escena no se modificaron.

## Ajustes exactos de Canvas

`js/render/dimensionalThreats.js`:

- `capsule`: arcos semicirculares en los extremos, Bézier suave en los laterales
  (inflexión hacia dentro de 1,2 unidades), `lineJoin/lineCap = round`. Conserva el
  semiancho del motor de combate. Quitadas facetas y dientes externos; peligro
  activo sigue marcado por un borde rojo de 4 unidades.
- `crochet`: la primera versión de argollas se descartó por feedback del autor.
  Ahora son puntadas compactas en V, filas separadas 12 unidades y paso
  longitudinal 10. Coronas curvas detrás del nudo, hebras delante: tres capas
  acotadas con Bézier, variación determinista ±0,35 unidades y microtorsión de
  fibra. Hebra posterior 3,7 unidades, sombra de separación 5, hilo principal
  3,5, luz material 0,8 y fibras cortas 0,65. Todo recortado dentro del borde.
  Se busca el punto entre la estructura fuerte de la trama original y lana
  entrelazada, no aros luminosos ni cuadrícula. Tres glints diminutos reemplazan
  el barrido blanco diagonal. Sin partículas acumuladas, blur extendido,
  imágenes, shaders nuevos ni cambios del motor.
- Paleta `NV.DIMENSIONAL_ART.cut`: cuerpo `#9b4c79`, contorno `#dc86b7`, luz
  `#f2c5dc`, sombra `#352039`, fondo tejido `#19121f`, hilo `#b98cac`, peligro
  `#ed5264`. Paleta visual local: no altera estadísticas/catálogo de enemigos.
- Francotirador: cuerpo `#456d7c`, contorno `#83aeba`, luz material `#c6d7de`,
  sombra `#172b39`, raíles `#58828f`, energía de visor/carga `#b6ebed`. Se
  mantienen los proyectiles/portales cian como fuentes luminosas y sus avisos.
  No se cambió su silueta ni su apuntado predictivo/bloqueo tardío.

Regla de arte para próximas revisiones: una familia cromática por material,
sombras desaturadas, saturación intensa reservada a luz/energía y advertencias.
Rojo funcional de peligro no depende del color del cuerpo. No se autoriza ni
implementa una recoloración global bajo esta regla: las próximas familias requieren
su propio feedback. Figuras flotantes no humanoides, sin extremidades.

## Desafío sin HUD persistente

- `js/ui/alpha.js`: eliminada creación, inserción y refresco de `alpha-run-strip`.
- `css/alpha.css`: eliminadas sus reglas de layout/visibilidad.
- `js/render/hud.js`: `optionalChallengeStatus(run,wave)` devuelve progreso,
  condición y recompensa mediante lectura pura. `drawPauseChallenge` dibuja una
  tarjeta centrada de ancho máximo 340, alto 96, margen de 16 y radio 12.
  No dibuja nada sin contrato seleccionado. Normales: dos armas con tres bajas
  cada una. Jefes: no superar dos golpes. Recompensa: `30 + wave*2` al cerrar la
  oleada, sin pagar desde UI ni anticipar éxito del boss antes de terminar.
- `js/game.js`: llamada de esa tarjeta únicamente dentro de `if (paused)`;
  el título y los hints se desplazan ligeramente para no superponerse. Tab y la
  firma de `drawStats` se conservaron. Se accede con P/Start o Pausa del menú móvil.

## Verificación y continuación

`tests/crochet_pause_polish.js`: curvas, paletas diferenciadas, dibujo puro,
progreso normal/boss, recompensa informativa, contrato inactivo, ausencia del
banner DOM/CSS y aislamiento de Tab. Los dos tests que comprobaban un guard del
banner eliminado ahora comprueban que no se monte un HUD persistente.

Regresión: `local/crochet-pause-tests.log`, 185 archivos aprobados, cero fallos.
QA: `tools/qa-crochet-pause.cjs`, Electron real con perfiles aislados, capturas
en `local/validation/crochet-pause`. El contrato se configura sólo en la respuesta
de QA servida en memoria; no se añade ningún hook al producto. Valida HUD limpio,
pausa con contrato normal/boss, contrato ausente y congelación del progreso.
Escritorio 1200×800 y móvil emulado 844×390; no es prueba en teléfono físico.

Listo para abrir desde `ABRIR_V1.cmd`. No se hizo commit/push/publicación. Cambios
locales anteriores preservados. Pendiente de preferencia artística del autor:
valorar el crochet y la paleta en una oleada concurrida; continuar acá si pide ajustes.
