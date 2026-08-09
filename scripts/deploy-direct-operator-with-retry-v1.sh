#!/usr/bin/env bash
set -euo pipefail

TOKEN_HASH="${1:?operator token hash is required}"
DEPLOY_REVISION="${2:?deploy revision is required}"
MAX_ATTEMPTS=3
LOG_ROOT="${GITHUB_WORKSPACE:-$(pwd)}/deploy-wrangler-logs"
CONFIG_FILE="wrangler.workforce-production-no-routes.toml"
mkdir -p "$LOG_ROOT"

# Fail closed if the production deploy path is not the reviewed Workforce wrapper.
test -f "$CONFIG_FILE"
grep -Fq 'main = "src/index-digital-workforce-v1.js"' "$CONFIG_FILE"
node --check src/index-digital-workforce-v1.js
node --check src/digital-workforce-public-read-v1.js

sanitize_logs() {
  local dir="$1"
  [ -d "$dir" ] || return 0
  find "$dir" -type f -print0 | while IFS= read -r -d '' file; do
    sed -i "s/${TOKEN_HASH}/[REDACTED_TOKEN_HASH]/g" "$file" || true
  done
}

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  attempt_dir="$LOG_ROOT/attempt-$attempt"
  mkdir -p "$attempt_dir"
  output_file="$attempt_dir/wrangler-output.log"

  if [ "$attempt" -gt 1 ]; then
    case "$attempt" in
      2) delay=30 ;;
      3) delay=90 ;;
      *) delay=90 ;;
    esac
    echo "Retrying Cloudflare asset deployment after ${delay}s (attempt ${attempt}/${MAX_ATTEMPTS})."
    sleep "$delay"
  fi

  set +e
  npx --yes wrangler@4.112.0 deploy \
    --config "$CONFIG_FILE" \
    --name gnk-asg-direct-operator \
    --var "OPERATOR_TOKEN_SHA256:${TOKEN_HASH}" \
    --var "DEPLOY_REVISION:${DEPLOY_REVISION}" 2>&1 | tee "$output_file"
  status=${PIPESTATUS[0]}
  set -e

  if [ -d "$HOME/.config/.wrangler/logs" ]; then
    cp -a "$HOME/.config/.wrangler/logs/." "$attempt_dir/" || true
  fi
  sanitize_logs "$attempt_dir"

  if [ "$status" -eq 0 ]; then
    echo "Direct operator and shared assets deployed on attempt ${attempt}."
    exit 0
  fi

  if ! grep -Eq 'assets-upload-session|code: 10013|\[code: 10013\]' "$output_file"; then
    echo "Wrangler failed with a non-retryable error; stopping immediately." >&2
    exit "$status"
  fi

  if [ "$attempt" -eq "$MAX_ATTEMPTS" ]; then
    echo "Cloudflare assets upload session failed with code 10013 after ${MAX_ATTEMPTS} controlled attempts." >&2
    exit "$status"
  fi

done
