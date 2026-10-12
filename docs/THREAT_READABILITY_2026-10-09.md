# Amenazas y limpieza visual — 2026-10-09

Nota de revisión: la reforma posterior y sus parámetros actuales están en
`THREE_THREATS_POLISH_2026-10-09.md`. El corte remoto/snapshot de tirador y los
timings descritos debajo son históricos; no usar esa receta para validar la versión actual.

Alcance confirmado: Costurero, Francotirador dimensional y Devorador; Eco excluido. Sin cambios de estadísticas, drops, bosses ni reglas de dimensiones. Sin commit, push o publicación.

## Implementado

- `js/engine/dimensionalThreats.js`: el francotirador dispara tres agujas viajeras durante 0,65 s, con colisión barrida del tramo recorrido, en lugar de daño instantáneo sobre rayos completos. Conserva snapshot, un impacto por descarga y defensas del jugador. Costurero incorpora desplazamiento relativo del filo en su colisión barrida.
- `js/render/dimensionalThreats.js`: agujas materiales y costura que se ensambla antes del barrido; portales con proyectiles visibles sin líneas de trayectoria; boca del Devorador con mandíbulas periféricas, materia oscura y borde interior que comprime. Animación de apertura y retroceso corporal. Sin partículas persistentes, textos ni buffers nuevos.
- `js/render/metaReadability.js`: densidad, contacto, intención genérica y leyenda apagados por defecto; API de diagnóstico opt-in preservada. Feedback de daño y objetivo de autodisparo conservados.
- `js/render/enemies.js`: drones anuncian la embestida con propulsión localizada; desaparecen línea punteada y aro de formación. Tanques conservan carga del cañón y proyectil real, sin cruz en el suelo.
- `js/render/hazards.js`: etiquetas sólo en debug explícito; sin líneas punteadas de aviso. Emisores láser cargan en su cuerpo y dibujan el haz durante actividad. Se mantienen los límites de peligros existentes para no volver invisible su colisión.

## Validación y prueba local

Pruebas específicas: `tests/dimensional_threats.js`, `meta_density.js`, `enemy_intent_artifact.js`, `old_visual_artifacts.js`, `tank_visual_cleanup.js`, `hostile_signal_geometry.js`. Los diagnósticos antiguos se prueban con activación explícita; producción comprueba defaults limpios y ausencia de etiquetas.

`tools/qa-dimensional-threats.cjs` valida las seis fases, pausa, impactos, eliminación por arma real y reset en Electron. En el encuentro mixto una conexión de Costurero puede ser bloqueada por invulnerabilidad posterior a otro daño: la prueba respeta esa defensa. Capturas y resultados en `local/validation/dimensional-threats` y variante `-mobile`.

Abrir el juego desde esta carpeta con `npm start`; en el laboratorio elegir `rift_weaver`, `dimension_sniper` y `void_devourer`. Probar salir lateralmente de las agujas, cruzar/esquivar el filo y abandonar la boca antes de su cierre. Los efectos desaparecen al morir o aturdir a su dueño.

No se añadió un sistema de misiles global ni se reemplazaron mecánicas de otros arquetipos: la aclaración del usuario limita la reforma mecánica a estas tres entidades. Se conservan las zonas funcionales de otros enemigos y sectores; se limpió su telemetría sin cambiar sus hitboxes.

## Cierre

182 archivos de pruebas aprobados; sintaxis de 138 archivos, catálogo y entrega aprobados. QA Electron escritorio y móvil aprobado: seis fases, daño real (respetando invulnerabilidad), pausa, bajas con arma real y reset. Build local: `releases/DeadSingularity-V1-web-VhpYq6` (104 recursos, 7,38 MiB). Capturas inspeccionadas en escritorio. Listo para prueba manual del usuario; no quedan pasos de implementación pendientes dentro del alcance descrito arriba.
