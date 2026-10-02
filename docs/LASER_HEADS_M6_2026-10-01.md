# M6 / L4e — cabezales, rayos y Némesis

Sustituye la presentación de seis montajes fijos por grupos que se asoman y retiran.
Referencia humana: cono metálico, tres anillos y punta; geometría Canvas animada,
sin bitmap pesado ni dependencia externa. Grupo 2/4/6 en bordes superior/izquierdo/
derecho, posiciones alternadas fuera del HUD central y arsenal derecho alto.

Entrada 0,45 s -> carga 1,2 s -> rayos 2 s -> retirada 0,55 s -> descanso 4,2 s.
Fundición/Fractura, fuera de boss/evento/transición; Umbral limpio y pulso final
conservados. NO HUD oculta información, no estos avisos. Líneas rojas de 6 unidades,
núcleo blanco 1,5; sin zona rectangular ni cartel. Recintos temporales por peligro
de cruzar, NO pared física. Dash/invulnerabilidad/Escudo pueden servir para salir.

Colisión desde punta al borde opuesto, no cabezal ni brillo. Daño 16 y cooldown
compartido 0,65 s: una intersección no acumula seis golpes. Activación tiene un
frame visible previo al daño. Resize cancela/reavisa. Celdas mayores que el piloto.

Sonido agregado: dos osciladores por grupo, carga ascendente y zumbido activo,
bus sfxAmbient/master existentes. Gameplay informa fase; audio no dirige combate.
Libera voces en pausa, mute, ocultación, tienda/menú/muerte o retiro. Reanudar
reinicia sólo fase vigente. Escucha con parlantes/auriculares pendiente de humano.

Némesis alterna pinza de dos baterías (6 balas) y doble abanico central. Fase dos
amplía pinza a 10; cada origen fija su propia mira. Sin cambiar HP/daño/caps.
Prueba boss_encounters cubre ambas fases, orígenes y ejecución sin homing.

sector_laser_groups cubre 2/4/6, HUD, celdas, aviso, colisión y retiro.
audio_sector_music cubre voz acotada y cancelación; sector_encounters actualizado.
QA Edge dirigido: 1280×800, 915×412 y 844×390, todos los grupos, mute/pausa y NO HUD.
Es headless, no dispositivo ni apreciación sonora humana. Rutas finales constan
en PENDIENTES_REALES_2026-10-01.md al cerrar Electron.

Continúa COLOSO/FANTASMA/MUTANTE/APOCALIPSIS; también presión real con autoataque,
equipo alcanzable y utilidad de tienda. Némesis aún necesita medición completa.
La regla de duración/fin de oleada M2 permanece provisional, sin cambios aquí.
