# Cierre de campos y acceso al HUD — 08/10/2026

## Propuesta aprobada e implementada — estado vigente

El autor aprobó despliegue durante el reloj y limpieza después, y aceptó una
pequeña subida de presión, particularmente en normal. Cada campo mantiene su
duración completa. Se elimina la cuota de bajas como condición de aparición y
victoria. `total` queda como referencia diagnóstica histórica; el runtime muestra
required:null/mode:timed. Al expirar el tiempo no hay refills normales ni élites
ni drops periódicos; los avisos pendientes cuentan como hostiles hasta eliminarlos.
Boss conserva su soporte original y se cierra mediante muerte de jefe.

Densidad: objetivo blando original + hasta3, techo blando28 y hard30/heavy7.
Lotes originales +1, máximo5. Cadencia, stats y composiciones tácticas intactas.
Entradas libres agrupadas con radios/separación y microvariación, sin forzar tipos;
selección ponderada y sinergias existentes conservadas. Se corrigió un solapamiento
de posiciones en arenas pequeñas antes de cerrar la etapa. La pistola de plasma
queda para otra tarea, sin cambios en esta implementación.

Las secciones de diagnóstico y propuesta más abajo registran el estado anterior
y quedan superadas por esta aprobación. Próximo paso: evaluación humana de presión
y recursos en normal; luego ampliar escenarios y tratar plasma por separado.

## Diagnóstico de oleadas

`NV.waveClearReady` en js/data/balance.js exige simultáneamente reloj agotado,
todos los enemigos del objetivo desplegados y cero hostiles vivos. No compara
directamente `waveDefeats`: la autoridad es desplegados + supervivientes, por lo
que una baja de invocado tampoco salta enemigos originales pendientes.

El coordinator deja de desplegar al alcanzar el objetivo. Un jugador rápido
puede limpiar todo antes del reloj y esperar sin combate; otro puede agotar el
tiempo con despliegues o hostiles pendientes y permanecer en LIMPIEZA. La barra
usa el mínimo entre progreso temporal y fracción de enemigos limpiados. No es
un reloj que garantice victoria al llegar a cero: son dos condiciones distintas.

Ejemplos en oleada 1 normal, objetivo 22 y mínimo 15 segundos:
- 22 desplegados, ninguno vivo, 5 segundos restantes: espera vacía de 5 segundos.
- Reloj agotado y 4 hostiles vivos: sigue combate hasta eliminarlos.
- Reloj agotado y sólo 20 desplegados: aún deben aparecer y eliminarse los otros 2.

## Propuesta para la siguiente etapa, aún sin implementar

Usar el tiempo como fase de despliegue activo y cerrar después por limpieza:
mantener la presión/cadencia originales durante la fase de combate, detener el
refill al acabar el tiempo y abrir el cruce al eliminar los últimos hostiles.
Las bajas serían progreso/recompensa, no una segunda puerta con fin independiente.
Una limpieza anticipada durante el despliegue recibe la siguiente escuadra al
ritmo normal, sin pausa arbitraria ni oleada vacía esperando el reloj.

Esto requiere quitar el cupo total como condición de victoria y recalibrar economía
y número de enemigos realmente desplegados por campo. Nunca aumentar caps ni
stats para compensar silenciosamente. Medir bajas, HP, duración, recursos y pico
de densidad en las tres dificultades y oleadas con boss. Alternativa: asalto sólo
por bajas, retirando el mínimo de tiempo; permite campos demasiado cortos con
arsenales fuertes. La opción recomendada conserva duración y presión activas.
El pedido actual solicita investigar: la regla de cierre no se modifica todavía.

## Corrección implementada del HUD

H abre durante tres segundos la cortina de armas/consumibles, sin equipar ni usar
objetos. Intentar números 1–6, rueda, Q/E, F o especial también revela el HUD:
ranura vacía, mismo equipo, inventario vacío y habilidad en cooldown no impiden
mostrarlo. La selección y consumo conservan sus validaciones originales.
NO HUD explícito conserva su preferencia; H no lo reemplaza. Pausa y menús no
avanzan ni activan la cortina. Ayuda de controles actualizada con H.

Verificación: pruebas de temporización, intentos sobre inventarios vacíos y
especial, además de Electron real oculto con perfil aislado. Se comprobó
autoocultamiento, H, números, Q/E/F, especial y pausa sin cambiar el arma ante
ranuras vacías o selección de la misma arma. Captura y resultados:
local/validation/hud-reveal. Herramienta repetible: tools/qa-hud-reveal.cjs.

## Escenarios

Se mantiene la regla permanente de fondos distintos en cada cruce. Ampliar las
cuatro familias de fondos es trabajo futuro; no se crean escenarios adicionales
en esta corrección del HUD ni se alteran los escenarios locales existentes.

Siguiente paso exacto: implementar y medir la fase de despliegue por tiempo y
limpieza final, si el autor elige esta propuesta. Después ampliar familias de
background conservando la selección sin repeticiones.
