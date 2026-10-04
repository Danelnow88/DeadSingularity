# Investigación: NEON VOID con representación 3D

Fecha: 2 de octubre de 2026. Alcance: investigación sobre el checkout local; no se implementó una versión 3D ni se modificó el juego.

El pedido es conservar mecánicas, lógica, identidad visual y movimiento dinámico, llevando su representación a 3D. Los errores de una versión inicial serían pendientes por corregir, no permiso para cambiar el concepto artístico.

## Dictamen y supuesto pendiente

La arquitectura permite plantear una remasterización con modelos y entorno tridimensionales que reutilice la simulación actual. Es viable técnicamente; la fidelidad visual y el rendimiento aún necesitan demostrarse con un prototipo.

Hipótesis provisional, pendiente de la preferencia del usuario: movimiento sobre una arena plana dentro de un espacio 3D, con cámara elevada. Las coordenadas actuales `(x, y)` podrían representarse como `(x, alturaVisual, y)`; la altura decorativa no participa en el combate. Esto permite conservar velocidades, aceleración, frenado, dash, alcances y colisiones. La vista cambiaría la percepción del desplazamiento.

Si el usuario quiere ascender y descender libremente, será necesario definir puntería, colisiones, áreas de efecto, persecución y patrones en tres ejes. Esa variante excede una remasterización exclusivamente visual. No se da por elegida ninguna cámara definitiva.

## Evidencia del proyecto

| Área | Hallazgo verificado | Consecuencia |
| --- | --- | --- |
| Mecánicas | `js/engine/`, `js/data/` y el coordinador `js/game.js` comparten entidades y reglas. | Reutilizar sus autoridades; evitar una copia de gameplay para 3D. |
| Movimiento | `js/engine/movement.js` opera sobre posiciones y velocidades de dos componentes; incluye aceleración, frenado y dash. | Puede conservarse con la arena plana. |
| Desplazamiento forzado | `js/game.js` ordena dash, movimiento, hook y límites de arena. | Mantener el orden, incluso si la animación cambia de soporte. |
| Pilotos | `pilotGeometry.js`, `pilotAppearance.js` y `pilotAnimationBaseline.js` separan formas aprobadas y parámetros de animación. | Existe una referencia matemática para reconstruir contornos y deformación. |
| Enemigos | `render/enemies.js` y `render/spectralEnemies2D.js` dibujan cuerpos, ojos, apéndices y avisos con Canvas. | Su traducción requiere trabajo por familia y por estado de ataque. |
| Presentación | `draw()` en `js/game.js` compone cámara, mundo, efectos y HUD. | La separación de lógica y render es parcial: hace falta un punto de integración explícito. |
| Experimento anterior | `espectroLite.js` usa `PlaneGeometry`, shader y sprites; el puente conserva Three.js 0.160.0 y está desactivado por defecto. | No constituye un juego 3D ni modelos volumétricos del plantel actual. |

Se inspeccionó el atlas `previews/pilot-production-2026-10-02/web/pilots-approved.png` como referencia guardada, junto con el código actual. No se ejecutó una revisión visual de una partida nueva.

## Correspondencia artística exigida

- BOTI: radial entrelazada; NOVA: radial puntiaguda; ROOK: picos largos y cortos; ENJAMBRE: angular asimétrica. Conservar proporciones, paleta, ojos, capas, órbitas y configuración canónica de movimiento.
- Traducir cuerpos a volumen y trasladar la deformación actual a geometría o materiales animados. El espesor y las caras antes invisibles requieren decisiones artísticas: el dibujo 2D no determina un volumen único.
- Cada enemigo conserva silueta reconocible, ojos, apéndices, ritmo corporal, orientación y comportamiento. Registrar reposo, desplazamiento, preparación, ataque, impacto y muerte antes de reconstruirlos.
- Mantener los orígenes, trayectorias y tiempos reales de proyectiles, ondas, láseres, hook, especiales y aparición. La animación observa el estado del motor; no decide cuándo ocurre el daño.
- Preservar rojo para amenaza, amarillo para aturdimiento y blanco para impacto, junto con las formas que distinguen ataques.
- Conservar los escenarios cósmicos y la sensación de flotación. La superficie lógica de combate no obliga a introducir un suelo visible.

Una extrusión uniforme de todos los dibujos podría servir como diagnóstico geométrico, pero no acredita por sí sola la correspondencia conceptual solicitada. La aceptación requiere revisar escenas animadas al tamaño real de combate.

