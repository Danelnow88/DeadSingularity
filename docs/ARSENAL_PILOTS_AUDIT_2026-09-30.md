# NEON VOID — auditoría de arsenal y pilotos

Fecha: 30 de septiembre de 2026. Estado: base verificable de Etapa D. Esta matriz
describe funciones actuales; los números finales requieren partidas humanas.

## Armas

| Arma | Verbo y fortaleza | Debilidad | Riesgo / decisión |
| --- | --- | --- | --- |
| Pistola | Resolver cualquier blanco con control simple | Sin pico ni control de grupo | Conservar como referencia inicial; no debe superar especialistas |
| Rifle | Alinear y perforar 2–3 blancos | Cadencia media | Conservar; reforzar lectura de penetración |
| Subfusil | Presión sostenida móvil; supresión en Fusión II | Alcance corto y daño por impacto bajo | Medir si se distingue de Pistola antes de retocar daño |
| Escopeta | Burst cercano y cobertura de grupos | Exige distancia; 8 impactos máximos al boss | Conservar; balance humano ya se sintió justo |
| Francotirador | Eliminar élites a distancia | Recuperación muy lenta | Conservar especialización élite; comparar contra Riel |
| Láser | Atravesar escudos y líneas medias | Sin alcance extremo | Conservar; su feedback debe hacer visible el bypass |
| Plasma | Explosión de área y control de cúmulos | Cadencia lenta | Conservar; ya no duplica daño al boss |
| Lanzallamas | Negar zona y aplicar quemadura | Riesgo por alcance mínimo | Conservar; medir legibilidad en alta densidad |
| Arco | Encadenar blancos con elección angular | Pierde daño por rebote | Identidad clara; conservar |
| Cañón de Riel | Perforar filas completas a máximo alcance | Cadencia mínima | Conservar; separar visualmente del Francotirador |

Solapamientos a medir: Pistola/Subfusil en blanco único; Rifle/Láser/Riel en
líneas; Francotirador/Riel en impacto lento. No se justifica cambiar daño base sin
telemetría comparativa de run normal y boss.

## Pilotos y especiales

| Piloto | Identidad | Boss actual | Estado |
| --- | --- | --- | --- |
| BOTI | Supervivencia estable y limpieza de oleada | Hasta 108 teóricos si los 12 meteoros impactan; multiplicador 0,30 | Corregido anteriormente; conservar |
| NOVA | Riesgo, movilidad e inmunidad ofensiva | Aproximadamente 54 por aura + detonación completa | Acotado; conservar y medir exposición |
| ROOK | Resistencia, reflejo y control | No busca daño directo; compra 3 s de seguridad | Identidad defensiva válida |
| ENJAMBRE | Evasión y presión autónoma | Antes: hasta ~540 teóricos sin reducción propia | D1: multiplicador 0,35, ~189 teóricos y telemetría `special:hivemind` |

## Decisiones de D1

- Los especiales no acreditan progreso al arma equipada.
- Cada especial conserva una función distinta; no se igualan por DPS.
- Ningún especial ofensivo debería saltarse una fase completa del primer jefe.
- Los drones mantienen daño completo contra enemigos normales y sólo reducen el
  daño al boss. El renderer, la duración, cantidad, rango y cadencia no cambian.

## Corte D2 — medición real y corrección

Matriz determinista contra JEFE, Normal, nivel 25, seis segundos y sin críticos
aleatorios. Evidencia completa en
`previews/arsenal-d2/weapon-pair-measurements.json`.

| Arma | Fusión 0 | Fusión 2 | Impactos | Lectura |
| --- | ---: | ---: | ---: | --- |
| Pistola | 273 | 377 | 13 | Referencia estable |
| Subfusil | 300 | 450 | 30 | Presión sostenida cercana |
| Francotirador | 444 | 624 | 6 | Impacto lento y rol antiélite |
| Cañón de Riel | 520 | 725 | 5 | Mayor impacto, menor cadencia, filas completas |
| Rifle | 480 | 656 | 16 | Opción accesible de alineación |
| Láser | 703 | 988 | 19 | Especialista épico de blanco único/escudos |

El Subfusil sólo conseguía un impacto porque su alcance de 320 coincidía con la
distancia vertical inicial del jefe: cualquier desplazamiento lateral anulaba la
ráfaga. Su alcance sube a 360, aún por debajo de Pistola (380); no se tocó daño,
cadencia ni evolución. El cambio rápido existente ya cubre rueda, teclas 1–6 y
touch, por lo que no se agregó otra interfaz redundante.

El Combat Lab ahora acepta Fusión 0–3, la aplica al estado productivo y la incluye
en snapshot/telemetría. El medidor `npm run measure:weapons` permite repetir la
comparación sin modificar partidas normales.
