# DeadSingularity V1 — estado actual

Estado de limpieza 10/10/2026: el archivo histórico grande fue enviado a la
Papelera de Windows (restaurable); el respaldo fuente actual sigue en
`local/archivo/actual`. Ver `docs/LIMPIEZA_PROYECTO_2026-10-10.md`.

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
