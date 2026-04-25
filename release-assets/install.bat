@echo off
setlocal

powershell.exe -NoLogo -ExecutionPolicy Bypass -File "%~dp0install.ps1"

echo.
if errorlevel 1 (
  echo Installation failed.
) else (
  echo Installation finished.
)

pause
endlocal
