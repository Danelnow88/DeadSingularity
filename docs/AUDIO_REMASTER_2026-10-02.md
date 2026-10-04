# Remaster de audio — 2026-10-02

Estado: IMPLEMENTADO, integrado y verificado localmente en Web y Electron.
Sin commit ni push. Falta escucha humana para aprobar el gusto y comodidad final.

## Dirección

Tecnología cósmica tangible: núcleo grave limpio, energía afinada, texturas filtradas y aire entre eventos. Armas breves y reconocibles; peligros y daño por encima de recompensas; música con frases, descansos y transiciones musicales. No aumentar volumen ni tono indefinidamente para representar progreso.

## Auditoría inicial

- Un AudioContext y seis buses existentes: se conservan preferencias y API.
- El combo crecía 40 Hz y 0.008 de ganancia por baja, sin techo.
- Disparos construían muchos buffers, filtros, distorsionadores y ecos; limpieza de grafos incompleta.
- Ruido y variación utilizaban Math.random compartido con gameplay.
- El ducking podía subir una categoría silenciosa; faltaba protección global de salida.
- La percusión de música enviaba ruido al bus ambiente; hats tonales de 8–14 kHz.
- Especial genérica para cuatro pilotos; faltaban dash, UI y avisos de enemigos.

## Orden y cierre

1. Voces compartidas con presupuesto, limpieza, RNG de audio y protección de salida.
2. Paleta completa de efectos, armas y hooks semánticos sin cambiar mecánicas.
3. Composición procedural por frases, estados y sectores.
4. Pruebas de contratos, mezcla renderizada, laboratorio y navegador.
5. Build Web y Electron de la misma fuente, validación del ejecutable y lanzador.

Los informes se guardan en previews/audio-remaster. La escucha humana prolongada sigue siendo necesaria; una prueba automatizada no certifica gusto ni comodidad auditiva.

## Entrega y cómo probar

- Juego Windows: cerrar cualquier instancia vieja y abrir `JUGAR NEON VOID.cmd`.
  Apunta a `releases/NEON-VOID-0.10.0-alpha-windows-muq6N4/NEON VOID.exe`.
- Web local: `index.html`, o la entrega offline
  `releases/NEON-VOID-0.10.0-alpha-web-NlKGLo/index.html`.
- Sonidos individuales: `ABRIR_AUDIO_LAB.cmd` abre `dev/audio-remaster/index.html`.
  No carga partida ni modifica progreso. Tiene música por estado/sector, diez
  armas, ráfagas, especiales, consumibles, UI, daño, recompensas y peligros.
  «Detener todo» corta también lanzallamas y láseres continuos.
- GitHub Pages NO fue actualizado: esta tarea prohíbe publicar.
- Respaldo conservado: Windows `mh6vEs` y Web `38UTJD`, anteriores al remaster.
  Se quitaron únicamente los paquetes generados más antiguos `7a9PJk` / `vhwktw`
  (387.793.292 bytes, aproximadamente 370 MiB). No fueron enviados a Papelera;
  son compilaciones regenerables desde sus fuentes correspondientes, no partidas
  ni recursos originales. No se borró el respaldo inmediatamente anterior.

## Reporte de los 23 puntos solicitados

1. **Arquitectura encontrada.** `NV.audioCtx` único; mixer con music, weapons,
   sfxUI, sfxPlayer, sfxEnemies y sfxAmbient; preferencias persistidas existentes.
   Se conserva esa autoridad y API: no se agregó otro mixer, motor musical,
   conjunto de sliders ni sistema de eventos de gameplay.
2. **Problemas.** Combo con pitch/gain sin techo, demasiados nodos por disparo,
   buffers repetidos, limpieza incompleta, RNG compartido con gameplay, ducking
   que podía amplificar una categoría tenue, percusión en bus equivocado y
   avisos/acciones sin sonido. Ver auditoría inicial arriba.
3. **Identidad.** Energía cósmica con núcleo grave, armónicos afinados, aire
   filtrado y colas proporcionadas. Recompensa: intervalos consonantes separados;
   peligro: pulsos/texturas contrastantes; daño: golpe corporal; UI: señales
   breves centradas. Cuatro especiales son dialectos de la misma paleta.
4. **Mixer/master.** Headroom interno 0.8, compresor suave y saturador acotado
   antes de destination. Sliders y mute conservados. Ducking nunca eleva un bus
   sobre su volumen de categoría. La prueba mide picos de muestras, NO true peak
   intersample ni sonoridad LUFS; no se presenta como un mastering certificado.
