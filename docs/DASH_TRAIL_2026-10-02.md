# Dash estelar — continuación cerrada del 02-10-2026

Continúa la fase6 de ARENA_ADAPTATION_2026-10-02.md. No reinicia la adaptación
de bosses/arena, no implementa otra cámara y NO representa terminar el plan
maestro completo del juego. Se preservaron todos los cambios locales anteriores.

## Referencias y comparación visual

Se inspeccionaron las tres imágenes locales de `Desktop/REFERENCES IMG`:
`Captura de pantalla 2026-09-26 152919.png`, `153012.png` y `152848.png`.
No se incorporaron imágenes con watermark/checkerboard ni dependencias externas.

- Primera: ribbon curvo fino, nube densa de micropuntos y cola gradual.
- Segunda: núcleo blanco, tint, distintas escalas de brillo y estrellas largas
  muy ocasionales. No copiar su estrella terminal como sprite pegado al piloto.
- Tercera: puntos dorados y destellos4 puntas distribuidos sobre trayectoria fina.

La primera galería resultó demasiado estrecha y con estrellas grandes demasiado
raras; se corrigieron dispersión, tamaño y proporción. Se comparó visualmente la
galería final y frames de juego real Web/Electron contra las referencias. La
adaptación mantiene su lenguaje, no promete identidad pixel a pixel: el dash
actual recorre84 unidades en0.15s; no se lo alargó para imitar una ilustración.

Capturas bajo `previews/dash-trail-2026-10-02/`: `web-verified/dash-gallery.png`,
`packaged-combat/frame-*.png`, `repeat-*.png`, `boss-laser-dash.png` y
`electron-dash-*.png`. La galería dibuja curvas con el renderer real; la física
actual bloquea dirección al iniciar dash, por lo que la curva de galería es una
prueba visual del seguimiento de una trayectoria, NO nueva capacidad de giro.

## Implementación y valores

Se amplió `js/engine/fx.js` sobre el MISMO `trails[]`. No hay un segundo sistema
de partículas, cámara, arena o fuente de bounds.

- Segmentos `dashStar` con posiciones world-space reales pre-movement/post-clamp.
- Emite sólo cuando `NV.updatePlayerDash()` devuelve true, incluyendo el último
  frame cuando su flag `dashActive` ya se apagó. Desplazamiento cero no emite.
- Vida0.42s; afterimage con alpha/tamaño/densidad decrecientes. Pause congela vida;
  transiciones usan la limpieza existente del array.
- Subdivide cada desplazamiento en tramos≤5 unidades (cap32 por emisión).
  Cap96 entradas para emisión, pool96; cleanup compacto in-place.
- Micropuntos generados por hash cosmético sin objetos por punto y sin consumir
  Math.random del combate. No compiten con el pool de explosiones.
- Núcleo blanco .65px y halo de línea teñida3.5px, afinados por vida.
- Estrellas medianas radio3 cada4 muestras y grandes radio7.5 cada13 muestras,
  con variantes4/6/8 puntas. No se estampan estrellas enormes en cada frame.
- Halos32×32px generados una vez por tint; caché≤8 sprites. Nada de gradients
  por micropunto/frame, shadowBlur masivo, DOM visible o assets descargados.
- Tint: `player.color` de BOTI/NOVA/ROOK/ENJAMBRE. Geometría compartida.
- Caminar conserva su efecto circular anterior, sin estrellas. Se reemplazó el
  polvo legacy de dash, no se agregó otro efecto encima.

### Visual budget

High/full:12 micropuntos por tramo y halo cacheado en estrellas. Reduced:5;
densidad inferior admite3 si el budget conserva partículas. Auto/minimal y
`particles:false` dejan0 micropuntos, pero conservan núcleo y starbursts.
Los tiers bajos apagan halo secundario y reducen grandes destellos. High/Auto/
Performance NO alteran desplazamiento, speed, stamina, cooldown, duration,
invulnerabilidad, daño, enemigos, AI ni proyectiles.

Movement.js, balance.js, viewport.js, HUD/CSS y entidades de gameplay no fueron
modificados en esta continuación. Se agregó sólo snapshot readonly de estadísticas
de estela, calculado cuando se solicita para QA.

## Pruebas y rendimiento

`npm test`: **157 suites,0 fallos**, log `tests-final.txt` en el directorio de
previews. Nueva `dash_star_trail.js`:4 pilotos, no caminar, tint, mundo, trayectoria,
física idéntica entre calidades, expiry, cap, pool, bloqueo en pared y RNG prohibido.
La prueba histórica `ambient_fx.js` esperaba literalmente el polvo reemplazado;
se actualizó ese contrato a emisión/render de estela, preservando todas las
aserciones del fondo. No se desactivó una regresión de gameplay.

