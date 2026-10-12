# Tienda: contenedores restaurados — 09/10/2026

## Cierre: espacios sin stock, no desbloqueos

Las tarjetas de relleno muestran «Sin stock» / «Esta visita», con icono de
contenedor vacío en lugar de reloj. Etiqueta accesible, tooltip y ficha inferior
aclaran: «Sin stock en esta visita. Este espacio no tiene un arma asignada ni
requiere desbloqueo». No se promete una oleada, fecha o futuro contenido.
Se retiró además el componente ficticio que se mostraba cuando no había ofertas
reales: también ese caso utiliza seis tarjetas honestas de stock vacío.

Se mantienen compras, progresión, stock estable, seis tarjetas, tres paneles,
dock de mejoras/Nv/MAX, saldo centrado e indicadores de restricciones. Tests
comprueban stock parcial y cero, sin mutar arrays ni inventar componentes.
QA actual en local/validation/shop-stock-2026-10-09: escritorio1280/1920 y
móvil844, ficha explicativa, saldo centrado, compras hasta MAX y sin cobro extra.
Pendientes de esta tarea de tienda: ninguno de implementación; queda feedback
visual. Un sistema de desbloqueos no está pedido ni simulado. Los apartados
inferiores documentan las etapas anteriores, no instrucciones pendientes.

## Recuperación posterior del sistema de mejoras

El usuario pidió explícitamente recuperar el dock con niveles/maxeado, no sólo
los paneles exteriores. Se volvió a mostrar `shop-upgrade-dock` y se recuperaron
las ofertas originales de Vida (+25), Agilidad (+0.2 hasta2), Armadura (+3) y
Suerte (+2), con precios de `NV.runUpgradePrice` y límites existentes:6/6/5/6.
Se mantiene Sobrecarga táctica, pero no se representa como mejora permanente.
Los niveles se registran en upgradeSlots/shopBought y utilizan el guardado ya
existente. Las tarjetas maxeadas permanecen visibles y su buy tiene guardia
contra callbacks viejos, sin duplicar efectos ni cobrar por compras inválidas.
No se modifica stock/fusión de armas ni límites de consumibles.

Tokens se centra de forma absoluta dentro de la cabecera, reservando el hueco
anterior para conservar título/botón derecho. Se conserva altura de cabecera.
Indicadores vectoriales: check para MAX, reloj de arena para agotado/visita y
candado para límite/bloqueo; reemplazan el overlay genérico sobre las ofertas.
El dock marca MAX en verde suave sin tapar el icono.

QA actual: Edge real desktop1280/1920 y móvil844x390, cinco compras de Armadura,
dock MAX, sexta compra sin cobro, seis slots y tokens centrados (<1px).
184 pruebas/0 fallos; también se prueban efectos y topes de las cuatro mejoras.
Evidencias nuevas: local/validation/shop-upgrades-2026-10-09/.
Abrir ABRIR_V1.cmd tras cerrar la instancia previa. Sin commit/push.

## Restauración anterior de contenedores

Se retiró el override reciente de escritorio que acortaba paneles al contenido
y aumentaba ofertas a152px. Se recuperan los contenedores/104px de oferta del
remaster conservado en reference/prototype, sin restaurar archivos completos.
MEJORAS, ARMERÍA y CONSUMIBLES mantienen sus secciones, bordes y adaptación móvil.
Se conserva la economía nueva, incluido pasivo temporal y stock estable.

La armería dibuja seis tarjetas: ofertas reales más espacios reservados con un
reloj SVG y «Próximamente». Son exclusivamente presentación: no alteran stock,
no compran, no cobran, no sortean objetos y no inventan umbrales de desbloqueo.
Las ofertas compradas siguen mostrando su estado bloqueado real.

Verificación: sintaxis,184 pruebas/0 fallos y Edge real a1280x800,1920x1080 y
844x390 móvil emulado. Comprobados los tres paneles,104px de tarjetas desktop,
seis slots y reservas sin efecto sobre snapshot/inventario/saldo. Sin errores
de consola. Evidencia: local/validation/shop-layout-2026-10-09/report.json y PNGs.
Electron aislado no pudo cargar páginas en este entorno (ERR_FAILED); la
verificación visual se completó con Edge mediante el mismo contrato de QA.

Abrir ABRIR_V1.cmd (lee el código actual) o ABRIR_V1_WEB.cmd; cerrar la instancia
vieja antes. No se modifican lanzadores, guardados ni referencias congeladas.
No se hizo commit, push ni publicación. Pendiente sólo feedback visual; una
progresión real de desbloqueo futuro requiere definir sus reglas por separado.
