@echo off
setlocal
cd /d "%~dp0"
set "DSV1_RUNTIME=%~dp0local\runtime\windows\electron.exe"
if not exist "%DSV1_RUNTIME%" set "DSV1_RUNTIME=%~dp0node_modules\electron\dist\electron.exe"
if not exist "%DSV1_RUNTIME%" (
  echo Falta el runtime Electron. Ejecuta npm install desde esta carpeta.
  pause
  exit /b 1
)
set "ELECTRON_RUN_AS_NODE=1"
"%DSV1_RUNTIME%" "%~dp0tools\open.cjs"
if errorlevel 1 pause
