# NEON VOID — playtest observado con niño de 4 años

Fecha: 1 de octubre de 2026. Fuente: prueba humana de la build Electron.

ACLARACIÓN VIGENTE: este título identifica al observador de una prueba histórica,
no al público objetivo. El usuario quiere desafío para adolescentes y adultos
también en Fácil, y derrotas frecuentes en Difícil. No diseñar balance infantil.

## Observaciones confirmadas

1. Varias oleadas y bosses podían resolverse sin mover al personaje.
2. Venteo, grieta y pulso no comunicaban qué zona dañaba ni qué debía hacer el
   jugador.
3. Varias mecánicas enemigas son visualmente ruidosas pero poco comprensibles.
4. El Tanque contradice su fantasía: embiste aunque su diseño muestra un cañón.
5. Escopuras presenta desplazamiento lateral trabado.
6. Historia/Expedición, Infinito, duración y repetición de rutas no se entienden
   desde el lobby.

## Corte K1 cerrado

- Regla anti-espera para los diez bosses: tras 2,6 s casi inmóvil aparece una
  zona roja de 0,95 s con “¡MOVETE!”. Salir del círculo evita todo el daño;
  quedarse dentro recibe un único impacto. No reemplaza sus ataques propios.
  Corrección posterior L1: faltaba conectar el daño al coordinador del juego;
  K1 lo mostraba pero no podía quitar HP en la partida real. Ver
  `DIFFICULTY_BOSSES_VISUAL_2026-10-01.md`.
- Los tres protocolos ambientales ahora dicen literalmente qué color daña y
  hacia dónde moverse. Durante activación indican “ACTIVO · NO TOCAR”.
- Lobby: “HISTORIA · 20 OLEADAS” y “INFINITO · SIN FINAL”, con objetivo dinámico,
  jefe cada cinco oleadas y explicación de nueva expedición/ruta al regresar.
- Suite: `145/145`; Edge completo en `previews/difficulty-k1/`.
- Electron: `previews/difficulty-k1/desktop-qa.json`, `pass: true`.
- Build: `releases/NEON-VOID-0.10.0-alpha-windows-CAosd2`.

## Corte K2 cerrado

- El Tanque ya no embiste: es lento, resistente, mantiene distancia media y
  carga durante 0,9 s una mira fija antes de disparar un obús grande y fuerte.
  Moverse después de ver la línea esquiva el disparo; su recarga lo expone.
- Escopuras ahora interpola aceleración, dirección y frenado con respuesta
  independiente del framerate. Conserva banda, snapshot, stun y recovery.
- Suite: `145/145`; Edge completo en `previews/difficulty-k2/`.
- Electron: `previews/difficulty-k2/desktop-qa.json`, `pass: true`.
- Build: `releases/NEON-VOID-0.10.0-alpha-windows-qz3kZR`.

## Próximo corte K3 — playtest y verbos

1. Probar Tanque y Escopuras en Electron y registrar si señal, consecuencia y
   forma de esquivar se entienden sin explicación.
2. Auditar uno por uno los verbos del roster desde la mirada de un jugador
   nuevo: señal visible, consecuencia y contrajuego en menos de tres segundos.
3. Medir bosses con personaje quieto, movimiento básico y evasión deliberada;
   ajustar primero patrones iniciales y ventanas, no sólo vida o daño.
4. Revaluar duración de Historia y continuidad entre expediciones con datos de
   dos recorridos humanos completos.
