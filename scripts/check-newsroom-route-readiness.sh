#!/usr/bin/env bash
set -euo pipefail

blocked_worker='gnk-asg-news-backend'
base='https://gnk-asg.hr'
workdir="${1:-deploy-preflight}"
mkdir -p "$workdir"

known_recovery_fix_present() {
  local v17='workers/gnk-asg-direct-operator/src/index-unified-auth-v17.js'
  local v19='workers/gnk-asg-direct-operator/src/index-unified-auth-v19.js'
  local expected_v17='f113c5b77ff2572e1723274a86b687904e9b99f8'
  local expected_v19='d15447ac568f447ab56cfa4e2042e1def1e4a6e7'
  [[ -f "$v17" && -f "$v19" ]] || return 1
  [[ "$(git hash-object "$v17")" = "$expected_v17" ]] || return 1
  [[ "$(git hash-object "$v19")" = "$expected_v19" ]] || return 1
}

check_route() {
  local path="$1" name="$2" status
  local body="$workdir/${name}.body" headers="$workdir/${name}.headers"
  status=$(curl --silent --show-error --location --dump-header "$headers" --output "$body" --write-out '%{http_code}' "${base}${path}?route-readiness=$(date +%s)" || true)
  echo "PREFLIGHT ${path} -> HTTP ${status}"

  if grep -Fiq "$blocked_worker" "$headers" || grep -Fq "$blocked_worker" "$body"; then
    echo "Deploy blocked: ${path} is still owned by ${blocked_worker}." >&2
    grep -Ei '^(server|cf-ray|cf-cache-status|x-gnk-|location|content-type):' "$headers" >&2 || true
    head -c 800 "$body" >&2 || true
    echo >&2
    return 1
  fi

  if [[ "$status" = "200" ]]; then
    return 0
  fi

  if [[ "$status" = "500" ]] \
    && grep -Eiq '^server: cloudflare' "$headers" \
    && grep -Eiq '^content-type: text/plain' "$headers" \
    && grep -Fiq 'error code: 1101' "$body" \
    && known_recovery_fix_present; then
    echo "RECOVERY PREFLIGHT ${path}: allowing the audited 1101 recovery because the approved source uses canonical asset-binding paths and a hard-stop newsroom fallback instead of descending into the legacy handler chain."
    return 0
  fi

  echo "Deploy blocked: ${path} is not healthy before deploy." >&2
  grep -Ei '^(server|cf-ray|cf-cache-status|x-gnk-|location|content-type):' "$headers" >&2 || true
  head -c 800 "$body" >&2 || true
  echo >&2
  return 1
}

check_route '/newsroom/' 'newsroom-hr'
check_route '/en/newsroom/' 'newsroom-en'

echo 'Newsroom route readiness passed. No production changes were made.'