# Despliegue: ajuste de 8 a 10 — 2026-10-10

El usuario probó el límite de ocho, encontró poca población y solicitó dos
enemigos adicionales. ACTIVE_HOSTILE_LIMIT pasa a 10. Se cuentan todos los
hostiles activos de la arena, incluido el jefe, no solamente los visibles.
Laboratorio y techos de emergencia conservan 30 hostiles / 7 pesados.

No se cambian renderizadores, efectos, estelas, resolución, estadísticas ni
botín por enemigo. Es un ajuste autorizado de concurrencia, no una mejora
de rendimiento con carga idéntica. No garantiza 120 FPS ni corrige por sí
solo las caídas a 90 FPS que observó el usuario. Como las oleadas son
temporizadas, mantener duración y reposición tampoco garantiza el mismo
número total de bajas/recompensas que con otro presupuesto.

Pruebas actualizadas: admisión hasta diez, liberación al morir, inclusión
del jefe, rechazo atómico de una invocación triple sin plazas suficientes,
equivalencia de los enemigos y admisión independiente del tamaño de arena.
El apoyo de jefe temprano conserva su objetivo original 5/7/9 por dificultad
cuando éste está por debajo del nuevo techo.

Respaldo inmediatamente anterior: local/backups/performance-health-20261010/deployment-10/.
No restaurar desde Git ni sobrescribir cambios posteriores. No commit ni push.

## Perfilado

El modo optativo de Electron ofrece DevTools separado y captura alternativa
de tracing con F8. No se modificó Edge ni se confirmó resuelto el crash nativo
STATUS_ACCESS_VIOLATION del profiler. Ver docs/PROFILING.md.

La grabación de Edge exportada desde Performance (.json o .json.gz) es útil
para investigar las caídas reales. Registrar oleada, navegador, resolución,
pantalla completa y gráficos; no extrapolar una captura a otros equipos.
No medir FPS de aceptación con el profiler activo: añade carga.
