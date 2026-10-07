# Integración visual de jefes V11

Referencia: `C:/Users/party/Desktop/INFORME_INTEGRA_BOSS_LAB.md` y el código
original `C:/Users/party/Desktop/jefesV11.txt`.

Se importaron literalmente los diez diseños y las funciones de dibujo Canvas.
La adaptación cambia el centro del canvas por la posición real del jefe y usa
metadata visual separada. La escala 115% conserva el valor inicial del laboratorio.
La física y el balance permanecen en los datos productivos. Se mantiene el aviso
de ataque y el indicador de segunda fase del renderer espectral existente.

El renderer no muta entidades, no usa RNG y omite jefes muertos. El contrato real
de vida del proyecto es `hp`, no `health`. No se crea un enemy duplicado: el jefe
ya existente tiene `isBoss: true` y recibe su metadata al construirlo.

Para verlos: jugar encuentros de jefes o abrir el laboratorio de combate existente
con `?combatLab=1`; elegir cada jefe. La galería de validación captura ambas fases
con `tools/capture_boss_gallery.cjs`. La hitbox física sigue siendo `boss.radius`;
las espinas, auras y cola son decoración visual.

La integración inicial quedó sin commit/push según el informe; la instrucción
posterior de publicación móvil autoriza ahora incluir estos cambios en Pages.

Galería local con pausa, hitbox y escalas: `dev/boss-design-lab/index.html`.
Validaciones: 170 suites previas/0 fallos; prueba dirigida de pureza y física
`tests/boss_design_lab.js`; Edge capturó los diez jefes en ambas fases sin errores.
Capturas: `previews/boss-v11-integrated`. Algunas capturas de entrada tienen al
jefe parcialmente fuera del viewport porque el jugador y la cámara están lejos;
no se alteró su spawn ni la cámara para esta tarea visual.
Builds definitivas: Windows `Iw4Xar` y Web `HOIEdm`; lanzador actualizado.
La prueba interactiva humana del EXE sigue pendiente.
