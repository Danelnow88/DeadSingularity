# NEON VOID — auditoría de sectores (Etapa F)

## Resultado

Los cuatro sectores ya se distinguen por paleta, estructura de fondo, placa de
entrada y regla ambiental. Umbral queda deliberadamente libre de hazards. Los
tres protocolos posteriores cambian la ruta sin añadir entidades ambiguas:

| Sector | Oleadas | Protocolo | Contrajuego |
| --- | ---: | --- | --- |
| Umbral | 1–5 | Ninguno | Aprender movimiento, disparo y lectura global |
| Fundición | 6–10 | Venteo vertical | Cruzar antes del cierre o cambiar de columna |
| Fractura | 11–15 | Grieta horizontal | Subir o bajar fuera de la franja |
| Corazón del Vacío | 16–20 | Pulso anular | Entrar al centro o salir del anillo |

## Contrato de justicia

- aviso visible de 1,15 s y geometría inmóvil;
- estado activo de 0,65 s, seguido de recuperación visible;
- un único intento de daño por activación: 10/11/12 según sector;
- primera aparición a los 2,8 s y recarga de 6,4 s;
- nunca durante boss, transición o evento especial;
- el render no altera posición, hitbox ni estado de simulación.

## Evidencia

- Prueba dirigida: `tests/sector_encounters.js`.
- Capturador reproducible: `npm run capture:sectors`.
- Galería de aviso/activación y reportes: `previews/sector-f/`.
- Suite completa: 141 grupos, 0 fallos.
- QA navegador completo sin excepción ni red externa.
- QA Electron: `previews/sector-f/desktop-qa.json`, `pass: true`.
- Build verificada: `releases/NEON-VOID-0.10.0-alpha-windows-PjzAR1`.

## Pendiente posterior

La Etapa G debe dar a cada sector una identidad musical perceptible y comprobar
que el aviso sonoro ambiental sobreviva a armas continuas sin aumentar fatiga.
