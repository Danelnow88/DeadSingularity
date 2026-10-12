# DeadSingularity V1 — estado actual

## Actualización prioritaria — 12/10/2026

Normal y pruebas dimensionales comparten la base aprobada completa. El lobby
ciruela conserva su apariencia y la sesión sin guardar, listo para futuras
pruebas. Enemy Roster y la galería de escenarios reflejan la base actual.
Ver `docs/PROMOCION_DIMENSIONAL_2026-10-12.md`; los apartados fechados anteriores
son históricos. Afinidad terrestre/espacial: próxima tarea, aún sin implementar.
Commit local autorizado; ningún push ni despliegue forma parte de esta tarea.

Entregas locales de este hito: web en
`releases/DeadSingularity-V1-web-GfS25z`; Electron ejecutable en
`releases/DeadSingularity-V1-desktop-0QWLR2/win-unpacked/DeadSingularity.exe`;
Android con 129 assets verificados en `android/app/src/main/assets/game`
(no equivale a un APK compilado). Los artefactos y perfiles quedan fuera de Git.

## Notas anteriores

Menú gráfico renovado 10/10: resolución interna 720p/1080p/1440p, ayudas por
hover/foco/tap, fullscreen y reset sólo de gráficos. Calidad: 197 suites sin
fallos y QA real PC/móvil aprobado. Build web actual: releases/DeadSingularity-V1-web-RS2KIq.
Ver docs/GRAPHICS_MENU_2026-10-10.md. Sin commit ni publicación de esta pasada.

Estado de limpieza 10/10/2026: builds antiguos, cachés QA y archivo histórico
grande enviados a la Papelera, restaurables; se conserva el respaldo fuente
actual. Ver `docs/LIMPIEZA_PROYECTO_2026-10-10.md`. Continuidad de FPS abierta:
ver `docs/VIGILANCIA_RENDIMIENTO.md`.

Las rutas de builds y conteos de QA que aparecen más abajo son registros de
validaciones anteriores, no inventario actual. La carpeta `local/validation`
conserva evidencia; builds retenidos están listados en el informe de limpieza.

La única carpeta de trabajo es C:\Users\party\Desktop\DeadSingularity V1.
Abrir ABRIR_V1.cmd para jugar o ABRIR_V1_WEB.cmd para navegador.
Versión actual: 1.1.0-alpha.1. Código, herramientas y entregas están en esta carpeta.

El archivo histórico de recuperación (incluidos los cinco ZIP previamente
verificados y sus historiales) está ahora en la Papelera de Windows, no dentro
del proyecto; puede restaurarse. El respaldo fuente vigente se conserva en
`local/archivo/actual`.

El contenido del directorio de trabajo anterior fue retirado a la Papelera después
de preservar y verificar sus novedades y sus 777 archivos Git. Sólo queda su carpeta
vacía, bloqueada por este chat. El ayudante local/retirement/finish-retirement.ps1
intenta eliminarla cuando Windows libere el bloqueo; se detiene si aparecen archivos.
Cerrar completamente Codex libera el bloqueo. Ver local/retirement/COMPLETADO.txt.

Calidad local al 09/10/2026: 189 pruebas, cero fallos; 105 recursos de entrega verificados y
87 archivos de referencia original intactos. QA y capturas: local/validation.
La migración conserva guardados anteriores sin reemplazar un progreso nuevo.

GitHub y Pages: DeadSingularity; dirección de publicación
https://danelnow88.github.io/DeadSingularity/. El 08/10/2026 el autor autorizó
renombrar el repositorio, hacer commit, push y publicar. El commit conserva
el historial remoto anterior y usa los workflows de calidad y Pages.
Estado verificable: GitHub Actions y docs/PUBLICACION.md.

Para desarrollo y Steam: conservar esta carpeta completa. releases contiene
las entregas generadas, local guarda perfiles, evidencia y recuperación y no se
publica. Steamworks, firma comercial, APK validado y backend real siguen pendientes.
Ver GROWTH_PLAN.md y docs/CRECIMIENTO_IMPLEMENTADO.md para los límites actuales.

Entregas actuales verificadas localmente:
- Windows portable actual: releases/DeadSingularity-V1-desktop-PKV1V7/win-unpacked/DeadSingularity.exe
- Web actual: releases/DeadSingularity-V1-web-B5tYTX
- Instalador anterior (no incluye cambios del 09/10): releases/DeadSingularity-V1-desktop-3oeDY4/DeadSingularity_V1_Setup_1.1.0-alpha.1.exe
- Respaldo anterior (preservado, no incluye esta pasada): local/archivo/actual/DeadSingularity-1.1.0-alpha.1-fuentes.zip

QA real de las dos plataformas pasó, incluida recarga de checkpoint a oleada 2
y fallback gráfico. Android anterior: 97 recursos verificados por SHA-256, no
regenerado en esta pasada PC. APK no compilado, integración Steam pendiente.
Evidencia resumida: docs/VALIDACION_CRECIMIENTO.md.

Estado gráficos/rendimiento 09/10: contador FPS opcional en Ajustes → Gráficos,
abajo derecha en PC; toggle, persistencia y posición verificados en Electron.
Economía escasa, fusión III, tienda y pulido de tres amenazas conservados/completados.
Grillas reutilizables, cache de tejido/fondo y cinco curvas Path2D implementados;
sin quitar efectos. Desafío opcional sólo en pausa; Tanque sin rediseño.
PENDIENTE: fluidez estable 120–165 FPS con solapamiento pesado. La prueba visible
de 30 s con 24 enemigos vivos dio ventanas 126–142 FPS y saltos hasta 48,5 ms.
La traza apunta a raster/flush Canvas/GPU; el ahorro de CPU no certifica fluidez.
Siguiente paso: optimizar raster de entidades con A/B GPU a igual densidad,
preservar animación/glows y comprobar equivalencia de imagen. Evidencia y comandos:
docs/PERFORMANCE_ECONOMY_PASS_2026-10-09.md. Sin commit, push ni publicación.
