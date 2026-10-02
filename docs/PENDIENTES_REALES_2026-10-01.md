# NEON VOID — continuidad real, no lista de promesas

Este archivo complementa el plan maestro. A–J fueron implementados técnicamente,
pero el playtest reabrió problemas de dificultad, legibilidad y progresión.
Una suite verde NO equivale a juego comercial terminado o divertido.

## Público y dificultad — aclaración del usuario, vigente

El público de diseño son adolescentes y adultos (aproximadamente 15–30 años),
NO niños de cuatro años. La prueba del hijo sólo mostró que era trivial.
Fácil debe exigir atención, lectura, movimiento y decisiones de build; Normal
sube presión/combinaciones; Difícil busca derrotas frecuentes por errores, sin
impactos invisibles ni ataques inevitables. Evaluación principal con autoataque.
Claridad/accesibilidad no significan balance infantil. Esta aclaración prevalece
sobre toda recomendación histórica de niño/asistencia o avisos adaptados a él.

## Nuevo feedback humano: oleada 3, duración y HUD (M)

El jugador quedó bloqueado por un enemigo fuera de pantalla. NO hay entidad/captura
de esa partida para identificar el tipo exacto, pero el código permitía aparecer
en x=0/W y desplazarse/empujarse sin límite. Es una falla crítica con cierre por
limpieza: corregirla antes de continuar diseño de bosses o ampliar contenido.

El jugador NO aprobó el cambio de oleadas cronometradas a asaltos finitos. Está
probando el conjunto y posterga el juicio; no interpretar eso como aceptación
definitiva. La duración mínima sigue escalando, pero la barra ya no representa
sólo reloj. No seguir agregando objetivos ni cuotas de movimiento para resolver
AFK. Comparar ritmo, presión real y comprensión antes de consolidar esta decisión.

DESPEJADOS/POR LLEGAR no se entienden; SECTOR 1/4 y UMBRAL carecen de contexto;
el contador JEFES 1/10 sí es comprensible, pero su ubicación no gusta. El HUD no
debe invadir el combate. El botón histórico NO HUD es requisito transversal:
todo indicador informativo agregado debe respetarlo; avisos necesarios para
esquivar siguen siendo parte del combate, no decoración opcional.

## Orden de trabajo revisado

Último corte: perímetro/exterior/caja de render, continuación del pedido visual
interrumpido. Ver PERIMETER_POLISH_2026-10-01.md. Margen56->28, labio ondulado y
filamentos, CSS full-bleed sin cambiar la barra superior. Suite154/0; fuente/web
empaquetada/EXE final comprobados, entrega windows-B1d5Vr, web-i6B9Qx.
No se borran builds ni se reinicia el plan. Aprobación estética humana y móvil
físico pendientes. Se detectó y descartó el cambio de aspecto móvil; sus bounds
deben ser EXACTAMENTE los anteriores. Su inset3px queda como límite explícito.

Corte anterior: escenarios cósmicos, pedido VISUAL posterior a cámara. Ver
COSMIC_SCENARIOS_2026-10-01.md. Cuatro fondos rehechos, grilla/diagnóstico
eliminados, cache acotado por mundo y calidad real. NO se cambian progresión,
dimensiones/cámara, balance, enemigos, spawns ni hazards. Aprobación humana
de estética/legibilidad pendiente; el plan general y problemas off-screen siguen.

Corte anterior: foundation arena + cámara, solicitado después de L5. Ver
CAMERA_FOUNDATION_2026-10-01.md. Se cierra esta foundation sin abrir fase dos.
Mundo y vista separados, HUD/input ajustados, protección mínima off-screen.
No consolidar balance adulto ni compensar densidad durante esta tarea.
Antecedente L5: ver DIFFICULTY_ADULT_L5_2026-10-01.md. Público adolescente/adulto,
patrones avanzados en Difícil y escuadras agrupadas, sin alterar duración/victoria.
El balance NO está cerrado: láser avanzado aún ganó con poco movimiento en una
muestra de Fácil y Difícil. No confundir pruebas técnicas con dificultad aprobada.
Antecedente L4f: ver SYSTEMIC_L4F_2026-10-01.md. Cuatro bosses restantes ya
alternan patrones; composición y presupuesto de Historia revisados; consumibles
no se gastan sin efecto posible. Suite 152/152 y Edge integral cerrados.
M6/L4e (LASER_HEADS_M6_2026-10-01.md) conserva cabezales retráctiles 2/4/6 y audio.
No confundir patrones implementados con balance/diversión aprobados.

