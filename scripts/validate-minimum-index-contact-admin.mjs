import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [indexHr,indexEn,contactHr,contactEn,adminCenter,publicShell,gateway,campaignShell]=await Promise.all([
  read('apps/portal/index.html'),
  read('apps/portal/en/index.html'),
  read('apps/portal/contact/index.html'),
  read('apps/portal/en/contact/index.html'),
  read('apps/portal/admin-center/index.html'),
  read('workers/gnk-asg-direct-operator/src/public-shell-v11.js'),
  read('workers/gnk-asg-direct-operator/src/index-final-admin-gateway-v1.js'),
  read('workers/gnk-asg-direct-operator/src/campaign-mailer-shell-v2.js')
]);

for(const [name,html] of [['HR index',indexHr],['EN index',indexEn]]){
  assert.ok(html.length>500,`${name} mora postojati i imati sadržaj.`);
  assert.ok(/GNK ASG/i.test(html),`${name} mora zadržati GNK ASG identitet.`);
}

for(const [name,html] of [['HR kontakt',contactHr],['EN kontakt',contactEn]]){
  assert.ok(html.includes('/api/contact-submit'),`${name} mora koristiti jedinstveni kontakt API.`);
  assert.ok(html.includes('type="file" accept="application/pdf"'),`${name} mora zadržati PDF prilog.`);
  assert.ok(html.includes('name="consent"'),`${name} mora zadržati privolu.`);
}

assert.ok(adminCenter.length>500,'Admin Center mora ostati dostupan.');
assert.ok(publicShell.includes("'/campaign-mailer'"),'Campaign Mailer mora biti izoliran od javnog redizajna.');
assert.ok(publicShell.includes("'/media-application'"),'Media Application mora biti izoliran od javnog redizajna.');
assert.ok(publicShell.includes('if(isPrivatePath(normalized))return html;'),'Privatne rute moraju se vratiti nepromijenjene.');
assert.ok(gateway.includes('campaign-mailer-shell-v2.js'),'Aktivni gateway mora zadržati Campaign Mailer shell.');
assert.ok(gateway.includes('campaign-mailer-v2.js'),'Aktivni gateway mora zadržati Campaign Mailer sigurnosni kontroler.');
assert.ok(campaignShell.includes("path==='/campaign-mailer'"),'Campaign Mailer ruta mora ostati registrirana.');

console.log('CURRENT INDEX + CONTACT + ADMIN + CAMPAIGN MAILER: PASS');
