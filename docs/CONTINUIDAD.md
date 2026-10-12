# DeadSingularity V1 — estado actual

Actualización 12/10/2026: normal y pruebas comparten la base dimensional
aprobada. Ver `PROMOCION_DIMENSIONAL_2026-10-12.md` para alcance, futuras pruebas,
guardados y exclusiones del commit. Las galerías canónicas se conservan en Git.
La afinidad terrestre/espacial queda pendiente; no se aplicó en esta promoción.

Estado de limpieza 10/10/2026: builds antiguos, cachés QA y archivo histórico
grande enviados a la Papelera, restaurables; se conserva el respaldo fuente
actual. Ver `docs/LIMPIEZA_PROYECTO_2026-10-10.md`. Continuidad de FPS abierta:
ver `docs/VIGILANCIA_RENDIMIENTO.md`.

El resto de este documento es una instantánea anterior: rutas de builds, fechas
y cantidades de pruebas allí citadas no describen el inventario actual.

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

Calidad local: 178 pruebas, cero fallos; 97 recursos de entrega verificados y
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
- Windows: releases/DeadSingularity-V1-desktop-3oeDY4/win-unpacked/DeadSingularity.exe
- Instalador: releases/DeadSingularity-V1-desktop-3oeDY4/DeadSingularity_V1_Setup_1.1.0-alpha.1.exe
- Web: releases/DeadSingularity-V1-web-tTxWMc
- Respaldo actual: local/archivo/actual/DeadSingularity-1.1.0-alpha.1-fuentes.zip

QA real de las dos plataformas pasó, incluida recarga de checkpoint a oleada 2
y fallback gráfico. Las 178 pruebas pasaron; los 97 recursos Android coinciden
por SHA-256. APK no compilado, integración Steam pendiente.
Evidencia resumida: docs/VALIDACION_CRECIMIENTO.md.