## Integración propuesta

Mantener un solo avance de la simulación y presentar ese mismo estado mediante Canvas2D o un renderer 3D. El adaptador visual leería entidades, fase, temporizadores, geometrías de ataque y métricas existentes. Sus mallas y efectos tendrían su propio ciclo de creación, reutilización y limpieza, sin mutar combate ni guardados.

Three.js es un candidato razonable para conservar el proyecto web y su contenedor Electron. Como punto de partida propongo cámara ortográfica elevada: mantiene el tamaño de los objetos al variar su distancia a cámara. Aun así, la inclinación comprime visualmente un eje y puede producir ocultaciones; deben compararse varios ángulos y el área visible de arena. Esta recomendación se apoya en la [documentación oficial de OrthographicCamera](https://threejs.org/docs/pages/OrthographicCamera.html).

La entrada necesita transformar el cursor al plano de combate y expresar correctamente las direcciones respecto a la cámara. [Raycaster](https://threejs.org/docs/pages/Raycaster.html) permite construir la selección desde cámara; se usaría para entrada, conservando las colisiones del motor actual. HUD, menús, audio y progresión pueden conservar sus sistemas con los ajustes de presentación necesarios.

## Riesgos que hay que comprobar

1. Visibilidad: cuerpos volumétricos no deben esconder proyectiles, huecos seguros ni avisos. Conservar reglas no garantiza conservar dificultad percibida si cambia la información visible.
2. Transparencia y brillo: los cuerpos energéticos superpuestos necesitan ordenar sus capas y limitar saturación. El [manual de transparencia de Three.js](https://threejs.org/manual/pages/transparency.html) explica limitaciones de ordenación de objetos y triángulos.
3. Azar compartido: hay usos de `Math.random()` en dibujo espectral y sacudidas, y también en gameplay. Cambiar llamadas de dibujo puede alterar secuencias aleatorias posteriores. Auditar rutas activas y separar azar cosmético del de combate antes de exigir repeticiones idénticas.
4. Tiempo: conviven animaciones basadas en `frame`, `dt` y tiempo de presentación. Definir una correspondencia explícita para no acelerar pulsaciones ni cambiar señales al variar FPS.
5. Rendimiento: medir combate denso, jefes, partículas y transparencias en Web, Electron y móvil. Reducir detalle decorativo si hace falta; conservar entidades funcionales y señales de peligro. No hay mediciones 3D disponibles todavía.
6. Distribución: incorporar dependencias y recursos localmente para las entregas offline. El import antiguo desde CDN no resuelve ese requisito.

## Primera prueba que permitiría decidir

1. Crear una escena de comparación separada con un piloto, un enemigo común, un espectral y un ataque anunciado. Usar las referencias actuales y el mismo estado/tiempo para ambas vistas.
2. Verificar primero volumen, silueta, ojos, deformaciones, flotación y señal de ataque. Incluir movimiento y especial; una imagen estática no basta.
3. Conectar una arena jugable al mismo motor: movimiento, dash, disparo, daño, colisiones, muerte y pausa. Comparar posiciones, HP, temporizadores, ataques y resultados con entradas controladas y azar aislado.
4. Ampliar a familias restantes, diez jefes, cuatro pilotos, cuatro escenarios, armas y efectos; medir rendimiento y revisar el flujo de partida completo.

La escena inicial sería una prueba de viabilidad y fidelidad, no la remasterización terminada. No se propone modificar balance para compensar problemas de cámara o modelos.

## Verificación de esta investigación

Se ejecutaron cuatro pruebas existentes: `controlled_movement` (23 casos), `pilot_production_appearance` (32 muestras exactas), `hook_pull_contracts` (31 aserciones) y `specter_threejs_integration` (14 casos). Todas pasaron. Acreditan contratos de la base actual, no una conversión 3D.

El primer intento de Node falló al resolver la ruta por `EPERM`; se ejecutaron correctamente con `node --preserve-symlinks-main`. El Node disponible es 20.18.0, inferior al 22.12 requerido por el proyecto; estos resultados puntuales no validan el entorno de build. No se ejecutó la suite completa ni se generaron entregas.

Había modificaciones locales previas, especialmente de audio y sus integraciones. Se preservaron. La única incorporación de esta investigación es este documento.
