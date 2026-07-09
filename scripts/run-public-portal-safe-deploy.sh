#!/usr/bin/env bash
set -euo pipefail

WORKFLOW="Deploy Public Portal Assets Safe"
WORKFLOW_FILE="deploy-public-portal-assets-safe.yml"
CONFIRM="DEPLOY_PUBLIC_PORTAL_SAFE"

echo "== GNK public portal safe deploy helper =="
echo "Repository: $(gh repo view --json nameWithOwner --jq .nameWithOwner)"
echo "Workflow: ${WORKFLOW}"
echo "Ref: main"

gh workflow run "${WORKFLOW_FILE}" --ref main -f confirm_public_assets_deploy="${CONFIRM}"

echo "Waiting for GitHub to register workflow run..."
sleep 5

RUN_ID="$(gh run list --workflow "${WORKFLOW}" --limit 1 --json databaseId --jq '.[0].databaseId')"
echo "Run ID: ${RUN_ID}"

gh run watch "${RUN_ID}" --exit-status

echo "== Workflow finished. Showing summary =="
gh run view "${RUN_ID}"

echo "== Live smoke checks =="
for url in \
  "https://gnk-asg.hr/" \
  "https://gnk-asg.hr/the-code/" \
  "https://gnk-asg.hr/contact/" \
  "https://gnk-asg.hr/mail-studio/" \
  "https://gnk-asg.hr/email-status" \
  "https://gnk-asg.hr/campaign-mailer/" \
  "https://gnk-asg.hr/company-workers.html" \
  "https://gnk-asg.hr/companies/" \
  "https://gnk-asg.hr/workers/" \
  "https://gnk-asg.hr/finance/" \
  "https://gnk-asg.hr/reports/"; do
  printf "%-62s" "$url"
  curl -L -s -o /tmp/gnk_check_body --write-out "%{http_code} %{url_effective}\n" "$url"
done

echo "== Root content check =="
curl -L -s "https://gnk-asg.hr/?cb=$(date +%s)" | grep -E "GNK ASG / GNK DINAMO Portal|45 aktivnih|THE CODE|1537" || true

echo "Done."
