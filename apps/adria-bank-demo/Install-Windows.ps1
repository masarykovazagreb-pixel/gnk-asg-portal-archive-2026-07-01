$ErrorActionPreference = 'Stop'
$sourceRoot = (Resolve-Path $PSScriptRoot).Path
$installRoot = Join-Path $env:LOCALAPPDATA 'Programs\Adria Bank Demo'
$node = Get-Command node.exe -ErrorAction SilentlyContinue
$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $node -or -not $npm) {
  throw 'Node.js 22.12 or newer and npm are required for this source-based installer. Install Node.js, then run this script again.'
}
$nodeVersionText = (& $node.Source -p 'process.versions.node').Trim()
$nodeVersion = [version]$nodeVersionText
if ($nodeVersion -lt [version]'22.12.0') { throw 'Node.js 22.12 or newer is required for the bundled Electron version.' }

if (-not [string]::Equals($sourceRoot, $installRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  New-Item -ItemType Directory -Path $installRoot -Force | Out-Null
  Get-ChildItem -LiteralPath $sourceRoot -Force | Where-Object {
    $_.Name -notin @('.git', 'node_modules', 'release', 'dist') -and $_.Extension -ne '.zip'
  } | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $installRoot -Recurse -Force }
}

Push-Location $installRoot
try {
  Write-Host 'Installing Adria Bank Demo dependencies. Electron may need an internet connection to download its desktop runtime.'
  & $npm.Source ci --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw "npm ci failed with exit code $LASTEXITCODE. Check your connection and certificate trust, then retry." }
  $electronExe = Join-Path $installRoot 'node_modules\electron\dist\electron.exe'
  if (-not (Test-Path $electronExe)) { throw 'Electron did not install completely; no desktop runtime was found.' }

  $launcher = Join-Path $installRoot 'RUN-ADRIA-BANK-DEMO.vbs'
  $icon = Join-Path $installRoot 'assets\adria.ico'
  $desktop = [Environment]::GetFolderPath('Desktop')
  $startMenu = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Adria Bank Demo'
  New-Item -ItemType Directory -Path $startMenu -Force | Out-Null
  $shortcutShell = New-Object -ComObject WScript.Shell
  foreach ($shortcutPath in @((Join-Path $desktop 'Adria Bank Demo.lnk'), (Join-Path $startMenu 'Adria Bank Demo.lnk'))) {
    $shortcut = $shortcutShell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = Join-Path $env:WINDIR 'System32\wscript.exe'
    $shortcut.Arguments = '"' + $launcher + '"'
    $shortcut.WorkingDirectory = $installRoot
    $shortcut.IconLocation = $icon + ',0'
    $shortcut.Description = 'Fictional Adria Bank rehearsal simulator — synthetic data only'
    $shortcut.Save()
  }
} finally {
  Pop-Location
}

Write-Host "Installed to: $installRoot"
Write-Host 'Desktop and Start menu shortcuts were created with the Adria Bank icon.'
Write-Host 'Start the demo and use Settings > Background rehearsal simulator to configure tray and optional Windows startup.'
Write-Host 'This is a source-based desktop install; it is not a signed standalone .exe installer.'
Start-Process -FilePath (Join-Path $env:WINDIR 'System32\wscript.exe') -ArgumentList ('"' + (Join-Path $installRoot 'RUN-ADRIA-BANK-DEMO.vbs') + '"')
