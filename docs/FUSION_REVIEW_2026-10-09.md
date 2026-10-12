# Limpieza de la captura y evaluación de fusión

Actualización tras «seguí con el resto»: retirada mecánica completada. Eliminados agrupación, suma de HP/daño, crecimiento, recolor, promoción a heavy, recompensas extra y pulso fusionado. Fusión de armas intacta.

Reemplazo del pulso global: una descarga física de tanque, máximo una cada 2 s en normal (2,15 fácil / 1,85 difícil), sólo en oleadas 1–4, sin boss activo, fuente visible y a distancia mínima 100. Proyectil velocidad 280 y radio 7, trayectoria fijada al disparar; daño por el pipeline normal de balas, con invulnerabilidad, reflexión y esquiva originales. Respeta presupuesto global. No fuerza la aparición de tanques para mantener artificialmente la frecuencia. Muzzle flash pequeño sustituye los aros retirados.

Presión: se conservan todos los cuerpos que antes se condensaban; total de HP y estadísticas individuales intactos, caps 30/7 intactos. No se aumentó el director. Esto puede aumentar ataques simultáneos y devolver recompensas de enemigos que antes desaparecían al fusionar; no se promete equivalencia exacta de dificultad. QA Electron con 14 enemigos, seis tanques, sin fusión, con artillería real, pausa y reset aprobado. La evaluación de abajo documenta el estado previo y la decisión.

## Cambios realizados

- El ataque «¡SALÍ!» provenía de `js/engine/wavePressure.js`: seleccionaba el primer enemigo vivo, fijaba la posición del jugador y detonaba un círculo. Afectaba oleadas 1–4 sin boss activo. Retirado por completo: ni marca, ni línea, ni daño. La API vacía conserva compatibilidad con reinicios y snapshot. No se añadió sustituto: el usuario indicó primero eliminarlo y después considerar otro ataque.
- Los tres trazos del tanque eran un halo blanco, arco rojo expansivo y arco blanco interior de `atkFlash` en `js/render/enemies.js`. Excluido tanque de ese overlay y del equivalente espectral. Conserva cañón, carga y proyectil real.
- Retirados aros y nombres de fusión en ambos renderers; eliminado el texto emergente al fusionar y el nombre agregado a la recompensa. Conservados tamaño, color, HP y mecánicas actuales hasta decidir su destino.

## Evaluación: retirar es la opción recomendada

La fusión no es sólo cosmética: une al menos tres enemigos de la misma especie, suma su HP, limita el daño resultante a 45 y aumenta radio hasta 60. Puede cambiar clasificación a medium/heavy; agrega shards y score. Nivel 2 añade un pulso de radio 65 con preparación de 0,85 s, interrumpible mediante daño, y cooldown de 4,5 s. Esto requiere mantener agrupación, cuotas, recompensas, cancelaciones y otro lenguaje de ataque.

El coste visual y de mantenimiento es alto para un resultado cuya identidad sigue siendo el enemigo original agrandado. No recomiendo inventar más nombres o contornos. Una evolución que justificara mantenerlo necesitaría siluetas propias y comportamiento específico por familia, ampliando sustancialmente el alcance.

Siguiente paso propuesto, pendiente de decisión: retirar agrupación y pulso, conservar los enemigos individuales y medir presión, tiempo de limpieza y recompensas. No compensar ciegamente con más HP o más spawns: conservar varios cuerpos ya cambia la presión. Ajustar luego sólo un parámetro del director y comparar normal antes/después. No se aplicó esa modificación mecánica en esta revisión.

El reemplazo futuro del pulso global podría ser un proyectil real de una familia concreta, con la cadencia anterior como referencia, respetando límites de balas y defensas. No convertir automáticamente cualquier enemigo en artillería.
