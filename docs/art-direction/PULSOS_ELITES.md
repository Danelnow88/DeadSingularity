# Anticipación luminosa de Asesino, Fantasma y Goliat

19/10/2026. Aplicado en `js/render/refinedElites.js`. No cambia el comportamiento,
la temporización, el daño, la física, la escala, el material basalto ni los ojos.

## Señales

- Asesino: primer latido y carga violeta creciente en `execution_windup`, siguiendo
  el valor real `ELITE_PREDATOR_HUNTER.executionWindup` (actualmente 0.30 s).
- Fantasma: encendido inicial al materializarse y carga cian intensa durante
  `entry_windup` antes de entrar. No se ilumina mientras acecha, posee o se recupera.
- Goliat: carga rosa intensa durante `slam_windup` y una carga menor al final
  de `aftershock_window`, antes del segundo golpe.

Los avisos y áreas existentes siguen activos: la luz complementa la lectura, no
pretende reemplazar información espacial. `prefers-reduced-motion` usa rampas
sin el latido inicial. El reloj de iluminación es el temporizador de la IA, no
un oscilador libre. `NV.__refinedEliteAttackLighting=false` permite comparar.

## Costo y diseño de caché

Ocho niveles por criatura en un atlas de 4×2, construido durante precarga.
Selección cromática de tejido violeta/cian/rosa; iluminación de proximidad y spill
obtenidos por Gaussianas de 3 y 10 píxeles **solo al preparar texturas**. No se
dibujan capas de luz adicionales ni se usan filtros/blur por cuadro. Continúa
un dibujo de cuerpo y tres lentes. Ojos, pupilas y animación conservan su código.

El resplandor es notorio, no un cambio sutil de brillo. El margen de luz ocupa
32 píxeles de caché por lado (~8 unidades de mundo); no se expande la hitbox.
En reposo se muestrea únicamente el cuerpo original; durante la carga se incluye
el margen. Dos píxeles transparentes entre celdas evitan contaminación bilineal.
El fade propio de Fantasma sigue intacto; el halo sí introduce transparencia
visible alrededor del tejido, intencionalmente. Los PNG originales no cambian.

Trade-off: los tres atlas de producción ocupan 17,267,328 bytes RGBA (~16.47 MiB),
frente a ~1.5 MiB de los cuerpos previos. No es el consumo total del driver:
Canvas/Skia pueden conservar copias adicionales. No se precarga la colección
histórica `painted-v1` en la partida normal. En navegadores sin soporte del filtro
de preparación se conserva el cuerpo anterior sin el efecto.

## Mediciones y límites

`node tools/qa-elite-attack-light.cjs --three` y sin argumento para 30 élites.
Electron 1080p offscreen, 165 Hz solicitados, orden ABBA, cuatro segundos por
muestra tras calentamiento, mismo dibujo/movimiento/ojos/temporizadores. El
bucle del lobby se detiene solo en el código servido por el test para no mezclar
dos escenas de render. Referencia: cuerpo único anterior, sin atlas. Candidato:
atlas intenso actual. Es una prueba aislada, no una certificación de partida.

| Élites | Referencia FPS (dos muestras) | Pulsos FPS (dos muestras) | p95/p99 de cuadro en ambos |
| --- | --- | --- | --- |
| 3 | 165.01 / 164.77 | 163.53 / 165.02 | 6.1 / 6.2 ms |
| 30 | 164.27 / 164.77 | 164.76 / 164.30 | 6.1 / 6.2 ms |

La diferencia media de envío CPU fue ~0.004 ms con tres y ~0.025 ms con treinta.
No se detecta regresión relevante de p95/p99 en esta muestra; no se afirma costo
cero ni se garantiza 165 FPS cuando se superponen todos los efectos del juego.

Trazas separadas: con 30 élites, `RasterDecoderImpl::DoRasterCHROMIUM` medio
0.368→0.382 ms por evento y `Display::DrawAndSwap` medio 0.996→1.014 ms.
Con tres: raster 0.156→0.158 ms y compositor 1.078→1.016 ms. Son duraciones del
proceso GPU, no timers de hardware, y no deben sumarse para calcular GPU/frame.
No hubo contador `GPUTask` disponible; no se inventa un tiempo GPU total.

La prueba adicional con IA real del roster de producción ejercitó las tres
anticipaciones. Verifica entidades sin mutación desde el renderer, emisión visible,
ojos, cuerpo opaco, spill y carga `file://`. Capturas/trazas/informes bajo
`local/validation/elite-attack-light/` y `actors-3/` (no se distribuyen).

Pruebas unitarias: `tests/elite_attack_light.js` y `tests/basalt_material.js`.
No se alteraron simulación, shaders ambientales, densidad ni calidad gráfica.
