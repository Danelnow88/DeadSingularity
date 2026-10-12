# Gameplay y dimensiones — 08/10/2026

## Cierre por tiempo y densidad — estado vigente

Se implementó la regla aprobada: durante el reloj se repone combate hasta el
objetivo de densidad; al llegar a cero cesa el despliegue normal y de élites,
y limpiar los hostiles pendientes habilita el portal. No existe una cuota de
bajas independiente. Los bosses conservan su soporte y cierre propios.
Cada campo mantiene la duración completa original. La densidad objetivo aumenta
hasta tres hostiles, sin exceder 28; los lotes libres aumentan uno, hasta cinco.
Se conservan stats, cadencia, techo duro de 30 y límite de siete pesados.
Los grupos libres usan posiciones agrupadas y separadas; las formaciones tácticas
y sinergias existentes no cambian. Se acepta una subida pequeña de presión,
sin trasladar difícil a normal ni modificar la pistola de plasma.

Validación: 181 archivos de pruebas aprobados. Recorrido real en normal: cuatro
fondos distintos, tres cruces y tienda; 39–42 desplegados por campo, pico 21–25
hostiles y ninguna reposición durante la limpieza. Estos valores son una muestra,
no una cuota nueva. Falta únicamente evaluar subjetivamente la presión jugando.

## Revisión anterior a la regla de cierre por tiempo — histórica

La primera versión dividía el objetivo y la duración entre cuatro campos. El
autor confirmó cruces funcionales pero combate demasiado corto y vacío. Esta
revisión reemplaza esa regla: CADA universo tiene el objetivo y tiempo mínimo
completos de la oleada original, con las mismas autoridades de densidad y stats.
El recorrido completo dura más y tiene más combate; normal/difícil no se relabelan.
En oleada 1: fácil 18, normal 22, difícil 26 enemigos por campo, mínimo 15 segundos
y limpieza real posterior. No se cierra al vencer reloj con hostiles pendientes.

Regla permanente: todos los destinos se ven distintos y los cuatro campos del
recorrido usan cuatro familias de fondo sin repetir. La semilla cosmética mezcla
su orden, geometría reflejada, polvo, nubes y tonalidades. Las semillas no consumen
RNG de combate. El background cambia completo, incluidos hitos y borde; no sólo
un tinte encima del mismo lugar. Esto ofrece variantes procedurales de las cuatro
familias existentes; no representa generación literalmente infinita de contenido.

Feedback: aviso de campo despejado, onda visual, apertura gradual durante 1.2s,
flecha hacia el portal fuera de cámara e instrucción persistente. Contacto habilitado
al terminar la apertura; tránsito con fundido sobre el jugador y llegada con
revelado del fondo nuevo. Los tres modelos incorporan estrellas de varios tonos
con pequeñas estelas tangenciales junto al contorno, siguiendo ambas referencias.

Las notas de objetivo repartido más abajo documentan la versión anterior y quedan
superadas por esta revisión. Las validaciones de recorrido se repiten con el
objetivo completo por campo y verificación de cuatro ambientes sin repetir.

Revisión validada: 181 archivos de pruebas sin fallos, contratos de caché y
duración/objetivo completos en fácil/normal/difícil hasta oleada 50. Recorridos
reales completos en escritorio y móvil emulado, con 18 enemigos requeridos y
15 segundos mínimos por universo en fácil, pausa y tienda sólo tras los tres
cruces. Los cuatro IDs de ambiente resultaron diferentes en cada recorrido.
Capturas de modelos, portales y universos revisadas; renderer sin errores.
Entrega web local actual: releases/DeadSingularity-V1-web-1NRSn9.
Sin commit, push ni publicación. No se afirma balance humano validado en todas
las dificultades, prueba en teléfono físico ni una partida completa de bosses.

Proyecto confirmado: Desktop/DeadSingularity V1, origin Danelnow88/DeadSingularity.
Esta tarea no autoriza commit, push ni publicación. Preservar los cambios locales.

