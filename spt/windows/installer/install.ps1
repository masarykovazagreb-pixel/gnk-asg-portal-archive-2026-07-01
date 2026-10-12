<#
.SYNOPSIS
  SPT 2.5 — instalacija za Windows 10/11 (bez administratorskih prava).

.DESCRIPTION
  produced by GNK ASG · https://gnk-asg.hr/spt/

  Pokreće ga SPT-Setup-2.5.0.exe nakon raspakiravanja paketa u %TEMP%:
    app\    SPT aplikacija (server.py, moduli, static\, spt_launcher.pyw, spt_prepare.py)
    setup\  install.ps1, uninstall.ps1, spt.ico, SPT-Uninstall.exe

  Koraci:
    1. kopiranje u %LOCALAPPDATA%\Programs\SPT (samo za trenutnog korisnika)
    2. službeni Python s python.org ("embeddable" paket, ~11 MB) uz provjeru
       digitalnog potpisa Python Software Foundation; rezerva: Python 3.10+
       koji je već instaliran na računalu
    3. priprema baze (1.423 sportaša, 75 sportova) da se SPT odmah otvori
    4. prečaci: izbornik Start (SPT) i radna površina
    5. upis u Postavke > Aplikacije (deinstalacija)

  Ručno: powershell -NoProfile -ExecutionPolicy Bypass -File install.ps1 -PayloadDir <mapa paketa> [-Silent]
