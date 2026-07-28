# DNEVNA PROVJERA — do prelaska na pricuvni repozitorij
#
# Odraduje ono sto se moze odraditi samo, i ispise sto je ostalo na tebi.
# Nista ne mijenja na sajtu i ne pokrece prelazak.
#
# Rucno:
#   powershell -ExecutionPolicy Bypass -File scripts\dnevno.ps1 -Token <github_token>
#
# Da ga Windows pokrece sam svaki dan u 14:00 — pokreni JEDNOM, kao administrator:
#   schtasks /Create /SC DAILY /ST 14:00 /TN "GNK ASG dnevna provjera" /TR ^
#     "powershell -ExecutionPolicy Bypass -File C:\Users\gnk-a\Documents\gnk-asg-portal\scripts\dnevno.ps1 -Token <github_token>"
#
# Brisanje zadatka:  schtasks /Delete /TN "GNK ASG dnevna provjera" /F

param(
  [Parameter(Mandatory = $true)][string]$Token,
  [string]$Mapa = "C:\Users\gnk-a\Documents\gnk-asg-portal"
)

$ErrorActionPreference = "Continue"

function Naslov($t) { Write-Host "`n$t" -ForegroundColor White }
function Ok($t)     { Write-Host "  ok   $t" -ForegroundColor Green }
function Upoz($t)   { Write-Host "  !    $t" -ForegroundColor Yellow }
function Pad($t)    { Write-Host "  pad  $t" -ForegroundColor Red }
function Info($t)   { Write-Host "       $t" -ForegroundColor DarkGray }

Write-Host "`n=========================================" -ForegroundColor White
Write-Host " GNK ASG - dnevna provjera" -ForegroundColor White
Write-Host " $(Get-Date -Format 'dddd, dd.MM.yyyy. HH:mm')" -ForegroundColor DarkGray
Write-Host "=========================================" -ForegroundColor White

Set-Location $Mapa

# --------------------------------------------------- 1. lokalna kopija
Naslov "1. Osvjezavam lokalnu kopiju"
git fetch --quiet --all --prune 2>$null
$iza = (git rev-list --count HEAD..origin/main 2>$null)
if ($iza -and [int]$iza -gt 0) {
  Info "zaostajes $iza commitova, povlacim"
  git pull --ff-only --quiet
  if ($LASTEXITCODE -eq 0) { Ok "povuceno" } else { Pad "povlacenje nije uspjelo - provjeri rucno: git status" }
} else {
  Ok "vec si na najnovijem"
}
$zadnji = git log -1 --format="%ad  %s" --date=short
Info $zadnji

# --------------------------------------------------- 2. blog
Naslov "2. Prijenos na blog"
$q = Join-Path $Mapa "apps\portal\data\blog-content\queue.json"
if (Test-Path $q) {
  try {
    $d = Get-Content $q -Raw | ConvertFrom-Json
    $ukupno = $d.totalInRegistry
    $ceka   = $d.pending
    $gotovo = $ukupno - $ceka
    if ($ceka -gt 0) {
      $sati = [math]::Ceiling($ceka / 6)
      Ok "$gotovo od $ukupno preneseno, ceka jos $ceka"
      Info "pri 6 objava na sat, gotovo za oko $sati sati"
    } else {
      Ok "svih $ukupno tekstova je na blogu"
    }
    if ($d.failed -and $d.failed.Count -gt 0) { Upoz "$($d.failed.Count) objava nije proslo - pogledaj queue.json" }
  } catch { Upoz "ne mogu procitati queue.json" }
} else {
  Upoz "queue.json jos ne postoji"
}

# --------------------------------------------------- 3. rade li automatizacije
Naslov "3. Rade li automatizacije"
$h = @{ Authorization = "Bearer $Token"; Accept = "application/vnd.github+json" }
$radi = $true
try {
  $r = Invoke-RestMethod -Uri "https://api.github.com/repos/beckuphome-gnk/gnk-asg-portal/actions/runs?per_page=12" -Headers $h
  $zadnjih24 = $r.workflow_runs | Where-Object { [datetime]$_.created_at -gt (Get-Date).AddHours(-24).ToUniversalTime() }
  if ($zadnjih24.Count -eq 0) {
    $radi = $false
    Pad "u zadnja 24 sata nije bilo nijednog izvodenja"
    Upoz "moguce je da je racun potrosen - VRIJEME JE ZA PRELAZAK"
  } else {
    $pali = ($zadnjih24 | Where-Object { $_.conclusion -eq "failure" }).Count
    Ok "$($zadnjih24.Count) izvodenja u zadnja 24 sata"
    if ($pali -gt 0) { Upoz "$pali ih je palo - pogledaj Actions karticu" }
  }
} catch {
  Pad "ne mogu doci do GitHuba - provjeri token ili vezu"
  $radi = $false
}

# --------------------------------------------------- 4. spremnost pricuve
Naslov "4. Spremnost pricuvnog repozitorija"
if (Get-Command node -ErrorAction SilentlyContinue) {
  Info "za punu provjeru treba i token pricuvnog repozitorija:"
  Info '  $env:GITHUB_TOKEN="<masarykova_token>"; $env:TARGET_REPO="masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01"'
  Info "  node scripts\repo-switch-preflight.mjs"
} else {
  Upoz "node nije instaliran - skripte za prelazak nece raditi"
}

# --------------------------------------------------- sto je na tebi
Naslov "STO JE NA TEBI DANAS"
if (-not $radi) {
  Write-Host "  >> PRELAZAK <<" -ForegroundColor Red
  Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\prelazak.ps1 ``" -ForegroundColor White
  Write-Host "      -SourceToken <beckuphome> -TargetToken <masarykova> -Apply" -ForegroundColor White
  Info "bez -Apply prvo samo provjeri; trazit ce te da upises DA"
} else {
  Write-Host "  Nista hitno." -ForegroundColor Green
  Info "sve radi, pricuva je spremna, blog se puni sam"
  Info ""
  Info "kad dode dan prelaska, jedna naredba:"
  Info "  powershell -ExecutionPolicy Bypass -File scripts\prelazak.ps1 -SourceToken <beckuphome> -TargetToken <masarykova> -Apply"
}

Write-Host "`n-----------------------------------------" -ForegroundColor DarkGray
Write-Host " Otvoreno: male promjene na indexu, pa blueprint automatizacija." -ForegroundColor DarkGray
Write-Host "-----------------------------------------`n" -ForegroundColor DarkGray
