# Arquero: soga y tamaños aprobados

Kamikaze: tamaño visual ×1,10 (30,525 unidades). Espectro Arquero: ×1,15 (51,175 unidades). Sprites originales y radios físicos sin cambios. Juego y registro usan singularityFamily.

La soga se habilita desde la primera aparición del arquero (minWave 3 conservada). Sustituye al disparo normal. Preparación 0,55 s, velocidad 720, alcance 520; anticipación parcial de la velocidad del jugador con tope 80. La trayectoria queda fija al lanzar, sin persecución automática. La cabeza tiene 7 unidades de margen y colisión barrida entre fotogramas.

El agarre dura hasta 2 s y arrastra a 520 unidades/s hasta una separación segura (radios físicos +18, mínimo 50 unidades), sin atravesar ni tocar automáticamente al arquero. Cero daño directo, sin stun ni cambios a la invulnerabilidad. Hacen falta dos inicios de dash distintos: mantener pulsado uno solo no cuenta dos veces; durante el dash no hay tirón. Matar al arquero corta el vínculo. Dos placas de marfil comunican las trabas restantes; tras el primer dash queda una. Límite de seguridad de distancia 1200. Máximo de una soga global. Hasta tres perseguidores normales dentro de 240 unidades del destino ganan 10% de velocidad durante 0,9 s, sin aumentar daño, frecuencia de ataques ni cantidad de enemigos. La sinergia del Núcleo apunta al nuevo destino cercano y mantiene su aviso previo. Cooldown local: fácil 3,2 s, normal 2,4 s, difícil 2 s, conservando lockout global de 0,85 s. El refuerzo de composición desde oleada 15 sigue separado del desbloqueo de habilidad.

Identidad visual: funda índigo, filamento marfil, energía dorada y cabeza de dos placas curvas. Sin partículas ni desenfoques por fotograma. La tarjeta del registro reproduce preparación, vuelo y vínculo con el mismo renderizador.
