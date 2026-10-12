@echo off
title SPT - Instalacija (produced by GNK ASG)
cd /d "%~dp0"
echo ============================================================
echo   SPT 2.5 - SPORTS PERFORMANCE TRACKING
echo   produced by GNK ASG
echo   Ova skripta:
echo     1) provjerava Python
echo     2) stvara precicu na radnoj povrsini
echo     3) pokrece SPT i otvara ga u pregledniku
echo ============================================================
where python >nul 2>nul
if %errorlevel% neq 0 (
  echo [GRESKA] Python nije pronaden!
  echo Instaliraj Python 3.10+ sa https://www.python.org/downloads/
  echo i obavezno oznaci "Add Python to PATH" tijekom instalacije.
  pause
  exit /b 1
)
echo [1/3] Python OK — verzija:
python --version
echo.
echo [2/3] Stvaram precicu na radnoj povrsini...
powershell -NoProfile -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut('%USERPROFILE%\Desktop\SPT 2.5.lnk');$s.TargetPath='%~dp0start_windows.bat';$s.WorkingDirectory='%~dp0';$s.Description='SPT - Sports Performance Tracking (produced by GNK ASG)';$s.IconLocation='%SystemRoot%\System32\shell32.dll,13';$s.Save()" 2>nul
if exist "%USERPROFILE%\Desktop\SPT 2.5.lnk" (echo       Precica stvorena: SPT 2.5 na radnoj povrsini) else (echo       Precica nije stvorena - necemo zastati, SPT mozes pokrenuti s start_windows.bat)
echo.
echo [3/3] Pokrecem SPT... preglednik ce se otvoriti na http://localhost:8000
echo       (prvo pokretanje stvara bazu ~3 sekunde)
echo.
start "" http://localhost:8000
timeout /t 2 /nobreak >nul
python server.py
pause
