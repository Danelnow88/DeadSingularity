# Testing

## Remaster de especiales — 02-10-2026

`special_visual_remaster.js`: fixture mecánico determinista previo/post idéntico,
render puro en4×3 tiempos×3 budgets, radio dinámico autoritativo,6 paneles en
minimal, contactos≤4/eventos≤24, cleanup, cero RNG y reflejo/impacto reales.
Los asserts antiguos de NOVA conservan daño, acumulación, kills, anti-boss y
radio; sólo se actualizan nombres/colores y la ubicación del renderer delegado.

QA Edge: `node --experimental-websocket tools/verify_alpha.cjs BASE OUT
--special-remaster --special-mobile`. Usa `desktop/special-qa.cjs` compartido con
el EXE:4 pilotos×3 dificultades en desktop/landscape, quality High/Performance/
Auto forzado a minimal, pausa/fin, dos stages,4 esquinas por plataforma, atlas
de tres tiempos y coste Canvas aislado. Fixtures HP5000 son de diagnóstico,
NO prueba de dificultad ni partida del usuario. Atlas e impactos sintéticos
no deben confundirse con capturas de un combate natural.

Electron empaquetado: `"NEON VOID.exe" --nv-qa --nv-special-qa
--nv-qa-report=RUTA_ABSOLUTA`; añade `--nv-perimeter-qa` para regresión de cámara.
Ver informe SPECIAL_REMASTER_2026-10-02.md y previews/special-remaster-2026-10-02.

Las pruebas automáticas son headless y se ejecutan con Node.js. Validan lógica, integración estática y contratos de módulos; no sustituyen pruebas visuales en navegadores y dispositivos reales.

## Adaptación a arena grande — 02-10-2026

Baseline154/0 → final156/0. `arena_adaptation.js` cubre perfiles de diez bosses,
regiones X/Y, bounds, casts fijos, densidad+4 acotada, soporte/caps, X/puff,
gracia de cámara y pipeline minas→láser. `arena_adaptation_performance.js` añade
High/Auto/Performance con seed1337 y caps. Continuación de estela completada:
`dash_star_trail.js` lleva el baseline a157/0; cuatro pilotos, caminar sin estrellas,
desplazamiento real, último frame de dash, física/calidad independientes, mundo,
expiry/cap/pool y cero RNG de combate. Ver `DASH_TRAIL_2026-10-02.md`.

QA específico: `verify_alpha.cjs BASE OUT --dash-trail` (galería, input real,
diagonal/vertical/horizontal/repetido, desktop/móvil, boss+soporte+láser y coste
Canvas aislado). Electron: `--nv-qa --nv-dash-qa --nv-perimeter-qa --nv-qa-report=ABS`.
Stress A/B: `stress_harness.js --arena-integration [--dash-fx] --frames 1800`.
El stress mide CPU con Canvas contador, no raster/FPS; QA Edge y Electron sí usa
Canvas real, pero sigue siendo headless/offscreen, no hardware móvil físico.

Web: `previews/arena-adaptation-2026-10-02/web-final/report.json`; 12 muestras
de bosses con autoataque e input real, los10 Normal y Guardián Easy/Hard. Las
activaciones láser se exigen, no sólo la presencia de warning. Esto detectó una
regresión integrada donde el owner de minas borraba todo hazard al haber boss;
se corrigió y se añadió test del pipeline completo.
Perímetro: `perimeter-final/report.json`, 27 posiciones en desktop/dos móviles
emulados, cuatro stages y laser. Electron real: `desktop-qa.json`, pass/saved,
perimeter y arena true, errors[], soporte/láser/fase2 en las3 dificultades.
Fixtures HP5000 y fase2 diagnóstica NO validan balance de una partida natural.

Comandos adicionales:

```powershell
node --experimental-websocket tools/verify_alpha.cjs http://localhost:8080 previews/arena-recheck --arena-adaptation
node tools/performance/stress_harness.js --arena-integration --frames 1800 --json previews/arena-stress.json
```

EXE final: `--nv-qa --nv-perimeter-qa --nv-arena-qa --nv-qa-report=RUTA_ABSOLUTA`.
No usar el perfil del jugador. Nuevas flags QA no afectan el inicio habitual.
Sintaxis y diff check correctos;70 archivos de juego coinciden Web/Electron.
No se modificaron cámara/perímetro/CSS/HUD/dash physics; no commit/push.

