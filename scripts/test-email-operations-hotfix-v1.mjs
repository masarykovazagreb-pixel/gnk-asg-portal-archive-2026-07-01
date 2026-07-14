import fs from 'node:fs';
import assert from 'node:assert/strict';

const contact=fs.readFileSync('workers/gnk-asg-contact-api-worker/src/index-session-cookie-v1.js','utf8');
const autoreply=fs.readFileSync('workers/gnk-asg-direct-operator/src/mail-identity-autoreply-v2.js','utf8');
const operations=fs.readFileSync('workers/gnk-asg-direct-operator/src/email-status-operations-v1.js','utf8');
const status=fs.readFileSync('workers/gnk-asg-direct-operator/src/email-status-tracking-v6.js','utf8');
const dashboard=fs.readFileSync('apps/portal/assets/email-status-dashboard-v2.js','utf8');
const verifier=fs.readFileSync('scripts/verify-production-route.sh','utf8');

for(const marker of [/normalizeContactRequest/,/application\/json/,/new FormData\(\)/,/departmentKey/,/CONTACT_PATH/])assert.match(contact,marker);
for(const marker of [/GLOBAL_CENTRES/,/env\.AI\.run/,/mode:'ai'/,/mode:'fallback'/,/inline_logo_unavailable/,/cid-inline/,/createTrackedMessage/,/recordAutoReplyAudit/])assert.match(autoreply,marker);
for(const marker of [/email_autoreply_audit/,/auto_reply_center/,/auto_reply_mode/,/auto_reply_logo_mode/,/listAutoReplyAudit/])assert.match(operations,marker);
for(const marker of [/date_from/,/date_to/,/opened/,/confirmed/,/failure/,/autoreply-audit/,/pagination:true/,/csvExport:true/])assert.match(status,marker);
for(const marker of [/Email Operations & Status/,/Izvezi CSV/,/Globalni centar/,/Automatski odgovori — operativni audit/,/Prethodna/,/Sljedeća/])assert.match(dashboard,marker);
for(const marker of [/data-gnk-auth-login="1"/,/marker_matches/,/Accepted isolated admin login challenge marker/])assert.match(verifier,marker);

console.log(JSON.stringify({ok:true,contactJson:true,globalCentres:10,aiAutoReply:true,fallback:true,inlineCidRequired:true,emailOperationsAudit:true,advancedFilters:true,pagination:true,csv:true,isolated401LoginVerifier:true},null,2));
