# Perfil canónico y geometría independiente — 02-10-2026

Estado: implementación y QA terminados. Exclusivamente laboratorio; sin
integración ni aprobación de personajes nuevos para gameplay.

## 1. Laboratorio existente

Se extendió `dev/pilot-concepts/index.html` y `concepts.js`, la comparación ya
existente. No se creó otro laboratorio. Abrir el HTML en Edge/Chrome o usar
`http://localhost:8080/dev/pilot-concepts/index.html` si ese servidor sigue activo.
Después de actualizar los archivos, recargar la página que estuviera abierta.

## 2. Autoridad de la animación

La página llama al renderer real `NV.drawPlayer` de `js/render/player.js`,
con los datos reales de `js/data/gameData.js`. Un recorder Canvas exclusivo de
la página aplica el perfil previamente elegido, sin reemplazar dibujos, colores,
ojos, gotas, patrones internos o anillos. El juego no carga estos módulos.

La captura no podía recuperarse de la pestaña previa: el laboratorio anterior
no persistía sliders y el navegador del usuario no tenía endpoint de depuración.
Se detuvo la experimentación y se pidió el JSON real de `pilotConcept.state()`.
El usuario lo proporcionó; quedó conservado en `captured-runtime.json`. No se
dedujeron valores de los píxeles de la imagen ni se eligieron defaults nuevos.

## 3–4. Valores reales y exactos

Preset: `CANONICAL_ANIMATION_BASELINE`. Frame: `5211.637999999551`;
`paused: false`. El tiempo sigue siendo un frame fraccional; los pasos suman
1/6/60 sin redondearlo. Cargar la base restaura esa fase y reanuda, como la captura.

| Piloto | speed | amplitude | stability | micro | detailSpeed |
|---|---:|---:|---:|---:|---:|
| BOTI | 1 | 0.25 | 0.5 | 0.2 | 0.75 |
| NOVA | 0.22 | 0.8 | 0.55 | 0.3 | 0.85 |
| ROOK | 0.14 | 0.9 | 0.45 | 0.25 | 0.6 |
| ENJAMBRE | 0.18 | 0.85 | 0.5 | 0.3 | 0.72 |

Constantes internas preservadas en `canonical.environment`:

- Referencia del contorno: frame95; reloj60fps, pintado limitado a30fps,
  delta de reloj máximo100ms. Son los valores existentes, no un nuevo smoothing.
- Ruido: seed741 + índice de piloto×991; frame×8191; llamada RNG×131;
  capa×277; vértice×37; celda×71; hash con `0x45d9f3b`; smoothstep cúbico;
  frecuencia0.65; amplitud1.25, multiplicada por `micro`.
- Contorno nativo: `base + amplitude*(1-stability)*(moving-base) + microNoise`.
  Tiempo de contorno: `95+(frame-95)*speed`.
- Tiempo de detalles: `95+(frame-95)*detailSpeed`; bob/respiración al35%.
- Referencia con RNG reproducible; moving/details usan RNG neutral0.5.
  El original también es reproducible sólo en esta página. `Math.random`
  se restaura síncronamente con `finally` en cada captura.

`rendererContract` conserva además tasas y amplitudes de ondas, bob, gotas,
patrones, anillos y parámetros de cada capa/piloto. El renderer sin modificar
continúa siendo la autoridad de esas fórmulas, no una segunda implementación.
Sus hashes SHA256 normalizados a LF detectan modificaciones futuras:

- player.js: `7291d4d8b89323af894bcb38ac94e4fb21f0e386197af1052bfe8b6afafde158`.
- gameData.js: `4c8c3115ce14771b4f6f5827a0863d8b6287b9b536eaaf8b2e7d4b6f93ba89f8`.
- concepts.js anterior: `072194ba13ba16a29de364e8c1edbe2a21f790a39e694310fe0a905a8227a1b9`.

## 5–6. Almacenamiento y protección

