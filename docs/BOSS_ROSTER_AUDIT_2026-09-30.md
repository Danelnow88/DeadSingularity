# NEON VOID — auditoría de los diez bosses

Fecha: 30 de septiembre de 2026. Etapa E del plan maestro.

## Identidades verificadas

| Oleada canónica | Boss | Prueba principal | Armazón visual | Fase 2 |
| ---: | --- | --- | --- | --- |
| 5 | JEFE | Ráfagas fijadas | Banco de emisores | Duplica emisores y presión |
| 10 | TITÁN | Artillería pesada | Cuatro placas | Mayor presencia y recuperación menor |
| 15 | SEÑOR DEL VACÍO | Portales e invocación | Portales orbitantes | Más portales y arena combinada |
| 20 | GUARDIÁN | Anillo con hueco | Nodos radiales | Más rayos, hueco conservado |
| 25 | DESTRUCTOR | Lanza cargada | Rieles y prisma | Tres lanzas fijadas |
| 30 | NÉMESIS | Doble abanico | Alas gemelas | Segundo pulso más denso |
| 35 | COLOSO | Bombas lentas | Cápsulas suspendidas | Tres bombas con descanso |
| 40 | FANTASMA | Tríada espectral | Orbes fantasma | Alterna tríada y anillo |
| 45 | MUTANTE | Esporas y brotes | Membrana y cámaras | Núcleo + tres brotes propios |
| 50 | APOCALIPSIS | Pulso del Vacío | Corona dentada | Abanico/anillo acelerado |

Todos usan aviso, puntería capturada, ejecución y recuperación. Los proyectiles
hostiles conservan núcleo de colisión menor que su glow y colisión barrida; no
existe daño invisible por pasar debajo de una esfera.

Actualización L3 (1-10-2026): una Historia nueva de 20 oleadas enfrenta los diez
en las oleadas pares 2–20. Los checkpoints anteriores conservan su ruta de cuatro;
Infinito y Laboratorio conservan la secuencia canónica hasta la oleada 50. Ver
`DIFFICULTY_BOSSES_VISUAL_2026-10-01.md` para la auditoría del runtime.

## Verificación visual E1

L4b (1-10-2026): Señor del Vacío alterna tres orígenes de disparo fijos,
anunciados con líneas reales, e invocación; siguiente turno usa abanico central.
Fase dos duplica ese abanico. Ver `PENDIENTES_REALES_2026-10-01.md`.

- Diez armazones únicos ligados al ataque característico.
- Cada fase 2 aumenta cantidad, tamaño o extensión sin alterar hitbox.
- Margen de arena de `2,1 × radio + 10` mantiene visible la silueta peligrosa de
  FANTASMA y APOCALIPSIS incluso en extremos de su recorrido.
- Galería real: `previews/boss-e1/` (20 PNG + reporte).

## Medición E2

Ventana real determinista de 4,5 s, dificultad Normal y ROOK inmóvil:

- build pobre: Pistola nivel 1, Fusión 0;
- build media: Rifle nivel 25, Fusión 0;
- build fuerte: Láser nivel 25, Fusión 2.

La build fuerte quita entre 13,5% y 54,2% según el tramo. El primer JEFE cruza
fase en la ventana pero no muere; alcanza a ejecutar varias ráfagas. Los bosses
tardíos no son candidatos a una build nivel 25 sin fusión: pertenecen a rutas
avanzadas/infinito. Ningún escenario mató a ROOK; el máximo daño recibido fue 23
HP (DESTRUCTOR), y GUARDIÁN conservó un hueco limpio con 0 daño estando quieto.

Datos completos: `previews/boss-e2/boss-roster-measurements.json`. Repetición:
`npm run measure:bosses`.

## Decisión

No cambiar HP o daño global con una muestra corta: los extremos son coherentes y
un recorte uniforme destruiría la progresión. El próximo ajuste de números queda
condicionado a partidas humanas completas y a telemetría de tiempo real de kill.
