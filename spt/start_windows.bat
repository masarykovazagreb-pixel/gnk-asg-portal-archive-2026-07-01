@echo off
title SPT - Sports Performance Tracking 2.2
cd /d "%~dp0"
echo   produced by GNK ASG
echo ============================================================
echo   SPT 2.2 - Sports Performance Tracking  (Windows 11)
echo   Aplikacija:      http://localhost:8000
echo   Kontrolna soba:  http://localhost:8000/#soba
echo   Marketing:       http://localhost:8000/marketing
echo   Ako server padne, sam se resetira za 3 sekunde.
echo   Za gašenje: Ctrl+C ili zatvori ovaj prozor.
echo ============================================================
where python >nul 2>nul
if %errorlevel% neq 0 (
  echo [GRESKA] Python nije pronaden. Instaliraj Python 3.10+ sa https://www.python.org/downloads/
  echo Obavezno oznaci "Add Python to PATH" tijekom instalacije.
  pause
  exit /b 1
)
:loop
python server.py
echo.
echo [SPT] Server je prestao — restartam za 3 s (Ctrl+C za izlaz)...
timeout /t 3 /nobreak >nul
goto loop
