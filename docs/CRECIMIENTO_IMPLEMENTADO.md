# Crecimiento implementado — 08/10/2026

Versión 1.1.0-alpha.1. Se implementaron bases de los seis hitos, con estos límites:

| Hito | Implementado | Pendiente para cerrar el alcance completo |
| --- | --- | --- |
| 1 | Inventario de módulos, facades, bus acotado e inmutable, medición de fases, carga opcional de contenido/GPU | Seguir extrayendo responsabilidades del coordinador; no se promete mejora de inicio o memoria |
| 2 | Catálogo versionado de siete grupos, validación CLI, IDs y límites; datos originales iguales a referencia | Ampliar comportamientos registrados cuando haga falta nuevo contenido |
| 3 | 178 pruebas locales, QA real web/escritorio, manifiestos y workflows de calidad/Pages preparados | Ejecutar CI remoto y comprobar publicación después de autorización |
| 4 | Paquetes JSON limitados, panel opcional, ejemplo arma/enemigo, guardados con identidad de catálogo | Scripts externos excluidos de esta primera API |
| 5 | Contenedor Android de origen estable y recursos compartidos; compositor WebGPU opcional con comparación de píxeles y fallback por pérdida | Compilar APK con SDK/JDK/Gradle, validar teléfono; WebGPU aún compone Canvas2D, no sustituye todo el renderer |
| 6 | Adaptador local/stub, timeouts, reintentos, rollback, firma Ed25519 con clave confiable, consentimiento y conflicto de guardados | Elegir/conectar proveedor, autenticación y claves de producción |

La referencia original permanece intacta. El catálogo conserva los valores de
combate y los siete grupos originales; el paquete de ejemplo se instala a elección.
La calidad gráfica no modifica la simulación. No se demostró una mejora x5.

Evidencia local: local/validation/*growth*.json y PNG; logs en local/logs.
Los escenarios automáticos son cortos y repetidos, a semilla fija y 1280×720.
No equivalen a una partida humana de 20 oleadas ni a medir batería/FPS de teléfono.
El guardado/recarga incluye un checkpoint controlado y compatibilidad de importación.

Para Steam falta integrar Steamworks con el producto y credenciales del autor,
y validar la distribución final. La app Windows es una base jugable, no una
publicación en Steam. Los respaldos y perfiles se mantienen fuera de Git.