## Etapa 1: limpieza de feedback y drops

Implementado: sin anuncios globales al aparecer armas normales; cambio de arma
informa mediante HUD y sonido, sin texto flotante; rueda filtrada a un cambio
cada 160 ms, descartando eventos cero/no finitos. Daño visible entero, conservando
el cálculo real. Drops aleatorios normales detenidos durante boss, máximo dos
en suelo simultáneamente y probabilidad limitada a 8% por refill. Cofres intactos.

La regla de rueda limita ráfagas de eventos; un scroll sostenido puede efectuar
varios cambios espaciados. El daño positivo menor que uno se presenta como 1.

## Etapa 2: tres cruces por oleada

Implementado en el checkout local: cuatro campos por oleada y tres portales
secuenciales. Modelos propios: lente azul, corona ámbar y abismo violeta; cada
uno combina geometría diferente con remuestreo del fondo y animación acotada.
El portal aparece sólo al completar el objetivo real del campo. Contacto inicia
una transición de 1.15 segundos y lleva al jugador al centro del nuevo campo.
Se conservan HP, inventario, consumibles, moneda y progreso de armas. Se limpian
proyectiles, hazards y transitorios. La recompensa de fin se paga una sola vez.

Decisión del usuario: conservar las oleadas de boss actuales y trasladar su
combate al último campo. Los bosses conservan sus stats y autoridades originales;
las oleadas de boss añaden tres campos previos de combate normal. Las oleadas
normales reparten su objetivo y duración base entre los cuatro campos, conservando
el total de enemigos. El traslado añade recorrido y tiempo sin rellenar la vida.
La presión simultánea disminuye al repartir enemigos; esto requiere una evaluación
humana de balance antes de aumentar normal/difícil. No es un sistema de mundos
infinitos ni crea nuevas familias de enemigos todavía.

Combat Lab mantiene su flujo aislado. Los checkpoints siguen siendo de tienda;
no se guarda una escena dimensional viva ni se ofrece reanudación entre campos.
Vista previa: previews/black-holes.html. Verificación: tools/qa-dimensions.cjs
usa un perfil aislado, movimiento y disparo reales; capturas en
local/validation/dimensions. No confundir emulación con validación en teléfono físico.

Validación de esta etapa: suite de 181 archivos, cero fallos; sintaxis, catálogo,
manifiesto y referencia congelada correctos. Recorrido real en Electron oculto
completó tres cruces y llegó a tienda, sin errores del renderer. La pausa durante
el portal quedó comprobada. Capturas revisadas al tamaño real del mapa.
El mismo recorrido pasó en móvil emulado 844x390; evidencia separada en
local/validation/dimensions-mobile. Ambos perfiles de QA son temporales y aislados.
La verificación automática usa fácil, disparo automático, movimiento y especial;
no demuestra todavía balance humano normal/difícil ni un recorrido completo de boss.
La construcción del boss al cuarto campo se comprueba en el harness productivo
para oleadas 5/15/50/55 y las tres dificultades.

## Etapas pendientes

1. Evaluar el recorrido y arte al jugar, especialmente supervivencia con recursos
   de tienda y las tres antesalas de boss; ajustar sin multiplicar objetivos.
2. Ampliar la identidad de los campos: el primer paso utiliza una tonalidad
   ambiental sutil y un desplazamiento de las combinaciones del director existente.
3. Ampliar combinaciones de enemigos reutilizando el director existente y
   conservar límites de hostiles, avisos de llegada y autoridad de ataques.
4. Revisar dificultad normal/difícil y bosses por separado, midiendo primero la
   duración y gasto de recursos introducidos por las dimensiones.
5. Diseñar economía de monedas por arma y drops antes de implementarla.

Siguiente paso exacto: jugar una oleada normal completa y una oleada de boss
con la misma preparación usada en la base previa; comparar HP, consumibles,
moneda y tiempo al llegar a tienda. A partir de esa comparación, ampliar el
director dimensional y luego ajustar normal/difícil por separado.
