# Validación de crecimiento — 08/10/2026

178 pruebas locales; cero fallos. QA real en escritorio y en la build web
bajo /DeadSingularity/: menú, controles, audio, pausa, guardado, recarga,
importación anterior, panel opcional y fallback gráfico.

Se completaron nueve escenarios por plataforma: tres repeticiones de cada
calidad, semilla 1337, 10 segundos cada escenario, 1280×720.
Son verificaciones automáticas cortas, no una prueba prolongada de 20 oleadas.

Mediana entre repeticiones del p95 de actualización/dibujo observado (ms):

| Versión | Calidad | Actualización | Dibujo |
| --- | --- | ---: | ---: |
| reference | high | 0.40 | 1.30 |
| reference | auto | 0.40 | 1.40 |
| reference | performance | 0.30 | 1.30 |
| desktop | high | 0.50 | 1.70 |
| desktop | auto | 0.40 | 1.60 |
| desktop | performance | 0.40 | 1.30 |
| web | high | 0.40 | 1.40 |
| web | auto | 0.40 | 1.80 |
| web | performance | 0.40 | 1.50 |

Los p95 corresponden a ventanas de 240 frames, no al percentil global.
La escena evoluciona con el tiempo y los sistemas gráficos; estas cifras orientan
regresiones, no demuestran una mejora x5 ni comparan GPU/FPS de pantalla.

- desktop: checkpoint recargado a oleada 2; importación anterior true. WebGPU activo, diferencia máxima 0 en 3686400 canales; pérdida y fallback comprobados.
- web: checkpoint recargado a oleada 2; importación anterior true. WebGPU activo, diferencia máxima 0 en 3686400 canales; pérdida y fallback comprobados.

Reportes y capturas originales en local/validation; logs en local/logs.
Android nativo y Steamworks no se validaron: ver CRECIMIENTO_IMPLEMENTADO.md.
