#!/usr/bin/env bash
set -euo pipefail

blocked_worker='gnk-asg-news-backend'
base='https://gnk-asg.hr'
workdir="${1:-deploy-preflight}"
mkdir -p "$workdir"

check_route() {
  local path="$1" name="$2" status
  local body="$workdir/${name}.body" headers="$workdir/${name}.headers"
  status=$(curl --silent --show-error --location --dump-header "$headers" --output "$body" --write-out '%{http_code}' "${base}${path}?route-readiness=$(date +%s)" || true)
  echo "PREFLIGHT ${path} -> HTTP ${status}"
  if [[ "$status" != "200" ]]; then
    echo "Deploy blocked: ${path} is not healthy before deploy." >&2
    grep -Ei '^(server|cf-ray|cf-cache-status|x-gnk-|location|content-type):' "$headers" >&2 || true
    head -c 800 "$body" >&2 || true
    echo >&2
    return 1
  fi
  if grep -Fiq "$blocked_worker" "$headers" || grep -Fq "$blocked_worker" "$body"; then
    echo "Deploy blocked: ${path} is still owned by ${blocked_worker}." >&2
    grep -Ei '^(server|cf-ray|cf-cache-status|x-gnk-|location|content-type):' "$headers" >&2 || true
    head -c 800 "$body" >&2 || true
    echo >&2
    return 1
  fi
}

check_route '/newsroom/' 'newsroom-hr'
check_route '/en/newsroom/' 'newsroom-en'

echo 'Newsroom route readiness passed. No production changes were made.'
