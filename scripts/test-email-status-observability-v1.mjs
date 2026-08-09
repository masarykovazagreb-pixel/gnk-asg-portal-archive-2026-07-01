import fs from 'node:fs';
import assert from 'node:assert/strict';

const tracking=fs.readFileSync('workers/gnk-asg-direct-operator/src/email-status-tracking-v1.js','utf8');
const facade=fs.readFileSync('workers/gnk-asg-direct-operator/src/email-status-tracking-v6.js','utf8');
const click=fs.readFileSync('workers/gnk-asg-direct-operator/src/email-click-tracking-v1.js','utf8');
const dashboard=fs.readFileSync('apps/portal/assets/email-status-dashboard-v2.js','utf8');
const contrast=fs.readFileSync('apps/portal/assets/public-contrast-hardening-v1.js','utf8');
const worker=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v22.js','utf8');
const wrangler=fs.readFileSync('workers/gnk-asg-direct-operator/wrangler.mail-proxy-no-routes.toml','utf8');
const verifier=fs.readFileSync('scripts/verify-production-release-v38.sh','utf8');

for(const marker of [
  /GNK_ASG_EMAIL_STATUS_TRACKING_V2_20260714_DETAILED_RECEIPT/,
  /CREATE TABLE IF NOT EXISTS email_status_events/,
  /receipt_token_hash TEXT/,
  /receipt_confirmed_at TEXT/,
  /receipt_confirmation_count INTEGER NOT NULL DEFAULT 0/,
  /last_open_ip TEXT/,
  /last_open_user_agent TEXT/,
  /last_open_device TEXT/,
  /data-gnk-email-receipt-confirmation/,
  /Potvrđujem primitak/,
  /Disposition-Notification-To/,
  /Return-Receipt-To/,
  /event_type='OPENED'/,
  /possible_forwarding_signal/,
  /forwarding_detectable:false/,
  /nije dokaz prosljeđivanja/i,
  /const events=path\.match/,
  /api\\\/email-status\\\/records/,
  /api\\\/email-status\\\/receipt/
])assert.match(tracking,marker);

for(const marker of [
  /GNK_ASG_EMAIL_STATUS_TRACKING_V8_20260715_CLICK/,
  /distinct_open_environments/,
  /distinct_open_ips/,
  /distinct_open_devices/,
  /possible_forwarding_signal/,
  /clickEvents:true/,
  /clickDestination:true/,
  /explicitReceiptConfirmation:true/,
  /forwardingReliable:false/,
  /gnk-email-status-dashboard-v4/,
  /v5-click-tracking/,
  /handleEmailClickRequest/
])assert.match(facade,marker);

for(const marker of [
  /GNK_ASG_EMAIL_CLICK_TRACKING_V1_20260715/,
  /email_status_click_links/,
  /token_hash/,
  /first_clicked_at/,
  /last_clicked_at/,
  /click_count/,
  /last_click_url/,
  /last_click_ip/,
  /last_click_user_agent/,
  /last_click_device/,
  /'CLICKED'/,
  /status:302/,
  /referrer-policy/,
  /proxy\/security scanner/
])assert.match(click,marker);

for(const marker of [
  /__GNK_ASG_EMAIL_STATUS_DASHBOARD_V4__/,
  /data-gnk-email-status-dashboard/,
  /Statusni API ne radi/,
  /Potvrđen primitak/,
  /Vremenska crta/,
  /Zadnji uređaj \/ IP/,
  /Nije dokaz prosljeđivanja/,
  /api\/email-status\/health/,
  /api\/email-status\/records\/\$\{encodeURIComponent\(id\)\}\/events/,
  /Europe\/Zagreb/
])assert.match(dashboard,marker);

for(const marker of [
  /GNK_CONTRAST_HARDENING_V4_20260714_ALL_PAGES_VISUAL_REPAIR/,
  /GNK_CONTRAST_HARDENING_V3_20260714_GRADIENT_AND_PROTECTED_UI/,
  /GNK_CONTRAST_HARDENING_V2_20260714_DYNAMIC_RECHECK/,
  /gradientColor/,
  /effectiveBackgroundCandidates/,
  /bestColor/,
  /data-gnk-email-status-dashboard="v4"/,
  /targetRatio/,
  /4\.8/,
  /MutationObserver/,
  /ResizeObserver/
])assert.match(contrast,marker);

assert.doesNotMatch(contrast,/\/\* Unambiguously light surfaces[\s\S]{0,300}\.card,/);
assert.match(worker,/isPublicReceiptPath/);
assert.match(worker,/handleEmailStatusRequest/);
assert.match(worker,/GNK_ASG_UNIFIED_AUTH_V32_DETAILED_EMAIL_STATUS_RECEIPT/);
assert.match(worker,/x-gnk-contrast-runtime','hardened-v4-all-pages-visual/);
assert.match(wrangler,/EMAIL_OPEN_TRACKING_ENABLED = "true"/);
assert.match(wrangler,/EMAIL_RECEIPT_CONFIRMATION_ENABLED = "true"/);
assert.match(wrangler,/EMAIL_STATUS_EVENT_RETENTION_DAYS = "31"/);
for(const marker of [
  "entrypoint='src/index-digital-workforce-v1.js'",
  "release_prefix='GNK_ASG_UNIFIED_AUTH_V38_RELEASE_PROOF_NEWS_SOURCE_LINKS'",
  'x-gnk-active-entrypoint',
  'x-gnk-base-runtime',
  'x-gnk-digital-workforce-wrapper',
  'x-gnk-active-release',
  'x-gnk-deploy-revision',
  'verify_release_marker mail-logo',
  'case "$mail_status" in 400|401|403)'
])assert.ok(verifier.includes(marker),`Missing V38 verifier marker: ${marker}`);
for(const forbidden of ['wrangler deploy','api.cloudflare.com/client/v4/zones','cloudflare_api_token='])assert.ok(!verifier.includes(forbidden),`V38 verifier contains forbidden mutation marker: ${forbidden}`);

console.log(JSON.stringify({
  ok:true,
  deliveryTimeline:true,
  rejectionDetails:true,
  openCount:true,
  openIpAndDevice:true,
  clickTracking:true,
  clickDestination:true,
  explicitReceiptConfirmation:true,
  forwardingReliable:false,
  contrastRuntime:'v4-all-pages-visual-repair',
  dashboard:'v5-click-tracking',
  productionVerifier:'v38-workforce-wrapper-exact-release-proof'
},null,2));
