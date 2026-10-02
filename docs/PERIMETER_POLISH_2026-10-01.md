# NEON VOID — continuación y pulido del perímetro, 01-10-2026

## Estado y continuidad

Se retomó el checkout local sucio de master, inspeccionando primero
`git status --short --branch`. No se descartaron cambios, borraron entregas,
stagearon archivos, hicieron commits ni pushes.

La tarea interrumpida YA había incorporado el margen visual en la cámara única,
la integración del perímetro en `game.js`, el renderer sectorial, clamp del zoom,
tests y un recorrido de nueve posiciones en tres layouts. La versión publicada
por el launcher era todavía `windows-FY9PMZ`, de escenarios cósmicos anteriores.
Faltaban llevar esas fuentes a Electron, probar el EXE y actualizar el launcher.
Se pulieron primero los tres detalles, sin compilar antes la versión visual
que el usuario había pedido corregir. Luego fue necesaria una recompilación
correctiva al detectar una regresión del aspecto móvil (detallada más abajo).

Se detectó que el full-bleed móvil alteraba su arena dinámica y se descartó ese
cambio CSS. Fuentes y paquetes corregidos preservan EXACTAMENTE esos bounds.
Electron B1d5Vr y web i6B9Qx están verificados, suite verde y launcher actualizado
después del QA final. Los cambios anteriores se preservan.

## 1. Franja exterior: cambio más importante

Única constante existente `CAMERA_EXTERIOR_PADDING`, en `js/core/viewport.js`:
**56 -> 28 unidades de mundo**, exactamente la mitad. El renderer lee el getter;
la cámara normal y el zoom comparten `clampCameraOrigin()`. No hay otro manager.

Clamp desktop antes: x[-56,506], y[-56,316]. Después: x[-28,478], y[-28,288].
Referencia/vista desktop siguen 900×520; arena física sigue 1350×780; jugador
detenido en x[20,1330], y[30,760]. No se modifican engines, spawn, colisiones,
ataques, pickups ni balance. El exterior no es transitable.

## 2. Lenguaje visual

Se conserva el perímetro y su corte interior autoritativo exacto. El exterior
dentado/poligonal se sustituye por una **membrana de refracción**: labio oscuro de
ondulación continua y filamentos de materia ionizada, abiertos y espaciados.
No es un simple cambio de semilla ni un rectángulo neón. Se conserva la paleta
de los cuatro stages, con junta apagada, transición oscura y vacío exterior.

La geometría se prepara una vez por arena/sector/padding; no genera arrays,
gradientes ni ruido por frame. `minimal` conserva la frontera esencial;
`reduced` agrega filamentos; `full` también polvo. Fallback sin Path2D probado.
El draw sigue antes de entidades/proyectiles/hazards y permanece con NO HUD.

## 3. Causa y corrección del margen muerto

Medición real ANTES, desktop1280×800:
- shell padding10px; game-box x10,y64,1260×726, borde1px y radio12px;
- canvas x11,y65,right1269,bottom789: 11px desaprovechados en los lados y abajo.

En móvil landscape había padding2px y borde1px: canvas x3,y3 y esquinas recortadas.
No era un bug de color, una cámara distinta ni un asset faltante.

Reglas acotadas en `css/alpha.css` extienden SÓLO game-box hacia el padding
sobrante y eliminan su border/radius. Desktop queda canvas x0,y64,right1280,
bottom800. El HUD sigue x10,y10,1260×46, mismos padding/borde/radio y botones.
Se conserva la separación superior de 8px; no se adelanta la reorganización HUD.
La corrección full-bleed se limita a escritorio/Electron. Móvil, controles,
safe areas y fallback contain/portrait conservan su caja y aspecto originales.

Móvil: quitar el inset cambiaba el aspecto medido y desplazaba arenaW de1746.35
a1732.28 en915×412 y de1702.19 a1688 en844×390. Se detectó y descartó esa regla
CSS: los bounds finales son EXACTAMENTE los anteriores (1746.35/1702.19×780).
Tests DOM comparan también arena/caja móvil contra la medición previa, no sólo
la fórmula. Por prioridad explícita de preservar gameplay, quedan los3px del
layout móvil original. No se oculta esa limitación: su eliminación sin cambiar
arena/aspecto merece otra decisión de presentación. No hay un viewport paralelo.

## 4. Archivos de esta continuación

Runtime:
- `js/core/viewport.js`: margen56->28.
- `js/render/sectors.js`: nuevo material/ondulación/filamentos en el renderer actual.
- `css/alpha.css`: corrección del contenedor de render, sin estilos nuevos para HUD.

QA/tests:
- `tests/camera_foundation.js`: expectativas explícitas del nuevo clamp.
- `tests/camera_perimeter.js`: nueve casos de geometría, cache, tiers, fallback y bounds.
- `tools/verify_alpha.cjs`: diagnóstico DOM, comparación HUD antes/después, QA perímetro.
- `desktop/main.cjs`: QA opcional aislado de perímetro, nueve posiciones y cuatro stages.
- `JUGAR NEON VOID.cmd`: actualizado después de confirmar el EXE final.

