import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [
  indexHr,indexEn,contactHr,contactEn,contactClient,adminCenter,publicShell,
  activeAuth,gatewayCompat,gatewayRuntime,campaignShell,wranglerReview,wranglerRuntime
]=await Promise.all([
  read('apps/portal/index.html'),
  read('apps/portal/en/index.html'),
  read('apps/portal/contact/index.html'),
  read('apps/portal/en/contact/index.html'),
  read('apps/portal/assets/contact-form-v2.js'),
  read('apps/portal/admin-center/index.html'),
  read('workers/gnk-asg-direct-operator/src/public-shell-v11.js'),
  read('workers/gnk-asg-direct-operator/src/index-unified-auth-v14.js'),
  read('workers/gnk-asg-direct-operator/src/index-final-admin-gateway-v1.js'),
  read('workers/gnk-asg-direct-operator/src/index-final-admin-gateway-v2.js'),
  read('workers/gnk-asg-direct-operator/src/campaign-mailer-shell-v2.js'),
  read('workers/gnk-asg-direct-operator/wrangler.toml'),
  read('workers/gnk-asg-direct-operator/wrangler.runtime.toml')
]);

for(const [name,html] of [['HR index',indexHr],['EN index',indexEn]]){
  assert.ok(html.length>500,`${name} mora postojati i imati sadržaj.`);
  assert.ok(/GNK ASG/i.test(html),`${name} mora zadržati GNK ASG identitet.`);
}

for(const [name,html] of [['HR kontakt',contactHr],['EN kontakt',contactEn]]){
  assert.ok(html.includes('id="contactForm"'),`${name} mora zadržati canonical kontakt formu.`);
  assert.ok(html.includes('contact-form-v2.js'),`${name} mora koristiti jedinstveni kontakt klijent.`);
  assert.ok(html.includes('name="consent"'),`${name} mora zadržati privolu.`);
  assert.ok(html.includes('name="website"'),`${name} mora zadržati honeypot zaštitu.`);
}
assert.ok(contactClient.includes("fetch('/api/portal-contact-submit'"),'Kontakt klijent mora koristiti canonical portal contact API.');
assert.ok(contactClient.includes("'content-type':'application/json'"),'Kontakt klijent mora slati strukturirani JSON payload.');
assert.ok(contactClient.includes("credentials:'same-origin'"),'Kontakt API mora ostati same-origin.');

assert.ok(adminCenter.length>500,'Admin Center mora ostati dostupan.');
assert.ok(publicShell.includes("'/campaign-mailer'"),'Campaign Mailer mora biti izoliran od javnog redizajna.');
assert.ok(publicShell.includes("'/media-application'"),'Media Application mora biti izoliran od javnog redizajna.');
assert.ok(publicShell.includes('if(isPrivatePath(normalized))return html;'),'Privatne rute moraju se vratiti nepromijenjene.');

assert.ok(activeAuth.includes("from './index-portal-final-v13.js'"),'Review Worker mora zadržati unified-auth iznad stabilnog portal runtimea.');
assert.ok(activeAuth.includes('handleEnterpriseProjectApi'),'Unified auth mora štititi Enterprise Project API.');
assert.ok(activeAuth.includes('runEnterpriseProjectCycle'),'Unified auth mora pokretati kontrolirani workforce ciklus.');
assert.ok(activeAuth.includes('automaticPublication:false'),'Review runtime mora zadržati automatsku objavu isključenom.');
assert.ok(
  gatewayCompat.includes("export { VERSION } from './index-final-admin-gateway-v2.js';")&&
  gatewayCompat.includes("export { default } from './index-final-admin-gateway-v2.js';"),
  'Gateway v1 mora ostati compatibility wrapper prema canonical gatewayu v2.'
);
assert.ok(gatewayRuntime.includes('campaign-mailer-shell-v2.js'),'Canonical gateway v2 mora zadržati Campaign Mailer shell.');
assert.ok(gatewayRuntime.includes('campaign-mailer-v2.js'),'Canonical gateway v2 mora zadržati Campaign Mailer sigurnosni kontroler.');
assert.ok(campaignShell.includes("path==='/campaign-mailer'"),'Campaign Mailer ruta mora ostati registrirana.');
assert.ok(wranglerReview.includes('main = "src/index-unified-auth-v14.js"'),'Review Wrangler mora koristiti unified-auth v14 kao vanjski sigurnosni sloj.');
assert.ok(wranglerReview.includes('PUBLIC_ENVIRONMENT = "review-direct-operator"'),'Review Wrangler mora ostati u izoliranom review okruženju.');
assert.ok(wranglerReview.includes('MAIL_MANUAL_LIVE = "false"'),'Stvarno ručno slanje mora ostati isključeno u reviewu.');
assert.ok(wranglerReview.includes('MEDIA_OUTREACH_LIVE = "false"'),'Media outreach mora ostati isključen u reviewu.');
assert.ok(wranglerRuntime.includes('main = "src/index-final-admin-gateway-v2.js"'),'Produkcijski runtime manifest mora i dalje pokazivati na canonical gateway v2.');

console.log('CURRENT INDEX + CONTACT CLIENT/API + ADMIN + UNIFIED REVIEW AUTH + CANONICAL V2 COMPATIBILITY: PASS');
