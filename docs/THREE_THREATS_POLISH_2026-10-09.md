# Tres amenazas: diseño y presión — 2026-10-09

Alcance: Costurero, Devorador de espacio y Francotirador dimensional. Figuras
flotantes 2D, sin patas, brazos, cabeza humanoide ni lectura de robot. Se conserva
el lenguaje geométrico/material del juego. No se modificaron otras IA, controles,
HP, drops, pesos de aparición ni el Tanque. No se hizo commit, push o publicación.

## Identidades y contrajuego

- **Costurero:** dos filos curvos, bobina axial y dos piezas laterales suspendidas
  con agujas. Viaja hasta un extremo y recorre físicamente el trazado mientras
  cose. Construye una membrana facetada con trama cruzada: ámbar al prepararse,
  violeta con borde rojo dentado al activarse. Intercepta la dirección de movimiento;
  junto a paredes prueba rutas alternativas, sin colocar la costura bajo el jugador.
  La zona no lo sigue después de elegida. El cuerpo sigue siendo vulnerable.
- **Francotirador:** núcleo/lente, aletas y cañón axial entre dos raíles largos.
  Dos bocas de portal y tres trayectorias finas anuncian la salida de las agujas.
  Filtra la velocidad del jugador y anticipa el destino. Hace la última corrección
  180 ms antes de disparar; las muescas se cierran/blanquean y la geometría queda
  fija. Cambiar de dirección o hacer dash después del bloqueo permite esquivarlo.
  Las tres agujas viajan: no dañan por estar en una línea futura ni atraviesan toda
  la trayectoria instantáneamente. Una descarga sólo intenta un impacto.
- **Devorador:** garganta negra, tres mandíbulas curvas y colmillos convergentes.
  Apertura progresiva del borde, luego anillo opaco de materia fracturada, dientes
  en el límite interior y doce fragmentos que caen hacia el núcleo. No hay velos
  transparentes superpuestos. El interior libre se contrae más rápido; permanecer
  quieto termina dañando. El contorno exterior no crece ni persigue al jugador.

Todas las zonas desaparecen al morir/aturdir a su dueño o expirar; la pausa congela
la animación y sus temporizadores. La preparación no inflige daño. Se respetan las
defensas, invulnerabilidad, esquiva, mitigación y canal de daño existentes.

## Parámetros exactos

En `js/engine/dimensionalThreats.js`, tabla inmutable `profiles`:

| Enemigo | Preparación | Actividad | Recuperación | Cooldown |
|---|---:|---:|---:|---:|
| Costurero | 1,55 s (0,55 viaje + 1 tejido) | 4,8 s | 0,8 s | 3,1 s |
| Devorador | 1 s | 2,6 s (antes 3,8) | 0,9 s | 3,5 s |
| Francotirador | 1,15 s, bloqueo final 0,18 s | 0,5 s | 0,85 s | 2,7 s |

Costura: semiancho 30 unidades, centro 110 unidades por delante de la ruta,
semilargo máximo 110 (adaptado a la arena), daño base del dueño ×2,2, máximo un
intento cada 0,75 s. No añade bloqueo físico de controles: es terreno de alto daño.
Devorador conserva daño ×0,55 e intervalo 0,85 s; sube la amenaza por timing, no
por multiplicar su daño. Francotirador conserva daño ×1; predicción 0,22 s,
velocidad de predicción filtrada y limitada a 260 unidades/s, abanico ±0,17 rad.

## Coordinación acotada

`prepareDimensionalThreats` hace una sola pasada O(n): reserva **una zona**
(Costurero/Devorador) y **una descarga** (Francotirador). La costura persistente ya
no silencia al tirador. Cuenta enemigos comunes vivos, no aturdidos, dentro de
210 unidades del jugador. Con al menos dos, o para un tirador acompañando una zona,
el cooldown baja a ritmo ×1,3. No se acorta el aviso visual ni se modifica a esos
enemigos comunes. No es un nuevo director de grupos ni un sistema de combos forzados.
Se conserva el máximo natural de dos amenazas dimensionales, una de cada identidad,
y su exclusión en presencia de un boss; el laboratorio permite probar composiciones.

