# Adaptación a arena mayor que cámara — 2026-10-02

## Punto de partida y alcance

Checkout `master` con numerosas modificaciones previas: se conservan. Baseline:
154 suites / 0 fallos. Cámara y perímetro anterior finalizados en Web y Electron;
arena desktop 1350×780, vista 900×520, exterior visual 28. No modificar esas
autoridades ni el HUD, CSS, físicas de dash, HP o daño para aumentar densidad.

## Auditoría dirigida

| Sistema | Hallazgo local | Acción de esta pasada |
|---|---|---|
| Boss movement | amplitudes absolutas heredadas; Y casi siempre cerca de 100 | perfiles propios de desplazamiento en mundo, engagement y recuperación |
| Boss attacks | origen capturado en windup; balas con gracia al entrar en cámara | preservar origen; no iniciar nuevo cast oculto sin ventana visible |
| Boss support | coordinator intenta refill, pero spawnEnemy retorna si hay boss | permitir sólo normales con autorización explícita del coordinator; presupuesto único |
| Sector lasers | excluidos por cualquier boss | matriz compatible; grupos pequeños y alternancia con casts, mismo engine |
| Density | soft 16..28 sin compensar área 2.25×; escuadras eligen rincón más lejano | compensación acotada + distribución de encuentros cerca del jugador, dentro de arena |
| Spawn warning | anillo/muescas rosa; cuerpo oculto también durante puff | reemplazar por X roja; aparición al terminar .9s; puff .22s con cuerpo visible |
| Spawn safety | aviso ocupado se muda y repite; también se muda al terminar nube | conservar reaviso antes de aparecer; nunca trasladar una entidad ya materializada |
| Autofire/ranges | targetability excluye arrivals; distancias son de mundo | preservar rangos y adquisición; no limitar simulación a vista |
| Minions/pickups/chests/meteors | usan arena W/H; recompensas boss protegidas en transición | conservar; cubrir integración y resize |
| Ranged/hazards | grace de cámara .30s balas / .55s hazards, telegraphs world-space | pruebas dirigidas y mantener simulación fuera de cámara |
| Dash/VFX | trails circulares de movimiento + partículas durante dash | referencias obligatorias ausentes: solicitar antes de implementar fidelidad |
| Performance | cap 30 hostiles / 7 heavy; baseline sintético guardado | conservar caps; repetir stress y verificar browser real |

## Orden y continuidad

1. Movimiento de bosses y fairness de inicio de cast.
2. Refill secundario, matriz láser, densidad/distribución.
3. X/puff y pruebas de lifecycle.
4. Estela compartida sólo después de recibir y estudiar las tres imágenes.
5. Suites, performance, Web, empaquetado final Electron y alineación.

Las tres imágenes no llegaron con el TXT (la carpeta del attachment contiene
únicamente Texto pegado.txt). Se solicitaron; el usuario contestó «SI», pero
todavía no se recibieron. No declarar fidelidad ni fase 4 terminada sin ellas.

Futuro fuera de alcance: balance global de todas las armas, rediseño de lore/HUD,
reestructurar duración de expedición, o aumentar hard cap sin evidencia.

## Informe de implementación (18 puntos)

### 1–3. Consecuencias, correcciones y futuro

Se corrigieron las amplitudes/banda superior heredadas de bosses, los dos bloqueos
de soporte/ambiente, la dispersión al rincón más lejano y la densidad sin compensar
área. La validación real descubrió otro bloqueo: `updateSpeakerMines` borraba TODO
hazard durante boss. Creaba un láser distinto en warning cada frame, sin llegar a
disparar. Ahora el owner de minas sólo retira minas; láseres y core zones sobreviven.
Los casts se alternan con el ambiente y no comienzan ocultos sin gracia visible.
Se añadió protección de cámara a pulsos de fusión descubiertos tarde.

Autofire/drone targeting ya usa distancias de mundo y excluye arrivals. Meteoros,
pickups/cofres y reconciliación de resize ya usan arena; se conservaron rangos,
recompensas y simulación fuera de cámara. No se cambió HP/daño, tamaño de arena,
cámara, exterior28, CSS/HUD, duración/objetivos de oleadas ni física de dash.

