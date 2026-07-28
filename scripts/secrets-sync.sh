#!/usr/bin/env bash
#
# Upis svih tajni iz jedne naredbe.
#
# Tajne žive na dva odvojena mjesta i postavljaju se različitim alatima:
#   GitHub repozitoriji  ->  gh secret set
#   Cloudflare Worker    ->  wrangler secret put
#
# wrangler NE zna za GitHub, a gh NE zna za Cloudflare. Ovaj skript vodi oboje.
#
# Priprema:
#   1. cp ops/repo-switch/secrets.example.env ops/repo-switch/secrets.local.env
#   2. upiši vrijednosti u secrets.local.env  (datoteka je u .gitignore)
#   3. gh auth login          # jednom
#      npx wrangler login     # jednom
#
# Pokretanje:
#   bash scripts/secrets-sync.sh            # prikaz, ništa se ne mijenja
#   bash scripts/secrets-sync.sh --apply    # stvarni upis
#
set -uo pipefail

ENV_FILE="${SECRETS_FILE:-ops/repo-switch/secrets.local.env}"
REPO_MAIN="beckuphome-gnk/gnk-asg-portal"
REPO_BACKUP="masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01"
WORKER="gnk-asg-direct-operator"
APPLY=0
[[ "${1:-}" == "--apply" ]] && APPLY=1

G="\033[32m"; R="\033[31m"; Y="\033[33m"; D="\033[2m"; X="\033[0m"

if [[ ! -f "$ENV_FILE" ]]; then
  echo -e "${R}Nema $ENV_FILE${X}"
  echo "Kopiraj predložak i upiši vrijednosti:"
  echo "  cp ops/repo-switch/secrets.example.env $ENV_FILE"
  exit 1
fi

# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

# Tajne koje idu u OBA GitHub repozitorija.
GITHUB_SECRETS=(
  BLOGGER_BLOG_ID BLOGGER_CLIENT_ID BLOGGER_CLIENT_SECRET BLOGGER_REFRESH_TOKEN
  CLOUDFLARE_ACCOUNT_ID CLOUDFLARE_API_TOKEN
  GNK_ASG_ADMIN_TOKEN GNK_ASG_OPERATOR_TOKEN OPERATOR_TOKEN
  MASARYKOVA_MIRROR_TOKEN MASARYKOVA_BACKUP_TOKEN
)

# Tajne koje idu u Cloudflare Worker. OPERATOR_TOKEN mora biti ista vrijednost
# kao u GitHubu — Worker uspoređuje zaglavlje x-operator-token s njom.
WORKER_SECRETS=( OPENAI_API_KEY OPERATOR_TOKEN )

if [[ $APPLY -eq 0 ]]; then
  echo -e "${Y}SAMO PRIKAZ — ništa se ne mijenja. Dodaj --apply za stvarni upis.${X}"
else
  echo -e "${R}STVARNI UPIS${X}"
fi
echo

missing=0
echo "GITHUB  ->  $REPO_MAIN  +  $REPO_BACKUP"
for name in "${GITHUB_SECRETS[@]}"; do
  value="${!name:-}"
  if [[ -z "$value" ]]; then
    echo -e "  ${Y}preskačem${X} $name ${D}(nema vrijednosti u $ENV_FILE)${X}"
    missing=$((missing + 1))
    continue
  fi
  if [[ $APPLY -eq 0 ]]; then
    echo -e "  ${D}upisao bi${X} $name ${D}(${#value} znakova)${X}"
    continue
  fi
  ok=1
  for repo in "$REPO_MAIN" "$REPO_BACKUP"; do
    if printf '%s' "$value" | gh secret set "$name" --repo "$repo" --body - >/dev/null 2>&1; then
      :
    else
      ok=0
      echo -e "  ${R}pad${X} $name -> $repo"
    fi
  done
  [[ $ok -eq 1 ]] && echo -e "  ${G}ok ${X} $name"
done

echo
echo "CLOUDFLARE WORKER  ->  $WORKER"
for name in "${WORKER_SECRETS[@]}"; do
  value="${!name:-}"
  if [[ -z "$value" ]]; then
    echo -e "  ${Y}preskačem${X} $name ${D}(nema vrijednosti)${X}"
    missing=$((missing + 1))
    continue
  fi
  if [[ $APPLY -eq 0 ]]; then
    echo -e "  ${D}upisao bi${X} $name ${D}(${#value} znakova)${X}"
    continue
  fi
  if printf '%s' "$value" | npx wrangler secret put "$name" --name "$WORKER" >/dev/null 2>&1; then
    echo -e "  ${G}ok ${X} $name"
  else
    echo -e "  ${R}pad${X} $name ${D}(provjeri: npx wrangler login)${X}"
  fi
done

echo
echo "------------------------------------------------------------"
if [[ $APPLY -eq 0 ]]; then
  echo "Za stvarni upis: bash scripts/secrets-sync.sh --apply"
else
  echo -e "${G}Gotovo.${X} Provjera:"
  echo "  gh secret list --repo $REPO_MAIN"
  echo "  gh secret list --repo $REPO_BACKUP"
  echo "  npx wrangler secret list --name $WORKER"
fi
[[ $missing -gt 0 ]] && echo -e "${Y}$missing stavki nema vrijednost — dopuni $ENV_FILE pa ponovi.${X}"
exit 0
