# Investigación de ritmo, amenaza y motivación de partida

**Estado:** documento de trabajo; diagnóstico iniciado, sin cambios de balance aplicados.  
**Alcance:** convertir la conversación con el autor en una investigación verificable del gameplay de DeadSingularity V1. No es una promesa de igualar el éxito comercial de otro juego ni una autorización para añadir sistemas sin validarlos.

## Objetivo

Que una partida tenga un ritmo comprensible y variado: el jugador pueda construir poder, disfrutar sus picos de fuerza, y luego encuentre nuevas presiones que le exijan adaptarse. Las decisiones de tienda, la amenaza, las rutas y las recompensas deben sostener el deseo de continuar o volver a empezar, sin volver invencible al jugador ni depender sólo de inflar números.

## Lo que reportó el autor

- El rendimiento se siente estable, aproximadamente 8/10, aunque todavía admite mejoras. No es el foco de esta conversación.
- El combate se vuelve monótono: hay variedad de enemigos y habilidades (agarre, posesión, tanques, embestidas, aturdimiento), pero durante bastantes oleadas casi no obligan a moverse. El daño recibido se siente bajo y Boti puede recuperar parte con facilidad.
- La presión más evidente aparece tarde, cerca de la oleada 10. El autor reconoce que su experiencia y habilidad pueden influir en esa percepción.
- En torno a la oleada 10 suele haber maximizado mejoras y armas favoritas. Después la tienda pierde interés y quedan principalmente consumibles. La tienda actual no ofrece la progresión continua que el autor percibe en Brotato, pero subir poder sin contrapesos podría volver la partida trivial.
- El objetivo deseado es una curva continua de poder y amenaza: disfrutar una build fuerte durante un tramo y luego volver a sentir presión; no permanecer invencible ni recibir una subida brusca y arbitraria.
- Portal y agujero negro deben significar experiencias diferentes. El portal representa la ruta estable hacia el final; el agujero negro, una alternativa más caótica, hostil y recompensante. En pruebas se sintieron demasiado parecidos. También falta coherencia entre la ruta y los entornos que aparecen.
- Hay jefes que se sienten fáciles o pueden morir muy rápido con determinadas armas. Se consideran encuentros con pocos enemigos coordinados, además de revisar agresividad y resistencia de jefes.
- Se buscan motivos reales para jugar otra partida: recompensas durante la run, progreso entre runs y retos claros que den algo deseable. Una recompensa sin propósito no alcanza. Los cosméticos se consideran de baja prioridad hasta que el gameplay resulte divertido.
- Al morir, la run vuelve a cero; los pilotos siguen disponibles. Se mencionó una segunda oportunidad como posibilidad, no como decisión. No se decidió implementar muerte permanente.
- La sección de mejoras permanentes del lobby existe, es antigua visualmente y el autor no sabe si está balanceada porque suele probar con `fresh=1`.
- Los pilotos empiezan con una pistola y sus estadísticas base; el jugador compra armas, mejoras y consumibles. Las habilidades especiales de los pilotos también forman parte del conjunto actual. No se debe describir como existente ningún otro sistema de variantes, cosméticos o progresión.

## Hechos contrastados en el código

1. **Modo de prueba:** `js/game.js` detecta `?fresh=1`, congela la persistencia meta, inicia los meta-shards y las mejoras permanentes en cero. Es una prueba válida del balance base, pero no representa el perfil normal con mejoras de lobby.
2. **Mejoras permanentes:** `js/data/gameData.js` define nueve mejoras de lobby: daño, movilidad, vida, armadura, suerte, crítico, esquiva, regeneración y codicia. `NV.normalizePermUpgrades` permite hasta nivel 10. En `js/game.js` se aplican al iniciar la run. Algunos máximos son relevantes para el balance: +200 HP, +10 armadura, +20 daño; los demás beneficios también se acumulan.
3. **Economía de run:** `js/game.js` define seis slots de tipos de mejora y nivel máximo 6; topes de compra para HP (8), armadura (5) y suerte (7). Esto respalda investigar el agotamiento temprano, aunque no basta para probar por sí solo cuántas compras ocurren realmente en una partida.
4. **Armas:** el nivel de arma tiene un máximo técnico de 100 (`js/data/balance.js`). Esto no significa que la tienda permita comprar 100 niveles: parte del progreso proviene de derribos y sus reglas deben analizarse por separado antes de proponer cambios.
5. **Presión de enemigos:** `js/data/balance.js` establece `MAX_HOSTILES: 30`, `ACTIVE_HOSTILE_LIMIT: 10` y un presupuesto distinto para laboratorio. `deploymentHostileLimit(false)` limita producción a 10 y `fieldHostileTarget` no puede superarlo. Por tanto, el límite de 10 es de entidades activas en gameplay, no sólo de dibujo. La curva de objetivo blando calcula densidades mayores y luego se recorta al límite de despliegue. Algunos comentarios cercanos aún describen objetivos de 18–28 como si fueran alcanzables en producción; esa diferencia entre comentario/configuración y límite merece aclaración.
6. **Curva existente:** `NV.enemyHpScale` sube hasta 4x en oleada 10 y luego continúa más suavemente. También hay etapas de composición (temprana, media, presión, tardía y final) y tarjetas de grupos coordinados. Hay que verificar en partida qué tan seguido se manifiestan; que estén definidas no prueba que el jugador las perciba como presión efectiva.
7. **Retos y registros:** existen contratos/preparación y registros de runs/hitos. Los contratos entregan tokens de run; los hitos registran progreso, pero la inspección no encontró una recompensa jugable propia asociada a ellos. No se propone priorizar cosméticos.
8. **Continuidad:** hay checkpoint para reanudar una run al cerrar la aplicación, pero una muerte finaliza la run; no se encontró un ítem de resurrección en el código revisado.

