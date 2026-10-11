@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-Windows.ps1"
set "exitCode=%ERRORLEVEL%"
if not "%exitCode%"=="0" (
  echo.
  echo The desktop demo could not finish installing. Review the message above, then press any key to close.
  pause >nul
)
exit /b %exitCode%
