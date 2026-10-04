# DARK V3 — dos bases aprobadas, dos evoluciones

El usuario aprobó B / Hyperdrive neón negro y C / Gravedad abisal.
Se conservaron exactamente sus notas, automatizaciones y tiempos durante el
ciclo completo: hashes deterministas de 110 segundos fijados en tests.

Se reemplazaron las otras dos tarjetas del laboratorio, no la música del juego:

- A: Hyperdrive reactor nocturno. Evolución industrial de B.
- B: Hyperdrive neón negro. DARK V2 sin cambios.
- C: Gravedad abisal. DARK V2 sin cambios.
- D: Gravedad singularidad. Evolución trap futurista de C.

A/D conservan base rítmica, suspenso y arreglo de 64 compases. Incorporan
respuestas melódicas alternadas, desplazamiento de motivos cada cuatro compases,
apertura progresiva del filtro, anticipaciones, entrada tonal en tres drops y
salto de octava en el clímax. Graves con articulación y filtro diferenciados.
No hay batería adicional ni subida de volumen para simular una mejora.
La superioridad artística depende de la escucha del usuario, no del test.

Abrir ABRIR_AUDIO_EXPERIMENTOS.cmd y refrescar; comparar A/B y C/D desde los
mismos segmentos. Copiar elección exporta musicRevision=dark-v3. Selecciones
antiguas Actual/Pulsar vuelven a B; las válidas B/C se conservan.
La referencia actual sigue accesible internamente para QA, no como tarjeta.
Los efectos de bajas y todo el audio de producción permanecen intactos.

Verificación: tests de referencia, conservación exacta B/C, cuatro arreglos
distintos, suspense/retorno, 808 alineado, reloj y presupuestos. Edge real con
13 renders (cinco músicas, cuatro bajas, cuatro mezclas densas), tres layouts,
mute/blur, selección y salto de compás sin errores. Niveles musicales dentro
de 1 dB RMS de referencia, no calibración LUFS. Máximo observado 12 voces
musicales en candidatos, 16 en mezcla densa; sin clipping en renders.
Evidencias en previews/audio-experiments/dark-v3.

Hashes de 75 archivos de producción, index y lanzador sin cambios.
No build Electron, commit ni push. Falta elegir ganadores para integrarlos.