## Cierre de perímetro y ventana — 01-10-2026

Baseline actual: `RESULT run_all: total=154 failed=0`. camera_foundation:19,
camera_perimeter:9. Syntax checks y git diff --check sin errores (warnings CRLF
no son fallos). Pruebas de perímetro incluyen filamentos fuera de arena y
fallback sin Path2D; no se debilitan los asserts de física/zoom.

Edge fuente final: previews/perimeter-polish-final-preserved/report.json, 11 grupos. Centro,
cuatro bordes y cuatro esquinas en desktop1280×800 y móvil táctil emulado
915×412/844×390; cuatro stages, bosses y láseres. Comparación DOM antes/después
verifica la caja superior HUD idéntica; regresa aim/pausa/resize en cinco layouts.
Edge empaquetado final: previews/perimeter-polish-packaged-preserved-final/report.json.
Electron REAL: previews/perimeter-polish-final-preserved/desktop-qa.json, pass:true,
perimeter.pass:true,saved:true,errors:[], nueve posiciones y otros tres stages.
70 archivos de juego idénticos web/Windows; fuentes JS/CSS/assets iguales por SHA256.
Launcher actualizado después de verificar; builds anteriores preservadas.
La regla full-bleed móvil se descartó al detectar cambio de arena: el QA final
compara EXACTAMENTE caja/bounds con la medición anterior. Ver nota en el informe.
Se corrigió además un fixture de recorrido que ganaba con autoataque móvil
railgun50 antes de terminar las esquinas; los asserts no se debilitaron.
No equivale a teléfono físico ni garantía FPS. Informe: PERIMETER_POLISH_2026-10-01.md.

Repetición: `node --experimental-websocket tools/verify_alpha.cjs
http://localhost:8080 previews/perimeter-recheck --perimeter-only`.
Electron: `NEON VOID.exe --nv-qa --nv-perimeter-qa --nv-qa-report=RUTA_ABSOLUTA`.
Cerrar el perfil QA al terminar; nunca usar perfiles/checkpoints del jugador.

## Cierre de escenarios cósmicos — 01-10-2026 (anterior)

Baseline y final: RESULT run_all: total=153 failed=0. Sintaxis de todos los JS
tocados; sector_visuals cubre cuatro composiciones distintas, cache estable,
tiers reales, mundo, RNG, resize y fallback; diagnósticos/rhythm actualizados
para no exigir grilla eliminada. Diff check y revisión de cambios sin errores.
QA específico reproducible: `node --experimental-websocket tools/verify_alpha.cjs
http://localhost:8080 previews/cosmic-backgrounds-visual-final --backgrounds-only`.
17 grupos, desktop y móvil táctil emulado 915×412/844×390; atlas completo,
movimiento, calidad, boss/hazards y cambio real 10->11. Capturas inspeccionadas.
Regresión de cámara en cosmic-backgrounds-camera: cinco layouts y cuatro bordes.
Regresión integral y Electron en cosmic-backgrounds-integral-final, errors:[],
guardado restaurable y playing. No claims de FPS o prueba en teléfono físico.
Detalle, archivos y límites: COSMIC_SCENARIOS_2026-10-01.md.

## Cierre de cámara foundation — 01-10-2026 (anterior)

Suite final: RESULT run_all: total=153 failed=0. camera_foundation: 19 casos,
cámara central y cuatro clamps, conversiones desplazadas, resize/fullscreen,
desktop, móvil, fallback, culling de mundo, colisión real off-screen y reaviso.
Pruebas de contratos anteriores actualizadas sólo donde ahora arena!=vista;
no se relajan checks de aim, bounds o controles para esconder regresiones.
Edge dirigido táctil: previews/camera-foundation-touch-final; cinco layouts,
recorrido físico por todos los bordes, cursor, dock, pausa, NO HUD y resize.
Capturas desktop/móvil inspeccionadas. Regresión integral de fuentes finales
en previews/camera-integral-final: guardados, tienda, muerte, diez jefes,
láseres y ausencia de excepciones/peticiones externas. Electron desktop-qa.json:
pass:true, saved:true, playing y errors:[]. Diez módulos coinciden por hash con
ambos paquetes y el HTML Windows incluye cameraSafety. Launcher actualizado
después de verificar; no se borran builds previas. Stress sintético de 19
escenarios en previews/camera-integral/performance-stress.json, no garantía FPS.
Informe de arquitectura/archivos y segunda etapa: CAMERA_FOUNDATION_2026-10-01.md.
Móvil emulado, no validación física; fullscreen comprobado a nivel de contrato.