Futuro: balance de builds/armas a largo plazo, diversidad adicional de eventos,
lore/HUD y publicaciones comerciales no son parte de esta adaptación acotada.

### 4. Bosses en mundo

`updateBossWorldMovement` tiene perfiles de diez identidades. Chase persigue un
flanco; Titán/Coloso hacen barridos diagonales a ritmos diferentes; invocador se
retira; Guardián orbita; Destructor/Mutante serpentean; Fantasma y Apocalipsis
usan órbitas más amplias/rápidas. Todas las metas dependen de W/H reales y del
piloto, no de `viewX/Y`. Las velocidades base van de100 a200 unidades/s; fase2
aplica×1.15 al movimiento. No se modificaron velocidades/estadísticas del jugador.

Engagement con histéresis: si se aleja más de500, regresa hacia un punto próximo;
sale de esa recuperación a menos de320. Evita alternancia brusca en el umbral.
Se mueve durante recovery, no durante windup/fire: origen y miras quedan fijados.
Némesis anuncia durante.5s el destino de un salto; si el piloto lo ocupa cancela
ese salto. Cooldown1.6s de movimiento. El destino respeta el margen del cuerpo.
Si estuvo oculto, un cast nuevo espera.6s visible antes del windup habitual.

### 5–6. Soporte y ambiente compartidos

El coordinator autoriza `allowBossSupport` sólo en producción. Se usa el mismo
spawner/selección/minWave/dificultad/arrival y `getHostileBudget`; no bypass ni
spawner paralelo. Boss cuenta como1 hostile/1heavy. Lab conserva su encuentro
aislado. No se agregan élites por refill durante boss.

Targets totales iniciales Easy5 / Normal7 / Hard9 (4/6/8 acompañantes). +1 a w20,
+2 máximo desde w40. Refill gradual: Easy1 cada3s, Normal1 cada2.5s, Hard2 cada2s;
summons existentes ocupan el mismo presupuesto y pueden superar temporalmente el
soft, nunca el hard. Las bajas permiten reposición, no un bloque instantáneo.

Matriz `BOSS_SECTOR_COMPATIBILITY`:

| Ataque | Láseres ambientales durante boss |
|---|---|
| repeater / heavy / spread / volley / bomb / orbs / split | 2 por grupo |
| beam / summon / rage | excluidos para no saturar lectura |
| Umbral sin hazard / eventos especiales / transición / Lab | excluidos |

Reutiliza `sectorLaserPattern`, renderer, colisión6, voces de carga/sustain y
camera grace. Espera6.5s iniciales y un recovery del boss; después carga1.65s,
activo2s, retirada.55s, cooldown8s. Un cast ya anunciado o presión idle impide
arrancar el grupo; durante warning/activo, el boss espera antes de otro cast.
Normal mantiene sus grupos2/4/6 y cooldown4.2s. En Corazón del Vacío los bosses
compatibles usan el láser existente en lugar de superponer el pulso radial.
Las core zones de enemigos conservan su lifecycle/camera safety, no se habilitan
minas, bombas ni lluvia de élites indiscriminadamente.

### 7. Densidad: valores reales antes/después

Compensación `clamp(round((sqrt(arenaArea/refArea)-1)*8),0,4)`. Desktop2.25×:
+4 al soft, máximo28. Mobile más ancho sigue acotado+4. Hard cap30/heavy7 intactos.

| Oleada | Easy | Normal | Hard |
|---|---|---|---|
| 1 | 16→20 | 18→22 | 20→24 |
| 5 | 18→22 | 20→24 | 22→26 |
| 10 | 20→24 | 22→26 | 24→28 |
| 15 | 22→26 | 24→28 | 26→28 |
| 25 | 24→28 | 26→28 | 28→28 |

Refill ordinario×.86 en arena grande, mismo piso.35s y mismos batches2..5. W1
sin evento:1.265s→1.0879s. W10:.95s→.817s. Se evita además que élites rellenadas
después del lote normal excedan los slots soft restantes. No aumento de HP.

