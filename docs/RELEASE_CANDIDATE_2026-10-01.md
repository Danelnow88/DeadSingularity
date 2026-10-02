# NEON VOID — candidata alpha pública

Fecha de cierre: 1 de octubre de 2026.

## Entrega aprobada localmente

- Windows: `releases/NEON-VOID-0.10.0-alpha-windows-CAosd2/NEON VOID.exe`.
- Web offline: `releases/NEON-VOID-0.10.0-alpha-web-OPgork/index.html`.
- Lanzador: `JUGAR NEON VOID.cmd`.
- Suite: `145/145` grupos, cero fallos.
- Evidencia navegador/QA más reciente: `previews/difficulty-k1/`.
- Stress reproducible: `previews/release-j/performance-stress.json`.

## Rendimiento medido

En 19 escenarios headless de 600 frames, incluyendo 30 hostiles, jefe, seis
pesados, lanzallamas, minas y 200 partículas, no hubo muestras sintéticas por
encima de 16,7 ms. El peor p95 fue aproximadamente `0,87 ms` en actualización y
`0,47 ms` en dibujo. Esto mide engine/render parcial, no FPS de una GPU real.

La build Electron final, en la PC disponible, registró durante QA `0,3 ms` p95 de
update, `0,8 ms` p95 de draw y unos `5,7 MB` de heap JS usado. El frame p95 fue
`16,8 ms`; el tier visual permaneció `full`. El pico inicial de Chromium se
excluye durante 120 frames de la decisión de auto-calidad, pero sigue registrado.

## Producto y seguridad

- Icono/marca original y reproducible en `assets/brand/neon-void-mark.svg`.
- Identificador de aplicación estable: `com.neonvoid.game`.
- Build por lista permitida, manifiesto SHA-256 y avisos de terceros.
- Renderer aislado, sin Node, navegación/ventanas externas bloqueadas, permisos
  denegados y CSP offline.
- Sin publicidad, pagos, telemetría remota ni dependencias de red en la entrega.

## Puertas humanas antes de publicar o vender

1. Completar varias expediciones reales en Fácil/Normal/Difícil y revisar tiempo,
   economía, armas y los diez jefes; la automatización no certifica diversión.
2. Probar al menos dos mandos físicos y equipos/GPU modestos.
3. Elegir precio, idiomas y clasificación etaria; revisar nombre y marca.
4. Revisar licencias/avisos con criterio legal del titular.
5. Crear instalador firmado e incrustar icono PE definitivo. La carpeta portable
   funciona, pero Windows puede mostrar advertencia por falta de firma.
6. Abrir/configurar Steamworks, cápsulas finales, logros/Cloud opcionales, página,
   cuestionarios y revisión. No se realizó ningún alta, pago ni publicación.

Estas puertas necesitan hardware, cuentas, decisiones o autoridad del usuario;
no son fallos ocultos de la build.
