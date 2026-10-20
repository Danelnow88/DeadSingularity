# DeadSingularity V1 — estado actual

## Anticipación luminosa intensa de élites — 19/10/2026

Asesino, Fantasma y Goliat cargan sus órganos de energía antes del ataque.
Resplandor local precalculado en atlas de ocho intensidades, mismo dibujo de
cuerpo y ojos que antes; sin filtros/blur/partículas adicionales por cuadro.
Solo depende de execution_windup, materialize/entry_windup y slam_windup/
aftershock_window. No se eliminan avisos de área, cuchilla ni gestos existentes.
QA de ataques de producción y A/B aislado: `tools/qa-elite-attack-light.cjs`.
Con 30 élites: ~164.5 FPS antes/después, p95 6.1 ms y p99 6.2 ms; no representa
el FPS de una partida completa. Ver `docs/art-direction/PULSOS_ELITES.md`.

## Basalto en Núcleo I, II y III — 19/10/2026

La piedra y las carcasas de propulsión reciben también el tono basalto, sin
cambiar cristal cian, inscripciones doradas, grietas magenta, escala o mecánicas.
Aplicación al preparar las cinco texturas de cuerpo/carcasa, no por cuadro.
QA Electron y file://: `node tools/qa-core-basalt.cjs`.
Captura: `local/validation/core-basalt/cores.png`.

## Extensión de basalto a élites — 19/10/2026

Asesino, Fantasma y Goliat usan también basalto en sus placas. Se preservan
ojos, energía violeta/cian/rosa, escala, animaciones, transparencia y combate.
El servicio de material comparte la preparación de caché con la familia de nueve,
con máscara específica para el marfil con luz reflejada de estos tres élites.
Captura y verificación: `node tools/preview-refined-elites.cjs --capture --readability`.

## Basalto oscuro en nueve enemigos — 19/10/2026

Corredor, Tanque, Enjambrito, Escopuras, Espíritu, Kamikaze y los tres espectros
usan piedra basalto en lugar de marfil. Recoloración selectiva durante preparación
de caché, incluidas las tres piezas móviles del Tanque. PNG originales, energía,
luces, anatomía, escala, animaciones y combate intactos. No se aplicó horror ni
rediseño de jefes a la partida: ese HTML sigue siendo una muestra independiente.
Electron verificó las nueve especies en combate y el roster abierto con file://.
Doc: `docs/art-direction/BASALTO_NUEVE_ENEMIGOS.md`.
Cerrar completamente Electron y volver a abrir ABRIR_V1.cmd para ver el cambio.

## Portales y bifurcación estable/caótica — 17/10/2026

V3: los tres cruces muestran portal estable y agujero negro en esquinas distintas.
Entrar activa la atracción inmediatamente, sin medidor de carga. Ambas avanzan al
siguiente campo sin perder equipo. Caos: HP hostil ×1.8, velocidad ×1.18,
daño recibido ×1.5; reposición ×.65 y densidad objetivo ×1.4 con límite de
admisión 15 (estable conserva 10). Shards extra una vez por campo superado.
Flechas independientes en los bordes: amarilla agujero negro, azul portal.
El modelo de agujero negro sigue intacto; portal energético azul en vista plana.
Referencia visual guardada en docs/art-direction/references; no copiar su perspectiva.
Ayudas y tutorial configurables en Ajustes > Controles, con persistencia; las
flechas de navegación y los avisos de peligro se conservan al desactivarlos.
Se conserva U4/jefe/tienda y se limpia el combate antes de elegir, también con
núcleos. Corregido saldo de premios al regresar del callback de muerte de jefe.

Probar cerrando Electron y abriendo ABRIR_V1.cmd, o recargando la web local.
La elección aparece al terminar el primer campo, no al iniciar la partida.
Detalle, reglas, archivos, evidencias y límites: docs/PORTALES_RUTAS_2026-10-17.md.
QA dirigido Electron/HTTP, móvil apaisado, Infinito y jefe caótico pasa. El QA
general de entrega tiene una aserción previa obsoleta (6 élites vs 3 actuales).
No hubo commit ni push; cambios previos preservados. Build web local preparada.

## Legibilidad: primera muestra animada en roster existente — 16/10/2026

En `previews/enemy-roster-canonical.html`, botón Comparar legibilidad · Corredor.
Actual/propuesta animados al mismo tamaño, ojos y relieves sintetizados. No es
otra galería, no cambia partida ni IA y no implica aprobación para integrar.
Código de muestra aislado `previews/runner-legibility-trial.js`.
Próximo: valoración y extensión a Espíritu/Escopuras/espectros si se aprueba.
Doc/prompt: `docs/art-direction/LEGIBILIDAD_CRIATURAS_PRUEBA_V2.md`.

Cosmic readability y laboratorio spectral animated están en `previews/archive/`
con scripts/rig asociados. No son dependencias de producción; siguen teniendo
pruebas útiles. Se actualizaron herramientas y tests y se ejecutaron los dos QA
Electron después del traslado. No se borraron planes, dirección de arte ni módulos
funcionales. Otros subárboles no están declarados basura ni autorizados a purga
ciega: reference es respaldo congelado, src es reconstrucción histórica y local
contiene diagnósticos/perfiles. El manifiesto ya excluye esos materiales del juego.

## Limpieza de raíz y roster unificado — 16/10/2026

Acceso único `PRUEBAS.cmd`: roster vigente o carpeta de pruebas anteriores.
Diez `PROBAR_*.cmd` reubicados en `tools/launchers/`, rutas reparadas;
Trace y boceto conservados en `local/archive/root-cleanup-20261016/`;
workbench histórico en `previews/archive/workbench.html`, enlaces reparados.
README, AVISOS, GROWTH_PLAN y este archivo se conservan por su función vigente.
El roster ahora carga los tres espectros integrados y espera sus texturas.

PENDIENTE ACTIVO: probar correcciones de legibilidad a tamaño real y en movimiento
en un roster común (ojos, masas principales y síntesis de detalles), antes de
promover nuevos cambios al juego. No rediseñar todo desde cero ni cambiar IA,
velocidades o habilidades para compensar arte. Criaturas vivas no humanoides.
La limpieza no resuelve esa tarea ni implica aprobación de diseños nuevos.

## Espectros cósmicos integrados — 16/10/2026

Producción usa Arquero bronce, Guardia V2 sin recolorear y Núcleo dorado con
puntos interiores rojos. Rigs/ojos/gestos del laboratorio promovidos a módulo
independiente `js/render/cosmicSpecters.js`; recursos en `assets/cosmic-specters/`.
Sin cambios de IA, daño, colisión, spawn ni cámara. Se conservan señales de zona,
arpón/vínculo y aliado protegido; no se elimina telemetría durante esta integración.
QA Electron desde índice real: tres rutas dibujan, recursos listos, contexto
balanceado, entidades intactas y consola sin errores. Evidencia en
`local/validation/cosmic-specters-production-20261016/`.
Abrir ABRIR_V1.cmd después de cerrar completamente la instancia anterior.
Las entradas anteriores describen etapas históricas, no el estado actual.
Detalles: `docs/art-direction/ESPECTROS_COSMICOS_INTEGRADOS_V1.md`.

## Espectros V2: laboratorio animado listo, sin integrar — 15/10/2026

