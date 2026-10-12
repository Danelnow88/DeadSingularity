# Asalto a núcleos — reemplazo de colección pasiva

Proyecto `C:\Users\party\Desktop\DeadSingularity V1`. Trabajo local anterior
preservado en `local/backups/inertia-assault-20261011/`. Sin commit ni push.
Esta etapa sustituye las reglas documentadas en `INERTIA_CHAMBER_2026-10-11.md`.

## Instancia jugable

En Cámara de Inercia aparecen tres núcleos sucesivos de 100 HP. **Acercarse no
los completa**: hay que destruirlos con armas mientras el director mantiene
enemigos. No son enemigos normales: no consumen slots del presupuesto enemigo,
no ejecutan IA de persecución, no producen contacto, monedas, XP, drops, combo
ni progreso de armas. Sólo entran en los adaptadores de apuntado, proyectiles y
lanzallamas. Knockback deshabilitado; nunca se incorporan al array principal.

Autoapuntado: a 160 unidades o menos, el núcleo tiene prioridad. Llegar a esa
zona es una elección espacial; antes se conserva la selección por cercanía.
Apuntado manual y proyectiles mantienen su comportamiento existente. Los
especiales siguen atacando enemigos, no sustituyen la tarea de usar armas.

Los núcleos disparan proyectiles físicos del renderer existente, con daño 9 y
velocidad 210. Patrones sucesivos: dos carriles, abanico de tres, cruz de cuatro.
Primera preparación después de 0,25 s; windup 0,65 s con dirección fijada; intervalo
2,2 s. Emisores se iluminan durante preparación. Nada de zonas rojas, flechas,
anillos o líneas de peligro. La pieza central se contrae al perder HP y el cuerpo
destella al recibir impactos. Entre objetivos hay tres segundos de combate.

Al destruir el tercero deja de reponer enemigos y abre el cruce. Los hostiles
restantes siguen combatiendo hasta entrar al portal. No hay victoria por esperar
el reloj ni por matar todo lo que esté visible.

## Fin de la ventaja pasiva

Quieto suspende proyectiles por **0,65 s** como máximo. Después se liberan incluso
sin movimiento. Durante esa ventana el resto del combate sólo baja a 55% de
velocidad, no al 8% anterior. Recarga al moverse 1,5 s consecutivos; interrumpir
ese movimiento reinicia su progreso. Alternar inputs no recarga instantáneamente.

Los disparos nunca se borran por quedar suspendidos: se quitó esa protección
económica/de combate. Se mantienen los límites globales de proyectiles.
Primera liberación conserva 120 ms de gracia de contacto no renovable. Dash,
stun, arrastre, posesión y tránsito desactivan suspensión y mantienen tiempo
normal. Pausa congela la sesión. El laboratorio antiguo del Museo conserva
sus reglas aisladas; este cambio sólo corresponde al evento preview.

## Aislamiento y arte

Lobby → **PROBAR EVENTOS DIMENSIONALES** → Historia o Infinito → JUGAR.
Oleada 1, universo 2. Sin guardado de progresión. Modo normal y oleadas de boss
no reciben el evento. Portales, renderer `blackHoles.js`, apertura y tránsito
intactos. Sólo cambió el texto de objetivo en el HUD existente.

No se sumaron otros eventos, monedas ni un consumible: primero se valida si
esta instancia mejora las decisiones. Una mecánica que no aporta no debe
persistir por costo hundido ni convertirse automáticamente en otra moneda.

## Validación y siguiente paso exacto

Tests cubren daño nativo, imposibilidad de colección por contacto, objetivos
espaciados, posición segura, ataques con preparación/dirección fijada, ausencia
de ataques después de destrucción, duración/recarga, pausa, modo normal, bosses,
autoapuntado, colisiones y conservación de portales. QA real recorre cuatro
universos, tres cruces y tienda, usando guardados sembrados que deben quedar
idénticos. Logs en `local/validation/inertia-assault/`; capturas/reportes del QA
compartido en `local/validation/dimension-events/`.

Siguiente paso: jugar la instancia manualmente con autodisparo y apuntado manual,
observando si acercarse para enfocar y orbitar para esquivar aporta decisiones.
No promover todavía: revisar duración, farming al postergar objetivos y móvil
físico. Si continúa siendo rutinaria, retirar el ruleset y evaluar la suspensión
breve como consumible, sin desplegar ambos sistemas al mismo tiempo.

Resultados: `npm run quality` pasó 201 archivos, cero fallos. Historia/Rook y
Infinito/BOTI con controles móviles emulados completaron cuatro universos,
tres cruces y tienda, con guardados intactos. El QA final de Historia observó
hasta cuatro proyectiles reales de núcleo simultáneos, comprobó expiración de
suspensión incluso quieto y completó tres objetivos por daño. Cero errores de
consola. El test de portales confirma arte y tiempos preservados. Móvil físico
y valoración subjetiva de diversión quedan para la siguiente prueba del usuario.
Regresión normal también pasó cuatro universos, tres cruces, pausa y tienda
sin activar el evento; stock conservado: 2 consumibles, 5 pasivos, 6 slots de
armería con 2 armas reales. No quedan correcciones técnicas pendientes de esta
etapa; falta la evaluación de juego antes de promoción o nuevas actividades.
