# Portales estables y rutas caóticas — 17/10/2026

## V5 — magenta e interior limpio (vigente, 18/10/2026)

Paleta magenta intensa con borde blanco rosado y halo exterior conservado.
Se eliminan todas las líneas/ondas interiores: quedan 23 motas de .6–.95 unidades
(9 con efectos reducidos). Sin cambios de forma, tránsito ni agujero negro.
Las flechas de navegación conservan el azul/amarillo previamente solicitado.

## V4 — intensidad e iluminación exterior (18/10/2026)

Portal con azul eléctrico/cian más saturado, núcleo de borde blanco y halo
elíptico exterior de caída suave. Interior, ondas y partículas con mayor brillo.
Se usa un gradiente acotado, sin shadowBlur ni luces globales, también en móvil.
No cambia forma, perspectiva plana, radio de interacción, rutas ni agujero negro.
Pruebas dirigidas de cruces/preservación y captura real móvil verificadas.

## V3 — referencia estética y entrada inmediata (18/10/2026)

El portal conserva su vista plana y su huella elíptica. La imagen de referencia
del usuario está guardada sin modificar en
`docs/art-direction/references/portals-user-reference-20261018.png`.
Se toman los aros luminosos, el interior energético y las partículas, NO la
perspectiva cilíndrica ni la separación entre un techo y un suelo. El marco
metálico V2 se reemplaza por una abertura azul profunda con borde luminoso.
El modelo del agujero negro permanece intacto.

Ambas salidas activan inmediatamente la atracción al entrar en su radio, como
el agujero negro anterior a la bifurcación. No hay permanencia, confirmación
temporizada ni círculo amarillo de carga. Se conserva la transición original
de apagado/encendido para las dos rutas. Las esquinas, equipo, dificultad y
recompensas V2 siguen vigentes.

En Ajustes > Controles, «Tutorial y ayudas de juego» permite ocultar el tutorial
y las explicaciones de rutas. Se guarda en la configuración existente, incluso
al reiniciar. No completa ni borra el progreso del tutorial. Las flechas mínimas
azul/amarilla y los avisos necesarios de peligro no dependen de esta preferencia.

Validación: 238 tests sin fallos; pruebas dirigidas de entrada inmediata,
persistencia de ayudas, preservación del agujero negro y equipo.

## V2 — ajustes por feedback del jugador (histórico)

La implementación inicial de abajo es histórica y queda reemplazada en estos
puntos: el contraste de estadísticas era insuficiente y el portal no tenía el
acabado ni ubicación pedidos. Ahora ambas salidas se anclan a dos esquinas
distintas (110 unidades hacia dentro de cada borde), rotando entre las cuatro
por semilla/profundidad. Nunca se coloca un portal en el centro del campo.

Portal V2: marco metálico de doce dovelas biseladas, base material e interior
azul opaco con movimiento de superficie. Sin alpha, glow, blur, partículas ni
gradientes transparentes. El agujero negro y sus recursos no se modifican.

Se restituyen flechas en el borde de pantalla cuando el destino queda fuera de
vista: amarillo para agujero negro, azul para portal, orientadas a la posición
proyectada real con cámara/zoom. No se dibujan dentro de tarjetas. Se elimina
la flecha del HUD inferior. Esa explicación se conserva temporalmente; se puede
ocultar con `NV.dimensionRouteHelpVisible=false` sin perder las flechas.

Caos V2: HP ×1.8, velocidad ×1.18, daño recibido ×1.5. Además aumenta el lote
en uno (cap 5), acelera reposición ×.65 (piso .35 s), aumenta objetivo de densidad
×1.4 y el límite de admisión de 10 a 15 (sin superar el techo global de 30).
El límite de élites sigue en 7. Admisión de comunes, élites, esbirros y custodios
usa el límite de su ruta. Estable y los laboratorios conservan sus reglas.
No se desbloquean enemigos fuera de su oleada ni se aumentan sus hitboxes.
La recompensa y la confirmación/cancelación anteriores se conservan.

Medición controlada del motor real en oleada 1, sin disparar e invulnerable:
estable llegó a 10 hostiles simultáneos, caos a 14 con límite 15. Esto demuestra
una presión distinta, no certifica todavía el balance subjetivo con autoataque
y todos los equipos. Los multiplicadores no se acumulan al cruzar varias veces.

Se amplían las pruebas para cubrir las cuatro esquinas, presión/admisión real,
colores y anclaje de las flechas, independencia del HUD y ausencia de alpha en
el portal. El harness de laboratorio carga el helper real de límite de rutas,
sin sustituirlo por un stub ni cambiar la admisión del laboratorio.

## Resultado y alcance

Se extiende el sistema dimensional existente, sin otra cámara, otro loop ni
otra definición de arena. Los tres cruces intermedios de cada oleada ofrecen
dos salidas simultáneas. Ambas llevan al siguiente campo de la misma oleada:
la elección cambia su riesgo y premio, no saltea campos, jefes o campaña.
U4 sigue cerrando con victoria/tienda; no se agrega un quinto universo.

El agujero negro conserva intacto `js/render/blackHoles.js`, sus tres modelos,
posición y renderer. El portal estable es Canvas procedural, luminoso y vertical,
con arcos tecnológicos verdes/blancos y centro abierto. No requiere imágenes,
descargas ni dependencias. Se coloca a 240 unidades horizontales y 150 verticales
de la singularidad, con clamp interior, para distinguirlos y dejar visibles sus
cuerpos sin que las tarjetas de elección tapen el portal.

## Reglas de la elección

