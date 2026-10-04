# NEON VOID — Cosmic trap y presencia de UI (03-10-2026)

IMPLEMENTADO y verificado localmente. Sin commit ni push. Conserva el remaster
de audio anterior y los cuatro diseños de personajes aprobados. La valoración
musical final requiere escucha del usuario, no la certifican picos ni RMS.

## Pedido y diagnóstico

El usuario pidió una base más enérgica, motivadora, cósmica/electrónica con
percusión trap cuidada, y acciones de interfaz más presentes. Detectó percusión
superpuesta sin flow y timbres artificiales. En las fuentes había un bajo en
otra cuadrícula, fills de ruido sobre la caja, pads más un drone independiente,
y pasos recuperados del dt que podían dispararse juntos tras un frame lento.

## Cambios

- Un único secuenciador existente, ahora con instantes absolutos de AudioContext
  y anticipación de 120 ms. No usa timers adicionales ni reloj de gameplay.
- Combate 144 BPM; boss 148 BPM. Sectores comparten tempo y difieren en armonía,
  síncopas, velocidades de hats y timbre. Menú/tienda mantienen ritmos relajados.
- Kick definido, 808 afinado que sigue los mismos onsets con sustain y glide
  corto, caja a medio tiempo (pulso 3) y cuerpo grave coherente. No se apila otra
  batería ni se suman cajas en los fills.
- Hats con velocidades, pequeños contratiempos/swing y rolls de tres golpes
  al cierre de frase: reemplazan un hat, no lo duplican.
- Progresiones menores i–VI–III–VII, motivos con respuesta, pads del mismo
  acorde, arpegios de impulso y un respiro. Frase de 16 compases, sin drone
  independiente que choque con el siguiente acorde.
- Scene/sector se incorporan al siguiente compás. Después de una pausa larga
  se recupera desde un compás limpio: no se reproduce toda la deuda de golpes.
- Confirmaciones/clics: triángulo con cuerpo, ataque corto filtrado y quinta
  para confirmar/abrir. Amplitud principal 0.025 → 0.065; hover sigue discreto
  (0.009 → 0.014). Compra/venta y selección de arma también más presentes.
- No se subieron globalmente los sliders ni se sobrescriben preferencias.
  Mixer, mute, seis categorías, RNG aislado y límite global 48 voces intactos;
  música sigue limitada a 14. La primitiva admite at/hold/glideTime de forma
  compatible con los SFX existentes.
- Laboratorio abre en Combate y explica la escucha de al menos 30 segundos.
  Se invalidó la caché de voices/synth en index.html.

No se modificaron jugabilidad, dificultad, armas, cooldowns, geometría ni HUD
durante esta pasada. Había actividad simultánea de otra tarea en spawn,
documentación y generación de paquetes: esos cambios se conservaron tal cual.

## Entrega y concurrencia

- Cerrar la instancia vieja y abrir `JUGAR NEON VOID.cmd`.
  Windows activo: `releases/NEON-VOID-0.10.0-alpha-windows-SJV3DV/NEON VOID.exe`.
- Web fuente: `index.html`. Web empaquetada activa:
  `releases/NEON-VOID-0.10.0-alpha-web-J1T5Zf/index.html`.
- La otra tarea incorporó el nuevo icono de spawn y generó estos paquetes con
  el audio actualizado. Se verificaron sus fuentes y su EXE REAL, y se dejó su
  lanzador intacto. No sustituirlo por una versión que pierda el nuevo spawn.
- Esta tarea había generado y aprobado antes Web `Y1FI0y` / Windows `4e1UQ5`.
  Eran entregas intermedias verificadas, NO las del lanzador activo final.
  Sus dos carpetas generadas se eliminaron al cerrar: 387.804.477 bytes
  (369,84 MiB). Son compilaciones regenerables; no se enviaron a Papelera.
- Escucha aislada: `ABRIR_AUDIO_LAB.cmd`. Combate → Activar música; esperar
  30 segundos. Probar también Boss, Fundición y Confirmar/Comprar/Volver.
- GitHub Pages NO se actualizó. No hay commit, push ni cambios al índice Git.
- No se borraron fuentes, partidas, respaldos ni documentos/entregas de otras
  tareas. Sólo se quitaron las dos compilaciones intermedias propias indicadas.

## Verificación

- `npm test`: 163 suites, cero fallos. Nueva audio_groove: reloj absoluto,
  igualdad de onsets a 30/60 FPS, kick/808, caja única, sustitución de hat por
  roll, sustain/glide, cambio de escena al compás, mute/hidden y recuperación.
- Syntax checks: synth, voices, audio-qa, verify_alpha y verify_audio_build.
- Web fuente + laboratorio y Web empaquetada: once escenarios OfflineAudioContext
  de las fuentes reales, UI real sin duplicar foco+clic, sin errores runtime.
  Se renderizaron 32 segundos por sector/boss para cubrir las cuatro frases.
- Electron EXE real, perfil QA aislado: inicio, checkpoint, partida, cuatro
  pilotos con especiales y audio, salida 0; errores vacíos. Se repitió en
  `SJV3DV`, el paquete que realmente abre el lanzador tras el cambio de spawn.
- QA compartido de pilotos (`--pilot-production`) también pasó en Web.
- 76 archivos runtime Web/Electron idénticos por SHA256 y coincidentes con
  fuente (HTML empaquetado elimina el experimento 3D, igual en ambos paquetes).
- Once escenarios: silencio total al mutear; máximo observado 32 voces en
  mezcla densa; pico máximo de muestras 0.6522 (armas). Combate ≈0.20–0.21,
  RMS ≈0.027–0.031. Diferencia máxima Web/Electron 5.96e-8.
- `git diff --check`, revisión de diff/status. Sin descartar cambios previos.

Evidencias: `previews/audio-groove/{web,web-active,electron-active,pilot-production}`,
WAVs para escuchar y `tests.log`. Repetir alineación final con:

    node tools/verify_audio_build.cjs releases/NEON-VOID-0.10.0-alpha-web-J1T5Zf releases/NEON-VOID-0.10.0-alpha-windows-SJV3DV previews/audio-groove/web-active/report.json previews/audio-groove/electron-active/report.json

Las guías agent-browser/agent-browser-verify orientaron las comprobaciones;
al no estar disponible esa CLI se usó el verificador CDP de Edge del proyecto.
Una comprobación auxiliar `--pilot-live-view` perdió su variable de
instrumentación; no hubo errores de juego. No se da por aprobada esa prueba.
Se añadió `--port=...` al verificador para evitar compartir puerto de navegador
con otra tarea y se validaron los cuatro pilotos con el QA compartido existente.

Pendiente histórico ajeno: la comprobación general boss-idle-pressure fallaba
también en la build anterior (ver AUDIO_REMASTER_2026-10-02.md); no se alteró
gameplay ni se debilitó esa prueba para cerrar una tarea de música.

## Archivos de esta pasada

js/audio/synth.js, js/audio/voices.js, index.html,
dev/audio-remaster/index.html, desktop/audio-qa.cjs, tests/audio_groove.js,
tools/verify_alpha.cjs, tools/verify_audio_build.cjs, README.md,
docs/AI_START_HERE.md y este informe. El lanzador se preservó de la otra tarea.

## Próximo paso

Escucha humana en una partida y en el laboratorio: confirmar si el groove,
presencia de la UI y timbre cumplen el gusto buscado. Sigue siendo síntesis
procedural: no se promete sonido de una producción musical de estudio ni
mastering LUFS/true-peak certificado. No volver a rediseñar sin ese feedback.
