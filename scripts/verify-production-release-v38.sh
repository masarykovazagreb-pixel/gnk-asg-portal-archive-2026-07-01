#!/usr/bin/env bash
set -euo pipefail

out="${1:-deploy-verification}"
base="${GNK_PRODUCTION_ORIGIN:-https://gnk-asg.hr}"
revision="${DEPLOY_SOURCE_SHA:?DEPLOY_SOURCE_SHA is required}"
entrypoint='src/index-unified-auth-v23.js'
release_prefix='GNK_ASG_UNIFIED_AUTH_V38_RELEASE_PROOF_NEWS_SOURCE_LINKS'
news_baseline='2026-07-15'
mkdir -p "$out"

request_url() {
  local url="$1" token="$2" separator='?'
  [[ "$url" == *'?'* ]] && separator='&'
  printf '%s%sdeploy-admin-v6=%s' "$url" "$separator" "$token"
}

has_release_proof() {
  local headers="$1"
  grep -Fiq "x-gnk-active-entrypoint: ${entrypoint}" "$headers" &&
  grep -Fiq "x-gnk-active-release: ${release_prefix}" "$headers" &&
  grep -Fiq "x-gnk-deploy-revision: ${revision}" "$headers"
}

show_relevant_headers() {
  local headers="$1"
  grep -Ei '^(HTTP/|location:|content-type:|cache-control:|cf-cache-status:|cf-ray:|x-gnk-active-entrypoint:|x-gnk-active-release:|x-gnk-deploy-revision:|x-gnk-route-owner:|x-gnk-news-source:|x-gnk-news-share:|x-gnk-news-id:|x-gnk-market-data:|x-gnk-market-source:|x-gnk-market-route:|x-gnk-market-upstream:|x-gnk-contact-resilience:)' "$headers" >&2 || true
}

verify_release_marker() {
  local name="$1" url="$2" marker="$3" attempts="${4:-6}"
  local headers="$out/${name}.headers" body="$out/${name}.body"
  local code attempt token target
  for attempt in $(seq 1 "$attempts"); do
    token="${revision}-$(date +%s)-${name}-${attempt}"
    target="$(request_url "$url" "$token")"
    code=$(curl --silent --show-error --max-redirs 0 --dump-header "$headers" --output "$body" --write-out '%{http_code}' "$target" || true)
    echo "ASSERT ${name} attempt ${attempt}/${attempts}: HTTP 200, exact release ${revision}, marker ${marker}; actual=${code}"
    if [[ "$code" = "200" ]] && ! grep -Eiq '^location:' "$headers" && has_release_proof "$headers" && grep -Fqi -- "$marker" "$body" "$headers"; then return 0; fi
    sleep 5
  done
  echo "Release verification failed for ${name}." >&2
  show_relevant_headers "$headers"
  head -c 1200 "$body" >&2 || true
  echo >&2
  return 1
}

verify_release_marker home "${base}/" 'index-editorial-order-v6.js?v=20260715-source-links-v2' 18
verify_release_marker home-en "${base}/en/" 'index-editorial-order-v6.js?v=20260715-source-links-v2'
verify_release_marker news-runtime "${base}/assets/index-editorial-order-v6.js" 'item.sourceUrl||item.url||item.href||item.share_url'
verify_release_marker objave "${base}/objave/" 'Kapitalna disciplina u razdoblju geopolitičkih i energetskih šokova'
verify_release_marker komentari "${base}/komentari/" 'AI ne smije pisati konačnu odluku'
verify_release_marker contact-page "${base}/contact/" 'id="contactForm"'
verify_release_marker mail-studio "${base}/assets/mail-studio-ui-v28.js" 'min-height:520px'
verify_release_marker mail-logo "${base}/assets/logo-gnk-asg-email.png" 'x-gnk-canonical-logo: same-as-portal'

