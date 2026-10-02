# NEON VOID — baseline del plan maestro

Fecha: 30 de septiembre de 2026. Esta auditoría describe el checkout local; no
reemplaza pruebas humanas de balance.

## Estado verificable

- Suite: 145 grupos, 0 fallos.
- Navegador aislado: lobby, combate, tienda, checkpoint, Mutante, muerte,
  victoria y viewports `900x520`, `915x412`, `844x390` sin excepciones.
- Build vigente: `NEON-VOID-0.10.0-alpha-windows-CAosd2`.
- El árbol de trabajo contiene muchos cambios de la alpha y archivos sin seguir;
  deben preservarse. No se parte de un checkout limpio.

## Matriz de sistemas

| Sistema | Estado | Evidencia | Pendiente principal |
| --- | --- | --- | --- |
| Loop de expedición | Completo alpha | 20 oleadas, sectores, victoria, infinito | Balance humano completo |
| Guardado | Completo alpha | Guardar/salir, continuar, import/export | Migraciones futuras |
| Armas | Avanzado | 10 roles y evoluciones; pares D2 medidos; Subfusil corregido | Balance humano durante runs completas |
| Progresión de armas | Avanzado | Nivel/fusión, atribución causal y sincronización secundaria verificadas | Curva humana de run completa |
| Bosses | Avanzado | 10 pruebas, armazones únicos, fases visibles y matriz de 30 escenarios | Balance humano de partidas completas |
| Enemigos básicos | Avanzado | Dron forma y presiona; Tanque embiste; Runner, Wisp, Kamikaze, ranged y shield tienen conducta propia | Balance humano y lectura en densidad alta |
| Espectros | Avanzado | Grunt, Archer, Guard, Core y sinergias | Integrarlos mejor en composiciones |
| Élites | Avanzado | Comandante apoya, Bastión intercepta y Centella carga; Predator, Phantom y Goliath conservan sistemas propios | Balance humano y composición entre roles |
| Fusión enemiga | Avanzado | Hitos con nombre, recompensa garantizada y pulso interrumpible desde nivel 2 | Balance humano de umbral/recompensa |
| Economía | Avanzado | Precios progresivos, contratos, cuatro preparaciones y calibración tardía | Balance humano de runs completas |
| Sectores | Avanzado | Cuatro fondos, entradas y tres protocolos ambientales con contrajuego | Identidad musical propia y balance humano |
| Arte de combate | Desparejo | Pilotos/espectros detallados | Fondo genérico y bosses con silueta similar |
| Audio | Avanzado | Mixer, categorías, cuatro identidades sectoriales, capa boss y firmas de combate | Prueba perceptual humana en parlantes modestos |
| UI | Avanzado | Lobby/HUD/tienda responsive, tutorial, texto grande y controles unificados | Prueba humana de legibilidad |
| Rendimiento | Verificado local | Presupuestos, LOD, 19 stress y métricas Electron | Otras GPU/equipos modestos |
| Producto | Candidata alpha | Web/Windows offline, marca, manifiestos y avisos | Firma, revisión legal y Steamworks |

## Hallazgos visuales del baseline

1. La primera oleada presenta demasiado espacio oscuro sin identidad de sector.
2. Los cuatro sectores comparten esencialmente el mismo campo estelar y grilla.
3. El Mutante se lee como una estrella verde plana y sobredimensionada; su núcleo,
   biología y relación con los brotes no se perciben como una criatura coherente.
4. En `915x412`, el lobby muestra una barra de scroll nativa muy visible y la zona
   de dificultad queda parcialmente cortada.
5. El HUD comunica datos, pero todavía no hereda color o material del sector.

Capturas: `previews/master-baseline/`.

## Inventario táctico de enemigos