Abrir PROBAR_ESPECTROS_ANIMADOS.cmd. IA real de Arquero/Guardia/Núcleo juntos;
vistas de inspección, pausa, ojos móviles, párpados y piezas ligadas a estados.
Arquero tensa órgano de arpón; Guardia abre protección de aliado; Núcleo abre
lóbulos/abertura al preparar zona. Tamaños 112/124/118 px a referencia 1080p.
Vista gestual prueba sustituir avisos del cuerpo/linea windup de arpón, mantiene
zona del suelo, proyectil/tether y marcas del aliado protegido. Comparación externa
disponible. Producción NO cambia todavía; no se cambió IA/tiempos/daño de especies.
QA Electron: ciclo real windup/projectile/tether, guard:true, zonas, pureza,
miradas, gestos y pausa. Evidencia local/validation/spectral-cosmic-animated-20261015/.
Doc/assets/prompts: docs/art-direction/ESPECTROS_COSMICOS_ANIMADOS_V1.md.
Siguiente: valoración antes de integrar rigs y sustituciones de avisos en partida.

## Tanda espectral V2: refinada y sintetizada, sin integrar — 15/10/2026

PROBAR_ESPECTROS_COSMICOS.cmd abre ahora V2. Arquero: ojo ajustado sutilmente y
textura sintetizada. Guardia: otra variante más redondeada/envolvente. Núcleo:
misma estructura, síntesis interna. V1 preservada; selector V1/V2/juntas y
comparación al mismo tamaño. Tamaños tentativos: 112/124/118 px a ref. 1080p,
con Corredor/Espíritu/Escopuras integrados dibujados al pie como referencia.
Sin cambiar partida, IA, colisiones o datos. Falta valorar forma de Guardia y
refinados antes de placas de ojos, articulación y eventual integración.
Doc/assets/prompts: docs/art-direction/ESPECTROS_COSMICOS_REFINADOS_V2.md.
QA Electron y capturas: local/validation/spectral-cosmic-concepts-20261015/.

## Tanda espectral: tres conceptos para valorar — 15/10/2026

Abrir PROBAR_ESPECTROS_COSMICOS.cmd: Arquero ámbar, Guardia verde agua y Núcleo
carmesí. Diseños nuevos no humanoides con acabado cósmico compartido. Comparación
con renderer actual y escala tentativa. Son conceptos ESTÁTICOS, no integrados ni
animados. IA, habilidades y partida intactas; núcleos-objetivo y bosses sin tocar.
Doc/assets/prompts: docs/art-direction/ESPECTROS_COSMICOS_CONCEPTOS_V1.md.
QA Electron: local/validation/spectral-cosmic-concepts-20261015/.
Siguiente: valoración del usuario antes de preparar ojos, piezas y animación.
Corredor con amagues/aleteo queda aprobado por ahora, abierto a ajustes futuros.

## Corredor: amagues y aleteo propulsor integrados — 15/10/2026

Solo Corredor: posición media 120–220, 2 o 3 amagues completos de avance/retroceso
elegidos por ciclo, frenada 0,26 s y dash recto hacia la posición fijada al empezar
la frenada. Velocidad base ×1,85 (tope 320), duración 0,45–0,80 s; recuperación
0,48 s. Pliegues traseros aletean al preparar/avanzar; mira al jugador incluso
al retroceder. Solo daño por contacto existente, mismo daño/radio 9/tamaño/arte.
Sin proyectiles, daño de área ni partículas nuevas. Funciona con intent compartido
y fallback real de la entrada normal. PROBAR_CORREDOR_COSMICO.cmd usa la misma IA.
Doc: docs/art-direction/CORREDOR_ALETEO_CONTACTO_V1.md. Los apartados siguientes
son historial; sus referencias al ataque anterior quedan reemplazadas por esto.

## Cósmicos sintetizados INTEGRADOS — 15/10/2026

