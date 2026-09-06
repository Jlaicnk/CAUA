@echo off
setlocal
rem ===== CAUA one-click start =====
rem 1. ensure MySQL service is running
rem 2. start Django backend (8000)
rem 3. start Web frontend (5173)
rem 4. open browser
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-services.ps1"
echo.
pause