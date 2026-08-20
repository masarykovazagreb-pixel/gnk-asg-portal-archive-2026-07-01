import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [
  indexHr,indexEn,contactHr,contactEn,adminCenter,publicShell,
  activeEntry,activeAuth,resilientContact,authFoundation,gatewayCompat,gatewayRuntime,campaignShell,wranglerReview,wranglerRuntime
]=await Promise.all([
  read('apps/portal/index.html'),
  read('apps/portal/en/index.html'),
  read('apps/portal/contact/index.html'),
  read('apps/portal/en/contact/index.html'),
  read('apps/portal/admin-center/index.html'),
  read('workers/gnk-asg-direct-operator/src/public-shell-v11.js'),
  read('workers/gnk-asg-direct-operator/src/index-digital-workforce-v1.js'),
  read('workers/gnk-asg-direct-operator/src/index-unified-auth-v23.js'),
  read('workers/gnk-asg-direct-operator/src/contact-submit-resilient-v1.js'),
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
  // Public pages own the UX contract. Submission transport may be inline or
  // delegated, so readiness must not depend on one implementation detail.
  assert.ok(html.includes('id="contactForm"'),`${name} mora zadržati canonical contact form.`);
  assert.ok(html.includes('name="consent"'),`${name} mora zadržati privolu.`);
  assert.ok(html.includes('name="email"'),`${name} mora zadržati e-mail polje.`);
  assert.ok(html.includes('name="message"'),`${name} mora zadržati polje poruke.`);
}

assert.ok(adminCenter.length>500,'Admin Center mora ostati dostupan.');
assert.ok(publicShell.includes("'/campaign-mailer'"),'Campaign Mailer mora biti izoliran od javnog redizajna.');
assert.ok(publicShell.includes("'/media-application'"),'Media Application mora biti izoliran od javnog redizajna.');
assert.ok(publicShell.includes('if(isPrivatePath(normalized))return html;'),'Privatne rute moraju se vratiti nepromijenjene.');

// Validate the deployed review chain and the actual resilient contact API.
assert.ok(activeEntry.includes("from './index-unified-auth-v23.js'"),'Digital Workforce entrypoint mora ostati iznad aktivnog unified-auth v23 sloja.');
assert.ok(activeAuth.includes("from './index-unified-auth-v22.js'"),'Aktivni unified-auth v23 mora ostati kompatibilan s prethodnim auth slojem.');
assert.ok(activeAuth.includes("from './contact-submit-resilient-v1.js'"),'Aktivni unified-auth mora uvoziti resilient contact runtime.');
assert.ok(activeAuth.includes('handleResilientContact(request,env,ctx,app)'),'Aktivni unified-auth mora izvršavati resilient contact handler.');
assert.ok(resilientContact.includes("const PATH='/api/contact-submit';"),'Kontakt runtime mora zadržati legacy API endpoint.');
assert.ok(resilientContact.includes("const CANONICAL_PATH='/api/portal-contact-submit';"),'Kontakt runtime mora zadržati canonical API endpoint.');
assert.ok(resilientContact.includes('x-idempotency-key'),'Kontakt runtime mora zahtijevati idempotency ključ za fallback zapis.');
assert.ok(resilientContact.includes('validEmail'),'Kontakt runtime mora validirati e-mail.');
assert.ok(resilientContact.includes('consent(body.consent)'),'Kontakt runtime mora fail-closed validirati privolu.');
assert.ok(resilientContact.includes("storage:'kv-fallback'"),'Kontakt runtime mora imati kontrolirani KV fallback.');
assert.ok(resilientContact.includes('human review')||resilientContact.includes('ljudski pregled'),'Kontakt potvrda mora jasno zadržati ljudski pregled.');

// Preserve the audited auth foundation rather than pretending v14 is still the Wrangler entrypoint.
assert.ok(authFoundation.includes("from './index-portal-final-v13.js'"),'Auth foundation mora zadržati stabilni portal runtime.');
assert.ok(authFoundation.includes('handleEnterpriseProjectApi'),'Auth foundation mora štititi Enterprise Project API.');
assert.ok(authFoundation.includes('runEnterpriseProjectCycle'),'Auth foundation mora pokretati kontrolirani workforce ciklus.');
assert.ok(authFoundation.includes('automaticPublication:false'),'Review auth foundation mora zadržati automatsku objavu isključenom.');
assert.ok(
  gatewayCompat.includes("export { VERSION } from './index-final-admin-gateway-v2.js';")&&
  gatewayCompat.includes("export { default } from './index-final-admin-gateway-v2.js';"),
  'Gateway v1 mora ostati compatibility wrapper prema canonical gatewayu v2.'
);
assert.ok(gatewayRuntime.includes('campaign-mailer-shell-v2.js'),'Canonical gateway v2 mora zadržati Campaign Mailer shell.');
assert.ok(gatewayRuntime.includes('campaign-mailer-v2.js'),'Canonical gateway v2 mora zadržati Campaign Mailer sigurnosni kontroler.');
assert.ok(campaignShell.includes("path==='/campaign-mailer'"),'Campaign Mailer ruta mora ostati registrirana.');
assert.ok(wranglerReview.includes('main = "src/index-digital-workforce-v1.js"'),'Review Wrangler mora koristiti aktivni Digital Workforce entrypoint.');
assert.ok(wranglerReview.includes('PUBLIC_ENVIRONMENT = "review-direct-operator"'),'Review Wrangler mora ostati u izoliranom review okruženju.');
assert.ok(wranglerReview.includes('MAIL_MANUAL_LIVE = "false"'),'Stvarno ručno slanje mora ostati isključeno u reviewu.');
assert.ok(wranglerReview.includes('MEDIA_OUTREACH_LIVE = "false"'),'Media outreach mora ostati isključen u reviewu.');
assert.ok(wranglerRuntime.includes('main = "src/index-final-admin-gateway-v2.js"'),'Produkcijski runtime manifest mora i dalje pokazivati na canonical gateway v2.');

console.log('CURRENT INDEX + CONTACT + ADMIN + ACTIVE WORKER CHAIN + CANONICAL V2 COMPATIBILITY: PASS');
