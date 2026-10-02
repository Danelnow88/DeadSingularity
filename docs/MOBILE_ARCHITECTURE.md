# Arquitectura móvil

Este documento es el **contrato autoritativo de compatibilidad móvil**.

## Política de producción

La activación es:

```js
dynamicViewActive = isMobile && orientation === 'landscape' && !dynamicViewForcedOff;
```

- Móvil landscape activa Dynamic World View y Dynamic Arena automáticamente.
- `?dynamicView=1` sigue aceptado como alias compatible, pero no es necesario.
- `?dynamicView=0` fuerza el modo contain legacy exclusivamente como fallback de depuración.
- Desktop nunca activa la arena dinámica por defecto ni por `?dynamicView=1`.
- Móvil portrait conserva el overlay de orientación y métricas legacy.

## Reference world

```text
refW = 900
refH = 520
```

Estas métricas representan constantes de diseño y compatibilidad legacy. No son necesariamente los bounds runtime en móvil landscape.

## Desktop

```text
view = 900x520
arena = 1350x780
viewX = clamp(player.x - viewW/2, -28, 478)
viewY = clamp(player.y - viewH/2, -28, 288)
```

La presentación usa escala uniforme contain, sin stretch ni crop. Letterbox o pillarbox puede aparecer según el contenedor.

## Mobile landscape

La fórmula visible Stage 3 se conserva; foundation de cámara separa los bounds:

```js
viewH = 520;
viewW = Math.max(900, 520 * stageAspect);

arenaW = viewW * 1.5;
arenaH = viewH * 1.5;

// Padding exclusivamente visual, definido una sola vez en viewport.js.
P = viewport.cameraExteriorPadding; // 28
viewX = clamp(player.x - viewW/2, -P, arenaW - viewW + P);
viewY = clamp(player.y - viewH/2, -P, arenaH - viewH + P);
```

Consecuencias:

- el mundo llena el ancho físico disponible;
- no hay stretching;
- no hay cover cropping;
- no quedan gutters laterales del contain antiguo;
- la arena es 1.5× la vista en ambos ejes; sus bordes no son los de cámara;
- las proporciones en unidades de mundo permanecen consistentes;
- `screenToGame()` y `gameToScreen()` proyectan contra la vista dinámica.

Pulido del perímetro: el margen visual baja a28 y el nuevo material es común.
La caja CSS móvil, HUD y safe areas permanecen EXACTAMENTE como estaban;
eliminar aquí el inset de2px y borde1px variaba el aspecto y por tanto los bounds
de la arena dinámica. Se detectó y descartó esa modificación antes del cierre.
La corrección de margen muerto de ventana se aplica a escritorio/Electron.
Móvil conserva ese inset3px; eliminarlo sin alterar arena requiere otra decisión
de presentación, no introducir otra autoridad de métricas en este pulido.
El fallback contain y el overlay portrait también conservan su política.
Ver [informe de perímetro](PERIMETER_POLISH_2026-10-01.md).

## Mobile portrait

Portrait no activa Dynamic World View. Se mantienen `view=900x520` y
`arena=1350x780`; el overlay `#rotateOverlay` solicita orientación horizontal.
No sustituir esta política por otro gameplay portrait. Resize de Dynamic Arena
reconcilia entidades una vez, con reaviso si desplazó un peligro.

## Semántica de métricas

- Diseño/reference legacy: `NV.worldMetrics.refW/refH`.
- Renderer, cámara y región visible: `viewW/viewH/viewX/viewY`.
- Gameplay, clamps, spawns y culling: `arenaW/arenaH`.
- UI DOM móvil: coordenadas CSS del viewport físico y safe areas.

**La UI móvil es UI del viewport físico, no UI en coordenadas de mundo.** Joystick, botones, opciones, menús y tiendas no deben posicionarse usando `arenaW` o `viewW` salvo una necesidad visual explícita.

## Lobby responsive

El lobby usa una única estructura DOM y la misma fuente `NV.characterList()` en desktop y móvil.

- Desktop presenta cuatro cards espaciosas dentro del frame de referencia.
- Móvil landscape convierte el overlay de menú en layout físico de viewport completo.
- Header, roster y acciones son regiones estructurales separadas.
- Las cuatro cards permanecen simultáneamente visibles en los viewports objetivo normales.
- Las descripciones móviles muestran una jerarquía útil de hasta cuatro líneas; no se resuelve el espacio reduciendo todo globalmente.
- `JUGAR`, `MEJORAS PERMANENTES` y `AJUSTES` pertenecen al área de acciones compartida.

Añadir un personaje a `NV.CHARACTERS` y `CHARACTER_ORDER` lo incorpora al mismo renderer de lobby para ambas presentaciones. No crear arrays de personajes móviles.

## HUD físico móvil

- Top-left: información esencial de run desde el HUD DOM compartido.
- Top-center: combo Canvas cuando está activo.
- Top-right: única entrada `☰`.
- Bottom-left: joystick.
- Bottom-right: `USAR`, `SHIFT` y `ESPECIAL`.
- Bottom-center: chips DOM de arma y consumible.

El panel Canvas completo de arma/consumible se omite en móvil porque duplicaba los mismos datos y competía con `☰`. Desktop conserva el renderer Canvas completo.

## Contrato automático de compatibilidad móvil

### A. World feature

Ejemplos: enemigo, boss, proyectil, pickup, meteorito o VFX de mundo.

Comportamiento esperado:

- hereda automáticamente métricas de vista/arena mediante los sistemas existentes;
- usa `arena*` para bounds y `view*` para render/cámara;
- requiere **cero código de gameplay específico para móvil**.

Si una world feature necesita ramas por modelo de teléfono, la integración viola el contrato.

### B. Data feature

Ejemplos: definición de arma, consumible, enemigo, boss o artículo de tienda.

Comportamiento esperado:

- se declara en la fuente de datos existente;
- aparece automáticamente en UI data-driven donde el sistema lo soporte;
- puede requerir renderer, icono, audio o handler específico por ID, pero no una variante móvil de gameplay.

### C. UI feature

Ejemplos: widget HUD, minimapa, árbol de habilidades o panel nuevo.

Requisito:

- debe existir una decisión explícita para presentación desktop y móvil;
- debe definir propiedad por estado y coordenadas físicas en móvil;
- no debe crear estado de gameplay duplicado.

### D. Input feature

Ejemplos: nueva acción, tecla o gesto.

Requisito:

- debe mapearse primero a la abstracción lógica compartida;
- teclado, touch u otros dispositivos alimentan el mismo canal;
- la acción y su física se implementan una sola vez.

## Limitaciones de balance

La arquitectura dinámica no incluye compensación automática de dificultad:

1. una arena más ancha puede reducir la presión de enemigos;
2. la densidad aparente de spawns puede ser menor;
3. bosses usan mayormente amplitudes absolutas en unidades de mundo;
4. pickups y meteoritos pueden quedar más distribuidos.

No modificar tasas, cantidades, velocidades, daño, salud, rangos ni patrones durante trabajo de viewport salvo pedido explícito de balance.
