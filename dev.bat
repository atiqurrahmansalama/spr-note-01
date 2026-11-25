@echo off
title Ecosystem Development Launcher
color 0A
setlocal enabledelayedexpansion

echo ============================================================
echo           ECOSYSTEM DEVELOPMENT LAUNCHER (TABS)
echo ============================================================
echo.

:: Detect Python executable (venv or system)
set "PYTHON_CMD=python"
if exist "%~dp0venv\Scripts\python.exe" (
    set "PYTHON_CMD="%~dp0venv\Scripts\python.exe""
)

:: Detect Package Manager (pnpm or npm)
set "PM_CMD=pnpm"
where pnpm >nul 2>&1 || set "PM_CMD=npm"

:: Detect Windows Terminal (wt.exe) for single-window multi-tab support
set "USE_WT=0"
where wt.exe >nul 2>&1 && set "USE_WT=1"

:: Check command-line arguments for direct launch
if /i "%1"=="universe" goto run_universe
if /i "%1"=="2" goto run_universe
if /i "%1"=="spr" goto run_spr
if /i "%1"=="1" goto run_spr
if /i "%1"=="all" goto run_all
if /i "%1"=="3" goto run_all

:: Interactive Selection Menu
echo Select development mode to launch:
echo.
echo   [1] SPR Note Full Stack (Backend + Frontend in Tabs)
echo   [2] Our Little Universe (Port 5175)
echo   [3] Launch All (SPR Note + Our Little Universe in 3 Tabs)
echo   [4] Exit
echo.
set /p "CHOICE=Enter choice [1-4] (Default is 1): "

if "%CHOICE%"=="" set "CHOICE=1"
if "%CHOICE%"=="1" goto run_spr
if "%CHOICE%"=="2" goto run_universe
if "%CHOICE%"=="3" goto run_all
if "%CHOICE%"=="4" exit /b 0

echo [!] Invalid selection. Defaulting to SPR Note Full Stack...
timeout /t 1 >nul
goto run_spr

:run_spr
echo.
echo [*] Starting SPR Note (Backend: 8000, Frontend: 5173)...
if "%USE_WT%"=="1" (
    echo [*] Launching tabs in Windows Terminal...
    start "" wt -d "%~dp0backend" --title "SPR Note - Backend" cmd /k "%PYTHON_CMD% manage.py runserver" ; nt -d "%~dp0apps\spr-note-web" --title "SPR Note - Frontend" cmd /k "%PM_CMD% run dev"
    echo [OK] Both services launched in Windows Terminal tabs!
) else (
    echo [!] Windows Terminal not detected. Falling back to separate windows...
    start "SPR Note - Backend" cmd /k "cd /d "%~dp0backend" && %PYTHON_CMD% manage.py runserver"
    start "SPR Note - Frontend" cmd /k "cd /d "%~dp0apps\spr-note-web" && %PM_CMD% run dev"
    echo [OK] Both services launched in separate windows!
)
echo [*] Backend:  http://127.0.0.1:8000
echo [*] Frontend: http://localhost:5173
echo.
pause
exit /b 0

:run_universe
echo.
echo [*] Starting Our Little Universe (Frontend: 5175)...
if "%USE_WT%"=="1" (
    echo [*] Launching in Windows Terminal tab...
    start "" wt -d "%~dp0apps\our-little-universe" --title "Our Little Universe" cmd /k "%PM_CMD% run dev"
    echo [OK] Launched in Windows Terminal!
) else (
    start "Our Little Universe" cmd /k "cd /d "%~dp0apps\our-little-universe" && %PM_CMD% run dev"
    echo [OK] Launched in separate window!
)
echo [*] Universe App: http://localhost:5175
echo.
pause
exit /b 0

:run_all
echo.
echo [*] Starting All Services in Tabs (Backend, SPR Note, Our Little Universe)...
if "%USE_WT%"=="1" (
    echo [*] Launching 3 tabs in Windows Terminal...
    start "" wt -d "%~dp0backend" --title "SPR Note - Backend" cmd /k "%PYTHON_CMD% manage.py runserver" ; nt -d "%~dp0apps\spr-note-web" --title "SPR Note - Frontend" cmd /k "%PM_CMD% run dev" ; nt -d "%~dp0apps\our-little-universe" --title "Our Little Universe" cmd /k "%PM_CMD% run dev"
    echo [OK] All 3 services launched in tabs within a single Windows Terminal!
) else (
    echo [!] Windows Terminal not detected. Falling back to separate windows...
    start "SPR Note - Backend" cmd /k "cd /d "%~dp0backend" && %PYTHON_CMD% manage.py runserver"
    start "SPR Note - Frontend" cmd /k "cd /d "%~dp0apps\spr-note-web" && %PM_CMD% run dev"
    start "Our Little Universe" cmd /k "cd /d "%~dp0apps\our-little-universe" && %PM_CMD% run dev"
    echo [OK] All 3 services launched in separate windows!
)
echo [*] Backend:      http://127.0.0.1:8000
echo [*] SPR Note Web: http://localhost:5173
echo [*] Universe App: http://localhost:5175
echo.
pause
exit /b 0
