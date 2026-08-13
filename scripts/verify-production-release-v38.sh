#!/usr/bin/env bash
set -euo pipefail

out="${1:-deploy-verification}"
base="${GNK_PRODUCTION_ORIGIN:-https://gnk-asg.hr}"
revision="${DEPLOY_SOURCE_SHA:?DEPLOY_SOURCE_SHA is required}"
entrypoint='src/index-digital-workforce-v1.js'
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
  grep -Ei '^(HTTP/|location:|content-type:|cache-control:|cf-cache-status:|cf-ray:|x-gnk-active-entrypoint:|x-gnk-base-runtime:|x-gnk-digital-workforce-wrapper:|x-gnk-active-release:|x-gnk-deploy-revision:|x-gnk-route-owner:|x-gnk-news-source:|x-gnk-news-share:|x-gnk-news-id:|x-gnk-market-data:|x-gnk-market-source:|x-gnk-market-route:|x-gnk-market-upstream:|x-gnk-contact-resilience:)' "$headers" >&2 || true
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
if [[ "$news_status" != "200" ]]; then
  echo "current news request did not return HTTP 200." >&2
  show_relevant_headers "$out/news.headers"
  exit 1
fi

if ! has_release_proof "$out/news.headers"; then
  echo "current news response is missing release-proof headers (entrypoint=${entrypoint}, release=${release_prefix}, revision=${revision})." >&2
  show_relevant_headers "$out/news.headers"
  exit 1
fi

latest=$(jq -r 'if type=="array" then .[0].published_at // .[0].publishedAt // .[0].date // "" else (.items[0].published_at // .items[0].publishedAt // .items[0].date // "") end' "$out/news.json")
echo "ASSERT current news latest item date >= baseline ${news_baseline}; actual=${latest:-<empty>}"
if [[ -z "$latest" || ! ( "$latest" == "$news_baseline"* || "$latest" > "$news_baseline" ) ]]; then
  echo "current news latest item date '${latest:-<empty>}' is not on/after baseline '${news_baseline}'." >&2
  head -c 800 "$out/news.json" >&2 || true
  echo >&2
  exit 1
fi

news_source_header=$(grep -Ei '^x-gnk-news-source:' "$out/news.headers" | tail -1 | tr -d '\r' || true)
echo "ASSERT current news x-gnk-news-source header is current-static-asset-20260715; actual=${news_source_header:-<missing>}"
if ! grep -Fiq 'x-gnk-news-source: current-static-asset-20260715' "$out/news.headers"; then
  echo "current news x-gnk-news-source header did not match expected value." >&2
  show_relevant_headers "$out/news.headers"
  exit 1
fi

canonical_clean_status=$(curl --silent --show-error --max-redirs 0 --dump-header "$out/news-canonical-clean.headers" --output "$out/news-canonical-clean.json" --write-out '%{http_code}' "${base}/api/public-news-feed" || true)
canonical_busted_status=$(curl --silent --show-error --max-redirs 0 --dump-header "$out/news-canonical-busted.headers" --output "$out/news-canonical-busted.json" --write-out '%{http_code}' "$(request_url "${base}/api/public-news-feed" "${cache}-canonical")" || true)
echo "ASSERT canonical news exact and cache-busted routes agree; clean=${canonical_clean_status}; busted=${canonical_busted_status}"
[[ "$canonical_clean_status" = "200" && "$canonical_busted_status" = "200" ]]
has_release_proof "$out/news-canonical-clean.headers"
has_release_proof "$out/news-canonical-busted.headers"
grep -Fiq 'x-gnk-news-source: canonical-normalized-feed-v3-assets-primary-url-deduped' "$out/news-canonical-clean.headers"
jq -e 'type=="array" and length>0 and length<=100' "$out/news-canonical-clean.json" >/dev/null
jq -e 'type=="array" and length>0 and length<=100' "$out/news-canonical-busted.json" >/dev/null
if ! jq -e '[.[] | (.sourceUrl // .url // .link // .href // "") | select(length>0)] as $urls | ($urls|length) == ($urls|unique|length)' "$out/news-canonical-clean.json" >/dev/null; then
  echo 'duplicate canonical news URLs detected' >&2
  exit 1
fi
clean_first=$(jq -r '.[0].id // .[0].url // .[0].link // .[0].title // ""' "$out/news-canonical-clean.json")
busted_first=$(jq -r '.[0].id // .[0].url // .[0].link // .[0].title // ""' "$out/news-canonical-busted.json")
[[ -n "$clean_first" && "$clean_first" = "$busted_first" ]]

