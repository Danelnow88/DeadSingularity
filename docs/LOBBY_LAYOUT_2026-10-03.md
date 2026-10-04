# Maqueta de lobby — 03-10-2026

**Integración posterior aprobada y completada:** ver
`LOBBY_INTEGRATION_2026-10-03.md`. Este archivo conserva el cierre de la maqueta
independiente y el estado histórico de la tarea musical interrumpida.

Pedido vigente: el texto adjunto solicita HTML5 y CSS3, sin JavaScript. Se crea
una vista independiente en `dev/lobby-layout/index.html` y `lobby.css`. Incluye
Grid de tres columnas, Flexbox, panel de piloto, MEJORAS al mismo ancho, avatar
geométrico, JUGAR, Historia con diez puntos y cuarto activo, tooltip a la
izquierda y tarjeta Infinito. Responsive de una columna y reduced motion.
Datos de jefe 4/Crios/Sector Helado y récord45 son ejemplos pedidos para la
maqueta, no cambios al contenido o progreso real. Botones sin lógica por pedido.

La tarea anterior de soundtrack fue interrumpida explícitamente por el usuario.
Se analizó el MP3 de182s y se guardó `previews/soundtrack-2026-10-03/analysis.json`.
Quedaron borradores `js/audio/soundtrack.js`, `tools/import_soundtrack.cjs` y una
rama de análisis en `tools/verify_alpha.cjs`, SIN carga en index ni hooks en el
juego ni cambios al mixer/voices/lanzador. Existe un asset musical generado
en `assets/audio/main-theme-data.js`; se conserva y no se integra en esta tarea.
El audio actual permanece activo. No reanudar ni integrar sin nuevo pedido.
Los borradores se conservan; no se descarta trabajo local.

Maqueta terminada. Abrir `ABRIR_LOBBY_MAQUETA.cmd` o el HTML directamente.
Verificación Edge aislado en1440×900,1280×800,915×412,844×390 y390×844:
ancho/posición idénticos de panel y MEJORAS, diez puntos/cuarto activo, cero
scripts, Grid3→1, sin overflow horizontal, tooltip por foco dentro de viewport
desktop y móvil, reduced-motion sin animación, errores vacíos. Capturas revisadas.
Evidencia: `previews/lobby-layout-2026-10-03/report.json` y PNGs. No modifica
el lobby de producción, gameplay ni build activa. Sin commit/push.
