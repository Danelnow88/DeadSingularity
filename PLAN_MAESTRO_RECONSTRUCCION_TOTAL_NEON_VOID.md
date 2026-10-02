# NEON VOID — Plan maestro de reconstrucción total

Fecha de creación: 30 de septiembre de 2026
Proyecto: `C:\Users\party\Desktop\JuegoDemo`
Objetivo: transformar la alpha actual en un juego coherente, memorable y cercano
a una candidata publicable, permitiendo reemplazar gran parte de su presentación
y diseño sin perder nunca la última versión funcional.

## 1. Decisión principal

Público confirmado por el usuario: adolescentes/adultos, no niños de cuatro años.
Fácil también debe desafiar; Normal aumenta presión y Difícil exige dominio con
derrotas frecuentes. Conservar justicia, legibilidad y validación con autoataque.

Actualización de continuidad (1-10-2026): el cierre técnico A–J no implica aprobación
de calidad. El playtest reabrió tareas. Estado y pendientes vigentes en
`docs/PENDIENTES_REALES_2026-10-01.md`; cortes L2b/L3/L4a en
`docs/DIFFICULTY_BOSSES_VISUAL_2026-10-01.md`. Revisar esos archivos antes de retomar.
Entrega vigente: consultar `JUGAR NEON VOID.cmd` y el primer corte publicado de
`docs/PENDIENTES_REALES_2026-10-01.md`; las rutas históricas abajo no son la build actual.
Feedback posterior de oleada 3 reordena el trabajo: bloqueo por enemigo exterior,
evaluación de duración/fin, HUD legible/ocultable y propuesta de aparición anunciada.
Ver orden M1–M4 en `docs/PENDIENTES_REALES_2026-10-01.md`. Asaltos finitos NO están
aprobados definitivamente por el jugador; no confundir prueba provisional con conformidad.

No se reescribe todo desde cero. La alpha actual conserva sistemas valiosos:
expedición, combate, pilotos, armas, bosses, tienda, guardado, audio, laboratorio,
tests y empaquetado Windows. Se reconstruye por capas, manteniendo un único motor
de gameplay y sustituyendo aquello que no alcance la calidad objetivo.

Se permite cambiar a fondo:

- dirección artística, paleta, iconografía, HUD, lobby y tienda;
- modelos Canvas, animaciones, VFX y lenguaje visual;
- audio, música, mezcla e identidad sonora;
- comportamientos, roles y combinaciones de enemigos;
- armas, progresión, economía, bosses, sectores y narrativa;
- onboarding, accesibilidad, rendimiento y presentación comercial.

No se conserva un elemento solo porque costó trabajo hacerlo. Se conserva cuando
cumple una función y alcanza la calidad del nuevo conjunto.

## 2. Regla de continuidad

Toda etapa debe terminar con:

1. una porción completa y jugable;
2. pruebas dirigidas y suite general sin regresiones críticas;
3. capturas reales de escritorio y móvil;
4. build Windows nuevo, sin borrar el anterior;
5. lanzador actualizado solo después del QA del ejecutable;
6. registro de lo terminado, lo pendiente y el próximo punto exacto de entrada.

Si se acerca el límite de uso, se detiene la expansión, se cierra el corte actual,
se prueba y se empaqueta. Nunca se deja el lanzador apuntando a una versión rota.

## 3. Autoridad y archivos de continuidad

- Este documento define la reconstrucción global.
- `PLAN_MAESTRO_PROXIMA_SESION_NEON_VOID.txt` conserva la auditoría sistémica.
- `docs/MASTER_BASELINE_2026-09-30.md` registra el estado técnico inicial.
- `docs/VISUAL_BIBLE.md` es una primera hipótesis artística, no una restricción
  definitiva: puede reemplazarse después de una propuesta visual mejor.
- El código y las pruebas vigentes son autoridad cuando la documentación difiere.

### Política de ubicación de artefactos

- Todo documento persistente, plan, reporte, captura, preview, respaldo del
  proyecto o build generado para NEON VOID debe quedar dentro de `JuegoDemo`, en
  una subcarpeta clara como `docs`, `previews`, `releases` o `backups`.
