# Criaturas élite pintadas — prototipo para revisión

Integración posterior autorizada: los tres diseños ya están en partida normal.
`dimensionBaselineRoster()` conserva únicamente Asesino/Fantasma/Goliat y marca
sus entidades para el renderer pintado. Comandante/Bastión/Centella quedan fuera
del roster activo; sus definiciones históricas no se borraron. Los cuerpos se
precargan antes del combate, con fallback previo si falla la carga. Cuchilla de
ataque y mecánicas intactas. Cap global diez; concurrencia específica y radios
físicos aún no modificados. Las notas de propuesta aislada debajo son históricas.
Cerrar/reabrir `ABRIR_V1.cmd` para ver la integración. No se publicaron Pages
ni se generaron ejecutables nuevos.

Integración verificada con 226 suites sin fallos, 149 recursos de entrega y
87 referencias intactas. La QA visual usa ahora el flag normal de la entidad,
sin activar el override de prototipo. Prueba Electron 1080p/high/full de ocho
segundos, diez enemigos constantes, movimiento, escopeta F3, explosiones y
ambiente reactivo: 163,37 FPS medios. Música/visualizador apagados. No es una
prueba de todas las habilidades ni un A/B idéntico a los informes anteriores;
no se afirma mejora porcentual ni 165 garantizados. Fuente:
`local/validation/overlap-performance/elite-integrated-ten-20261014.json`.

Estado vigente: el usuario aprobó los diseños y pidió retirar únicamente la
cuchilla/apertura incorporada de Asesino. Se retiró ese añadido del cuerpo,
la hoja nueva del renderer y el botón ilustrativo de la galería. El sprite
pintado original de Asesino no fue editado. Su VFX de cuchilla previo vuelve
a dibujarse exclusivamente en las fases de ataque existentes.
Fantasma tenue y Goliat conservados. Galería aislada; integración de roster,
límite específico e hitboxes sigue pendiente. El apartado de ajuste de cuchilla
incorporada de abajo documenta una versión descartada, no el estado actual.

## Ajuste posterior aprobado por el usuario

Los tres diseños pintados gustaron. Se pidió conservar Goliat, hacer Fantasma
menos sólido y dar a Asesino un cuerpo que permita desplegar su cuchilla.

Fantasma ahora usa una opacidad corporal de 54–66%, oscilando lentamente; los
ojos se dibujan con su opacidad heredada normal. Se modifica el único dibujo
pequeño del cuerpo, sin duplicarlo, sin blur ni filtros ni nubes adicionales.
La translucidez se multiplica por los estados de sigilo/materialización ya
existentes; la mecánica de posesión sigue intacta.

Asesino tiene una abertura incorporada entre las placas inferiores, preparada
al cargar, y una cuchilla metálica curva guardada en una superficie de 256×64.
Durante las fases reales de preparación/ejecución el VFX existente conserva
sus arcos rojos, orientación, alcance 105, duración y momento de daño; solamente
su dibujo genérico de hoja se sustituye por un único sprite de cuchilla.
Si el prototipo no está activo o no está listo, se usa la hoja anterior.
En la galería el botón «Mostrar despliegue de cuchilla» muestra el mecanismo
en un ciclo ilustrativo acotado para poder verlo; no simula daño ni afirma
representar el alcance físico del ataque a esa escala ampliada.

Goliat no recibió cambios: su futura animación para el stun de área queda
pendiente después de la integración visual. Núcleos y bosses conservados.

Verificación posterior: QA de ojos/movimiento/transparencia, cuchilla desplegada
y ruta de combate en reposo, windup y ejecución aprobada; suites de Asesino,
Fantasma (posesión/retune), Goliat e Hydra sin fallos; entrega 149 recursos y
87 referencias intactas. Misma escena de 24 en comparación aislada:
referencias 141,94 y 144,65 FPS, propuesta 147,28; raster medio 3,769 y 3,678 ms
frente a 3,507. Frame p95/p99 permanecen 12,10/12,20 ms. Esta comprobación no
certifica 165 ni mide una partida real. Fuentes: `elite-ghost-blade-20261014*`
en `local/validation/gpu-layer-audit/`; captura `blade.png` junto a `preview.png`.

El usuario rechazó el primer diseño procedimental simplificado. Solicitó diseñar
desde cero criaturas con la calidad gráfica de los núcleos, tomando únicamente
sus materiales, volumen, sombras y acabado; no repetir núcleos ni construcciones.
Se mantiene la prohibición de anatomía humanoide, brazos y patas.

## Entregable

`PROBAR_ELITES_REFINADOS.cmd` abre una galería animada aislada con Asesino,
Fantasma y Goliat, sus tres ojos siguiendo el cursor y tamaños de partida.
Vista web: `previews/refined-elites.html` servida desde el proyecto.
Hoja visible: `local/validation/refined-elites-20261014/preview.png`.
Los seis élites y sus límites del juego normal todavía no cambiaron. La galería
es el lugar para juzgar este diseño antes de adoptar otra propuesta rechazada.

Assets nuevos, producidos con la herramienta integrada de generación de imágenes
(no CLI/API externo), guardados sin modificar los núcleos:

- `assets/elite-creatures/asesino-painted-v1.png`: criatura cazadora afilada,
  caparazón quitinoso violeta y pliegues laterales curvos.
- `assets/elite-creatures/fantasma-painted-v1.png`: presencia espectral flotante,
  envoltura pálida, cavidad oscura y tres corrientes espectrales inferiores.