5. **Anti-fatiga.** Filtros, ataques suaves, colas cortas, variación limitada,
   atenuación tímbrica de ráfagas y cooldowns SOLO sonoros. Sin alarmas por frame,
   incrementos infinitos de combo ni variación que consuma RNG del combate.
6. **Polifonía.** Allocator compartido: máximo 48 voces; music14, weapons16,
   UI8, player16, enemies12, ambient8, siempre sujeto al techo global. Prioridad,
   descarte/robo, limpieza en onended y fades de salida. Ruido procedural cacheado.
   El máximo observado en la mezcla densa fue 31 voces. No se limitan balas.
7. **UI.** Hover, foco por teclado, selección, confirmar, volver, settings,
   apertura/cierre y error. Delegación evita repetir por hijos del control o
   emitir foco+clic con el mismo gesto. Compras/ventas se sonorizan por resultado.
8. **Armas.** Pistola corta; rifle grave seco; SMG compacta; escopeta con cuerpo;
   sniper con cola profunda; láser tonal filtrado; plasma con sub; lanzallamas
   continuo controlado; arco con cuerda armónica; railgun con descarga descendente.
   Máximo 2–3 capas por disparo, ruido compartido y variación de 3.5% restringida.
   El submix interno se renormalizó de 0.06 a 0.85 porque se eliminaron las
   ganancias enormes del motor viejo; no implica multiplicar ese audio viejo.
9. **Enemigos/bajas.** Normal, élite y boss con peso distinto; bajas simultáneas
   agrupadas. Tanque/escupidor tienen aviso y disparo en el evento real. Otros
   estados de windup/charge/pulse/commit se observan sin mutar IA ni entidades.
   Impactos no letales tienen microfeedback limitado.
10. **Dash.** Barrido de aire y núcleo descendente al inicio real, no cada frame.
    No se cambió deslizamiento, duración, velocidad ni cooldown.
11. **Consumibles.** Siete identidades afinadas en la misma familia, conservando
    efectos, potencia, cargas y tiempos originales.
12. **Pickups/recompensas.** Shards agrupados, recogida de arma diferenciada,
    cofre armónico y fusión por capas acotadas. Se evita una voz por cada shard.
13. **Combo.** Acentos cada cinco bajas, techo de registro y gain; gana armonía,
    cuerpo y estéreo discreto. Combo 50/500 comparte techo, no escala pitch hacia
    un pitido. Frecuencias de acentos hasta 587 Hz y gain por componente ≤0.034.
14. **Daño/muerte.** Daño con cuerpo y alarma tonal más grave, límite de densidad;
    heartbeat doble suave para HP crítico, escudo e identidad única de muerte.
    Se mantiene la lectura narrativa de transición, ahora sobre voces filtradas.
15. **Oleada/victoria.** Entrada/countdown diferenciados; victoria preserva su
    melodía reconocible con síntesis/mixer protegidos y ducking que deja respirar.
    Entrada a tienda y compra tienen confirmación propia.
16. **Bosses/hazards.** Entrada, cambio de fase, diez familias de ataque,
    impacto/derrota; telegraphs, minas, eventos y peligro sectorial. El grupo de
    láseres usa dos voces continuas compartidas, con carga progresiva y timbre
    activo diferente; limpia al salir, pausar, mutear o perder visibilidad/foco.
17. **Música antes/después.** Antes: patrones cortos repetidos, hats altos y
    adaptación ligada al combo. Ahora: frase de 16 compases con viaje/impulso/
    respiro/resolución, progresiones, motivos/respuestas, fills discretos y rests;
    percusión filtrada en music. Menú/tienda/combate/boss y cuatro sectores tienen
    paletas; cambio de instrumentación/armonía al compás. Combo agrega capas,
    no acelera continuamente el tempo. Reloj conserva restos entre beats.
18. **Huecos cubiertos.** Dash, navegación/foco/UI, compras permanentes y errores,
    entrada a tienda, escudos, recogida de arma/cofre, especial por piloto,
    avisos/disparos enemigos, telegraph de boss y microimpactos.
19. **Archivos.** Inventario completo en la sección siguiente. Se preservó el
    cambio previo `--pilot-live-view` y el documento de investigación 3D ajeno.
20. **Tests.** `npm test`: 162 suites, 0 fallos. Syntax checks en los módulos
    modificados; `git diff --check` limpio; revisión de diff/status. Pruebas de
    budgets, robos durante fades, limpieza, RNG aislado, densidad, combo 1–1000,
    especiales, flame/mute/lifecycle, láser en segundo plano, sliders, ducking,
    transiciones semánticas y tempo a 30/60 FPS. Se sustituyeron expectativas de
    presets viejos por contratos del remaster; no se ocultó el fallo de gameplay
    hallado en la prueba general (ver apartado separado).
