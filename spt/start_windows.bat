@echo off
title SPT - Sports Performance Tracking
cd /d "%~dp0"
echo ============================================================
echo   SPT - Sports Performance Tracking  (Windows 11)
echo   SPT 2.0 - aplikacija:    http://localhost:8000
echo   Marketing stranica:      http://localhost:8000/marketing
echo   Prvo pokretanje stvara bazu (~3 sekunde)...
echo   Zatvori ovaj prozor za gasenje aplikacije.
echo ============================================================
where python >nul 2>nul
if %errorlevel% neq 0 (
  echo [GRESKA] Python nije pronaden. Instaliraj Python 3.10+ sa https://www.python.org/downloads/
  echo Obavezno označi "Add Python to PATH" tijekom instalacije.
  pause
  exit /b 1
)
python server.py
pause
