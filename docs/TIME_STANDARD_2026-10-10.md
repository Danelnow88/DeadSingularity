# Tiempo independiente del refresco — etapa 1

2026-10-10. Autorización: aplicar la solución recomendada, conservando gráficos.

## Aplicado

js/engine/enemies.js amortigua knockVelX/Y por tiempo transcurrido:
`decay = Math.pow(0.92, Math.max(0, dt) * 60)`.
Se calcula una vez por update, no por enemigo. La trayectoria a 60 Hz es
exactamente la anterior en el escenario de regresión; a mayores refrescos el
retroceso deja de apagarse artificialmente antes. Con dt=0 no se consume.
No cambian daño, fuerza inicial, renderer, estelas, efectos ni límite de diez.
index.html recibe una revisión de caché del script y se regenera el manifiesto.

tests/knockback_time.js ejercita el updateEnemies real a 30/60/120/144/165 Hz,
dt irregular y dt cero, y compara el escenario de 60 Hz con el decay anterior.
La igualdad entre refrescos comprobada es la velocidad restante de retroceso,
no toda la trayectoria: la integración de posición sigue siendo de paso variable.
Las mediciones a 30 Hz ejercitan el motor directamente, no eliminan el clamp
de 30 ms que todavía usa el coordinator.

## Reglas de continuidad

- Unidades/segundo para velocidades; segundos para duración/cooldown.
- Retención por tiempo: `r^(HzReferencia*dt)`; suavizado: `1-exp(-k*dt)`.
- Frame sirve para identificar updates, no como reloj de física/animación.
- Separar simulación de presentación antes de ejecutar substeps del coordinator.
- Mantener pausa, hitstop, orientación y tab oculta como políticas explícitas.
- No cambiar velocidad artística de animaciones frame-based hasta validar
  referencia: convertirlas a 60 Hz podría alterar el aspecto temporal actual.
- No atribuir mejora de FPS a una corrección temporal sin benchmark equivalente.
- No confundir trazas sin eventos de crash con resolución de STATUS_ACCESS_VIOLATION.
- Un mismo gameplay para desktop/web/mobile. Pools y cachés deben ser acotados,
  con pruebas de liberación; no degradar efectos ni densidad como optimización.

## Pendiente, no implementado silenciosamente

El clamp de dt=0.03 todavía pierde tiempo en frames lentos. No se amplía sin
validar colisión y ataques. Se requiere separar simulación/presentación antes
de un acumulador con substeps: repetir update() hoy repetiría frame counters,
decisiones aleatorias, trabajo DOM y emisión de efectos.

El frame-based de estrellas, cuerpos comunes y parpadeo de kamikaze tampoco
se cambió. El siguiente trabajo de rendimiento debe medir composición,
superficies/cachés y lecturas DOM a carga equivalente, sin profiler activo.

## Recuperación y validación

Respaldo del estado local previo: local/backups/knockback-time-20261010/.
Preserva cambios locales, no solamente Git. No reset/restore/commit/push.
Suite: npm run quality; log local/validation/performance-health/quality-knockback-time.log.
Build: npm run build:web. El instalador anterior no se actualiza automáticamente.