- `assets/elite-creatures/goliat-painted-v1.png`: criatura ancha acorazada,
  placas orgánicas pesadas y fisuras rosadas.

Las cavidades de ojos se solicitaron vacías: los tres ojos son añadidos por el
renderer para conservar seguimiento vivo. No son un dibujo fijo en la textura.

## Implementación y costo

`js/render/refinedElites.js` recorta transparencia y prepara una imagen corporal
pequeña por especie (máximo 400 px) y una lente reutilizable de 64 px. Esa
preparación ocurre una vez en la prueba. No descarga los sprites ni prepara
sus superficies durante la partida normal, mientras no se adopte el prototipo.

En cada cuadro: un dibujo del cuerpo, tres lentes pequeñas, pupilas y brillos
puntuales. La textura ya contiene sombras, material y luz. No se aplica blur,
gradientes, filtro de brillo ni reconstrucción de contornos corporales por cuadro.
Respiración, flotación, inclinación, parpadeo suave y dirección de pupilas se
actualizan con el reloj visual. Las poses y avisos de los ataques existentes
siguen a cargo del renderer original en la prueba de combate.

Se aplica un factor corporal 0,8 al nuevo diseño; sus proporciones son diferentes
a Hydra, por lo que no se afirma una reducción exacta del 20% en cada eje de la
silueta antigua. El tamaño y la hitbox deberán alinearse en la futura integración.
Por ahora la física y los radios de combate no se modificaron.

## Medición comparable

Escena con 24 enemigos del roster vigente, seis élites, calidad alta, 1080p,
escopeta F3, partículas, explosiones y ambiente reactivo. Solo se sustituyeron
los cuerpos de Asesino/Fantasma/Goliat. Misma simulación congelada por ejecución,
reloj visual animado. Cadencia sin tracing; raster medido en ventana posterior.

Primera pasada repetida: referencias 142,61 / 144,79 FPS; propuestas 147,44 /
147,29 FPS. Raster referencias 3,692 / 3,596 ms; propuestas 3,516 / 3,488 ms.

Confirmación con ojos más legibles:

| Variante | FPS medios | Frame p95/p99 ms | Raster media/p95/p99 ms |
|---|---:|---:|---:|
| Referencia inicial | 146,61 | 12,10 / 12,20 | 3,686 / 4,096 / 4,450 |
| Criaturas pintadas | 151,29 | 12,10 / 12,20 | 3,476 / 3,968 / 4,220 |
| Referencia final | 147,46 | 12,10 / 12,20 | 3,559 / 3,984 / 4,359 |

Ganancia moderada del cuadro completo, consistente frente a controles; no se
prometen 165 sostenidos ni eliminación de tirones. Estos son tiempos de
`RasterDecoderImpl::DoRasterCHROMIUM`, incluyen envío/esperas y no constituyen
un timer de hardware exclusivo. p95/p99 de cuadros no mejoraron en esta muestra.
El movimiento/combate real y la concurrencia reducida siguen por validar al
integrar: no se midió una partida humana ni todos los consumibles.

Informes/trazas: `local/validation/gpu-layer-audit/elite-painted-candidate-20261014*`
y `elite-painted-final-20261014*`. QA visual comprueba transparencia real (>50%
en los tres PNG), píxeles que cambian al mover el objetivo y al avanzar el
tiempo, transformación Canvas restaurada y datos de la criatura sin mutación.

## Prompts finales y referencias

Herramienta integrada, una llamada por criatura, alpha transparente. Referencias
de acabado exclusivamente: `core-cyan-rig-v3.png` y `core-magenta-body-v3.png`.
Dirección común aplicada: sprite terminado y pintado para roguelite espacial 2D,
perspectiva ortográfica ligeramente elevada, sombras y biseles de material,
contornos de ilustración seguros, formas legibles a tamaño de partida, cavidad
ocular vacía para añadir ojos por código. Sin fondo, suelo, texto, UI o partículas
decorativas; sin cubos, monumentos, humanoides, robots, brazos, patas o cráneos.

Asesino: depredador alienígena vivo tipo cefalópodo flotante; manto alargado
terminado en punta, dos crecimientos curvos cortos integrados en los flancos;
quitina y placas de carbón/violeta con unas pocas fisuras luminosas. Personalidad
de acecho y embestida. No convertirlo en un escudo geométrico ni una nave.

Fantasma: entidad espectral flotante no humanoide; envoltura hueca de material
perlado pálido, cara inferior en sombra y cavidad oval oscura; tres corrientes
espectrales curvas cortas que se deshilachan desde el contorno inferior. Unas
pocas costuras blanco/cian. Presencia de fase y posesión; no fantasma humano.

Goliat: bestia alienígena flotante, compacta y ancha, placas orgánicas pétreas
intercaladas y asimétricas; cavidad oscura para ojos, abertura respiratoria
formada por placas, peso sísmico. Carbón/ciruela con fisuras rosa restringidas
y reflejos pálidos en bordes. No una piedra arbitraria, máquina o pilar.

## Pendiente después de revisión visual

Adoptar o ajustar la apariencia según juicio del usuario. Después, integrar
roster de tres especies y límite específico de élites simultáneos, corregir
hitboxes al tamaño final y medir combate en movimiento. Luego Enjambrito y
Escopuras. Núcleos y bosses no fueron modificados. Sin commit ni push.
