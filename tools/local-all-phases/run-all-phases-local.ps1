param(
    [switch]$IncludeNetwork
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RepoRoot = (& git rev-parse --show-toplevel 2>$null).Trim()
if (-not $RepoRoot) {
    throw 'Pokreni skriptu unutar lokalnog klona repozitorija.'
}

Set-Location -LiteralPath $RepoRoot

$ManifestPath = Join-Path $RepoRoot 'tools\local-all-phases\test-manifest.json'
if (-not (Test-Path -LiteralPath $ManifestPath)) {
    throw "Nedostaje manifest: $ManifestPath"
}

$Manifest = Get-Content -LiteralPath $ManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$CurrentBranch = (& git branch --show-current).Trim()
if ($CurrentBranch -ne $Manifest.branch) {
    throw "Aktivna grana je '$CurrentBranch'. Očekivana grana je '$($Manifest.branch)'."
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js nije pronađen u PATH-u.'
}

$Stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$ReportRoot = Join-Path $RepoRoot "reports\local-all-phases\$Stamp"
New-Item -ItemType Directory -Path $ReportRoot -Force | Out-Null

$Results = New-Object System.Collections.Generic.List[object]
$GitStatus = @(& git status --short)
$NodeVersion = (& node --version).Trim()
$GitVersion = (& git --version).Trim()

function Invoke-NodeCheck {
    param(
        [string]$Group,
        [string]$ScriptPath,
        [string[]]$Arguments = @()
    )

    $Started = Get-Date
    $Output = @()
    $ExitCode = 127

    if (-not (Test-Path -LiteralPath $ScriptPath)) {
        $Output = @("Missing: $ScriptPath")
    }
    else {
        $Output = @(& node @Arguments $ScriptPath 2>&1 | ForEach-Object { $_.ToString() })
        $ExitCode = $LASTEXITCODE
    }

    $Duration = [int]((Get-Date) - $Started).TotalMilliseconds
    $Results.Add([pscustomobject]@{
        Group = $Group
        Target = $ScriptPath
        Arguments = ($Arguments -join ' ')
        ExitCode = $ExitCode
        Passed = ($ExitCode -eq 0)
        DurationMs = $Duration
        Output = $Output
    })
}

foreach ($Audit in $Manifest.offlineAudits) {
    Invoke-NodeCheck -Group 'offline-audit' -ScriptPath ([string]$Audit)
}

foreach ($Root in $Manifest.testRoots) {
    $RootPath = Join-Path $RepoRoot ([string]$Root)
    if (-not (Test-Path -LiteralPath $RootPath)) {
        $Results.Add([pscustomobject]@{
            Group = 'test-root'
            Target = [string]$Root
            Arguments = ''
            ExitCode = 127
            Passed = $false
            DurationMs = 0
            Output = @("Missing test root: $Root")
        })
        continue
    }

    $Tests = Get-ChildItem -LiteralPath $RootPath -File -Recurse |
        Where-Object { $_.Name -match '\.(test|spec)\.(js|mjs|cjs)$' } |
        Sort-Object FullName

    foreach ($Test in $Tests) {
        $Relative = [System.IO.Path]::GetRelativePath($RepoRoot, $Test.FullName)
        Invoke-NodeCheck -Group 'node-test' -ScriptPath $Relative -Arguments @('--test')
    }
}

if ($IncludeNetwork) {
    foreach ($Audit in $Manifest.networkAudits) {
        Invoke-NodeCheck -Group 'network-read-only' -ScriptPath ([string]$Audit)
    }
}

$Failed = @($Results | Where-Object { -not $_.Passed })
$Passed = @($Results | Where-Object { $_.Passed })
$Head = (& git rev-parse HEAD).Trim()

$Summary = [pscustomobject]@{
    GeneratedAt = (Get-Date).ToString('o')
    Branch = $CurrentBranch
    Head = $Head
    ReadOnly = $true
    ProductionWrites = $false
    IncludeNetwork = [bool]$IncludeNetwork
    NodeVersion = $NodeVersion
    GitVersion = $GitVersion
    WorkingTreeDirty = ($GitStatus.Count -gt 0)
    WorkingTreeStatus = $GitStatus
    Total = $Results.Count
    Passed = $Passed.Count
    Failed = $Failed.Count
    ReportRoot = $ReportRoot
}

$Summary | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $ReportRoot 'summary.json') -Encoding UTF8
$Results | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $ReportRoot 'results.json') -Encoding UTF8

$Rows = foreach ($Result in $Results) {
    $State = if ($Result.Passed) { 'PASS' } else { 'FAIL' }
    $Target = ([string]$Result.Target).Replace('|', '\|')
    "| $State | $($Result.Group) | $Target | $($Result.ExitCode) | $($Result.DurationMs) ms |"
}

$Markdown = @"
# GNK ASG Local All-Phases Audit

- Generated: $($Summary.GeneratedAt)
- Branch: $($Summary.Branch)
- Head: $($Summary.Head)
- Read-only: YES
- Production writes: NO
- Network checks: $($Summary.IncludeNetwork)
- Working tree dirty: $($Summary.WorkingTreeDirty)
- Passed: $($Summary.Passed)/$($Summary.Total)
- Failed: $($Summary.Failed)

| Result | Group | Target | Exit | Time |
|---|---|---|---:|---:|
$($Rows -join "`n")
"@

$Markdown | Set-Content -LiteralPath (Join-Path $ReportRoot 'summary.md') -Encoding UTF8

Write-Host "ReportRoot: $ReportRoot"
Write-Host "Passed: $($Summary.Passed)"
Write-Host "Failed: $($Summary.Failed)"

if ($Summary.Failed -gt 0) {
    exit 1
}

exit 0