- No guardar deliberadamente archivos del proyecto en carpetas internas de
  ChatGPT, Codex, perfiles de herramientas ni otros workspaces auxiliares.
- Los temporales inevitables de una herramienta deben eliminarse al terminar si
  fueron creados por esta tarea y es seguro hacerlo; nunca convertirlos en la
  única copia de un resultado importante.
- No crear respaldos masivos repetidos sin necesidad. Antes de generar uno,
  registrar propósito y ubicación dentro del proyecto.
- No borrar ni mover archivos existentes fuera de `JuegoDemo` sin autorización
  explícita del usuario.

## 4. Protocolo de modelos y cuota

Antes de cada sesión, indicar modelo, razonamiento y alcance.

- GPT-6 Luna + Medio: documentación, inventarios, clasificación de capturas y
  preparación de prompts. Ideal cuando queda poca cuota.
- GPT-5.6 Sol + Alto: implementación habitual, correcciones y etapas acotadas.
- GPT-5.6 Sol + Muy alto: rediseño complejo que cruza varios sistemas.
- GPT-6 Astra + Muy alto: dirección artística global, arquitectura o rediseño
  sistémico difícil. Usarlo en bloques con criterio de cierre definido.
- Extra alto, Max o Ultra: solo para una revisión crítica y breve, nunca como
  configuración permanente de una sesión larga.

Con menos de 35% del límite de cinco horas: no abrir una etapa grande. Documentar,
auditar o cerrar y empaquetar un corte. El porcentaje semanal determina cuántas
etapas se intentan, no si se deja una etapa incompleta.

## 5. Método de reconstrucción

Cada sistema pasa por cinco estados:

1. inventariado;
2. evaluado: conservar, pulir, rediseñar o reemplazar;
3. prototipo aislado o corte vertical;
4. integración con pruebas y comparación visual/jugable;
5. aprobado o revertido sin perder el último build bueno.

Las decisiones se toman por función, legibilidad, identidad, diversión,
rendimiento y coherencia; no por cantidad de efectos o contenido.

## 6. Etapas

### Etapa A — Visión creativa y auditoría total

- Definir fantasía, público, tono, referencias permitidas y promesa de juego.
- Capturar todas las pantallas, enemigos, bosses, armas, VFX e interfaces.
- Clasificar cada elemento: conservar, pulir, rediseñar o reemplazar.
- Crear matriz de calidad para arte, gameplay, audio, UX y rendimiento.
- Elegir tres direcciones artísticas comparables antes de propagar una.

Cierre: una visión escrita y un corte visual aprobado por el usuario.

### Etapa B — Sistema visual completo

- Reconstruir paleta, materiales, formas, escala, iluminación y animación.
- Unificar pilotos, enemigos, bosses, proyectiles, pickups, escenarios y UI.
- Rehacer iconos que no alcancen la calidad objetivo; evaluar Canvas, SVG o
  raster según la función, sin imponer una técnica única.
- Crear jerarquía clara entre jugador, peligro, recompensa y decoración.
- Mantener niveles de detalle y efectos reducidos sin perder telegraphs.

Cierre: lobby, una oleada, una tienda y un boss representan la calidad final.

### Etapa C — Enemigos y director de oleadas

- Dar a cada enemigo un verbo y una razón táctica de existir.
- Eliminar perseguidores redundantes y estadísticas como identidad principal.
- Diseñar telegraph, ejecución, recuperación y contrajuego.
- Construir composiciones de roles, ritmo de aparición y objetivos secundarios.
- Convertir fusión/mutación en sistema visible, interrumpible y recompensado.

Cierre: las oleadas producen decisiones sin depender de saturación injusta.

### Etapa D — Arsenal, pilotos y progresión

- Definir rol, placer de uso, debilidad y evolución de cada arma.
- Conseguir runs con dos o tres herramientas realmente útiles.
- Auditar niveles, fusiones, atribución de bajas, HUD y cambio rápido.
- Revisar pasivas y especiales para que no trivialicen bosses ni sean irrelevantes.
- Mejorar feedback de impacto, crítico, armadura, bloqueo y muerte.

Cierre: cada arma y piloto habilita un estilo distinto y viable.

