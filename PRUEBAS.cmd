@echo off
setlocal
cd /d "%~dp0"
echo DEADSINGULARITY - PRUEBAS
echo.
echo 1. Roster actual de enemigos
echo 2. Abrir carpeta de pruebas anteriores
echo 3. Salir
choice /c 123 /n /m "Elegir: "
if errorlevel 3 exit /b 0
if errorlevel 2 (
 start "" explorer.exe "%~dp0tools\launchers"
 exit /b 0
)
set "ELECTRON_RUN_AS_NODE="
set "DS_ROSTER_RUNTIME=%~dp0local\runtime\windows\electron.exe"
if not exist "%DS_ROSTER_RUNTIME%" set "DS_ROSTER_RUNTIME=%~dp0node_modules\electron\dist\electron.exe"
if not exist "%DS_ROSTER_RUNTIME%" (
 echo Falta Electron. Ejecuta npm install desde la carpeta del proyecto.
 pause
 exit /b 1
)
start "DEADSINGULARITY - Roster actual" "%DS_ROSTER_RUNTIME%" "%~dp0tools\preview-enemy-roster.cjs"