Autorizados por el usuario: Espíritu +20%, Corredor +5%, Escopuras sin aumento
respecto de los tamaños previos. Las tres texturas aprobadas se copiaron intactas
a assets/cosmic-creatures/*-synth-source-v1.png. Placas técnicas de ojos nuevas,
compuestas únicamente dentro de sus máscaras para preservar el cuerpo aprobado.
Miradas, párpados y articulación conservados; sin nuevos efectos por cuadro.
IA, daño, velocidades, oleadas, radios de colisión y pulso 68 intactos.
Catálogo y visores actualizados; ABRIR_V1.cmd carga la síntesis por defecto.
Cerrar toda ventana anterior y reabrir para actualizar JS. No se promete una
mejora de FPS por el cambio de textura/tamaño. Detalles/prompt técnico en
docs/art-direction/COSMICOS_SINTETIZADOS_INTEGRADOS_V1.md.
Los apartados siguientes documentan las etapas anteriores.

## Cósmicos sintetizados — propuesta separada, 15/10/2026

Abrir PROBAR_COSMICOS_SINTETIZADOS.cmd: Corredor ámbar, Escopuras verde y
Espíritu rojo, original/propuesta a igual tamaño, ampliación y escala de combate.
Pliegues/estrellas sintetizados para legibilidad; selector +10% opcional solo visor.
NO integrado: el juego conserva los sprites y tamaños aprobados. Es una prueba
estática de textura, no un rig nuevo ni una medición de rendimiento. Fantasma
élite intacto. Detalles y prompts: docs/art-direction/COSMICOS_SINTETIZADOS_V1.md.
Siguiente: valoración visual; si aprueba, adaptar placas/ojos/articulación antes
de promover. QA/capturas: local/validation/cosmic-readability-20261015/.

## Corredor cósmico integrado — 15/10/2026

Integración autorizada y aplicada a la partida normal de ABRIR_V1.cmd.
El módulo aprobado vive ahora en js/render/cosmicRunner.js y sus dos imágenes
en assets/cosmic-creatures/. Se prepara al iniciar y se dibuja por defecto;
el cuerpo legacy queda como respaldo durante la carga. Catálogo sincronizado.
Misma animación/tamaño aprobados; radio 9, IA, daño, velocidad y spawn intactos.
PROBAR_CORREDOR_COSMICO.cmd reutiliza el módulo de producción y conserva comparación.
QA Electron con protocolo/CSP de producción: los tres cósmicos cargan y se dibujan
en partida sin banderas de activación; perfil temporal, sin tocar partidas.
Evidencia: local/validation/cosmic-integrated-20261015/playing.png y qa.json.
Cerrar completamente la ventana anterior y reabrir ABRIR_V1.cmd para actualizar.
Los apartados siguientes son historial previo a esta integración.

## Corredor cósmico animado — laboratorio listo, 15/10/2026

Abrir PROBAR_CORREDOR_COSMICO.cmd. Dos miradas, párpados texturados, respiración,
pliegues y compresión/estiramiento ligados a su ataque real. La derecha del
visor ejecuta updateEnemies con guía automática/cursor a escala de combate;
incluye comparación con el Corredor actual. NO se integra todavía: falta que el
usuario valore la animación. El catálogo canónico conserva el diseño en partida.
No se cambió la IA: no existe un windup independiente; se anticipa visualmente
el final del timer o el acercamiento al umbral real de 80 unidades. Mecánica y
radio 9 intactos. Módulo previews/cosmic-runner.js solo se carga en el laboratorio.
Concepto original preservado y copia de ojos neutros nueva en previews/concepts.
Escena pesada 24 hostiles: referencia 147,71 FPS / nuevo 154,48; p95 12,1→9,2 ms,
p99 12,3→12,2 ms. Comparación corta favorable, sin garantía de 165 estables.
Doc/prompt: docs/art-direction/CORREDOR_COSMICO_ANIMADO_V1.md.
QA/capturas: local/validation/cosmic-runner-20261015/.
Validación final: 232 suites sin fallos; smoke Electron y aislamiento normal OK.
Siguiente: aprobación visual del CMD y, solo después, integración con su permiso.


## Corredor cósmico ámbar v1 — concepto para valorar, 15/10/2026

Nuevo diseño desde cero: previews/concepts/corredor-cosmico-ambar-v1.png.
Materia negra/plata, estrellas ámbar, dos ojos y pliegues barridos hacia atrás.
Se usaron ambos cósmicos aprobados y las tres referencias artísticas globales.
Solo imagen: no integra, no modifica mecánica/tamaño y no tiene todavía CMD,
ojos animados ni medición de rendimiento. Prompt y revisión en
docs/art-direction/CORREDOR_COSMICO_AMBAR_V1.md.
Siguiente: valoración del usuario; si aprueba, prueba animada a escala de combate
y medición antes de integrar. Espíritu y Escopuras continúan integrados intactos.


## Catálogo canónico sincronizado — 15/10/2026

previews/enemy-roster-canonical.html omitía los módulos cósmicos y Enjambrito
pintado. Ahora carga/prepara esos dibujos, pasa la bandera del Enjambrito a
su entidad y actualiza las descripciones de mira/moco/velocidad y retirados.
Referencia legacy separada: no carga los cósmicos ni el Enjambrito pintado.
Se ajustó la resolución del lienzo del visor (máximo ×2) para no pixelar una
tarjeta al expandirse; no modifica tamaños ni rendimiento de la partida.
QA file://: 29 entradas actuales con sprites activos, búsquedas correctas y
35 entradas legacy. Evidencia: local/validation/roster-art-20261015/.
Validación general: 231 suites sin fallos. Herramienta: tools/qa-roster-art.cjs.


## Espíritu / Escopuras cósmicos integrados — 15/10/2026

Aprobados por el usuario e incorporados al juego normal; abrir ABRIR_V1.cmd.
Se conservan mirada/párpados y piezas animadas. Espíritu +40%, Escopuras +35%
solo en el dibujo, sin modificar hitboxes ni densidad. Mira del Espíritu nueva,
orbital/segmentada, con los radios y tiempos originales. Escopuras: moco verde,
velocidad +30% (250→325); daño y stun intactos, otros ranged sin cambios.
El usuario quiere apreciar el diseño en un tamaño coherente, no reproducir a
ciegas un porcentaje ni eliminar detalles: revisar ese equilibrio al jugar.
La muestra CMD se actualizó también. QA/capturas en cosmic-production-20261015;
detalle en docs/art-direction/COSMICOS_INTEGRADOS_2026-10-15.md.
No hay garantía de 165 FPS: escena pesada de 24 hostiles midió 148,04 de media.
El moco adherido al personaje queda explícitamente para otra iteración.
Validación: npm run quality completo, 231 suites sin fallos; smoke Electron OK.
Corredor cósmico y el resto del rediseño no se tocaron en esta integración.


## Cósmicos animados en laboratorio — 15/10/2026

Abrir PROBAR_COSMICOS_ANIMADOS.cmd: Espíritu rojo y Escopuras verde aprobados,
con mirada, párpados texturados y piezas articuladas. No integrados en partidas.
Espíritu aclara el ojo durante phase_out; Escopuras carga/estira el sifón.
Los tiempos y avisos de zona originales se conservan. El usuario detectó un
parche oscuro en el ojo superior: corregido a párpado con textura del cuerpo.
Muestra estados/ataques ilustrativos, no combate real. Detalle y prompts:
docs/art-direction/COSMICOS_ANIMADOS_V1.md. Siguiente: valoración visual del CMD;
solo después integrar. Corredor cósmico continúa pendiente. No usar las variantes
minerales rechazadas ni atribuirles sus cifras de FPS a estos diseños.


## Escopuras verde v2 preparado — 15/10/2026

Editado el concepto aprobado de Escopuras: estrellas/filamentos rojizos a verde,
conservando negro/plata, cuatro ojos, forma y proporciones; abertura del sifón
apenas más definida. Archivo previews/concepts/escopuras-cosmico-verde-v2.png.
Espíritu rojo v1 y Escopuras rojo v1 intactos. Solo imágenes, sin cambios al juego
ni integración, animación, CMD o medición de rendimiento. Prompt/notas en
docs/art-direction/ESCOPURAS_VERDE_V2.md. Falta valoración del retoque; luego
Corredor en la misma dirección artística. Integración agrupada más adelante.


## Retoque sutil solicitado: Escopuras verde / Espíritu rojo — 15/10/2026

Usuario considera excelentes los dos conceptos cósmicos y quiere mantener sus
diseños exactos, evolucionando solo detalles. Espíritu v1 queda rojo e intacto.
Escopuras: editar solamente estrellas/filamentos rojos a verde y refinar apenas
la lectura de la abertura del sifón, sin cambiar forma/silueta/ojos/proporciones
ni aplicar un baño verde a todo el cuerpo. Guardar variante sin sobrescribir v1.
No integración ni CMD en esta fase. Corredor queda para después de este retoque.


## Escopuras cósmico: nuevo concepto para revisión — 15/10/2026

Espíritu cósmico v1 aprobado provisionalmente y guardado intacto. Usuario pidió
pasar al siguiente y dejar toda integración para después de diseñarlos.
Preparado previews/concepts/escopuras-cosmico-v1.png: cuatro ojos, organismo de
presión y sifón inferior, materia negra/cósmica coherente con Espíritu. Se usaron
las tres referencias generales más Espíritu como referencia de acabado, no molde.
Falta valoración del usuario. Solo imagen conceptual; no animación ni CMD ni
cambios en runtime. Prompt y estado en docs/art-direction/ESCOPURAS_COSMICO_CONCEPTO.md.
Luego sigue Corredor si esta dirección convence. No integrar remodel-v1 rechazados.


## Espíritu cósmico APROBADO provisionalmente — 15/10/2026

Usuario considera muy bueno el primer diseño y pidió guardarlo tal cual por
ahora. No modificar previews/concepts/espiritu-cosmico-v1.png. Pasar al siguiente
enemigo (Escopuras) con las tres referencias generales y el acabado aprobado
de Espíritu, pero silueta/función propias, sin humanoides. Integración aplazada
por pedido del usuario hasta tener los diseños de la tanda. No crear lanzadores
ni modificar runtime durante esta fase de conceptos. Después queda Corredor.
Ojos pintados en conceptos; animación/seguimiento y coste se resuelven al preparar
los sprites, sin afirmar que ya están listos para jugar. Partida normal intacta.


## Cambio de dirección artística: tres referencias GENERALES — 15/10/2026

Usuario rechazó los tres diseños remodel-v1. NO integrarlos. Pidió probar UNO
tomando influencia de referencias oscuras/cósmicas, siempre sin humanoides.
Seleccionado Espíritu. Primer concepto generado en previews/concepts/espiritu-cosmico-v1.png,
solo imagen, no integrado ni ojo animado aún. No avanzar con otros sin valoración.
Las TRES imágenes aportadas son referencia para TODOS los enemigos del juego:
material cósmico, sombra expresiva y textura orgánica; no copiar cuerpos humanos.
Referencias persistidas en docs/art-direction; criterio global actualizado en
docs/CRITERIO_VISUAL_CRIATURAS.md. Prompt/estado del concepto en
docs/art-direction/ESPIRITU_COSMICO_CONCEPTO.md. Partida normal intacta.


## Próxima tanda DISEÑADA: Escopuras/Corredor/Espíritu — 15/10/2026

Usuario pidió diseños de cero para Escopuras y los otros dos de la tanda.
Tres sprites nuevos con acabado coherente de élites, siluetas propias, sin
patas/brazos y ojos vivos4/2/1. Abrir PROBAR_COMUNES_REDISENADOS.cmd (Electron):
actual izquierda/propuesta derecha, ampliación y referencia de tamaño1080p,
reposo/estados automáticos. NO integrados en partida normal, que sigue igual.
Código opt-in js/render/refinedCommon.js; no descargas de sprites nuevos en normal.
Tanque/Enjambrito/élites/bosses/amenazas dimensionales no se tocaron visualmente.
Referencia A/B24:128,22->150,63 y115,95->146,87 FPS. Sesión variable; no garantiza
165 ni ahorro fijo. Estado/ojos/ataques/Canvas y MARK idéntico comprobados.
Docs: COMUNES_REDISENO_2026-10-15.md y COMUNES_REDISENO_PROMPTS_2026-10-15.md.
Pendiente inmediato: valoración visual de esta muestra, retoques si hacen falta,
integración solo de aceptados y prueba normal10. Cap/cadencia élites aún pendiente.
Validación final:230 suites sin fallos, captura QA correcta,158 recursos y87
archivos congelados intactos. No commit/push/publicación.


## Élites legibles INTEGRADOS y criterio de producción — 15/10/2026

Usuario aprobó la muestra e indicó probar en partida. Asesino/Fantasma/Goliat
usan v2 y postura suave en normal/prueba por flag de especie y constructor;
precarga solo v2, sin sumar dibujos ni cambiar tamaño/ojos/hitboxes/ataques.
ABRIR_V1.cmd permite ver la integración; no requiere abrir la galería.
Versiones anteriores siguen disponibles para diagnóstico. Muestra comparativa
conservada. Prueba Electron10:163,60->163,68 FPS; p95/p99=6,1/6,2 ms iguales;
peor26,3->31,4 ms. Estrés24 con las tres especies:148,73->150,12 FPS;
p95/p99=7,8/11,6->7,6/10,8 ms, peor42,4->38,9. No garantiza165 estables ni es
una mejora estadísticamente demostrada; faltan partida humana y estrés completo.
Evidencia y límites en docs/ELITES_LEGIBILIDAD_2026-10-15.md.
Validación final:229 suites sin fallos, QA de ojos/ataques de las tres especies,
154 recursos verificados y87 archivos de referencia congelados intactos.

Marco confirmado en docs/CRITERIO_VISUAL_CRIATURAS.md: Steam/Electron prioritario,
web/móvil compatibles cuando sea viable; calidad de producción, coherencia,
lectura, coste medido y evolución no destructiva. Trabajar tandas de hasta3.
Próxima tanda propuesta: Escopuras, Corredor y Espíritu, empezando por revisar
coste/identidad de los actuales antes de dibujar. No están rediseñados todavía.
Revisión de cap/cadencia de élites sigue separada y pendiente de valores de balance.
Enjambrito no se rediseña ahora. Bosses y Núcleo I/II/III intactos.


## Muestra de legibilidad preparada — 15/10/2026

PROBAR_ELITES_LEGIBLES.cmd abre comparación actual/propuesta de los tres élites,
aumentada y a referencia1080p. Nuevas texturas readable-v2: planos más limpios,
sin cambiar silueta, tamaños ni ojos. Postura opcional suave ligada al movimiento,
se asienta al parar y respeta poses de ataque. Partida normal sigue con v1:
no descarga v2 ni activa postura. Originales preservados. Edición imagegen
integrada; prompts/archivos/QA en docs/ELITES_LEGIBILIDAD_2026-10-15.md.
Primera carga24: control116,10/propuesta100,98 FPS; repetición de control falló
por cambio automático de calidad. NO integrar ni afirmar mejora de rendimiento.
Siguiente: valoración visual de la muestra, luego comparación repetible antes
de adoptar. Cap/cadencia de élites y Escopuras siguen pendientes. Enjambrito intacto.
Validación: 228 suites sin fallos, dos capturas QA correctas,154 recursos verificados.


## Prioridades revisadas con feedback del usuario — 15/10/2026

Tamaños y ojos aprobados. Nuevo feedback: los detalles interiores de los tres
élites se miniaturizan demasiado y la persecución parece rígida/de espaldas.
No agrandar otra vez los cuerpos, no cambiar mecánicas ni añadir efectos.

Orden de continuación:
1. Pulido focalizado de legibilidad de élites: pocas formas internas más anchas,
   sombras/luz separadas y motivos legibles a escala real, no más microdetalle.
   Mostrar a tamaño de partida y con combate detrás antes de adoptar otro arte.
2. En esa misma muestra, postura direccional sutil: inclinación/desplazamiento
   de piezas ya dibujadas; no giro completo de la imagen frontal. Respetar las
   poses de ataque. Actualmente el renderer pintado usa sway/breath temporales
   y ojos dirigidos; no tiene postura corporal de persecución direccional.
3. Repetir rendimiento con tamaños actuales y sin galerías abiertas: la última
   comparación de tamaño estuvo contaminada. No prometer165 FPS estables.
4. Definir límite/cadencia específicos de élites simultáneos; sigue pendiente.
   Comandante/Bastión/Centella YA retirados del roster promovido, no repetirlo.
5. Escopuras: muestra integral animada y medida. No repetir el cache de dos
   contornos, que fue descartado por falta de mejora consistente.

Enjambrito queda provisionalmente aprobado; no rediseñarlo ahora. Espectros,
bosses y objetivos Núcleo I/II/III no se modifican en esta fase. Queda pendiente
la investigación comparativa del coste de núcleos y la prueba de estrés de
efectos simultáneos. Esta revisión solo ordena trabajo: no se cambió render.


## Segundo ajuste de tamaño y ojos — 14/10/2026

Solicitud puntual aplicada: élites +15% adicional respecto al último tamaño
(1,04 ->1,196), ojos +20% relativo al cuerpo para mejorar lectura; Enjambritos
+5% adicional (1,10 ->1,155). Sigue siendo solo visual: hitboxes, ataques,
IA, spawn y cantidad de entidades no cambian. Ojos conservan seguimiento.
No se realizó otra medición de rendimiento en esta modificación puntual.

## Tamaño visual solicitado — 14/10/2026

Enjambrito limpio +10% (escala1,10 del grupo) y los tres élites pintados +30%
respecto a su tamaño integrado anterior (0,8 ->1,04). Ojos/material/animación
escalan juntos. Sin cambios de hitbox, daño, IA, spawn ni ataques.
Comparación size-before/after-20261014: 110,24 /113,72 FPS con24 enemigos,
pero otra ventana animada de élites estaba abierta. Medición contaminada:
NO inferir ganancia ni ausencia de coste. Pendiente repetir sin otras muestras
o juego abiertos. No se cerraron ventanas del usuario.


## Enjambrito aprobado e integrado — 14/10/2026

Usuario acepta provisionalmente el diseño limpio (sin boca ni filamentos) para
avanzar; podrá rediseñarlo más adelante. Activado solo en el roster promovido,
con precarga del material, tres ojos vivos, órbita y combate originales.
Override de laboratorio false conserva el dibujo anterior para A/B.
Comparación pesada congelada: original 148,11/151,95 FPS frente a nuevo
155,97/156,95. Raster medio 3,418/3,415 frente a 3,346/3,370 ms; no es tiempo GPU
exclusivo. En combate vivo de 24 enemigos: 144,43 -> 147,52 FPS, sin mejoras
de p95/p99 (12,1/12,2 ms). No promete 165 estables ni cambia el cap normal de10.
227 suites pasan y captura verifica la activación por especie sin override.
Los tres élites quedan aprobados; Escopuras es la siguiente optimización medida.
Lanzadores de muestras corregidos: ventanas visibles por doble clic.
Escopuras: dos dibujos aportan ~0,213 ms de raster en la escena aislada.
Cache de cuerpo/boquilla probado, sin ventaja consistente y retirado. Su diseño
normal queda intacto; siguiente paso es una muestra integral animada, no repetir
ese cache. Evidencia y límite de interpretación en docs/ESCOPURAS_COSTE_2026-10-14.md.


## Enjambrito dimensional limpio — 14/10/2026

Usuario pidió quitar las líneas que salen de los cuerpos y la marca que parecía
una boca. Corregida la propuesta: sin filamentos externos/atlas ni curva interior
inferior; tres ojos vivos, órbita, respiración y material conservados. Galería
PROBAR_ENJAMBRITO_PINTADO.cmd actualizada. No se modificó el Enjambrito original
de partida. Las mediciones con atlas de abajo son históricas, no de esta revisión.
Pendiente: juicio visual y A/B en movimiento antes de integración; Escopuras
después. Detalle: docs/ENJAMBRITO_DIMENSIONAL_2026-10-14.md.

## Enjambrito: identidad original recuperada — 14/10/2026

Usuario rechazó el sprite de pescado y pidió conservar las tres formas/ojos
cian originales, acercando su material al acabado de élites/núcleos. Galería
PROBAR_ENJAMBRITO_PINTADO.cmd actualizada: mismo contorno, órbita y ojos vivos,
borde plegado, volumen suave y filamentos con ondulación independiente. Material
preparado por Canvas una vez; no usa el PNG rechazado. Cola preparada en atlas
de 128 fases (órbita y pupilas continuas). Partida normal sigue con el original.
Criterio global gradual: docs/CRITERIO_VISUAL_CRIATURAS.md. Resultados viejos
swarm-painted-* corresponden al pescado rechazado, no a esta nueva versión.
Próximo: juicio visual y costo de propuesta dimensional, luego A/B en movimiento
si se acepta; no redibujar automáticamente todo el catálogo. Escopuras después.
Medición final con atlas: mezcla congelada/animada de 21 actuales, tres
Enjambritos: controles 153,63/153,13 FPS -> 158,14/157,61; p95 12,1->6,2,
p99 sigue12,2. Raster medio solo algo menor, percentiles no consistentes.
No garantiza165. Detalle: docs/ENJAMBRITO_DIMENSIONAL_2026-10-14.md.

## Enjambrito pintado: prototipo medido — 14/10/2026

Nueva propuesta pequeña, tres criaturas pintadas con ojos que siguen al jugador,
misma órbita y señales. PROBAR_ENJAMBRITO_PINTADO.cmd abre antes/después animado.
Partida normal mantiene el anterior; flag de prueba no persistido y no descarga
su sprite fuera del laboratorio. Diez Enjambritos: ambos ~165 FPS, raster de
escena 2,51–2,64 ms -> 2,11–2,14 ms. Mezcla de 21 actuales con tres Enjambritos:
151,4 ->157,6–157,8 FPS repetidos; p95 12,1 ->6,2 ms, p99 sigue12,2. No garantiza
165 ni representa una partida humana. QA ojos/animación/pureza y contratos de
Enjambrito aprobados. Detalle: docs/ENJAMBRITO_PINTADO_2026-10-14.md.
Próximo: juicio visual, A/B en movimiento y adopción si gusta y mejora; después
Escopuras. Tres élites pintados siguen activos, cap global diez conservado.

## Criaturas pintadas INTEGRADAS en partida — 14/10/2026

Usuario autorizó integrar los tres diseños y seguir evaluando rendimiento después.
Roster activo normal: Asesino, Fantasma y Goliat; Comandante/Bastión/Centella
retirados del roster promovido. Catálogo histórico conservado para compatibilidad
y laboratorio. Los tres activos usan el renderer pintado por flag de entidad,
con precarga antes del combate, ojos vivos, Fantasma tenue y sin arma incorporada
de Asesino. Ataque de cuchilla original intacto. Mecánicas y radios físicos
conservados en esta integración. Cerrar/reabrir ABRIR_V1.cmd para verlos.
Cap global continúa en diez hostiles; no se cambió la concurrencia de élites.
Validación de integración: 226 suites sin fallos; galería comprueba el flag
normal sin override de prototipo. Smoke Electron 1080p/high/full, diez vivos,
movimiento, proyectiles, explosiones y entorno reactivo: 163,37 FPS medios en
ocho segundos. No certifica todas las partidas ni elimina los picos. Informe:
local/validation/overlap-performance/elite-integrated-ten-20261014.json.
Pendiente: límite específico de élites, revisión de hitboxes del tamaño final,
rendimiento en partida real y luego Enjambrito/Escopuras. Las notas de galería
aislada inferiores son históricas respecto de la integración.

## Diseño aprobado de Asesino sin arma incorporada — 14/10/2026

Retirados la abertura/filo añadido bajo los ojos, la cuchilla nueva y el botón
de demostración. Asesino vuelve a su sprite pintado anterior; su cuchilla solo
existe como VFX del ataque original. Fantasma tenue y Goliat aprobados conservados.
La galería sigue aislada. Próximo paso: integrar los tres en partida, retirar
Comandante/Bastión/Centella del roster activo, fijar cap específico de élites,
alinear hitboxes/tamaño y validar combate. Luego Enjambrito/Escopuras.
Los apartados anteriores de cuchilla incorporada son históricos y rechazados.

## Ajustes de criaturas aceptadas — 14/10/2026

Usuario aprobó en general los nuevos diseños pintados. Afinados en el prototipo:
Fantasma corporal tenue (54–66%) con ojos legibles; Asesino con abertura entre
placas y cuchilla reutilizable integrada a su VFX real, sin cambiar alcance,
timing ni daño. PROBAR_ELITES_REFINADOS.cmd añade botón de despliegue de cuchilla.
Goliat conservado; futura animación del stun queda pendiente. Los tres siguen
en la galería aislada: falta integrar roster de tres, cap de élites y radios al
tamaño final; luego Enjambrito/Escopuras. Detalle actualizado en
docs/ELITES_CRIATURAS_2026-10-14.md.

## Prototipo visual rehecho: criaturas pintadas — 14/10/2026

Usuario rechazó los polígonos simplificados y pidió criaturas nuevas con el
acabado de los núcleos, sin reproducir sus objetos. Generados sprites separados
de Asesino/Fantasma/Goliat, con cavidades para tres ojos añadidos por código.
PROBAR_ELITES_REFINADOS.cmd abre la galería animada: respiración y seguimiento
del cursor. Son propuestas aisladas: juego normal conserva los seis élites y
sus caps; el arte nuevo no se descarga/prepara en partida normal todavía.
QA de alpha, ojos, movimiento y no mutación aprobada. A/B con 24 actuales:
control final 147,46 FPS / raster 3,559 ms; propuesta 151,29 / 3,476 ms.
p95/p99 de cuadros sin mejora; no se prometen 165 estables. Próximo: juicio
visual y luego integración de tres especies/concurrencia/radios, seguida de
Enjambrito/Escopuras. Detalle: docs/ELITES_CRIATURAS_2026-10-14.md.

## Nueva etapa: élites y enemigos densos — 14/10/2026

Usuario pidió estudiar costo primero y después revisar diseño. Plan: conservar
Asesino/Fantasma/Goliat, retirar Comandante/Bastión/Centella en la integración,
limitar élites simultáneos y conservar animación viva/no humanoide. Luego
Enjambrito/Escopuras. Espectros, bosses y objetivos núcleo quedan por ahora.
Auditoría aislada realizada: con 24 actuales, controles 145–147 FPS; sin dibujo
completo de seis élites 163 FPS; sin sus lóbulos, dejando ojos/partículas, 151.
Los componentes menores por separado no dieron una ventaja clara sobre el
control final. No es una promesa de 165 ni una prueba de todos los consumibles.
Producción conserva roster, caps y render. Próximo: prototipo animado aislado
y medido de los tres élites para verlo antes de integrar. Investigar después
costos GPU de núcleos I/II/III a tamaño equivalente; ya usan sprites/atlas,
pero todavía no se midieron en comparación GPU. Detalle y resultados:
docs/PLAN_ELITES_Y_ENJAMBRE_2026-10-14.md.

## Optimización sutil ACTIVA — 14/10/2026

Restricción de igualdad de píxeles levantada por el usuario. Integrados:
rectángulos directos para 160 estrellas y 256 motas; Hydra con menos halo/tinta
repetidos en sus tres lóbulos pequeños, conservando cuerpo principal, ojos,
colores, partículas y ataques. Física de gas, estelas y densidad intactas.
Enjambrito/Escopuras: prototipos probados y retirados por no mejorar el cuadro
de forma consistente; modelos previos conservados. Hydra exclusiva de una
especie rara sigue siendo una propuesta futura, no un cambio de balance hecho.

Final real 1080p/diez actuales: 163,97 FPS, p95/p99 6,20/6,20 ms; referencia
142,37 y 8,10/10,30. Con 24, ajuste Hydra en movimiento: 131,93→143,52.
Hubo picos aislados: NO se garantizan 165 siempre ni piso absoluto 100.
226 suites sin fallos, QA ocho mapas/móvil/fallback aprobada; 145 recursos,
87 referencias intactas. Cerrar/reabrir ABRIR_V1.cmd. Sin paquete nuevo,
publicación, commit ni push. EXE viejos/Pages no se actualizaron.

Detalle vigente: docs/OPTIMIZACION_SUTIL_2026-10-14.md; hoja visual:
local/validation/subtle-render-20261014/comparacion.png.
Próximo paso: juicio visual humano y, si hay caídas, trace de la escena real
con sus habilidades/música activas. No repetir auditorías con roster histórico.
Los apartados siguientes documentan etapas previas y candidatos anteriores.

## Roster actual y foco de rendimiento corregido — 14/10/2026

El usuario confirmó uso local, pantalla encendida y Windows desbloqueado.
Se verificó que Dron, Escudo, Peón, Lútil independiente, Rápido y Espectro Vacío
están retirados; Arquero usa el modelo Lútil. El benchmark anterior forzaba ese
catálogo histórico: no usar sus costos por enemigo para decidir sobre producción.
Detalle vigente: docs/COSTO_ROSTER_ACTUAL_2026-10-14.md.

Nueva muestra con modelos/flags promovidos y límite vigente de diez: cambiar
solo el dibujo de estrellas/motas da 142,37→164,05 FPS en movimiento; p95/p99
8,10/10,30→6,20/6,20 ms. Conserva cuerpos, efectos y cantidades; difiere el
antialiasing de motas. **Candidato aislado, todavía no instalado.** Con 24
actuales en movimiento: 104,89→134,81. No se garantiza 165 siempre ni piso 100.
Enjambrito es un foco adicional medido; quitar glows comunes no dio mejora clara.

Próxima modificación recomendada: evaluar/adoptar el dibujo directo de motas,
con revisión visual de su pequeño cambio de suavizado, antes de reducir densidad
o rediseñar enemigos. Mantener diez. Si falta margen, simplificación focalizada
por familia, comenzando Enjambrito. No hacer recortes globales por intuición.
Tools y manifiesto verificados; sin cambios de arte/combate normal, commit ni push.
Los 136 FPS del control mínimo fueron de otra sesión; esta alcanzó 164–165.
No asumir un techo permanente de 136 ni atribuirlo a monitor apagado.

## Auditoría GPU por capas — 14/10/2026

Última continuación: recorte exacto de actores (36/36 comparaciones) sin ganancia
repetible; recorte exacto de motas/estrellas más lento. Ambos descartados.
**Nuevo hallazgo:** una ventana Electron sin juego, animando solo un cuadrado,
queda en 136 FPS (136 también impidiendo sueño de pantalla), pese a informar
165 Hz. RX 7800 XT/D3D11 activa. Trace: intervalo anunciado 6,061 ms pero
BeginFrame mediano 7,320 ms y `WaitForVSync Sleep` repetido. No se conoce aún
la causa local; no afirmar que el monitor esté apagado ni culpar al driver.
Próximo paso inmediato: confirmar sesión local/pantalla encendida con el usuario
y repetir `node tools/performance/refresh_ceiling.cjs` antes de certificar 165.
No se cambiaron preferencias del sistema ni flags del juego. El costo GPU
del combate continúa pendiente independientemente de esta limitación adicional.

Medición terminada y alternativas evaluadas; **165 FPS estables siguen pendientes**.
No se activó ninguna optimización experimental en el juego normal: las variantes
que aceleraron cambiaron píxeles y las exactas no dieron una mejora consistente.
Se preservaron resolución, efectos, entidades, simulación y todos los cambios locales.

Escena congelada 1080p: original 106–108 FPS; omitir actores/combate da 164,79,
omitir ambiente da 149,64. Costos prioritarios: cuerpos de enemigos y paths
Canvas dispersos de estrellas/motas, no el shader de las nebulosas.
`fillRect` alcanzó 137 FPS en partida pesada frente a 103 del original, pero
falló igualdad de píxeles (máximo 13/255) y no mejoró sustancialmente p95/p99:
**rechazado, solo disponible en herramientas de laboratorio**.
Descarte fuera de pantalla: píxeles iguales, sin ganancia repetible; rechazado.

Detalle, tablas, límites y reproducción: docs/GPU_LAYERS_2026-10-14.md.
Traces y resultados: local/validation/gpu-layer-audit/ y overlap-performance/.
Siguiente paso: optimización exacta del raster Canvas en esos dos focos;
validar cuadro completo y trace antes de integrar. No migrar simulación,
recortar calidad ni aprobar diferencias de antialiasing sin autorización.
Sin commit, push, publicación ni nuevos paquetes.

Validación de esta auditoría: `npm run quality` aprobado; 226 suites, 0 fallos,
145 recursos de entrega y 87 archivos de referencia conservados.

## Refresco y coherencia visual — versión vigente, 13/10/2026

Auditoría y correcciones terminadas: reloj visual común, suavizado por tiempo,
partículas independientes del refresco, interpolación del entorno de 120 Hz,
sacudida alineada entre Canvas/WebGL y ritmo sin desapariciones entre frames.
Contador FPS y telemetría distinguen cadencia rAF de Hz/presentación física.
Lobby y pausa conservan relojes separados de la simulación. Diseño y combate
preservados. Detalle: docs/REFRESH_COHERENCE_2026-10-13.md.

Monitor real 165 Hz: reposo visible 164,29 FPS. Carga pesada final en pantalla
completa: 92,15 FPS sin tracing. **NO están logrados 165 sostenidos ni el piso
de 100 FPS.** El cuello principal medido es el rasterizado Canvas de enemigos
y efectos, no la simulación. Cache Path2D de proyectiles y desynchronized no
demostraron una solución; no se activaron en producción.

Validación final: 226 pruebas, 0 fallos; QA Electron PC/móvil, ocho mapas,
pausa, pérdida GPU y coherencia de imagen aprobados. Manifiesto: 145 recursos.
Resultados: local/validation/refresh-coherence y overlap-performance.
Cerrar/reabrir ABRIR_V1.cmd; los EXE anteriores no incluyen estos cambios.
Sin nuevos paquetes, publicación, commit ni push.

Siguiente paso de rendimiento: optimizar rasterizado de enemigos/VFX con
mediciones a igual resolución y carga, validando imagen y cadencia. No arrancar
una migración masiva de simulación ni recortar efectos para esconder el costo.

## Hábitat vivo — base visual conservada, 13/10/2026

Conservados los ocho paisajes aprobados y las estelas de proyectiles. Nueva
materia cercana: pliegues de gas con detalle del paisaje de cada dimensión,
movimiento autónomo y aberturas por el recorrido de jugador, enemigos, jefes y
proyectiles; el gas se acumula a los lados y se recompone en unos cinco segundos.
Cuatro pequeños velos cruzan el plano del personaje; viajeros lejanos, un meteoro
ocasional y luz cósmica lenta dan vida cuando estamos quietos. Sin lupa ni
deformación del paisaje distante. No se cambiaron combate, cámara ni límites.

Abrir PROBAR_ENTORNO_VIVO.cmd: sesión aislada que comienza junto al gas, WASD,
Shift y clic. F6 compara reacción del gas SIN quitar estelas; F8 cintas/gas,
F9 ocho mapas, F7 reinicia. ABRIR_V1.cmd carga fuente actual en partida normal;
Gráficos → Cosmos vivo / Entorno reactivo. Cerrar/reabrir: los EXE viejos no
contienen esta etapa. Sin commit, push, publicación ni nuevos paquetes.

224 pruebas sin fallos, 144 recursos verificados. Electron real: movimiento,
tiros, pausa, ocho mapas, ajustes persistentes, alineación móvil y fallback GPU.
Campos combinados en una textura 65×37: cuatro texturas y un paso GPU, no cinco.
Misma carga visible 1920×1080, 24 enemigos y VFX completos: antes 108,1–110,4 FPS;
ahora 109,1–111,5 FPS; p95/p99 iguales. No certifica 120–165 ni elimina los picos.
Video real: local/validation/habitat-live/recorrido.webm (30 FPS de captura,
no medición de rendimiento). Detalle: docs/HABITAT_VIVO_2026-10-13.md.

Implementación y verificación terminadas; pendiente únicamente el juicio humano
en movimiento y ajustes focalizados si hacen falta. Paleta global, otros bugs,
mecánicas ambientales y tráiler siguen fuera de esta tarea.

Los apartados siguientes son históricos y no describen el render vigente.

## Cosmos vivo — etapa anterior, 13/10/2026

Los ensayos de nubes/jardín fueron rechazados y quedan fuera del runtime; el
jardín se archivó localmente, recuperable. Ocho nebulosas originales restauradas,
circulación gaseosa interna, planetas/núcleos/bordes estables y respuesta cercana
de personaje/enemigos/proyectiles reducida (gain 0,20; máximo 7,6 unidades).
No lupa, vaciado radial ni desplazamiento completo de la pintura; no gameplay nuevo.
Abrir PROBAR_ENTORNO_VIVO.cmd: WASD, Shift, clic; F6 reacción, F8 cintas, F9 mapa,
F7 reiniciar. ABRIR_V1.cmd carga fuente normal; Gráficos → Cosmos vivo/Entorno
reactivo. No EXE/web nuevos; cerrar/reabrir y no usar paquetes anteriores.
221 suites sin fallos, 142 recursos. QA Electron ocho mapas, movimiento, tiros,
pausa, menú, resize, fallback y móvil. Comparación visible ABBA 24 enemigos/VFX
completos: 130,7 FPS frente a 121–122 cintas en ventana 1280×800. En ventana
1920×1080: 112,8 frente a 100,1 FPS; no certifica 120–165 ni elimina todos los picos.
Pendiente: juicio humano en movimiento sobre esta dirección, ajustes focalizados
si necesarios. Paleta global/mecánicas ambientales no forman parte de esta etapa.
Detalle y evidencia: docs/COSMOS_VIVO_2026-10-13.md. Sin commit/push/publicación.

Los apartados siguientes son históricos y no describen el render vigente.

## Prueba jugable de respuesta al desplazamiento — 13/10/2026

Prioridad corregida por el usuario: interacción del espacio con personaje,
enemigos y proyectiles, no seguir generando modelos visuales. La maqueta anterior
no se integró como imagen ni se considera aprobación del aspecto.
Umbral tiene materia cercana anclada al mundo: se aparta al recorrerla, reacciona
a enemigos/disparos y recupera su forma. Presentación pura; sin colisiones,
daño, controles, siluetas ni progresión nuevos. Los otros siete mapas no reciben
esta reacción. Ajustes → Gráficos → Entorno reactivo · prueba Umbral permite
comparar ON/OFF; requiere Espacio gráfico en movimiento.
Abrir PROBAR_ENTORNO_VIVO.cmd para una sesión real aislada con Boti y 10 enemigos,
sin escribir progreso/ajustes personales. WASD, Shift, clic; F6 comparar, F7
reiniciar. ABRIR_V1.cmd usa el código fuente actualizado en partida normal.
220 suites sin fallos; QA Electron de movimiento, enemigos, tiros, pausa, toggle,
cambio de mapa, resolución y fallback GPU. 142 recursos de fuente verificados.
Entregas empaquetadas anteriores NO se actualizaron en esta etapa; usar los
accesos de fuente anteriores, no un EXE viejo de releases.
Pendiente: evaluar en movimiento con el usuario; no extender antes de esa
evaluación. 120–165 FPS estables y la paleta global siguen sin certificar.
Detalles: docs/SPACE_RESPONSE_TRIAL_2026-10-13.md. Sin commit/push/publicación.

## Prueba común de espacio gráfico — 13/10/2026

Los ocho escenarios tienen ahora un modo no fotográfico creado con código:
masas gráficas de color contenido, avance común a tres profundidades, polvo y
estelas. Contornos/arena, controles, colisiones y paleta de actores intactos.
Se activa por defecto en esta prueba, con comparación reversible en Ajustes →
Gráficos → Espacio gráfico en movimiento. Apagar recupera el modo ilustrado
anterior y Fundición viva; no se borró arte ni código previo.
219 suites sin fallos; QA ocho mapas, pausa, toggle/persistencia, PC/móvil y
pérdida de contexto GPU. 141 recursos de entrega/Android sincronizados.
Web: releases/DeadSingularity-V1-web-yVHmfH.
Electron: releases/DeadSingularity-V1-desktop-NIiKh6/win-unpacked/DeadSingularity.exe.
Detalles y medidas limitadas: docs/GRAPHIC_SPACE_TRIAL_2026-10-13.md.
Pendiente: revisión estética humana, unificación global de paleta y FPS estables
120–165 aún sin certificar. No mecánicas ambientales ni commit/push/publicación.

## Fundición viva — 12/10/2026

Etapa visual completada en Fundición: circulación elíptica GPU de la galaxia,
paralaje tenue, gas próximo delante/detrás y estelas por movimiento/dash.
Pausa congelada y fallback Canvas ante pérdida/fallo GPU, comprobados en PC y
móvil emulado. Los otros siete fondos y el balance no se modificaron.
218 suites sin fallos; 140 recursos de entrega/Android verificados.
Build web: releases/DeadSingularity-V1-web-hhcNej.
Electron portable: releases/DeadSingularity-V1-desktop-WHHETH/win-unpacked/DeadSingularity.exe.
ABRIR_V1.cmd usa el código actual; reabrir para cargar esta escena.
Ver docs/FOUNDRY_IMMERSION_2026-10-12.md para código, prompt, evidencia y límites.
Pendiente: revisión visual humana, extensión deliberada a otros escenarios y
eventuales corrientes/ocultamiento mecánicos. FPS estables 120–165 NO certificados.
No commit, push, publicación, APK ni instalador nuevo en esta etapa.

## Actualización prioritaria — 12/10/2026

Normal y pruebas dimensionales comparten la base aprobada completa. El lobby
ciruela conserva su apariencia y la sesión sin guardar, listo para futuras
pruebas. Enemy Roster y la galería de escenarios reflejan la base actual.
Ver `docs/PROMOCION_DIMENSIONAL_2026-10-12.md`; los apartados fechados anteriores
son históricos. Afinidad terrestre/espacial: próxima tarea, aún sin implementar.
Commit local autorizado; ningún push ni despliegue forma parte de esta tarea.

Entregas locales de este hito: web en
`releases/DeadSingularity-V1-web-GfS25z`; Electron ejecutable en
`releases/DeadSingularity-V1-desktop-0QWLR2/win-unpacked/DeadSingularity.exe`;
Android con 129 assets verificados en `android/app/src/main/assets/game`
(no equivale a un APK compilado). Los artefactos y perfiles quedan fuera de Git.

## Notas anteriores

Menú gráfico renovado 10/10: resolución interna 720p/1080p/1440p, ayudas por
hover/foco/tap, fullscreen y reset sólo de gráficos. Calidad: 197 suites sin
fallos y QA real PC/móvil aprobado. Build web actual: releases/DeadSingularity-V1-web-RS2KIq.
Ver docs/GRAPHICS_MENU_2026-10-10.md. Sin commit ni publicación de esta pasada.

Estado de limpieza 10/10/2026: builds antiguos, cachés QA y archivo histórico
grande enviados a la Papelera, restaurables; se conserva el respaldo fuente
actual. Ver `docs/LIMPIEZA_PROYECTO_2026-10-10.md`. Continuidad de FPS abierta:
ver `docs/VIGILANCIA_RENDIMIENTO.md`.

Las rutas de builds y conteos de QA que aparecen más abajo son registros de
validaciones anteriores, no inventario actual. La carpeta `local/validation`
conserva evidencia; builds retenidos están listados en el informe de limpieza.

La única carpeta de trabajo es C:\Users\party\Desktop\DeadSingularity V1.
Abrir ABRIR_V1.cmd para jugar o ABRIR_V1_WEB.cmd para navegador.
Versión actual: 1.1.0-alpha.1. Código, herramientas y entregas están en esta carpeta.

El archivo histórico de recuperación (incluidos los cinco ZIP previamente
verificados y sus historiales) está ahora en la Papelera de Windows, no dentro
del proyecto; puede restaurarse. El respaldo fuente vigente se conserva en
`local/archivo/actual`.

El contenido del directorio de trabajo anterior fue retirado a la Papelera después
de preservar y verificar sus novedades y sus 777 archivos Git. Sólo queda su carpeta
vacía, bloqueada por este chat. El ayudante local/retirement/finish-retirement.ps1
intenta eliminarla cuando Windows libere el bloqueo; se detiene si aparecen archivos.
Cerrar completamente Codex libera el bloqueo. Ver local/retirement/COMPLETADO.txt.

Calidad local al 09/10/2026: 189 pruebas, cero fallos; 105 recursos de entrega verificados y
87 archivos de referencia original intactos. QA y capturas: local/validation.
La migración conserva guardados anteriores sin reemplazar un progreso nuevo.

GitHub y Pages: DeadSingularity; dirección de publicación
https://danelnow88.github.io/DeadSingularity/. El 08/10/2026 el autor autorizó
renombrar el repositorio, hacer commit, push y publicar. El commit conserva
el historial remoto anterior y usa los workflows de calidad y Pages.
Estado verificable: GitHub Actions y docs/PUBLICACION.md.

Para desarrollo y Steam: conservar esta carpeta completa. releases contiene
las entregas generadas, local guarda perfiles, evidencia y recuperación y no se
publica. Steamworks, firma comercial, APK validado y backend real siguen pendientes.
Ver GROWTH_PLAN.md y docs/CRECIMIENTO_IMPLEMENTADO.md para los límites actuales.

Entregas actuales verificadas localmente:
- Windows portable actual: releases/DeadSingularity-V1-desktop-PKV1V7/win-unpacked/DeadSingularity.exe
- Web actual: releases/DeadSingularity-V1-web-B5tYTX
- Instalador anterior (no incluye cambios del 09/10): releases/DeadSingularity-V1-desktop-3oeDY4/DeadSingularity_V1_Setup_1.1.0-alpha.1.exe
- Respaldo anterior (preservado, no incluye esta pasada): local/archivo/actual/DeadSingularity-1.1.0-alpha.1-fuentes.zip

QA real de las dos plataformas pasó, incluida recarga de checkpoint a oleada 2
y fallback gráfico. Android anterior: 97 recursos verificados por SHA-256, no
regenerado en esta pasada PC. APK no compilado, integración Steam pendiente.
Evidencia resumida: docs/VALIDACION_CRECIMIENTO.md.

Estado gráficos/rendimiento 09/10: contador FPS opcional en Ajustes → Gráficos,
abajo derecha en PC; toggle, persistencia y posición verificados en Electron.
Economía escasa, fusión III, tienda y pulido de tres amenazas conservados/completados.
Grillas reutilizables, cache de tejido/fondo y cinco curvas Path2D implementados;
sin quitar efectos. Desafío opcional sólo en pausa; Tanque sin rediseño.
PENDIENTE: fluidez estable 120–165 FPS con solapamiento pesado. La prueba visible
de 30 s con 24 enemigos vivos dio ventanas 126–142 FPS y saltos hasta 48,5 ms.
La traza apunta a raster/flush Canvas/GPU; el ahorro de CPU no certifica fluidez.
Siguiente paso: optimizar raster de entidades con A/B GPU a igual densidad,
preservar animación/glows y comprobar equivalencia de imagen. Evidencia y comandos:
docs/PERFORMANCE_ECONOMY_PASS_2026-10-09.md. Sin commit, push ni publicación.