#>
[CmdletBinding()]
param(
    [string]$PayloadDir = '',
    [string]$SetupExe = '',
    [string]$InstallDir = '',
    [switch]$Silent,
    [switch]$NoDesktopShortcut,
    [switch]$NoLaunch
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$SptVersion     = '2.5.0'
$SptName        = 'SPT 2.5 — Sports Performance Tracking'
$WindowTitle    = "SPT $SptVersion — instalacija"
$Publisher      = 'GNK ASG'
$Signature      = 'produced by GNK ASG'
$InfoUrl        = 'https://gnk-asg.hr/spt/'
$UninstallKey   = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\GNK-ASG-SPT'
$PythonVersions = @('3.12.10', '3.13.3', '3.11.9')
$MinPython      = [version]'3.10'

if (-not $PayloadDir) { $PayloadDir = Split-Path -Parent $PSScriptRoot }
if (-not $InstallDir) { $InstallDir = Join-Path $env:LOCALAPPDATA 'Programs\SPT' }
$PayloadDir = $PayloadDir.TrimEnd('\')
$InstallDir = $InstallDir.TrimEnd('\')

$LogFile = Join-Path $env:TEMP 'SPT-instalacija.log'
$script:Ui = $null
$script:Ctx = $null
$script:Busy = $false
$script:ExitCode = 1602   # 1602 = korisnik je odustao (konvencija Windows Installera)

# ---------------------------------------------------------------------------
# pomoćne funkcije
# ---------------------------------------------------------------------------
function Write-Log {
    param([string]$Message)
    $line = '{0}  {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
    try { Add-Content -LiteralPath $LogFile -Value $line -Encoding UTF8 } catch { }
}

function Invoke-UiPump {
    if ($script:Ui) { [System.Windows.Forms.Application]::DoEvents() }
}

function Set-Progress {
    param([string]$Text = '', [int]$Percent = -1, [switch]$Busy)
    if ($Text) { Write-Log $Text }
    if (-not $script:Ui) { return }
    if ($Text) { $script:Ui.Status.Text = $Text }
    $bar = $script:Ui.Bar
    if ($Busy) {
        if ($bar.Style -ne [System.Windows.Forms.ProgressBarStyle]::Marquee) {
            $bar.Style = [System.Windows.Forms.ProgressBarStyle]::Marquee
            $bar.MarqueeAnimationSpeed = 30
        }
    } elseif ($Percent -ge 0) {
        $bar.Style = [System.Windows.Forms.ProgressBarStyle]::Continuous
        $bar.Value = [Math]::Max(0, [Math]::Min(100, $Percent))
    }
    [System.Windows.Forms.Application]::DoEvents()
}

function Test-WriteAccess {
    param([string]$Dir)
    try {
        if (-not (Test-Path -LiteralPath $Dir -PathType Container)) { return $false }
        $probe = Join-Path $Dir ('.spt-test-' + [guid]::NewGuid().ToString('N'))
        [System.IO.File]::WriteAllText($probe, 'SPT')
        Remove-Item -LiteralPath $probe -Force
        return $true
    } catch {
        return $false
    }
}

# Pokreni program bez prozora; prozor instalacije ostaje živ (DoEvents).
function Invoke-Hidden {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [string]$Arguments = '',
        [string]$WorkingDirectory = '',
        [int]$TimeoutSec = 600,
        [switch]$Capture
    )
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $FilePath
    $psi.Arguments = $Arguments
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    if ($WorkingDirectory) { $psi.WorkingDirectory = $WorkingDirectory }
    if ($Capture) {
        $psi.RedirectStandardOutput = $true
        $psi.RedirectStandardError = $true
    }
    Write-Log ('pokrećem: {0} {1}' -f $FilePath, $Arguments)
    $proc = [System.Diagnostics.Process]::Start($psi)
    $outTask = $null
    $errTask = $null
    if ($Capture) {
        $outTask = $proc.StandardOutput.ReadToEndAsync()
        $errTask = $proc.StandardError.ReadToEndAsync()
    }
    $watch = [System.Diagnostics.Stopwatch]::StartNew()
    while (-not $proc.HasExited) {
        Invoke-UiPump
        Start-Sleep -Milliseconds 100
        if ($watch.Elapsed.TotalSeconds -gt $TimeoutSec) {
            try { $proc.Kill() } catch { }
            throw ('Isteklo je vrijeme ({0} s): {1}' -f $TimeoutSec, $FilePath)
        }
    }
    $proc.WaitForExit()
    $result = [pscustomobject]@{ ExitCode = $proc.ExitCode; Output = ''; StdErr = '' }
    if ($Capture) {
        $result.Output = [string]$outTask.Result
        $result.StdErr = [string]$errTask.Result
    }
    $proc.Dispose()
    return $result
}

function Copy-Tree {
    param([string]$Source, [string]$Destination)
    $src = (Get-Item -LiteralPath $Source).FullName.TrimEnd('\')
    [void][System.IO.Directory]::CreateDirectory($Destination)
    $count = 0
    foreach ($item in (Get-ChildItem -LiteralPath $src -Recurse -Force -File)) {
        $rel = $item.FullName.Substring($src.Length).TrimStart('\')
        $target = Join-Path $Destination $rel
        $parent = Split-Path -Parent $target
        if (-not (Test-Path -LiteralPath $parent)) { [void][System.IO.Directory]::CreateDirectory($parent) }
        Copy-Item -LiteralPath $item.FullName -Destination $target -Force
        $count++
        if (($count % 10) -eq 0) { Invoke-UiPump }
    }
    return $count
}

# ---------------------------------------------------------------------------
# SPT procesi
# ---------------------------------------------------------------------------
function Stop-SptRunning {
    $launcher = Join-Path $InstallDir 'app\spt_launcher.pyw'
    $py = Join-Path $InstallDir 'python\python.exe'
    if ((Test-Path -LiteralPath $launcher) -and (Test-Path -LiteralPath $py)) {
        try { [void](Invoke-Hidden -FilePath $py -Arguments ('-X utf8 "{0}" --stop --quiet' -f $launcher) -TimeoutSec 30) } catch { }
    }
    $prefix = $InstallDir + '\'
    $procs = @()
    try { $procs = @(Get-CimInstance -ClassName Win32_Process -Filter "Name='python.exe' OR Name='pythonw.exe'" -ErrorAction Stop) } catch { }
    foreach ($p in $procs) {
        $exe = [string]$p.ExecutablePath
        $cmdLine = [string]$p.CommandLine
        if ($exe.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase) -or
            $cmdLine.IndexOf($prefix, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
            Write-Log ('zaustavljam proces {0}: {1}' -f $p.ProcessId, $cmdLine)
            try { Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop } catch { }
        }
    }
}

# ---------------------------------------------------------------------------
# Python
# ---------------------------------------------------------------------------
function Get-PythonVersion {
    param([string]$PythonExe)
    if (-not $PythonExe -or -not (Test-Path -LiteralPath $PythonExe -PathType Leaf)) { return $null }
    try {
        $r = Invoke-Hidden -FilePath $PythonExe -Arguments '-c "import sys, sqlite3; print(sys.version.split()[0])"' -TimeoutSec 60 -Capture
        if ($r.ExitCode -ne 0) {
            Write-Log ('Python {0} ne radi (kod {1}): {2}' -f $PythonExe, $r.ExitCode, $r.StdErr.Trim())
            return $null
        }
        $line = @($r.Output -split "`r?`n" | Where-Object { $_ -match '^\d+\.\d+' }) | Select-Object -First 1
        if (-not $line) { return $null }
        return [version]($line.Trim() -replace '[^0-9.].*$', '')
    } catch {
        Write-Log ('provjera Pythona nije uspjela: ' + $_.Exception.Message)
        return $null
    }
}

function Get-PythonArch {
    $arch = [string]$env:PROCESSOR_ARCHITECTURE
    if ($env:PROCESSOR_ARCHITEW6432) { $arch = [string]$env:PROCESSOR_ARCHITEW6432 }
    try {
        $os = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture
        if ($null -ne $os) { $arch = $os.ToString() }
    } catch { }
    if ($arch -match 'ARM64') { return 'arm64' }
    return 'amd64'
}

function Save-WebFile {
    param([string]$Url, [string]$OutFile, [int]$FromPercent, [int]$ToPercent, [string]$Label)
    Write-Log ('preuzimam ' + $Url)
    $request = [System.Net.WebRequest]::Create($Url)
    $request.UserAgent = "SPT-Setup/$SptVersion (Windows; $Signature)"
    $request.Timeout = 30000
    $request.ReadWriteTimeout = 60000
    if ($request.Proxy) { $request.Proxy.Credentials = [System.Net.CredentialCache]::DefaultNetworkCredentials }
    $response = $request.GetResponse()
    $total = [int64]0
    try {
        $total = [int64]$response.ContentLength
        $stream = $response.GetResponseStream()
        $file = [System.IO.File]::Create($OutFile)
        try {
            $buffer = New-Object byte[] 65536
            $done = [int64]0
            $lastTick = 0
            while (($read = $stream.Read($buffer, 0, $buffer.Length)) -gt 0) {
                $file.Write($buffer, 0, $read)
                $done += $read
                if ($script:Ui -and ([Environment]::TickCount - $lastTick) -gt 120) {
                    $lastTick = [Environment]::TickCount
                    if ($total -gt 0) {
                        $pct = $FromPercent + [int](($ToPercent - $FromPercent) * $done / $total)
                        Set-Progress -Text ('{0} — {1:N1} / {2:N1} MB' -f $Label, ($done / 1048576), ($total / 1048576)) -Percent $pct
                    } else {
                        Set-Progress -Text ('{0} — {1:N1} MB' -f $Label, ($done / 1048576))
                    }
                }
            }
        } finally {
            $file.Dispose()
            $stream.Dispose()
        }
    } finally {
        $response.Close()
    }
    if ($total -gt 0 -and (Get-Item -LiteralPath $OutFile).Length -ne $total) {
        throw ('preuzimanje je nepotpuno: ' + $Url)
    }
}

function Set-PythonPath {
    param([string]$PythonDir)
    $pth = Get-ChildItem -LiteralPath $PythonDir -Filter 'python3*._pth' | Select-Object -First 1
    if (-not $pth) { throw 'U ugrađenom Pythonu nema ._pth datoteke.' }
    $zip = Get-ChildItem -LiteralPath $PythonDir -Filter 'python3*.zip' | Select-Object -First 1
    $lines = @()
    if ($zip) { $lines += $zip.Name }
    $lines += '.'
    $lines += '..\app'
    $lines += '# SPT 2.5 (produced by GNK ASG): ..\app = SPT application folder; site import disabled'
    [System.IO.File]::WriteAllLines($pth.FullName, [string[]]$lines, (New-Object System.Text.ASCIIEncoding))
}

function Install-EmbeddedPython {
    param([string]$TargetDir)
    $arch = Get-PythonArch
    # radna mapa na istom disku kao i instalacija (Move-Item ne radi između diskova)
    $work = Join-Path $InstallDir ('_setup-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
    [void][System.IO.Directory]::CreateDirectory($work)
    try {
        foreach ($ver in $PythonVersions) {
            $url = "https://www.python.org/ftp/python/$ver/python-$ver-embed-$arch.zip"
            $zip = Join-Path $work "python-$ver-embed-$arch.zip"
            $unpacked = Join-Path $work "python-$ver"
            try {
                Save-WebFile -Url $url -OutFile $zip -FromPercent 15 -ToPercent 60 -Label "Preuzimam Python $ver ($arch) s python.org"
                Set-Progress -Text "Provjeravam digitalni potpis Pythona $ver…" -Percent 62
                if (Test-Path -LiteralPath $unpacked) { Remove-Item -LiteralPath $unpacked -Recurse -Force }
                [System.IO.Compression.ZipFile]::ExtractToDirectory($zip, $unpacked)
                $exe = Join-Path $unpacked 'python.exe'
                $sig = Get-AuthenticodeSignature -LiteralPath $exe
                $subject = ''
                if ($sig.SignerCertificate) { $subject = [string]$sig.SignerCertificate.Subject }
                if ($sig.Status -ne [System.Management.Automation.SignatureStatus]::Valid -or $subject -notmatch 'Python Software Foundation') {
                    throw ('python.exe nema valjan potpis Python Software Foundation (status: {0}, potpisnik: {1})' -f $sig.Status, $subject)
                }
                Write-Log ('digitalni potpis u redu: ' + $subject)
                Set-Progress -Text "Postavljam Python $ver…" -Percent 66
                if (Test-Path -LiteralPath $TargetDir) { Remove-Item -LiteralPath $TargetDir -Recurse -Force }
                Move-Item -LiteralPath $unpacked -Destination $TargetDir
                Set-PythonPath -PythonDir $TargetDir
                $v = Get-PythonVersion -PythonExe (Join-Path $TargetDir 'python.exe')
                if (-not $v) { throw "Python $ver se ne pokreće nakon raspakiravanja." }
                Write-Log "ugrađeni Python $v je spreman"
                return $v
            } catch {
                Write-Log ('Python {0} ({1}) nije postavljen: {2}' -f $ver, $arch, $_.Exception.Message)
            }
        }
    } finally {
        Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue
    }
    return $null
}

function Find-SystemPython {
    $candidates = New-Object System.Collections.Generic.List[string]
    foreach ($py in @((Join-Path $env:SystemRoot 'py.exe'), (Join-Path $env:LOCALAPPDATA 'Programs\Python\Launcher\py.exe'))) {
        if (Test-Path -LiteralPath $py -PathType Leaf) {
            try {
                $r = Invoke-Hidden -FilePath $py -Arguments '-3 -c "import sys; print(sys.executable)"' -TimeoutSec 60 -Capture
                if ($r.ExitCode -eq 0 -and $r.Output.Trim()) { $candidates.Add((@($r.Output.Trim() -split "`r?`n"))[-1].Trim()) }
            } catch { }
        }
    }
    foreach ($name in @('python.exe', 'python3.exe')) {
        $cmd = Get-Command $name -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($cmd) { $candidates.Add([string]$cmd.Path) }
    }
    foreach ($c in $candidates) {
        if (-not $c) { continue }
        $v = Get-PythonVersion -PythonExe $c
        if ($v -and $v -ge $MinPython) {
            Write-Log "pronađen Python na računalu: $c ($v)"
            return [pscustomobject]@{ Python = $c; Version = $v }
        }
    }
    return $null
}

# ---------------------------------------------------------------------------
# baza, prečaci, registar
# ---------------------------------------------------------------------------
function Initialize-Database {
    param([string]$PythonExe, [string]$AppDir)
    if (Test-Path -LiteralPath (Join-Path $AppDir 'spt.db')) {
        Set-Progress -Text 'Nadograđujem postojeću bazu podataka (vaši podaci se čuvaju)…' -Busy
    } else {
        Set-Progress -Text 'Pripremam bazu podataka: 1.423 sportaša, 75 sportova, ~27.700 sesija (do 1 minute)…' -Busy
    }
    $prepLog = Join-Path $env:TEMP 'SPT-priprema-baze.log'
    try {
        $r = Invoke-Hidden -FilePath $PythonExe -Arguments ('-X utf8 "{0}" "{1}"' -f (Join-Path $AppDir 'spt_prepare.py'), $prepLog) -WorkingDirectory $AppDir -TimeoutSec 900
        if ($r.ExitCode -eq 0) { return $true }
        Write-Log ('priprema baze nije uspjela (kod {0}), zapis: {1}' -f $r.ExitCode, $prepLog)
    } catch {
        Write-Log ('priprema baze nije uspjela: ' + $_.Exception.Message)
    }
    return $false
}

function New-Shortcut {
    param(
        [string]$Path, [string]$Target, [string]$Arguments = '', [string]$WorkingDirectory = '',
        [string]$Icon = '', [string]$Description = ''
    )
    $shell = New-Object -ComObject WScript.Shell
    $lnk = $shell.CreateShortcut($Path)
    $lnk.TargetPath = $Target
    $lnk.Arguments = $Arguments
    if ($WorkingDirectory) { $lnk.WorkingDirectory = $WorkingDirectory }
    if ($Icon) { $lnk.IconLocation = $Icon }
    if ($Description) { $lnk.Description = $Description }
    $lnk.Save()
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($lnk)
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($shell)
}

function Register-Uninstall {
    param([string]$UninstallExe)
    if (-not (Test-Path -LiteralPath $UninstallKey)) { [void](New-Item -Path $UninstallKey -Force) }
    $sizeKb = 0
    try { $sizeKb = [int]((Get-ChildItem -LiteralPath $InstallDir -Recurse -Force -File | Measure-Object -Property Length -Sum).Sum / 1024) } catch { }
    $strings = [ordered]@{
        DisplayName          = $SptName
        DisplayVersion       = $SptVersion
        Publisher            = $Publisher
        InstallLocation      = $InstallDir
        DisplayIcon          = (Join-Path $InstallDir 'spt.ico')
        UninstallString      = ('"{0}"' -f $UninstallExe)
        QuietUninstallString = ('"{0}" /S' -f $UninstallExe)
        URLInfoAbout         = $InfoUrl
        HelpLink             = $InfoUrl
        Comments             = $Signature
        InstallDate          = (Get-Date -Format 'yyyyMMdd')
    }
    foreach ($name in $strings.Keys) {
        [void](New-ItemProperty -Path $UninstallKey -Name $name -Value ([string]$strings[$name]) -PropertyType String -Force)
    }
    foreach ($pair in @(@('NoModify', 1), @('NoRepair', 1), @('EstimatedSize', $sizeKb))) {
        [void](New-ItemProperty -Path $UninstallKey -Name $pair[0] -Value ([int]$pair[1]) -PropertyType DWord -Force)
    }
}

# ---------------------------------------------------------------------------
# instalacija
# ---------------------------------------------------------------------------
function Install-Spt {
    param([bool]$DesktopShortcut = $true, [bool]$LaunchAfter = $true)

    Write-Log "===== SPT $SptVersion: instalacija u $InstallDir (paket: $PayloadDir) ====="
    $appSrc = Join-Path $PayloadDir 'app'
    $setupSrc = Join-Path $PayloadDir 'setup'
    if (-not (Test-Path -LiteralPath (Join-Path $appSrc 'server.py'))) {
        throw "Instalacijski paket je nepotpun (nema app\server.py u $PayloadDir)."
    }

    Set-Progress -Text 'Pripremam instalaciju…' -Percent 3
    [void][System.IO.Directory]::CreateDirectory($InstallDir)
    if (-not (Test-WriteAccess -Dir $InstallDir)) { throw "Nema prava pisanja u mapu $InstallDir." }

    Set-Progress -Text 'Zaustavljam SPT ako je pokrenut…' -Percent 6
    Stop-SptRunning

    Set-Progress -Text 'Kopiram SPT aplikaciju…' -Percent 10
    $appDir = Join-Path $InstallDir 'app'
    $copied = Copy-Tree -Source $appSrc -Destination $appDir
    Write-Log "kopirano datoteka: $copied"
    foreach ($f in @('uninstall.ps1', 'spt.ico', 'SPT-Uninstall.exe')) {
        Copy-Item -LiteralPath (Join-Path $setupSrc $f) -Destination (Join-Path $InstallDir $f) -Force
    }

    $pyDir = Join-Path $InstallDir 'python'
    $python = Join-Path $pyDir 'python.exe'
    $pythonw = Join-Path $pyDir 'pythonw.exe'
    $kind = 'embedded'
    Set-Progress -Text 'Provjeravam Python…' -Percent 13
    $ver = Get-PythonVersion -PythonExe $python
    if ($ver -and $ver -ge $MinPython) {
        Set-PythonPath -PythonDir $pyDir
        Write-Log "postojeći ugrađeni Python $ver se zadržava"
    } else {
        $ver = Install-EmbeddedPython -TargetDir $pyDir
        if (-not $ver) {
            Set-Progress -Text 'Python s python.org nije dostupan — tražim Python na računalu…' -Percent 60
            $found = Find-SystemPython
            if (-not $found) {
                $noPython = ("Python nije bilo moguće preuzeti s python.org, a na računalu nije pronađen Python {0} ili noviji.`n`n" +
                             "Rješenje: provjerite internetsku vezu i pokrenite instalaciju ponovno ili instalirajte Python s " +
                             "https://www.python.org/downloads/ pa ponovite instalaciju SPT-a.") -f $MinPython
                throw $noPython
            }
            $python = $found.Python
            $pythonw = Join-Path (Split-Path -Parent $python) 'pythonw.exe'
            if (-not (Test-Path -LiteralPath $pythonw)) { $pythonw = $python }
            $ver = $found.Version
            $kind = 'system'
        }
    }
    Write-Log "Python: $python ($ver, $kind)"

    $dbOk = Initialize-Database -PythonExe $python -AppDir $appDir

    Set-Progress -Text 'Izrađujem prečace…' -Percent 90
    $menuDir = Join-Path ([Environment]::GetFolderPath('Programs')) 'SPT'
    [void][System.IO.Directory]::CreateDirectory($menuDir)
    $launcher = Join-Path $appDir 'spt_launcher.pyw'
    $quoted = '"{0}"' -f $launcher
    $icon = (Join-Path $InstallDir 'spt.ico') + ',0'
    $mainDesc = "$SptName · $Signature"
    New-Shortcut -Path (Join-Path $menuDir 'SPT 2.5.lnk') -Target $pythonw -Arguments $quoted -WorkingDirectory $appDir -Icon $icon -Description $mainDesc
    New-Shortcut -Path (Join-Path $menuDir 'SPT 2.5 (mrežni način).lnk') -Target $pythonw -Arguments ($quoted + ' --lan') -WorkingDirectory $appDir -Icon $icon `
        -Description 'SPT za uređaje u lokalnoj mreži (satovi, UWB gateway, tableti). Windows može pitati za dopuštenje vatrozida.'
    New-Shortcut -Path (Join-Path $menuDir 'Zaustavi SPT.lnk') -Target $pythonw -Arguments ($quoted + ' --stop') -WorkingDirectory $appDir -Icon $icon `
        -Description 'Zaustavi SPT poslužitelj koji radi u pozadini.'
    New-Shortcut -Path (Join-Path $menuDir 'Deinstaliraj SPT.lnk') -Target (Join-Path $InstallDir 'SPT-Uninstall.exe') -WorkingDirectory $InstallDir -Icon $icon `
        -Description 'Ukloni SPT 2.5 s ovog računala.'
    Set-Content -LiteralPath (Join-Path $menuDir 'SPT na webu.url') -Value @('[InternetShortcut]', "URL=$InfoUrl") -Encoding ASCII
    if ($DesktopShortcut) {
        $desktop = [Environment]::GetFolderPath('Desktop')
        New-Shortcut -Path (Join-Path $desktop 'SPT 2.5.lnk') -Target $pythonw -Arguments $quoted -WorkingDirectory $appDir -Icon $icon -Description $mainDesc
    }

    Set-Progress -Text 'Upisujem SPT u Postavke → Aplikacije…' -Percent 95
    Register-Uninstall -UninstallExe (Join-Path $InstallDir 'SPT-Uninstall.exe')
    $info = [ordered]@{
        product        = 'SPT — Sports Performance Tracking'
        version        = $SptVersion
        installed      = (Get-Date).ToString('s')
        python         = $python
        pythonw        = $pythonw
        python_version = [string]$ver
        python_kind    = $kind
        database_ready = $dbOk
        produced_by    = 'GNK ASG'
    }
    ($info | ConvertTo-Json) | Set-Content -LiteralPath (Join-Path $InstallDir 'install.json') -Encoding UTF8

    Set-Progress -Text 'Gotovo!' -Percent 100
    Write-Log '===== instalacija je uspjela ====='
    if ($LaunchAfter) {
        Start-Process -FilePath $pythonw -ArgumentList $quoted -WorkingDirectory $appDir
    }
    return [pscustomobject]@{ Python = $python; Version = $ver; Kind = $kind; Database = $dbOk }
}

# ---------------------------------------------------------------------------
# prozor instalacije
# ---------------------------------------------------------------------------
function New-Point([int]$X, [int]$Y) { return New-Object System.Drawing.Point($X, $Y) }
function New-Size([int]$W, [int]$H) { return New-Object System.Drawing.Size($W, $H) }

function Show-InstallerWindow {
    $cBg     = [System.Drawing.Color]::FromArgb(11, 18, 32)
    $cHeader = [System.Drawing.Color]::FromArgb(6, 10, 18)
    $cPanel  = [System.Drawing.Color]::FromArgb(20, 31, 51)
    $cCyan   = [System.Drawing.Color]::FromArgb(61, 214, 245)
    $cLime   = [System.Drawing.Color]::FromArgb(182, 240, 60)
    $cText   = [System.Drawing.Color]::FromArgb(230, 237, 246)
    $cMuted  = [System.Drawing.Color]::FromArgb(139, 154, 176)

    $font      = New-Object System.Drawing.Font('Segoe UI', 9.75)
    $fontBold  = New-Object System.Drawing.Font('Segoe UI Semibold', 9.75)
    $fontTitle = New-Object System.Drawing.Font('Segoe UI Semibold', 17)
    $fontSmall = New-Object System.Drawing.Font('Segoe UI', 8.25)

    $form = New-Object System.Windows.Forms.Form
    $form.SuspendLayout()
    $form.AutoScaleDimensions = New-Object System.Drawing.SizeF(96, 96)
    $form.AutoScaleMode = [System.Windows.Forms.AutoScaleMode]::Dpi
    $form.Text = $WindowTitle
    $form.ClientSize = New-Size 620 440
    $form.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
    $form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedDialog
    $form.MaximizeBox = $false
    $form.BackColor = $cBg
    $form.ForeColor = $cText
    $form.Font = $font
    $iconPath = Join-Path $PSScriptRoot 'spt.ico'
    if (Test-Path -LiteralPath $iconPath) { $form.Icon = New-Object System.Drawing.Icon($iconPath) }

    $header = New-Object System.Windows.Forms.Panel
    $header.Location = New-Point 0 0
    $header.Size = New-Size 620 100
    $header.BackColor = $cHeader
    $form.Controls.Add($header)

    $logo = New-Object System.Windows.Forms.PictureBox
    $logo.Location = New-Point 22 18
    $logo.Size = New-Size 64 64
    $logo.SizeMode = [System.Windows.Forms.PictureBoxSizeMode]::Zoom
    if (Test-Path -LiteralPath $iconPath) {
        try { $logo.Image = (New-Object System.Drawing.Icon($iconPath, 256, 256)).ToBitmap() } catch { }
    }
    $header.Controls.Add($logo)

    $title = New-Object System.Windows.Forms.Label
    $title.Text = 'SPT · Sports Performance Tracking'
    $title.Font = $fontTitle
    $title.ForeColor = $cCyan
    $title.BackColor = $cHeader
    $title.AutoSize = $true
    $title.Location = New-Point 100 20
    $header.Controls.Add($title)

    $sub = New-Object System.Windows.Forms.Label
    $sub.Text = "Verzija $SptVersion · Windows 10/11 · $Signature"
    $sub.ForeColor = $cLime
    $sub.BackColor = $cHeader
    $sub.AutoSize = $true
    $sub.Location = New-Point 103 62
    $header.Controls.Add($sub)

    $intro = New-Object System.Windows.Forms.Label
    $intro.Text = ("SPT se instalira samo za vaš korisnički račun — administratorska prava nisu potrebna.`r`n" +
                   'Tijekom instalacije preuzima se službeni Python s python.org (oko 11 MB) koji koristi samo SPT, ' +
                   'pa je potrebna internetska veza. Nakon toga SPT radi lokalno, i bez interneta.')
    $intro.Location = New-Point 22 114
    $intro.Size = New-Size 576 66
    $form.Controls.Add($intro)

    $lblDir = New-Object System.Windows.Forms.Label
    $lblDir.Text = 'Mapa instalacije'
    $lblDir.Font = $fontBold
    $lblDir.ForeColor = $cCyan
    $lblDir.AutoSize = $true
    $lblDir.Location = New-Point 22 190
    $form.Controls.Add($lblDir)

    $txtDir = New-Object System.Windows.Forms.TextBox
    $txtDir.Text = $InstallDir
    $txtDir.ReadOnly = $true
    $txtDir.BackColor = $cPanel
    $txtDir.ForeColor = $cText
    $txtDir.BorderStyle = [System.Windows.Forms.BorderStyle]::FixedSingle
    $txtDir.Location = New-Point 22 214
    $txtDir.Size = New-Size 462 26
    $form.Controls.Add($txtDir)

    $btnBrowse = New-Object System.Windows.Forms.Button
    $btnBrowse.Text = 'Promijeni…'
    $btnBrowse.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $btnBrowse.FlatAppearance.BorderColor = $cMuted
    $btnBrowse.BackColor = $cPanel
    $btnBrowse.ForeColor = $cText
    $btnBrowse.Location = New-Point 494 212
    $btnBrowse.Size = New-Size 104 28
    $form.Controls.Add($btnBrowse)

    $chkDesktop = New-Object System.Windows.Forms.CheckBox
    $chkDesktop.Text = 'Prečac na radnoj površini'
    $chkDesktop.Checked = (-not $NoDesktopShortcut)
    $chkDesktop.AutoSize = $true
    $chkDesktop.Location = New-Point 22 254
    $form.Controls.Add($chkDesktop)

    $chkLaunch = New-Object System.Windows.Forms.CheckBox
    $chkLaunch.Text = 'Pokreni SPT nakon instalacije'
    $chkLaunch.Checked = (-not $NoLaunch)
    $chkLaunch.AutoSize = $true
    $chkLaunch.Location = New-Point 22 280
    $form.Controls.Add($chkLaunch)

    $bar = New-Object System.Windows.Forms.ProgressBar
    $bar.Location = New-Point 22 322
    $bar.Size = New-Size 576 16
    $bar.Minimum = 0
    $bar.Maximum = 100
    $form.Controls.Add($bar)

    $status = New-Object System.Windows.Forms.Label
    $status.Text = 'Spremno za instalaciju.'
    $status.ForeColor = $cMuted
    $status.Location = New-Point 22 344
    $status.Size = New-Size 576 42
    $form.Controls.Add($status)

    $foot = New-Object System.Windows.Forms.Label
    $foot.Text = "$Signature · gnk-asg.hr/spt"
    $foot.Font = $fontSmall
    $foot.ForeColor = $cMuted
    $foot.AutoSize = $true
    $foot.Location = New-Point 22 405
    $form.Controls.Add($foot)

    $btnInstall = New-Object System.Windows.Forms.Button
    $btnInstall.Text = 'Instaliraj'
    $btnInstall.Font = $fontBold
    $btnInstall.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $btnInstall.FlatAppearance.BorderSize = 0
    $btnInstall.BackColor = $cCyan
    $btnInstall.ForeColor = $cHeader
    $btnInstall.Location = New-Point 390 396
    $btnInstall.Size = New-Size 110 32
    $form.Controls.Add($btnInstall)

    $btnCancel = New-Object System.Windows.Forms.Button
    $btnCancel.Text = 'Odustani'
    $btnCancel.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $btnCancel.FlatAppearance.BorderColor = $cMuted
    $btnCancel.BackColor = $cPanel
    $btnCancel.ForeColor = $cText
    $btnCancel.Location = New-Point 508 396
    $btnCancel.Size = New-Size 90 32
    $form.Controls.Add($btnCancel)

    $script:Ctx = @{
        Form = $form; Bar = $bar; Status = $status; Install = $btnInstall; Cancel = $btnCancel
        Browse = $btnBrowse; Desktop = $chkDesktop; Launch = $chkLaunch; Dir = $txtDir; State = 'ready'
    }

    $btnBrowse.Add_Click({
        $c = $script:Ctx
        $dlg = New-Object System.Windows.Forms.FolderBrowserDialog
        $dlg.Description = 'Odaberite mapu za SPT (unutar nje nastaje podmapa SPT).'
        $dlg.ShowNewFolderButton = $true
        if ($dlg.ShowDialog($c.Form) -eq [System.Windows.Forms.DialogResult]::OK) {
            $chosen = $dlg.SelectedPath.TrimEnd('\')
            if ((Split-Path -Leaf $chosen) -ne 'SPT') { $chosen = Join-Path $chosen 'SPT' }
            $parent = Split-Path -Parent $chosen
            if (-not (Test-WriteAccess -Dir $parent)) {
                [void][System.Windows.Forms.MessageBox]::Show($c.Form,
                    ("U mapu {0} nemate pravo pisanja (npr. Program Files traži administratora).`n`nOdaberite mapu unutar svog korisničkog profila." -f $parent),
                    $WindowTitle, [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Warning)
                return
            }
            $script:InstallDir = $chosen
            $c.Dir.Text = $chosen
        }
        $dlg.Dispose()
    })

    $btnInstall.Add_Click({
        $c = $script:Ctx
        if ($c.State -ne 'ready') { $c.Form.Close(); return }
        $c.State = 'busy'
        $script:Busy = $true
        foreach ($ctl in @($c.Install, $c.Cancel, $c.Browse, $c.Desktop, $c.Launch)) { $ctl.Enabled = $false }
        $script:Ui = $c
        try {
            $result = Install-Spt -DesktopShortcut $c.Desktop.Checked -LaunchAfter $c.Launch.Checked
            $script:ExitCode = 0
            $c.State = 'done'
            $msg = 'Gotovo! SPT 2.5 je instaliran. Pokrenite ga iz izbornika Start (SPT 2.5) ili prečacem na radnoj površini.'
            if (-not $result.Database) { $msg += ' Baza će se pripremiti pri prvom pokretanju.' }
            Set-Progress -Text $msg -Percent 100
            $c.Status.ForeColor = [System.Drawing.Color]::FromArgb(182, 240, 60)
            $c.Install.Text = 'Završi'
        } catch {
            $script:ExitCode = 1
            $c.State = 'failed'
            $err = $_.Exception.Message
            Write-Log ('GREŠKA: ' + ($_ | Out-String))
            $c.Bar.Style = [System.Windows.Forms.ProgressBarStyle]::Continuous
            $c.Status.Text = 'Instalacija nije uspjela. Zapis: ' + $LogFile
            $c.Status.ForeColor = [System.Drawing.Color]::FromArgb(255, 128, 128)
            [void][System.Windows.Forms.MessageBox]::Show($c.Form,
                ("Instalacija nije uspjela:`n`n{0}`n`nZapis instalacije: {1}`n`n{2}" -f $err, $LogFile, $Signature),
                $WindowTitle, [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
            $c.Install.Text = 'Zatvori'
        } finally {
            $script:Busy = $false
            $c.Install.Enabled = $true
            $c.Cancel.Visible = $false
        }
    })

    $btnCancel.Add_Click({
        $script:ExitCode = 1602
        $script:Ctx.Form.Close()
    })

    $form.Add_FormClosing({
        param($s, $e)
        if ($script:Busy) { $e.Cancel = $true }
    })

    $form.Add_Shown({
        $script:Ctx.Form.Activate()
    })

    $form.ResumeLayout($false)
    $form.PerformLayout()
    [void]$form.ShowDialog()
    $form.Dispose()
}

# ---------------------------------------------------------------------------
# glavni dio
# ---------------------------------------------------------------------------
try {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor [System.Net.SecurityProtocolType]::Tls12
} catch {
    Write-Log ('priprema okruženja: ' + $_.Exception.Message)
}

Write-Log ('SPT-Setup {0} | PowerShell {1} | {2} | tiho={3} | setup={4}' -f $SptVersion, $PSVersionTable.PSVersion, [Environment]::OSVersion.VersionString, [bool]$Silent, $SetupExe)

if ($Silent) {
    try {
        $r = Install-Spt -DesktopShortcut (-not $NoDesktopShortcut) -LaunchAfter $false
        Write-Log ('tiha instalacija je gotova: {0} ({1})' -f $r.Python, $r.Version)
        exit 0
    } catch {
        Write-Log ('GREŠKA: ' + ($_ | Out-String))
        exit 1
    }
}

[System.Windows.Forms.Application]::EnableVisualStyles()
Show-InstallerWindow
Write-Log ('kraj, izlazni kod {0}' -f $script:ExitCode)
exit $script:ExitCode
