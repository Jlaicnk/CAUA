@echo off
setlocal
rem ===== CAUA stop services =====
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop-services.ps1"
echo.
pause