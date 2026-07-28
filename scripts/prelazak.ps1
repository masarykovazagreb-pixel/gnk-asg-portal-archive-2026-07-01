# PRELAZAK NA PRICUVNI REPOZITORIJ (Windows / PowerShell)
#
# Ista stvar kao scripts/prelazak.sh, ali radi bez bash-a. Cetiri koraka:
#   1. zrcaljenje       2. provjera       3. zamjena uloga       4. potvrda
#
# Ako GitHub Actions ne mogu pokrenuti zrcaljenje — potrosen racun, iskljucene
# Actions — skripta zrcali IZRAVNO s ovog racunala. Taj put nista ne trosi na
# GitHubu, pa prelazak ostaje moguc i kad automatizacije stanu.
#
#   powershell -ExecutionPolicy Bypass -File scripts\prelazak.ps1 `
#       -SourceToken <token_beckuphome> -TargetToken <token_masarykova>
#
#   dodaj -Apply za stvarni prelazak; bez njega samo provjerava

param(
  [Parameter(Mandatory = $true)][string]$SourceToken,
  [Parameter(Mandatory = $true)][string]$TargetToken,
  [string]$SourceRepo = "beckuphome-gnk/gnk-asg-portal",
  [string]$TargetRepo = "masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01",
  [switch]$Apply
)

$ErrorActionPreference = "Stop"

function Korak($t) { Write-Host "`n-- $t" -ForegroundColor White }
function Ok($t)    { Write-Host "  ok  $t" -ForegroundColor Green }
function Pad($t)   { Write-Host "  pad $t" -ForegroundColor Red }
function Info($t)  { Write-Host "  $t"     -ForegroundColor DarkGray }
function Upoz($t)  { Write-Host "  !   $t" -ForegroundColor Yellow }

function GhApi($Token, $Method, $Path, $Body) {
  $h = @{ Authorization = "Bearer $Token"; Accept = "application/vnd.github+json" }
  try {
    if ($Body) {
      return Invoke-WebRequest -Uri "https://api.github.com$Path" -Method $Method `
             -Headers $h -Body $Body -ContentType "application/json" -UseBasicParsing
    }
    return Invoke-WebRequest -Uri "https://api.github.com$Path" -Method $Method `
           -Headers $h -UseBasicParsing
  } catch {
    return $_.Exception.Response
  }
}

Write-Host "`nPRELAZAK NA PRICUVNI REPOZITORIJ" -ForegroundColor White
Write-Host "iz: $SourceRepo"
Write-Host "u:  $TargetRepo"
if (-not $Apply) { Upoz "Nacin: samo provjera. Dodaj -Apply za stvarni prelazak." }

foreach ($alat in @("git", "node")) {
  if (-not (Get-Command $alat -ErrorAction SilentlyContinue)) {
    Pad "$alat nije instaliran."
    exit 1
  }
}

# --------------------------- 1. ZRCALJENJE ---------------------------
Korak "1/4  Zrcaljenje"

function ZrcaliLokalno {
  Info "zrcalim izravno s ovog racunala (ne trosi GitHub Actions)"
  $tmp = Join-Path $env:TEMP ("zrcalo-" + (Get-Date -Format "yyyyMMddHHmmss"))
  git clone --quiet --mirror "https://x-access-token:$SourceToken@github.com/$SourceRepo.git" $tmp
  if ($LASTEXITCODE -ne 0) { Pad "ne mogu preuzeti radni repozitorij"; return $false }

  Push-Location $tmp
  git push --quiet --mirror "https://x-access-token:$TargetToken@github.com/$TargetRepo.git" 2>$null
  $uspjeh = ($LASTEXITCODE -eq 0)
  if (-not $uspjeh) {
    Info "puni zrcalni push odbijen, guram grane i oznake"
    git push --quiet --force "https://x-access-token:$TargetToken@github.com/$TargetRepo.git" `
        "refs/heads/*:refs/heads/*" "refs/tags/*:refs/tags/*" 2>$null
    $uspjeh = ($LASTEXITCODE -eq 0)
  }
  Pop-Location
  Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
  if ($uspjeh) { Ok "zrcaljeno lokalno" } else { Pad "zrcaljenje nije uspjelo" }
  return $uspjeh
}

if (-not $Apply) {
  Info "preskacem u nacinu provjere"
} else {
  $r = GhApi $SourceToken "POST" `
       "/repos/$SourceRepo/actions/workflows/mirror-sync-masarykova.yml/dispatches" `
       '{"ref":"main"}'
  if ($r.StatusCode -eq 204) {
    Ok "zrcaljenje pokrenuto preko GitHuba, cekam"
    Start-Sleep -Seconds 75
  } else {
    Upoz "GitHub ne moze pokrenuti zrcaljenje - idem lokalno"
    if (-not (ZrcaliLokalno)) { Pad "bez svjeze pricuve ne idem dalje"; exit 1 }
  }
}

# --------------------------- 2. PROVJERA -----------------------------
Korak "2/4  Provjera spremnosti"
$env:GITHUB_TOKEN = $TargetToken
$env:TARGET_REPO  = $TargetRepo
node scripts/repo-switch-preflight.mjs
if ($LASTEXITCODE -ne 0) { Pad "provjera nije prosla - prelazak zaustavljen"; exit 1 }

# --------------------------- 3. ZAMJENA ------------------------------
Korak "3/4  Zamjena uloga"
$env:SOURCE_REPO  = $SourceRepo
$env:TARGET_REPO  = $TargetRepo
$env:SOURCE_TOKEN = $SourceToken
$env:TARGET_TOKEN = $TargetToken

if (-not $Apply) {
  node scripts/repo-switch-execute.mjs
  Write-Host "`nProvjera gotova. Za stvarni prelazak dodaj -Apply`n" -ForegroundColor Yellow
  exit 0
}

$potvrda = Read-Host "`n  Prebacujem automatizacije na pricuvni repozitorij. Upisi DA za nastavak"
if ($potvrda -ne "DA") { Write-Host "  Prekinuto."; exit 0 }

node scripts/repo-switch-execute.mjs --apply
if ($LASTEXITCODE -ne 0) { Pad "zamjena nije prosla u cijelosti - provjeri rucno"; exit 1 }

# --------------------------- 4. POTVRDA ------------------------------
Korak "4/4  Potvrda - prvi prolaz bloga"
$r = GhApi $TargetToken "POST" `
     "/repos/$TargetRepo/actions/workflows/blog-mirror-publish.yml/dispatches" `
     '{"ref":"main"}'
if ($r.StatusCode -ne 204) {
  Upoz "ne mogu pokrenuti blog - pokreni ga rucno i provjeri"
} else {
  Ok "blog pokrenut, cekam ishod"
  Start-Sleep -Seconds 90
  $runs = GhApi $TargetToken "GET" `
          "/repos/$TargetRepo/actions/workflows/blog-mirror-publish.yml/runs?per_page=1" $null
  $ishod = ($runs.Content | ConvertFrom-Json).workflow_runs[0].conclusion
  switch ($ishod) {
    "success" { Ok "blog radi iz pricuvnog repozitorija" }
    $null     { Upoz "jos se izvodi - provjeri za koju minutu" }
    default   { Pad "blog je javio: $ishod - provjeri queue.json" }
  }
}

Write-Host "`nPrelazak dovrsen." -ForegroundColor Green
Write-Host "Automatizacije rade u: $TargetRepo"
Write-Host "Radni repozitorij $SourceRepo ostaje netaknut, s tajnama i kodom.`n"