### Corte actual publicado: escenarios cósmicos

Windows: releases/NEON-VOID-0.10.0-alpha-windows-FY9PMZ.
Web: releases/NEON-VOID-0.10.0-alpha-web-lCQ8mU.
Launcher actualizado después del QA. Suite 153/153; arte dirigido en
previews/cosmic-backgrounds-visual-final, cámara en cosmic-backgrounds-camera,
integral/Electron en cosmic-backgrounds-integral-final. Guardado y playing,
errors:[], fuentes game/sectors coinciden por hash en ambos paquetes.
No archivos/builds borrados, commit ni push. El arte está fijo en coordenadas
del mundo y el cambio de fondo sigue en oleadas 6/11/16. No inferir balance
aprobado ni cambios de combate a partir de este corte puramente visual.

### Corte anterior publicado: foundation de cámara

Windows: releases/NEON-VOID-0.10.0-alpha-windows-pD8QaO.
Web: releases/NEON-VOID-0.10.0-alpha-web-6G98xt.
Launcher apunta al nuevo EXE tras QA: previews/camera-integral-final/desktop-qa.json,
pass:true, saved:true, playing y errors:[]. Fuentes finales: suite 153/153,
19 casos de cámara, sintaxis y diff check sin errores. Edge integral y dirigido
táctil en previews/camera-integral-final y camera-foundation-touch-final;
diez módulos coinciden por hash en ambas entregas. 6fhn6g anterior preservado.
NO se borran archivos, partidas ni builds. Sin commit/push. view desktop 900x520,
arena 1350x780; móvil arena=1.5× vista dinámica. worldMetrics sí cambia.
No ajuste intencional de estadísticas/balance; geometría/lectura sí afecta ritmo
y dificultad efectiva. Stage dos NO abierta: bosses/telegraphs off-screen,
orientación de láseres/audio, búsqueda en limpieza, dispersión de drops/meteoros
y optimización puramente visual. Pendientes anteriores siguen vigentes.

### Corte anterior publicado: L5 — dificultad adulta y escuadras

Windows: releases/NEON-VOID-0.10.0-alpha-windows-6fhn6g.
Web: releases/NEON-VOID-0.10.0-alpha-web-GHamSZ.
QA: previews/adult-l5-integral/desktop-qa.json, pass:true, saved:true,
playing y errors:[]. Edge integral sin excepciones ni peticiones externas;
suite final 152/152 y tres módulos de gameplay coinciden en ambos paquetes.
Diez bosses × Fácil/Difícil verificados en previews/difficulty-adult-l5;
regresión Normal en previews/difficulty-adult-normal-regression.
Las escuadras usan puntos cercanos anunciados; el test verifica protección real
del Guardia al Arquero después de aparecer, sin aumentar el cap de enemigos.
Lanzador actualizado sólo después de QA. Dy7Xpi sigue como versión anterior;
no se borran partidas ni entregas en este corte. Pendientes: mediciones con
equipo alcanzable, varias semillas y compras; dificultad de Fácil, economía de
partidas completas, HUD, dirección artística/lore/audio y publicación.

### Corte anterior publicado: L4f — bosses, composición, compras

Windows: releases/NEON-VOID-0.10.0-alpha-windows-Dy7Xpi.
Web: releases/NEON-VOID-0.10.0-alpha-web-vlDVwN.
QA: previews/systemic-l4f-final/desktop-qa.json, pass:true, saved:true,
playing y errors:[]. Suite 152/152; Edge integral y prueba consumible reales
sin errores; siete módulos coinciden por hash en ambos paquetes. El lanzador
apunta al EXE verificado. vE11Xl anterior se conserva; no se borran partidas/builds.
No se modificó duración, victoria, world metrics ni audio en L4f. Sí cambió
gameplay (patrones/composición/validación consumibles) y balance de recompensa
sólo en Historia full-roster. Siguen pendientes validación de equipo alcanzable,
economía de runs completas, comprensión humana, arte/lore/audio y publicación.

### Corte anterior: M6/L4e — cabezales y Némesis

