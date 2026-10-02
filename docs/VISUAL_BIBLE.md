# NEON VOID — biblia visual de producción

Esta guía define el lenguaje común para que una mejora visual no convierta cada
pantalla en un juego distinto. La legibilidad de combate y el rendimiento tienen
prioridad sobre la decoración.

## Fantasía central

La fantasía vigente del usuario es cósmica: cuatro entidades/núcleos de energía
viajan por regiones del universo; los bosses remiten a cuerpos celestes y
fenómenos cósmicos. Las siluetas mecánicas actuales de pilotos y enemigos no se
rediseñan en el corte de escenarios. El neón no cubre todo: se reserva para
núcleos, peligro, interacción y recompensa; el espacio aporta profundidad oscura.

## Jerarquía de combate

1. El piloto usa cian luminoso y una silueta cerrada, siempre reconocible.
2. Proyectiles y zonas de daño hostiles usan rojo con borde nítido. Aviso con
   borde discontinuo, activo continuo; amarillo secundario sólo anuncia stun.
   La paleta compartida está en `NV.HOSTILE_SIGNALS`, no en el color del sector.
3. El enemigo activo conserva su color de familia; su ataque añade el color de
   peligro sin reemplazar su identidad.
4. Pickups y recompensas usan blanco cálido, oro o verde limpio.
5. Fondo y partículas no superan el contraste de una amenaza. No hay grilla,
   checkerboard, paneles regulares ni una rejilla geométrica disfrazada.

La dificultad no puede depender de partículas, blur ni calidad gráfica. Todo
ataque conserva geometría y aviso en el nivel de detalle más bajo.

## Formas y materiales

- Pilotos: polígonos mecánicos compactos, paneles cian, núcleo blanco y ojos
  legibles. Bordes firmes; pocas piezas grandes.
- Enemigos comunes: chasis negro mate con una única familia cromática y ojos o
  sensores pequeños. La silueta explica el verbo antes que el texto.
- Espectros: membrana líquida, cavidades y movimiento orgánico; nunca un simple
  polígono con glow.
- Bosses: núcleo, carcasa y apéndices en tres escalas. Cada fase altera al menos
  una masa importante, no solo el color de un aro.
- UI: vidrio técnico oscuro, bordes finos, etiquetas monoespaciadas y botones
  grandes. Los mensajes largos son placas compactas, no titulares sobre la mira.

## Sectores

| Sector | Oleadas | Paleta | Material / silueta | Motivo ambiental | Idea de lore |
| --- | --- | --- | --- | --- | --- |
| Umbral | 1–5 | azul frío, cian apagado, índigo | río diagonal de nebulosa y luna inferior izquierda | bolsas de gas, polvo y vacío | primer paso por una región de formación estelar |
| Fundición | 6–10 | cobre, ámbar oscuro, violeta secundario | gigante eclipsado superior derecho, remolino y restos | polvo mineral y escombros asimétricos | forja estelar, no fábrica cuadriculada |
| Fractura | 11–15 | violeta apagado, azul mineral | fisura quebrada y grandes masas dispersas | espacio desgarrado con cúmulos laterales | el espacio ya no coincide consigo mismo |
| Corazón del Vacío | 16–20 | ciruela, índigo, negro profundo | singularidad descentrada y lente oblicua | acreción y filamentos gravitatorios | la fuente del vacío atrae el entorno |

Son cuatro composiciones, no recolores. Hitos/cúmulos quedan quietos en mundo:
la cámara los deja atrás al recorrer la arena. Calidad mínima conserva sus
formas principales. El arte nunca anuncia daño, no bloquea ni tiene colisiones;
no confundir la fisura oscura o singularidad decorativas con hazards activos.

Cada sector debe poder reconocerse en una captura sin leer el HUD. Fondo, arena,
audio y boss comparten motivo, pero los proyectiles hostiles conservan un lenguaje
global para que aprender a jugar siga siendo posible.

### Protocolos ambientales vigentes (M6)

- Umbral no añade hazards: es el tramo de aprendizaje.
- Fundición y Fractura usan cabezales metálicos retráctiles con tres anillos cian
  y esfera de carga, inspirados en la referencia del usuario. Grupos 2/4/6,
  borde superior/izquierdo/derecho, posiciones alternadas sin tapar HUD central.
  Rayos rojos finos con núcleo blanco; no franjas anchas ni emisores en reposo.
- Corazón del Vacío anuncia `PULSO`; el anillo permite esquivar hacia dentro o fuera.
- La geometría queda fija desde el aviso, nunca se combina con boss o evento y
  los láseres comparten cooldown de impacto (no daño multiplicado en cruces).
  El pulso aplica un impacto por activación. Cabezal -> carga -> rayo -> retirada
  explican el peligro sin carteles ni balizas. Arte de cabezal y brillo no dañan.

## Fundición + Mutante: corte de referencia

Fundición ahora emplea polvo cálido, un gigante eclipsado y restos estelares. El
Mutante es una membrana asimétrica de verde apagado con núcleo oscuro, cámaras
biológicas y venas magenta. En fase 2 las venas y los tres brotes se vuelven parte
de la composición; el boss no debe parecer una estrella verde ni tener ojos
caricaturescos gigantes.

## Movimiento y efectos

Perímetro: membrana cósmica de refracción, no pared industrial ni dientes de
roca aleatorios. Un labio oscuro ondulado y filamentos interrumpidos separan
terreno y vacío; la junta interior marca la pared física exacta. Todo detalle
queda fuera de gameplay. Material frío/cálido/violeta/magenta según escenario,
sin rojo de peligro, blancos intensos ni un rectángulo neón como identidad.
El margen de cámara es 28 unidades; NO HUD no elimina una pared del mundo.

- Idle: respiración o vibración leve; nunca ruido constante en toda la pantalla.
- Telegraph: anticipación creciente, dirección o zona exacta, color hostil.
- Ejecución: impacto corto y contrastado.
- Recuperación: silueta abierta o luz descendente para comunicar oportunidad.
- Muerte/fusión: cambio de forma primero, partículas después.

Con efectos reducidos se eliminan shake, partículas secundarias y glow extra;
nunca el telegraph, el contorno peligroso ni el estado de recuperación.

## Presupuesto

- Backdrop sectorial: una pasada decorativa, operaciones acotadas y sin estado de
  gameplay.
- No usar blur Canvas dinámico como base de identidad.
- Evitar asignaciones por frame y búsquedas cuadráticas nuevas.
- Probar `900x520`, `915x412` y `844x390` además de escritorio.
- Toda nueva familia visual necesita prueba de render sin mutación y captura real.

## Criterio de aceptación

Una pantalla está aprobada cuando el piloto, la amenaza inmediata, el espacio
seguro y la recompensa se identifican en menos de un segundo; el sector se
reconoce sin texto; y la misma escena sigue siendo legible con efectos reducidos.
