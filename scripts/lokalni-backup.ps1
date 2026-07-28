# Osvjezavanje lokalne kopije repozitorija (Windows / PowerShell)
#
# Pokreni na svom racunalu. Skripta preuzme najsvjezije stanje s GitHuba i
# osvjezi lokalnu mapu. Staru kopiju NE brise nego preimenuje, pa se uvijek
# mozes vratiti ako nesto pode po zlu.
#
#   powershell -ExecutionPolicy Bypass -File scripts\lokalni-backup.ps1 -Token <tvoj_token>
#
# Neobavezno:
#   -Mapa   "C:\Users\gnk-a\Documents\gnk-asg-portal"   (zadano)
#   -Cuvaj  3        koliko starih kopija zadrzati (zadano 3)

param(
  [Parameter(Mandatory = $true)][string]$Token,
  [string]$Mapa  = "C:\Users\gnk-a\Documents\gnk-asg-portal",
  [string]$Repo  = "beckuphome-gnk/gnk-asg-portal",
  [int]$Cuvaj    = 3
)

$ErrorActionPreference = "Stop"

function Info($t) { Write-Host "  $t" -ForegroundColor DarkGray }
function Ok($t)   { Write-Host "  ok  $t" -ForegroundColor Green }
function Upoz($t) { Write-Host "  !   $t" -ForegroundColor Yellow }
function Pad($t)  { Write-Host "  pad $t" -ForegroundColor Red }

Write-Host "`nOSVJEZAVANJE LOKALNE KOPIJE" -ForegroundColor White
Write-Host "repozitorij: $Repo"
Write-Host "mapa:        $Mapa`n"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Pad "git nije instaliran. Preuzmi ga s https://git-scm.com/download/win"
  exit 1
}

$url = "https://x-access-token:$Token@github.com/$Repo.git"

# Ako je mapa vec git repozitorij — samo je osvjezi, bez ponovnog preuzimanja.
if (Test-Path (Join-Path $Mapa ".git")) {
  Info "mapa je git repozitorij, osvjezavam na mjestu"
  Push-Location $Mapa
  try {
    git remote set-url origin $url 2>$null
    git fetch --all --prune --quiet
    git reset --hard origin/main --quiet
    git clean -fd --quiet
    $zadnji = git log -1 --format="%ad  %s" --date=short
    Ok "osvjezeno na: $zadnji"
  } catch {
    Pad "osvjezavanje nije uspjelo: $_"
    exit 1
  } finally {
    Pop-Location
  }
  exit 0
}

# Inace: nova kopija, a stara se preimenuje umjesto da se brise.
$roditelj = Split-Path $Mapa -Parent
$ime      = Split-Path $Mapa -Leaf
$pecat    = Get-Date -Format "yyyyMMdd-HHmm"

if (Test-Path $Mapa) {
  $staro = Join-Path $roditelj "$ime.staro-$pecat"
  Info "postojecu mapu premjestam u: $staro"
  Move-Item -Path $Mapa -Destination $staro
}

Info "preuzimam svjezu kopiju"
git clone --quiet $url $Mapa
if ($LASTEXITCODE -ne 0) {
  Pad "preuzimanje nije uspjelo"
  # vrati staru kopiju ako je bila premjestena
  if ($staro -and (Test-Path $staro)) { Move-Item -Path $staro -Destination $Mapa }
  exit 1
}

Push-Location $Mapa
$zadnji = git log -1 --format="%ad  %s" --date=short
Pop-Location
Ok "preuzeto, zadnja izmjena: $zadnji"

# Zadrzi samo zadnjih nekoliko starih kopija.
$stare = Get-ChildItem -Path $roditelj -Directory -Filter "$ime.staro-*" |
         Sort-Object Name -Descending
if ($stare.Count -gt $Cuvaj) {
  $stare | Select-Object -Skip $Cuvaj | ForEach-Object {
    Info "brisem staru kopiju: $($_.Name)"
    Remove-Item -Recurse -Force $_.FullName
  }
}

Write-Host "`nGotovo. Stare kopije stoje uz novu, zadnjih $Cuvaj.`n" -ForegroundColor Green
