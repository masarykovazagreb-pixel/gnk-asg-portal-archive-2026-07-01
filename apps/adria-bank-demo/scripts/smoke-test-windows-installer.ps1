$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$package = Get-Content -LiteralPath (Join-Path $projectRoot 'package.json') -Raw | ConvertFrom-Json
$installer = Join-Path $projectRoot "release\Adria-Banka-Demo-Setup-$($package.version)-x64.exe"
$installRoot = Join-Path $env:LOCALAPPDATA 'Programs\Adria Bank Demo'
$appExe = Join-Path $installRoot 'Adria Bank Demo.exe'
$appArchive = Join-Path $installRoot 'resources\app.asar'

if (-not (Test-Path -LiteralPath $installer)) { throw "Windows setup executable is missing: $installer" }
$setup = Start-Process -FilePath $installer -ArgumentList '/S' -Wait -PassThru
if ($setup.ExitCode -ne 0) { throw "Silent per-user installer exited with code $($setup.ExitCode)." }
if (-not (Test-Path -LiteralPath $appExe)) { throw "Installed desktop executable is missing: $appExe" }
if (-not (Test-Path -LiteralPath $appArchive)) { throw "Packaged Electron application is missing: $appArchive" }

$running = @(Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -and [string]::Equals($_.ExecutablePath, $appExe, [System.StringComparison]::OrdinalIgnoreCase) })
if ($running.Count -eq 0) {
  $probe = Start-Process -FilePath $appExe -ArgumentList '--disable-gpu' -PassThru
  Start-Sleep -Seconds 8
  $probe.Refresh()
  if ($probe.HasExited) { throw "Installed Electron app exited during launch smoke test (code $($probe.ExitCode))." }
  $running = @(Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -and [string]::Equals($_.ExecutablePath, $appExe, [System.StringComparison]::OrdinalIgnoreCase) })
}
if ($running.Count -eq 0) { throw 'The installed desktop app did not remain running after launch.' }

# Keep the hosted runner clean after checking that the packaged app starts.
foreach ($process in $running) {
  Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
}
Write-Host "Per-user install and app launch smoke test passed: $appExe"
