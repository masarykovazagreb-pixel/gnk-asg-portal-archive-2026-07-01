#!/usr/bin/env bash
# Recover ONLY two generated AKTUAL homepages after a REGION rebase conflict.
# All other conflicts fail closed.
set -euo pipefail
mapfile -t unresolved < <(git diff --name-only --diff-filter=U)
expected_hr='apps/portal/gnk-aktual/index.html'
expected_en='apps/portal/en/gnk-aktual/index.html'
if [ "${#unresolved[@]}" -eq 0 ]; then
  echo "::error::No active rebase conflicts to recover."
  exit 1
fi
for file in "${unresolved[@]}"; do
  case "$file" in
    "$expected_hr"|"$expected_en") ;;
    *) echo "::error::Unsafe conflict outside generated AKTUAL homepages: $file"; exit 1 ;;
  esac
done
# Rebase ours=latest main. Preserve it, then regenerate page content from
# the rebased archive and fresh canonical counts.
for file in "${unresolved[@]}"; do
  git checkout --ours -- "$file"
  git add -- "$file"
done
GIT_EDITOR=true git -c core.editor=true rebase --continue
if [ -n "$(git diff --name-only --diff-filter=U)" ]; then
  echo "::error::Unresolved conflicts after generated-page recovery."
  exit 1
fi
node apps/region/engine/hub.mjs
node scripts/check-hub-counts-v1.mjs
node scripts/build-network-counts-v1.mjs --check
git add -- "$expected_hr" "$expected_en"
if ! git diff --cached --quiet; then
  git -c user.name="AKTUAL MEDIA REGION" -c user.email="info@gnk-asg.hr" commit --amend --no-edit
fi
echo "REGION safely rebased regenerated HR/EN homepages."