`animation-presets.js` define el preset recursivamente congelado, independiente
del storage del navegador. Controles y «Guardar copia» quedan deshabilitados
cuando se usa la base; incluso eventos artificiales no pueden escribir sobre ella.
Cambiar piloto, geometría, vista o reloj no la sobrescribe.

«Duplicar preset» crea una copia editable. «Guardar copia» persiste sus cinco
parámetros por piloto bajo `neonVoidPilotLabCopiesV1`, sin tocar ajustes/partidas
del juego. «Exportar JSON» descarga el preset completo y las copias guardadas.
El límite es20 copias; entradas inválidas se ignoran. Si storage está bloqueado,
se avisa y la base de archivo sigue disponible. La descarga depende del navegador;
no fue necesario escribir nada en su perfil real ni en el directorio interno de ChatGPT.

## 7. Contrato geométrico

`geometry.js` es puro: no recibe tiempo, perfil, seeds ni velocidades.
`points()` genera sólo coordenadas base. `apply()` combina esa geometría con el
campo de desplazamiento del contorno nativo que ya existía:

`formaElegida(u) + [contornoCanónico(u,t) - referenciaOriginal(u)]`.

`u` identifica una posición material a lo largo del polígono. Al añadir vértices
se muestrea linealmente el MISMO campo poligonal; no se genera otra onda/ruido
por vértice ni se modifica la amplitud en función del radio nuevo. Por eso una
punta más larga cambia su posición base, no su velocidad, seed ni pulsación.
«Forma actual» conserva literalmente los comandos de la animación previa.

La geometría se selecciona por piloto y sólo afecta instrucciones moveTo/lineTo
de los cuerpos; todos los demás comandos Canvas permanecen intactos.
Cambiar forma no reinicia el frame. Cargar la base restaura animación/fase,
pero conserva la forma elegida porque ambos estados son independientes.
El contorno nativo sigue disponible para la verificación mediante la opción
interna `original`; el usuario pidió reemplazar su entrada del selector por un
diseño nuevo. La columna izquierda conserva el renderer original del juego.

## 8. Formas temporales

Última dirección aprobada: retomar la referencia radial compleja, puntiaguda y
entrelazada. Se rechazaron tanto la estrella de cinco puntas como el cristal
compacto de ocho facetas. El usuario autorizó explícitamente sustituir DOS
opciones: «Forma actual» y «Angular asimétrica».

- «Radial entrelazada» reemplaza «Forma actual» en el selector y es la opción
  inicial. Un contorno {12/5} conecta doce agujas mediante diagonales cruzadas;
  alterna seis puntas principales y seis secundarias, manteniendo el equilibrio
  radial. Tiene48 segmentos y recibe el mismo campo canónico por interpolación.
- «Angular asimétrica»: veinte puntas finas, principales/secundarias, ordenadas
  en diez sectores. Ocho sectores permanecen regulares; sólo dos alteran la
  longitud de sus puntas. Tiene40 segmentos, sin cambios en la animación.
- «Radial puntiaguda», «Estrella irregular» y «Picos largos y cortos» permanecen
  idénticas; comprobación por hashes geométricos. El contorno nativo también
  conserva su hash y sirve como baseline interno.

La referencia original se conserva íntegra en
`dev/pilot-concepts/references/four-radial-forms.png`, accesible desde el mismo
laboratorio. Es documentación visual, nunca un sprite del personaje. Los
personajes siguen siendo procedurales y conservan paleta, ojos y efectos.

Evidencia actual: `previews/pilot-radial-reference-2026-10-02/`.
Los directorios `pilot-angular-polish` y `pilot-angular-crystal` son intentos
rechazados y no deben tomarse como dirección de arte aprobada.

## 9. Prueba objetiva

ANTES del refactor se capturaron los comandos completos de los cuatro pilotos
con los valores recibidos en frame+0/+1/+6/+60/+300:20 muestras de referencia.
Oracle protegido: `previews/pilot-canonical-2026-10-02/commands-before.json`.
El capturador rechaza sobrescribirlo y rechaza usarlo con el lab ya refactorizado.