Spawns libres:80% a190..330 unidades del piloto;20% conservan población por el
resto de la arena. Misma selección de posición existente y clamp autoritativo.
Escuadras permanecen agrupadas a distancia de lectura, con preferencia por rutas
menos pobladas; no se traslada ningún enemigo activo. En arenas pequeñas se
conserva la distribución anterior. La advertencia de spawn ocupado sigue activa.

### 8–9. X → aparición → puff

De0 a.9s: X roja Canvas2D (dos diagonales, sin emoji/fuente/anillo anterior), fija
en x/y del enemigo reservado. A.9s desaparece la X y el cuerpo ya se renderiza.
Puff procedural de9 lóbulos/centro durante.22s, detrás del cuerpo; a1.12s termina
la protección previa de IA/contacto/targetability. Tiempos nominales, por dt.
No se crean entidades adicionales ni otro contador de oleada.

Si el piloto ocupa el punto ANTES de aparecer, se muda y reavisa.9s completo.
Una vez visible, el puff ya no provoca otra mudanza. Pause no consume dt;
transiciones/cleanup usan el sistema existente. Normal, élite y minion comparten
el hook; élite sigue reservando heavy. Panear cámara no cambia x/y de X/puff.

### 10–12. Estela, referencias y visual budget: COMPLETADO EN CONTINUACIÓN

Las tres referencias finalmente llegaron y se inspeccionaron. Se amplió el mismo
trails[] para los cuatro pilotos con núcleo fino, micropuntos densos, taper,
destellos4/6/8 puntas, tint y halo cacheado. Sólo emite en dash real, incluye su
último frame, sigue desplazamientos de mundo y mantiene física intacta.
Vida0.42s, cap96, pool96, sin RNG de combate. High12 micropuntos/segmento,
reduced5; Auto mínimo/partículas desactivadas quitan sólo micropuntos. Núcleo y
estrellas sobreviven a reducción de calidad; sin halos secundarios en tiers bajos.
Comparación visual, pruebas, rendimiento y entregas finales detallados en
[DASH_TRAIL_2026-10-02.md](DASH_TRAIL_2026-10-02.md).

### 13. Rendimiento

Baseline y final19 escenarios A–S,600 frames, guardados en `previews/arena-adaptation-2026-10-02`.
Son coste CPU de engine/render parcial, NO FPS/raster del juego. A–S usan RNG no
sembrado; variación de conteos/carga y ejecución concurrente impiden atribuir cada
diferencia exclusivamente al patch. Ejemplos p95 (update/draw, ms):

| Caso | Antes | Final |
|---|---|---|
| A30 light | .107/.300 | .131/.329 |
| B23light+7heavy | .197/.684 | .201/.729 |
| Dflame+30 | 1.149/.594 | 1.051/.588 |
| E boss+6heavy | .259/.456 | .277/.445 |
| Jextremo | 1.024/.510 | 1.057/.539 |
| Rflame+minas | .698/.434 | .960/.647 |

Pasada integrada adicional1800 frames, seed1337, High/Auto/Performance: arranque
al cap30, refill de boss, warning/puff, boss moderno, ambiente y render geométrico.
p95 update.172/.181/.189ms; draw.250/.266/.264ms. Láser activo en los tres modos,
cap30/7 respetado. Es Canvas contador, NO garantía de GPU/FPS.

Edge real (headless/software),12 muestras boss: p95 frame16.7..16.8ms,
update0.3–0.4ms, draw0.8–1.2ms. Electron offscreen real Easy/Normal/Hard: frame16.7ms,
update.3/.5/.5ms, draw1.1/1.7/1.3ms. No son prueba de hardware/dispositivo físico
ni benchmark de dash nuevo: corresponden al cierre previo a la estela.
Las mediciones nuevas se documentan en DASH_TRAIL_2026-10-02.md.

### 14. Archivos de esta pasada

- Runtime: js/data/balance.js; js/engine/boss.js, bossEncounters.js, enemies.js,
  enemyArrival.js, sectorEncounters.js, hazards.js; js/game.js.
