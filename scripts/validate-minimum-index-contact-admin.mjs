import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [indexHr,indexEn,contactHr,contactEn,adminCenter,publicShell,gatewayCompat,gatewayRuntime,campaignShell,wranglerReview,wranglerRuntime]=await Promise.all([
  read('apps/portal/index.html'),read('apps/portal/en/index.html'),read('apps/portal/contact/index.html'),read('apps/portal/en/contact/index.html'),read('apps/portal/admin-center/index.html'),read('workers/gnk-asg-direct-operator/src/public-shell-v11.js'),read('workers/gnk-asg-direct-operator/src/index-final-admin-gateway-v1.js'),read('workers/gnk-asg-direct-operator/src/index-final-admin-gateway-v2.js'),read('workers/gnk-asg-direct-operator/src/campaign-mailer-shell-v2.js'),read('workers/gnk-asg-direct-operator/wrangler.toml'),read('workers/gnk-asg-direct-operator/wrangler.runtime.toml')
]);

const reviewMain=String(wranglerReview.match(/^main = "([^"]+)"/m)?.[1]||'').trim();
assert.match(reviewMain,/^src\/[A-Za-z0-9._-]+\.js$/,'Review Wrangler mora deklarirati src/*.js entrypoint.');
const reviewSource=await read(`workers/gnk-asg-direct-operator/${reviewMain}`);
const baseAuthName=String(reviewSource.match(/from ['"]\.\/(index-unified-auth-v\d+\.js)['"]/)?.[1]||'').trim();
assert.ok(baseAuthName,'Aktivni review entrypoint mora omotavati versioned unified-auth runtime.');
await read(`workers/gnk-asg-direct-operator/src/${baseAuthName}`);

for(const [name,html] of [['HR index',indexHr],['EN index',indexEn]]){
  assert.ok(html.length>500,`${name} mora postojati i imati sadržaj.`);
  assert.ok(/GNK ASG/i.test(html),`${name} mora zadržati GNK ASG identitet.`);
}
for(const [name,html] of [['HR kontakt',contactHr],['EN kontakt',contactEn]]){
  assert.ok(html.includes('/api/portal-contact-submit'),`${name} mora koristiti kanonski portal kontakt API.`);
  assert.ok(html.includes('type="file"')&&html.includes('accept="application/pdf"'),`${name} mora zadržati PDF prilog.`);
  assert.ok(html.includes('name="consent"'),`${name} mora zadržati privolu.`);
}
assert.ok(adminCenter.length>500,'Admin Center mora ostati dostupan.');
assert.ok(publicShell.includes("'/campaign-mailer'")&&publicShell.includes("'/media-application'"),'Privatni alati moraju ostati izolirani od javnog shella.');
assert.ok(publicShell.includes('if(isPrivatePath(normalized))return html;'),'Privatne rute moraju se vratiti nepromijenjene.');

// Current truthful Digital Workforce contract: the public model must never be
// promoted to runtime evidence merely because the wrapper is live.
assert.ok(reviewSource.includes('x-gnk-active-entrypoint'),'Aktivni review wrapper mora stampati svoj entrypoint.');
if(reviewMain.includes('digital-workforce')){
  assert.ok(reviewSource.includes("telemetryMode:'hybrid-model-plus-runtime-health'"),'Digital Workforce wrapper mora razdvojiti model i runtime health.');
  assert.ok(reviewSource.includes("status:'simulated-model-state'"),'Model state mora ostati eksplicitno označen kao simuliran.');
  assert.ok(reviewSource.includes("runtimeHealth:{verified:Boolean("),'Runtime health smije biti verified samo iz health odgovora.');
  const publicRead=await read('workers/gnk-asg-direct-operator/src/digital-workforce-public-read-v1.js');
  assert.ok(publicRead.includes("runtimeEvidence:false"),'Public workforce model ne smije tvrditi runtime evidence.');
  assert.ok(publicRead.includes("status:'profile-only'"),'Worker profili moraju ostati profile-only bez live tvrdnje.');
  assert.ok(publicRead.includes('synthetic-directory-profile-not-live-process'),'Synthetic worker directory mora biti semantički označen.');
}

assert.ok(gatewayCompat.includes("export { VERSION } from './index-final-admin-gateway-v2.js';")&&gatewayCompat.includes("export { default } from './index-final-admin-gateway-v2.js';"),'Gateway v1 mora ostati compatibility wrapper prema canonical gatewayu v2.');
assert.ok(gatewayRuntime.includes('campaign-mailer-shell-v2.js')&&gatewayRuntime.includes('campaign-mailer-v2.js'),'Canonical gateway v2 mora zadržati Campaign Mailer sigurnosni sloj.');
assert.ok(campaignShell.includes("path==='/campaign-mailer'"),'Campaign Mailer ruta mora ostati registrirana.');
assert.ok(wranglerReview.includes(`main = "${reviewMain}"`),'Review Wrangler i aktivni entrypoint moraju biti usklađeni.');
assert.ok(wranglerReview.includes('PUBLIC_ENVIRONMENT = "review-direct-operator"'),'Review mora ostati izoliran.');
assert.ok(wranglerReview.includes('MAIL_MANUAL_LIVE = "false"'),'Ručno slanje mora ostati isključeno u reviewu.');
assert.ok(wranglerReview.includes('MEDIA_OUTREACH_LIVE = "false"'),'Media outreach mora ostati isključen u reviewu.');
assert.ok(wranglerRuntime.includes('main = "src/index-final-admin-gateway-v2.js"'),'Produkcijski runtime mora pokazivati na canonical gateway v2.');
console.log(`CURRENT INDEX + CONTACT + ADMIN + TRUTHFUL REVIEW ${reviewMain} -> ${baseAuthName} + CANONICAL V2 COMPATIBILITY: PASS`);
