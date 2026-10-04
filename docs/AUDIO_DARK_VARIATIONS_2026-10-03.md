# Alternativas musicales DARK V2

## Alcance

Tres composiciones experimentales originales, más oscuras y futuristas,
con ritmo energético. No imitan una canción/artista ni usan samples externos.
La referencia actual y las cuatro opciones de bajas permanecen intactas.
No se integraron en la partida, Electron ni GitHub Pages: falta elección humana.

## Escuchar

Abrir `ABRIR_AUDIO_EXPERIMENTOS.cmd`; si ya estaba abierto, refrescar la página.
La etiqueta visible debe decir DARK V2. Elegir A, B o C y escuchar desde Inicio
o usar el selector para ir directamente a Suspenso, Drop, Mutación o Clímax.
Copiar elección incluye `musicRevision: dark-v2`, para distinguirla de V1.

- A / Pulsar nocturno: síncopas, motivos menores y respuestas cósmicas.
- B / Hyperdrive · neón negro: pulso industrial, ostinato y bajo insistente.
- C / Gravedad abisal: bajo áspero filtrado, metal corto y drops pesados.

Cada arreglo tiene 64 compases / aproximadamente 107 segundos a 144 BPM:
umbral oscuro, impulso, mutación, respiro activo, segundo drop, vacío tenso,
respuesta y clímax. Cambian motivos, progresiones, densidad, filtros y acentos;
no es sólo cambiar el volumen. Las cargas suspenden el kick medio compás y
resuelven al siguiente, sin cortar la reproducción ni mezclar dos baterías.

## Arquitectura y verificación

Se reutiliza el reloj, mixer, allocator y AudioContext reales. El wrapper de
laboratorio recupera pasos silenciosos del score base desde su reloj ya avanzado,
sin otro timer ni acumulador. Nada de esto se carga desde el juego.

Tests dirigidos: referencia exacta, ocho secciones, salto de compás, carga y
retorno, 808/bombo alineados, ausencia de kicks duplicados, presupuesto y mute.
QA Edge: tres tamaños, selección/copia, salto al suspenso, blur/mute y renders
completos de 110 segundos; además bajas y combate denso. Igualación RMS aproximada
frente a referencia, no LUFS ni garantía de idéntico volumen percibido.

Evidencias: `previews/audio-experiments/dark-v2/report.json`, WAVs y capturas.
`dark-v2-probe` es la medición previa a calibrar, no aprobación final de niveles.
Presupuesto: 14 voces musicales, 48 globales; sin modificar los límites del juego.

Resultado final: 164 suites sin fallos; once escenarios de audio y tres layouts
sin errores en Edge. Máximo observado: 12 voces en alternativas musicales y 16
en combate denso. Picos musicales 0.116 / 0.153 / 0.159; RMS aproximados
0.02015 / 0.02015 / 0.01980 frente a 0.02017 de referencia (master 0.65).
Hashes de los 75 archivos de producción, index y lanzador sin cambios respecto
al inicio de esta exploración. Syntax checks y `git diff --check` aprobados.

La evaluación artística sigue pendiente de escucha del usuario. Elegir ganadores
antes de integrar, empaquetar o publicar; no se hizo commit ni push.
