# NEON VOID — alpha de expedición

Referencia de diseño: `NEON_VOID_investigacion_mejora_sistemica.txt` del usuario.
Fecha: 2026-09-29. No se publica ni se modifica la cuenta de Steam.

## Criterio de entrega

Partida iniciable, jugable y reiniciable, sin dependencia remota obligatoria.
Conservar pilotos, movimiento progresivo, diez armas, consumibles, opciones y arte procedural.
Cada sistema nuevo necesita regresiones ejecutables y prueba real de navegador.
No confundir “alpha distribuible” con aprobación comercial de Steam.

## Decisiones

- Expedición de 20 oleadas: cuatro sectores, cuatro jefes, victoria y modo infinito opcional.
- Rutas de jefes rotativas para reutilizar los diez encuentros con identidad.
- Arsenal secundario sincronizado parcialmente; entrenamiento de recuperación, sin regalar daño infinito.
- Preparación limitada a una elección por parada: reparación, entrenamiento o contrato de habilidad.
- Recompensas por completar, jugar sin daño y cumplir objetivos; perfil local con récords.
- Checkpoint versionado entre oleadas, nunca serializar proyectiles, callbacks ni enemigos vivos.
- Jefes con avisos y descansos, sin doble avance de reloj en fase 2.
- Fusión extrema con amenaza acotada y mecánica anticipable, no crecimiento ilimitado de daño.
- Distribución offline por lista permitida: excluir documentos personales, logs y herramientas del laboratorio.

## Verificación y límites

El registro final de cambios, pruebas y pendientes se completa en `ALPHA_RELEASE.md`.
Respaldo previo fuera del proyecto: `work/neon-void-before-alpha-20260929.zip` en el espacio de trabajo de Codex.
No borrar ni modificar ese respaldo. No hacer commit/push sin solicitud del usuario.
