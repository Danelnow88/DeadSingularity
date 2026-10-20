# Élites y enemigos densos — investigación y recorrido aprobado

El usuario confirmó que el juego mejoró y autorizó una revisión visual más
profunda, por etapas. Primero estudiar costo, luego presentar diseño animado,
después integrar cambios de roster y concurrencia con cuidado.

## Decisiones y orden

1. Conservar Asesino (violeta), Fantasma (blanco/cian claro) y Goliat (rosado),
   preservando sus mecánicas diseñadas por el usuario.
2. Retirar Comandante, Bastión y Centella del roster de partida cuando se integre
   esta etapa. Revisar referencias, recompensas, selección, laboratorio y
   persistencia: no borrar archivos compartidos de mecánicas indiscriminadamente.
3. Establecer un límite específico de élites simultáneos y aparición más rara.
   El número y la cadencia aún no se definieron. El límite debe contar entidades
   existentes, no ocultar enemigos que siguen atacando.
4. Proponer y mostrar un diseño más económico, vivo y no humanoide para los tres
   conservados. El usuario debe poder verlo antes de adoptarlo en partida.
5. Revisar Enjambrito y Escopuras conservando animación e identidad; los candidatos
   de caché/ojos de la etapa anterior no dieron ahorro consistente y fueron
   retirados. No reactivarlos sin otra medición.
6. Espectro Arquero, Guardia y Núcleo quedan conservados por ahora. Bosses y
   objetivos Núcleo I/II/III no se modifican en esta etapa.

## Investigación realizada

Se amplió `tools/performance/gpu_layer_audit.cjs` con omisiones exclusivamente
servidas en el proceso de diagnóstico: cuerpos Hydra, ojos, partículas, halo
corporal y tinta interior. El archivo de render de producción no se modificó.

Escena: roster promovido vigente, 24 entidades incluyendo las seis élites,
1080p, calidad alta/full, escopeta F3, partículas, explosiones y entorno reactivo.
Estado de combate congelado e idéntico entre variantes; el reloj visual continúa.
Cadencia de rAF medida sin tracing; trace de GPU en una ventana posterior.
No es una partida humana de oleadas 5–10 ni una prueba de todos los consumibles.

Primera pasada:

| Variante diagnóstica | FPS medios | Raster media (ms) |
|---|---:|---:|
| Completa, inicio | 124,51 | 4,092 |
| Sin cuerpos Hydra | 130,76 | 3,854 |
| Sin ojos Hydra | 129,80 | 3,984 |
| Sin partículas Hydra | 129,67 | 3,991 |
| Sin halo corporal Hydra | 128,87 | 3,977 |
| Sin tinta interior Hydra | 128,80 | 4,301 |
| Completa, final | 128,63 | 3,969 |

El control cambió durante la pasada; ojos, partículas y halo no dieron una
ventaja clara por encima del control final. La tinta interior no mostró ahorro.
No se justifica quitar cualquiera de esos detalles solo con esta pasada.

Confirmación independiente, mismo estado dentro de esta segunda ejecución:

| Variante diagnóstica | FPS medios | Frame p95/p99 (ms) | Raster media/p95/p99 (ms) |
|---|---:|---:|---:|
| Completa, inicio | 145,46 | 12,10 / 12,20 | 3,602 / 4,027 / 4,231 |
| Sin renderer completo de las seis élites | 163,12 | 6,20 / 12,00 | 3,192 / 3,664 / 3,812 |
| Sin cuatro lóbulos de las seis Hydra; ojos y partículas siguen | 151,10 | 12,10 / 12,20 | 3,331 / 3,803 / 4,070 |
| Completa, final | 147,28 | 12,10 / 12,20 | 3,552 / 3,940 / 4,156 |

Las dos ejecuciones tienen escenas congeladas distintas: no comparar sus FPS
absolutos entre sí. Raster corresponde a `RasterDecoderImpl::DoRasterCHROMIUM`
del proceso GPU, incluye envío/esperas y no es un timer de hardware exclusivo.
Las categorías se solapan. `gpuMs:null` significa que ese evento no estaba
disponible; no significa costo cero. No prometer 165 estables por esta prueba.

Fuentes y trazas locales: `local/validation/gpu-layer-audit/`
`elite-components-20261014.json`, `elite-components-20261014-summary.json`,
`elite-components-confirm-20261014.json`,
`elite-components-confirm-20261014-summary.json` y sus trazas por variante.

## Qué implica para el diseño

Las seis élites comparten RB6/Hydra: cuatro polígonos deformables, capas de
contorno, tres ojos con varias capas y partículas orbitales. El perfil alto ya
evita blur Canvas y jitter aleatorio en estos cuerpos; el ajuste previo quitó
halo/tinta repetidos de los tres lóbulos secundarios. No hay evidencia de que
las funciones trigonométricas sean el cuello principal: el problema medido
anteriormente y esta investigación apuntan al dibujo/composición.

Retirar tres especies no garantiza ahorro si las otras tres ocupan la misma
cantidad de slots. El cambio útil combina un renderer más económico y menor
concurrencia de esta familia. Mantener la densidad global con enemigos comunes
puede compensar espacio, pero debe medirse: no todos los comunes cuestan igual.

Dirección técnica de la futura propuesta visual: piezas con arte preparado y
movimiento continuo de posición, giro, escala y ojos a la frecuencia del juego;
concentrar la deformación viva en una superficie pequeña. Comparar contra el
modelo actual en la misma escena y mostrar una vista animada. No adoptar una
hoja de sprites a baja frecuencia que vuelva tieso el movimiento.

## Investigación posterior: núcleos como referencia

`js/render/inertiaChamber.js` dibuja los tres núcleos mediante imágenes recortadas
preparadas al cargar, un atlas de ocho cuadros para los escapes y piezas
articuladas con transformación continua. Esto explica que con mucho detalle
puedan evitar reconstruir todo el arte con paths cada cuadro. Tiene cables,
luces de carga y un filtro brightness durante carga/impacto: esos estados deben
incluirse en una futura comparación GPU, no solo reposo.

No se midió todavía su costo GPU comparable al de un élite, por lo que no se
afirma que sean más baratos ni que puedan usarse masivamente sin costo. Comparar
a tamaño equivalente y con igual número de entidades; separar precarga del
costo estable. Los núcleos actuales no fueron modificados.

## Estado al finalizar esta etapa

Auditoría y plan registrados; ninguna especie retirada, ningún cap cambiado y
ningún diseño nuevo integrado. Siguiente paso: prototipo visual animado aislado
para Asesino/Fantasma/Goliat, medido y visible para revisión del usuario.
Después integrar el roster de tres y el límite específico acordado. Sin commit
ni push.
