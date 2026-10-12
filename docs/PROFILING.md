# Perfilado Electron (optativo)

Cerrar primero la instancia normal y ejecutar desde DeadSingularity V1:

```powershell
npm.cmd run desktop -- --profile-performance
```

F12 abre DevTools separado. Performance permite grabar/exportar normalmente;
empezar sin Screenshots ni Advanced paint instrumentation y sin throttling.
El modo no cambia gráficos, GPU, sandbox, efectos, dificultad ni el guardado.
No se afirma corregido STATUS_ACCESS_VIOLATION: logs y dumps identificarán el
proceso nativo que falla. No grabar a la vez con DevTools y F8: comparten tracing.

## Captura alternativa de una partida real

F8 inicia; jugar 1–2 minutos y F8 detiene/exporta. El título indica GRABANDO,
PROCESANDO y TRAZA GUARDADA. F7 marca un momento (máximo 64 marcadores).
Menú Rendimiento permite límites de 60/120/300 segundos. F6 abre la carpeta.
Default: timeline de renderer/frames/GPU, sin screenshots, heap snapshots ni
muestreo CPU de funciones. Activar muestras JS en el menú antes de grabar si
se necesita atribución por función; hacerlo por separado para aislar el crash.

Salida de desarrollo: `local/profiling/`. Instalador: perfil de usuario/profiling.
Cada nueva grabación crea `captura-<fecha>-<id>/` con solo dos archivos:
`performance.trace.json.gz` (timeline completo, compresión sin pérdida) y
`session.json` (configuración, versiones, métricas, GPU, duración y motivo de fin).
F6 abre la última captura, no los logs generales. Enviar ambos archivos a la IA
y explicar qué oleada/momento se sintió lento. Para atribución de coste a funciones
JS activar muestras JS antes de grabar. Los archivos previos quedan intactos.
No queda un duplicado JSON nuevo tras exportar correctamente. Si falla la
compresión se conserva el JSON completo en su lugar, junto con el resumen.
Descomprimir `.gz` si el visor no lo admite; importar `.trace.json` en
Performance de Chrome o chrome://tracing. Las trazas
pueden contener rutas y datos del runtime: revisar antes de compartir públicamente.

Buffer nativo máximo 128 MiB, record-until-full: no pisa el principio. Se detiene
y exporta al 85% del buffer o al límite de tiempo; el sidecar informa motivo y
duración real. No se promete duración ilimitada ni carga cero al perfilar.
Cerrar la ventana intenta exportar antes de salir. Una caída del proceso principal
puede impedir guardar la traza; dumps locales/logs sirven para investigar.

`events.jsonl` registra eventos de procesos y de captura. `chromium.log` registra
Chromium. CrashReporter guarda dumps localmente y no los sube a ningún servidor.
El perfil de juego permanece el habitual: puede guardar progreso al jugar.

Fuentes: https://www.electronjs.org/docs/latest/api/content-tracing
y https://www.electronjs.org/docs/latest/api/structures/trace-config

## Validación y continuidad (2026-10-09)

- `npm run quality`: 190 archivos de tests, cero fallos.
- `tools/qa-performance-profile.cjs`: captura nativa 124,6 s (incluye vaciado),
  342.589 eventos y 12 marcadores; estado playing al inicio/final; gráficos high,
  particles=true y heavyVfx=true; cero renderer crashes. Ventana compositada
  oculta: no certifica presentación física ni el recording manual de DevTools.
- Captura separada de 10 s con muestras JS: 391 eventos Profile/ProfileChunk.
- `tools/qa-profiler-shell.cjs`: entrada real, menú F8, título y exportación;
  appData temporal y migración omitida solo en QA para preservar el perfil real.
- Evidencia: `local/validation/performance-profiler/qa-report.json` y trazas.

Pendiente específico: reproducir el STATUS_ACCESS_VIOLATION del usuario con
Recording de Performance. No está confirmado resuelto por abrir DevTools separado.
Si vuelve a fallar, compartir events.jsonl/chromium.log y dump local, además de
indicar si caía al iniciar, durante la captura, al detener o al exportar. F8 es
una alternativa de captura funcional, no un arreglo demostrado del crash nativo.
No mezclar grabación de DevTools y F8; el límite de buffer puede acortar el tramo.
No hubo commit/push. Cambios locales ajenos fueron preservados.

### Ventana oculta al abrir desde npm

La sesión del usuario arrancó y creó la ventana PERFILADO, pero Windows la dejó
oculta. Se verificó su HWND, título y PID antes de mostrarla sin cerrar procesos.
El launcher usa ahora windowsHide=false únicamente para --profile-performance;
el arranque habitual no cambió. Test de regresión comprueba ese flag, forwarding
de argumentos y limpieza de ELECTRON_RUN_AS_NODE. La ventana existente se mostró
y se verificó IsWindowVisible=true; no se tocó el perfil ni el servidor web.

### Exportación compacta por grabación

Validado: compresión sin pérdida, exactamente dos archivos por captura,
aislamiento entre grabaciones, conservación de archivos históricos y fallback
a JSON completo si falla gzip. Entrada real Electron: F8 exporta y F6 abre
la última carpeta. `npm run quality`: 190 archivos de tests, cero fallos.
Para usar este formato reiniciar la instancia de perfilado después de terminar
cualquier grabación en curso; una instancia ya abierta conserva el código anterior.
