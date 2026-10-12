# Publicación de los ocho cielos cósmicos

Los ocho fondos nuevos sustituyen a los anteriores en normal y en Probar eventos
dimensionales, sin cambios de enemigos, dificultad, spawns, guardado, portales ni
geometría de arenas. Se conservan los nombres e IDs. La sesión de pruebas mantiene
su lobby ciruela y su aislamiento de guardado.

## Colecciones y próximos cambios

- `scenerySkyTrial.js` conserva su nombre histórico, pero define ahora la base
  aprobada `NV.dimensionSkyBaseline`. Web, Android y Electron cargan ese mismo
  módulo desde index.html.
- Los futuros archivos registrados con `NV.registerTrialSceneryArt` afectan solo
  a pruebas; no cambian el conjunto normal aprobado. Hay un test de este aislamiento.
- La galería `previews/dimension-environments.html` muestra la colección actual
  por defecto y permite consultar los anteriores con el botón legacy. Las imágenes
  antiguas no se borran ni se usan en partidas actuales.
- Se renovaron las claves de caché de los scripts de entrada y el manifiesto de
  entrega. El arte y sus prompts figuran en SKY_REWORK_2026-10-12.md.

## Validación

- `npm run quality`: 217 suites, cero fallos; sintaxis, contenido, referencia
  congelada, recursos, hashes y controles de entrega verificados.
- Galería: ocho imágenes distintas y familias reales de enemigos, pilotos,
  jefes y núcleos; sin errores. Todos los archivos se dibujan en normal y pruebas.
- Memoria: como máximo dos imágenes fuente en partida y ocho en galería; tres
  superficies cacheadas. 240 dibujos por mapa sin regenerar el escenario.
- Mobile: 57 comprobaciones de pantallas en 568×320, 844×390 y 1280×573, incluyendo
  lobby normal/de prueba, pilotos, mejoras, ajustes, ayuda, informe, combate,
  sistema, estadísticas, tienda y pestañas, preparación y derrota.
- Controles táctiles: siete tamaños landscape, área segura, movimiento analógico,
  multitouch, selección, uso de objetos y pausa. También bloqueo portrait,
  rotación y retorno sin recarga.
- Electron empaquetado: arranque, catálogo, movimiento, pausa, persistencia local,
  políticas de acceso/audio y canvas mobile comprobados.
- Paquetes reales desktop/web: QA de ejecución y nueve repeticiones de estabilidad
  de 10 segundos por plataforma (calidad alta, automática y rendimiento),
  sin reinicios. Web comprobada bajo la ruta de publicación /DeadSingularity/.

Las pruebas de teléfono son emulación Chromium, no hardware Android/iOS físico.
No garantizan FPS idénticos en todos los dispositivos ni sustituyen una partida
humana completa. Los cielos son WebP estáticos (320104 bytes en total), no nuevos
efectos procedurales por frame.

## Entregas locales

- Web: `releases/DeadSingularity-V1-web-NFPBA8`.
- Electron: `releases/DeadSingularity-V1-desktop-3mgN09/win-unpacked`.
- Android: 138 archivos verificados sincronizados en `android/app/src/main/assets/game`.
  No se compiló un APK ni un instalador nuevo en esta tarea.

Los paquetes generados, perfiles y evidencias locales quedan fuera del repositorio.
El push publica código, assets, documentación, galería y pruebas. GitHub Pages
despliega mediante el workflow existente después de que pase V1 quality.
