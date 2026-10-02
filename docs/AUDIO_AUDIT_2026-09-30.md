# NEON VOID — auditoría de audio (Etapa G)

## Conservado

- Mixer con buses independientes para música, armas, UI, jugador, enemigos y ambiente.
- Mute reversible, volúmenes persistentes y ducking autónomo.
- Anti-fatiga de armas rápidas, música propia de menú/tienda y capa de boss.
- Diez firmas de ataque de boss y feedback específico de combate/economía.

## Reconstruido

La música normal dejó de ser una única secuencia compartida. Cada sector define
armonía, bajo, melodía, batería, timbres, tempo, intervalo y octava del drone:

| Sector | Carácter |
| --- | --- |
| Umbral | pulso synthwave legible y estable |
| Fundición | ritmo más industrial, cuadrado y metálico |
| Fractura | compás quebrado, timbres cristalinos y silencios |
| Corazón del Vacío | grave, rápido, respiración corta y motivo descendente |

El cambio usa `NV.getWave()` y se aplica en el siguiente paso del secuenciador;
no corta voces activas ni crea loops paralelos. Los hazards sectoriales hacen un
duck corto y emiten dos tonos por el bus ambiental.

## Verificación

- `tests/audio_sector_music.js` y todas las regresiones de audio.
- Suite completa: 142 grupos, 0 fallos.
- Edge: flujo completo sin excepción ni petición externa.
- Electron: `previews/audio-g/desktop-qa.json`, `pass: true`.
- Build: `releases/NEON-VOID-0.10.0-alpha-windows-6h8Ji2`.

## Validación humana pendiente

Escuchar una expedición completa con auriculares y parlantes modestos para decidir
si Fundición cansa, Fractura queda demasiado vacía o Corazón necesita menos agudos.
Es una calibración perceptual; no bloquea la estabilidad técnica del corte.
