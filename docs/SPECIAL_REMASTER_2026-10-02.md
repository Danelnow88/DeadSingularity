# Especiales — remaster visual (02-10-2026)

## Contratos registrados ANTES de editar

Código local autoritativo: engine/special, meteors, drones, bullets y game.js.
Fixture determinista guardado en previews/special-remaster-2026-10-02/contracts-before.json.
No se tocan IDs internos, estadísticas, colisiones ni arquitectura de cámara.

| Piloto | Contrato actual que se preserva |
|---|---|
| BOTI / meteor |12 entidades; spawn x30..W-30, y-20..-140; vy320..520, vx±35, radio9..16.40 daño normal, knockback150; boss30×.30=9 por impacto único. Desaparece al impactar o alcanzar H-20; no homing. Cooldown14+.5=14.5s. Sin invulnerabilidad propia. |
| NOVA / phase |3s de phase y de invuln; aura radio70 por centro de enemigo,40 DPS y acumulación raw. Boss dentro de110 (=70+40), DPS×.30=12. Detonación50% del acumulado; boss además×.30. Guard protection sigue aplicándose a normales. No stun/knockback. Cooldown7.5s. |
| ROOK / bulwark |3s de bulwark/invuln. Activación: enemigos a distancia<120 reciben stun≥1s y knockback260. Refleja sólo cuando la bala toca la hitbox existente: invierte velocidad×1.1, daño30, pierce1. No collider gigante. Cooldown12.5s. |
| ENJAMBRE / hivemind |6 entidades, órbita55, velocidad angular2.5, vida5s. Primeras cadencias.3+i×.1s, luego.8s; nearest AL JUGADOR dentro de300, boss incluido; sin blanco dispara radial. Proyectil500 unidades/s, daño15, boss×.35. Respeta MAX_BULLETS. Cooldown10.5s. Sin invulnerabilidad propia. |

Discrepancias preexistentes: HUD usa maxCd14/7/12/10 pero la activación añade.5s;
NOVA alcanza al boss por centro a110, no exactamente el radio70 de normales;
los meteoros siguen naciendo sobre el borde superior REAL, a veces fuera de
cámara. No se corrigen estas mecánicas en una tarea visual.

## Dirección artística

- NOVA: **Ignición Astral**, núcleo blanco incandescente, corona naranja, lenguas
  de plasma y filamentos vivos. Aura70 legible; ignición local sólo en contactos
  reales. Final: colapso y ruptura de corona, no fantasma.
- ROOK: **Bastión Astral**, seis paneles transparentes ámbar, aristas grandes y
  blanco/dorado, violeta secundario del cuerpo. Impacto sobre panel y rebote real.
- BOTI: **Lluvia Criocósmica**, condensación ascendente desde su cuerpo cian;
  cometas cristalinos, facetas blancas y colas frías. Impactos tipo fractura cristal.
- ENJAMBRE: **Núcleos Vivos**, seis fragmentos de su energía amarillo pálido/aqua;
  nacimiento, órbitas orgánicas, contracción al disparar y reabsorción al final.

## Cierre verificado

Implementación completada y conservada durante la recuperación de los cuerpos.
renderer dedicado:js/render/specialEffects.js; hooks cosméticos en special,
meteors,drones,bullets,fx y game; dispatch visual en player/projectiles; nombres,
iconos y etiquetas actualizados en gameData,metaSkillIcons,HUD y controles móviles.
No se cambió el sonido en esta tarea.

Fixture mecánico anterior/post idéntico:SHA256
450321ab21970e266c417b16fd8508baec8feb0177d8fff289ed0856cb51868c.
La suite actual conserva special_visual_remaster.js y pasa158 suites sin fallos.
Prueba dirigida incluye colisión real de meteoro, reflejo real de proyectil,
preservación de daño/velocidad/conteos, radio dinámico, cleanup y render mínimo.

Web:previews/special-remaster-2026-10-02/web-verified/report.json; posteriormente
revalidada al recuperar los cuerpos en previews/pilot-recovery-2026-10-02/web.
Electron real:previews/special-remaster-2026-10-02/electron/report.json (PASS).
Entregas:releases/NEON-VOID-0.10.0-alpha-web-vhwktw y windows-7a9PJk.
El lanzador apunta a7a9PJk; fuente y entrega coinciden tras normalizar CRLF.

Coste aislado de las especiales en Edge headless: p95≈.4ms full, .2ms reduced
y .2ms minimal. Son mediciones del renderer aislado, NO FPS del juego completo
ni garantía para hardware móvil real. Eventos cosméticos limitados a24, contactos
a4, cache de glow a8 texturas64². Reduced/minimal mantienen la lectura principal.

Pendiente humano: preferencia estética, claridad en una partida larga y rendimiento
en dispositivo real. Se mantienen las discrepancias mecánicas preexistentes
documentadas arriba. El rediseño corporal separado fue rechazado; no confundir
ese rechazo con una reversión de esta tarea de especiales.
