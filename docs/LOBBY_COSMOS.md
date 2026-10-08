# Lobby cosmos - 08/10/2026

Fondo procedural inspirado en la referencia estrellada del autor: profundidad,
avance hacia camara desde un punto de fuga, estrellas de colores y destellos.
Sin textura descargada, servicios externos ni dependencias nuevas.
La perspectiva expande posiciones y tamanios; recicla una piscina fija con
generador propio sembrado, sin consumir Math.random del combate.

El modulo js/ui/lobbyAtmosphere.js dibuja solo en #startScreen. Limite 1000
estrellas (420 en performance), DPR 1.5 y dibujo 30 Hz (20 en performance).
Sprites con gradiente precalculados, sin shadowBlur ni gradientes por frame.
Se cancela rAF al ocultar el menu o la pestania. Movimiento reducido, reducedEffects
y particulas desactivadas conservan un fondo estatico, sin avance/parallax.

CSS separado: contraste, tarjetas, controles y lobby vertical. El aviso de giro
ya no tapa el lobby vertical; sigue cubriendo la partida. Cambio acotado en
game.js: el camino portrait dibuja el preview del piloto activo, pero conserva
el return anterior a la simulacion, timers y VFX de combate. No cambia balance,
input, progresion, sonido ni guardados. La biblioteca de pilotos no cambia.

Tests: tests/lobby_atmosphere.js; QA real tools/qa-lobby.cjs en Electron con
perfil temporal: desktop, portrait y landscape, avance medido, canvas del
piloto con pixels, sin desborde, botones, ajustes y pausa al jugar.
Capturas y reporte: local/validation/lobby-cosmos/. Movil es emulado, no fisico.
CI incorpora este recorrido. El manifiesto de release se regenera por cambios
intencionales de presentacion; la referencia congelada no se toca.
Respaldo anterior: local/backups/antes-lobby-cosmos-20261008-024430.
