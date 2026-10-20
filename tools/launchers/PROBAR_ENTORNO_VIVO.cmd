@echo off
setlocal
cd /d "%~dp0..\..\"
set "ELECTRON_RUN_AS_NODE="
set "DSV1_RESPONSE_RUNTIME=%~dp0..\..\local\runtime\windows\electron.exe"
if not exist "%DSV1_RESPONSE_RUNTIME%" set "DSV1_RESPONSE_RUNTIME=%~dp0..\..\node_modules\electron\dist\electron.exe"
if not exist "%DSV1_RESPONSE_RUNTIME%" (
  echo Falta el runtime Electron. Ejecuta npm install desde esta carpeta.
  pause
  exit /b 1
)
start "DEADSINGULARITY - entorno reactivo" "%DSV1_RESPONSE_RUNTIME%" "%~dp0..\..\tools\preview-space-response.cjs"