Windows: releases/NEON-VOID-0.10.0-alpha-windows-vE11Xl.
Web: releases/NEON-VOID-0.10.0-alpha-web-iXYYCM.
QA final: previews/laser-heads-m6-published. Electron pass:true, saved:true,
playing y errors:[]; cinco módulos cambiados coinciden por hash con fuentes.
Launcher actualizado después de verificar. F99AFO previo se conserva como respaldo.
Se eliminan sólo los intermediarios no publicados ZDDXHR y lhvx4t de este corte,
regenerables desde fuentes. No se eliminan partidas ni entregas anteriores.
Pendientes: COLOSO/FANTASMA/MUTANTE/APOCALIPSIS, medición completa de Némesis,
dificultad con autoataque, economía y revisión humana de duración/HUD/arte/audio.

### Corte anterior: L4c/L4d, emisores y medición real

Entrega vigente: releases/NEON-VOID-0.10.0-alpha-windows-F99AFO; web:
releases/NEON-VOID-0.10.0-alpha-web-0iYMNX. Launcher actualizado sólo después de
Electron pass:true, guardado:true, playing y errors:[]. Fuentes empaquetadas
coinciden por hash con las fuentes probadas. iukQJD anterior preservada.
No se borró ninguna entrega ni partida en este corte; una sola build por plataforma.

- GUARDIÁN: el hueco antes apuntaba al piloto, regalando evasión inmóvil.
  Ahora desplaza un carril, prioriza una salida alcanzable dentro de la arena y
  muestra guía cian corta. Aviso Normal 1,05 s, recuperación 1,5 s; fase dos
  alterna anillo de 12 posiciones (11 balas) con abanico de tres. Las trayectorias
  se fijan al avisar. Sin homing, inmunidad de fase ni cambios de HP/daño.
- DESTRUCTOR: alterna tres lanzas paralelas desde tres tubos con abanico de
  tres; en fase dos el abanico usa cinco carriles. Orígenes reales dibujados y
  ejecutados, aviso y recuperación existentes. No se cambiaron HP/daño.
- Mapa: venteo y grieta se presentan como láseres de emisores fijos, tres pares
  en los bordes, un carril activo. Montajes visibles en reposo, indicador de
  carga y núcleo luminoso dentro de la banda roja de colisión. Layout compartido
  engine/render, arena real (no referencia fija); permanecen visibles con NO HUD.
  Exclusiones boss/evento/transición conservadas; los montajes no colisionan.
  Se conservan claves internas vent/rift para compatibilidad de sonido/telemetría.
- Tanque: alcance del cañón 310 -> 440 px, para actuar antes de morir en la
  aproximación contra armas largas. Conserva 0,9 s de aviso, snapshot, obús y
  recarga; no cambia HP, daño ni velocidad. No es una auditoría completa del roster.
- Suite 151/151; prueba guardian_encounter: hueco geométrico, esquina, dos fases,
  puntería fijada y recuperación. boss_encounters cubre ambas lecturas del
  Destructor. sector_encounters cubre soportes compartidos; enemy_director_c2
  prueba disparo del tanque a 420 px. Runtime dirigido sin excepciones en
  previews/guardian-lasers-final-v2; recorrido integral en guardian-lasers-integral;
  fuentes finales y QA Electron en guardian-lasers-published. Tutorial ahora
  respeta NO HUD sin completarse, reiniciarse ni perder pasos.

Medición en Historia REAL, oleada 8, Normal, BOTI 120 HP, autoataque, sin especiales,
consumibles o mejoras. Seed reproducible, seis peleas completas; controlador
small-step sólo oscila 90 px horizontalmente, NO equivale a jugador experto:

| Arma | Quieto | Oscilación pequeña |
| --- | --- | --- |
| Rifle Nv1 F0 | Derrota 18,6 s | Derrota 27,5 s |
| Rifle Nv10 F0 | Derrota 16,7 s | Derrota 39,1 s, jefe con 267 HP |
| Láser Nv25 F2 | Derrota 14,4 s | Victoria 15,2 s, quedan 71 HP |

