# NEON VOID 0.10.0-alpha

Fecha: 30 de septiembre de 2026. Entrega local, sin publicación externa.

## Archivos finales

- Lanzador: `JUGAR NEON VOID.cmd`, en la raíz del proyecto.
- Windows vigente: `releases/NEON-VOID-0.10.0-alpha-windows-CAosd2/NEON VOID.exe`.
- Web vigente: `releases/NEON-VOID-0.10.0-alpha-web-OPgork/index.html`.
- El ZIP anterior (`NEON-VOID-0.10.0-alpha-Windows.zip`) es una versión previa;
  no incluye la corrección de tienda y meteoritos.
- Cada entrega incluye un manifiesto SHA-256 de sus archivos.
- Resultado actual: **145 suites, 0 fallos**. Recorrido offline desde disco también
  completo, sin errores de runtime ni solicitudes externas. Evidencia adicional:
  `previews/alpha-verification-offline/report.json`.

La carpeta Windows vigente es la única build de desarrollo conservada; las builds
anteriores duplicadas se retiraron después de verificar su reemplazo.

### Corrección posterior a la prueba de tienda

- Preparación opcional en una ventana breve; tienda sin barra de scroll general.
- Desplegar recuperó su posición y tamaño; Guardar y salir se probó también
  en el ejecutable Windows. En modo `?fresh=1` se muestra Salir sin guardar.
- Cada meteorito de BOTI daña una sola vez al impactar; ya no repite daño por frame.
- Verificación actual: 145 suites sin fallos, recorrido de navegador y arranque/
  guardado del ejecutable Windows sin errores.

### Primer corte del plan maestro

- Los cuatro sectores tienen ahora una base visual propia, de coste acotado y sin
  alterar gameplay: Umbral, Fundición, Fractura y Corazón del Vacío.
- Fundición es el corte de referencia con estructuras industriales, calor y
  brasas; el Mutante dejó la estrella verde plana y usa membrana, núcleo, cámaras,
  venas y sensores propios, con cambio visible en fase 2.
- Los avisos tácticos largos ya no cubren la arena como un titular gigante.
- En `915x412` y `844x390`, el lobby muestra acciones y dificultad sin scrollbar
  nativa; la información completa del piloto sigue disponible en PILOTOS.
- Umbral ya no dibuja anillos, balizas ni figuras superpuestas: conserva únicamente
  el fondo, la grilla y el campo estelar.
- Dirección artística y presupuestos documentados en `VISUAL_BIBLE.md`. Evidencia
  de navegador en `previews/master-slice-verified/`; QA Windows en
  `desktop-qa.json` dentro de esa carpeta.

### Segundo corte del plan maestro — roles enemigos

- El Tanque común ya no se limita a perseguir: avisa una embestida de trayectoria
  fijada, carga una sola vez y expone una recuperación castigable.
- El élite base ahora es **Comandante** y potencia aliados cercanos; **Bastión**
  intercepta entre aliados y jugador con golpe avisado; **Centella** prepara una
  carga lineal esquivable. El contacto ordinario ya no sustituye sus ataques.
- Los cuatro roles tienen telegraphs y feedback propios sin alterar los stats de
  producción existentes. Evidencia visual, reporte Edge y QA Electron en
  `previews/enemy-role-rework/`.

### Tercer corte del plan maestro — director y fusiones

- El Dron mantiene un anillo, avisa su presión, sólo daña durante el cierre y se
  rearma; deja de ser un perseguidor genérico.
- Dos refills conservan la mezcla ponderada y el tercero usa una composición por
  función y tramo. No cambia densidad, presupuesto hostil ni desbloqueos.
- Las fusiones se llaman Enlazado, Inestable, Singularidad y Núcleo extremo;
  garantizan recompensa acotada. Desde nivel 2, concentrar 8% de su vida durante
  el aviso interrumpe el pulso y abre un cooldown largo.
- Evidencia Edge y Electron: `previews/enemy-director-c2/`.

### Etapa D1 — especiales de piloto

- La auditoría de diez armas y cuatro pilotos quedó en
  `docs/ARSENAL_PILOTS_AUDIT_2026-09-30.md`.
- Los drones de ENJAMBRE conservan su daño completo contra enemigos normales y
  aplican ×0,35 contra bosses. Su daño se registra como `special:hivemind`, nunca
  como progreso del arma equipada.
- Evidencia Edge y Electron: `previews/pilot-special-d1/`.

### Etapa D2 — identidad y medición de armas

- Combat Lab permite Fusión 0–3 y reporta ese estado sin tocar partidas normales.
- La matriz determinista nivel 25/Fusión 0–2 confirmó los pares de identidad.
- El Subfusil pasó de alcance 320 a 360: sigue siendo más corto que Pistola, pero
  ya no interrumpe toda la ráfaga cuando un jefe se desplaza lateralmente.
