# L4f — patrones tardíos, composición y utilidad de compras

## Cambios implementados

- COLOSO: tres bombas paralelas desde tubos distintos / abanico abierto;
  fase dos abre cinco bombas. No dash ni explosiones de área invisibles.
- FANTASMA: seis orbes desde dos focos / onda radial con hueco desplazado.
- MUTANTE: garras dirigidas / esporas radiales con hueco desplazado; fase dos
  conserva tres brotes propios y aumenta carriles. No es división del jefe.
- APOCALIPSIS: tres baterías convergentes / corona radial; fase dos intensifica
  ambos. Miras y orígenes quedan fijados durante el aviso, sin homing ni stun.
- Sin HP/daño/cadencia global nuevos. Conservados caps, fases, recuperación y
  cancelación de ataque al cambiar de fase. Render usa los orígenes reales.
- Composición: desde oleada 3 incorpora Arquero/Peón desbloqueados; tramo medio
  combina Tanque/Guardia/Arquero. Reutiliza roles, caps y avisos existentes; no
  aumenta cantidad ni fuerza inmunidades/cambio de arma. No cambia oleada 1.
- Historia full-roster: recompensa fija del jefe `24 + 2 × oleada`. Diez jefes
  pagan 460 frente a 1.050 del escalado heredado; con las 20 oleadas el ingreso
  fijo básico pasa de 1.384 a 794, antes de drops, cofres, contratos y bonus sin
  daño. Las mejoras completas cuestan 742: compras vuelven a competir. Infinito,
  Lab y rutas legacy conservan `50 + 5 × oleada`. No se quita saldo existente.
- Poción con vida completa, Bomba sin blancos, Congelante sin enemigos activos
  e Imán sin botín nuevo conservan su carga y explican por qué. Buffs temporales
  pueden renovarse. La curación muestra HP realmente recuperado; tienda aclara
  Bomba 25% comunes/50% élites/8% jefe y Congelante no afecta bosses.

## Evidencia y límites

Suite 152/152. Edge integral: `previews/systemic-l4f-final`, sin errores ni red
externa, guardado, tienda, muerte, victoria, 10 entradas de Historia, oleada 3,
NO HUD, cuatro patrones tardíos en ambas fases y láseres 2/4/6 en tres tamaños.
Prueba consumible productivo: `previews/consumables-l4f`, poción conservada a HP
completo y una sola carga consumida al curar. Stress 19 escenarios × 600 frames
sin muestras sintéticas superiores a 16,7 ms; NO garantiza FPS en hardware real.

Medición completa, autoataque, Historia Normal, BOTI 120 HP, sin mejoras,
especiales ni consumibles; seed fijo, límite 60 s. Control small-step oscila
90 px horizontalmente, NO es un bot experto ni prueba de justicia completa:

| Jefe | Rifle Nv1 F0 quieto / pequeño movimiento | Rifle Nv10 F0 quieto / pequeño movimiento | Láser Nv25 F2 quieto / pequeño movimiento |
| --- | --- | --- | --- |
| NÉMESIS | Derrota 13,0 / 35,3 s | Derrota 13,0 / 40,8 s | Derrota 12,1 s / victoria 14,6 s, 50 HP |
| COLOSO | Derrota 11,5 / 16,4 s | Derrota 13,6 / 22,1 s | Derrota 11,2 / 16,3 s, jefe con 423 HP |

Reportes: `previews/nemesis-full-story/full-story-fights.json` y
`previews/coloso-full-story/full-story-fights.json`, errors:[]. Némesis con equipo
avanzado sigue permitiendo ganar moviéndose poco. Coloso exige otra evasión o
recursos, pero esas seis muestras NO demuestran que sea justo o imposible.
No nerfear un arma a partir de comparaciones que cambian arma/nivel/fusión.

## Próximo trabajo sin repetir estos cambios

1. Dos runs reales con compras; evaluar potencia alcanzable, diferencias entre
   armas, consumo/recompensa, especial y dificultad Fácil/Normal/Difícil.
2. Probar Coloso con evasión amplia, no sólo oscilación; completar matchups de
   Fantasma/Mutante/Apocalipsis. Fácil exige desafío para adolescentes/adultos;
   el hijo no es el público de balance (aclaración posterior explícita del usuario).
3. Auditar frecuencia efectiva de verbos y sinergias (no sólo existencia en
   código), prioridad de guardias/arquero/tanque y oportunidades de cambiar arma.
4. Afinar economía con saldo real, no sólo ingreso teórico; no obligar a comprar
   ni añadir compras infinitas. Sincronización de secundarias ya existe al 60%
   con tope Nv40; entrenamiento/calibración existen. No duplicar esos sistemas.
5. Duración/limpieza M2 sigue provisional; no se cambió aquí. HUD/arte/lore/audio
   necesitan devolución humana antes de reemplazo masivo. Publicación Steam,
   licencias/precio/hardware/mando real quedan fuera de validación automática.

Rutas de entrega y QA Electron: ver PENDIENTES_REALES_2026-10-01.md.

Archivos de implementación: js/engine/bossEncounters.js, boss.js, expedition.js,
consumables.js; js/data/balance.js, consumables.js; js/game.js. Tests actualizados:
tests/boss_encounters.js, economy_curve_h.js, enemy_director_c2.js,
consumables.js, combat_lab_lifecycle.js; tools/verify_alpha.cjs. No regresiones
pendientes en suite/runtime. Un fixture legacy necesitó declarar expeditionRun
y el test de poción se corrigió para esperar curación real, no +40 ficticios.
