# SPR Note - PowerShell Development Launcher
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "          SPR NOTE - FULL STACK DEV LAUNCHER" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$venvPython = Join-Path $PSScriptRoot "venv\Scripts\python.exe"
$pythonCmd = if (Test-Path $venvPython) { "`"$venvPython`"" } else { "python" }

Write-Host "[*] Starting Backend (Django on http://127.0.0.1:8000)..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k cd /d `"$PSScriptRoot\backend`" && $pythonCmd manage.py runserver"

Write-Host "[*] Starting Frontend (Vite on http://localhost:5173)..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k cd /d `"$PSScriptRoot\frontend`" && npm run dev"

Write-Host ""
Write-Host "[OK] Both servers launched in separate windows!" -ForegroundColor Green
Write-Host "[*] Backend:  http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host "[*] Frontend: http://localhost:5173" -ForegroundColor Cyan
