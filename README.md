# DeadSingularity V1

Base aprobada 12/10/2026: todo el contenido dimensional actual está disponible
también en el modo normal. El lobby ciruela sigue siendo una sesión sin guardar
para futuros experimentos. Ver [alcance y entrega local](docs/PROMOCION_DIMENSIONAL_2026-10-12.md).
Galerías canónicas: [enemigos](previews/enemy-roster-canonical.html) y
[escenarios](previews/dimension-environments.html). El filtro por terreno queda
pendiente; no se mezcló con esta promoción. Push/publicación requieren una
decisión posterior.

Proyecto actual: C:\Users\party\Desktop\DeadSingularity V1.
Versión 1.1.0-alpha.1; destino final Steam.

Abrir ABRIR_V1.cmd para escritorio o ABRIR_V1_WEB.cmd para navegador.
El respaldo fuente vigente está en local/archivo/actual. El archivo histórico
antiguo quedó fuera de la carpeta del proyecto, en la Papelera recuperable;
el registro de esa limpieza está en docs/LIMPIEZA_PROYECTO_2026-10-10.md.
El acceso del escritorio DeadSingularity apunta a esta carpeta.

Para recuperar en otra PC: instalar Node 22, ejecutar npm ci y abrir los CMD.
Para recrear accesos: powershell -NoProfile -ExecutionPolicy Bypass -File tools/create-shortcuts.ps1.

Comandos de desarrollo:

Gráficos: Ajustes → Gráficos incluye resolución interna 1080p y 1440p en
escritorio. Las ayudas aparecen al pasar el mouse, enfocar o tocar el nombre.
Detalles y validación: docs/GRAPHICS_MENU_2026-10-10.md.

- npm run quality: sintaxis, catálogo, manifiestos, higiene Git y suite completa de pruebas.
- npm run build:web: entrega estática bajo subruta de Pages.
- npm run build:desktop: app Windows e instalador DeadSingularity_V1_Setup_1.1.0-alpha.1.exe.
- npm run qa:alpha: Chromium/Electron real, guardados, audio, controles y escenarios repetidos.
- npm run build:android:assets: prepara los mismos recursos para el contenedor Android.

Electron está fijado a 44.5.0. npm ci descarga automáticamente su binario
mediante install-electron; npm run runtime:install permite recuperarlo sin
cambiar la versión. Se requiere Node 22.12 o posterior. El renderer tiene sandbox y no accede a Node.
Las entregas sirven únicamente index.html, js, css, assets y AVISOS.md; no incluyen
perfiles, respaldos, reference, src ni herramientas de desarrollo.
check:delivery verifica los recursos de esta revisión; la referencia congelada
conserva por separado sus 87 hashes originales.

Desarrollo e instalador usan el perfil %APPDATA%\DeadSingularityV1. Las pruebas
usan perfiles aislados. Exportar/importar progreso desde Récords permite trasladarlo.
El cambio de nombre conserva los guardados anteriores.

## Capturar rendimiento sin grabar desde DevTools

Cerrar la ventana existente del juego y ejecutar desde esta carpeta:

```cmd
npm.cmd run desktop -- --profile-performance
```

F8 inicia/detiene la captura; F7 marca un momento; F6 abre la carpeta de la
última captura. Para revisar con una IA, enviar juntos performance.trace.json.gz
y session.json. Solo esos dos archivos son necesarios; session.json incluye
muestras cada segundo y separa tiempo grabado de tiempo de exportación.
Los percentiles son ventanas rolling, no una prueba de FPS físicos presentados.
La captura usa el límite de tiempo/buffer configurado; puede terminar antes.
Para comparar, jugar un tramo equivalente con el mismo tamaño de ventana,
calidad máxima y efectos sin cambios. No activar muestreo JS extra salvo que
se necesite atribuir funciones; agrega carga de diagnóstico.
Validaciones y límites: docs/PERFORMANCE_DRONE_BATCH_2026-10-10.md.

Para sostener y comparar el rendimiento sin tocar la calidad gráfica, ver
docs/VIGILANCIA_RENDIMIENTO.md. El objetivo de 120 FPS sostenidos permanece
abierto y no se declara certificado.

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
