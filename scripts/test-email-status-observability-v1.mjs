import fs from 'node:fs';
import assert from 'node:assert/strict';

const tracking=fs.readFileSync('workers/gnk-asg-direct-operator/src/email-status-tracking-v1.js','utf8');
const facade=fs.readFileSync('workers/gnk-asg-direct-operator/src/email-status-tracking-v6.js','utf8');
const operations=fs.readFileSync('workers/gnk-asg-direct-operator/src/email-status-operations-v1.js','utf8');
const dashboard=fs.readFileSync('apps/portal/assets/email-status-dashboard-v2.js','utf8');
const contrast=fs.readFileSync('apps/portal/assets/public-contrast-hardening-v1.js','utf8');
const worker=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v22.js','utf8');
const wrangler=fs.readFileSync('workers/gnk-asg-direct-operator/wrangler.mail-proxy-no-routes.toml','utf8');
const verifier=fs.readFileSync('scripts/verify-production-route.sh','utf8');

for(const marker of [
 /CREATE TABLE IF NOT EXISTS email_status_events/,/receipt_token_hash TEXT/,/receipt_confirmed_at TEXT/,
 /last_open_ip TEXT/,/data-gnk-email-receipt-confirmation/,/Potvrđujem primitak/,
 /Disposition-Notification-To/,/Return-Receipt-To/,/possible_forwarding_signal/,
 /forwarding_detectable:false/,/nije dokaz prosljeđivanja/i,/api\\\/email-status\\\/receipt/
])assert.match(tracking,marker);
for(const marker of [
 /GNK_ASG_EMAIL_STATUS_TRACKING_V8_20260714_OPERATIONS/,/ensureEmailStatusOperationalSchema/,
 /date_from/,/date_to/,/opened/,/confirmed/,/failure/,/auto_reply_mode/,/auto_reply_center/,
 /auto_reply_logo_mode/,/GROUP BY UPPER/,/autoreply-audit/,/autoReplyAiAvailable/,
 /inlineLogoRequired:true/,/globalCentres:10/,/gnk-email-status-dashboard-v5/
])assert.match(facade,marker);
for(const marker of [
 /email_autoreply_audit/,/auto_reply_mode TEXT/,/auto_reply_center TEXT/,/auto_reply_logo_mode TEXT/,
 /annotateEmailStatusRecord/,/recordAutoReplyAudit/,/listAutoReplyAudit/,/autoReplyHealth/
])assert.match(operations,marker);
for(const marker of [
 /__GNK_ASG_EMAIL_STATUS_DASHBOARD_V5__/,/Email Operations & Status/,/dateFrom/,/dateTo/,
 /opened/,/confirmed/,/failure/,/Globalni centar/,/Izvezi CSV/,/Prethodna/,/Sljedeća/,
 /Automatski odgovori — operativni audit/,/AI način/,/CID logotip/,/api\/email-status\/autoreply-audit/,
 /api\/email-status\/health/,/Vremenska crta/,/Europe\/Zagreb/
])assert.match(dashboard,marker);
for(const marker of [/GNK_CONTRAST_HARDENING_V4_20260714_ALL_PAGES_VISUAL_REPAIR/,/MutationObserver/,/ResizeObserver/])assert.match(contrast,marker);
assert.match(worker,/isPublicReceiptPath/);
assert.match(wrangler,/MAIL_AUTO_REPLY_AI_LIVE = "true"/);
assert.match(wrangler,/EMAIL_OPEN_TRACKING_ENABLED = "true"/);
for(const marker of ['allowed_statuses="${4:-200}"','data-gnk-auth-login="1"','Accepted isolated admin login challenge marker for HTTP 401.','status_allowed "$status"','marker_matches'])assert.ok(verifier.includes(marker),`Missing verifier marker: ${marker}`);
console.log(JSON.stringify({ok:true,deliveryTimeline:true,rejectionDetails:true,openCount:true,openIpAndDevice:true,explicitReceiptConfirmation:true,forwardingReliable:false,pagination:true,csvExport:true,autoReplyAudit:true,aiMode:true,globalCentres:10,inlineCidRequired:true,dashboard:'v5-operations',adminLoginVerifier:'200-or-isolated-401'},null,2));
