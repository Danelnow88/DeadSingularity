# Aviso de aparición — 2026-10-03

Pedido: sustituir la X previa al spawn por el triángulo violeta con exclamación
de la imagen adjunta; únicamente el símbolo tiene color, el resto es transparente.

Implementado en `js/engine/enemyArrival.js` mediante geometría Canvas2D basada
en las proporciones de la referencia: triángulo hueco, signo redondeado y punto.
Violeta `#a000ad`, dos pulsos suaves de escala/opacidad durante .9s, sincronizados
con el dt existente. No carga bitmaps ni necesita red. Transparencia real con
relleno evenodd, sin borrar ni cubrir el escenario. Cámara conserva x/y de mundo.

Gameplay, balance, world metrics, audio, aviso .9s, puff .22s, reubicación antes
de materializar y protección de IA/daño permanecen iguales. Se preservaron todos
los cambios locales anteriores, incluido el SFX de spawn.

Validación: sintaxis; `enemy_arrival`; suite completa 163/0; `git diff --check`.
La prueba de arena que contaba diagonales se actualizó para comprobar anclaje
de mundo al panear. Se conservan sus checks mecánicos. QA específico nuevo:
`node --experimental-websocket tools/verify_alpha.cjs BASE OUT --spawn-icon-only`.
Canvas real verifica alfa cero en fondo/huecos, violeta, fotogramas diferentes;
partida real verifica aviso, pausa y puff en1280×800,915×412,844×390.
Capturas/atlas inspeccionados; móvil emulado, no dispositivo físico.

Evidencia en `previews/spawn-icon-2026-10-03/source` y `packaged-web-final`.
Una primera ejecución de paquete expiró en CDP al correr simultáneamente con
Electron; la comprobación final secuencial pasó todos los casos, sin errores JS.
El primer muestreo de transparencia tocaba el borde; se corrigió el punto de QA.

Entregas finales preservando las anteriores:

- Web: `releases/NEON-VOID-0.10.0-alpha-web-J1T5Zf`.
- Windows: `releases/NEON-VOID-0.10.0-alpha-windows-SJV3DV`.
- EXE aislado: `desktop-final-qa.json`, pass/saved true, playing, errors vacío.
- Renderer idéntico por SHA256 entre fuentes, web y Windows.
- `index.html` versiona enemyArrival como `spawn-icon-20261003` para evitar caché.
- Lanzador actualizado a SJV3DV después de validar.

Archivos de esta tarea: enemyArrival.js, index.html, tests/enemy_arrival.js,
tests/arena_adaptation.js, tools/verify_alpha.cjs, docs/ARCHITECTURE.md,
README.md, docs/AI_START_HERE.md, este informe y JUGAR NEON VOID.cmd.
No commit ni push. Implementación terminada; siguiente paso: feedback visual
del usuario en la entrega nueva, cerrando previamente cualquier instancia vieja.