| Tipo | Verbo actual | Rol | Evaluación |
| --- | --- | --- | --- |
| Dron | Formar, avisar, cerrar y rearmarse | Presión básica y corte de ruta | Identidad implementada; falta balance humano |
| Corredor | Flanquear y comprometerse | Cortar ruta | Identidad clara |
| Tanque | Avisar, fijar trayectoria, embestir y recuperarse | Romper posición | Identidad implementada; falta balance humano |
| Escudo | Interceptar/protegerse | Negar proyectiles | Identidad clara |
| Enjambito | Coordinarse en grupo | Cercar | Identidad clara |
| Escopuras | Mantener distancia/disparar | Zona y stun | Identidad clara |
| Espíritu | Marcar, desaparecer y pulsar | Forzar movimiento | Identidad clara |
| Kamikaze | Armarse/explotar | Prioridad urgente | Identidad clara |
| Espectro Peón | Cargar con aviso | Romper posición | Identidad clara |
| Espectro Arquero | Rango/enganche | Fijar y habilitar sinergia | Identidad clara |
| Espectro Guardia | Escoltar/proteger | Protección | Identidad clara |
| Espectro Núcleo | Zona/sinergia | Amplificador | Identidad clara |
| Comandante/Bastión/Centella | Apoyar/interceptar/cargar | Sinergia, protección y ejecución | Identidad implementada; falta balance humano |
| Predator/Phantom/Goliath | Cazar/poseer/golpe sísmico | Amenaza especializada | Identidad clara |

## Primer corte vertical elegido

**Fundición + Mutante**, sin modificar balance:

- sistema decorativo de identidad por sector con coste visual acotado;
- Fundición con luz industrial, estructuras y brasas;
- Mutante con cuerpo orgánico, núcleo, membranas y ojos propios;
- fase 2 visualmente distinta y conectada con sus tres brotes;
- eliminación de la barra de scroll visible del lobby móvil;
- pruebas de pureza del render y verificación real de navegador.

Este corte valida la dirección visual antes de propagarla a los otros nueve bosses
y a todas las arenas.

## Cierre del primer corte

- Suite completa: `135/135` grupos.
- Navegador real: flujo completo, Mutante fase 2 y viewports `900x520`, `915x412`
  y `844x390`, sin errores ni red externa.
- Windows: `NEON-VOID-0.10.0-alpha-windows-vsytxJ`, con inicio, checkpoint,
  aislamiento del renderer y simulación verificados.
- Web offline: `NEON-VOID-0.10.0-alpha-web-nHNG8j`.
- Corrección posterior: se eliminaron los arcos cortados y toda figura decorativa
  propia de Umbral; una regresión impide reintroducir anillos o símbolos.
- Segundo corte seguro cerrado: Tanque, Comandante, Bastión y Centella poseen
  verbo, aviso, ejecución, recuperación y contrajuego propios. Suite `136/136`,
  escena real de Combat Lab y QA Windows sin errores en
  `previews/enemy-role-rework/`.
- Tercer corte seguro cerrado: Dron en formación, escuadras funcionales cada tres
  refills y fusión con hitos, interrupción y recompensa. Suite `137/137`, navegador
  y QA Windows en `previews/enemy-director-c2/`.
- Etapa D cerrada con matriz real nivel 25, Fusión 0/2, especiales acotados y
  Subfusil corregido. Evidencia: `previews/arsenal-d2/`.
- D1 cerrado: auditoría en `docs/ARSENAL_PILOTS_AUDIT_2026-09-30.md`; drones de
  ENJAMBRE mantienen daño normal y aplican ×0,35 a bosses con telemetría propia.
  Suite `138/138`, Edge y Electron en `previews/pilot-special-d1/`.
- D2 cerrado: Combat Lab con fusión, medidor determinista y alcance del Subfusil
  320 → 360. Suite `139/139`, Edge y Electron en `previews/arsenal-d2/`.
- Etapa E cerrada: diez armazones, fases intensificadas, margen visible y matriz
  pobre/media/fuerte. Suite `140/140`, Edge y Electron en `previews/boss-e2/`.
- Etapa F cerrada: sectores 2–4 suman amenazas ambientales anunciadas, fijas y
  excluyentes con eventos/bosses. Suite `141/141`, Edge, galería y Electron en
  `previews/sector-f/`.
- Etapa G cerrada: cuatro firmas musicales sectoriales dentro del sintetizador,
  prioridad de avisos y mixer previo conservado. Suite `142/142`, Edge y Electron
  en `previews/audio-g/`.
- Etapa H cerrada: costes progresivos, calibración de secundarias y cadencia de
  composiciones por dificultad. Suite `143/143`, Edge y Electron en
  `previews/economy-h/`.
- Etapa I cerrada: tutorial reactivo, mando estándar, movimiento analógico y texto
  grande. Suite `144/144`, Edge y Electron en `previews/ux-i/`.
- Etapa J cerrada: stress, diagnóstico Electron, marca y builds finales. Suite
  `145/145`, Edge y Electron en `previews/release-j-final/`.
