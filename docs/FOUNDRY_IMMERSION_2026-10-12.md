# Fundición: ambiente vivo — 12/10/2026

Etapa visual centrada en Fundición. Los otros siete escenarios, el balance,
enemigos, portales, guardados y límites de arena no se cambian.

## Implementación

- `js/render/foundryAtmosphere.js`: fondo WebGL independiente por debajo del
  Canvas de combate; dos texturas subidas una sola vez. Circulación diferencial
  elíptica localizada alrededor del núcleo de la galaxia, paralaje tenue y
  variantes espejo preservadas. No deforma personajes, balas ni HUD.
- Materia próxima: tres bancos de polvo con textura cacheada, delante/detrás
  del personaje. Iluminación tenue y estela reactiva al desplazamiento/dash;
  buffer fijo de 16 perturbaciones. No se recalcula ruido/gradientes por frame.
- Reloj visual existente: la animación se congela en pausa. Resize observado,
  sin lecturas de layout por frame; falla de WebGL o pérdida de contexto vuelve
  al fondo Canvas aprobado. Sin readback GPU→CPU ni copia del frame de combate.
- La transparencia del Canvas se activa únicamente mientras el fondo GPU está
  listo; los demás mapas y los fallbacks conservan su composición original.

Esto NO agrega velocidad, daño ni ocultamiento frente a la IA. La primera etapa
es integración visual. Extender a otros escenarios y probar una corriente
funcional sigue una revisión humana de esta escena, no una promoción automática.

## Arte

Activo nuevo: `assets/scenery/sky-foundry-clean-v2.webp`, 1536×864, conservando
el original `sky-foundry-v1.webp`. La placa limpia fue creada con imagegen
integrado (skill imagegen, modo built-in) y codificada WebP con Electron.
No se reemplazó el asset aprobado ni se utilizó CLI/API externa.

Prompt exacto:

Use case: precise-object-edit. Asset type: clean background plate for a 2D space game's layered animated environment. Input image 1 is the EDIT TARGET, the currently approved Fundicion background. Change ONLY this: remove the copper/orange spiral galaxy and its bright core from the right-hand third, filling that area with near-black deep space and a few subdued blue-gray/rust diffuse dust wisps continuous with the surroundings. Preserve the original 16:9 framing, left-hand blue dust arc, near-black central negative space, dark low brightness, astronomical photographic texture and muted palette. No new galaxy, no bright core, no planets, no foreground objects, no text/UI/stars resembling ammunition. This is a clean plate behind the original galaxy, which will be composited/animated separately by code. Keep everything outside the removed spiral region as unchanged as possible. Opaque image, not a transparent cutout.

## Verificación

`tools/qa-foundry-immersion.cjs`: Electron PC/móvil, actividad y movimiento GPU,
dos uploads persistentes, perturbaciones al caminar, pausa congelada, alineación
de canvases, apagado visible y pérdida de contexto con fallback. Capturas e
informe en `local/validation/foundry-immersion`.

`tests/foundry_atmosphere.js`: aislamiento por mapa, fallo GPU sin reintentos
continuos, memoria de estelas acotada y ausencia de mutaciones del jugador.
`dimension_portal_preservation` conserva su hash de todo el render ajeno a los
hooks autorizados; `space_special` conserva los cuatro especiales.

El harness de rendimiento admite `--foundry --static-sky` para referencia y
`--foundry` para candidato. En esta comparación se fija full en el perfil
aislado para que la emergencia no falsee resultados reduciendo efectos.
El control NO se modifica en producción. Comparar densidad, resolución y FPS
del tramo entero. Una corrida fallida, un crash o una reducción de calidad no
cuentan como medición válida ni como mejora. No se garantizan 120–165 FPS.

Sin commit, push, publicación ni cambio del resto de los fondos.

## Resultado de la pasada

Calidad: 218 suites, cero fallos; QA Electron PC y móvil emulado aprobado,
con perturbaciones al caminar, pausa y fallback por pérdida de contexto.

Comparación válida inicial de 15 segundos, 24 enemigos durables y full fijo:
`foundry-static-full` 63,14 FPS, `foundry-motion-full` 73,37 FPS.
El control tuvo picos importantes; esto NO demuestra una ganancia sostenida ni
certifica 120–165 FPS. No quitar efectos para obtener otra cifra. Las corridas
anteriores que bajaron por emergencia o terminaron sin informe fueron rechazadas.
Medición GPU más amplia y revisión humana siguen abiertas; la implementación
visual de esta etapa es funcional, no la solución general de rendimiento.

Entregas actuales: web `releases/DeadSingularity-V1-web-hhcNej`, Electron
`releases/DeadSingularity-V1-desktop-WHHETH/win-unpacked/DeadSingularity.exe`,
staging Android con los 140 recursos sincronizados (APK no compilado).
El launcher `ABRIR_V1.cmd` carga directamente el código actual.