### Etapa E — Diez bosses memorables

- Rediseñar cada encuentro como una prueba principal distinta.
- Fase inicial activa; fase avanzada visible y mecánicamente relevante.
- Ataques esquivables con hitbox coherente, descanso y oportunidad de castigo.
- Identidad visual, animación, música y SFX propios.
- Medir builds pobres, medias y fuertes; especiales y consumibles incluidos.

Cierre: ningún boss es una esponja aburrida ni muere antes de mostrar identidad.

### Etapa F — Sectores, arenas y narrativa

- Convertir los cuatro sectores en experiencias reconocibles por imagen y audio.
- Agregar hazards y obstáculos legibles que cambien movimiento, no decoración
  arbitraria.
- Narrativa ambiental breve, transmisiones y símbolos sin frenar el arcade.
- Integrar eventos y objetivos secundarios con combinaciones justas.

Cierre: una captura o unos segundos de audio identifican el sector.

### Etapa G — Audio y música

- Rediseñar la banda sonora con leitmotiv, capas y transiciones por estado.
- Crear firmas por arma, familia enemiga, boss, impacto y recompensa.
- Mezclar para que los avisos peligrosos sobrevivan al disparo continuo.
- Probar fatiga, volumen bajo, parlantes modestos, mute, pausa y voces continuas.

Cierre: el sonido informa y emociona sin cansar ni tapar gameplay.

### Etapa H — Economía, motivación y curva completa

- Medir ingresos, gastos, crecimiento, dificultad y duración de cada tramo.
- Mantener decisiones útiles hasta el final de la expedición.
- Introducir gastos tardíos, reconfiguración limitada y recompensas significativas.
- Afinar Fácil, Normal y Difícil mediante composición y decisiones, no solo stats.

Cierre: jugar bien importa y cada sector produce crecimiento perceptible.

### Etapa I — UX, tutorial y accesibilidad

- Tutorial interactivo breve y mensajes claros dentro de la acción.
- Teclado, mouse, touch y mando/Steam Input.
- Texto, contraste, escala, flashes, shake, movimiento, audio y remapeo.
- Revisar lobby, HUD, pausa, tienda, muerte, victoria y guardado.

Cierre: una persona nueva puede empezar, entender, mejorar y reintentar.

### Etapa J — Rendimiento y candidata publicable

- Perfil de FPS, memoria, audio y picos de entidades.
- Pruebas en distintas resoluciones y hardware disponible.
- Builds web y Windows finales en carpetas nuevas.
- Identidad de ejecutable, icono, licencias, checklist de marca y Steamworks.
- Capturas comerciales, descripción, tráiler y plan de lanzamiento, sin publicar
  automáticamente ni asumir gastos o cuentas del usuario.

Cierre: alpha pública estable y recuperable, con pendientes conocidos explícitos.

## 7. Cómo ayuda el usuario

El usuario no necesita diseñar soluciones técnicas. Su mejor aporte es:

- enviar capturas y señalar qué se ve barato, confuso o fuera de lugar;
- decir qué enemigos, armas, sonidos o pantallas sí le gustan;
- describir sensaciones: aburrido, injusto, potente, claro, adictivo o repetitivo;
- probar escenarios exactos solicitados y contar qué ocurrió;
- aprobar una dirección antes de propagarla a todo el juego.

Cada devolución se registra como: observado, reproducido, causa, cambio,
verificación y pendiente.

## 8. Próxima sesión recomendada

Modelo: GPT-6 Astra.
Razonamiento: Muy alto.
Alcance cerrado: Etapa A, visión creativa y auditoría total. No implementar todavía
una reconstrucción masiva. Producir tres propuestas de dirección artística,
clasificar sistemas y elegir un único corte vertical para la sesión siguiente.

Después de aprobar la dirección, volver a GPT-5.6 Sol + Alto para implementarla.

## 9. Mensaje de reanudación

Cuando haya cuota suficiente, enviar:

> Continuá con `PLAN_MAESTRO_RECONSTRUCCION_TOTAL_NEON_VOID.md`. Empezá por la
> Etapa A. Auditá el juego real, proponé tres direcciones creativas comparables y
> dejá un corte vertical definido. No reescribas ni rompas la última build buena.