Reporte: previews/guardian-full-story/full-story-fights.json, errores [].
El arma avanzada sí puede trivializar el encuentro con movimiento pequeño,
confirmando el feedback. Pero cambian arma, nivel y fusión a la vez: NO atribuir
la brecha sólo al láser ni justificar un nerf global. Falta mismo nivel/fusión,
arma corta y Fácil/Difícil, progreso alcanzable en run real y consumibles.
Herramienta reutilizable: measure_boss_roster.cjs --full-story --boss-index=3;
sin boss-index recorre diez. Checkpoints sólo en perfil QA descartable.

Control adicional en Difícil, mismo Nv25/F2 y misma oscilación de 90 px:
Subfusil derrota 36,9 s (jefe 1522/2452 HP); Rifle derrota 18,9 s
(jefe 771/2452 HP); Láser victoria 17,4 s (piloto 50 HP). Archivo
previews/guardian-matched-hard/full-story-fights.json, errors:[]. Esto refuerza
la necesidad de comparar armas, pero una muestra sembrada por arma no establece
una tasa de victoria. Los IDs históricos short/medium/long de ese reporte son
etiquetas del fixture, NO medidas de alcance: Subfusil 360, Rifle 480, Láser 450.
La herramienta ahora usa IDs por arma y registra outcome explícito; wave_end
con boss HP 0 significa victoria, player_dying significa derrota. HP negativo
en los reportes antiguos representa el impacto mortal, no HP jugable restante.

Prioridad siguiente: presión/TTK y utilidad de economía con equipo realmente
alcanzable, luego cinco bosses restantes y resto de verbos; no dar por resuelto
el desafío por estas seis muestras. Mantener M2 provisional sin otra regla de
victoria unilateral. Emisores múltiples simultáneos siguen sin implementarse.

### Feedback nuevo: dificultad real con autoataque y peligro integrado al mapa

- Evaluación principal SIEMPRE con autoataque. Una prueba de daño aislado o
  modo manual no demuestra desafío. El jugador informa que incluso moverse
  muy poco basta y que el equipo mata enemigos antes de que ejecuten su rol.
- Medir combates completos, tiempo hasta matar, frecuencia real de ataques y
  decisiones necesarias con equipo habitual, base y avanzado. Priorizar
  composición/ritmo y acciones tácticas; no resolver sólo aumentando HP o
  agregando cuotas de movimiento. Fácil accesible no significa partida automática.
- La regla de oleadas finitas sigue sin aprobación: no reforzarla por inercia.
- Tienda sin utilidad percibida: armas, mejoras y consumibles son prescindibles;
  elegir una sola arma convierte la partida en paseo. Investigar daño/alcance,
  composición enemiga y recursos en runs con autoataque, sin compras, compras
  dirigidas y consumibles. Crear ventajas tácticas comprensibles y oportunidades
  de uso, no bloquear progreso exigiendo comprar ni nerfear todo a ciegas.
- Propuesta autorizada para diseño ambiental: sustituir el venteo/franja abstracta
  por emisores visibles y persistentes en los bordes de la arena. Identidad física
  del cañón -> carga reconocible -> rayo entre extremos -> descanso. Horizontal
  o vertical, intensidad progresiva, corredores de escape reales; evitar cerrar
  simultáneamente todas las salidas. Dibujo del rayo y colisión deben coincidir.
  Primera versión implementada en el corte actual: revisar coexistencia
  con bosses, tamaños de pantalla, NO HUD y presupuesto de render. No añadir otra
  mecánica ambiental duplicada encima del venteo existente.


### Nuevo corte: M4, claridad M2/M3 y L4b

Cierre publicado: Electron `pass: true`, guardado y partida, sin errores.
Lanzador apunta a `releases/NEON-VOID-0.10.0-alpha-windows-iukQJD`; web:
`releases/NEON-VOID-0.10.0-alpha-web-OZYztD`. Build anterior ORgWct conservada.

- Aparición autorizada: aviso discreto 0,9 s -> nube 0,22 s -> enemigo activo.
  Comunes, élites y esbirros reservan presupuesto durante el aviso, sin IA,
  contacto, targeting, daño ni fusión. El Lab conserva fixtures inmediatos.
  Si el piloto ocupa el punto al terminar aviso/nube, éste se muda con margen
  a una esquina distante y repite el aviso. Pisar marcas no elimina enemigos,
  no regala bajas y no cancela definitivamente el spawn. Todo usa dt, no timeouts.
  Render sin partículas persistentes, textos nuevos ni flashes adicionales.
