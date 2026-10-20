# Espectros cósmicos V2 · laboratorio animado · 15/10/2026

Estado: diseños aprobados para avanzar, rigs y gestos en laboratorio, NO integrados
en la partida. Abrir PROBAR_ESPECTROS_ANIMADOS.cmd. No reemplaza el comparador
PROBAR_ESPECTROS_COSMICOS.cmd. Ambos dejan el perfil/guardados del usuario intactos.

## Cómo revisar

- «IA real»: tres enemigos juntos con NV.updateEnemies y el hook actual a oleada 20.
- «Inspección»: sostener reposo, preparación/protección, ejecución o recuperación.
  Estas vistas ilustran estados; no son una simulación de combate inventada.
- Pausa, articulación, cursor/guía automática y reinicio de escena.
- «Avisos gestuales» frente a avisos externos de referencia.
- Arriba: cada rig ampliado; abajo: 112/124/118 px de referencia 1080p, sin zoom
  compensatorio. El disco celeste es un objetivo guía, no un nuevo jugador.

La escena real usa el mismo límite de arena (keepInsideArena), actualiza el pull
con NV.applyHookPull y las zonas con NV.updateSpeakerMines. El visor recibe el
rectángulo visible REAL del laboratorio: el viewport del menú del iframe oculto
no corresponde a esta arena. Se conserva el algoritmo de seguridad de cámara.
El objetivo guía es inmortal para inspección; las balas ordinarias se trasladan
visualmente y retiran al salir/contactar, sin simular una partida completa.

## Animaciones y señales

### Arquero

Mirada al objetivo, giro suave hacia él, respiración y párpado. Compresión corporal
cuando su hook real entra en windup; contracción del iris y flexión del órgano
interno del arpón, distensión al lanzar/tensar. También lee spitState/intent para
su preparación y disparo ordinarios. Hook windup de BALANCE.HOOK_WINDUP_TIME
(0,55 s), sin mover el snapshot: el motor sigue fijando objetivo al FINAL de la
preparación como antes.

Se conserva la silueta del arco entera: la primera división en bandas horizontales
se descartó porque podía producir cortes al deformar las cuchillas. Rig final:
placa completa + recorte elíptico del órgano interno + ojo/párpado adheridos.

En la comparación gestual no se dibuja la línea/arco/núcleo externos de preparación
del hook. El proyectil y el vínculo/tether se dibujan con NV.drawHookEffects igual
que el juego. No se cambió ni retiró el sistema de avisos en producción.

### Guardia

No se inventó otro ataque ni un windup falso: su mecánica es proteger/interponerse.
Respiración, ojos que siguen, ceño/párpados y apertura de pliegues laterales con
ensanchamiento del cuerpo cuando guardProtectionActive está vigente y el aliado
sigue vivo. Los ojos pertenecen a la pieza central, no se deslizan sobre un sprite.

La vista gestual evita la línea larga fuente-aliado, pero mantiene las marcas
sobre el aliado: el gesto del Guardia solo no identifica QUÉ enemigo está protegido.
La vista externa añade una línea de referencia; no pretende identidad píxel a píxel
con el telegraph privado del renderer viejo. No se toca reducción de daño ni radio.

### Núcleo

Tres ojos adheridos a sus lóbulos, respiración y párpados. Durante coreZoneState
windup los lóbulos se abren sutilmente y la abertura interna se dilata; descarga
corta al entrar en recuperación, usando SPECTER_CORE_ZONE.windup/cooldown reales.
Se conserva completamente la zona del suelo mediante NV.drawHazards: arming,
radio y actividad no pueden sustituirse por un gesto localizado en el cuerpo.
El anillo externo del atacante se recrea como referencia comparativa, pero se
omite en la vista gestual. No se cambió la mira del Espíritu ni ningún otro enemigo.

## Assets y preparación

Se usó la habilidad imagegen con la herramienta integrada (no CLI) solamente para
preparar estos tres archivos nuevos; originales aprobados intactos:

- previews/concepts/spectral-cosmic-v2/archer-eyes-clean-v1.png
- previews/concepts/spectral-cosmic-v2/guard-eyes-clean-v1.png
- previews/concepts/spectral-cosmic-v2/core-eyes-clean-v1.png

Las imágenes *-synth-v2.png siguen siendo la autoridad del cuerpo. El rig compone
la placa limpia SOLO dentro de las máscaras de los ojos, conserva todo lo demás,
y prepara piezas/iris/párpados una sola vez. Los ojos heredan el transform de su
pieza para no perder anclaje en la animación. No se agregaron nuevos miembros.

Prompt común; COUNT=ONE para archer, TWO para guard y THREE para core:

Use case: precise-object-edit. Edit target: approved transparent 2D cosmic creature. Produce an animation clean plate, not a redesign. ONLY remove the COUNT dark pupils and colored irises from INSIDE the existing eyeballs, filling those small inner regions with matching pale silver-gray veined sclera. Keep every eyeball globe, socket, eyelid, expression, exact eye position/size and surrounding fold unchanged. Do not erase eyes. Preserve all silhouette, body, colored star veins, folds, central aperture, pose, scale and transparent margins. Keep EXACT source canvas 1312x1199. No new details, no backdrop, no text. This image will be sampled ONLY inside existing eye masks, not used to replace the approved body.

## Costo y QA

Rig previews/spectral-cosmic-rig.js: 2/3/3 piezas; 1/2/3 ojos; abertura adicional
cacheada para Núcleo. Reposo sin blink: 3/5/7 drawImage; con párpados hasta 4/7/10.
Derivados RGBA compartidos ~2,02 MiB entre las tres especies (no incluye imágenes
fuente decodificadas/cachés internas del navegador). Sin filtros, blur, partículas,
lecturas de píxeles, RNG ni texturas nuevas por cuadro. No se promete ahorro de GPU
ni 165 FPS: falta comparar el costo completo antes de promover esta tanda.

Electron: tools/preview-spectral-animated.cjs --capture verifica IA real:
windup/projectile/tether, protección activa y zonas creadas, además de mirada,
movimiento, gestos, pureza de entidades, transform balanceado, controles y pausa.
Capturas de 5 estados y qa.json: local/validation/spectral-cosmic-animated-20261015/.
Test: tests/spectral_cosmic_animation.js comprueba cachés acotadas, piezas/ojos,
tamaños, pose derivada de estado y ausencia de integración en index.html.

Siguiente: valoración de animaciones/avisos; si se aprueban, adaptar el dispatch de
producción preservando capas de estado/ataque y validar ahí las señales y el costo.