Si una sesión se corta, el mensaje suficiente es:

> Continuá desde el último punto verificado del plan de reconstrucción total.
> Revisá primero archivos, pruebas, build y notas de continuidad; no repitas lo
> ya terminado.

## 10. Registro de ejecución verificable

### 2026-09-30 — Cortes B1 y C1 cerrados

- B1: identidad base de los cuatro sectores, Fundición como referencia, Mutante
  reconstruido y lobby bajo corregido.
- C1: Tanque con embestida; Comandante con pulso de apoyo; Bastión con escolta y
  golpe; Centella con carga lineal. Todos usan aviso, ejecución, recuperación y
  contrajuego, sin reemplazar dificultad por daño de contacto invisible.
- Pruebas: `136/136`; recorrido Edge completo, escena específica de los cuatro
  roles, sin excepciones ni red externa; QA Electron con guardado y partida real.
- Build vigente: `releases/NEON-VOID-0.10.0-alpha-windows-NsKE9s`.
- Evidencia: `previews/enemy-role-rework/`.

### 2026-09-30 — Corte C2 cerrado

- Dron convertido en hostigador de formación con señal, presión y recuperación.
- Director híbrido: dos refills libres y una escuadra funcional por cada tres;
  respeta desbloqueos y presupuestos existentes.
- Fusión con hitos nominales, premio garantizado y pulso de nivel 2+ interrumpible
  mediante daño concentrado durante su aviso.
- Pruebas: `137/137`, Edge completo y QA Electron sin errores.
- Build vigente: `releases/NEON-VOID-0.10.0-alpha-windows-PXMMvq`.
- Evidencia: `previews/enemy-director-c2/`.

### Próximo bloque cerrado

Iniciar Etapa D con una auditoría de los diez roles de arma y cuatro pilotos:

1. medir solapamientos, debilidades y utilidad de cambio durante la run;
2. revisar especiales contra bosses para evitar trivialización o irrelevancia;
3. reforzar feedback de impacto y progresión sin alterar primero el balance base.

Antes de cambiar números, usar Combat Lab y telemetría existente para fijar una
matriz de identidad y seleccionar un corte vertical de dos armas y un piloto.

### 2026-09-30 — Corte D1 cerrado

- Matriz funcional de diez armas y cuatro pilotos en
  `docs/ARSENAL_PILOTS_AUDIT_2026-09-30.md`.
- Riesgo hallado y corregido: ENJAMBRE podía aportar ~540 de daño teórico al boss;
  ahora usa ×0,35 (~189 máximo teórico), conserva daño normal y telemetría propia.
- Pruebas: `138/138`, Edge completo y QA Electron sin errores.
- Build vigente: `releases/NEON-VOID-0.10.0-alpha-windows-15tNqa`.
- Próximo: D2, comparación real de Pistola/Subfusil, Francotirador/Riel y
  Rifle/Láser en nivel 25 y Fusión 0/2.

### 2026-09-30 — Corte D2 cerrado

- Combat Lab ampliado con nivel de Fusión 0–3, validación productiva, snapshot y
  telemetría; medidor determinista reproducible en `npm run measure:weapons`.
- Matriz de seis armas a nivel 25 y Fusión 0/2 guardada en
  `previews/arsenal-d2/weapon-pair-measurements.json`.
- Hallazgo corregido: Subfusil sólo conectaba un impacto contra el primer jefe
  lateral; alcance 320 → 360, todavía menor que Pistola (380), sin aumentar daño.
- Los demás pares conservan roles y diferencias reales; el cambio rápido ya está
  cubierto por rueda, teclas 1–6 y touch.
- Pruebas: `139/139`, Edge completo y QA Electron sin errores.
- Build vigente: `releases/NEON-VOID-0.10.0-alpha-windows-YEl5Rl`.
- Próximo: Etapa E, auditoría y reconstrucción de los diez bosses.

### 2026-09-30 — Etapa E cerrada

- Diez armazones visuales únicos, ligados a `repeater`, `heavy`, `summon`,
  `spread`, `beam`, `volley`, `bomb`, `orbs`, `split` y `rage`.