## Cierre L5 — 01-10-2026 (anterior)

Suite final: RESULT run_all: total=152 failed=0. Edge integral y Electron en
previews/adult-l5-integral: sin excepciones, guardado restaurable y estado playing.
boss_encounters cubre patrones avanzados de Difícil y capas sin reorientación;
enemy_director_c2 cubre agrupación dentro de arena, aviso, cap y protección real
del Guardia tras aparecer. Runtime dirigido: diez jefes × Fácil/Difícil en
previews/difficulty-adult-l5; regresión Normal y láseres dirigida separada.
Tres módulos de gameplay verificados por hash en paquetes Windows/Web.
Stress sintético: 19 escenarios, previews/adult-l5-integral/performance-stress.json;
no es promesa de FPS en hardware del usuario.
Público adolescente/adulto; el balance no está aprobado: en mediciones de una
semilla el láser avanzado aún ganó con poco movimiento. Ver comparación honesta
en DIFFICULTY_ADULT_L5_2026-10-01.md y pendientes operativos.

## Alpha 0.10 — 30-09-2026

Actualización local M6 01-10-2026: 152 archivos de prueba, cero fallos. El baseline
145 de abajo es histórico. Cierre actual: previews/guardian-lasers-integral
(recorrido completo) y guardian-lasers-published (fuentes finales/Electron).
guardian_encounter cubre hueco real, bordes y segunda fase. sector_encounters
comprueba layout compartido en cuatro tamaños y render sin mutación. NO HUD
también oculta tutorial opcional, no avisos de combate.

Cierre M6: previews/laser-heads-m6-published/report.json (Edge dirigido) y
desktop-qa.json (Electron, pass:true, saved:true, playing, errors:[]).
sector_laser_groups cubre grupos 2/4/6, carga, HUD, colisión fina y retirada;
audio_sector_music cubre voz agregada y cancelación. boss_encounters cubre
pinza/abanico de Némesis. Runtime dirigido cubre tres tamaños y pausa/mute.
No sustituye medición de peleas completas ni evaluación sonora humana.

L4f: mismo total 152/152; boss_encounters comprueba dos patrones y ambos estados
de fase en cuatro bosses tardíos. economy_curve_h comprueba pago productivo,
presupuesto full-roster y aislamiento legacy/Infinito. consumables comprueba
precondición antes de gasto y HP real; combat_lab_lifecycle conserva fixture
legacy explícito. Edge integral en previews/systemic-l4f-final; consumible real
en previews/consumables-l4f. Medición completa Normal con autoataque en
previews/nemesis-full-story y previews/coloso-full-story (sin compras/consumibles).

Medición completa con autoataque y HP real de Historia, aislada de guardados:
`node --experimental-websocket tools/measure_boss_roster.cjs http://localhost:8080 previews/medicion --full-story --boss-index=3`.
Opcionales: `--matched-builds`, `--small-step-only`, `--difficulty=easy|normal|hard`.
Sin boss-index recorre diez bosses; cada caso tiene límite 60 s (timeout no es
victoria). Compara quieto/oscilación horizontal 90 px, no representa bot experto.
Para sólo QA visual de portales/Guardián/Destructor/emisores: verify_alpha.cjs
con `--guardian-only`. No confundir este fixture con la medición de dificultad.

