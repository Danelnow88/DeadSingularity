@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
set "ROOT=%~dp0"
set "NODE_EXE="
for /f "delims=" %%N in ('where node 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%N"

if not defined NODE_EXE (
  echo ERROR: Node.js no esta disponible en PATH.
  echo Instala o habilita Node.js y vuelve a intentarlo.
  pause
  exit /b 1
)

call :ensure_server
if errorlevel 1 exit /b 1

start "" "http://127.0.0.1:8000/dev/combat-test-lab.html"
exit /b 0

:ensure_server
call :health_check
if not errorlevel 1 exit /b 0

start "NEON VOID local server" /min "%NODE_EXE%" "%ROOT%dev\local-dev-server.js"
for /l %%I in (1,1,20) do (
  timeout /t 1 /nobreak >nul
  call :health_check
  if not errorlevel 1 exit /b 0
)

echo ERROR: no se pudo iniciar el servidor local en http://127.0.0.1:8000.
echo El puerto puede estar ocupado por otro proceso o Node.js no pudo iniciar el servidor.
pause
exit /b 1

:health_check
"%NODE_EXE%" -e "const http=require('http');const r=http.get({host:'127.0.0.1',port:8000,path:'/__neon_void_dev_server__',timeout:700},res=>{let b='';res.setEncoding('utf8');res.on('data',c=>b+=c);res.on('end',()=>process.exit(res.statusCode===200&&b==='NEON_VOID_DEV_SERVER_OK'?0:1));});r.on('timeout',()=>r.destroy());r.on('error',()=>process.exit(1));"
exit /b %errorlevel%