- M3 básico: desaparece la franja SECTOR/UMBRAL del combate normal; contador de
  jefes integrado en upper-left y ocultable con NO HUD. La franja inferior sólo
  comunica un desafío opcional elegido. BAJAS usa derribos reales (sin contar
  desapariciones por fusión); FALTAN APARECER incluye avisos/nubes pendientes.
- M2 provisional: segundos junto a OLEADA y fase LIMPIEZA tras el tiempo mínimo.
  NO cambian fórmula de duración, barra combinada ni condición de victoria.
  Asalto finito vs reloj puro sigue pendiente de juicio humano, no aprobado.
- L4b: Señor del Vacío alterna tres portales con miras desde sus orígenes reales
  y abanico central; fase dos duplica ese abanico. Aviso con puntería fijada,
  recuperación y caps. No cambio de HP/daño global ni resistencia secreta.
  Arte/comportamiento definitivo de esbirros y playtest completo siguen abiertos.
- Suite 150/150. Prueba `enemy_arrival` cubre ciclo, ocupación, caps, targeting,
  daño y Lab; `boss_encounters` amplía portales, snapshot, invocación y fase dos.
  Edge integral en `previews/arrival-m4-final/`, jefe dirigido en
  `previews/lord-l4b-final/` y fuentes finales en `previews/arrival-m4-published/`.

M1 cerrado: `149/149`, QA Edge específico `previews/spawn-inside-m1-focused/`
con 1.406 frames de oleada 3 y cero centros enemigos exteriores; oleada termina
en tienda y NO HUD oculta el indicador añadido. El recorrido integral anterior
pasó sus pasos, pero el caso añadido no cerró porque el fixture heredaba disparo
manual del Lab; el caso dirigido corregido usa autofire explícito y movimiento.
Esto es validación técnica con equipo fuerte, no aprobación de dificultad por niño.
Electron `desktop-qa.json`: `pass: true`. Lanzador actualizado a
`releases/NEON-VOID-0.10.0-alpha-windows-ORgWct`; web
`releases/NEON-VOID-0.10.0-alpha-web-g1EiUM`. No se cambió duración ni meta de oleada.
Las builds anteriores permanecen disponibles.

1. **M1, bloqueo crítico:** spawn interior de comunes/élites/esbirros, distancia
   inicial del piloto y contención de movimiento/empujes. No conceder victoria
   falsa, matar/eliminar al enemigo exterior ni descartar bajas para ocultar el bug.
   Respetar posiciones explícitas y escenarios intencionales del Laboratorio.
   Corregir el indicador nuevo que ignoraba NO HUD. Publicar tras prueba oleada 3.
2. **M2, duración y fin de oleada:** mantener provisionalmente las reglas actuales;
   revisar si recuperar barra de tiempo creciente, cómo explicar limpieza y si
   requiere fase diferenciada. Separar temporizador, bajas y victoria. No aplicar
   otra regla de cierre unilateral antes de presentar el resultado del análisis.
3. **M3, jerarquía HUD:** lenguaje común (bajas/enemigos pendientes en vez de
   jerga), información indispensable mínima, detalles en panel opcional; explicar
   zonas sólo donde ayude a navegar. Revisar desktop/móvil/texto grande y NO HUD.
   No sustituir etiquetas por otras más largas ni trasladar el ruido al centro.
4. **M4, aparición anunciada (ya implementada arriba):** marcadores breves dentro de arena,
   señal -> aparición -> interacción, contraste y costo de render. Inspiración
   Brotato, NO copia exigida; bloquear spawn al pisarlos es opcional, no decidido.
   Evitar spawns injustos sobre piloto; caps, checkpoint y conteos incluyen un
   futuro estado pendiente sólo si se implementa y prueba el sistema completo.
5. Después retomar bosses, verbos y medición/economía del plan anterior. Revisar
   dependencias y descartar propuestas que sólo agreguen ruido, objetivos
   artificiales o contenido sin decisiones. Feedback humano es insumo de diseño,
   no una obligación de implementar cada idea inmediatamente.

## Implementado y comprobado

- Guardar/salir y disposición de tienda: botón desplegar compacto a la derecha,
  preparación opcional en diálogo y sin scrollbar interno del panel.
