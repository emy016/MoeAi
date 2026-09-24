@echo off
setlocal
cd /d "%~dp0"
echo Starting MoeAI at http://127.0.0.1:8080 ...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\serve-portable-web.ps1" -Port 8080
if errorlevel 1 (
  echo.
  echo MoeAI could not start. Read START-HERE.md for troubleshooting.
  pause
)
