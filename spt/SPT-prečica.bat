@echo off
rem SPT — produced by GNK ASG — stvara prečicu "SPT 2.2" na radnoj površini (Windows 11)
setlocal
cd /d "%~dp0"
set "DESK=%USERPROFILE%\Desktop"
set "LNK=%DESK%\SPT 2.2.lnk"
set "BAT=%~dp0start_windows.bat"
powershell -NoProfile -Command ^
  "$s = (New-Object -ComObject WScript.Shell).CreateShortcut('%LNK%');" ^
  "$s.TargetPath = '%BAT%';" ^
  "$s.WorkingDirectory = '%~dp0';" ^
  "$s.Description = 'SPT — Sports Performance Tracking 2.2';" ^
  "$s.IconLocation = '%SystemRoot%\System32\shell32.dll,13';" ^
  "$s.Save()"
if exist "%LNK%" (
  echo Preckica stvorena: %LNK%
  echo Dvoklik na nju pokrece cijeli SPT.
) else (
  echo Nije uspjelo stvaranje preckice — pokreci start_windows.bat direktno.
)
pause
