# Entrada nueva — fase C

Una intención por frame; los adaptadores no ejecutan física ni hacen RAF propio.
InputChannel combina teclado normalizado + vector táctil + mando y normaliza
la suma como core/inputIntent.js y el puente de game.js de la referencia.
La zona muerta del mando es 0.20, reescalada como gamepadControls.js.
Aim es mundo menos posición actual; móvil conserva autoataque obligatorio.

Shift/B: dash mantenido, press-edge en MotionBody. Espacio/Z/X/A: especial.
Mouse/RT: disparar. F/X: usar; Q/E/Y: ciclo de consumible; LB/RB: armas.
Digit1–6: slot; P/Start: pausa. Tab: estadísticas. Acciones discretas no
repiten por mantener la tecla. Las acciones todavía no implementadas en el
lab se muestran, no generan falsos efectos ni consumen recursos.

GameState es la autoridad única de data-game-state y data-paused. Portrait y
ocultación suspenden el laboratorio sin modificar la pausa elegida por el
usuario. No hay simulación ni render del canvas durante portrait. Liberar
Shift/B antes de pulsarlo otra vez evita un dash diferido al reanudar.
La captura táctil se libera también en cancel/lostpointercapture.

check-input compara las funciones reales de referencia para dirección, aim,
política de disparo y zona muerta; además prueba contratos nuevos de pausa,
acciones, orientación y releases. No pretende certificar hardware real ni
paridad visual. Hace falta validación manual de mando y teléfono físicos.

Archivos: src/game/input.mjs, input-dom.mjs; src/lab/input.html/css/mjs;
tools/check-input.cjs; package.json; index.html; desktop/main.cjs.
audit:reference antes solo inventariaba: ahora primero verifica 87 hashes.
