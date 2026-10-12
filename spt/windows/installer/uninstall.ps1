<#
.SYNOPSIS
  SPT 2.5 — deinstalacija (produced by GNK ASG).

.DESCRIPTION
  Pokreće ga SPT-Uninstall.exe (izbornik Start > SPT > Deinstaliraj SPT ili
  Postavke > Aplikacije > SPT 2.5 > Deinstaliraj).

  Skripta se najprije kopira u %TEMP% i odande pokrene ponovno, kako bi mogla
  obrisati cijelu instalacijsku mapu. Uklanja: SPT poslužitelj (ako radi),
  mapu programa (uključujući lokalnu bazu spt.db i ugrađeni Python), prečace,
  zapis u Postavke > Aplikacije i zapise u %LOCALAPPDATA%\SPT.

  Tiho: SPT-Uninstall.exe /S
#>
[CmdletBinding()]
param(
    [string]$InstallDir = '',
    [switch]$Silent,
    [switch]$FromTemp
)

$ErrorActionPreference = 'Stop'
$Title = 'SPT 2.5 — deinstalacija'
$Signature = 'produced by GNK ASG'
$UninstallKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\GNK-ASG-SPT'
$LogFile = Join-Path $env:TEMP 'SPT-deinstalacija.log'

if (-not $InstallDir) { $InstallDir = $PSScriptRoot }
$InstallDir = $InstallDir.TrimEnd('\')

function Write-Log {
    param([string]$Message)
    $line = '{0}  {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
    try { Add-Content -LiteralPath $LogFile -Value $line -Encoding UTF8 } catch { }
}

try {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
} catch { }

function Show-Message {
    param([string]$Text, [string]$Kind = 'Information', [switch]$YesNo)
    if ($Silent) { return [System.Windows.Forms.DialogResult]::Yes }
    $owner = New-Object System.Windows.Forms.Form
    $owner.TopMost = $true
    $owner.ShowInTaskbar = $false
    $owner.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
    $owner.Size = New-Object System.Drawing.Size(1, 1)
    $owner.Opacity = 0
    $owner.Show()
    try {
        $buttons = [System.Windows.Forms.MessageBoxButtons]::OK
        if ($YesNo) { $buttons = [System.Windows.Forms.MessageBoxButtons]::YesNo }
        $icon = [System.Windows.Forms.MessageBoxIcon]$Kind
        return [System.Windows.Forms.MessageBox]::Show($owner, $Text, $Title, $buttons, $icon)
    } finally {
        $owner.Close()
        $owner.Dispose()
    }
}

function Remove-SelfCopy {
    if ($FromTemp) { Remove-Item -LiteralPath $PSCommandPath -Force -ErrorAction SilentlyContinue }
}

# 1) ponovno pokretanje iz %TEMP% (iz instalacijske mape ne možemo obrisati samu sebe)
if (-not $FromTemp) {
    $tmp = Join-Path $env:TEMP ('SPT-deinstalacija-' + [guid]::NewGuid().ToString('N') + '.ps1')
    Copy-Item -LiteralPath $PSCommandPath -Destination $tmp -Force
    $argList = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-STA', '-File', ('"{0}"' -f $tmp), '-InstallDir', ('"{0}"' -f $InstallDir), '-FromTemp')
    if ($Silent) { $argList += '-Silent' }
    $psExe = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    Start-Process -FilePath $psExe -ArgumentList $argList -WindowStyle Hidden
    exit 0
}

Write-Log "===== SPT deinstalacija: $InstallDir (tiho=$([bool]$Silent)) ====="

# 2) sigurnosna provjera — brišemo samo mapu koja je zaista SPT instalacija
$isSpt = (Test-Path -LiteralPath (Join-Path $InstallDir 'app\server.py')) -or
         (Test-Path -LiteralPath (Join-Path $InstallDir 'SPT-Uninstall.exe'))
if (-not $isSpt -or $InstallDir.Length -le 3) {
    Write-Log 'mapa ne izgleda kao SPT instalacija — prekid'
    [void](Show-Message -Text ("Mapa ne izgleda kao SPT instalacija:`n{0}`n`nNišta nije obrisano." -f $InstallDir) -Kind 'Warning')
    Remove-SelfCopy
    exit 1
}

# 3) potvrda
$answer = Show-Message -Text ("Ukloniti SPT 2.5 s ovog računala?`n`nBit će obrisani program, prečaci i lokalna baza podataka (spt.db) u mapi:`n{0}`n`n{1}" -f $InstallDir, $Signature) -Kind 'Question' -YesNo
if ($answer -ne [System.Windows.Forms.DialogResult]::Yes) {
    Write-Log 'korisnik je odustao'
    Remove-SelfCopy
    exit 1602
}

# 4) zaustavi SPT
$launcher = Join-Path $InstallDir 'app\spt_launcher.pyw'
$py = Join-Path $InstallDir 'python\python.exe'
if ((Test-Path -LiteralPath $launcher) -and (Test-Path -LiteralPath $py)) {
    try {
        $p = Start-Process -FilePath $py -ArgumentList @('-X', 'utf8', ('"{0}"' -f $launcher), '--stop', '--quiet') -WindowStyle Hidden -PassThru
        [void]$p.WaitForExit(30000)
    } catch { Write-Log ('zaustavljanje pokretačem: ' + $_.Exception.Message) }
}
$prefix = $InstallDir + '\'
$procs = @()
try { $procs = @(Get-CimInstance -ClassName Win32_Process -Filter "Name='python.exe' OR Name='pythonw.exe'" -ErrorAction Stop) } catch { }
foreach ($proc in $procs) {
    $exe = [string]$proc.ExecutablePath
    $cmdLine = [string]$proc.CommandLine
    if ($exe.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase) -or
        $cmdLine.IndexOf($prefix, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
        Write-Log ('zaustavljam proces {0}' -f $proc.ProcessId)
        try { Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop } catch { }
    }
}

# 5) prečaci
$menuDir = Join-Path ([Environment]::GetFolderPath('Programs')) 'SPT'
if (Test-Path -LiteralPath $menuDir) { Remove-Item -LiteralPath $menuDir -Recurse -Force -ErrorAction SilentlyContinue }
$desktopLnk = Join-Path ([Environment]::GetFolderPath('Desktop')) 'SPT 2.5.lnk'
if (Test-Path -LiteralPath $desktopLnk) {
    try {
        $shell = New-Object -ComObject WScript.Shell
        $lnk = $shell.CreateShortcut($desktopLnk)
        $target = [string]$lnk.TargetPath + ' ' + [string]$lnk.Arguments
        if ($target.IndexOf($prefix, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
            Remove-Item -LiteralPath $desktopLnk -Force
        }
    } catch { Write-Log ('prečac na radnoj površini: ' + $_.Exception.Message) }
}

# 6) Postavke > Aplikacije
if (Test-Path -LiteralPath $UninstallKey) { Remove-Item -LiteralPath $UninstallKey -Recurse -Force -ErrorAction SilentlyContinue }

# 7) datoteke (SPT-Uninstall.exe se zatvara tren nakon pokretanja ove skripte)
$deleted = $false
for ($i = 0; $i -lt 30 -and -not $deleted; $i++) {
    try {
        if (Test-Path -LiteralPath $InstallDir) { Remove-Item -LiteralPath $InstallDir -Recurse -Force -ErrorAction Stop }
        $deleted = $true
    } catch {
        Start-Sleep -Milliseconds 500
    }
}
if (-not $deleted) {
    Write-Log 'dio datoteka je zaključan — brisanje se ponavlja nakon izlaska'
    Start-Process -FilePath (Join-Path $env:SystemRoot 'System32\cmd.exe') -ArgumentList ('/c ping -n 8 127.0.0.1 >nul & rmdir /s /q "{0}"' -f $InstallDir) -WindowStyle Hidden
}
$dataDir = Join-Path $env:LOCALAPPDATA 'SPT'
if ((Test-Path -LiteralPath (Join-Path $dataDir 'logs')) -or (Test-Path -LiteralPath (Join-Path $dataDir 'server.json'))) {
    Remove-Item -LiteralPath $dataDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Log '===== deinstalacija je gotova ====='
[void](Show-Message -Text ("SPT 2.5 je uklonjen s ovog računala.`n`n{0}" -f $Signature) -Kind 'Information')
Remove-SelfCopy
exit 0
