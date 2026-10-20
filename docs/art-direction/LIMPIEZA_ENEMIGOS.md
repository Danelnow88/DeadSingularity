# Cierre de oleada y limpieza de arte de enemigos

Al declarar victoria se vacía inmediatamente la lista de enemigos, incluyendo muertos, llegadas incompletas, supervivientes e invocados de jefe. No se llama a killEnemy: no hay puntuación, botín ni explosiones adicionales. Se conserva la recogida de fragmentos y el cofre del jefe. La presentación y la entrada a tienda vuelven a vaciar la lista por seguridad. Un resultado de IA iniciado antes de la victoria no puede volver a insertar enemigos. El dibujo común, espectral y de partida rechaza muertos y restos de salida.

Se retira la animación antigua de salida con Proxy por enemigo, hinchado, colapso y puff; el puff compartido del jugador se conserva porque sigue en uso. Se retiran de juego y registro cinco módulos de arte anteriores, sus precargas y 22 archivos de arte de tres generaciones, además de las herramientas y pruebas que sólo validaban esos prototipos. Una copia de recuperación está fuera del runtime, en local/archive/enemy-art-20261017. No se empaqueta ni se carga en partida.

La familia actual de nueve diseños mantiene sprites y tamaños aprobados, luces y cadencias, cañón telescópico, llamarada, soga y dos dash, protección del Guardia y avisos de fase del Espíritu. Se conserva el movimiento real del Corredor (amagues/embestida) y el gesto visible de ataque común; no se confunde ese movimiento con los recortes de ojos/aletas de un sprite anterior. El aviso orbital visible del Espíritu se separa del rig antiguo y pasa al módulo actual. Se elimina cálculo invisible de ojos/boquilla/tentáculos del Escopuras y el temblor de cuerpo espectral descartado por la ruta de sprites actuales.

La revisión cubre comunes, nueve cuerpos actuales, espectros, élites y jefes. Los modelos y animaciones de élites/jefes todavía usados, telegráficos y reacciones de daño se conservan. Las referencias congeladas no se modifican.

## Verificación final

- 236 pruebas vigentes aprobadas. Las nueve pruebas exclusivas de los modelos/prototipos retirados quedaron en el archivo local, no se ocultaron fallos de la familia actual.
- Transición real playing → wave_end → shop_enter: cero enemigos, cero dibujos de cuerpos durante la transición y ninguna recompensa por golpes tardíos.
- Nueve sprites actuales, fases del Espíritu, soga, tanque telescópico, protección del Guardia, élites y jefes verificados.
- El registro canónico carga sin módulos retirados, tanto como archivo local como en la captura de revisión.
- Entrega: 180 recursos, 39,99 MiB; antes: 207 recursos, aproximadamente 70,72 MiB. Se excluyen unos 30,7 MiB de arte/código retirado; esto no es una medición de FPS.
- Sintaxis e higiene de repositorio comprobadas. Los 87 archivos de referencia congelada permanecen idénticos.
- El render de mundo y portales fuera del drawer de enemigos se comparó byte a byte con la versión previa y no cambió.
