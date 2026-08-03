@echo off
REM ===================================================================
REM  Contenedores - arranque portatil. Doble clic y listo.
REM  No instala nada: Node y PostgreSQL salen de esta misma carpeta.
REM ===================================================================
setlocal
cd /d "%~dp0.."

set "RAIZ=%cd%"
set "PGDIR=%RAIZ%\demo\portatil\pgsql"
set "PGDATA=%RAIZ%\demo\portatil\datos"
set "PATH=%RAIZ%\demo\portatil\node;%PGDIR%\bin;%PATH%"

if not exist "%PGDIR%\bin\pg_ctl.exe" (
  echo Falta PostgreSQL portatil en demo\portatil\pgsql
  echo Ver demo\portatil\LEEME.txt
  pause & exit /b 1
)

REM Primera vez: crear el cluster y la base
if not exist "%PGDATA%\PG_VERSION" (
  echo Preparando la base por primera vez, esto tarda un minuto...
  "%PGDIR%\bin\initdb.exe" -U postgres -A trust -E UTF8 -D "%PGDATA%" >nul
  "%PGDIR%\bin\pg_ctl.exe" -D "%PGDATA%" -o "-p 5433" -l "%PGDATA%\log.txt" start
  timeout /t 4 >nul
  "%PGDIR%\bin\createdb.exe" -U postgres -p 5433 contenedores
  call npm install
  call npm run demo:datos
  call npm run demo:build
) else (
  "%PGDIR%\bin\pg_ctl.exe" -D "%PGDATA%" -o "-p 5433" -l "%PGDATA%\log.txt" start
  timeout /t 3 >nul
)

start "" http://localhost:3000/alquileres
start "Cerveceria" cmd /c npm run demo:cerveceria
call npm run demo:alquileres

REM Al cerrar la ventana se apaga tambien la base
"%PGDIR%\bin\pg_ctl.exe" -D "%PGDATA%" stop