El navegador comprobó igualdad exacta de las20 muestras, incluidos estilos,
ojos, gotas, bob y anillos. Luego verificó24 combinaciones (5 formas y baseline×4 pilotos):
perfil idéntico, reloj intacto, comandos no geométricos idénticos y evolución
de los vértices igual al campo nativo, con tolerancia numérica1e-10 para restas
en coma flotante. No es sólo una comparación de sliders.

## 10. Archivos de esta tarea

- `dev/pilot-concepts/captured-runtime.json`: captura proporcionada.
- `dev/pilot-concepts/animation-presets.js`: base protegida y copias.
- `dev/pilot-concepts/geometry.js`: geometría pura.
- `dev/pilot-concepts/concepts.js`: combinación, controles y clock capturado.
- `dev/pilot-concepts/index.html`: UI de presets y formas, misma comparación.
- `tests/pilot_canonical_lab.js`: siete contratos automáticos.
- `dev/pilot-concepts/references/four-radial-forms.png`: referencia original intacta.
- `tools/verify_alpha.cjs`: QA canónico y oracle previo, flags de laboratorio.
- `README.md`, `docs/AI_START_HERE.md`, `PILOT_STABILITY_LAB_2026-10-02.md`
  y este informe: continuidad y autoridad del perfil elegido.
- `previews/pilot-canonical-2026-10-02/`: evidencia, capturas y logs.

## 11. Validaciones

- Node syntax checks de los tres módulos, test y harness:PASS.
- Test dirigido:7 contratos,0 fallos. Incluye storage bloqueado, entradas
  inválidas, base inmutable, copias persistentes y desplazamiento geométrico.
- `npm test`:159 suites,0 fallos.
- Edge headless, perfil temporal: archivo local Y servidor HTTP, sin errores JS.
- UI real: elegir piloto/forma, evento de slider sobre base, duplicar/editar/
  guardar/recargar copia, restaurar valores y fase exactos, pausa/reanudar,
  pasos, mediciones, capturas A/B. No se modificó el navegador del usuario.
- Layout:1280×1050,915×412,844×390 y390×844 sin overflow horizontal.
  Atlas de las cinco formas exportados e inspección visual de capturas.
- Producción:75 hashes de `js/`, `css/`, `assets/`, `desktop/`, index y
  lanzadores coinciden con el checkpoint anterior:0 archivos modificados.
- `git diff --check`:PASS; revisión de diff y estado local final.
  No se hizo commit, push, staging ni operación destructiva.

En el último rediseño radial, las capturas PNG de las tres formas conservadas
coinciden byte por byte con las anteriores. Los75 archivos de producción siguen
intactos;159 suites pasan. Evidencia actual: `pilot-radial-reference-2026-10-02/`
(archivo local en `report.json`, HTTP en `web/report.json`, suite en `npm-test.txt`).

Reportes del primer cierre: `file-validation/report.json` y `web-validation/report.json` dentro
de la carpeta de evidencia. Log completo: `npm-test.txt`. El modo
`--pilot-stability` reconoce el nuevo perfil protegido y usa el QA actualizado.

## 12. Alcance y siguiente prueba humana

Abrir el mismo lab, elegir piloto y «Forma base», observar animación continua,
comparar «Radial entrelazada» y «Angular asimétrica», luego duplicar/editar/guardar
una copia y cargar la base canónica.
La identidad y calidad artística final requieren tu valoración: no se diseñaron
personajes definitivos ni se añadió un editor de contornos libres en esta tarea.

Las pruebas son headless, no en un dispositivo físico. El recorder asigna arrays
a30fps y sigue siendo una herramienta de prototipado; no debe copiarse al loop
de gameplay sin una integración futura autorizada y verificación de rendimiento.
No se recompiló Electron: no hay cambios de producción que empaquetar. El juego
mantiene los personajes anteriores, sin cambios de mecánicas, balance o cámara.
