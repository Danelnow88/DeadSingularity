# Luz y cadencias de los nueve núcleos

Primera implementación de la referencia de iluminación ambiental coloreada de Cult of the Lamb: emisión desde el tejido del núcleo y derrame suave sobre las superficies cercanas. Se limita a los nueve enemigos de la familia marfil. No modifica fondos ni la iluminación global del campo de batalla.

Los sprites originales, sus colores, sus tamaños físicos y visuales y sus mecánicas permanecen iguales. La luz se superpone mediante mapas pequeños preparados a partir del tejido coloreado. No rellena las aberturas oscuras con un círculo sólido ni añade aros o estelas.

## Ajuste de visibilidad en combate

La revisión v2 intensifica la emisión y extiende la difusión fuera del contorno. Tres escalas de difusión se calculan al generar las texturas; durante la partida sigue dibujándose una sola capa adicional por enemigo iluminado. La difusión conserva el color propio y nace del tejido emisor, sin un aro uniforme. Las cadencias y los tiempos de ataque son los mismos.

## Lenguaje de señales

| Enemigo | Señal y significado | Tiempo real utilizado |
|---|---|---|
| Corredor · cian | Dos acentos rápidos; el segundo desemboca en luz sostenida durante la embestida. | Preparación existente de 0,26 s; estado de ataque real. |
| Tanque · naranja | Primero despliega el cañón durante 0,58 s sin luz; después emite un acento corto y una carga creciente durante los 0,32 s restantes; descarga breve al disparar. | Preparación de 0,9 s; primeros 0,16 s de recuperación. |
| Enjambrito · rosa | Una carga sostenida al quedar listo para la embestida colectiva; intensidad estable mientras avanza. | Últimos 0,22 s de formación y estado commit. En persecución simple no inventa una preparación. |
| Escopuras · lima | Tres acentos de intensidad creciente antes del disparo; descarga breve al salir. | Preparación de 0,6 s; primeros 0,14 s de recuperación. |
| Espíritu · blanco | Una carga creciente antes de desvanecerse; núcleo ausente mientras el cuerpo no está; destello al reaparecer y descenso suave. | Phase-out de 0,30 s; mark sin cuerpo; pulse de 0,12 s; recuperación existente. |
| Kamikaze · coral | Acentos crecientes de alarma que desembocan en luz sostenida al final de la mecha. | Mecha real de 0,8 s, únicamente cuando está armado. |
| Espectro Arquero · amarillo | Carga continua para la soga; luz al lanzar y menor intensidad al tensar. Sin disparo normal. | Preparación de 0,55 s y fases reales del sistema de soga desde la primera aparición del arquero. |
| Espectro Guardia · verde | Latido doble lento con una base sostenida: comunica protección activa, no una amenaza de disparo. | Solo cuando protege a un aliado vivo; ciclo visual de 2,4 s mientras esa condición existe. |
| Espectro Núcleo · violeta | Una carga continua, amplia y creciente; descenso breve tras colocar la zona. | Preparación real de 0,55 s y primeros 0,22 s de recuperación. No sustituye el aviso de la zona en el suelo. |

No se usan cambios a rojo para todos: cada especie conserva su color aprobado. En reposo no hay secuencias que anuncien ataques inexistentes. Los avisos existentes de habilidades, daños y estados permanecen en sus rutas. No se recuperan los halos decorativos de los élites ni la estela retirada del Enjambrito.

## Implementación y rendimiento

- `js/render/singularityCoreLight.js`: función pura que lee estados y tiempos del motor; no cambia entidades, temporizadores ni mecánicas.
- `js/render/singularityFamily.js`: una capa adicional de dibujo con composición aditiva (lighter) por núcleo encendido; ninguna lectura de píxeles, desenfoque, gradiente, filtro o sistema de partículas por fotograma.
- `assets/singularity-family/lighting/`: mapas RGBA de hasta 352 píxeles por lado, con emisión y difusión precalculadas. Se cargan una vez y funcionan también abriendo el catálogo mediante archivo local.
- Los modos con efectos pesados desactivados atenúan el derrame, conservando las señales. La preferencia de movimiento reducido transforma las secuencias rápidas en cargas suaves y sostenidas.
- La capa se puede desactivar con `NV.__singularityCoreLighting=false` para comparar costos; no es una opción nueva obligatoria en la interfaz del juego.

Los mapas ópticos son derivados procedurales de los sprites ya aprobados, no una regeneración artística de las criaturas. Si se reemplazan los sprites, también deben regenerarse sus mapas de emisión y respetarse sus límites de recorte.

## Revisión

La página `previews/enemy-core-lighting.html` muestra las nueve secuencias con los mismos renderizadores de producción. Sus actores son muestras aisladas de estados; no son una segunda IA ni alteran la partida. Sirve para comparar cadencias y tamaño real, además de revisar el resultado jugando.

La referencia de iluminación general sigue en `docs/art-direction/iluminacion-ambiental/README.md`. Esta primera etapa no implementa todavía iluminación global ni garantiza por sí sola reconocimiento inmediato en todas las situaciones de combate.
