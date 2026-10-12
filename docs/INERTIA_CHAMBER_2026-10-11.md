# Cámara de Inercia — prueba jugable

Reemplazada tras la prueba del usuario: colección por contacto y suspensión
indefinida resultaron demasiado pasivas. Ver `INERTIA_ASSAULT_2026-10-11.md`
para la mecánica actual de núcleos atacantes y suspensión breve recargable.

Proyecto: `C:\Users\party\Desktop\DeadSingularity V1`. Sin commit, push ni
publicación. Trabajo local previo conservado; respaldo de los archivos
existentes afectados en `local/backups/inertia-chamber-20261011/`.

## Mecánica terminada

El evento temporal ya no se resuelve esperando el reloj o limpiando enemigos.
En el segundo universo hay que recuperar **tres fragmentos**, uno por vez,
separados por tres segundos de combate. Aparecen dentro de la vista, a un mínimo
de 140 unidades del jugador, evitando enemigos, disparos y peligros activos.
Sin ubicación segura reintentan. No entregan tokens, XP, armas ni curación:
son una condición de salida, no otra moneda.

Quieto: combate ralentizado y proyectiles enemigos suspendidos. Moverse:
vuelven a viajar y el combate recupera su ritmo. Los disparos propios no se
suspenden; conservan el reloj de combate anterior. Dash, aturdimiento, arrastre,
posesión y transición mantienen las excepciones de seguridad del prototipo.
No es invulnerabilidad: tocar un proyectil suspendido puede dañar.

El director sigue reponiendo enemigos hasta recoger los tres fragmentos, sin
aumentar sus límites, daño, HP ni frecuencia configurada. El tiempo nominal no
finaliza este campo. La barra existente muestra fragmentos, no segundos ficticios;
no hay otro panel. Un mensaje compacto explica la entrada y cada fragmento tiene
silueta física propia y tres pequeñas facetas de progreso.

Con el tercero deja de reponer enemigos y abre el cruce. Los enemigos restantes
siguen atacando durante apertura/acceso; no desaparecen antes del viaje. Al
iniciar tránsito se limpian proyectiles y en el siguiente universo se restauran
las reglas normales. Enemigos descartados por el viaje no otorgan recompensas.

## Seguridad y preservación

- Máximo 48 proyectiles suspendidos; ocho segundos reales acumulados de retención
  por proyectil, luego desaparecen sin explotar.
- Primera liberación: 180 ms reales de gracia de contacto, no renovables al
  alternar movimiento/quietud. No modifica invulnerabilidad del jugador.
- Pausa no avanza objetivos ni retención. Salir/reiniciar limpia la sesión.
- Bosses excluidos; no se incorporó persecución a las partidas reales.
- `blackHoles.js` conserva sus bytes y hash originales. Apertura 1,2 s y tránsito
  1,15 s intactos. El test del renderer sólo permite sustituciones explícitas del
  HUD de objetivo; todo el resto sigue cotejado contra el hash previo.

## Cómo probar

Lobby → **PROBAR EVENTOS DIMENSIONALES** → Historia o Infinito → JUGAR.
Primera oleada, segundo universo. Los laboratorios anteriores siguen conservando
sus pruebas originales; no representan este nuevo objetivo. La prueba no escribe
progresión. Volver desde el lobby restaura el modo normal, que no selecciona
el evento experimental.

ID interno `museum-time` conservado por compatibilidad. `dimensionEvents.js`
mantiene selección/exclusividad. Nuevo `engine/inertiaChamber.js` posee objetivo
y política de disparos; `render/inertiaChamber.js` es un renderer independiente.
Los eventos legacy no se reequilibraron en esta etapa.

## Validación y continuación

`tests/inertia_chamber.js`: objetivos espaciados, ubicación segura, copias de
estado, pausa/reset, límites/TTL/gracia, colisión y movimiento nativos, disparos
propios no suspendidos y restauración del estado Canvas. Suite global: 201
archivos. QA de recorrido completo usa perfiles temporales y capturas Electron,
cuatro campos, tres cruces y tienda. Móvil emulado no sustituye teléfono físico.

```
npm run release:manifest
npm run quality
npm run qa:dimension-events
npm run qa:dimension-events -- --endless --mobile
npx electron tools/qa-dimensions.cjs --normal
```

Logs: `local/validation/inertia-chamber/`. Capturas/reportes:
`local/validation/dimension-events/`. Terminado para prueba local, **no promovido
a stable**. Próximo paso exacto: probar manualmente si frenar/avanzar frente a
disparos y recorrer fragmentos obliga a decidir; incluir Nova/Phantom y teléfono.
Después ajustar distancia/intervalo y decidir frecuencia Historia/Infinito, sin
añadir temáticas ni cambiar balance global antes de comprobarlo.

Pendiente antes de promover: evaluar duración real y posible farming al demorar
deliberadamente la colección. El director continúa mientras falten fragmentos,
por lo que no hay techo temporal de recompensas dentro de esta prueba. No se
cambiaron los drops para encubrir esa diferencia; definir presupuesto de
recompensas o límite de permanencia será una decisión de diseño separada.

Resultado: `npm run quality` pasó, 201 archivos sin fallos. Historia/Rook y
Infinito/BOTI con controles móviles completaron el objetivo y los tres cruces,
llegaron a la tienda y no modificaron los cuatro guardados sembrados. Hasta diez
hostiles en cada campo; especiales y pausa comprobados; cero errores de consola.
La captura móvil requirió un reintento de compositor, sin omitir controles.
El recorrido normal sin preview también pasó sus tres portales, pausa y tienda:
dos consumibles, cinco pasivos y seis slots de armería, con dos armas reales.
La última suite completa, tras corregir la expiración del destello de colección,
volvió a pasar los 201 archivos, cero fallos.