- Especiales acotadas contra bosses; proyectiles con colisión de núcleo y barrido.
- Tanque con cañón, snapshot y recarga; Escopuras con movimiento interpolado.
- Primera zona: asaltos finitos, grupos pendientes explícitos, barra ligada a
  tiempo mínimo y limpieza. No exige recorrer una distancia. Boti base inmóvil
  perdió en Fácil y Normal en navegador real.
- Diez bosses accesibles en una Historia nueva de veinte oleadas, alternando
  asalto/jefe. Guardados anteriores mantienen su ruta. Infinito/Lab no cambian.
- Lobby, manual, contador de jefes y final explican qué termina y qué se conserva.
- JEFE y TITÁN: dos lecturas anunciadas. Ventanas por dificultad, no sólo HP.
- Peligro ambiental rojo, texto corto, pulso con los dos bordes de colisión;
  círculo de presión de boss con borde fijo. Capturas y pruebas geométricas.
- Matriz actual: diez bosses × tres equipamientos, 4,5 s en Normal y ROOK quieto.
  Todos los escenarios recibieron daño. Esto NO demuestra derrota antes de
  matar al jefe ni justicia de un combate completo, y usa oleadas canónicas del Lab.

## Pendientes que requieren implementación/investigación local

1. Completar matchups y ajuste humano de COLOSO, FANTASMA, MUTANTE y APOCALIPSIS;
   sus dos patrones/fases recibieron L4f. GUARDIÁN/DESTRUCTOR/NÉMESIS recibieron L4c/L4d/L4e; medir sus matchups.
   Señor del Vacío recibió L4b, pero faltan playtest completo y arte de esbirros.
   Mantener caps y no confundir implementación de patrones con diversión aprobada.
2. Medir tiempo hasta victoria/derrota con armas de rango corto/medio/largo, base
   y avanzadas, en Historia real (no confundir su HP con oleada 5–50 del Lab).
   Verificar presión inicial, fase dos, espacio de escape y recuperación.
3. Auditar cada enemigo: señal -> consecuencia -> contrajuego. Evitar llenar
   pantalla de etiquetas nuevas o usar un dash como solución universal. Revisar
   prioridades tácticas, fusiones, composición y oportunidades de cambio de arma.
4. Consolidar el resto del lenguaje hostil en comunes/espectros/élites/minas/Core.
   Ya comparten familia roja pero muchos renderers siguen usando constantes
   locales. No recolorear identidad del cuerpo como si fuera zona de daño.
5. Revaluar economía/arsenal de Historia con diez bosses: L4f normaliza su ingreso
   fijo a 460; diez cofres por misión aún pueden cambiar potencia y duración. No aplicar nerf global
   por una sola muestra o introducir resistencia secreta a armas.
6. Pulir arte/íconos/audio/lore según capturas y preferencias humanas. No se ha
   aprobado un reemplazo artístico completo. Mantener rendimiento y accesibilidad.

## Pendientes de aprobación humana y publicación

- Fácil para adolescentes/adultos: desafíos legibles pero reales, no victoria
  inmóvil o por paseo. Probar equipo habitual; después contrastar Normal/Difícil.
- Dos Historias completas: duración, dificultad, interés, compras y comprensión
  del final. Señalar boss/dificultad/arma/nivel/fusión para reproducir feedback.
- Audio con auriculares y parlantes; mando real, escalado/DPI y hardware objetivo.
- Arte/licencias/edad/precio y material comercial. La alpha no es aprobación Steam:
  integración, cuenta, firma/distribución y publicación necesitan decisiones externas.

## Próximo corte exacto

Leer estado local y `DIFFICULTY_BOSSES_VISUAL_2026-10-01.md`; comprobar launcher y
build actual. M1/M4 y claridad básica M3 cerrados; evaluar ritmo M2 y avanzar
presión real de oleadas, potencia alcanzable y utilidad de tienda; comparar
matchups tardíos con evasión real y compras; Némesis/Coloso tienen primeras seis
peleas cada uno documentadas en SYSTEMIC_L4F_2026-10-01.md. No asumir aprobadas duración/estética; cerrar
prueba dirigida/suite/runtime/Electron antes de abrir otro boss. No commit/push.
Preservar la última build buena y mantener documentos/reportes dentro de JuegoDemo.
