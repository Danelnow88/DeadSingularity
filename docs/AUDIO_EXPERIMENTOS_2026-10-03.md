# NEON VOID — Explorador de sonido

Actualización vigente: **DARK V2**. Las tres músicas fueron recompuestas con
64 compases, suspenso y variaciones. Ver `AUDIO_DARK_VARIATIONS_2026-10-03.md`.
Los sonidos de bajas y la referencia permanecen iguales. Las mediciones más
abajo corresponden a V1, no a esta revisión.

Estado: tres músicas y tres sonidos de baja experimentales terminados, probados
y listos para elegir. La soundtrack actual fue valorada positivamente por el
usuario: se conserva como referencia y NO se reemplaza todavía.

## Abrir y usar

1. Abrir `ABRIR_AUDIO_EXPERIMENTOS.cmd`. Funciona como archivo local en Edge/Chrome,
   sin instalar librerías, conectarse a Internet ni abrir una partida.
2. Clic en Actual, Pulsar, Hyperdrive o Gravedad. Cada tarjeta inicia el tema
   desde el inicio o el segmento elegido. Escuchar unos 107 segundos por propuesta,
   o usar «Escuchar desde» para comparar cargas, drops, respuesta y clímax.
3. Elegir una baja: Actual, Crack de núcleo, Pop magnético o Chatarra estelar.
   Probar normal, élite y boss; luego «12 bajas seguidas» y «Combate simulado».
4. «Escuchar bajas sin música» permite juzgar el detalle sin enmascaramiento.
5. Elegir favoritos, pulsar «Copiar elección» y pegar en el chat. Si el navegador
   no permite copiar, el JSON queda visible y seleccionable debajo del botón.

La última selección se conserva sólo en la clave propia del laboratorio
`nv.audioLab.experiments.choice.v1`, nunca en guardados/preferencias del juego.

Ejemplo de elección, NO aprobado todavía:

    { "version": 1, "lab": "neon-void-audio-experiments-20261003", "music": "pulsar", "enemyDeath": "core" }

## Música

- **0 / Actual:** score exacto del juego, sin remezclarlo ni cambiar sus notas.
- **A / Pulsar:** trap orbital melódico, gancho ascendente, 808 sincopado,
  respuesta estéreo y más movimiento del motivo.
- **B / Hyperdrive:** impulso electrónico, kick a negras, bajo sincronizado y
  ostinato rápido con retorno. Una alternativa más bailable que el trap puro.
- **C / Gravedad:** trap más pesado, sub/808 con cuerpo, ruptura corta y hook
  más contenido que gana apertura en el drop.

Comparten el reloj real de producción a 144 BPM y la progresión/forma de 16
compases. El laboratorio fija Umbral/combate para comparar el mismo contexto.
El módulo reutiliza el score como conductor: cada paso se interpreta una sola
vez y se suprimen las notas originales en las alternativas. NO apila otra
batería, NO muta los perfiles sectoriales y NO crea otro motor/contexto de audio.
Las pausas de la referencia siguen dejando aire en las propuestas.

## Bajas

- **0 / Actual:** sonido real de producción, referencia intacta.
- **1 / Crack de núcleo:** transitorio de ruptura, golpe corporal descendente
  y residuo corto de energía.
- **2 / Pop magnético:** compresión elástica, pop y liberación brillante.
- **3 / Chatarra estelar:** ruptura metálica, peso grave y fragmentos breves.

Tres capas por baja, variación de pitch limitada, cooldowns semánticos y mixer
real. Las ráfagas no disparan cien grafos a la vez. Élite y boss cambian peso y
duración, no sólo volumen. No son gritos de personas ni samples descargados.

La ambición del usuario es lograr una baja extremadamente satisfactoria. Eso
requiere aprobación escuchando en contexto, no una afirmación de «top mundial».

## Comparación y seguridad

Ganancias calibradas aproximadamente por RMS contra la referencia, con el mismo
master. Diferencia final en energía de las músicas <0,1 dB y de bajas <0,3 dB
en los renders de QA. NO equivale a LUFS ni igual percepción garantizada: evita
principalmente que una propuesta gane simplemente por tener mucho más volumen.
Se conserva el techo, presupuesto de 48 voces, música14 y buses reales.

«Detener», mute, pérdida de foco y ocultar/cerrar la página liberan música,
ráfagas y armas. El sonido no controla gameplay. No se modificaron balance,
world metrics, enemigos, arte, HUD ni guardados. El wrapper experimental se
carga exclusivamente en dev/audio-experiments/index.html.

## Validaciones

- 164 suites de `npm test`, cero fallos; audio_experiments cubre referencia
  exacta, identidad de arreglos/bajas, reloj compartido a 30/60 FPS, kick/808
  alineados, no superposición, budgets, RNG aislado y mute/hidden.
- Syntax checks de experiments.js, controls.js, qa.cjs y verify_alpha.cjs.
- Edge real headless vía verificador CDP del proyecto: carga, ocho tarjetas,
  playback, selección, teclado, JSON, ráfaga, mezcla, mute, stop y pérdida de foco.
- Layout en 1280×800, 915×412 y 844×390, sin overflow horizontal. Son viewports
  de navegador emulados; no se afirma prueba en teléfono físico.
- Comprobado por HTTP y por file://, que es el flujo que usa el lanzador nuevo.
- Once renders con OfflineAudioContext de las mismas fuentes: cuatro músicas
  de 32 segundos, cuatro clips de bajas (normal/élite/boss) y tres mezclas densas.
- Nivel master .65: música RMS ≈0.01993–0.02006; bajas ≈0.00740–0.00759.
  Picos <0.17; máximo observado 16 voces en mezclas, ≤14 de música.
- SHA256: los 75 archivos de js/css/assets quedaron intactos, además de
  index.html y JUGAR NEON VOID.cmd. La referencia real se comprobó nota a nota.
- git diff --check y revisión de status/diff. Sin commit ni push.

Evidencias, capturas y WAVs: previews/audio-experiments/file-browser.
Renders previos a la calibración: previews/audio-experiments/browser.
Test log: previews/audio-experiments/tests.log.

Las guías agent-browser/agent-browser-verify orientaron el recorrido real.
La CLI no estaba instalada: se usó el verificador Edge/CDP existente, en el
puerto independiente 9448. No se instalaron dependencias.

## Archivos

- ABRIR_AUDIO_EXPERIMENTOS.cmd
- dev/audio-experiments/index.html, style.css, controls.js, experiments.js, qa.cjs
- tests/audio_experiments.js
- tools/verify_alpha.cjs (sólo rama de verificación --audio-experiments)
- README.md, docs/AI_START_HERE.md y este documento.
- AUDIO_GROOVE_2026-10-03.md: corregido el registro de la limpieza ya realizada.

## Continuidad

Esperar elección del usuario. No convertir las tres propuestas en música activa
del juego, no tocar el launcher del EXE ni generar paquetes de Electron todavía.
Tras elegir, integrar únicamente ganadores en la arquitectura real (no cargar
el wrapper del laboratorio en producción), probar, alinear Web/Electron y luego
publicar sólo con autorización explícita. Preservar el aviso de spawn y pilotos.

Para repetir QA:

    node --experimental-websocket tools/verify_alpha.cjs file:///C:/Users/party/Desktop/JuegoDemo previews/audio-experiments/file-browser --audio-experiments --port=9448
