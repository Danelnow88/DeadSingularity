# Deployment

## Destinos

- Repositorio: <https://github.com/Danelnow88/JuegoDemo.git>
- Rama de producción: `master`
- GitHub Pages: <https://danelnow88.github.io/JuegoDemo/>
- Servidor local: `tools/serve.js`

El proyecto es estático y no tiene build de producción. GitHub Pages sirve los archivos publicados desde la rama configurada.

## Flujo normal

1. Revisar estado:

   ```bash
   git status --short --branch
   ```

2. Ejecutar syntax checks, pruebas dirigidas y `npm test` según [TESTING.md](TESTING.md).
3. Revisar el diff y hacer staging selectivo únicamente de archivos intencionales:

   ```bash
   git diff
   git add <archivos-intencionales>
   git diff --cached
   ```

4. Crear un commit nuevo:

   ```bash
   git commit -m "Descripción del cambio"
   ```

5. Publicar normalmente:

   ```bash
   git push origin master
   ```

6. Actualizar referencias remotas y comparar commits:

   ```bash
   git fetch origin
   git rev-parse HEAD
   git rev-parse origin/master
   ```

   Los hashes deben ser idénticos.

7. Verificar que GitHub Pages se actualizó realmente: comprobar respuesta HTTP, assets publicados y comportamiento de la funcionalidad modificada. La propagación puede no ser instantánea.

## Reglas de seguridad

### Paridad con la entrega Electron (02-10-2026)

La entrega activa es `NEON-VOID-0.10.0-alpha-windows-mh6vEs`.
Se compararon por HTTP sus 73 archivos `js/`, `css/` y `assets/` contra Pages:
todos coincidían (normalizando únicamente los finales de línea de texto).
El HTML público conservaba dos bloques opcionales de 3D experimental que la
build quitaba. Se retiraron de la entrada principal; ahora el HTML fuente también
coincide con el empaquetado. Esto no modifica el Canvas2D ni el balance.

GitHub Pages debe servir los 74 archivos del juego de esa entrega, no el EXE
ni las DLL de Electron. Verificar también el HTML y todos los recursos, no sólo
un archivo de pilotos. `previews/pages-electron-parity/` contiene la auditoría
local ignorada por Git. Guardados y preferencias del navegador y de Electron
son independientes; no borrar almacenamiento para intentar igualar imágenes.
Para comparar apariencia, usar dimensiones, stage y calidad gráfica equivalentes.

- No usar force push en un deploy normal.
- No usar `--amend` para este flujo; crear un commit nuevo.
- No stagear logs, salidas de pruebas, probes o diagnósticos locales.
- No desplegar si aparece una regresión nueva.
- No asumir que `git push` exitoso garantiza que Pages ya sirve el commit nuevo.
- No documentar una IP LAN como arquitectura permanente: depende del entorno local.

## Servidor local

```bash
node tools/serve.js
node tools/serve.js 8081
```

El primer comando usa el puerto `8080`; el segundo muestra cómo elegir otro puerto. Para pruebas desde un teléfono se usa la dirección de red vigente del equipo, sin registrarla como valor fijo del proyecto.
