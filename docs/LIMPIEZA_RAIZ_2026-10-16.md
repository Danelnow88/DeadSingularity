# Limpieza recuperable de raíz

Se conservaron los dos lanzadores ABRIR, sus dos accesos directos, index,
package/lock y configuración Git. README es la entrada del proyecto; AVISOS es
necesario para entrega legal; GROWTH_PLAN contiene hitos referenciados en varias
guías; RETOMAR es la continuidad actual. Ninguno es un residuo para borrar.

- Diez lanzadores PROBAR trasladados a `tools/launchers/`, ajustando todas las
  rutas relativas de proyecto/runtime. Sus muestras se conservan como histórico.
- Nuevo `PRUEBAS.cmd`: opción 1 abre roster vigente; opción 2 abre esa carpeta.
- Workbench de reconstrucción anterior trasladado a
  `previews/archive/workbench.html`, con enlaces relativos reparados.
- Trace original y MUESTRA BOCETO DE SPEAKER DANEL archivados en
  `local/archive/root-cleanup-20261016/`. No se eliminó nada de estos archivos.

Para recuperar ubicaciones anteriores, mover los archivos de archivo a raíz;
en los CMD trasladados, revertir el prefijo `%~dp0..\..\` a `%~dp0` al moverlos.
No ejecutar los comandos con rutas de subcarpeta desde la raíz sin esa corrección.

El roster se sincronizó con los espectros dorado/bronce/Guardia ya integrados.
Esto es inventario visual, no una simulación exacta de combate ni un benchmark.
La corrección de legibilidad y carácter vivo sigue siendo una tarea aparte,
registrada en RETOMAR; no se reemplazó ninguna textura ni mecánica por la limpieza.

## Revisión de subcarpetas

Los documentos de dirección, planes maestros y las referencias congeladas se
protegen. `src/` no es parte de la entrega actual, pero contiene reconstrucción
histórica; ausencia en index no prueba que algo sea basura. `local/` también
incluye perfiles y evidencia de mediciones, no solo residuos descartables.

Se verificó que cosmic-readability y spectral-cosmic-animated no son dependencias
del runtime. Sus cinco archivos HTML/JS/rig se reubicaron en `previews/archive/`;
las rutas de herramientas y pruebas se repararon. Sus PNG de conceptos siguen
verificando identidad de recursos de producción y no se borran. Ambos capturadores
Electron volvieron a pasar después del traslado. Esto es archivo recuperable,
no una eliminación definitiva de código cubierto por pruebas.

El juego ya carga solo sus 179 recursos de entrega (55.15 MiB); las muestras,
planes, herramientas y bocetos no participan del coste por cuadro. Esta revisión
no certifica que todos los archivos de todas las subcarpetas sean necesarios o
inútiles; no se realizó una purga masiva ni se promete ahorro de FPS por limpiar.
