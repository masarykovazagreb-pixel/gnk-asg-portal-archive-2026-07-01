#!/usr/bin/env bash
#
# PRELAZAK NA PRIČUVNI REPOZITORIJ
#
# Izvodi sva četiri koraka redom:
#   1. zrcaljenje       — da pričuva ima najsvježije stanje
#   2. provjera         — je li sve na mjestu
#   3. zamjena uloga    — gasi automatizacije u radnom, pali u pričuvnom
#   4. potvrda          — je li prvi prolaz bloga prošao
#
# Zrcaljenje ide preko GitHub Actionsa ako rade. Ako ne rade — potrošen račun,
# isključene Actions — skripta zrcali IZRAVNO s ovog računala. Taj put ne troši
# ništa na GitHubu i uvijek je dostupan.
#
# Priprema (jednom):
#   export SOURCE_TOKEN=<token s pristupom beckuphome repozitoriju>
#   export TARGET_TOKEN=<token s pristupom masarykova repozitoriju>
#
# Pokretanje:
#   bash scripts/prelazak.sh              # sve provjeri, ništa ne mijenja
#   bash scripts/prelazak.sh --apply      # stvarni prelazak
#
set -uo pipefail

SOURCE_REPO="${SOURCE_REPO:-beckuphome-gnk/gnk-asg-portal}"
TARGET_REPO="${TARGET_REPO:-masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01}"
SOURCE_TOKEN="${SOURCE_TOKEN:-${GITHUB_TOKEN:-}}"
TARGET_TOKEN="${TARGET_TOKEN:-${GITHUB_TOKEN:-}}"
APPLY=0
[[ "${1:-}" == "--apply" ]] && APPLY=1

G="\033[32m"; R="\033[31m"; Y="\033[33m"; B="\033[1m"; D="\033[2m"; X="\033[0m"
korak(){ echo -e "\n${B}── $1 ${X}"; }
ok(){   echo -e "  ${G}ok ${X} $1"; }
pad(){  echo -e "  ${R}pad${X} $1"; }
info(){ echo -e "  ${D}$1${X}"; }
upoz(){ echo -e "  ${Y}!  ${X} $1"; }

if [[ -z "$SOURCE_TOKEN" || -z "$TARGET_TOKEN" ]]; then
  echo -e "${R}Postavi SOURCE_TOKEN i TARGET_TOKEN (ili GITHUB_TOKEN za oba).${X}"
  exit 1
fi

gh_api(){ # token metoda putanja [tijelo]
  local t="$1" m="$2" p="$3" b="${4:-}"
  if [[ -n "$b" ]]; then
    curl -sS -m 30 -X "$m" -H "authorization: Bearer $t" \
      -H "accept: application/vnd.github+json" -d "$b" "https://api.github.com$p" -w '\n%{http_code}'
  else
    curl -sS -m 30 -X "$m" -H "authorization: Bearer $t" \
      -H "accept: application/vnd.github+json" "https://api.github.com$p" -w '\n%{http_code}'
  fi
}
zadnji_red(){ tail -n1; }

echo -e "${B}PRELAZAK NA PRIČUVNI REPOZITORIJ${X}"
echo "iz: $SOURCE_REPO"
echo "u:  $TARGET_REPO"
[[ $APPLY -eq 0 ]] && echo -e "${Y}Način: samo provjera. Dodaj --apply za stvarni prelazak.${X}"

# ───────────────────────────── 1. ZRCALJENJE ─────────────────────────────
korak "1/4  Zrcaljenje — pričuva mora imati najsvježije stanje"

zrcali_lokalno(){
  info "zrcalim izravno s ovog računala (ne troši GitHub Actions)"
  local tmp; tmp="$(mktemp -d)"
  if ! git clone --quiet --mirror \
        "https://x-access-token:${SOURCE_TOKEN}@github.com/${SOURCE_REPO}.git" "$tmp/m.git"; then
    pad "ne mogu preuzeti radni repozitorij"; rm -rf "$tmp"; return 1
  fi
  if git -C "$tmp/m.git" push --quiet --mirror \
        "https://x-access-token:${TARGET_TOKEN}@github.com/${TARGET_REPO}.git" 2>/dev/null; then
    ok "zrcaljeno lokalno"; rm -rf "$tmp"; return 0
  fi
  # Zrcalni push zna odbiti skrivene reference (refs/pull/*) — to nije greška.
  info "puni zrcalni push odbijen, guram grane i oznake"
  if git -C "$tmp/m.git" push --quiet --force \
        "https://x-access-token:${TARGET_TOKEN}@github.com/${TARGET_REPO}.git" \
        'refs/heads/*:refs/heads/*' 'refs/tags/*:refs/tags/*' 2>/dev/null; then
    ok "zrcaljene grane i oznake"; rm -rf "$tmp"; return 0
  fi
  pad "zrcaljenje nije uspjelo"; rm -rf "$tmp"; return 1
}

