# Revisión de integración · 07/10/2026

Se revisaron los archivos y binarios reales, conservando una copia de los cambios
previos en local/backups/antes-correcciones-kilo-20261007-233058.

1. El diagnóstico “Node renombrado como electron.exe” era incorrecto: la metadata
   del binario dice Electron 44.5.0, 245625856 bytes. Electron incorpora Node 24.21.0
   y lo expone con ELECTRON_RUN_AS_NODE. `require('electron')` en Node devuelve
   la ruta del ejecutable por diseño; en el proceso principal Electron da la API.
   La prueba real abrió el juego con ese mismo binario y ejecutó Web Audio.
2. Los nombres buscados por ABRIR_V1.cmd no coincidían con productName/artifactName.
   Además, el primer caso omitía el prefijo releases/ al construir la ruta. El
   launcher vuelve a abrir el proyecto con un runtime fijado y limpia el flag Node.
3. Los lanzadores usaban npx electron@latest, contrario al pin del package y al
   runtime disponible. Web utiliza explícitamente modo Node; escritorio, modo app.
4. files:**/* más extraResources duplicaba el juego. El main buscaba todo desde
   app.asar aunque se pretendía actualizar recursos externos. Se restringió ASAR
   al contenedor y se resuelven recursos desde process.resourcesPath al empaquetar.
5. El perfil estaba en resources/local/profile al empaquetar. Ahora tiene una
   ubicación estable en AppData y migración que conserva el perfil local previo.
6. Continuaban --reference, rutas de referencia y enlace de workbench. Se retiraron
   del runtime y de los lanzadores; la referencia permanece disponible sólo en CLI.
7. La configuración win.sign:false no corresponde al tipo esperado por la versión
   instalada del empaquetador. Se eliminó; firma obligatoria es una opción explícita
   con forceCodeSigning. No hay certificado ni identidad configurada en este equipo.
8. El problema de extracción de winCodeSign proviene de enlaces de las herramientas
   macOS dentro del bundle común; no demuestra que Electron sea Node ni que haya
   que reemplazar el motor. Se mantiene el juego original y se repara el empaquetado.

No se atribuye intención a estas diferencias. La fuente de verdad es el código,
el ejecutable y el resultado de las validaciones registradas.
