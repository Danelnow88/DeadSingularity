# DeadSingularity Android

Contenedor offline del mismo runtime web mediante WebViewAssetLoader.
Origen estable: https://appassets.androidplatform.net/assets/game/.
No solicita permiso de red ni expone un puente JavaScript nativo. Se conserva el
almacenamiento de WebView al actualizar el mismo applicationId; borrar los datos
de la app elimina ese progreso. El toque inicial desbloquea el audio.
Al pasar a segundo plano se pausa combate; el jugador reanuda expresamente.

Preparar assets desde la raiz: `npm run build:android:assets`.
Requisitos: JDK 17, Gradle 8.13, Android SDK 36. Abrir android/ en Android Studio,
o ejecutar `gradle -p android :app:assembleDebug` con esas herramientas instaladas.
Gradle/AGP y AndroidX estan fijados en los archivos de build.
La build release requiere la clave comercial del autor; no se crea ni publica
una identidad falsa.

En este equipo NO se encontraron JDK, Gradle, SDK ni dispositivo fisico.
Los assets se verifican por SHA-256; la compilacion Java/APK aun no esta comprobada.
Prueba pendiente en dispositivo: joystick, paisaje/retrato, safe areas, audio,
pausa/retorno, importar/exportar progreso y restauracion tras cerrar el proceso.
El selector de JSON usa Storage Access Framework. Exportar archivos Blob aun
requiere validar o implementar el transporte nativo de descarga.
No se presenta este proyecto como una entrega Android terminada.

Base oficial: [carga local](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content),
[AGP 8.13](https://developer.android.com/build/releases/agp-8-13-0-release-notes).

