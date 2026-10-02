# NEON VOID — economía y curva (Etapa H)

## Diagnóstico

Nota de continuidad L4f (01-10-2026): el diagnóstico siguiente era para cuatro
jefes, no diez. Historia full-roster ahora paga `24 + 2 × oleada` por boss:
460 en total + 334 básicos de oleadas = 794, antes de drops/cofres/contratos.
Legacy/Infinito conservan el pago anterior. Precios y saldos no cambian.
Ver SYSTEMIC_L4F_2026-10-01.md; falta medir compras/saldo en runs completas.

Una expedición entrega al menos 334 fragmentos por completar oleadas y otros 450
por los cuatro bosses, antes de drops, contratos y bonus sin daño. Con precios
planos, el tramo final perdía decisiones porque casi todo era barato.

## Cambios

- Mejoras de run: conservan precio inicial y suben 4–5 fragmentos por nivel.
- Coste total de maximizar HP, agilidad, armadura y suerte: 742 fragmentos frente
  a 435 anteriores; ahora compite con el ingreso garantizado total.
- Fusión I/II/III: 15/23/31 fragmentos.
- Calibrar arsenal: disponible desde la parada tras oleada 10; cuesta `42 + 2 ×
  oleada` y eleva armas secundarias al 80% de la principal, con tope Nv80.
- Escuadras tácticas: una cada 4/3/2 reposiciones en Fácil/Normal/Difícil.

No se redujeron recompensas ni se quitaron compras ya existentes. El cambio crea
prioridades y un gasto tardío, pero conserva el arranque accesible.

## Verificación

- `tests/economy_curve_h.js`; suite completa 143/143.
- Preparación 2×2 legible en `previews/economy-h/04-preparacion.png`.
- Edge completo y Electron `pass: true`.
- Build: `releases/NEON-VOID-0.10.0-alpha-windows-odfolS`.

## Pendiente humano

Completar runs con uno, dos y tres estilos de arma para decidir si 742 exige una
especialización interesante o si el coste tardío resulta demasiado restrictivo.