market_ok=false
market_status='000'
for market_attempt in $(seq 1 18); do
  market_token="${revision}-$(date +%s)-market-${market_attempt}"
  market_status=$(curl --silent --show-error --max-redirs 0 --dump-header "$out/market.headers" --output "$out/market.json" --write-out '%{http_code}' "$(request_url "${base}/api/public-market" "$market_token")" || true)
  market_source=$(grep -Ei '^x-gnk-market-source:' "$out/market.headers" | tail -1 | tr -d '\r' | cut -d: -f2- | xargs || true)
  market_upstream=$(grep -Ei '^x-gnk-market-upstream:' "$out/market.headers" | tail -1 | tr -d '\r' | cut -d: -f2- | xargs || true)
  market_json_status=$(jq -r '.status // "missing"' "$out/market.json" 2>/dev/null || echo invalid-json)
  market_stale=$(jq -r 'if has("stale") then (.stale|tostring) else "missing" end' "$out/market.json" 2>/dev/null || echo invalid-json)
  market_age=$(jq -r '.age_seconds // "missing"' "$out/market.json" 2>/dev/null || echo invalid-json)
  market_coins=$(jq -r '(.coins // []) | length' "$out/market.json" 2>/dev/null || echo 0)
  echo "ASSERT live same-origin market attempt ${market_attempt}/18: HTTP 200, exact release ${revision}, source=live, status=ok, stale=false, coins>=8, age<=120; actual_http=${market_status}; source=${market_source:-missing}; upstream=${market_upstream:-missing}; status=${market_json_status}; stale=${market_stale}; coins=${market_coins}; age=${market_age}"
  if [[ "$market_status" = "200" ]] &&
     has_release_proof "$out/market.headers" &&
     grep -Fiq 'x-gnk-market-data: GNK_ASG_PUBLIC_MARKET_DATA_V6_20260719_OFFICIAL_INSTITUTIONAL_SERVER_SIDE' "$out/market.headers" &&
     grep -Fiq 'x-gnk-market-source: live' "$out/market.headers" &&
     grep -Fiq 'x-gnk-market-route: /api/public-market' "$out/market.headers" &&
     grep -Eiq 'x-gnk-market-upstream: (coingecko-(simple-price|coins-markets)|coinpaprika-tickers|coinbase-spot-static-fx)' "$out/market.headers" &&
     jq -e '.status == "ok" and .stale == false and (.coins|length) >= 8 and ((.age_seconds|numbers) >= 0) and ((.age_seconds|numbers) <= 120)' "$out/market.json" >/dev/null 2>&1; then
    market_ok=true
    break
  fi
  sleep 5
done
if [[ "$market_ok" != true ]]; then
  echo "Live market verification failed after 18 attempts." >&2
  show_relevant_headers "$out/market.headers"
  cat "$out/market.json" >&2 || true
  echo >&2
  exit 1
fi

share_id=$(jq -r 'if type=="array" then (.[0].id // "") else (.items[0].id // .items[0].id // .posts[0].id // .news[0].id // "") end | tostring' "$out/news.json" 2>"$out/news-share-selector.err" || true)
share_target=$(jq -r 'if type=="array" then (.[0].sourceUrl // .[0].url // .[0].href // "") else (.items[0].sourceUrl // .items[0].url // .items[0].href // .posts[0].sourceUrl // .posts[0].url // .posts[0].href // .news[0].sourceUrl // .news[0].url // .news[0].href // "") end | tostring' "$out/news.json" 2>>"$out/news-share-selector.err" || true)
echo "ASSERT current news contains a shareable first item; id=${share_id:-missing}; target=${share_target:-missing}"
[[ "$share_id" =~ ^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$ ]]
[[ "$share_target" =~ ^https?:// ]]
share_status=$(curl --silent --show-error --max-redirs 0 --dump-header "$out/news-share.headers" --output "$out/news-share.body" --write-out '%{http_code}' "$(request_url "${base}/podijeli/vijest/${share_id}/" "${cache}-share")" || true)
echo "ASSERT current news share redirect HTTP 302 and exact release ${revision}; id=${share_id}; actual=${share_status}"
[[ "$share_status" = "302" ]]
has_release_proof "$out/news-share.headers"
grep -Fiq 'x-gnk-news-share: source-redirect' "$out/news-share.headers"
grep -Fiq "x-gnk-news-id: ${share_id}" "$out/news-share.headers"
grep -Fiq "location: ${share_target}" "$out/news-share.headers"

contact_status=$(curl --silent --show-error --max-redirs 0 --dump-header "$out/contact-ready.headers" --output "$out/contact-ready.json" --write-out '%{http_code}' "$(request_url "${base}/api/portal-contact-submit" "${cache}-contact")" || true)
echo "ASSERT resilient contact readiness HTTP 200; actual=${contact_status}"
[[ "$contact_status" = "200" ]]
has_release_proof "$out/contact-ready.headers"
grep -Fiq 'x-gnk-contact-resilience: GNK_ASG_CONTACT_RESILIENT_V2_20260719_CANONICAL_PORTAL_ROUTE' "$out/contact-ready.headers"
jq -e '.ready == true and (.storage.d1 == true or .storage.kv == true) and .mail == true' "$out/contact-ready.json" >/dev/null

mail_status=$(curl --silent --show-error --max-redirs 0 --dump-header "$out/mail.headers" --output "$out/mail.json" --write-out '%{http_code}' -X POST -H 'content-type: application/json' --data '{}' "$(request_url "${base}/api/studio-message/send" "${cache}-mail")" || true)
echo "ASSERT unauthenticated mail endpoint controlled by exact release ${revision}; actual=${mail_status}"
case "$mail_status" in 400|401|403) ;; *) cat "$out/mail.json"; exit 1;; esac
has_release_proof "$out/mail.headers"
grep -q '"error"' "$out/mail.json"

echo "Production release ${revision} is active and all V38 hotfix verification gates passed."