Resultado final de referencia: `RESULT run_all: total=145 failed=0`.
La suite `sector_visuals.js` valida perfiles, mapeo de oleadas, presupuesto de
operaciones y wiring del fondo sectorial; el contrato visual del Mutante vive en
`spectral_enemies_render.js`.
La prueba de audio añade regresión para el drone con frame congelado.
`sector_encounters.js` verifica geometría bloqueada, aviso sin daño, impacto único,
exclusión con bosses/eventos/transiciones y render sin mutación.
`audio_sector_music.js` verifica cuatro firmas musicales, cambio por oleada y
prioridad perceptual del aviso ambiental.
`economy_curve_h.js` verifica costes progresivos, calibración tardía y frecuencia
de escuadras por dificultad.
`ux_onboarding_gamepad_i.js` cubre tutorial, texto grande, mando y loop único.
`release_candidate_j.js` cubre marca, empaquetado, diagnóstico y warm-up visual.

`node --experimental-websocket tools/verify_alpha.cjs http://localhost:8123` prueba
un Edge aislado contra `node tools/serve.js 8123`. Reporte y capturas en
`previews/alpha-verification/`. Incluye muerte real, victoria, compras/contrato,
ruta, guardado/restauración, Mutante fase 2 y desktop/móvil. La victoria usa un
checkpoint controlado y HP del jefe reducido: es QA del flujo, no balance humano.

La build Windows tiene `--nv-qa`: perfil temporal, render fuera de pantalla y
salida `DESKTOP_QA` con resultado de inicio/combate/aislamiento. No toca guardados.
El ejecutable normal no expone herramientas Node al renderer.

Desde L1, `tools/verify_alpha.cjs` también inicia el primer boss en Combat Lab,
deja al piloto inmóvil y comprueba que la presión anti-espera quite HP real;
captura el aviso de tres carriles del segundo patrón. La prueba usa el runtime
de producción en Edge, pero no sustituye evaluación humana de dificultad.

Consultar `ALPHA_RELEASE.md` para alcance y limitaciones. Los baselines más abajo
son históricos y no reemplazan este resultado.

## Syntax checks

```bash
node --check js/core/viewport.js
node --check js/game.js
```

Resultado esperado actual: ambos procesos terminan con código `0` y sin salida.

## Targeted mobile tests

```bash
node tests/mobile_compat.js
node tests/world_metrics_noop.js
node tests/dynamic_viewport.js
node tests/dynamic_arena.js
node tests/lobby_foundation.js
node tests/ui_foundation.js
node tests/settings_foundation.js
node tests/enemy_family_lod.js
node tests/weapon_sfx_engine.js
node tests/player_damage_pipeline.js
node tests/hostile_budget.js
```

Conteos verificados el 7 de septiembre de 2026:

| Suite | Pass | Fail |
| --- | ---: | ---: |
| `mobile_compat` | 38 | 0 |
| `world_metrics_noop` | 10 | 0 |
| `dynamic_viewport` | 16 | 0 |
| `dynamic_arena` | 12 | 0 |
| `lobby_foundation` | 5 | 0 |
| `ui_foundation` | 5 | 0 |
| `settings_foundation` | 5 | 0 |
| `enemy_family_lod` | 5 | 0 |
| `weapon_sfx_engine` | 11 | 0 |
| `rifle_manual_aim` | 14 | 0 |
| `enemy_intent_foundation` | 21 | 0 |
| `runner_flank` | 17 | 0 |
| `player_damage_pipeline` | 9 | 0 |
| `hostile_budget` | 14 | 0 |
| `loadout_slots` | 12 | 0 |
| `consum_hud` | 8 | 0 |
| `hud_layout` | 14 | 0 |
| `performance_foundation` | 15 | 0 |
| `stress_harness` | 8 | 0 |
| `speaker_mines` | 30 | 0 |
| `rhythm_analysis_render` | 17 | 0 |
| `meta_widget_integration` | 13 | 0 |

## Weapon audio tests

```bash
node tests/audio_mixer.js
node tests/audio_spatial_mix.js
node tests/audio_menu_fatigue.js
node tests/weapon_sfx_engine.js
```

`weapon_sfx_engine` instrumenta un contexto Web Audio falso y valida presets, crack directo y comprimido, muzzle, sub/thump, tail, boom puff, crackle, split y saturación de tres bandas, dos ecos, Haas, escopeta inmediata, adaptación decorativa del SMG, barrido de plasma, lanzallamas continuo, mute y propiedad de gameplay sobre cadencia/proyectiles.

Las pruebas headless verifican arquitectura y secuencias de eventos, no calidad perceptual. Antes de aprobar definitivamente los presets deben escucharse en gameplay real: disparo único, tres disparos, un segundo a cadencia real y varios segundos sostenidos para rifle, subfusil y lanzallamas.

