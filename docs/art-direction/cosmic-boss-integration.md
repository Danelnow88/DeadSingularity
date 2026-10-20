# Diez jefes cósmicos — integración visual

Fuente aprobada: `PRUEBA DE CONCEPTO DE JEFES.html`.
El juego carga una extracción autónoma del dibujo, no el HTML ni su interfaz.
La maqueta se conserva solo en el equipo de diseño y está excluida de Git.
Las herramientas de regeneración y comparación con la maqueta son locales y
opcionales; el juego, la suite y la compilación web no requieren ese archivo.

| Orden | Identidad de combate conservada | Aspecto aprobado |
| --- | --- | --- |
| 1 | JEFE | UMBRA |
| 2 | TITÁN | ORÁCULO |
| 3 | SEÑOR DEL VACÍO | NÁCAR |
| 4 | GUARDIÁN | PYRA |
| 5 | DESTRUCTOR | VÉSPER |
| 6 | NÉMESIS | MÁCULA |
| 7 | COLOSO | VÉRMORA |
| 8 | FANTASMA | CORO |
| 9 | MUTANTE | CISMA |
| 10 | APOCALIPSIS | ANATEMA |

Conservar nombres, orden, estadísticas, IA, proyectiles, recompensas, avisos y
radios físicos. No convertir las fases demostrativas de la galería en nuevas
habilidades. El adaptador visual lee `encounter.stage`, `cast` y `phase2`; no
escribe sobre los jefes. Usa el reloj de presentación compartido y la posición
real del jugador. El tamaño pintado se mantiene dentro de la envolvente visual
existente; las hitboxes no siguen los tentáculos decorativos.

Los materiales, ojos y piezas se precalculan en cachés durante el menú. No se
carga la galería, no hay un segundo bucle de animación ni filtros blur por cuadro.
La suite de QA no certifica 165 FPS ni sustituye una medición GPU en partida.

Después de editar y aprobar la fuente:

```text
node tools/build-cosmic-boss-art.cjs
node tools/build-cosmic-boss-art.cjs --check
node tests/cosmic_boss_integration.js
node tools/qa-cosmic-bosses.cjs
node tools/release-manifest.cjs
node tools/check-delivery.cjs
```

El QA compara los diez dibujos en reposo y agresión píxel a píxel con la fuente,
prueba combates reales en ambas fases, la entrada normal y ambos renderers.
Capturas e informe: `local/validation/cosmic-bosses/` (no se distribuyen).
