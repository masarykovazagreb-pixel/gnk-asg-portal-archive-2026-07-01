import fs from 'node:fs';
import assert from 'node:assert/strict';

const tracking=fs.readFileSync('workers/gnk-asg-direct-operator/src/email-status-tracking-v1.js','utf8');
const facade=fs.readFileSync('workers/gnk-asg-direct-operator/src/email-status-tracking-v6.js','utf8');
const dashboard=fs.readFileSync('apps/portal/assets/email-status-dashboard-v2.js','utf8');
const contrast=fs.readFileSync('apps/portal/assets/public-contrast-hardening-v1.js','utf8');
const worker=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v22.js','utf8');
const wrangler=fs.readFileSync('workers/gnk-asg-direct-operator/wrangler.mail-proxy-no-routes.toml','utf8');
const verifier=fs.readFileSync('scripts/verify-production-route.sh','utf8');

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
  /GNK_ASG_EMAIL_STATUS_TRACKING_V7_20260714_DETAILED_RECEIPT/,
  /distinct_open_environments/,
  /distinct_open_ips/,
  /distinct_open_devices/,
  /possible_forwarding_signal/,
  /explicitReceiptConfirmation:true/,
  /forwardingReliable:false/,
  /gnk-email-status-dashboard-v4/
])assert.match(facade,marker);

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
  /GNK_CONTRAST_HARDENING_V3_20260714_GRADIENT_AND_PROTECTED_UI/,
  /GNK_CONTRAST_HARDENING_V2_20260714_DYNAMIC_RECHECK/,
  /gradientColor/,
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
assert.match(worker,/x-gnk-contrast-runtime','hardened-v3/);
assert.match(wrangler,/EMAIL_OPEN_TRACKING_ENABLED = "true"/);
assert.match(wrangler,/EMAIL_RECEIPT_CONFIRMATION_ENABLED = "true"/);
assert.match(wrangler,/EMAIL_STATUS_EVENT_RETENTION_DAYS = "31"/);
for(const marker of [
  'allowed_statuses="${4:-200}"',
  '"$url" == https://gnk-asg.hr/admin-login/*',
  'allowed_statuses="200,401"',
  'status_allowed "$status"'
])assert.ok(verifier.includes(marker),`Missing verifier marker: ${marker}`);
for(const forbidden of ['gnk-asg.hr/admin-center/*','gnk-asg.hr/mail-studio/*','gnk-asg.hr/operator-dashboard/*'])assert.ok(!verifier.includes(forbidden),`Verifier exception too broad: ${forbidden}`);

console.log(JSON.stringify({
  ok:true,
  deliveryTimeline:true,
  rejectionDetails:true,
  openCount:true,
  openIpAndDevice:true,
  explicitReceiptConfirmation:true,
  forwardingReliable:false,
  contrastRuntime:'v3-gradient-protected-ui',
  dashboard:'v4-detailed-receipt',
  adminLoginVerifier:'200-or-401-with-marker'
},null,2));
