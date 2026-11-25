@echo off
title Our Little Universe Launcher
color 0D
echo ============================================================
echo           OUR LITTLE UNIVERSE - DEV LAUNCHER
echo ============================================================
echo.

set "PM_CMD=pnpm"
where pnpm >nul 2>&1 || set "PM_CMD=npm"

where wt.exe >nul 2>&1 && (
    start "" wt -d "%~dp0apps\our-little-universe" --title "Our Little Universe" cmd /k "%PM_CMD% run dev"
    exit /b 0
)

start "Our Little Universe" cmd /k "cd /d "%~dp0apps\our-little-universe" && %PM_CMD% run dev"