cache="${revision}-$(date +%s)"
news_status=$(curl --silent --show-error --max-redirs 0 --dump-header "$out/news.headers" --output "$out/news.json" --write-out '%{http_code}' "$(request_url "${base}/data/news.json" "${cache}-news")" || true)
echo "ASSERT current news HTTP 200 and exact release ${revision}; actual=${news_status}"
[[ "$news_status" = "200" ]]
has_release_proof "$out/news.headers"
latest=$(jq -r 'if type=="array" then .[0].published_at // .[0].publishedAt // .[0].date // "" else (.items[0].published_at // .items[0].publishedAt // .items[0].date // "") end' "$out/news.json")
[[ -n "$latest" && ( "$latest" == "$news_baseline"* || "$latest" > "$news_baseline" ) ]]
grep -Fiq 'x-gnk-news-source: current-static-asset-20260715' "$out/news.headers"

market_status=$(curl --silent --show-error --max-redirs 0 --dump-header "$out/market.headers" --output "$out/market.json" --write-out '%{http_code}' "$(request_url "${base}/api/public-market" "${cache}-market")" || true)
echo "ASSERT live same-origin market HTTP 200 and exact release ${revision}; actual=${market_status}"
[[ "$market_status" = "200" ]]
has_release_proof "$out/market.headers"
grep -Fiq 'x-gnk-market-data: GNK_ASG_PUBLIC_MARKET_DATA_V4_20260718_INDEPENDENT_PROVIDER' "$out/market.headers"
grep -Fiq 'x-gnk-market-source: live' "$out/market.headers"
grep -Fiq 'x-gnk-market-route: /api/public-market' "$out/market.headers"
grep -Eiq 'x-gnk-market-upstream: (coingecko-(simple-price|coins-markets)|coinpaprika-tickers)' "$out/market.headers"
jq -e '.status == "ok" and .stale == false and (.coins|length) >= 8 and (.age_seconds == 0)' "$out/market.json" >/dev/null

share_status=$(curl --silent --show-error --max-redirs 0 --dump-header "$out/news-share.headers" --output "$out/news-share.body" --write-out '%{http_code}' "$(request_url "${base}/podijeli/vijest/19fa99e0723490d640/" "${cache}-share")" || true)
echo "ASSERT legacy news share redirect HTTP 302 and exact release ${revision}; actual=${share_status}"
[[ "$share_status" = "302" ]]
has_release_proof "$out/news-share.headers"
grep -Fiq 'x-gnk-news-share: source-redirect' "$out/news-share.headers"
grep -Fiq 'x-gnk-news-id: 19fa99e0723490d640' "$out/news-share.headers"
grep -Fiq 'location: https://www.theverge.com/policy/965792/google-epic-withdraw-injunction-third-party-app-stores-coming-google-play' "$out/news-share.headers"

contact_status=$(curl --silent --show-error --max-redirs 0 --dump-header "$out/contact-ready.headers" --output "$out/contact-ready.json" --write-out '%{http_code}' "$(request_url "${base}/api/contact-submit" "${cache}-contact")" || true)
echo "ASSERT resilient contact readiness HTTP 200; actual=${contact_status}"
[[ "$contact_status" = "200" ]]
has_release_proof "$out/contact-ready.headers"
grep -Fiq 'x-gnk-contact-resilience: GNK_ASG_CONTACT_RESILIENT_V1_20260718_D1_KV_FALLBACK' "$out/contact-ready.headers"
jq -e '.ready == true and .storage.fallback == true and (.storage.d1 == true or .storage.kv == true) and .mail == true' "$out/contact-ready.json" >/dev/null

mail_status=$(curl --silent --show-error --max-redirs 0 --dump-header "$out/mail.headers" --output "$out/mail.json" --write-out '%{http_code}' -X POST -H 'content-type: application/json' --data '{}' "$(request_url "${base}/api/studio-message/send" "${cache}-mail")" || true)
echo "ASSERT unauthenticated mail endpoint controlled by exact release ${revision}; actual=${mail_status}"
case "$mail_status" in 400|401|403) ;; *) cat "$out/mail.json"; exit 1;; esac
has_release_proof "$out/mail.headers"
grep -q '"error"' "$out/mail.json"

echo "Production release ${revision} is active and all V38 hotfix verification gates passed."
