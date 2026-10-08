# Accesos con icono - 08/10/2026

Abrir desde la carpeta del proyecto:

- `ABRIR V1.lnk`: juego de escritorio, mediante `ABRIR_V1.cmd`.
- `ABRIR V1 WEB.lnk`: navegador y servidor local, mediante `ABRIR_V1_WEB.cmd`.

Los archivos CMD se conservan como lanzadores. Windows les asigna un icono
generico; el icono personalizado se configura en los accesos LNK y apunta a
`assets/brand/icon.ico`. Ambos accesos usan la carpeta V1 como directorio de trabajo.

Se probaron los dos accesos nuevos: ventana `DEAD SINGULARITY · V1` y health
del servidor HTTP 8091 con root `C:\Users\party\Desktop\DeadSingularity V1`.
Se verificaron destino, icono y directorio de trabajo de cada acceso, y que el
ICO es legible. No se modifico gameplay, sonido, recursos ni progreso.

Los LNK contienen rutas absolutas locales: si se mueve la carpeta, hay que
recrearlos. El instalador genera sus propios accesos para la ubicacion instalada.
La entrega y sus comprobaciones completas se describen en `CIERRE_V1.md`.
La firma comercial continua pendiente de un certificado real; estos accesos
no alteran ni requieren firma del instalador. No se hizo commit ni push.
