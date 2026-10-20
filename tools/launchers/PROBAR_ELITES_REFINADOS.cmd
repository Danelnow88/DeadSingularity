@echo off
setlocal
cd /d "%~dp0..\..\"
set "ELECTRON_RUN_AS_NODE="
set "DS_PREVIEW_RUNTIME=%~dp0..\..\local\runtime\windows\electron.exe"
if not exist "%DS_PREVIEW_RUNTIME%" set "DS_PREVIEW_RUNTIME=%~dp0..\..\node_modules\electron\dist\electron.exe"
if not exist "%DS_PREVIEW_RUNTIME%" (
  echo Falta el runtime Electron. Ejecuta npm install desde esta carpeta.
  pause
  exit /b 1
)
start "DEADSINGULARITY - Elites" "%DS_PREVIEW_RUNTIME%" "%~dp0..\..\tools\preview-refined-elites.cjs"
