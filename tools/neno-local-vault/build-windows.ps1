# NENO Local Vault v0.3.0 — optional local Windows build
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
if (Get-Command py -ErrorAction SilentlyContinue) {
  py -3.12 -m venv .venv
} else {
  throw "Install Python 3.12 for Windows before running this script."
}
$python = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
& $python -m pip install --upgrade pip
& $python -m pip install -r requirements-build.txt
& $python -m unittest discover -s tests -v
if ($LASTEXITCODE -ne 0) { throw 'Tests failed; setup not built.' }
& $python -m PyInstaller --clean --noconfirm --onefile --windowed --collect-all pypdfium2 --name NenoLocalVault app.py
if ($LASTEXITCODE -ne 0) { throw 'PyInstaller failed.' }
$makensis = Get-Command makensis.exe -ErrorAction SilentlyContinue
if (-not $makensis) {
  $expected = Join-Path ${env:ProgramFiles(x86)} 'NSIS\makensis.exe'
  if (-not (Test-Path $expected)) { throw 'Install NSIS 3 from the official source; makensis.exe not found.' }
  $compiler = $expected
} else { $compiler = $makensis.Source }
New-Item -ItemType Directory output -Force | Out-Null
& $compiler /V2 /DVERSION=0.3.0 installer.nsi
if ($LASTEXITCODE -ne 0) { throw 'NSIS installer build failed.' }
Get-FileHash 'output\NenoLocalVault-Setup-0.3.0.exe' -Algorithm SHA256
Write-Output "Build finished: $PSScriptRoot\output\NenoLocalVault-Setup-0.3.0.exe"
