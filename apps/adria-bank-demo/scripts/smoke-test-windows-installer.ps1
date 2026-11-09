$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$package = Get-Content -LiteralPath (Join-Path $projectRoot 'package.json') -Raw | ConvertFrom-Json
$installer = Join-Path $projectRoot "release\Adria-Banka-Demo-Setup-$($package.version)-x64.exe"
$programsRoot = Join-Path $env:LOCALAPPDATA 'Programs'

if (-not (Test-Path -LiteralPath $installer)) { throw "Windows setup executable is missing: $installer" }
$setup = Start-Process -FilePath $installer -ArgumentList '/S' -Wait -PassThru
if ($setup.ExitCode -ne 0) { throw "Silent per-user installer exited with code $($setup.ExitCode)." }

$installedApp = Get-ChildItem -LiteralPath $programsRoot -Filter 'Adria Bank Demo.exe' -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $installedApp) {
  $installedDirs = if (Test-Path -LiteralPath $programsRoot) { (Get-ChildItem -LiteralPath $programsRoot -Directory | Select-Object -ExpandProperty FullName) -join '; ' } else { '(missing)' }
  throw "Silent installer completed but Adria Bank Demo.exe was not found under $programsRoot. Install folders: $installedDirs"
}
$appArchive = Join-Path $installedApp.Directory.FullName 'resources\app.asar'
if (-not (Test-Path -LiteralPath $appArchive)) { throw "Packaged Electron app archive is missing: $appArchive" }

# The one-click installer may auto-launch the app; close it so the hosted runner stays clean.
Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -and [string]::Equals($_.Path, $installedApp.FullName, [System.StringComparison]::OrdinalIgnoreCase) } | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "Per-user Windows installer smoke test passed. Installed executable and app.asar found at $($installedApp.Directory.FullName)."
