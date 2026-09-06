@echo off
setlocal
rem ===== CAUA first-time setup =====
rem create conda env, install deps, init database
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup.ps1"
echo.
pause