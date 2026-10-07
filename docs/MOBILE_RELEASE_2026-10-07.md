# Publicación móvil y jefes V11

Se publica la integración local de los diez jefes V11 junto al pulido móvil.

Controles: USAR/DASH/ESPECIAL siguen en columna a la derecha, con ancho 96px
y altura mínima 48px (especial 62px para sus dos líneas). Selectores de arma
y consumible en el centro inferior, de 48px de alto, con flechas anterior/siguiente,
icono 30px, nombre y cantidad. Un solo elemento actual por selector; alimentan
la misma API NV.input. Botones reales con etiquetas accesibles.

Touch fallback identifica el dedo correcto incluso con varios contactos.
Dash/especial pertenecen al dedo que inició la pulsación; up/cancel global,
blur, visibilidad, pausa y settings liberan entradas. Los contextos de los
dos iconos se conservan y se reutilizan al cambiar inventario.

Los jefes usan getVisualBudget existente: reduced/minimal reducen filamentos,
rayos decorativos y auras. Full conserva el diseño exacto. No cambia física,
hitbox, cooldown, balance, dificultad ni cantidades de entidades.
Se conserva DPR limitado, un loop rAF y dt real. No se detiene combate por
falta de input: el autoataque y los enemigos deben seguir simulándose.

La tienda conserva la composición aprobada de tres paneles en horizontal y
su barra inferior. No se reintroduce el sistema histórico de una pestaña visible.
La orientación vertical conserva su pantalla de rotación.

Verificaciones: browser --mobile-polish en seis tamaños, --orientation-gate
S20 FE emulado y --shop-remaster desktop/móvil; sin excepciones. Pruebas de
dedos independientes Pointer/Touch y de pureza física/render de los diez jefes.
Stress de 19 escenarios x600 frames antes/después en previews/mobile-release.
Ambas corridas respetan presupuestos y no reportan frames CPU >16.7ms; los
timings headless no miden raster real ni FPS del Android. La prueba original
mobile_hud_polish se actualiza para verificar el nuevo helper de acciones;
mobile_multitouch comprueba su comportamiento, no sólo sus tokens.

Validación física pendiente: sensación táctil, rendimiento y fullscreen en
Android real. No hay garantía universal de 60 FPS. Archivos de diagnóstico,
previews, builds y archivos ajenos no se incorporan al commit.

Suite final: `npm test`, 172 suites / 0 fallos. Syntax check de controles OK.
Builds definitivas: Windows `Iw4Xar`, Web `HOIEdm`. El lanzador local apunta
a la build nueva. `tools/verify_pages.cjs` contrasta el HTML y todos sus scripts
y hojas de estilo servidos por Pages con los archivos locales (normalizando EOL).
El EXE definitivo pasó `--nv-qa`: inicio aislado, almacenamiento y entrada en
partida sin errores. Esto no sustituye la prueba táctil en Android real.