- QA: desktop/main.cjs; tools/verify_alpha.cjs; tools/performance/stress_harness.js.
- Tests: arena_adaptation.js, arena_adaptation_performance.js (nuevos),
  enemy_arrival.js, combat_lab_lifecycle.js (aserción del nuevo límite soft,
  preservando el guard de Lab; no se debilitaron límites físicos).
- Documentación: este informe, README, AI_START_HERE, ARCHITECTURE, TESTING.
- Lanzador: JUGAR NEON VOID.cmd, sólo después de validar la entrega.
- Previews/reports y releases nuevas dentro del proyecto. Nada agregado a Git.

### 15. Validaciones

Baseline154/0 → final `RESULT run_all: total=156 failed=0`. Dos nuevas suites:
movement/density/support/lifecycle/fairness/integración minas-láser y stress por
calidad. Suites previas de bosses, fairness de proyectiles, cámara/perímetro,
presupuesto, oleadas, móvil, cleanup y Lab conservadas. Syntax checks relevantes
y git diff --check sin errores; revisión diff preserva modificaciones anteriores.

### 16. Web

Fuente: `web-final/report.json`: diez bosses Normal + Guardián Easy/Hard, con
autoataque/pistola1, input real y soporte. Grupos compatibles disparan y se retiran;
sin errores JS. Los5000HP son fixture de observación, NO calibración de dificultad
ni prueba de que un jugador real sobrevive. Gallery spawn-lifecycle observada.
Perímetro: `perimeter-final/report.json`, centro/cuatro bordes/cuatro esquinas en
desktop1280×800 y móviles emulados915×412/844×390, cuatro stages, bounds/cajaHUD
sin cambios, combate/laser y cache estable. No dispositivo físico.

Entrega nueva Web: `releases/NEON-VOID-0.10.0-alpha-web-lEUqwa`.
QA del paquete: `packaged-web/report.json`:14 grupos aprobados,12 muestras de
bosses +desktop/móvil, láser activo exigido en Guardián Easy/Normal/Hard, errors:[].

### 17. Electron

Entrega nueva: `releases/NEON-VOID-0.10.0-alpha-windows-mmQU9C`.
`desktop-qa.json`: pass:true, saved:true, node:undefined, errors:[], perimeter:true,
9 posiciones +3 stages, arena:true. Guardián con soporte y láser activo en las
tres dificultades; fase2 disparada explícitamente en QA para probar integración,
NO atribuida a progresión natural. Perfil aislado, ventana oculta, partida real
del usuario intacta.70 archivos index/JS/CSS/assets coinciden por SHA256 entre
Web y Electron; JS/CSS/assets coinciden también con fuentes actuales. Sólo index
es normalizado por el builder para quitar el overlay3D experimental previo.
No diferencia funcional pendiente encontrada; guardados web/app siguen separados.
Releases anteriores conservadas; launcher actualizado para abrir mmQU9C sólo
después de aprobar Web empaquetada y Electron real. Cerrar el juego anterior
antes de abrirlo: el single-instance lock puede enfocar un EXE viejo ya abierto.

### 18. Pendientes humanos y continuidad

La estela pendiente se completó al recibir las referencias. Entregas finales
actuales: Web `NEON-VOID-0.10.0-alpha-web-nskIDv` y Windows
`NEON-VOID-0.10.0-alpha-windows-aRBIL9`; el apartado16–17 conserva evidencia del
cierre anterior sin la estela. Baseline final157/0. El launcher abre aRBIL9.
Queda validación humana del gusto visual y hardware físico, no implementación
pendiente de la estela. Este cierre NO significa terminar todo el plan maestro.
Prueba sugerida: autoataque en Easy y Normal, recorrer arena, Guardián con refuerzos
y láser, comparar presión/safe exits. Probar builds compradas y partidas largas,
audio con auriculares, hardware/teléfono físico. Ajustes de balance posteriores
deben basarse en ese feedback, no en fixtures QA de HP5000.

No commit/push, reset/restore/clean, descartes ni eliminación de releases.
