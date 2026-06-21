param(
    [string]$Workspace = 'G:\GNK\gnk-asg-portal',
    [switch]$IncludeNetwork
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ExpectedBranch = 'experience-ai-live-overview'

if (-not (Test-Path -LiteralPath $Workspace)) {
    throw "Lokalni klon nije pronađen: $Workspace"
}

Set-Location -LiteralPath $Workspace

$TopLevel = (& git rev-parse --show-toplevel 2>$null).Trim()
if (-not $TopLevel) {
    throw "Mapa nije Git repozitorij: $Workspace"
}

$CurrentBranch = (& git branch --show-current).Trim()
if ($CurrentBranch -ne $ExpectedBranch) {
    throw "Aktivna grana je '$CurrentBranch'. Očekivana grana je '$ExpectedBranch'."
}

$Runner = Join-Path $Workspace 'tools\local-all-phases\run-all-phases-local.ps1'
if (-not (Test-Path -LiteralPath $Runner)) {
    throw "Nedostaje lokalni runner: $Runner"
}

$Status = @(& git status --short)
Write-Host "Workspace: $Workspace"
Write-Host "Branch: $CurrentBranch"
Write-Host "Head: $((& git rev-parse HEAD).Trim())"
Write-Host "WorkingTreeDirty: $($Status.Count -gt 0)"

if ($IncludeNetwork) {
    & $Runner -IncludeNetwork
}
else {
    & $Runner
}

exit $LASTEXITCODE
