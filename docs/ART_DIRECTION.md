# Materiales controlados, energía legible

Regla para trabajo visual nuevo a partir del 09/10/2026. No es una orden de
recolorear indiscriminadamente el roster aprobado ni de quitar efectos.

- Siluetas 2D flotantes y memorables; sin humanoides, brazos ni patas. El tanque
  conserva su diseño y comportamiento.
- Cada familia tiene un material principal, una sombra, un borde y una luz.
  Materiales de saturación controlada; neón reservado a emisión real: agujas,
  proyectiles, núcleos encendidos y habilidades. No elegir colores al azar por frame.
- La lectura de peligro prevalece sobre la paleta material. Costura: borde rojo
  continuo y redondeado; interior de lana entrelazada, no malla de rectas.
- Separar preparación, bloqueo, ataque y recuperación por forma/movimiento además
  del color. No depender exclusivamente de distinguir rojo de verde.
- `NV.DIMENSIONAL_ART`, en `js/render/dimensionalThreats.js`, centraliza los
  materiales de Costurero (ciruela), Sniper (acero azulado) y Devorador (amatista).
  La geometría de advertencia procede del mismo estado que usa la colisión.
- Emisión brillante pequeña y contornos nítidos. Evitar velos de transparencia
  sobre toda la pantalla que confundan suelo seguro con área dañina.
- Rendimiento: conservar partículas, animación, luminancia y orden de capas.
  Cachear superficies estáticas y reutilizar buffers; no presentar menos efectos
  como si fuera una optimización equivalente. Validar capturas antes/después.

Para un renderer WebGL futuro: atlas de materiales/halos y lotes instanciados por
material + modo de mezcla; atributos por instancia para transformación, color,
fase y semilla. Ordenar por capas de juego antes de agrupar. No agrupar transparencias
saltando el orden de profundidad ni activar otro renderer encima del Canvas.
El adaptador Three.js opcional está desactivado en la ruta de esta captura:
agregar `InstancedMesh` allí no aceleraría el combate Canvas actual.
