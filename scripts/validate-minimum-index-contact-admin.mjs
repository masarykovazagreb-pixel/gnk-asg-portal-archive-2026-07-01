import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [
  indexHr,indexEn,contactHr,contactEn,adminCenter,publicShell,
  gatewayCompat,gatewayRuntime,campaignShell,wranglerLegacy,wranglerRuntime
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

for(const [name,html] of [['HR index',indexHr],['EN index',indexEn]]){
  assert.ok(html.length>500,`${name} mora postojati i imati sadržaj.`);
  assert.ok(/GNK ASG/i.test(html),`${name} mora zadržati GNK ASG identitet.`);
}

for(const [name,html] of [['HR kontakt',contactHr],['EN kontakt',contactEn]]){
  assert.ok(html.includes('/api/contact-submit'),`${name} mora koristiti jedinstveni kontakt API.`);
  assert.ok(html.includes('type="file"')&&html.includes('accept="application/pdf"'),`${name} mora zadržati PDF prilog.`);
  assert.ok(html.includes('name="consent"'),`${name} mora zadržati privolu.`);
}

assert.ok(adminCenter.length>500,'Admin Center mora ostati dostupan.');
assert.ok(publicShell.includes("'/campaign-mailer'"),'Campaign Mailer mora biti izoliran od javnog redizajna.');
assert.ok(publicShell.includes("'/media-application'"),'Media Application mora biti izoliran od javnog redizajna.');
assert.ok(publicShell.includes('if(isPrivatePath(normalized))return html;'),'Privatne rute moraju se vratiti nepromijenjene.');

assert.ok(
  gatewayCompat.includes("export { VERSION } from './index-final-admin-gateway-v2.js';")&&
  gatewayCompat.includes("export { default } from './index-final-admin-gateway-v2.js';"),
  'Gateway v1 mora ostati compatibility wrapper prema canonical gatewayu v2.'
);
assert.ok(gatewayRuntime.includes('campaign-mailer-shell-v2.js'),'Canonical gateway v2 mora zadržati Campaign Mailer shell.');
assert.ok(gatewayRuntime.includes('campaign-mailer-v2.js'),'Canonical gateway v2 mora zadržati Campaign Mailer sigurnosni kontroler.');
assert.ok(campaignShell.includes("path==='/campaign-mailer'"),'Campaign Mailer ruta mora ostati registrirana.');
assert.ok(wranglerLegacy.includes('main = "src/index-final-admin-gateway-v1.js"'),'Legacy Wrangler ulaz mora ostati na compatibility wrapperu v1.');
assert.ok(wranglerRuntime.includes('main = "src/index-final-admin-gateway-v2.js"'),'Runtime Wrangler ulaz mora pokazivati na canonical gateway v2.');

console.log('CURRENT INDEX + CONTACT + ADMIN + CANONICAL V2 GATEWAY + CAMPAIGN MAILER: PASS');
