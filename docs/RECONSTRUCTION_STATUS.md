# Estado de reconstrucción

Actualización 07/10/2026: este documento describe la reescritura experimental
de src/, NO el juego completo activo. Por decisión del usuario, el juego completo
se preserva como migración independiente en index.html + css/js/assets. El objetivo
vigente es igual gráfica, sonora y jugablemente; no imponer una reescritura previa.
Ver ENTREGA_V1.md para pruebas y límites. Los pendientes históricos de src/ no
impiden jugar la entrega completa, pero siguen sin estar implementados en src/.

## Referencia histórica

El proyecto activo es DeadSingularity V1. El retiro y la recuperación ya se
realizaron; ver CONTINUIDAD.md. Las notas siguientes describen el laboratorio
experimental src/, no pendientes del juego de producción.

## Matriz inicial

| Bloque | Estado | Evidencia / pendiente |
| --- | --- | --- |
| Espacio V1, lanzadores, runtime separado | Terminado | Arranque Electron/web comprobado |
| Base Git y catálogo de nombres | Terminado | Commits locales; NAME_CATALOG.md; BRODY sin asignar |
| Referencia exacta | Terminado | 87 hashes contra manifiesto de build |
| Inventario de datos y archivos | Generado | REFERENCE_INVENTORY.json; revisar reglas dispersas en game.js |
| Movimiento normal y dash | Primer bloque implementado | check-motion.cjs compara perfiles, dirección, frenado, stamina, stun y boost |
| Posición forzada, gancho y posesión | Pendiente | Interacciones de IA y efectos externos |
| Modelo numérico de mundo/cámara | Implementado y comparado | check-world.cjs: 24 escenarios y 3192 comparaciones, DPR y conversions |
| Integración final de viewport/perímetro | Pendiente | Fondos productivos, fullscreen, orientación y cinemática |
| Entrada compartida, mando y móvil | Implementada en laboratorio | check-input: 12 secuencias/14985 comparaciones; falta hardware físico y resto de gameplay |
| Primer ciclo vertical mínimo | Implementado y probado | cycle.mjs/play.*; check-loop; Electron y HTTP Chromium: combate→tienda→compra→checkpoint→oleada 2 |
| Pilotos, geometría y habilidades | Pendiente | Cuatro perfiles; renombramiento por definir |
| Armas, proyectiles y colisiones | Parcial | Pistola con nivel, crítico, auto/manual; nueve armas, fusión y semánticas completas pendientes |
| Enemigos, élites y diez jefes | Parcial | Dron común: formación/aviso/avance/recuperación, separación, knockback y hit-slow comparados; fusiones, resto del roster y jefes pendientes |
| Spawns, oleadas, hazards y pickups | Pendiente | Director, llegada, láseres, objetivos y límites |
| Tienda, economía y progresión | Parcial | Compra HP/precio/cap, drops, combos, XP/nivel y premio de oleada; tienda completa/permanentes pendientes |
| Guardados e importación | Parcial | Checkpoint V1 versionado entre oleadas; guardado completo/meta pendientes, sin importar legacy |
| Audio, efectos y presentación | Pendiente | Inventario de soundtrack y efectos; legibilidad |
| Empaquetado y entrega final | Pendiente | Construir desde src; no desde reference |

## Derechos y dependencias

El proyecto se mantiene propietario (UNLICENSED); no se añade una licencia
pública al contenido del usuario. Esto no equivale a una certificación jurídica
de autoría de cada recurso. Revisar procedencia/avisos como parte del inventario.
Electron incluye Chromium, Node/V8 y otros componentes bajo sus avisos de
terceros. El runtime conserva LICENSE y LICENSES.chromium.html.
La referencia contiene una ruta experimental de Three.js; no se incorpora al
runtime nuevo. No hay otras bibliotecas de gameplay instaladas en V1.

## Próxima unidad

Fase E completada: pasiva boti, AI de formación/steering y knockback/hit-slow del
dron, combo/XP y transición de victoria. Contratos en VERTICAL_CONTRACT.md.
Próximo: director/llegadas, fusiones de drones y semántica de proyectiles de
este corte. Después ampliar contenido con verificaciones por bloque.
No se certifica paridad total del prototipo, ni se autoriza eliminar DeadSingularity.

## Verificaciones de esta unidad

- Entrada: 12 secuencias/14985 comparaciones de dirección/aim/política/zona muerta;
  contratos de pausa, portrait, acciones y releases.
- Ciclo mínimo: 30/60/144 Hz, 30 comparaciones de reglas; daño, bajas, drops,
  recogida, tienda, compra HP, continuación, guardado/carga y rechazo de inválidos.
- Entrega del ciclo: Electron nativo y HTTP local en Chromium QA con loop real;
  22 bajas, subida de nivel, compra HP 130→155, oleada 2 y carga. Capturas revisadas.
  Pendiente hardware físico Android/mando y navegador externo.

- Movimiento/dash: 36 secuencias de 600 frames, 151200 comparaciones contra las
  funciones de la referencia. Incluye cuatro perfiles, permanentes 0/5/10,
  30/60/144 Hz, inversión, frenado, boost, stun y agotamiento/recarga.
- Mundo/cámara: 24 configuraciones de tamaño/móvil/dynamicOff; centro, lados,
  esquinas, conversiones pantalla/mundo, resize y DPR, 3192 comparaciones.
- Electron V1: arranque del prototipo conservado y del laboratorio nuevo;
  movimiento, consumo de energía de dash y pausa comprobados con loop real.
- Web local: módulos ES servidos como text/javascript en el puerto 8091.
- Referencia: 87 archivos conservan sus hashes. La auditoría enumera 4 pilotos,
  10 armas, 13 tipos comunes, 8 élites, 10 jefes y 7 consumibles.

Estas verificaciones cierran modelos aislados y su laboratorio; no certifican
paridad de combate ni una reescritura completa. DeadSingularity sigue siendo necesario
como respaldo hasta la entrega final y la exportación del progreso relevante.

Fase E: check-slice agrega 147601 comparaciones de IA/impacto/XP/combos y
regeneración, más contratos de transición y checkpoint V1→V2. El bloque es
jugable en Electron y web local; el arte/audio siguen siendo de prueba.