## Interpretación: hipótesis que todavía hay que probar

- El cap de diez puede reducir la sensación de cerco y hacer que aumentos de densidad de la curva no lleguen al jugador. Aun así, no demuestra que haya que elevarlo: encuentros coordinados, cadencia, telegráficos, presión de proyectiles y objetivos pueden contribuir sin añadir entidades; rendimiento debe medirse.
- La subida de HP puede alargar el tiempo para matar sin hacer más peligrosa la respuesta del enemigo. La presión percibida depende también de daño, frecuencia, movilidad, alcance, elección de objetivos y ventanas de seguridad.
- La tienda podría agotarse por topes de categorías, precios, disponibilidad/rotación, ingresos de tokens o concentración temprana de compras. Se debe medir cada causa antes de rediseñar economía.
- Las mejoras meta pueden elevar mucho el poder, pero el usuario suele usar `fresh=1`; no hay todavía evidencia de cómo una run normal afecta la dificultad. Deben compararse ambos perfiles antes de conservar, quitar o retocar la sección.
- Si portal y agujero negro comparten ritmo, entorno y recompensa funcional, la diferencia visual por sí sola no bastará. La distinción debe abarcar amenazas, decisiones y resultado.

## Preguntas de investigación

### A. Ritmo y dificultad

- ¿En qué oleada y situación el jugador recibe por primera vez daño que exige reaccionar? ¿Qué comportamiento enemigo lo causó?
- ¿Cuánto daño llega por contacto, ataques a distancia, estados de control y jefes? ¿Cuánto se cura y cuánto mitiga Boti y cada otro piloto?
- ¿Qué cambian las etapas de composición en una run real y con qué frecuencia se repiten?
- ¿El cap activo de 10 se alcanza, cuánto tiempo se mantiene y qué FPS/tiempo de frame produce? ¿Cómo se siente con 10 frente a un prototipo controlado de mayor concurrencia?
- ¿La escalada tarda demasiado, llega de golpe o mantiene una presión plana? Medir por tramos, no sólo comparar oleada 1 con oleada 20.

### B. Tienda y economía de run

- Registrar tokens ganados, precios pagados, inventario, niveles y elecciones por visita/oleada, con perfil `fresh=1` y perfil normal.
- Encontrar el momento real en que se agotan las compras atractivas y por qué: máximos, arma favorita, inventario lleno, stock, precios o falta de tokens.
- Revisar cuánto poder esperado aporta cada compra y por cuánto tiempo cambia la supervivencia/velocidad de matar.
- Considerar primero ajustes a disponibilidad, ritmo de desbloqueo y decisiones con costo-oportunidad. No asumir que “más tiers” o más estadísticas son la solución.

### C. Mejoras permanentes y propósito entre runs

- Ejecutar la misma configuración/semilla de escenarios con meta en cero y con niveles representativos de mejoras permanentes; comparar tiempo de matar, daño recibido, curación, fallos y oleada alcanzada.
- Confirmar si el lobby explica con claridad que esas mejoras afectan a todos los pilotos y qué consecuencias tienen.
- Decidir después de la evidencia si las mejoras actuales ayudan, trivializan o no cambian suficientemente la experiencia. Su estética legacy es una deuda visual separada del balance.
- Revisar qué meta-shards se obtienen al morir/vencer, qué se conserva, qué se gasta y si el retorno se siente significativo. No introducir una segunda moneda sin razón.

### D. Variedad, jefes y rutas

- Identificar enemigos/mecánicas que obligan a cambiar movimiento o prioridades y combinarlos intencionalmente.
- Auditar vida, mitigaciones, daño recibido, telegráficos, agresividad y tiempos de exposición de cada jefe; evitar que una sola arma lo elimine antes de que exprese su patrón.
- Portal: continuidad de campaña y destino/bioma legible. Agujero negro: excursión opcional de riesgo real, reglas/anomalía reconocibles y recompensa superior proporcionada. Asegurar que entornos y encuentros refuercen esa diferencia.
- Evaluar encuentros de pocos enemigos coordinados como una familia de combate, no como simple aumento de vida; especificar señales legibles y oportunidad de aprendizaje.

### E. Motivación y rejugabilidad

