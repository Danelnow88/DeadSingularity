# L5 — público adulto y separación de dificultades

El usuario aclara que su hijo probó el juego para demostrar que era trivial,
NO porque el público de balance sean niños de cuatro años. Target: adolescentes
y adultos. Fácil requiere desafío; Normal más presión; Difícil dominio y derrotas
frecuentes, conservando telegraphs y rutas esquivables. Autoataque es la referencia.
La aclaración ya consta en plan maestro, pendientes y documento histórico del niño.

## Cambios de combate

- Fácil: aviso ×1,18 (antes ×1,28), recuperación ×1,10 (antes ×1,25), aviso
  anti-espera 1,10 s (antes 1,25). Conserva más lectura que Normal, no asistencia.
- Normal: tiempos unchanged. Némesis ajusta la apertura de la pinza según
  distancia al iniciar aviso: `atan2(42,distancia)`, limitada a 0,12–0,32 rad.
  Se anuncian todas las miras; no predice movimiento ni sigue al piloto.
- Difícil: aviso ×0,82, recuperación ×0,72, aviso anti-espera 0,75 s. Usa
  variantes avanzadas de carriles desde fase uno; en fase dos agrega al menos
  dos capas desde las mismas miras fijadas. No duplica invocación de esbirros.
- Escuadras tácticas se materializan juntas: grupo en el cuadrante que deja más
  distancia al piloto, miembros a 60–85 px para que Guardia/Arquero/Tanque puedan
  cooperar. Mantiene aviso/nube, ocupación, caps y spawns libres aleatorios.
  Sin teletransportar activos, enemigos nuevos ni IA con coordinación perfecta.
- No se aumenta HP/daño global, no se alteran límites de balas/entidades, dinero,
  duración de oleadas, equipo, guardados, arena, audio ni arte. Las ventanas de
  fase y recuperación siguen cancelando casts. Difícil puede ser muy exigente,
  pero no se promete una tasa de derrota sin playtests completos humanos.

## Medición reproducible y honesta

Historia Normal ya tiene Némesis/Coloso en SYSTEMIC_L4F_2026-10-01.md. Nueva
comparación Némesis, Historia Fácil oleada 12, BOTI 120 HP, misma semilla, mismo
Nv25/F2 por arma, autoataque, sin compras/consumibles/especial y oscilación de
90 px (no jugador experto). Un solo caso por build NO establece tasa de victoria.

| Arma | Antes | Después |
| --- | --- | --- |
| Subfusil | Derrota 24,7 s | Victoria 30,6 s, 2 HP |
| Rifle | Victoria 22,1 s, 53 HP | Victoria 18,7 s, 72 HP |
| Láser | Victoria 12,2 s, 93 HP | Victoria 11,8 s, 86 HP |

Reportes: previews/easy-adult-before y easy-adult-after/full-story-fights.json.
Conclusión: la pinza acotada conserva la geometría y cambia los matchups, pero
NO demuestra mayor desafío en Fácil; algunas builds aún ganan moviéndose poco.
No afirmar problema resuelto ni usarlo para nerfear todas las armas. Próximo:
equipo habitual alcanzable, más seeds, evasión amplia y oportunidades reales de
usar arsenal/consumibles. Medición Difícil en previews/hard-adult-after.

Difícil, mismo Nv25/F2 y controlador: Subfusil derrota 25,0 s; Rifle derrota
20,5 s; Láser victoria 17,8 s, 39 HP. Difícil presiona más, pero ese último caso
también gana con poca movilidad: no afirmar que ya exige dominio ni que todo
el desafío está resuelto. Faltan varias seeds y equipo/compras de runs reales.

## Pruebas y continuidad

Suite 152/152. boss_encounters añade carriles avanzados en Difícil y dos capas
fijadas en fase dos de los diez bosses, ejecución bajo cap y una sola invocación.
Edge dirigido prueba los diez bosses × Fácil/Difícil: windup, transición, capas,
ejecución y cero excepciones. Evidencia: previews/difficulty-adult-l5.
Regresión Normal/láseres: previews/difficulty-adult-normal-regression.
Edge integral y Electron finales: previews/adult-l5-integral. Electron pass:true,
saved:true, playing y errors:[]. Guardia protege realmente al Arquero después
del aviso en el test de escuadras. Tres módulos coinciden por hash en Windows/Web.
Windows publicado: releases/NEON-VOID-0.10.0-alpha-windows-6fhn6g.
Web publicado: releases/NEON-VOID-0.10.0-alpha-web-GHamSZ.
Lanzador actualizado tras QA, versión Dy7Xpi anterior preservada.
No son pruebas de diversión ni de hardware real. Pendientes y continuidad:
PENDIENTES_REALES_2026-10-01.md. No dar Fácil por equilibrado con estos resultados.

Archivos: js/engine/bossEncounters.js, enemies.js, js/game.js;
tests/boss_encounters.js, enemy_director_c2.js, tools/verify_alpha.cjs;
documentos de criterio. Sin otros rebalanceos ocultos.