- Fase 2 intensifica cada silueta sin mutar gameplay; margen de arena evita cuerpo
  o hitbox parcialmente ocultos.
- Galería de 20 capturas en `previews/boss-e1/` y matriz de 30 escenarios pobre/
  medio/fuerte en `previews/boss-e2/`.
- Auditoría: `docs/BOSS_ROSTER_AUDIT_2026-09-30.md`.
- Pruebas: `140/140`, Edge completo y QA Electron sin errores.
- Build vigente: `releases/NEON-VOID-0.10.0-alpha-windows-RQj0ny`.
- Próximo: Etapa F, sectores, arenas y narrativa ambiental.

### 2026-09-30 — Etapa F cerrada

- Umbral conserva aprendizaje limpio; Fundición, Fractura y Corazón del Vacío
  incorporan respectivamente venteo vertical, grieta horizontal y pulso anular.
- Cada protocolo tiene nombre explícito, zona fija, aviso de 1,15 s, activación
  breve y un solo impacto posible. No aparece con bosses, transiciones ni eventos.
- La entrada a cada sector comunica nombre y contrajuego sin agregar objetos
  ambiguos ni frenar la acción.
- Suite: `141/141`; recorrido Edge completo, galería real de seis capturas y QA
  Electron sin errores en `previews/sector-f/`.
- Build vigente: `releases/NEON-VOID-0.10.0-alpha-windows-PjzAR1`.
- Próximo: Etapa G, auditoría y reconstrucción de música, mezcla y firmas sonoras.

### 2026-09-30 — Etapa G cerrada

- Umbral, Fundición, Fractura y Corazón del Vacío tienen progresiones, bajos,
  melodías, patrones rítmicos, timbres, tempo y drones propios.
- El cambio de identidad se deriva de la oleada y ocurre dentro del secuenciador
  existente, sin cortes, samples externos ni nodos persistentes adicionales.
- Se conservaron mixer por categorías, mute, anti-fatiga, música de menú/tienda,
  capa de boss y las diez firmas de ataque; el hazard sectorial tiene duck breve.
- Suite: `142/142`; Edge completo y QA Electron sin errores en `previews/audio-g/`.
- Build vigente: `releases/NEON-VOID-0.10.0-alpha-windows-6h8Ji2`.
- Próximo: Etapa H, economía, motivación y curva completa.

### 2026-09-30 — Etapa H cerrada

- Precios de mejoras y fusiones escalan desde su valor inicial, creando decisiones
  tardías en lugar de permitir comprar automáticamente todo el catálogo.
- `CALIBRAR ARSENAL` se desbloquea tras el jefe 10 y eleva secundarias al 80% de
  la principal (tope Nv80) a cambio de un coste tardío significativo.
- Fácil, Normal y Difícil despliegan escuadras tácticas cada 4/3/2 refills: la
  dificultad cambia composición además de vida, daño y densidad.
- Suite: `143/143`; preparación 2×2, Edge completo y Electron aprobados en
  `previews/economy-h/`.
- Build vigente: `releases/NEON-VOID-0.10.0-alpha-windows-odfolS`.
- Próximo: Etapa I, UX, tutorial y accesibilidad.

### 2026-09-30 — Etapa I cerrada

- Tutorial reactivo de primera partida, breve, omitible y sin pausar la arena.
- Teclado, mouse, touch y mando estándar/Steam Input usan el mismo puente de
  intención; stick analógico con deadzone y un único loop de simulación.
- Texto grande persistente se suma a efectos reducidos y lenguaje familiar.
- Suite: `144/144`; Edge completo y QA Electron sin errores en `previews/ux-i/`.
- Build vigente: `releases/NEON-VOID-0.10.0-alpha-windows-e1j8sv`.
- Próximo: Etapa J, rendimiento y candidata publicable.

### 2026-10-01 — Etapa J cerrada

- Stress reproducible de 19 escenarios y 600 frames: cero muestras sintéticas
  sobre 16,7 ms; resultados en `previews/release-j/performance-stress.json`.