## Código visual y coste

`js/render/dimensionalThreats.js`: Canvas 2D, sin shader nuevo ni assets generados.
Materiales contrastados, facetas sólidas, núcleos claros y glints cortos en vez de
blur extendido. Quitada la fisura antigua sin uso y agujas de carga redundantes.
Nada de partículas persistentes, arrays que acumulen trails o mutaciones de IA
desde el renderer. Dientes y fragmentos se dibujan procedimentalmente con cantidad
acotada. La superficie visible queda dentro de la cápsula de colisión conservadora;
los colmillos del Devorador no invaden el núcleo seguro.

## Comprobación y recuperación

`tests/dimensional_threats.js`: tejido físico, prevención de zona bajo jugador
junto a pared, daño/cadencia, desaparición, stun, bloqueo tardío y predicción,
contrajuego después del bloqueo, límites de reservas, presión básica, pausa,
30/60/120 FPS y render puro en preparación/actividad.

La regresión de tienda tenía una expectativa aleatoria: una alternativa podía
ser un duplicado fusionable, pero exigía siempre sumar inventario. Se corrigió
únicamente esa expectativa en `tests/economy_shop.js`, comprobando compra nueva
o incremento de fusión según la oferta. No se cambió el código de la tienda.

`tools/qa-threat-redesign.cjs`: laboratorio real Electron, perfiles temporales,
preparación/actividad, daño real, pausa, bajas con pistola y reset de cada enemigo.
En la observación se usa entrada manual de QA para no matar al enemigo antes de
ver su ataque; se restablece el autodisparo nativo para derrotarlo. Fullscreen
automático inhibido sólo en QA para mantener el encuadre móvil 844×390. Esto no
equivale a una prueba en teléfono físico ni constituye consenso artístico del autor.
Capturas y reporte: `local/validation/threat-redesign`; regresión:
`local/threat-redesign-tests.log`. El script histórico `qa-dimensional-threats`
corresponde al corte remoto anterior; para esta revisión usar el verificador nuevo.

Respaldo previo de los dos módulos: `engine-before.js`, `render-before.js` dentro
de esa carpeta de evidencia. No se restauró ni descartó trabajo local.

Tanque verificado contra hashes tomados antes de esta tarea:

- `js/render/enemies.js`: `2309E62CE530D2FC25F39D7291D689B7152031874ED9425834728B6CD9010BE5`
- `js/render/spectralEnemies2D.js`: `DF7742EB5AC849C4D446E80419B2019E00AC4B0B0F41A570C56F4D81268F793E`
- `js/engine/wavePressure.js`: `6B0A98FE0E3270DE76C92C60106EC60DA205745ECA21E6726FBBF9A976738023`

Abrir `ABRIR_V1.cmd` de esta carpeta; cerrar una instancia anterior para cargar
estos cambios. En el laboratorio elegir las tres identidades por nombre. Pendiente
de valoración del autor: sensación de presión y preferencia estética en movimiento.
No se requiere más contenido ni cambiar el resto de la escena para probarlos.

## Cierre técnico

- Regresión completa: 184 archivos de pruebas, cero fallos. Contratos adicionales
  de dibujo activo comprobados nuevamente con `tests/dimensional_threats.js`.
- Sintaxis: 142 archivos aprobados; catálogo y entrega local aprobados.
- Electron real: seis casos aprobados (los tres enemigos en 1200×800 y 844×390).
  Capturas inspeccionadas; preparación/actividad, daño, pausa, bajas y reset aprobados.
  No se utilizó el resultado de capturas incompletas de Edge headless como evidencia.
- Referencia congelada: 87 archivos idénticos. Entrega: 104 recursos verificados.
- Build web local: `releases/DeadSingularity-V1-web-hTEtwD`.
- `git diff --check` sin errores de whitespace; cambios ajenos preservados.

Implementación terminada. Siguiente paso del autor: probar el combate en movimiento
para valorar estética y dificultad; si pide ajustes, continuar en esta conversación.
