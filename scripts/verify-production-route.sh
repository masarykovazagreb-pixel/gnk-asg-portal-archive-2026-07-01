#!/usr/bin/env bash
set -euo pipefail

url="${1:?URL is required}"
output="${2:?Output path is required}"
expected_marker="${3:-}"
headers="${output}.headers"
status="000"

for attempt in 1 2 3 4 5; do
  : > "$headers"
  status=$(curl --silent --show-error --location --dump-header "$headers" --output "$output" --write-out '%{http_code}' "$url" || true)
  echo "VERIFY ${url} -> HTTP ${status} (attempt ${attempt}/5)"
  if [[ "$status" == "200" ]]; then
    if [[ -z "$expected_marker" ]] || grep -Fq -- "$expected_marker" "$output" || grep -Fiq -- "$expected_marker" "$headers"; then
      exit 0
    fi
    echo "HTTP 200 received, but expected marker is missing: ${expected_marker}" >&2
  fi
  sleep $((attempt * 4))
done

echo "Verification failed for ${url}; final HTTP status ${status}" >&2
echo "--- response ownership headers ---" >&2
grep -Ei '^(server|cf-ray|cf-cache-status|x-gnk-|location|content-type|cache-control):' "$headers" >&2 || true
echo "--- response body preview ---" >&2
head -c 1200 "$output" >&2 || true
echo >&2

if grep -Fq -- '"worker"' "$output"; then
  echo "Worker identity was returned in the response body. Review the preview above for route ownership conflict." >&2
fi
exit 1
