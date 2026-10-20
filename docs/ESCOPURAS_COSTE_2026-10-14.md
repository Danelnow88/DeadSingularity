# Escopuras: aislamiento y candidato descartado

Se conserva el diseño actual. No se cambia su mecánica, ojos, tamaño, animación
ni ataques. La integración del Enjambrito limpio sí quedó en producción.

## Aislamiento

Escena mixta congelada de21 actores actuales, 1080p high/full. Dos Escopuras.
Control / sin dibujar Escopuras / control: 164,29 /164,79 /161,95 FPS.
Raster medio: 3,194 /2,982 /3,195 ms. Quitar ambos dibujos reduce ~0,213 ms
de raster en esta escena; NO es una propuesta para quitar entidades del juego.
No extrapolar como coste fijo por enemigo: depende del tamaño/solapamiento.

## Cache de cuerpo y boquilla

Se probó precalcular dos superficies a4x, mismos contornos, relleno y luz.
Ojos, membrana pulsante, cinco filamentos, motas y aviso de carga seguían vivos.
Durante windup se mantenía el render vectorial original para no muestrear el
aviso de ataque. Esto no cambió la simulación ni los estados.

Control A /cache A /control B /cache B:
156,63 /154,81 /157,79 /158,96 FPS.
Raster medio: 3,351 /3,389 /3,317 /3,263 ms.
No hubo ventaja consistente del cuadro completo; p99 sigue en12,2 ms.
El candidato fue retirado de js/render/enemies.js. No hay cache experimental
activo o superficie reservada en la partida normal.

Informes: local/validation/gpu-layer-audit/escopuras-isolation-20261014-summary.json
y escopuras-cache-corrected-20261014-summary.json. Duraciones raster incluyen
envío y esperas, no tiempo exclusivo de hardware GPU. La primera corrida
escopuras-cache-20261014 combinó también diagnóstico nativePaths: es inválida
para atribuir coste al cache; se repitió correctamente con cachedSpitter.

## Siguiente paso

Si se rediseña Escopuras, hacer una propuesta animada coherente con los élites,
con ojos vivos y ataque reconocible, tratando el conjunto de detalles repetidos
(ojos/superficies secundarias) y no solo sus dos contornos principales. Comparar
el cuadro completo y pedir valoración visual antes de adoptar una estética nueva.
No está demostrado que redibujar todo el catálogo consiga165 FPS estables.