21. **Web.** QA en Edge con Web Audio real: diez renders OfflineAudioContext
    de las mismas fuentes, más mute real, voces y UI sin duplicación. Laboratorio
    probado clicando todos sus botones. Sin excepciones. Build Web también pasó.
22. **Electron.** `npm run build:windows`, ejecutable final con `--nv-qa
    --nv-pilot-qa --nv-audio-qa`: exit0, guardado/partida/aislamiento, cuatro pilotos
    y audio correctos. 76 archivos runtime idénticos entre fuente/Web/Windows;
    diferencia máxima de peak/RMS entre navegadores: 5.96e-8. Sin assets stale.
23. **Limitaciones.** No se certifica cero fatiga ni gusto con números. Falta
    escuchar sesiones largas en tus parlantes/auriculares y ajustar especialmente
    SMG/lanzallamas sostenidos, música de combate/boss, victoria/muerte, cuatro
    especiales y volumen del láser. No incluye publicación ni integración Steam.

## Evidencia y fallo preexistente encontrado

- `previews/audio-remaster-tests-final.log`: suite completa, 162/0.
- `previews/audio-remaster/web/report.json`: audio real, UI y laboratorio.
- `previews/audio-remaster/web-build/report.json`: entrega Web offline.
- `previews/audio-remaster/electron/report.json`: EXE final, pilotos, audio,
  almacenamiento e inicio real. Capturas de pilotos y diez WAV en esa carpeta.
- Render de diez escenarios: pico mayor 0.65216; densidad 0.31479; mute cero.
  Son pruebas acotadas de 8 segundos (21 para armas), no sesiones largas.
- `previews/audio-remaster/game-flow/failure.json`: la verificación general pasó
  lobby, movimiento/pausa, oleadas Fácil/Normal, tienda, guardar/continuar,
  diez entradas de boss, muerte/victoria/reinicio, tres viewports y roles enemigos.
  NO terminó: esperaba daño aplicado de causa `boss-idle-pressure` y no lo vio.
- Se reprodujo con un probe separado, SIN alterar mecánicas, tanto en la entrega
  anterior `38UTJD` como en la fuente actual. En ambas se llamó la presión pero
  devolvió applied=false, mientras otros ataques sí quitaban HP. Evidencia:
  `idle-baseline/report.json` y `idle-current/report.json` bajo la misma carpeta.
  Es un pendiente de gameplay/verificación, no introducido por este remaster.
  No se modificó el test general para esconderlo ni se cambió invulnerabilidad
  o balance en una tarea exclusivamente de audio. El juego y la nueva build
  siguen iniciando y avanzando; no se declara todo el plan maestro completado.

## Inventario de archivos de esta tarea

- Audio: `js/audio/voices.js` (nuevo), `synth.js`, `weaponSfx.js`, `uiAudio.js` (nuevo).
- Hooks: `js/game.js`, `js/engine/boss.js`, `bossEncounters.js`, `bullets.js`,
  `combat.js`, `enemies.js`, `enemyArrival.js`, `pickups.js`, `special.js`;
  `js/ui/settingsPanel.js`. Sin cambios mecánicos.
- Integración: `index.html` (carga y cache token audio-20261002b),
  `desktop/main.cjs`, `desktop/audio-qa.cjs` (nuevo), `tools/build_release.cjs`,
  `tools/verify_alpha.cjs` (preservando sus cambios anteriores).
- Pruebas: `tests/_audioHarness.cjs` y `audio_remaster.js` nuevos;
  `audio_adaptive_wave.js`, `audio_category_volumes.js`, `audio_mixer.js`,
  `audio_spatial_mix.js`, `audio_ui_shop.js`, `weapon_sfx_engine.js`.
- Laboratorio: `dev/audio-remaster/index.html`, `lab.js`, `controls.js`;
  lanzador `ABRIR_AUDIO_LAB.cmd` nuevo.
- Entrega/continuidad: `JUGAR NEON VOID.cmd`, `README.md`, `docs/AI_START_HERE.md`
  y este informe. Paquetes/evidencia quedan fuera de git por las reglas existentes.

## Próxima sesión

No reconstruir audio ni volver a publicar builds idénticas. Primero recibir
feedback de escucha: sonido concreto, arma/estado, volumen y qué molesta o falta.
Los ajustes serán pequeños sobre presets/mixer actuales. Despachar aparte a
GAMEPLAY & BALANCE la presión del boss y su prueba fallida; no mezclarla con audio.
