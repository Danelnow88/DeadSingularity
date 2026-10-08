# DeadSingularity V1

Proyecto actual: C:\Users\party\Desktop\DeadSingularity V1.
Versión 1.1.0-alpha.1; destino final Steam.

Abrir ABRIR_V1.cmd para escritorio o ABRIR_V1_WEB.cmd para navegador.
Los respaldos están dentro de local/archivo; no son otro proyecto de trabajo.
El acceso del escritorio DeadSingularity apunta a esta carpeta.

Para recuperar en otra PC: instalar Node 22, ejecutar npm ci y abrir los CMD.
Para recrear accesos: powershell -NoProfile -ExecutionPolicy Bypass -File tools/create-shortcuts.ps1.

Comandos de desarrollo:

- npm run quality: sintaxis, catálogo, manifiestos, higiene Git y 178 pruebas.
- npm run build:web: entrega estática bajo subruta de Pages.
- npm run build:desktop: app Windows e instalador DeadSingularity_V1_Setup_1.1.0-alpha.1.exe.
- npm run qa:alpha: Chromium/Electron real, guardados, audio, controles y escenarios repetidos.
- npm run build:android:assets: prepara los mismos recursos para el contenedor Android.

Electron está fijado a 44.5.0. npm ci descarga automáticamente su binario
mediante install-electron; npm run runtime:install permite recuperarlo sin
cambiar la versión. Se requiere Node 22.12 o posterior. El renderer tiene sandbox y no accede a Node.
Las entregas sirven únicamente index.html, js, css, assets y AVISOS.md; no incluyen
perfiles, respaldos, reference, src ni herramientas de desarrollo.
check:delivery verifica 97 recursos de esta versión; la referencia congelada
conserva por separado sus 87 hashes originales.

Desarrollo e instalador usan el perfil %APPDATA%\DeadSingularityV1. Las pruebas
usan perfiles aislados. Exportar/importar progreso desde Récords permite trasladarlo.
El cambio de nombre conserva los guardados anteriores.

Estado de los seis hitos: docs/CRECIMIENTO_IMPLEMENTADO.md y GROWTH_PLAN.md.
Steamworks, APK en dispositivo físico, firma comercial y proveedor de servicios
requieren completar sus integraciones; esta entrega no los presenta como terminados.
La firma Windows requiere certificado real y npm run build:desktop:signed.

La API NV.drawConsumableIcon está en js/render/consumableIcons.js; su fixture es
previews/consumable-icons-integration-preview.html. Arquitectura: docs/ARCHITECTURE.md.

Continuidad y respaldos: RETOMAR_V1.md. Publicación autorizada el 08/10/2026.
Repositorio: https://github.com/Danelnow88/DeadSingularity
Pages:
https://danelnow88.github.io/DeadSingularity/.

Código y contenidos propios: UNLICENSED. Ver AVISOS.md y licencias del runtime.
