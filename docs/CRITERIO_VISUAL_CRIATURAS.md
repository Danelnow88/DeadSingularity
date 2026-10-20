# Criterio compartido, aplicado por etapas

## Dirección artística general actualizada — 15/10/2026

Las TRES referencias del usuario en docs/art-direction son referencia para TODOS
los enemigos del juego, no solo Espíritu ni solo una tanda. Se toman materiales,
atmósfera y lenguaje de criatura viva; NO se copian sus anatomías humanoides.

- referencia-cosmica.png: materia negra cósmica, reflejos estelares y luz interna
  contenida. No copiar torso, extremidades, alas, halo o armas.
- referencia-sombra.png: silueta de sombra orgánica, ojos expresivos y bordes
  inquietantes. No copiar figura humana, manos, patas ni sonrisa como obligación.
- referencia-organica.png: pliegues vivos, textura carnal/abisal y ojos incrustados.
  No copiar automáticamente mandíbulas, todos los tentáculos ni densidad de boss.

Buscar especies vivas y distinguibles, no otra colección de carcasas de piedra.
Material común no implica misma silueta, mismo número de ojos, todos rojos o
mismos apéndices. Conservar diferenciación funcional de color y rol, seguimiento
ocular y lectura en movimiento. Traducir detalle a formas que sobrevivan al tamaño
de combate; preparar superficies, no sumar niebla/partículas/filtros por cuadro.
La tanda remodel-v1 fue rechazada visualmente y NO debe integrarse aunque mida
mejor. Ahora validar UN SOLO concepto (Espíritu) antes de trasladar el lenguaje
a otras especies. Élites ya aprobados y juego normal no se cambian automáticamente.


## Marco de producción confirmado — 15/10/2026

El destino prioritario es Steam/escritorio con Electron. Navegador y móvil se
mantienen como compatibilidad adicional cuando sea viable, no como motivo para
romper el juego ni limitar sin evidencia su dirección visual.
Toda reforma visual busca calidad de producción: coherencia entre criaturas,
entorno y efectos, lectura en combate, estabilidad y coste medido. Ningún diseño
es definitivo por ser aprobado una vez: puede refinarse, sustituirse o retirarse
con cuidado y evidencia, conservando margen para crecer.
Trabajar por tandas de hasta tres enemigos: revisar estado real/coste, proponer
arte animado a escala real, valorar, integrar y verificar en Electron antes de
abrir otra tanda. No redibujar todo legacy de golpe ni asumir que nuevo arte
garantiza más FPS. Mantener cambios separables y referencias anteriores para A/B.

## Reglas visuales compartidas

El usuario quiere que todas las criaturas pertenezcan al mismo universo sin
perder sus identidades. Referencia de acabado: núcleos y élites pintados actuales.
No es autorización para modificar automáticamente todo el catálogo o su paleta.

- Conservar la silueta reconocible de cada familia y su función. No usar anatomía
  humanoide, brazos o patas en las nuevas propuestas.
- Tamaño según papel: comunes pequeños, élites distinguibles pero compactos,
  bosses según diseño propio. Comparar siempre a escala de partida, no solo
  en una imagen grande.
- Volumen con superficies oscuras, luz suave y biseles controlados. Preparar
  material, sombra y brillo estáticos en texturas o superficies reutilizables;
  evitar reconstruirlos mediante blur/filtros por cuadro.
- Mantener diferencias funcionales de color entre variantes. Un acento coherente
  por familia, sin añadir varios neones arbitrarios a cada cuerpo.
- Ojos expresivos y legibles que sigan al jugador, con reflejos preparados y
  pupilas animadas; aplicar el mismo tratamiento de luz a escala apropiada.
- Conservar movimiento vivo propio: órbita, articulación, respiración o estados
  de ataque. La textura no implica congelar al enemigo en una pose rígida.
- Señales de peligro y rango dependen de la mecánica real. No alterar timing,
  daño, colisiones o cantidad de entidades para justificar un cambio gráfico.

Cada propuesta necesita juicio visual y A/B con carga equivalente. Menos calls
no garantiza menor tiempo de GPU; tampoco una textura garantiza más FPS. No
extrapolar el ahorro de una familia a todo el juego.

Aplicación actual: élites legibles v2 y postura de persecución integrados tras
aprobación de la muestra. Enjambrito nuevo se basa en sus tres formas cian
originales: textura preparada de material y ojo, sin boca ni filamentos externos,
órbita conservada. La propuesta de pescado fue rechazada.
Resto del catálogo queda para etapas posteriores.
