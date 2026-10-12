# Limpieza reversible del proyecto — 2026-10-10

Se redujo el material generado en la carpeta de trabajo sin tocar código de
juego, assets, configuración, historial Git ni perfiles del usuario. Todo lo
retirado en esta pasada se envió a la Papelera de Windows; no se borró
permanentemente y se puede restaurar desde allí.

Se conservan explícitamente:

- `local/profile`, respaldos y las capturas originales en `local/profiling`.
- `local/archivo/actual`, el respaldo fuente actual y su bundle Git.
- Runtime Electron de `local/runtime/windows`, usado por los lanzadores.
- Perfiles de QA con datos no regenerables, resultados e informes de rendimiento.
- El build web más nuevo y el build desktop portable actual.
- Todo el código de pruebas y referencia congelada.

Se enviaron a la Papelera los builds anteriores de `releases` (excepto
`DeadSingularity-V1-web-fSHTfe` y `DeadSingularity-V1-desktop-PKV1V7`), el archivo
histórico `local/archivo/DeadSingularity-historial`, cachés regenerables de los
perfiles QA y dos trazas JSON descomprimidas idénticas a sus `.json.gz`.
El archivo histórico conserva el origen del desarrollo y es recuperable; se
retiró de la carpeta activa por tamaño, no porque se haya invalidado.
En total fueron 88 elementos, aproximadamente 4,34 GiB de contenido fuera del
directorio activo. Se verificó que el histórico dejó de estar en el proyecto y
que los builds retenidos, el perfil, los respaldos y las trazas comprimidas
siguen presentes. El espacio del disco sólo se libera de forma permanente si se
vacía la Papelera manualmente.

El `local/validation` restante contiene evidencia útil y perfiles aislados para
pruebas, no forma parte de los builds publicados. `node_modules` y el runtime
local se conservan para poder abrir y validar sin reinstalar dependencias.

La higiene Git reportó un error de “not a work tree” al consultar `git status`
en este entorno, aunque `rev-parse` identificó la raíz. No se reparó ni modificó
`.git` y no se ejecutó commit, push, reset ni limpieza de historial.

Para continuidad de FPS, consultar `docs/VIGILANCIA_RENDIMIENTO.md`. El estado
actual del juego queda sin cambios visuales ni de balance en esta limpieza.
