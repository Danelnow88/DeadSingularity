# Pase de economía, amenazas y rendimiento

Código aplicado en `C:/Users/party/Desktop/DeadSingularity V1`. Cambios locales
previos conservados; sin commit, push ni publicación.

## Implementación

- `js/data/balance.js`: drop normal equivalente a 0,4% por dos segundos de
  combate elegible. Independiente de la frecuencia de refill: ~11,33% de al menos
  un arma por minuto sin boss y con piso libre. Cofres 8%, máximo un arma en piso.
- Tienda: tokens como moneda; seis tarjetas de armería, desbloqueo 2/2/5/10/15/20,
  una elección por visita; dos consumibles, pasivo temporal y componente raro 12%.
  Conserva mejoras de run y sus niveles. Detalles en `ECONOMY_2026-10-09.md`.
- Recompensa/Drop Shards: 4 s, un token cada cuatro bajas, máximo tres; sin
  acumulación. Precio corregido de 30 a 2: beneficio neto máximo un token.
- `js/engine/weapons.js`: fusión por duplicado o componente dirigido al arma
  poseída, máximo III. I aumenta daño; II introduce propiedad; III la amplía:
  pistola/rifle/sniper/láser perforan 3/4/7/5 objetivos, escopeta hasta 7 por
  descarga, plasma radio 88, arco búsqueda 270, llama alcance 225, empuje 120
  en SMG/railgun. No crece el inventario ni el número de rebotes sin límite.
- `js/engine/bullets.js`: presupuesto de penetración durante la vida completa
  del proyectil; grilla reutilizable para escenas con muchos pares, orden de
  impactos preservado y fallback después de callbacks. Colisión barrida de
  perdigones conservada; rechazo barato y distancias al cuadrado.
- `js/engine/enemies.js`: grilla de separación y buckets reutilizados, claves
  numéricas sin strings por vecino. La densidad en una celda conserva peor caso
  cuadrático: no se declara que todo el motor sea O(n).
- `js/render/dimensionalThreats.js`: lana compacta en V y bordes redondeados;
  cache acotado a cuatro superficies de alta resolución, revelado y glints vivos.
  Sniper mantiene bloqueo final de 180 ms; Devorador, preparación 1 s/activo
  2,6 s; sinergia acotada con enemigos básicos. Tanque conservado.
- `js/render/sectors.js`: composición del fondo completo en una textura fija;
  una pasada a calidad alta. Tres superficies como máximo (núcleo, detalle,
  composición), conservando opciones inferiores. Sin reducir partículas o arte.
- `js/render/enemies.js`: cinco Path2D persistentes para partes fijas de Dron y
  Velocidad, compartidos entre todos sus ejemplares. Ojos, rotores, movimiento,
  curvas animadas y todas las capas de glow conservados. Fallback vectorial en
  entornos sin Path2D. QA de píxeles: diferencia cero a cuatro escalas/rotación.
- `js/engine/performanceMonitor.js`: percentiles cacheados 250 ms correctamente.
- `js/ui/fpsCounter.js`: contador optativo en Ajustes → Gráficos → Mostrar FPS.
  Persistente, apagado por defecto, frames reales y dos actualizaciones DOM/s.
  Inferior derecha en PC, elevado en tienda; superior derecha en móvil.
- Dirección cromática y estrategia futura de lotes: `ART_DIRECTION.md`.
  La ruta medida es Canvas2D; el adaptador Three.js permanece opcional/inactivo.

## Evidencia y límites

`local/validation/overlap-performance` guarda mediciones Electron aisladas a
1920×1080 con 24 enemigos DURABLES, seis élites, las tres amenazas, escopeta III
y partículas. Calidad efectiva alta/full. Jugador invulnerable y enemigos dentro
de arena: se exige 24 vivos en cada muestra. Los informes anteriores (`before`,
`after`, `visible`, `fps-before`, `fps-final`) permitían muertes por contacto y
perdían densidad: NO prueban que la escena densa alcance 165 FPS sostenidos.

`dense-final`: ventanas visibles de 114–132 FPS, p95 12,2 ms, pico 48,6 ms.
`dense-visible-current` y `dense-visible-path-cache` comparan la cache nativa:
última ventana 132,9 → 133,7 FPS; p95 12,2 ms en ambas. No demuestra una mejora
perceptible robusta ni resuelve los tirones. La calidad visual sí quedó idéntica.
Estas dos pruebas incluyen tracing inicial, cuyo coste no debe atribuirse al juego.

`dense-trace.trace.json` registra dos segundos de actividad: el hilo GPU ocupa
~994 ms deserializando raster de Canvas y ~862 ms en flush de raster, mientras
el JS de cada frame es mucho menor. Son eventos anidados, no sumar todo el árbol.
El cuello principal observado es raster/composición; la grilla de colisiones por
sí sola no lo resuelve. Three.js está inactivo: instanciar allí no acelera Canvas.
Los diagnósticos `diagnostic-no-*` omiten capas sólo en memoria para aislar costes;
jamás se entregan como mejora ni modifican la calidad de producción.

Pendiente explícito: alcanzar 120–165 FPS sin saltos bajo solapamiento pesado.
No está certificado ni se declara terminado ese objetivo. Conservar trazas y
comparaciones a igual densidad para el siguiente pase de raster/GPU.

Confirmación final sin tracing: `dense-final-untraced`, 30 segundos visibles,
24 vivos en cada muestra, ventanas de 126–142 FPS, p95 ~12,2 ms; pico 48,5 ms.
Última ventana: 134,7 FPS; update p95 0,2 ms, draw p95 1,6 ms. No elimina saltos.
Hardware consultado localmente: AMD Radeon RX 7800 XT, pantalla a 165 Hz,
driver 32.0.31041.1004. No atribuir los problemas a hardware insuficiente.

Validación final: `npm run quality`: 189 suites, cero fallos; 105 recursos y
87 archivos de referencia intactos. Builds actuales:
- PC portable: `releases/DeadSingularity-V1-desktop-PKV1V7/win-unpacked/DeadSingularity.exe`.
- Web: `releases/DeadSingularity-V1-web-B5tYTX`.
- Launcher de desarrollo: `ABRIR_V1.cmd` utiliza el código actual; cerrar y
  abrir de nuevo para cargar los cambios. Instalador anterior NO actualizado.

QA real: `tools/qa-fps-counter.cjs` valida toggle, persistencia, posición PC/móvil
y equivalencia de píxeles del fondo (error medio <0,002 por canal, máximo 4/255),
además de equivalencia exacta de los cuerpos con Path2D.
`tools/qa-threat-redesign.cjs` valida daño, pausa, muerte y reset de las tres amenazas.
`tools/qa-crochet-pause.cjs` valida tejido y desafío sólo en pausa.
`tools/qa-shop-layout.cjs` valida tres secciones, slots y elecciones.

Repetir diagnósticos:

```
npm run measure:economy
npm run measure:overlap -- --visible --seconds=30 --label=manual
npm run quality
```

El harness usa un perfil temporal aislado. Si termina sin informe nuevo, el
launcher lo marca fallido: un cierre temprano no cuenta como una medición válida.

Siguiente paso: optimizar raster de entidades manteniendo su composición y su
animación, con comparación GPU A/B y validación de píxeles. El contador permite
corroborar resultados en la versión real; no sustituye el p95/p99 del diagnóstico.
