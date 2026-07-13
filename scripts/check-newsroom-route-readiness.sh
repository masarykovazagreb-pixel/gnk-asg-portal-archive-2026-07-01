#!/usr/bin/env bash
set -euo pipefail

blocked_worker='gnk-asg-news-backend'
base='https://gnk-asg.hr'
workdir="${1:-deploy-preflight}"
mkdir -p "$workdir"

known_recovery_fix_present() {
  local v17='workers/gnk-asg-direct-operator/src/index-unified-auth-v17.js'
  local v19='workers/gnk-asg-direct-operator/src/index-unified-auth-v19.js'
  [[ -f "$v17" && -f "$v19" ]] || return 1
  grep -Fq "assetDirectoryPath" "$v17" || return 1
  grep -Fq "redirect:'manual'" "$v17" || return 1
  grep -Fq "assetDirectoryPath" "$v19" || return 1
  grep -Fq "redirect:'manual'" "$v19" || return 1
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
    && grep -Fiq 'error code: 1101' "$body" \
    && known_recovery_fix_present; then
    echo "RECOVERY PREFLIGHT ${path}: allowing deployment because the current production Worker is in confirmed 1101 failure and the approved source contains the audited redirect-loop fix."
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