Syntax checks FX/game/tests/harness/desktop y `git diff --check` correctos.
Suites existentes de movimiento/dash, bosses, arena, cámara, colisiones, móvil,
hostile budget, oleadas, cleanup y Lab siguieron pasando.

QA Edge real, headless/software:8 combinaciones, cuatro pilotos en Alta,
BOTI Auto/Rendimiento y dos layouts móviles emulados. Cada caso verifica caminar,
dash diagonal, segundo dash horizontal/vertical, pausa y expiración. Un caso
adicional usa Guardián maduro,4 refuerzos y dos láseres activos junto al dash.
Hay galería y microbenchmark de Canvas real, no únicamente asserts estáticos.

Stress integrado A/B,1800 frames, seed1337,30 hostiles iniciales, boss, refill,
X/puff y láser; dash sintético84 unidades/0.15s cada2s. Mismo combate, no RNG
decorativo. Canvas contador: coste CPU parcial, NO raster, input real ni FPS.

| Calidad | p95 update antes/después ms | p95 draw antes/después ms |
|---|---|---|
| High | .201/.203 | .294/.517 |
| Auto | .192/.191 | .307/.507 |
| Performance | .209/.207 | .284/.339 |

Cap30/heavy7 conservados; máximo observado30/2, láser activo en los tres modos.
Microbenchmark Edge final de36 tramos (casi dos dashes): legacy círculos≈.005ms,
High≈.322ms, Performance≈.143ms/draw. Halo cacheado precalentado. No es comparación
equivalente de complejidad visual ni garantía de rendimiento en otra máquina.

Combate empaquetado real: ventana de240 frames p95 frame16.7ms, update.3ms,
draw1.1ms. Electron en5 casos: p95 frame16.7–16.8ms, draw1.4–2.4ms. La primera
ventana de carga de Web fuente tuvo un p95 frame33.4ms/draw6.2ms; se conserva en
el reporte, no se oculta. Estas ventanas cortas mezclan intro/arranque y dash;
no sustituyen una prueba prolongada ni perfil GPU de hardware real.

## Web y Electron

Entregas NUEVAS finales, anteriores intactas:

- Web: `releases/NEON-VOID-0.10.0-alpha-web-nskIDv`.
- Windows: `releases/NEON-VOID-0.10.0-alpha-windows-aRBIL9`.

Se empaquetó una sola vez cada destino después de corregir y validar el arte.
`packaged-combat/report.json`:10 grupos aprobados, errors[], incluyendo combate
maduro y coste aislado. `desktop-qa.json`: pass/saved/dash/perimeter true, errors[].
EXE real con perfil QA aislado y ventana oculta;5 casos dash +9 posiciones y
3 stages de perímetro. No se modificó el perfil o guardado del jugador.

70 archivos index/JS/CSS/assets coinciden por SHA256 Web/Electron; JS/CSS/assets
también coinciden con las fuentes. Desktop main coincide con fuente. Index es
normalizado por el builder para excluir overlay3D experimental. No diferencias
de implementación encontradas; los guardados web/app continúan separados.

`JUGAR NEON VOID.cmd` actualizado sólo tras aprobar paquetes. Cerrar el juego
anterior por completo para que su single-instance lock no enfoque la versión vieja.

## Archivos de esta continuación

- Runtime: `js/engine/fx.js`, `js/game.js` (emisión/render/snapshot).
- QA: `tools/verify_alpha.cjs`, `tools/performance/stress_harness.js`,
  `desktop/main.cjs` (flag opcional QA, no cambia partida habitual).
- Tests: `tests/dash_star_trail.js`, `tests/ambient_fx.js`.
- Docs: este informe, ARENA_ADAPTATION, README, AI_START_HERE, ARCHITECTURE, TESTING.
- Launcher: `JUGAR NEON VOID.cmd`.

No commit/push/staging/reset/restore/clean ni eliminación de releases. No se
reanudaron cambios grandes del master plan: esta pasada cierra la estela pendiente.

## Validación humana pendiente

Abrir el launcher, elegir Alta y usar Shift con cada piloto. Evaluar estética en
movimiento (no únicamente captura), legibilidad entre enemigos y gusto visual.
Probar Rendimiento/Auto, partidas largas, hardware real y teléfono físico. No se
garantizan cero bugs universales ni FPS por los resultados headless/offscreen.