- Apertura conjunta: 1.2 s, conserva la duración previa.
- Entrar a menos de 42 unidades y permanecer .55 s confirma portal estable.
- Permanecer .8 s sobre agujero negro confirma caos.
- Alejarse antes de confirmar cancela por completo la carga.
- Una vez iniciado el tránsito, la elección queda bloqueada.
- Tránsito: 1.15 s y llegada .8 s, como antes. Portal: desplazamiento suave y
  fundido verde muy oscuro. Agujero negro: atracción y fundido oscuro originales.
- Durante la decisión no quedan enemigos/proyectiles/hazards ni controles
  forzados residuales, incluso si se completó un núcleo antes de matar custodios.
  No se otorgan bajas por esta limpieza. Los shards conservan su recogida normal.
- Pausa/orientación siguen congelando la simulación mediante el loop existente.

## Riesgo y premio

Ruta estable: reglas y presupuesto normales. No garantiza invulnerabilidad ni
una partida trivial. Ruta caótica: en el campo de destino, HP enemigo ×1.35,
velocidad ×1.12 y daño recibido ×1.25. El multiplicador de daño se aplica una vez
en el punto central de recepción, no también sobre cada proyectil/entidad.
Incluye amenazas, custodios, núcleos y jefes. No cambia hitboxes, armas,
cooldowns de ataques ni límites máximos de hostiles.

Al superar ese campo: `12 + oleada × 2 + profundidad × 4` shards adicionales,
con profundidad interna 1–3. La UI anticipa el valor exacto del destino.
El cobro es idempotente por profundidad y ocurre al despejar el campo o vencer
al jefe, no al elegir ni entrar. La ruta siguiente no acumula multiplicadores:
elegir estable restaura la regla normal para las nuevas entidades del destino.

Se corrigió una pérdida de saldo en el adaptador de jefe: el retorno primitivo
del motor podía sobrescribir los premios pagados por el callback de victoria.
Ahora se conserva ese delta además del botín devuelto por el jefe. Hay QA real
del pago conjunto: jefe + cierre de oleada + ruta caótica final.

## Preservación de equipo y guardados

No se reconstruye el jugador durante el cruce. Armas, inventario, consumibles,
niveles, salud máxima, velocidad/mejoras y progresión usan las mismas autoridades.
Los cambios de escena conservan su limpieza anterior de entidades efímeras.
Los checkpoints existentes son entre oleadas; no cambia su formato. Cada nueva
oleada comienza con ruta estable. No se añadió guardado a mitad de un cruce.
Los laboratorios aislados conservan su recorrido de singularidad sin elecciones.

## Archivos

- `js/engine/dimensions.js`: elecciones, confirmación, tránsito, perfil y premio.
- `js/render/portals.js`: portal, carga y guía legible en coordenadas del HUD.
- `js/game.js`: entrada/salida, recompensas, aplicación del riesgo y renderer.
- `index.html`: módulo nuevo y versiones de caché de los módulos modificados.
- `tests/dimension_routes.js`: regresiones nuevas y limpieza real del adaptador.
- `tests/core_field_completion.js`: carga del adaptador de premio real.
- `tests/dimension_portal_preservation.js`: normaliza sólo cinco hooks nuevos;
  mantiene hash exacto del agujero negro y del resto del draw previo.
- `tests/dimensional_promotion.js`: opciones de rutas de producción.
- `tools/qa-dimension-routes.cjs`: QA controlado del índice real y build por HTTP.
- `docs/releases/growth-1.manifest.json`: inventario/hashes actualizados.

## Verificación

- Baseline: 236 archivos de tests, sin fallos antes de la integración.
- Nueva prueba: 54 cruces a 30/60/144 Hz, tres tamaños, ambas rutas, cancelación,
  equipo intacto, perfil no acumulable, bonus único, rechazo de dt inválido,
  jugador muerto, fin U4, render puro y pila Canvas balanceada.
- Suite ampliada: 237 archivos de tests (log final en local/validation).
- Sintaxis, catálogo y check de entrega/manifiesto.
- Electron/índice real: estable→caos→estable, tres campos y tienda final.
- Infinito: mismo ciclo sin cambiar su progresión.
- Jefe final caótico: entrada U4, perfil reforzado y premio completo conservado.
- Ventana móvil controlada de 844×390: legibilidad y separación revisadas.
- Build web `releases/DeadSingularity-V1-web-so4geZ`, servida por HTTP local:
  mismo QA, incluyendo jefe caótico y móvil. No es una publicación remota.
- Referencia congelada: 87 hashes intactos.
- Evidencia: `local/validation/dimension-routes/`, logs y capturas.

## Límites conocidos

No se probó Android físico ni navegadores externos; el QA HTTP usa Chromium de
Electron. En la fixture móvil se desactiva sólo la petición de fullscreen para
mantener las medidas; no se cambia esa funcionalidad del producto. Los valores
iniciales de riesgo/recompensa requieren valoración de balance jugando.

El QA general `qa-alpha --features-only` se detiene antes del gameplay por una
aserción anterior en `desktop/delivery-qa.cjs`: espera seis élites activos cuando
el roster aprobado actual contiene tres. No se modificó el roster para ocultar
ese problema ni se declara aprobado ese verificador. El QA dirigido cubre las
rutas en el mismo índice y en el payload web generado.

Había un worktree amplio con cambios previos. Se preservaron; no se hizo commit,
push ni limpieza. `git diff --check` global avisa whitespace de cambios previos;
el check dirigido considerando CRLF pasa para los archivos de esta integración.
No se construyó otro instalador de Electron: `ABRIR_V1.cmd` carga directamente
el índice actualizado de esta carpeta, igual que la web local.
