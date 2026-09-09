@echo off
title Urban Pulse AI - Smart City Surveillance Platform
color 0B
setlocal enabledelayedexpansion

echo ==============================================================================
echo                 URBAN PULSE AI - SYSTEM LAUNCHER
echo ==============================================================================
echo.

set "SIH_ROOT=C:\Users\Rishabh_Joshi\Downloads\sih"
cd /d "%SIH_ROOT%"

:: Resolve Python executable
set "PYTHON_EXE=C:\Users\Rishabh_Joshi\AppData\Local\Programs\Python\Python311\python.exe"
if not exist "%PYTHON_EXE%" (
    set "PYTHON_EXE=python"
)

:: Free ports if already occupied
echo [*] Checking and freeing ports (8000, 8001, 5173)...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "8000, 8001, 5173 | ForEach-Object { Get-NetTCPConnection -LocalPort $_ -ErrorAction SilentlyContinue } | Select-Object -ExpandProperty OwningProcess -Unique | Where-Object { $_ -gt 0 -and $_ -ne $PID } | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"

timeout /t 2 /nobreak >nul

echo.
echo [*] Starting Service B (Central Backend & Database API) on port 8000...
start "UrbanPulse - Service B (8000)" /min cmd /c "cd /d "%SIH_ROOT%\service-b" && "%PYTHON_EXE%" -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

echo [*] Starting Service A (Perception & AI OCR Engine) on port 8001...
start "UrbanPulse - Service A (8001)" /min cmd /c "cd /d "%SIH_ROOT%\service-a" && "%PYTHON_EXE%" -m uvicorn app.main:app --host 0.0.0.0 --port 8001"

echo [*] Starting Frontend (React Vite Dashboard) on port 5173...
start "UrbanPulse - Frontend (5173)" /min cmd /c "cd /d "%SIH_ROOT%\frontend" && npm run dev"

echo.
echo [*] Waiting for services to initialize...
timeout /t 6 /nobreak >nul

echo.
echo ==============================================================================
echo   ALL SUBSYSTEMS LAUNCHED SUCCESSFULLY!
echo ==============================================================================
echo.
echo   [1] Frontend Dashboard : http://localhost:5173
echo   [2] Service B API Docs : http://localhost:8000/docs
echo   [3] Service B Health   : http://localhost:8000/api/v1/health
echo   [4] Service A Health   : http://localhost:8001/health
echo.
echo   Opening browser at http://localhost:5173...
start http://localhost:5173

echo.
echo   Press any key to STOP all Urban Pulse AI services and exit...
echo ==============================================================================
pause >nul

echo.
echo [*] Terminating all services...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "8000, 8001, 5173 | ForEach-Object { Get-NetTCPConnection -LocalPort $_ -ErrorAction SilentlyContinue } | Select-Object -ExpandProperty OwningProcess -Unique | Where-Object { $_ -gt 0 -and $_ -ne $PID } | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"

echo [+] All services stopped. Goodbye!
timeout /t 2 >nul
