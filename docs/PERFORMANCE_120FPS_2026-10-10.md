# Objetivo de rendimiento: 120 FPS sostenidos en PC

El usuario eligió 120 FPS mínimos sostenidos, conservando exactamente el arte,
estelas, resolución, efectos, sonido y gameplay. La música experimental no forma
parte de las pruebas. No hay autorización para reducir hostiles ni alterar oleadas.

## Capacidad observada, no una optimización entregada

Electron 44.5, ventana visible 1920x1080, RX 7800 XT/ANGLE D3D11. Perfil temporal,
high/full, partículas y heavyVfx activos, reducedEffects=false. Enemigos durables,
proporción aproximada 15 drones / 9 runners, escopeta III y 200 partículas cada
120 ms. Warmup de 4 s; muestras exploratorias de 12–15 s, sin tracing.

| Hostiles | Composición | FPS medios |
| --- | --- | --- |
| 12 | 8 drones + 4 runners | 149,12 |
| 18 | 11 drones + 7 runners | 120,24 |
| 24 | 15 drones + 9 runners | 98,99 |
| 30 | 19 drones + 11 runners | 92,85 |

El p95 final del intervalo entre cuadros fue aproximadamente 12,1–12,2 ms en
los cuatro casos. **Ningún caso certifica 120 FPS estables** bajo un criterio
de p95 <= 8,33 ms. Los resultados son callbacks del renderer, no presentaciones
físicas medidas. Corridas únicas exploratorias no son garantía para otras
resoluciones, hardware, jefes, dispositivos o sesiones prolongadas.

Reportes: `local/validation/overlap-performance/capacity-*.json` y sus PNG.
El ensayo aislado que omitió el perímetro dio 111,37 FPS con 24 enemigos;
es una omisión gráfica diagnóstica y no una candidata de producción ni una
comparación A/B repetida. El perímetro sigue íntegro en el juego.

## Candidatas aisladas

Una salida temprana del perímetro cuando toda la vista está dentro de la arena
quedó sólo como borrador. La cámara cercana al borde del escenario medido
limita su aplicación; no se validó ni instaló.

Se prototiparon dos superficies por dron (cuerpo y rotor fijo, rasterizadas a
4x), conservando pintura dinámica de ojos, hélices y luces. La comparación nativa
falló en 36 de 216 casos: diferencia máxima de canal 126/255. No cumple igualdad
visual. Una corrida exploratoria dio 117,82 FPS; no demuestra mejora sostenida,
no alcanza el objetivo y no autoriza instalarla. Candidata descartada.

Código/evidencia: `local/backups/performance-health-20261010/capacity-120fps/`.

## Reglas para continuar

1. La aceptación visual exige igualdad de píxeles en las pruebas comparables;
   ningún efecto, estela, animación o resolución se recorta para ganar FPS.
2. Las mediciones de aceptación deben usar ventanas visibles, high/full,
   música experimental inactiva, carga equivalente y profiler desactivado.
3. Como objetivo de fluidez: 120 FPS medios o más y p95 de cuadro <= 8,33 ms.
   Registrar también p99 y pausas; no confundir promedio con estabilidad.
4. Para certificar una candidata: al menos tres corridas de 60 s, y pruebas
   separadas de comunes, jefes y solapamiento de ataques. No extrapolar el
   resultado de una GPU a todos los dispositivos. Hardware y refresco deben
   poder presentar 120 Hz o más; una pantalla de 60 Hz no lo puede certificar.
5. Sólo se promueve código que conserva imagen y gameplay y mejora de forma
   repetida. Las pruebas descartadas no se integran ni publican.
6. Un presupuesto de enemigos simultáneos puede conservar todos sus gráficos,
   pero cambia presión/ritmo de las oleadas. Requiere autorización explícita y
   pruebas de balance. Los 12 hostiles son un punto exploratorio con margen
   promedio, no un límite aprobado ni una promesa de 120 FPS estables.

No está demostrado que optimizar más sea imposible. Sí está demostrado que las
microoptimizaciones probadas no resuelven 120 FPS con la carga actual. Los pasos
siguientes son una intervención mayor de render que debe preservar la imagen,
o un presupuesto de concurrencia aprobado por el usuario.

## Integridad del juego

En esta etapa no se modificó código de producción. Los hashes de game.js,
render/enemies.js, render/canvas.js y render/sectors.js siguen iguales al inicio.
En engine/fx.js el único diff local respecto de Git es el formato de números de
daño; la implementación de la estela no cambió. Las ventanas de prueba utilizan
Rook y una partida temporal, nunca el perfil o guardado real del usuario.
No commit, push, cambios de driver, flags de GPU ni límite nuevo aplicado.