## Rifle manual aim (F04)

```bash
node tests/rifle_manual_aim.js
```

Verifica la identidad del Rifle como primera arma habilidosa sobre los módulos reales (`weapons`, `bullets`, `inputIntent`, `boss`, datos): disparo manual exacto a lo largo de `aimVector` sin autocorregir al enemigo, precisión sin spread/recoil (serie de disparos idéntica), cadencia que respeta el intervalo `25/60` con un press = un disparo, legacy-auto con la MISMA pipeline apuntando al más cercano, contrato de pierce explícito (`pierce` = TOTAL de objetivos; rifle 2 = primario + 1), penetración finita exacta (daña 2, tercero intacto, bala muere), conservación de nivel/fusión, pausa/reset sin doble disparo, cambio de política sin duplicado, móvil→legacy-auto por la misma pipeline, independencia del dash (no altera daño/pierce/cadencia/velocidad) y `waveWeaponMult` desconectado en producción (documentado, sin habilitar el scaler global).

## Responsive browser check

Con `node tools/serve.js` ejecutándose:

```bash
node tools/verify_viewports.js
```

La herramienta calibra el viewport interno de Edge headless y cubre, entre otros casos, móvil landscape `915x412`, móvil landscape `844x390` y desktop reference `900x520`. Verifica clases de capacidad/orientación, Dynamic View en landscape móvil, canvas/lobby inicializados y ausencia de excepciones JavaScript. Las fórmulas runtime se validan por separado en `dynamic_viewport` y `dynamic_arena`. Sigue siendo validación automatizada de navegador, no prueba en dispositivo físico.

## Performance diagnostics

```bash
node tools/diagnostics/enemy_anim_profiler.js
node tools/diagnostics/hydra_lod_benchmark.js
```

Estos comandos reportan CPU headless, operaciones y unidades raster ponderadas. No son mediciones de FPS real. `hydra_lod_benchmark.js` compara 1, 6, 7, 10 y 12 instancias de la familia visual Hidra en `high`, `auto` y `performance`.

### Stress harness (P2/P3/P3.1/P3.1.1)

```bash
npm run measure:performance
```

Ejecuta A–S durante 600 frames sobre módulos reales de engine/render y guarda el
reporte en `previews/release-j/performance-stress.json`. Verifica presupuestos de
hostiles, minas, notas y partículas. **Es baseline CPU comparativo, no frame real
de browser ni garantía de FPS en otro hardware.**

## Playtest telemetry

Activar en la partida normal con `?playtest=1`; consultar los agregados desde la consola con `NV.playtest.snapshot()`. La telemetría opt-in sirve como baseline humano de uso y cambios de armas y de encuentros con jefes (tiempo de simulación y daño por arma/fuente). Prueba dirigida: `node tests/playtest_telemetry.js`.

`weapons.byId[id].normal` acumula tiempo equipado y disparos sin encuentro de jefe activo, y daño exclusivamente a enemigos normales (incluso si coexisten con un jefe). `hits` cuenta aplicaciones; `rawDamage` es el daño tras resistencias/protección, `effectiveDamage` es HP realmente eliminado, `overkillDamage` su diferencia y `kills` cuenta transiciones de HP positivo a no positivo. `bySource` separa `direct` (incluida penetración), `pellet` (cada pellet), `splash`, `bounce` (cadena del Bow), `flame` (cono) y `burn` (DoT atribuido a su zona de origen). Disparos cuentan pulsaciones, no proyectiles; los especiales, meteoros, consumibles y reflejos no se atribuyen a armas.

`weapons.byId[id].progression` registra el estado real de progresión reportado por gameplay: `currentLevel`/`currentFusion` (último hecho observado), `maxLevelSeen`/`maxFusionSeen` (máximos de la run) y `firstLevelSeen`/`firstFusionSeen` (primer uso). Cada encuentro de jefe guarda `bosses.completed[n].weaponStateStart` y `weaponStateEnd` con `{ id: { level, fusion } }` de las armas poseídas, para separar poder por progresión del poder por daño base.

## Full suite

```bash
npm test
```

