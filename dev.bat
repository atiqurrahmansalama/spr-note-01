@echo off
title SPR Note Development Launcher
color 0A
echo ============================================================
echo           SPR NOTE - FULL STACK DEV LAUNCHER
echo ============================================================
echo.

set "PYTHON_CMD=python"
if exist "%~dp0venv\Scripts\python.exe" (
    set "PYTHON_CMD="%~dp0venv\Scripts\python.exe""
)

echo [*] Starting Backend (Django on http://127.0.0.1:8000)...
start "SPR Note - Backend" cmd /k "cd /d "%~dp0backend" && %PYTHON_CMD% manage.py runserver"

echo [*] Starting Frontend (Vite on http://localhost:5173)...
set "FE_CMD=pnpm run dev"
where pnpm >nul 2>&1 || set "FE_CMD=npm run dev"
start "SPR Note - Frontend" cmd /k "cd /d "%~dp0apps\spr-note-web" && %FE_CMD%"

echo.
echo [OK] Both servers launched in separate windows!
echo [*] Backend:  http://127.0.0.1:8000
echo [*] Frontend: http://localhost:5173
echo.
pause
