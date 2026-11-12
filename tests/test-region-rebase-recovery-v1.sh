#!/usr/bin/env bash
set -euo pipefail
ROOT="$(pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
git -C "$TMP" init -q
git -C "$TMP" config user.email 'test@example.invalid'
git -C "$TMP" config user.name 'Test Writer'
git -C "$TMP" config rerere.enabled false
mkdir -p "$TMP/apps/portal/gnk-aktual" "$TMP/apps/portal/en/gnk-aktual" "$TMP/scripts" "$TMP/src" "$TMP/fake-bin"
cp "$ROOT/scripts/recover-region-homepage-rebase-v1.sh" "$TMP/scripts/"
printf 'original hr\n' > "$TMP/apps/portal/gnk-aktual/index.html"
printf 'original en\n' > "$TMP/apps/portal/en/gnk-aktual/index.html"
printf 'base\n' > "$TMP/src/region.json"
printf 'base source\n' > "$TMP/src/source.txt"
git -C "$TMP" add . && git -C "$TMP" commit -qm base
git -C "$TMP" branch -m main
git -C "$TMP" checkout -qb region
printf 'generated HR old batch\n' > "$TMP/apps/portal/gnk-aktual/index.html"
printf 'generated EN old batch\n' > "$TMP/apps/portal/en/gnk-aktual/index.html"
printf 'updated authentic archive\n' > "$TMP/src/region.json"
git -C "$TMP" add . && git -C "$TMP" commit -qm 'Region generated batch'
git -C "$TMP" checkout -q main
printf 'canonical main HR update\n' > "$TMP/apps/portal/gnk-aktual/index.html"
printf 'canonical main EN update\n' > "$TMP/apps/portal/en/gnk-aktual/index.html"
git -C "$TMP" add . && git -C "$TMP" commit -qm 'Other main writer changed homepage'
MAIN_SHA="$(git -C "$TMP" rev-parse HEAD)"
git -C "$TMP" checkout -q region
# The production script has only three known child node commands. Fake their
# already separately tested output here to isolate deterministic git behavior.
cat > "$TMP/fake-bin/node" <<'FAKE_NODE'
#!/usr/bin/env bash
set -euo pipefail
case "$1" in
  apps/region/engine/hub.mjs)
    test "$(cat src/region.json)" = 'updated authentic archive'
    printf 'recompiled main+region HR\n' > apps/portal/gnk-aktual/index.html
    printf 'recompiled main+region EN\n' > apps/portal/en/gnk-aktual/index.html
    ;;
  scripts/check-hub-counts-v1.mjs|scripts/build-network-counts-v1.mjs) exit 0 ;;
  *) echo "Unexpected node command $*" >&2; exit 1 ;;
esac
FAKE_NODE
chmod +x "$TMP/fake-bin/node"
cd "$TMP"
if git rebase main >rebase-first.log 2>&1; then
 echo 'Expected generated homepage conflicts' >&2; exit 1
fi
PATH="$TMP/fake-bin:$PATH" bash scripts/recover-region-homepage-rebase-v1.sh
test "$(cat apps/portal/gnk-aktual/index.html)" = 'recompiled main+region HR'
test "$(cat apps/portal/en/gnk-aktual/index.html)" = 'recompiled main+region EN'
test "$(cat src/region.json)" = 'updated authentic archive'
git merge-base --is-ancestor "$MAIN_SHA" HEAD
test -z "$(git diff --name-only --diff-filter=U)"
# Confirm the safety gate rejects non-homepage conflicts.
git checkout -qb wrong-source main
printf 'region source edit\n' > src/source.txt
git add . && git commit -qm 'region source edit'
git checkout -q main
printf 'new competing main source edit\n' > src/source.txt
git add . && git commit -qm 'main source edit'
git checkout -q wrong-source
if git rebase main >rebase-second.log 2>&1; then
 echo 'Expected source conflict' >&2; exit 1
fi
if PATH="$TMP/fake-bin:$PATH" bash scripts/recover-region-homepage-rebase-v1.sh; then
 echo 'Helper unexpectedly auto-resolved a source conflict' >&2; exit 1
fi
git rebase --abort
echo 'PASS: safely recovers generated HTML only; refuses source conflicts'
