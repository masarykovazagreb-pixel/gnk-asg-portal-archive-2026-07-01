#!/usr/bin/env bash
# Recover existing receipts only. Bootstrap is a separate, deliberate setup;
# an absent/deleted branch or transport error never means an empty history.
set -euo pipefail
branch=${1:?state branch required}
file=${2:?state file required}
reviewed=${3:?reviewed SHA required}
git fetch origin main --no-tags
test "$(git rev-parse origin/main)" = "$reviewed" || {
  echo '::error::Main changed after review; no external publication.' >&2; exit 1;
}
remote="$(git ls-remote --heads origin "refs/heads/$branch")" || {
  echo '::error::Cannot inspect receipt branch; no external publication.' >&2; exit 1;
}
test -n "$remote" || {
  echo '::error::Receipt branch missing. Initialize or restore it explicitly before live publication.' >&2; exit 1;
}
git fetch origin "refs/heads/$branch:refs/remotes/origin/$branch" --no-tags
old=$(git rev-parse "refs/remotes/origin/$branch")
tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
git show "refs/remotes/origin/$branch:$file" > "$tmp"
node --input-type=module - "$tmp" <<'NODE'
import {readDistributionState} from './scripts/distribution-safety-v1.mjs';
readDistributionState(process.argv[2]);
NODE
git checkout -B "$branch" "$reviewed"
mkdir -p "$(dirname "$file")"
cp "$tmp" "$file"
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  printf 'remote_sha=%s\nready=true\n' "$old" >> "$GITHUB_OUTPUT"
fi