- QA Electron registra frame/update/draw, memoria y tier visual; el warm-up de
  120 frames evita degradar la calidad por el pico de arranque de Chromium.
- Marca SVG propia, favicon, identificador estable, manifiestos y avisos incluidos.
- Suite: `145/145`; Edge completo y Electron aprobados en
  `previews/release-j-final/`.
- Build vigente: `releases/NEON-VOID-0.10.0-alpha-windows-OJszpY`.
- Web vigente: `releases/NEON-VOID-0.10.0-alpha-web-9reVGN`.
- El plan maestro A–J queda ejecutado. Las únicas puertas restantes requieren
  playtest humano, hardware, decisiones legales/comerciales o cuentas externas.

### 2026-10-01 — Playtest humano, corte K1

- Un niño de 4 años demostró que bosses y oleadas permitían ganar inmóvil y que
  hazards, progresión de Historia y varios verbos enemigos no se comprendían.
- K1 agrega presión anti-espera esquivable a todos los bosses, instrucciones
  literales para hazards y objetivo inequívoco para Historia/Infinito.
- Suite `145/145` y Edge completo en `previews/difficulty-k1/`.
- Build Electron aprobada: `releases/NEON-VOID-0.10.0-alpha-windows-CAosd2`.
- K2 queda definido en `docs/PLAYTEST_4YO_2026-10-01.md`: Tanque con cañón,
  suavidad de Escopuras y auditoría humana de mecánicas enemigas/bosses.

### 2026-10-01 — Playtest humano, corte K2

- El Tanque dejó de embestir: mantiene su identidad lenta/resistente y ahora
  usa cañón pesado con mira fijada, aviso de 0,9 s, obús propio y recovery.
- Escopuras usa aceleración/frenado interpolados sin alterar snapshot, stun,
  cadencia ni presupuesto hostil.
- Suite `145/145`, Edge integral y Electron aprobados en
  `previews/difficulty-k2/`.
- Build vigente: `releases/NEON-VOID-0.10.0-alpha-windows-qz3kZR`.
- K3 requiere playtest humano de comprensión del roster, medición de bosses y
  validación de dos expediciones completas; está detallado en el documento del
  playtest.

### 2026-10-01 — Dificultad/bosses/lenguaje hostil, corte L1

- Auditoría local: 10 bosses definidos; Historia usa 4 por partida hasta la
  oleada 20, tres rutas cubren los 10 en conjunto. Infinito los recorre hasta 50.
- Causa crítica: la presión anti-espera se dibujaba pero `game.js` no conectaba
  `applyPlayerDamage`. Corregido y verificado en runtime real de Edge.
- JEFE alterna primera línea de ráfaga con abanico de tres carriles anunciado;
  ambos mantienen puntería capturada y recovery. Los otros nueve siguen intactos.
- Suite `145/145`, Edge integral y QA Electron aprobados en
  `previews/difficulty-boss-l1/`.
- Build vigente: `releases/NEON-VOID-0.10.0-alpha-windows-z8v9n3`.
- Siguiente corte L2 y resto del mapa:
  `docs/DIFFICULTY_BOSSES_VISUAL_2026-10-01.md`.

### 2026-10-01 — Continuidad actual tras feedback de autoataque

Estado operativo prevalente: docs/PENDIENTES_REALES_2026-10-01.md. La finalización
técnica A–J NO cierra reconstrucción, balance ni producción comercial: el usuario
reabrió desafío, interés y utilidad de todas las compras. Guardián y Destructor
recibieron nuevas lecturas; mapa tiene emisores visibles; tanque dispara más lejos.
Seis peleas completas en Historia con autoataque confirman victoria fácil con
láser avanzado y pequeños movimientos. Próximo: investigar presión/potencia real
y economía y el resto de mecánicas/arte/audio. L4f completa los dos patrones de
los cuatro bosses tardíos y mide Némesis/Coloso; ver SYSTEMIC_L4F_2026-10-01.md.
Implementado no equivale a balance aprobado. No cambiar
otra vez la regla de oleadas sin explicar evaluación. Fuentes verificadas, cierre
de entrega y rutas vigentes constan en el documento operativo, no en entradas
históricas de builds anteriores. No commit/push.
