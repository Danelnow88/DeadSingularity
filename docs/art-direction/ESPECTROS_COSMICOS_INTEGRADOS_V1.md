# Espectros cósmicos — integración aprobada

Fecha: 16/10/2026. Alcance: aspecto y animación de Arquero, Guardia y Núcleo.

## Selección

- Arquero: `archer-bronze-trial-v1.png`.
- Guardia: `guard-synth-v2.png`, sin recolorear.
- Núcleo: `core-gold-red-stars-trial-v2.png`, dorado con puntos interiores rojos.

Copias de producción en `assets/cosmic-specters/`, originales y pruebas intactos.
Las placas limpias se usan exclusivamente dentro de máscaras oculares, nunca
como sustitución del cuerpo aprobado. No se generaron imágenes nuevas al integrar.

## Conexión

`index.html` carga `js/render/cosmicSpecters.js`; `js/game.js` precalienta sus
recursos y entrega el estado real del arpón al renderer espectral. El renderer
consume el rig solo si está listo; si falta/carga una textura conserva fallback.
No modifica entidades, hitboxes, daño, tiempos, composición, habilidades o IA.

Tamaños aprobados: Arquero 112, Guardia 124, Núcleo 118 px en la referencia
1920/900 del laboratorio; la cámara conserva su escala normal.

Ojos siguen al jugador, párpados y órganos responden a estados reales. Guardia
abre sus laterales al proteger, Núcleo abre lóbulos/apertura al preparar zona,
Arquero orienta su cuerpo y flexiona el órgano de disparo. Se respeta la preferencia
de movimiento reducido. Los estados de daño/congelación conservan su overlay.

En esta promoción se conservan las señales externas importantes existentes,
incluido windup del arpón: no se promueve aún la opción experimental que las oculta.
Su sustitución requiere validación de legibilidad en una partida real.

## Costo acotado y límites de la verificación

Seis imágenes cargadas una vez y piezas cacheadas, aproximadamente 2 MiB de
cachés RGBA derivadas (no incluye imágenes decodificadas ni memoria GPU total).
3/5/7 drawImage base por criatura; párpados añaden llamadas durante parpadeo.
Sin blur, filtros, readback ni generación de texturas por frame.

`node tools/qa-cosmic-specters.cjs` prueba el índice real en Electron con perfil
aislado. Verifica rutas de los tres enemigos del roster, recursos listos, dibujo
efectivo, estado de entidades intacto, contexto balanceado y consola sin errores.
Captura y reporte en `local/validation/cosmic-specters-production-20261016/`.
`tests/cosmic_specters_production.js` cubre caché, ojos, piezas y gestos por estado.
Esto no es un benchmark de GPU ni garantiza 165 FPS en combate denso.

Verificación final: `npm run quality` completado, 239 suites y cero fallos;
179 recursos de entrega verificados, 87 archivos de referencia congelados intactos.
Registro: `local/validation/cosmic-specters-production-20261016/quality.log`.

## Prueba del usuario

Cerrar completamente Electron anterior y abrir `ABRIR_V1.cmd`. El spawn no se
adelanta para mostrar arte: aparecerán donde corresponde al roster actual.
Los laboratorios anteriores siguen siendo pruebas históricas, no la selección
automática de texturas de producción. Cambios futuros pueden versionar recursos
y modificar el módulo sin rehacer la simulación.