- Separar motivación de la run (compras, drops, contratos y decisiones), entre runs (mejoras meta y desbloqueos) y objetivos de dominio (retos medibles).
- Hacer que cualquier premio futuro tenga un uso, elección o reconocimiento que importe. Cosméticos quedan explícitamente fuera de la prioridad inmediata.
- Diseñar los retos sólo después de validar condiciones posibles, legibles y acordes con las mecánicas existentes; recompensas y persistencia quedan por definir.
- No implementar muerte permanente de pilotos únicos sin una decisión explícita y un diseño de respaldo; hoy no parece necesaria para resolver el problema de propósito.

## Orden de trabajo propuesto (no implica cambios aprobados)

1. **Auditoría reproducible de la run actual:** matriz de reglas y telemetría de diagnóstico para economía, composición, concurrencia, daño/cura y progresión. Usar escenarios deterministas; no alterar balance.
2. **Prueba de experiencia temprana:** runs comparables en oleadas 1–10 con `fresh=1`, registrar el primer momento de tensión y compras que cambian la build.
3. **Prueba de meta-progresión:** repetir con mejoras normales del lobby; decidir su función según resultados, no por impresión de una prueba aislada.
4. **Elegir un tramo y una hipótesis por vez:** por ejemplo presión temprana, tienda agotada o jefe trivial. Prototipo medible, comparación A/B y revisión humana antes de integrar.
5. **Construir el ciclo de recompensa y rutas:** sólo cuando se conozcan los puntos de fricción; preservar claridad y evitar inflación de poder.
6. **Prueba externa:** observar a jugadores nuevos sin enseñarles qué hacer; anotar confusión, primera decisión, primer daño peligroso, primera compra memorable, aburrimiento y deseo de otra run. No usar sólo al autor como muestra porque ya domina el juego.

## Primer frente iniciado

Auditoría estática del balance/economía y de las pruebas existentes. El siguiente paso es ejecutar las pruebas del proyecto pertinentes y revisar si cubren el límite activo, la curva de presión, topes de tienda y perfiles meta/fresh. En esta fase no se cambian estadísticas ni límites: primero se establece una línea base y se detectan discrepancias entre reglas, comentarios y comportamiento probado.

### Resultado de la primera pasada (19-10-2026)

- `npm test`: 237 de 238 grupos pasan. El único fallo fue `tests/launchers_portability.js`, que no pudo resolver con `realpath` una carpeta temporal del sandbox (`EPERM`, `AppData/Local/Packages/.../Temp/...`). No corresponde a una aserción de gameplay; queda pendiente revalidarlo fuera de esa restricción. No se modificó el test.
- Pasan las pruebas de curva de vida de enemigos, progresión por oleada, objetivo de densidad, presupuesto hostil, contratos, economía de tienda y mejoras permanentes. Cubren fórmulas/contratos aislados, no una partida completa con comportamiento emergente de jugador.
- `node tools/performance/economy_simulation.cjs` (semilla 1729, 100.000 muestras): stock premium en 12,159% de visitas; stock de recompensa en 3,982%; desbloqueos de armamento en oleadas 2, 2, 5, 10, 15 y 20. El script mide stock/probabilidades, no simula una trayectoria de compras ni demuestra por qué se maxean las builds.
- El reporte también calcula una oportunidad de drop de arma por minuto de combate; no la usamos aún para inferir cuántas armas se consiguen, porque el propio script advierte que excluye tiempo de jefe y ocupación del espacio de pickup.
- Ya existe `?playtest=1` en `js/engine/playtestTelemetry.js`. Registra uso/progresión y daño infligido por arma, dash, bosses y estados de Runner/Spitter. En la estructura revisada no registra daño recibido/curación, compras/saldo por visita ni serie temporal de concurrencia hostil; por eso no alcanza para contestar las preguntas centrales de dificultad/economía sin observación manual o una ampliación diagnóstica.
- `git rev-parse` reconoce el directorio como raíz de trabajo, pero `git status`/`git diff` responden que no es un worktree. No se intentó reparar Git. En esta etapa sólo se creó este documento y los comandos de diagnóstico fueron de lectura; no se tocaron archivos de gameplay.

### Siguiente prueba propuesta

Usar el laboratorio/telemetría ya existentes para una comparación controlada de oleadas 1–10 y de perfiles fresh/normal. Completar su cobertura diagnóstica (sin efectos en producción cuando está OFF) para medir segundos con daño recibido, vida perdida/recuperada, tiempo de eliminación, concurrencia real, compras/saldo e instante en que la tienda deja de ofrecer una decisión útil. El reporte estático de stock y la telemetría actual no sustituyen esa prueba.

## Criterios para cerrar la investigación

- Cada afirmación del informe se etiqueta como experiencia reportada, hecho del código, resultado medido o hipótesis.
- Existe una comparación reproducible de early/mid/late y de fresh/normal.
- Se sabe por qué se agota la tienda y cuánto dura cada pico de poder.
- Se sabe qué límite de concurrencia se alcanza realmente y su costo de rendimiento.
- Se acuerda una primera hipótesis de gameplay con resultado esperado y condición para revertirla.
- No se ha hecho commit ni push como parte de esta investigación.