Documentación: README, ARCHITECTURE, MOBILE_ARCHITECTURE, VISUAL_BIBLE, TESTING,
PENDIENTES_REALES y este informe. La integración existente en game.js y el
ajuste previo de rhythm_analysis_render se preservaron, no se rehízo el juego.

## 5. Validación ejecutada antes de empaquetar

- Syntax checks de viewport, sectors, verify_alpha y desktop/main.
- `node tests/camera_foundation.js`: 19 casos, 0 fallos.
- `node tests/camera_perimeter.js`: 9 casos, 0 fallos.
- `npm test`: **RESULT run_all: total=154 failed=0**.
- `git diff --check`: sin errores; warnings de conversión LF/CRLF preexistentes.
- Diff revisado preservando cambios locales anteriores.
- Edge real headless: centro, cuatro lados y cuatro esquinas con input real en
  desktop1280×800 y móvil táctil emulado915×412/844×390. Cuatro fondos, bosses,
  láseres, calidad baja y NO HUD; ninguna entidad fuera de arena ni excepción.
- HUD medido antes/después: idéntico en menú y partida en los tres layouts.
- Regresión de cámara en cinco layouts: aim, roundtrip, pausa, cuatro paredes,
  click HUD y resize móvil correctos.

Evidencia fuente final: `previews/perimeter-polish-before/`,
`perimeter-polish-final-preserved/report.json`, `perimeter-polish-camera/report.json`.
Las capturas de `perimeter-polish-after/` y `perimeter-polish-final/` muestran el
primer intento: son HISTÓRICAS, no la geometría CSS móvil final.

## 6. Entregas y alineación

Comandos: `npm run build:web`, `npm run build:windows` (ambos exitosos).
- Web final: `releases/NEON-VOID-0.10.0-alpha-web-i6B9Qx`.
- Windows final: `releases/NEON-VOID-0.10.0-alpha-windows-B1d5Vr`.
- Primeros paquetes dmqF4F/OSD0ek conservados, NO finales: un control adicional
  encontró el cambio de aspecto móvil. Se corrigió y volvió a empaquetar;
  las pruebas finales comparan los bounds exactos con el estado ANTERIOR.

SHA256 fuente/web/Electron iguales para TODOS los JS/CSS/assets del paquete;
70 archivos de juego iguales entre web/Windows, incluyendo el HTML empaquetado.
main.cjs del EXE también coincide con la fuente.
El HTML empaquetado sólo elimina el arranque 3D experimental remoto, como antes.
No se sobrescribe ni borra una entrega previa.

Electron REAL B1d5Vr: `previews/perimeter-polish-final-preserved/desktop-qa.json`, pass:true,
perimeter.pass:true, saved:true, errors:[]. Inicio en menú, aislamiento Node,
checkpoint y partida avanzando comprobados. Nueve puntos físicos con input real
y otros tres stages junto a bosses; screenshots `electron-*.png`. Área cliente
1280×800 en QA para comparación directa; no cambia la ventana normal del jugador.

Paquete web final i6B9Qx: `previews/perimeter-polish-packaged-preserved-final/report.json`,
11 grupos aprobados, errors:[], exit0.
La repetición anterior registró un fallo del HARNESS, no una regresión del motor:
el autoataque forzado móvil con railgun50 completaba la oleada antes del último
tramo. Se conservan la evidencia y el failure.json en packaged-preserved. Sólo
se ajustó el fixture: pistola1 + jefe legacy en móvil, sin congelar timers/HP,
alterar el motor ni quitar asserts de estado/bounds. Desktop usa oleada común.
Recorrido final: 27 posiciones en tres layouts, cuatro materiales, amenazas,
bosses/láseres, baja calidad y NO HUD. Capturas web/Electron: mismo perímetro,
margen28 y caja desktop de render full-bleed; móvil conserva su caja original.
No diferencias restantes de estos tres cambios en desktop; los guardados de
web y Electron siguen separados por diseño. Datos y enemigos en capturas difieren
porque se usan fixtures/tiempos distintos, no porque se distribuya otra versión.

El launcher apunta al EXE B1d5Vr, sólo después de esas verificaciones.
Para jugar: cerrar la instancia anterior y abrir `JUGAR NEON VOID.cmd`.
No queda empaquetado pendiente. La única limitación específica de alcance es
el inset móvil3px preservado, además de aprobación humana de arte/dispositivos.

## 7. Límites de validación humana

El margen muerto de escritorio/Electron queda eliminado. En móvil quedan los
3px de su layout original para preservar dimensiones/ratio de gameplay;
NO presentar este detalle como resuelto en toda plataforma. Emulación táctil
no es prueba en teléfono físico. Falta aprobación estética del
usuario y revisión en su DPI/monitor/hardware. No se garantiza un FPS universal
ni se evalúa dificultad/balance en esta tarea visual. No se reorganiza HUD,
no se publica en Steam/GitHub y no se ejecuta el resto del plan maestro.
