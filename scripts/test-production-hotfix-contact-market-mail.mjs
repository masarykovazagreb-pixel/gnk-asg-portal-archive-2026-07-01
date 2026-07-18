import fs from 'node:fs';
import assert from 'node:assert/strict';

const entry=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v23.js','utf8');
const contact=fs.readFileSync('workers/gnk-asg-direct-operator/src/contact-submit-resilient-v1.js','utf8');
const market=fs.readFileSync('workers/gnk-asg-direct-operator/src/public-market-data-v1.js','utf8');
const autoreply=fs.readFileSync('workers/gnk-asg-direct-operator/src/email-autoreply-mime-v1.js','utf8');
const verify=fs.readFileSync('scripts/verify-production-release-v38.sh','utf8');

for(const marker of [
  "handleResilientContact",
  "GNK_ASG_UNIFIED_AUTH_V38_RELEASE_PROOF_NEWS_SOURCE_LINKS_MARKET_ORIGIN_HOTFIX_CONTACT_MAIL",
  "GNK_ASG_CONTACT_RESILIENT_V1_20260718_D1_KV_FALLBACK"
]) assert.ok(entry.includes(marker),`entrypoint missing ${marker}`);

for(const marker of [
  "contact:fallback:case:",
  "contact:fallback:idempotency:",
  "storage:'kv-fallback'",
  "fallback:true",
  "sendBrandedEmail"
]) assert.ok(contact.includes(marker),`contact resilience missing ${marker}`);

for(const marker of [
  "V3_SECONDARY_LIVE",
  "simplePriceLive",
  "marketsLive",
  "coingecko-coins-markets",
  "stale:age==null||age>3600",
  "x-gnk-market-upstream"
]) assert.ok(market.includes(marker),`market hotfix missing ${marker}`);

for(const marker of [
  "REMOTE_LOGO_FALLBACK",
  "remoteLogoHtml",
  "cid:${EMAIL_LOGO_CID}",
  "EMAIL_LOGO_URL",
  "logo?'cid-inline':'remote-png'"
]) assert.ok(autoreply.includes(marker),`autoreply logo fallback missing ${marker}`);

assert.ok(verify.includes("x-gnk-market-source: live"),'deploy verification must reject static market fallback');
assert.ok(verify.includes("x-gnk-contact-resilience"),'deploy verification must require resilient contact route');
assert.ok(verify.includes("(.coins|length) >= 8"),'deploy verification must require a complete market payload');

console.log(JSON.stringify({ok:true,contact:'d1-plus-kv',market:'dual-live-before-static',autoreplyLogo:'cid-or-remote',deployPerformed:false},null,2));