- Evidencia, mediciones y QA Electron: `previews/arsenal-d2/`.

### Etapa E — diez bosses

- Cada boss tiene armazón visual exclusivo y una fase 2 más intensa; Mutante
  conserva su núcleo orgánico y brotes propios.
- FANTASMA y APOCALIPSIS ya no desplazan parte peligrosa de su silueta fuera de
  la arena.
- Galería real: `previews/boss-e1/`. Matriz de balance: `previews/boss-e2/`.
- Decisiones y resultados: `docs/BOSS_ROSTER_AUDIT_2026-09-30.md`.

### Etapa F — sectores y arena

- Las entradas de sector comunican nombre y regla ambiental con texto breve.
- Fundición, Fractura y Corazón del Vacío agregan una amenaza propia, anunciada y
  esquivable; Umbral sigue limpio para enseñar el juego.
- Los protocolos no aparecen en bosses, transiciones ni eventos de oleada, y no
  persiguen al jugador ni aplican daño repetido.
- Evidencia y QA Electron: `previews/sector-f/`.

### Etapa G — identidad sonora

- Cada sector usa una firma procedural propia sin depender de archivos o red.
- El mixer, mute, controles por categoría, anti-fatiga, capa de boss y diez firmas
  de ataque se conservaron; los avisos ambientales tienen prioridad breve.
- Evidencia y QA Electron: `previews/audio-g/`.

### Etapa H — economía y dificultad

- Las compras repetidas escalan de precio; las fusiones cuestan 15/23/31.
- Desde la parada posterior al jefe 10, Calibrar arsenal permite sostener dos o
  tres armas viables sin regalar progreso durante toda la run.
- Fácil/Normal/Difícil alternan escuadras tácticas cada 4/3/2 reposiciones.
- Evidencia y QA Electron: `previews/economy-h/`.

## Qué cambió

### Partidas con objetivo

- Expedición de 20 oleadas, cuatro sectores y victoria con recompensa permanente.
- Tres rutas de cuatro jefes; el conjunto cubre los diez jefes. La ruta cambia al terminar una partida.
- Modo infinito separado, que conserva el ciclo de diez encuentros.
- Resumen con bajas, jefes, tiempo activo, contratos y arma con más bajas; récords e hitos locales.
- Recompensa por completar oleada y bonus de 8 fragmentos si no recibiste daño.

### Arsenal y decisiones

- Armas secundarias se sincronizan al 60% del avance del arma de mayor nivel, con piso máximo de nivel 40. No pierden niveles propios.
- Fusión II agrega una propiedad: penetración, empuje, área, alcance o búsqueda de rebotes según el arma.
- Escopeta conserva 12 perdigones y máximo de 8 impactos por descarga al jefe; su evolución mejora cobertura de grupos, no ese límite.
- Plasma conserva la corrección de doble impacto/splash contra jefe. Láser atraviesa escudos; francotirador conserva especialización contra élites.
- Ahora se puede fusionar el arma equipada directamente en la tienda.
- Una preparación por parada: reparar 40% de vida máxima, recuperar hasta 10 niveles del arma más atrasada o aceptar un contrato sin coste.
- Contrato de oleada: 3 bajas con cada una de 2 armas. Contrato de jefe: ganar recibiendo como máximo 2 golpes. Recompensa adicional: `30 + 2 × oleada`.
- Las oleadas de evento permiten elegir entre los cuatro eventos existentes desde la parada anterior.
- Compras protegidas contra doble clic sobre una tarjeta antigua. Guardado después de compras; slots de inventario mantienen el modelo compacto.

### Encuentros y legibilidad

- Ataques de producción en `bossEncounters.js`: aviso, puntería fijada, ejecución y descanso. No persiguen al jugador después del aviso.
- Jefe: ráfaga; Titán: artillería; Señor del Vacío: invocación y abanico; Guardián: anillo con hueco; Destructor: lanza cargada; Némesis: doble abanico; Coloso: bombas lentas; Fantasma: tríada/anillo; Mutante: esporas y brotes; Apocalipsis: abanico/anillo alternados.
- Sin aturdimiento aleatorio en esos nuevos patrones. Se conserva la colisión barrida justa de proyectiles hostiles.
- Reloj corregido: ya no suma 2,4 veces el tiempo de ataque en fase 2. La fase acelera sólo la recuperación y conserva la ventana de aviso.
- El Mutante no simula una división con un texto falso: es un núcleo con brotes verdes de tamaño/vida propios, bajo el presupuesto hostil.
- Vida del primer Jefe: 1440 en normal, como en la prueba anterior del usuario. Crecimiento posterior lineal moderado en lugar de cuadrático.
- Fusión enemiga de nivel 2+: pulso fijo de radio 65, aviso de 0,85 s, recarga de 4,5 s y daño máximo 22. Salir del círculo evita el daño.
- Daño de contacto de fusiones acotado a 45. Se conserva el presupuesto global de 30 hostiles y 7 pesados.

