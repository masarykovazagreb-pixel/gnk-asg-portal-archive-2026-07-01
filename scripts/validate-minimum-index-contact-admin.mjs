import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [
  indexHr,indexEn,contactHr,contactEn,adminCenter,publicShell,
  gatewayCompat,gatewayRuntime,campaignShell,wranglerReview,wranglerRuntime
]=await Promise.all([
  read('apps/portal/index.html'),
  read('apps/portal/en/index.html'),
  read('apps/portal/contact/index.html'),
  read('apps/portal/en/contact/index.html'),
  read('apps/portal/admin-center/index.html'),
  read('workers/gnk-asg-direct-operator/src/public-shell-v11.js'),
  read('workers/gnk-asg-direct-operator/src/index-final-admin-gateway-v1.js'),
  read('workers/gnk-asg-direct-operator/src/index-final-admin-gateway-v2.js'),
  read('workers/gnk-asg-direct-operator/src/campaign-mailer-shell-v2.js'),
  read('workers/gnk-asg-direct-operator/wrangler.toml'),
  read('workers/gnk-asg-direct-operator/wrangler.runtime.toml')
]);

const reviewMain=String(wranglerReview.match(/^main = "([^"]+)"/m)?.[1]||'').trim();
assert.match(reviewMain,/^src\/[A-Za-z0-9._-]+\.js$/,'Review Wrangler mora deklarirati postojeći src/*.js entrypoint.');
const reviewSource=await read(`workers/gnk-asg-direct-operator/${reviewMain}`);
const baseAuthName=String(reviewSource.match(/from '\.\/(index-unified-auth-v\d+\.js)'/)?.[1]||'').trim();
assert.ok(baseAuthName,'Aktivni review entrypoint mora omotavati versioned unified-auth runtime.');

async function loadUnifiedAuthChain(firstName){
  const seen=new Set();
  const chain=[];
  let name=firstName;
  for(let depth=0;name&&depth<64;depth++){
    assert.ok(!seen.has(name),`Unified-auth import chain ne smije imati ciklus: ${name}`);
    seen.add(name);
    const source=await read(`workers/gnk-asg-direct-operator/src/${name}`);
    chain.push({name,source});
    name=String(source.match(/from '\.\/(index-unified-auth-v\d+\.js)'/)?.[1]||'').trim();
  }
  assert.ok(chain.length>0,'Unified-auth chain mora sadržavati barem jedan runtime.');
  assert.ok(chain.length<64,'Unified-auth chain je neočekivano dubok; provjeri import graph.');
  return chain;
}

const authChain=await loadUnifiedAuthChain(baseAuthName);
const activeAuth=authChain.map(entry=>entry.source).join('\n');

for(const [name,html] of [['HR index',indexHr],['EN index',indexEn]]){
  assert.ok(html.length>500,`${name} mora postojati i imati sadržaj.`);
  assert.ok(/GNK ASG/i.test(html),`${name} mora zadržati GNK ASG identitet.`);
}

// The canonical public route has been /api/portal-contact-submit since the
// resilient contact path was fixed. Validate the public contract only; do not
// touch or exercise the protected production mailbox/mail transport here.
for(const [name,html] of [['HR kontakt',contactHr],['EN kontakt',contactEn]]){
  assert.ok(html.includes('/api/portal-contact-submit'),`${name} mora koristiti kanonski portal kontakt API.`);
  assert.ok(html.includes('type="file"')&&html.includes('accept="application/pdf"'),`${name} mora zadržati PDF prilog.`);
  assert.ok(html.includes('name="consent"'),`${name} mora zadržati privolu.`);
}

assert.ok(adminCenter.length>500,'Admin Center mora ostati dostupan.');
assert.ok(publicShell.includes("'/campaign-mailer'"),'Campaign Mailer mora biti izoliran od javnog redizajna.');
assert.ok(publicShell.includes("'/media-application'"),'Media Application mora biti izoliran od javnog redizajna.');
assert.ok(publicShell.includes('if(isPrivatePath(normalized))return html;'),'Privatne rute moraju se vratiti nepromijenjene.');

assert.ok(reviewSource.includes('x-gnk-active-entrypoint'),'Aktivni review wrapper mora dokazivo stampati svoj entrypoint.');
assert.ok(activeAuth.includes("from './index-portal-final-v13.js'"),'Unified-auth chain mora zadržati stabilni portal runtime.');
assert.ok(activeAuth.includes('handleEnterpriseProjectApi'),'Unified-auth chain mora štititi Enterprise Project API.');
assert.ok(activeAuth.includes('runEnterpriseProjectCycle'),'Unified-auth chain mora pokretati kontrolirani workforce ciklus.');
assert.ok(activeAuth.includes('automaticPublication:false'),'Review runtime chain mora zadržati automatsku objavu isključenom.');
assert.ok(
  gatewayCompat.includes("export { VERSION } from './index-final-admin-gateway-v2.js';")&&
  gatewayCompat.includes("export { default } from './index-final-admin-gateway-v2.js';"),
  'Gateway v1 mora ostati compatibility wrapper prema canonical gatewayu v2.'
);
assert.ok(gatewayRuntime.includes('campaign-mailer-shell-v2.js'),'Canonical gateway v2 mora zadržati Campaign Mailer shell.');
assert.ok(gatewayRuntime.includes('campaign-mailer-v2.js'),'Canonical gateway v2 mora zadržati Campaign Mailer sigurnosni kontroler.');
assert.ok(campaignShell.includes("path==='/campaign-mailer'"),'Campaign Mailer ruta mora ostati registrirana.');
assert.ok(wranglerReview.includes(`main = "${reviewMain}"`),'Review Wrangler i izvedeni aktivni entrypoint moraju biti usklađeni.');
assert.ok(wranglerReview.includes('PUBLIC_ENVIRONMENT = "review-direct-operator"'),'Review Wrangler mora ostati u izoliranom review okruženju.');
assert.ok(wranglerReview.includes('MAIL_MANUAL_LIVE = "false"'),'Stvarno ručno slanje mora ostati isključeno u reviewu.');
assert.ok(wranglerReview.includes('MEDIA_OUTREACH_LIVE = "false"'),'Media outreach mora ostati isključen u reviewu.');
assert.ok(wranglerRuntime.includes('main = "src/index-final-admin-gateway-v2.js"'),'Produkcijski runtime manifest mora i dalje pokazivati na canonical gateway v2.');

console.log(`CURRENT INDEX + CONTACT + ADMIN + ACTIVE REVIEW ${reviewMain} -> ${authChain.map(entry=>entry.name).join(' -> ')} + CANONICAL V2 COMPATIBILITY: PASS`);