# NEON VOID — UX, tutorial y accesibilidad

Fecha: 30 de septiembre de 2026.

## Corte implementado

- Tutorial reactivo de cuatro acciones durante la primera partida: movimiento,
  dash, disparo y especial. No pausa ni bloquea la arena y puede omitirse.
- Puente analógico real: teclado y stick comparten un vector normalizado sin
  modificar la velocidad base.
- Mando estándar/Steam Input: stick izquierdo para mover, derecho para apuntar,
  gatillo derecho para disparar, B dash, A especial, hombros para armas, Y para
  objeto, X para usar y Start para pausar.
- Opción de texto grande persistente, además de efectos reducidos y lenguaje
  familiar ya existentes.
- Tutorial y mando se consultan desde el único loop principal. No agregan ciclos
  de animación paralelos ni escriben el DOM cada frame.

## Verificación

- Suite completa: `144/144`.
- Recorrido Edge: lobby, tutorial, combate, pausa, tienda, guardado, muerte,
  victoria, tres resoluciones y roles enemigos, sin excepciones ni red externa.
- Evidencia: `previews/ux-i/`.
- Electron: `previews/ux-i/desktop-qa.json`, `pass: true`.
- Build aprobada: `releases/NEON-VOID-0.10.0-alpha-windows-e1j8sv`.

## Pendientes humanos

- Validar con dos modelos de mando físicos; la automatización sólo comprueba el
  contrato estándar del navegador.
- Probar legibilidad a distancia y preferencia de tamaño con personas reales.
- El remapeo completo queda fuera de esta alpha; los controles están documentados
  y el esquema estándar cubre teclado, mouse, touch y mando.
