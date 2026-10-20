# Tanque: cañón telescópico y proyectil

Al moverse lleva el cañón guardado. Los primeros 0,58 s de la preparación existente despliegan los dos tramos; después continúa la cadencia aprobada del núcleo naranja y dispara. En recuperación hay retroceso corto, 0,22 s de pausa y 0,50 s de retracción. Al volver a approach el cañón ya está guardado. La animación lee los temporizadores reales: conserva movimiento, puntería, daño y colisiones. La artillería temprana ahora solicita la misma preparación antes de emitir su bala: ya no puede saltarse el despliegue ni disparar durante la recuperación. El tanque conserva su forma y escala, con el cuerpo original intacto fuera de la zona de articulación.

El proyectil conserva la dirección real y tiene punta redondeada, base plana con collar oscuro y acento coral/naranja, con un pequeño reflejo marfil. Su ancho visible es aproximadamente 8,1 px frente a los 7,2 px de la boca del cañón a escala de mundo. Su física y radio de colisión preexistente no cambian. No es una copia literal del proyectil de referencia.

Tres capas se cargan y recortan una vez. Durante el movimiento se dibuja una; en transición hasta tres, sin leer píxeles ni generar filtros por fotograma. En extensión completa se muestra el sprite original. La luz del núcleo conserva la versión v2. Si faltan las capas, se conserva el sprite estático.

## Procedencia del arte

Base retraída preparada con la habilidad imagegen, herramienta integrada. El original assets/singularity-family/tank.png se conserva intacto. Se incorpora únicamente la zona local alrededor del cañón; las mangas móviles se extraen del original.

Prompt utilizado:

> Make ONE surgical edit to the supplied production tank sprite: fully retract the left-facing telescopic cannon into its body, removing the projecting front barrel and intermediate sleeve and retaining a compact recessed dark indigo socket. Restore only the local area with matching tissue. Keep the ivory plates, indigo flesh, orange membrane, painterly texture, lighting, original framing and 1536×1024 canvas identical. No redesign, added anatomy, glow, text or background; true transparent alpha.

La luz del Tanque empieza únicamente cuando el cañón alcanza la extensión completa. La llamarada marfil dura 0,12 s y sigue la boca del sprite y su retroceso; sustituye la cuña antigua y no usa partículas ni desenfoque.