if [[ $APPLY -eq 0 ]]; then
  info "preskačem u načinu provjere"
else
  kod=$(gh_api "$SOURCE_TOKEN" POST \
    "/repos/${SOURCE_REPO}/actions/workflows/mirror-sync-masarykova.yml/dispatches" \
    '{"ref":"main"}' | zadnji_red)
  if [[ "$kod" == "204" ]]; then
    ok "zrcaljenje pokrenuto preko GitHuba, čekam"
    sleep 75
  else
    upoz "GitHub ne može pokrenuti zrcaljenje (odgovor $kod)"
    zrcali_lokalno || { pad "bez svježe pričuve ne idem dalje"; exit 1; }
  fi
fi

# ───────────────────────────── 2. PROVJERA ───────────────────────────────
korak "2/4  Provjera spremnosti"
if ! GITHUB_TOKEN="$TARGET_TOKEN" TARGET_REPO="$TARGET_REPO" \
     node scripts/repo-switch-preflight.mjs; then
  pad "provjera nije prošla — prelazak zaustavljen"
  exit 1
fi

# ───────────────────────────── 3. ZAMJENA ────────────────────────────────
korak "3/4  Zamjena uloga"
if [[ $APPLY -eq 0 ]]; then
  SOURCE_REPO="$SOURCE_REPO" TARGET_REPO="$TARGET_REPO" \
  SOURCE_TOKEN="$SOURCE_TOKEN" TARGET_TOKEN="$TARGET_TOKEN" \
    node scripts/repo-switch-execute.mjs
  echo
  echo -e "${Y}Provjera gotova. Za stvarni prelazak: bash scripts/prelazak.sh --apply${X}"
  exit 0
fi

echo
read -r -p "  Prebacujem automatizacije na pričuvni repozitorij. Upiši DA za nastavak: " potvrda
[[ "$potvrda" == "DA" ]] || { echo "  Prekinuto."; exit 0; }

if ! SOURCE_REPO="$SOURCE_REPO" TARGET_REPO="$TARGET_REPO" \
     SOURCE_TOKEN="$SOURCE_TOKEN" TARGET_TOKEN="$TARGET_TOKEN" \
     node scripts/repo-switch-execute.mjs --apply; then
  pad "zamjena nije prošla u cijelosti — provjeri ručno prije nego nastaviš"
  exit 1
fi

# ───────────────────────────── 4. POTVRDA ────────────────────────────────
korak "4/4  Potvrda — prvi prolaz bloga u pričuvnom repozitoriju"
kod=$(gh_api "$TARGET_TOKEN" POST \
  "/repos/${TARGET_REPO}/actions/workflows/blog-mirror-publish.yml/dispatches" \
  '{"ref":"main"}' | zadnji_red)
if [[ "$kod" != "204" ]]; then
  upoz "ne mogu pokrenuti blog (odgovor $kod) — pokreni ga ručno i provjeri"
else
  ok "blog pokrenut, čekam ishod"
  sleep 90
  ishod=$(curl -sS -m 30 -H "authorization: Bearer $TARGET_TOKEN" \
    "https://api.github.com/repos/${TARGET_REPO}/actions/workflows/blog-mirror-publish.yml/runs?per_page=1" \
    | grep -o '"conclusion":"[^"]*"' | head -1 | cut -d'"' -f4)
  case "$ishod" in
    success) ok "blog radi iz pričuvnog repozitorija" ;;
    "")      upoz "još se izvodi — provjeri za koju minutu" ;;
    *)       pad "blog je javio: $ishod — provjeri queue.json" ;;
  esac
fi

echo
echo -e "${G}${B}Prelazak dovršen.${X}"
echo "Automatizacije rade u: $TARGET_REPO"
echo "Radni repozitorij $SOURCE_REPO ostaje netaknut, s tajnama i kodom, bez uključenih automatizacija."