`npm test` ejecuta `tests/run_all.js`, que descubre todos los archivos `tests/*.js` excepto su propio runner.

### Input foundation

```bash
node tests/input_foundation.js
```

Verifica aim mundial normalizado, independencia movimiento/aim, hold-LMB con cadencia, ausencia de autocorrección manual, compatibilidad nearest-target, cambio de política sin doble pipeline, pausa/reanudación, fallback móvil y transforms de viewport.

### Controlled movement

```bash
node tests/controlled_movement.js
```

Simula a 120 Hz aceleración, parada, inversión, diagonal, Overdrive y el sistema de dash (F03) sobre el módulo real (`engine/movement.js`). Verifica identidad por personaje, cap permanente, compatibilidad de saves, ausencia de mutación de stats base, pausa/reanudación, ruta móvil compartida y update O(1) sin allocations explícitas. En dash cubre: coste exacto (`100→0` en dos dashes), rechazo por debajo del coste, delay `0.8–1.0s`, recuperación completa (`~3–4s`), press-edge (mantener Shift no re-dispara), re-press, dirección `move→aim→último`, sin invuln/daño, pausa/latch sin dash espurio y reset.

Baseline histórico verificado el 9 de agosto de 2026:

```text
RESULT run_all: total=80 failed=2
```

### Rifle manual-aim identity (F04)

```bash
node tests/rifle_manual_aim.js
```

Verifica identidad del Rifle (damage 20, cadencia 25, rango 480, pierce 2), disparo manual exacto a lo largo de `aimVector` sin autocorrección, precisión sin spread/recoil, cadencia respetada, legacy-auto por la misma pipeline, contrato pierce explícito (2 = primario + 1), penetración finita exacta, conservación de nivel/fusión, pausa/reanudación sin doble disparo, cambio de política sin duplicado, móvil por pipeline compartida, dash sin alterar stats, `waveWeaponMult` desconectado y proyectil legible.

### Enemy intent/state foundation (F05)

```bash
node tests/enemy_intent_foundation.js
```

Valida el vocabulario mínimo de estado/intent (`idle`/`positioning`/`windup`/`attack`/`recovery`/`retreat`), helpers baratos (preferredRange, flankOffset, retreatVector, attackMovementFactor, separationCandidate), ciclo de vida (create/update/reset), timers, no compartición de estado entre enemigos, persistencia entre ticks, compatibilidad legacy (`updateEnemies` funciona con o sin intents), presupuesto intacto (30/7) y pausa sin drenar timers.

### Runner as Flanker (F06)

```bash
node tests/runner_flank.js
```

Convirtió el Runner (`id: 'runner'`) de persecución directa a flanqueador. Verifica selección/persistencia de lado (`flankSide`), state machine (`APPROACH`/`COMMIT`/`RECOVERY`), objetivo desplazado del centro durante COMMIT (sin corrección magnética), recuperación que crea separación, sin cambio rápido de lado, death-on-contact preservado, speed caps (145 base, ~177 en minas, cap 260), presupuesto intacto (30/7) y stress con múltiples Runners.

Baseline histórico verificado el 10 de septiembre de 2026:

```text
RESULT run_all: total=82 failed=2
```

## Historial de fallos previamente conocidos

### `kamikaze`

```text
RESULT kamikaze: pass=10 fail=1
```

Este fallo pertenecía a un baseline histórico y ya no aparece en la suite completa actual.

### `lab_model_hitbox`

```text
RESULT lab_model_hitbox: pass=6 fail=1
```

Este fallo pertenecía a un baseline histórico y ya no aparece en la suite completa actual.

## Política de regresiones

El baseline actual es el resultado verificado el 29 de septiembre de 2026: 130 suites y 0 fallos (exit code 0). Las suites adicionales son `playtest_telemetry.js` y `weapon_progression_attribution.js`. Cualquier suite fallida, aumento en el número de fallos o cambio inesperado en una prueba dirigida es una regresión hasta investigarlo.

```text
RESULT run_all: total=130 failed=0
```

Antes de desplegar:

1. comparar los resultados con este baseline;
2. detener el deploy si aparece una regresión nueva;
3. documentar el resultado exacto;
4. realizar validación visual/manual cuando el cambio afecte layout, input, audio o render.