### Continuidad, audio y producto

- Checkpoint versionado al llegar a la tienda y antes de desplegar. Continuar comienza la siguiente oleada con el equipo preparado.
- Cerrar durante combate vuelve al último checkpoint; morir o completar expedición lo elimina. No se guarda la simulación a mitad de una oleada.
- Importación/exportación de progreso local, con validación y rechazo de formatos incompatibles. Una nueva partida pide confirmar si existe checkpoint.
- Música con progresión de ocho compases y variación de melodía; el drone ambiental usa reloj de audio, evitando generar uno por frame detenido en menú.
- Lenguaje suave activado por defecto; los insultos heredados sólo aparecen al desactivarlo. Opción de reducir flashes y sacudidas sin ocultar ataques.
- Manual integrado, fichas de función/evolución de armas y exportación de un informe de prueba.
- Lobby y tienda ajustados a pantallas bajas; los botones de desplegar y guardar no tapan productos.
- Entrega web offline y Windows autocontenida con Electron 44.5.0, renderer aislado, sin Node en la página y sin navegación externa.
- Build por lista permitida: no distribuye documentos personales, logs, laboratorio, tests ni archivos residuales del proyecto.

## Pruebas de esta entrega

- Suite completa: consultar el resultado final en `TESTING.md`; incluye reglas puras de expedición, economía, normalización, importación, diez patrones de jefe y evoluciones de armas.
- Navegador Edge real, perfil aislado: cuatro pilotos, manual, inicio, movimiento, pausa, fin de oleada, preparación mediante botón, contrato, selección de evento, guardar/salir, recarga y continuar.
- Muerte por un ataque real: borra checkpoint y acredita perfil una vez. Jefe final derrotado mediante disparo real: muestra victoria y vuelve al lobby.
- Para acelerar el ensayo de transiciones se inyectaron checkpoints de prueba y se bajó a 1 la vida del jefe final. Esto valida flujo, NO demuestra balance ni que una partida de 20 oleadas sea fácil de ganar.
- Mutante con fase 2 y tres brotes. Pantallas 1280×800, 900×520, 915×412 y 844×390; sin excepciones JavaScript ni solicitudes externas.
- Ejecutable Windows probado con render fuera de pantalla en perfil temporal: inicia en menú, entra en combate y avanza la simulación con Node inaccesible al renderer.
- Capturas y reporte: `previews/alpha-verification/`. Comandos reproducibles: `npm test`, `npm run verify:browser` (requiere servidor en 8123), `NEON VOID.exe --nv-qa` para QA oculto.

## No está terminado comercialmente

Esta es una **alpha jugable**, no una garantía de ausencia de bugs ni una certificación de calidad comercial. Quedan:

1. Balance humano de expediciones completas, dificultad y economía; medir duración/DPS por arma contra cada jefe.
2. Pruebas en otras GPU y equipos modestos; no se promete un mínimo de FPS en hardware no medido.
3. Dos mandos físicos, más idiomas y pruebas humanas de accesibilidad.
4. Mayor variedad de arenas/objetivos; los cuatro sectores organizan la partida, no son cuatro mapas nuevos.
5. Firma digital/instalador, revisión de marca/licencias, cápsulas finales y precio.
6. Steamworks, logros/Cloud opcionales, cuenta del editor, configuración y revisión de tienda/build. No se hizo ningún alta, pago o publicación.

La captura de música externa permanece opcional en navegador; en el contenedor Windows se deniegan permisos de captura. La banda sonora propia sí funciona.

## Qué probar ahora

Jugá una **Expedición, Normal**, con tu piloto favorito. Conseguí una segunda arma;
en una parada probá Entrenamiento o Contrato. Guardá y salí, luego Continuar.
Lo más útil para la siguiente iteración: ¿cambiar de arma sirve?, ¿qué jefe resulta
aburrido/injusto?, ¿sobra o falta dinero? Desde Récords podés guardar el informe.

## Referencias de publicación y seguridad

- [Distribución de Electron](https://www.electronjs.org/docs/latest/tutorial/distribution-overview).
- [Aislamiento y seguridad de Electron](https://www.electronjs.org/docs/latest/tutorial/security).
- [Revisión de tienda y build en Steamworks](https://partner.steamgames.com/doc/store/Review_Process).

No se creó ningún respaldo nuevo fuera de `JuegoDemo`. No se borraron cambios
previos, guardados del usuario ni archivos ajenos a esta intervención.
