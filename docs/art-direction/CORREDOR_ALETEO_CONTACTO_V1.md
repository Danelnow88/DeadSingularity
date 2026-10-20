# Corredor: amagues, aleteo y dash de contacto · 15/10/2026

Integrado directamente por pedido del usuario. No cambia ningún otro enemigo.
Mismos sprites sintetizados, tamaño aprobado +5%, dos ojos que siguen al jugador,
radio físico 9, HP, daño por contacto y composición de oleadas.

## Ciclo

1. Acercamiento lateral suave o retroceso hasta banda media 120–220 unidades.
2. Elegir una sola vez por ciclo 2 o 3 amagues completos. Cada uno: avance
   0,22 s a 70% de velocidad base y retroceso 0,25 s a 65%. Nada de RNG por frame.
3. Frenada de 0,26 s, con preparación del aleteo. Fija aquí la posición del
   jugador y el vector de lanzamiento: ventana legible para esquivar.
4. Dash recto sin homing: velocidad efectiva ×1,85, tope 320 unidades/s.
   A velocidad base 145 son 268,25 unidades/s. En campo minado también respeta
   el tope global de 260. Duración según distancia
   fijada, acotada a 0,45–0,80 s; respeta ralentizaciones/congelación posteriores.
5. Recuperación/retroceso 0,48 s, reiniciar contador y elegir 2/3 para el ciclo nuevo.

Si el jugador salió de alcance antes de preparar el dash, vuelve a colocarse
en banda: no se lanza desde el otro extremo del mapa. No provoca daño en la
frenada ni al lanzarse salvo que el cuerpo toque al jugador. El contacto durante
cualquier fase sigue siendo peligroso mediante la misma rutina existente.
Se conserva también la muerte del Corredor al aplicar su contacto normal.

## Render

Los dos recortes posteriores existentes trabajan como aletas opuestas. Frecuencia
1,5 Hz tenue en reposo, 2,8 en amague, 4,5 en frenada y 5,5 durante el dash;
amplitud máxima 0,11 rad. Se suaviza la amplitud con tiempo transcurrido.
El cuerpo mira hacia el objetivo al avanzar/retroceder, y respeta la dirección
fijada durante la frenada/dash. Compresión corporal leída de la fase real.
Sin nuevos assets, filtros, partículas, llamadas drawImage o lecturas de píxeles.

## Implementación y verificación

- js/engine/enemies.js: helper exclusivo de enemyTypeId runner + behavior flank;
  timers intent si existe NV.enemyState, fallback de producción si no.
  Otros consumidores de flank conservan su rama anterior.
- js/render/cosmicRunner.js: pose por fase real y aleteo con WeakMap de presentación.
- tests/runner_swim.js: 2/3 amagues, posición media, frenada sin movimiento,
  snapshot inmutable, velocidad, efecto de freno, recuperación, contacto-only,
  ambos backends y alcance de un jugador quieto a 30/60/165 Hz.
- tests/runner_flank.js: contratos conservados actualizados para la nueva frenada.
- tests/cosmic_runner_preview.js: pureza del render, rumbo comprometido,
  cadencia/seguimiento y amplitud de aletas sin nuevos dibujos.
- tools/preview-cosmic-runner.cjs --capture: ciclo completo con IA real en Electron,
  mirada, blink y render; registro local/validation/cosmic-runner-20261015/.
- tools/qa-cosmic-production.cjs: carga/dibujo con transporte/CSP del juego normal.

No se promete una mejora de FPS: se mantiene el costo acotado del rig. Cerrar la
ventana anterior y reabrir ABRIR_V1.cmd para cargar la nueva versión de JS.
